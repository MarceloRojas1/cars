import { Pool } from "pg";

/**
 * Conexión a Postgres.
 *
 * Local: el contenedor del compose (puerto 5433).
 * Producción: el mismo código sirve para Supabase o Neon — cambia DATABASE_URL.
 *
 * IMPORTANTE para cuando esto viva en Vercel: usa SIEMPRE la cadena del pooler
 * (PgBouncer), no la conexión directa. Cada invocación serverless abre su propia
 * conexión y sin pooler Postgres se queda sin cupos con poco tráfico.
 */
let pool: Pool | undefined;

export function dbConfigurada() {
  return Boolean(process.env.DATABASE_URL);
}

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL no está configurada. Levanta la base con `docker compose up -d db` " +
        "y copia .env.example a .env.local.",
    );
  }
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

import type { PoolClient, QueryResultRow } from "pg";

/**
 * Toda consulta pasa por acá y declara su organización.
 *
 * `set_config(..., true)` fija la variable SOLO dentro de la transacción. Es
 * deliberado: con un pool, las conexiones se reutilizan entre peticiones, así
 * que fijarla a nivel de conexión haría que una petición heredara la
 * organización de otra — exactamente la filtración que estamos evitando.
 *
 * El orgId siempre viene del servidor después de autenticar. Nunca de la URL,
 * de un formulario ni de una cabecera.
 */
export async function consultar<T extends QueryResultRow>(
  orgId: string,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return enTransaccion(orgId, async (cliente) => {
    const { rows } = await cliente.query<T>(sql, params);
    return rows;
  });
}

export async function enTransaccion<T>(
  orgId: string,
  fn: (cliente: PoolClient) => Promise<T>,
): Promise<T> {
  const cliente = await db().connect();
  try {
    await cliente.query("begin");
    await cliente.query("select set_config('app.organization_id', $1, true)", [orgId]);
    const resultado = await fn(cliente);
    await cliente.query("commit");
    return resultado;
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}

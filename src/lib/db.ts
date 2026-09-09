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

/**
 * La cadena de conexión, con dos nombres aceptados.
 *
 * `DATABASE_URL` es el nuestro. `POSTGRES_URL` es el que inyecta sola la
 * integración de Supabase en Vercel: se acepta como respaldo para que conectar
 * la base desde el panel de Vercel funcione sin tener que duplicar la variable
 * a mano — y sin que el olvido se manifieste como "no hay datos".
 *
 * El orden importa: si están las dos, gana la nuestra, que es la que alguien
 * puso a propósito.
 */
export function cadenaDeConexion() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

export function dbConfigurada() {
  return Boolean(cadenaDeConexion());
}

/**
 * Configuración de conexión, con el TLS resuelto.
 *
 * Las bases gestionadas (Supabase, Neon) exigen TLS y ponen `?sslmode=require`
 * en la cadena. `pg` pasó a interpretar ese valor como `verify-full`, y la
 * cadena de certificados de Supabase no la pasa: falla con
 * SELF_SIGNED_CERT_IN_CHAIN. Así que se quita el parámetro de la URL y el TLS
 * se configura acá, explícito.
 *
 * `rejectUnauthorized: false` cifra pero no verifica la identidad del servidor.
 * Es lo aceptado para estas bases; quien quiera verificación completa puede
 * poner el certificado de la autoridad en DATABASE_CA_CERT y se usa ese.
 */
export function opcionesDeConexion(cadena: string) {
  if (/localhost|127\.0\.0\.1|@db:/.test(cadena)) {
    return { connectionString: cadena, max: 5 };
  }
  const url = new URL(cadena);
  url.searchParams.delete("sslmode");
  const ca = process.env.DATABASE_CA_CERT;
  return {
    connectionString: url.toString(),
    max: 5,
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  };
}

export function db() {
  const cadena = cadenaDeConexion();
  if (!cadena) {
    throw new Error(
      "Falta la cadena de conexión. En local, levanta la base con " +
        "`docker compose up -d db` y copia .env.example a .env.local. " +
        "En producción, define DATABASE_URL (o POSTGRES_URL).",
    );
  }
  pool ??= new Pool(opcionesDeConexion(cadena));
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
 * El orgId siempre viene del servidor después de autenticar. Nunca de un
 * formulario ni de una cabecera.
 *
 * ÚNICA EXCEPCIÓN: el catálogo público (`data/catalogo.ts`). Ahí no hay sesión
 * —el visitante es un comprador anónimo— y la organización sale del slug de la
 * URL. Es aceptable porque ese camino solo lee lo que una publicación muestra
 * de todas formas: autos disponibles, no archivados y con fotos, y únicamente
 * los campos de la lista blanca de `VehiculoPublico`. Ninguna otra consulta
 * puede tomar la organización de la URL.
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

import { readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { opcionesDeConexion } from "@/lib/db";

/**
 * ¿La base tiene aplicadas todas las migraciones que este código necesita?
 *
 * Existe por el 2026-09-13: se desplegó el código de las invitaciones sin
 * aplicar la migración 0018. `getUsers()` consulta la tabla `invitacion` y la
 * usan casi todas las pantallas, así que las 15 rutas del panel devolvieron
 * 500 durante veinte minutos. El código compilaba, el lint pasaba y la build
 * fue verde — el fallo solo existía en la relación entre código nuevo y base
 * vieja, que es justo lo que nadie estaba mirando.
 *
 * No tiene efectos: solo mira. Quien decide qué hacer con la respuesta es el
 * que llama — la build bloquea, `revisar-despliegue` informa.
 */

const DIRECTORIO = path.join(process.cwd(), "supabase", "migrations");

/**
 * La conexión DIRECTA a la base que atiende al despliegue, no la de tu máquina.
 *
 * `POSTGRES_URL_NON_POOLING` la deja la integración de Supabase (con el prefijo
 * que esa integración pone, ver lib/supabase/servicio.ts). El pooler no sirve
 * acá, y una `DATABASE_URL` que apunte a localhost tampoco: verificar el docker
 * de quien despliega no dice nada sobre la base de los clientes.
 */
function cadena(): string | undefined {
  for (const [nombre, valor] of Object.entries(process.env)) {
    if (nombre.endsWith("POSTGRES_URL_NON_POOLING") && valor?.trim()) return valor;
  }
  const directa = process.env.DATABASE_URL;
  return directa && !directa.includes("localhost") ? directa : undefined;
}

export type EstadoMigraciones =
  | { estado: "al_dia"; total: number; host: string }
  | { estado: "pendientes"; lista: string[]; host: string }
  | { estado: "sin_base" }
  | { estado: "inalcanzable"; motivo: string };

export async function verificarMigraciones(): Promise<EstadoMigraciones> {
  const url = cadena();
  if (!url) return { estado: "sin_base" };

  const host = (() => { try { return new URL(url).host; } catch { return "?"; } })();
  const archivos = (await readdir(DIRECTORIO)).filter((f) => f.endsWith(".sql")).sort();

  const cliente = new Client({ ...opcionesDeConexion(url), connectionTimeoutMillis: 15_000 });
  try {
    await cliente.connect();
  } catch (e) {
    return { estado: "inalcanzable", motivo: e instanceof Error ? e.message : String(e) };
  }

  try {
    /*
     * `to_regclass` y no consultar la tabla directamente: si `_migracion` no
     * existe —una base que nunca se migró— la consulta lanza, y eso se
     * confundiría con "la base no responde". Acá la respuesta es clara: faltan
     * todas.
     */
    const { rows: existe } = await cliente.query<{ hay: string | null }>(
      "select to_regclass('public._migracion')::text as hay",
    );
    if (!existe[0]?.hay) return { estado: "pendientes", lista: archivos, host };

    const { rows } = await cliente.query<{ archivo: string }>("select archivo from _migracion");
    const aplicadas = new Set(rows.map((r) => r.archivo));
    const faltan = archivos.filter((f) => !aplicadas.has(f));

    return faltan.length === 0
      ? { estado: "al_dia", total: archivos.length, host }
      : { estado: "pendientes", lista: faltan, host };
  } finally {
    await cliente.end().catch(() => {});
  }
}

/**
 * Aplica las migraciones pendientes a la base que apunte DATABASE_URL.
 *
 *   npm run migrar              # aplica lo que falte
 *   npm run migrar -- --listar  # solo dice qué falta, sin tocar nada
 *
 * Cada archivo corre UNA vez y queda anotado en `_migracion`. Es lo que hace
 * que esto se pueda correr contra producción sin miedo: volver a ejecutarlo no
 * repite nada.
 *
 * Necesita el usuario DUEÑO de las tablas, no el de la aplicación: las
 * migraciones hacen `alter table` y `force row level security`, y el rol
 * `velie_app` no tiene permiso — a propósito.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const DIRECTORIO = path.join(process.cwd(), "supabase", "migrations");

async function main() {
  const soloListar = process.argv.includes("--listar");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const archivos = (await readdir(DIRECTORIO)).filter((f) => f.endsWith(".sql")).sort();

  const cliente = new Client({
    connectionString: url,
    // Las bases gestionadas (Supabase, Neon) exigen TLS y usan su propia cadena
    // de certificados; sin esto, `pg` rechaza la conexión.
    ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await cliente.connect();

  await cliente.query(`
    create table if not exists _migracion (
      archivo text primary key,
      aplicada_at timestamptz not null default now()
    )`);

  const { rows } = await cliente.query<{ archivo: string }>("select archivo from _migracion");
  const aplicadas = new Set(rows.map((r) => r.archivo));
  const pendientes = archivos.filter((f) => !aplicadas.has(f));

  if (pendientes.length === 0) {
    console.log(`Al día: ${archivos.length} migraciones aplicadas.`);
    await cliente.end();
    return;
  }

  console.log(`Pendientes (${pendientes.length}):`);
  for (const f of pendientes) console.log(`  · ${f}`);
  if (soloListar) {
    await cliente.end();
    return;
  }

  for (const archivo of pendientes) {
    const sql = await readFile(path.join(DIRECTORIO, archivo), "utf8");
    process.stdout.write(`\n→ ${archivo} `);
    /*
     * Cada migración en su propia transacción: si la número 8 falla, las siete
     * anteriores quedan aplicadas y anotadas. Se corrige esa y se vuelve a
     * correr, en vez de repetir todo desde cero.
     */
    try {
      await cliente.query("begin");
      await cliente.query(sql);
      await cliente.query("insert into _migracion (archivo) values ($1)", [archivo]);
      await cliente.query("commit");
      console.log("✓");
    } catch (e) {
      await cliente.query("rollback");
      console.log("✗");
      console.error(e instanceof Error ? e.message : e);
      await cliente.end();
      process.exit(1);
    }
  }

  console.log("\nListo.");
  await cliente.end();
}

main();

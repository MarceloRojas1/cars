/**
 * Copia a Vercel las variables de `.env.local` que van a producción.
 *
 *   npm run vercel:sync              # muestra qué haría, sin tocar nada
 *   npm run vercel:sync -- --aplicar # las escribe
 *
 * Existe porque llenarlas a mano en el panel ya falló tres veces en este
 * proyecto, y siempre en silencio: una variable creada con el valor vacío se ve
 * idéntica a una bien puesta, y el fallo aparece después y lejos —"no hay dónde
 * guardar las fotos", "falta WHATSAPP_VERIFY_TOKEN"— sin decir que la causa fue
 * un campo en blanco.
 *
 * Las claves nunca pasan por el chat ni por la línea de comandos: se leen del
 * archivo y viajan por la entrada estándar del CLI de Vercel.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Lo que va a producción, y nada más. Es una lista blanca a propósito: en
 * `.env.local` también viven cosas que NO deben subir —la base local, las
 * credenciales con las que miramos el producto de referencia— y un "copia todo"
 * las mandaría sin que nadie se diera cuenta.
 */
const VARIABLES: { nombre: string; obligatoria: boolean; publica?: boolean }[] = [
  { nombre: "APP_ENCRYPTION_KEY", obligatoria: true },
  { nombre: "BLOB_READ_WRITE_TOKEN", obligatoria: true },
  { nombre: "WHATSAPP_PHONE_NUMBER_ID", obligatoria: false },
  { nombre: "WHATSAPP_BUSINESS_ACCOUNT_ID", obligatoria: false },
  { nombre: "WHATSAPP_TOKEN", obligatoria: false },
  { nombre: "WHATSAPP_APP_SECRET", obligatoria: false },
  { nombre: "WHATSAPP_VERIFY_TOKEN", obligatoria: false },
  { nombre: "ANTHROPIC_API_KEY", obligatoria: false },
  { nombre: "GEMINI_API_KEY", obligatoria: false },
];

/**
 * Tres que NO se sincronizan, y por qué:
 *
 * · `DATABASE_URL` — en `.env.local` apunta al Postgres de tu máquina. Subirlo
 *   dejaría la aplicación desplegada hablándole a una base que desde Vercel no
 *   existe. La de producción se pone una vez y no se toca.
 *
 * · `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — las pone la
 *   integración de Supabase en Vercel y ahí se quedan. Ponerlas en `.env.local`
 *   haría que el desarrollo local exija login contra la base de tu máquina, que
 *   no tiene la cuenta: entrarías bien en Supabase y la aplicación te devolvería
 *   al login para siempre.
 *
 * · `SUPABASE_SERVICE_ROLE_KEY` — solo la usan los scripts de administración
 *   (`npm run alta`), nunca la aplicación. No tiene por qué estar desplegada.
 */
const ENTORNOS = ["production", "preview"];

function leerEnv(archivo: string) {
  return Object.fromEntries(
    readFileSync(archivo, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
      }),
  );
}

function main() {
  const aplicar = process.argv.includes("--aplicar");
  const local = leerEnv(".env.local");
  let problemas = 0;

  console.log(aplicar ? "\nEscribiendo en Vercel\n" : "\nEnsayo — no se escribe nada. Agrega --aplicar\n");

  for (const { nombre, obligatoria, publica } of VARIABLES) {
    const valor = local[nombre];

    if (!valor) {
      console.log(`${obligatoria ? "✗" : "—"}  ${nombre.padEnd(30)} no está en .env.local`);
      if (obligatoria) problemas++;
      continue;
    }
    if (valor.includes("localhost") || valor.includes("127.0.0.1")) {
      console.log(`✗  ${nombre.padEnd(30)} apunta a tu máquina; no se sube`);
      problemas++;
      continue;
    }

    if (!aplicar) {
      console.log(`·  ${nombre.padEnd(30)} ${valor.length} caracteres`);
      continue;
    }

    for (const entorno of ENTORNOS) {
      try {
        execFileSync("npx", ["vercel", "env", "rm", nombre, entorno, "--yes"], { stdio: "pipe" });
      } catch {
        // No existía todavía: no es un error.
      }
      // Una variable NEXT_PUBLIC_ viaja al navegador, así que Vercel no la deja
      // marcar como secreta; hay que declarar el tipo explícitamente.
      const args = ["vercel", "env", "add", nombre, entorno,
        ...(publica ? ["--type", "config"] : ["--sensitive"])];
      try {
        execFileSync("npx", args, { input: valor + "\n", stdio: ["pipe", "pipe", "pipe"] });
      } catch (e) {
        const detalle = e instanceof Error && "stdout" in e
          ? String((e as { stdout?: Buffer }).stdout).slice(0, 120) : String(e);
        console.log(`✗  ${nombre} (${entorno}): ${detalle}`);
        problemas++;
      }
    }
    console.log(`✓  ${nombre.padEnd(30)} ${valor.length} caracteres`);
  }

  if (aplicar) {
    console.log(
      "\nVercel NO aplica variables a un despliegue que ya existe: hay que" +
      "\nredesplegar para que tomen efecto (Deployments → ⋯ → Redeploy).",
    );
  }
  console.log(problemas ? `\n${problemas} pendiente(s).\n` : "\nTodo en orden.\n");
  process.exit(problemas ? 1 : 0);
}

main();

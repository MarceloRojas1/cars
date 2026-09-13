/**
 * Revisa que el entorno esté listo antes de desplegar.
 *
 *   npm run revisar-despliegue
 *
 * Existe porque los fallos de configuración de este proyecto son silenciosos:
 * sin Blob las fotos se pierden en el siguiente despliegue, sin Supabase el
 * panel queda abierto, y ninguna de las dos cosas se nota mirando la pantalla.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

// Después de `config()`: el helper lee `process.env` al llamarlo, y necesita
// que el archivo ya esté cargado.
import { hayClaveDeServicio } from "../src/lib/supabase/servicio";
import { hayAuthConfigurada } from "../src/lib/supabase/publica";
import { verificarMigraciones } from "../src/lib/migraciones";
import { execFileSync } from "node:child_process";

/**
 * Qué variables existen en PRODUCCIÓN, según Vercel.
 *
 * Varias credenciales no están —ni deben estar— en `.env.local`:
 * `DATABASE_URL` apunta acá al Postgres de tu máquina, y las
 * `NEXT_PUBLIC_SUPABASE_*` las pone la integración. `vercel:sync` no las sube
 * a propósito. Buscarlas en el archivo local daba dos "✗" permanentes por
 * variables que en producción estaban perfectas, y una herramienta que grita
 * en falso se vuelve ruido que se aprende a ignorar.
 *
 * Solo se leen los NOMBRES, nunca los valores: `vercel env ls` no los muestra.
 * Si el CLI no está o no hay sesión, se devuelve null y los chequeos que
 * dependen de esto avisan en vez de bloquear — no saber no es lo mismo que
 * saber que falta.
 */
function variablesEnVercel(): Set<string> | null {
  try {
    const salida = execFileSync("npx", ["vercel", "env", "ls", "production"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000,
    });
    const nombres = salida
      .split("\n")
      .map((l) => l.trim().split(/\s+/)[0])
      .filter((n) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(n));
    return nombres.length > 0 ? new Set(nombres) : null;
  } catch {
    return null;
  }
}

type Nivel = "bloquea" | "avisa" | "ok";
type Chequeo = { nombre: string; nivel: Nivel; detalle: string };

const hay = (v?: string) => Boolean(v && v.trim());

function revisar(enVercel: Set<string> | null): Chequeo[] {
  const c: Chequeo[] = [];
  const e = process.env;

  /*
   * DATABASE_URL vive SOLO en Vercel: en `.env.local` apunta al docker de tu
   * máquina y `vercel:sync` no la sube. Por eso se pregunta allá.
   */
  if (enVercel === null) {
    c.push({
      nombre: "Base de datos",
      nivel: "avisa",
      detalle: "No se pudo consultar Vercel (¿`npx vercel login`?). DATABASE_URL vive allá, no acá.",
    });
  } else {
    const tiene = enVercel.has("DATABASE_URL") || enVercel.has("POSTGRES_URL");
    c.push({
      nombre: "Base de datos",
      nivel: tiene ? "ok" : "bloquea",
      detalle: tiene
        ? "DATABASE_URL está puesta en producción."
        : "Falta DATABASE_URL (o POSTGRES_URL) en producción. La app no va a poder conectarse.",
    });
  }

  /*
   * Conectarse como dueño de las tablas anula el aislamiento: RLS no se le
   * aplica a un rol con BYPASSRLS. Ver supabase/rol-app.sql. No se puede
   * comprobar desde acá —el valor vive en Vercel y no se lee— así que queda
   * como recordatorio verificable con el test.
   */
  c.push({
    nombre: "Rol de conexión",
    nivel: "avisa",
    detalle: "No verificable desde acá. Compruébalo con `npm run test:aislamiento`.",
  });

  /*
   * Las NEXT_PUBLIC_SUPABASE_* las pone la integración de Supabase en Vercel y
   * tampoco se sincronizan desde `.env.local`. Se acepta el nombre nuevo
   * (`…PUBLISHABLE_KEY`) y el legado (`…ANON_KEY`), igual que `proxy.ts`: si el
   * chequeo y la aplicación miran cosas distintas, el chequeo miente.
   */
  if (enVercel === null) {
    c.push({
      nombre: "Autenticación",
      nivel: hayAuthConfigurada() ? "ok" : "avisa",
      detalle: hayAuthConfigurada()
        ? "Configurada en este entorno."
        : "No se pudo consultar Vercel. Estas variables viven allá, no en .env.local.",
    });
  } else {
    const url = enVercel.has("NEXT_PUBLIC_SUPABASE_URL");
    const clave = enVercel.has("NEXT_PUBLIC_SUPABASE_ANON_KEY")
      || enVercel.has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    c.push({
      nombre: "Autenticación",
      nivel: url && clave ? "ok" : "bloquea",
      detalle: url && clave
        ? "Supabase configurado en producción: el panel pide sesión."
        : "Faltan NEXT_PUBLIC_SUPABASE_URL o la clave pública en producción. SIN ESTO EL PANEL QUEDA ABIERTO A INTERNET.",
    });
  }

  /*
   * Pasó de "avisa" a "bloquea": desde que existen las invitaciones del equipo,
   * esta clave ya no la usan solo los scripts. Sin ella, quien abre su enlace
   * de invitación recibe "la creación de cuentas no está configurada" y la
   * automotora no puede sumar a nadie — que es un despliegue a medio andar, no
   * una comodidad que falta.
   */
  c.push({
    nombre: "Alta de cuentas",
    nivel: hayClaveDeServicio() ? "ok" : "bloquea",
    detalle: hayClaveDeServicio()
      ? "Se pueden crear cuentas: `npm run alta` y las invitaciones del equipo."
      : "Falta SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY). Sin ella nadie puede canjear una invitación.",
  });

  c.push({
    nombre: "Fotos",
    nivel: hay(e.BLOB_READ_WRITE_TOKEN) ? "ok" : "bloquea",
    detalle: hay(e.BLOB_READ_WRITE_TOKEN)
      ? "Vercel Blob configurado."
      : "Falta BLOB_READ_WRITE_TOKEN. En Vercel el disco es de solo lectura: cada foto que suban va a fallar.",
  });

  c.push({
    nombre: "Cifrado de credenciales",
    nivel: hay(e.APP_ENCRYPTION_KEY) ? "ok" : "bloquea",
    detalle: hay(e.APP_ENCRYPTION_KEY)
      ? "Las claves de integraciones se guardan cifradas."
      : "Falta APP_ENCRYPTION_KEY: no se pueden guardar las credenciales de las integraciones.",
  });

  const wa = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"]
    .filter((k) => !hay(e[k]));
  c.push({
    nombre: "WhatsApp",
    nivel: wa.length === 0 ? "ok" : "avisa",
    detalle: wa.length === 0
      ? "El webhook puede recibir y responder."
      : `Faltan: ${wa.join(", ")}. El bot no va a funcionar, el resto sí.`,
  });

  c.push({
    nombre: "Asistente IA",
    nivel: hay(e.ANTHROPIC_API_KEY) ? "ok" : "avisa",
    detalle: hay(e.ANTHROPIC_API_KEY)
      ? "Hay clave de plataforma como respaldo."
      : "Sin ANTHROPIC_API_KEY solo funcionan las automotoras que pongan su propia clave.",
  });

  c.push({
    nombre: "Estudio IA",
    nivel: hay(e.GEMINI_API_KEY) ? "ok" : "avisa",
    detalle: hay(e.GEMINI_API_KEY)
      ? "Genera fondos y mete el vehículo dentro. Corre entero en Vercel."
      : "Sin GEMINI_API_KEY no se generan fondos ni se puede poner el auto en la escena.",
  });

  return c;
}

const ICONO: Record<Nivel, string> = { bloquea: "✗", avisa: "!", ok: "✓" };

/**
 * El esquema de la base, que es el chequeo que faltaba el 2026-09-13.
 *
 * Todos los demás miran variables de entorno: cosas que se olvidan de poner.
 * Este mira otra cosa —si la base está al día con el código— y es el único que
 * detecta el fallo que tumbó el panel entero, porque ese no estaba ni en el
 * código ni en la configuración sino en la relación entre ambos.
 */
async function chequeoDeMigraciones(): Promise<Chequeo> {
  const r = await verificarMigraciones();
  switch (r.estado) {
    case "al_dia":
      return { nombre: "Migraciones", nivel: "ok", detalle: `La base está al día (${r.total}).` };
    case "pendientes":
      return {
        nombre: "Migraciones",
        nivel: "bloquea",
        detalle:
          `A ${r.host} le faltan ${r.lista.length}: ${r.lista.join(", ")}. ` +
          "Desplegar así deja el panel en 500. Corre `npm run migrar -- --produccion`.",
      };
    case "sin_base":
      return { nombre: "Migraciones", nivel: "avisa", detalle: "Sin credenciales de base: no se pudo verificar." };
    case "inalcanzable":
      return { nombre: "Migraciones", nivel: "avisa", detalle: `La base no respondió: ${r.motivo}` };
  }
}

async function main() {
  // El de migraciones consulta la base, así que es el único asíncrono.
  const chequeos = [...revisar(variablesEnVercel()), await chequeoDeMigraciones()];

  console.log("\nRevisión previa al despliegue\n");
  for (const c of chequeos) {
    console.log(`${ICONO[c.nivel]}  ${c.nombre.padEnd(26)} ${c.detalle}`);
  }

  const bloquean = chequeos.filter((c) => c.nivel === "bloquea");
  console.log(
    bloquean.length === 0
      ? "\nTodo listo para desplegar.\n"
      : `\n${bloquean.length} ${bloquean.length === 1 ? "cosa bloquea" : "cosas bloquean"} el despliegue.\n`,
  );
  process.exit(bloquean.length === 0 ? 0 : 1);
}

main();

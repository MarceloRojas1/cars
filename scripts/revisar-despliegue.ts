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

type Nivel = "bloquea" | "avisa" | "ok";
type Chequeo = { nombre: string; nivel: Nivel; detalle: string };

const hay = (v?: string) => Boolean(v && v.trim());

function revisar(): Chequeo[] {
  const c: Chequeo[] = [];
  const e = process.env;

  // La integración de Supabase en Vercel la inyecta como POSTGRES_URL.
  const bd = e.DATABASE_URL || e.POSTGRES_URL;
  c.push(
    hay(bd)
      ? {
          nombre: "Base de datos",
          nivel: bd!.includes("localhost") ? "bloquea" : "ok",
          detalle: bd!.includes("localhost")
            ? "Apunta a localhost: en Vercel no existe. Usa la cadena del POOLER de la base gestionada."
            : bd!.includes("pooler") || bd!.includes("6543")
              ? "Apunta a una base remota por el pooler."
              : "Apunta a una base remota, pero no parece la cadena del pooler. Sin pooler, Postgres se queda sin conexiones con poco tráfico.",
        }
      : { nombre: "Base de datos", nivel: "bloquea", detalle: "Falta DATABASE_URL (o POSTGRES_URL)." },
  );

  // Conectarse como dueño de las tablas anula el aislamiento: RLS no se le
  // aplica a un rol con BYPASSRLS. Ver supabase/rol-app.sql.
  if (hay(bd) && !bd!.includes("localhost")) {
    const comoPostgres = /:\/\/postgres[.:]/.test(bd!);
    c.push({
      nombre: "Rol de conexión",
      nivel: comoPostgres ? "bloquea" : "ok",
      detalle: comoPostgres
        ? "La app se conecta como `postgres`, dueño de las tablas. Si ese rol tiene BYPASSRLS, una automotora ve los datos de otra. Crea el rol con supabase/rol-app.sql y compruébalo con `npm run test:aislamiento`."
        : "No se conecta como el dueño de las tablas.",
    });
  }

  // Acepta el nombre nuevo (`…PUBLISHABLE_KEY`) y el legado (`…ANON_KEY`),
  // igual que `proxy.ts`: si el chequeo y la aplicación no miran lo mismo, el
  // chequeo miente.
  const authOk = hayAuthConfigurada();
  c.push({
    nombre: "Autenticación",
    nivel: authOk ? "ok" : "bloquea",
    detalle: authOk
      ? "Supabase configurado: el panel pide sesión."
      : "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. SIN ESTO EL PANEL QUEDA ABIERTO A INTERNET.",
  });

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

const chequeos = revisar();
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

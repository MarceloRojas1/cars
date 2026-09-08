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

type Nivel = "bloquea" | "avisa" | "ok";
type Chequeo = { nombre: string; nivel: Nivel; detalle: string };

const hay = (v?: string) => Boolean(v && v.trim());

function revisar(): Chequeo[] {
  const c: Chequeo[] = [];
  const e = process.env;

  c.push(
    hay(e.DATABASE_URL)
      ? {
          nombre: "Base de datos",
          nivel: e.DATABASE_URL!.includes("localhost") ? "bloquea" : "ok",
          detalle: e.DATABASE_URL!.includes("localhost")
            ? "DATABASE_URL apunta a localhost: en Vercel no existe. Usa la cadena del POOLER de la base gestionada."
            : e.DATABASE_URL!.includes("pooler") || e.DATABASE_URL!.includes("6543")
              ? "Apunta a una base remota por el pooler."
              : "Apunta a una base remota, pero no parece la cadena del pooler. Sin pooler, Postgres se queda sin conexiones con poco tráfico.",
        }
      : { nombre: "Base de datos", nivel: "bloquea", detalle: "Falta DATABASE_URL." },
  );

  const authOk = hay(e.NEXT_PUBLIC_SUPABASE_URL) && hay(e.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  c.push({
    nombre: "Autenticación",
    nivel: authOk ? "ok" : "bloquea",
    detalle: authOk
      ? "Supabase configurado: el panel pide sesión."
      : "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. SIN ESTO EL PANEL QUEDA ABIERTO A INTERNET.",
  });

  c.push({
    nombre: "Alta de cuentas",
    nivel: hay(e.SUPABASE_SERVICE_ROLE_KEY) ? "ok" : "avisa",
    detalle: hay(e.SUPABASE_SERVICE_ROLE_KEY)
      ? "Se pueden crear cuentas con `npm run alta`."
      : "Sin SUPABASE_SERVICE_ROLE_KEY no se pueden crear cuentas desde el servidor. No bloquea el despliegue.",
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

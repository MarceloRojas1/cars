import { NextResponse, after } from "next/server";
import { firmaValida } from "@/lib/whatsapp/firma";
import { procesarMensajeWhatsapp, type ContactoWhatsapp, type MensajeWhatsapp } from "@/lib/leads/canales/whatsapp";
import { comoOrganizacion } from "@/lib/auth/sesion";
import { organizacionDelNumero } from "@/lib/data/whatsapp";

/**
 * Webhook único para toda la instancia (ver docs/decisiones.md, "El embudo":
 * WhatsApp, Meta, Zernio y el sitio propio entran por un punto único).
 *
 * Meta reintenta si no responde 200 rápido, así que el trabajo pesado no
 * bloquea la respuesta: se valida la firma, se responde 200 y el procesamiento
 * —que incluye una llamada a Claude— corre en `after()`.
 *
 * Antes se hacía con `await` y la respuesta a Meta esperaba a la IA. En una
 * función de Vercel eso arriesga pasarse del tiempo límite, y un webhook que se
 * pasa del límite es peor que uno lento: Meta lo reintenta, y el reintento
 * vuelve a llamar a la IA y manda la respuesta dos veces.
 */

/*
 * El procesamiento de `after()` corre después de la respuesta, pero sigue
 * contando para el tiempo de la función. Una conversación con Claude son unos
 * segundos; 60 da holgura sin dejar una función colgada indefinidamente.
 */
export const maxDuration = 60;

/** Meta llama esto una vez, al configurar el webhook en el panel de desarrolladores. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!esperado) {
    return NextResponse.json(
      { error: "Falta WHATSAPP_VERIFY_TOKEN en el servidor." }, { status: 500 },
    );
  }
  if (modo === "subscribe" && token === esperado && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verificación fallida." }, { status: 403 });
}

type ValorCambio = {
  metadata?: { phone_number_id?: string };
  contacts?: ContactoWhatsapp[];
  messages?: MensajeWhatsapp[];
};

type EventoWhatsapp = {
  entry?: { changes?: { field: string; value: ValorCambio }[] }[];
};

export async function POST(request: Request) {
  const cuerpoCrudo = await request.text();
  const firma = request.headers.get("x-hub-signature-256");

  if (!firmaValida(cuerpoCrudo, firma)) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let evento: EventoWhatsapp;
  try {
    evento = JSON.parse(cuerpoCrudo);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Se juntan todos los mensajes de todos los "changes" antes de procesar:
  // un solo POST puede traer varios (varios chats escribiendo a la vez).
  const pendientes: {
    mensaje: MensajeWhatsapp; contacto?: ContactoWhatsapp; numeroId?: string;
  }[] = [];
  for (const entry of evento.entry ?? []) {
    for (const cambio of entry.changes ?? []) {
      if (cambio.field !== "messages") continue; // status de entrega, no un mensaje
      const { messages = [], contacts = [] } = cambio.value;
      for (const mensaje of messages) {
        pendientes.push({
          mensaje,
          contacto: contacts.find((c) => c.wa_id === mensaje.from) ?? contacts[0],
          // De qué automotora es el mensaje: del número que lo RECIBIÓ.
          numeroId: cambio.value.metadata?.phone_number_id,
        });
      }
    }
  }

  /*
   * 200 apenas se valida la firma y se parsea. Los errores de acá para abajo
   * son de nuestro procesamiento, no algo que Meta deba reintentar a ciegas:
   * reintentar un mensaje que ya guardamos duplicaría la respuesta del bot.
   */
  after(async () => {
    for (const { mensaje, contacto, numeroId } of pendientes) {
      try {
        /*
         * Acá no hay sesión: quien llama es Meta. La organización se resuelve
         * del número que recibió el mensaje y se fija para todo el
         * procesamiento — si no, la capa de datos no sabría a qué automotora
         * pertenece y fallaría con "Sin sesión: no hay organización".
         */
        const orgId = await organizacionDelNumero(numeroId);
        if (!orgId) {
          console.error(
            "[webhook whatsapp] ninguna automotora tiene el número", numeroId,
            "— el mensaje", mensaje.id, "se descarta",
          );
          continue;
        }
        await comoOrganizacion(orgId, () => procesarMensajeWhatsapp(mensaje, contacto));
      } catch (e) {
        console.error("[webhook whatsapp] no se pudo procesar un mensaje", mensaje.id, e);
      }
    }
  });

  return NextResponse.json({ ok: true });
}

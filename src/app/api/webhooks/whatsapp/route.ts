import { NextResponse } from "next/server";
import { firmaValida } from "@/lib/whatsapp/firma";
import { procesarMensajeWhatsapp, type ContactoWhatsapp, type MensajeWhatsapp } from "@/lib/leads/canales/whatsapp";

/**
 * Webhook único para toda la instancia (ver docs/decisiones.md, "El embudo":
 * WhatsApp, Meta, Zernio y el sitio propio entran por un punto único).
 *
 * Meta reintenta si no responde 200 rápido, así que el trabajo pesado no debe
 * bloquear la respuesta: acá se guarda el mensaje y se sale, nada de esperar
 * a que el agente de IA genere una respuesta.
 */

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
  const pendientes: { mensaje: MensajeWhatsapp; contacto?: ContactoWhatsapp }[] = [];
  for (const entry of evento.entry ?? []) {
    for (const cambio of entry.changes ?? []) {
      if (cambio.field !== "messages") continue; // status de entrega, no un mensaje
      const { messages = [], contacts = [] } = cambio.value;
      for (const mensaje of messages) {
        pendientes.push({
          mensaje,
          contacto: contacts.find((c) => c.wa_id === mensaje.from) ?? contacts[0],
        });
      }
    }
  }

  // 200 apenas se valida la firma y se parsea: los errores de acá para abajo
  // son de nuestro procesamiento, no algo que Meta deba reintentar a ciegas.
  for (const { mensaje, contacto } of pendientes) {
    try {
      await procesarMensajeWhatsapp(mensaje, contacto);
    } catch (e) {
      console.error("[webhook whatsapp] no se pudo procesar un mensaje", mensaje.id, e);
    }
  }

  return NextResponse.json({ ok: true });
}

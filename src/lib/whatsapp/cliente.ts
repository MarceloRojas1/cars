/**
 * Envío saliente por la Cloud API de WhatsApp.
 *
 * Nadie llama esto todavía de forma automática: el webhook solo recibe y
 * guarda. Queda listo para cuando exista la lógica del agente (Fase 7) y para
 * probar la conexión a mano mientras se configura el número.
 *
 * Credenciales por variables de entorno, no por `integration` como Claude: hoy
 * toda la app corre para una sola organización (ORG_UUID). Cuando haya más de
 * un cliente real, esto migra al mismo patrón BYOK, y el `phone_number_id` que
 * llega en cada webhook decide a qué organización pertenece el mensaje.
 */
const VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";

export type ResultadoEnvio = { ok: true; id: string } | { ok: false; mensaje: string };

export async function enviarTextoWhatsapp(telefono: string, texto: string): Promise<ResultadoEnvio> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, mensaje: "Falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID en el servidor." };
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`https://graph.facebook.com/${VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono.replace(/^\+/, ""),
        type: "text",
        text: { body: texto },
      }),
    });
  } catch {
    return { ok: false, mensaje: "No se pudo contactar la Cloud API de WhatsApp." };
  }

  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const detalle = cuerpo?.error?.message as string | undefined;
    return { ok: false, mensaje: `WhatsApp respondió ${respuesta.status}: ${detalle ?? "sin detalle"}` };
  }

  const id = cuerpo?.messages?.[0]?.id;
  return id ? { ok: true, id } : { ok: false, mensaje: "WhatsApp no devolvió el id del mensaje." };
}

import { buscarLeadPorTelefono, registrarMensajeWhatsapp } from "@/lib/data";
import { registrarLeadEntrante, type ResultadoEntrada } from "@/lib/leads/entrada";

/**
 * Forma mínima que se lee del webhook de la Cloud API de WhatsApp. El resto
 * del payload (statuses, reacciones, plantillas) se ignora por ahora.
 */
export type MensajeWhatsapp = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  /** Solo viene cuando el chat nació de un clic en un anuncio (CTWA). */
  referral?: { source_id?: string; headline?: string; body?: string };
};

export type ContactoWhatsapp = { profile?: { name?: string }; wa_id: string };

/**
 * Un lead por conversación, no por mensaje.
 *
 * El primer mensaje de un número crea el lead vía `registrarLeadEntrante()`
 * (dedup, etapa de entrada, asignación); los siguientes solo agregan a la
 * bitácora. Sin este chequeo, cada mensaje de un chat en curso abriría un
 * lead nuevo — `registrarLeadEntrante` solo deduplica por `external_id`, que
 * es distinto en cada mensaje.
 */
export async function procesarMensajeWhatsapp(
  mensaje: MensajeWhatsapp,
  contacto: ContactoWhatsapp | undefined,
): Promise<ResultadoEntrada | { estado: "mensaje_agregado"; leadId: string }> {
  const telefono = `+${mensaje.from}`;
  const cuerpo = mensaje.text?.body ?? `[${mensaje.type}]`;

  const existente = await buscarLeadPorTelefono(telefono);
  if (existente) {
    await registrarMensajeWhatsapp(existente.id, {
      direccion: "entrante", cuerpo, externalId: mensaje.id,
    });
    return { estado: "mensaje_agregado", leadId: existente.id };
  }

  const resultado = await registrarLeadEntrante({
    // El campo `referral` es lo que distingue un lead de campaña de uno
    // espontáneo (ver docs/decisiones.md, sección "El embudo").
    source: mensaje.referral ? "meta_ads" : "whatsapp",
    /*
     * SIEMPRE el id del mensaje. `referral.source_id` es el id del ANUNCIO, o
     * sea el mismo para todas las personas que hacen clic en él: usarlo como
     * clave de idempotencia hacía que la primera persona creara el lead y
     * todas las demás se descartaran como duplicadas — y sin registrar su
     * mensaje. Un aviso que trae cincuenta leads dejaba uno.
     *
     * La atribución de campaña no se pierde: `referral` viaja completo dentro
     * de `payload`, y `source` ya distingue meta_ads de whatsapp.
     */
    externalId: mensaje.id,
    nombre: contacto?.profile?.name,
    telefono,
    payload: mensaje,
  });

  if (resultado.estado === "creado") {
    await registrarMensajeWhatsapp(resultado.leadId, {
      direccion: "entrante", cuerpo, externalId: mensaje.id,
    });
  }
  return resultado;
}

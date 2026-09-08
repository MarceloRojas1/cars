import {
  buscarLeadPorTelefono, cambiarVehiculoLead, contextoDelBot, getAssistantConfig,
  getOrganization, getVehiculo, moverLead, primeraEtapaHumana, registrarMensajeWhatsapp,
} from "@/lib/data";
import { decidirRespuesta } from "@/lib/ia/asistente";
import { fichaParaElBot } from "@/lib/ia/ficha-publica";
import { ORG_UUID } from "@/lib/data/ids";
import { registrarLeadEntrante, type ResultadoEntrada } from "@/lib/leads/entrada";
import {
  identificarVehiculo, respuestaDeVehiculo, respuestaSinVehiculo,
} from "./identificar-vehiculo";
import { enviarTextoWhatsapp } from "@/lib/whatsapp/cliente";

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
    await atenderConversacion(existente.id, telefono);
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
    await responderPrimerMensaje(resultado.leadId, telefono, cuerpo);
  }
  return resultado;
}

/**
 * La primera respuesta del bot, inmediata.
 *
 * Se responde al toque y no cuando un vendedor se desocupe: quien hace clic en
 * un anuncio está mirando el auto en ese momento, y a los diez minutos ya está
 * en otra cosa. Esto es lo único que el bot hace solo; interpretar la respuesta
 * y mover la etapa es otra decisión, y va aparte.
 *
 * Un fallo acá no puede voltear el webhook: el lead ya está creado y eso es lo
 * que no se puede perder. Se registra y se sigue.
 */
async function responderPrimerMensaje(leadId: string, telefono: string, cuerpo: string) {
  try {
    const [vehiculo, organizacion] = await Promise.all([
      identificarVehiculo(cuerpo),
      getOrganization(),
    ]);

    // Si se supo de qué auto habla, queda enganchado al lead: el vendedor que
    // lo reciba después ve la consulta concreta, no un "hola" suelto.
    if (vehiculo) await cambiarVehiculoLead(leadId, vehiculo.id);

    const texto = vehiculo
      ? respuestaDeVehiculo(vehiculo, organizacion.nombre)
      : respuestaSinVehiculo(organizacion.nombre);

    const envio = await enviarTextoWhatsapp(telefono, texto);
    if (!envio.ok) {
      console.error("[whatsapp] no se pudo responder al lead", leadId, envio.mensaje);
      return;
    }
    await registrarMensajeWhatsapp(leadId, {
      direccion: "saliente", cuerpo: texto, externalId: envio.id,
    });
  } catch (e) {
    console.error("[whatsapp] falló la respuesta automática al lead", leadId, e);
  }
}

/**
 * El bot atiende una conversación en curso.
 *
 * Solo actúa mientras el lead está en una etapa que conduce el bot: apenas pasa
 * a una de personas, el asistente se calla. Un vendedor y un bot escribiéndole
 * a la misma persona es la peor versión de esto.
 *
 * Cuando detecta interés, mueve el lead — y `moverLead` asigna vendedor solo al
 * cruzar a una etapa humana. El bot no elige vendedor ni escribe el traspaso a
 * mano: decide, y el embudo hace lo suyo.
 */
async function atenderConversacion(leadId: string, telefono: string) {
  try {
    const contexto = await contextoDelBot(leadId);
    if (!contexto) return;
    if (contexto.etapaResponsable !== "ia") return;   // ya lo tomó una persona

    const [config, organizacion, vehiculo] = await Promise.all([
      getAssistantConfig(),
      getOrganization(),
      contexto.vehicleId ? getVehiculo(contexto.vehicleId) : Promise.resolve(null),
    ]);

    const decision = await decidirRespuesta(ORG_UUID, {
      organizacion, config,
      vehiculo: vehiculo ? fichaParaElBot(vehiculo) : null,
      historial: contexto.historial,
    });
    if ("error" in decision) {
      console.error("[whatsapp] el asistente no pudo responder al lead", leadId, decision.error);
      return;
    }

    const envio = await enviarTextoWhatsapp(telefono, decision.respuesta);
    if (envio.ok) {
      await registrarMensajeWhatsapp(leadId, {
        direccion: "saliente", cuerpo: decision.respuesta, externalId: envio.id,
      });
    } else {
      console.error("[whatsapp] no se pudo enviar la respuesta al lead", leadId, envio.mensaje);
    }

    if (decision.interes) {
      const destino = await primeraEtapaHumana();
      if (destino) {
        // El motivo queda en la bitácora: cuando el bot se equivoque, hay que
        // poder ver qué leyó para decidirlo.
        await moverLead(leadId, destino.id);
        console.info(`[whatsapp] lead ${leadId} → ${destino.nombre}: ${decision.motivo}`);
      }
    }
  } catch (e) {
    console.error("[whatsapp] falló la atención automática del lead", leadId, e);
  }
}

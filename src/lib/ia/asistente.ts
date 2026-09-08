import { clienteClaude } from "./claude";
import { fichaEnTexto, type FichaPublica } from "./ficha-publica";
import type { AssistantConfig, Organization } from "@/lib/types";

/**
 * El agente que atiende WhatsApp.
 *
 * Hace dos cosas en una sola llamada: **redacta la respuesta** y **decide si el
 * lead ya mostró interés real**. Van juntas a propósito — separarlas en dos
 * llamadas duplica el costo y abre la puerta a que la respuesta diga una cosa y
 * la clasificación otra.
 *
 * No mueve nada por su cuenta: devuelve la decisión y quien la llama actúa. Un
 * modelo que escribe en la base directamente es imposible de auditar cuando se
 * equivoca, y acá equivocarse significa despertar a un vendedor por nada — o
 * peor, dejar dormido un lead caliente.
 */
export type DecisionAsistente = {
  respuesta: string;
  /** Interés real de compra: pidió precio final, financiamiento, visita o permuta. */
  interes: boolean;
  /** Por qué, en una frase. Queda en la bitácora para poder auditar al bot. */
  motivo: string;
};

export type ContextoAsistente = {
  organizacion: Organization;
  config: AssistantConfig;
  /**
   * Ficha filtrada, NO el vehículo completo. El tipo es la garantía: lo que no
   * esté en `FichaPublica` no puede llegar al modelo aunque exista en la base.
   */
  vehiculo: FichaPublica | null;
  /** Del más viejo al más nuevo. */
  historial: { direccion: "entrante" | "saliente"; cuerpo: string }[];
};

function instruccionesDelSistema(ctx: ContextoAsistente): string {
  const { config: c, organizacion, vehiculo } = ctx;

  const servicios = [
    "venta de vehículos del inventario",
    c.servicioConsignacion && "consignación (recibir autos para venderlos por cuenta del cliente)",
    c.servicioCompraDirecta && "compra directa o parte de pago",
    c.servicioFinanciamiento &&
      `financiamiento, solo para vehículos de hasta ${c.antiguedadMaxFinanciamiento} años de antigüedad`,
  ].filter(Boolean).join("; ");

  const traspaso = c.modoConsultor
    ? "Antes de dar por interesado a alguien, averigua su presupuesto y cómo piensa pagar (contado, crédito o parte de pago). Recién con eso marca interes=true."
    : "Apenas detectes interés real de compra, marca interes=true. No sigas calificando.";

  return [
    `Eres ${c.nombreAgente || "el asistente"} de ${organizacion.nombre}, una automotora chilena.`,
    "Atiendes por WhatsApp. Escribe en español de Chile, en tono cercano y breve:",
    "dos o tres frases por mensaje, sin listas largas ni tecnicismos.",
    "",
    `Puedes hablar de: ${servicios}.`,
    "Si te preguntan por algo que no está en esa lista, dilo con honestidad y ofrece",
    "que un ejecutivo lo vea.",
    "",
    vehiculo
      ? `El cliente consulta por este vehículo:\n${fichaEnTexto(vehiculo)}`
      : "Todavía no sabes por cuál vehículo consulta. Pregúntaselo antes de dar precios.",
    vehiculo
      ? "Esa ficha es TODO lo que sabes del vehículo. Si preguntan por algo que no está ahí, dilo y ofrece que un ejecutivo lo confirme."
      : "",
    "",
    "NUNCA inventes datos del vehículo, precios, descuentos, plazos ni disponibilidad.",
    "Si no tienes el dato, dilo y ofrece que un ejecutivo lo confirme.",
    c.prohibiciones ? `Restricciones de la automotora: ${c.prohibiciones}` : "",
    c.instrucciones ? `Indicaciones de la automotora: ${c.instrucciones}` : "",
    c.tono ? `Tono pedido: ${c.tono}` : "",
    "",
    `Cuándo derivar: ${traspaso}`,
    c.modoConsultor
      ? ""
      : "Cuenta como interés: pedir precio final o descuento, preguntar por financiamiento o pie, querer agendar visita, ofrecer su auto en parte de pago, o preguntar cómo comprarlo.",
    "NO cuenta como interés: saludar, preguntar si está disponible, o pedir una foto.",
    "",
    "Cuando marques interes=true, cierra el mensaje avisando que un ejecutivo",
    c.instrucciones?.includes("sin nombre") ? "se pondrá en contacto." : "de ventas se pondrá en contacto a la brevedad.",
  ].filter(Boolean).join("\n");
}

/** Esquema del que no puede salirse: la decisión tiene que ser legible por código. */
const ESQUEMA = {
  type: "object" as const,
  properties: {
    respuesta: { type: "string" as const, description: "El mensaje de WhatsApp a enviar." },
    interes: { type: "boolean" as const, description: "true si mostró interés real de compra." },
    motivo: { type: "string" as const, description: "Una frase explicando la decisión." },
  },
  required: ["respuesta", "interes", "motivo"],
  additionalProperties: false,
};

export async function decidirRespuesta(
  orgId: string,
  ctx: ContextoAsistente,
): Promise<DecisionAsistente | { error: string }> {
  const conexion = await clienteClaude(orgId);
  if (!conexion) return { error: "La automotora no tiene Claude conectado." };

  try {
    const respuesta = await conexion.cliente.messages.create({
      model: conexion.modelo,
      max_tokens: 1024,
      // Sin pensamiento extendido: es una conversación de WhatsApp de dos
      // frases, y cada segundo de latencia lo espera una persona mirando el
      // chat. El costo también importa a 120.000 mensajes diarios.
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: ESQUEMA } },
      system: instruccionesDelSistema(ctx),
      messages: ctx.historial.map((m) => ({
        role: m.direccion === "entrante" ? ("user" as const) : ("assistant" as const),
        content: m.cuerpo,
      })),
    });

    const bloque = respuesta.content.find((b) => b.type === "text");
    if (!bloque || bloque.type !== "text") return { error: "El modelo no devolvió texto." };

    const decision = JSON.parse(bloque.text) as DecisionAsistente;
    if (typeof decision.respuesta !== "string" || typeof decision.interes !== "boolean") {
      return { error: "El modelo devolvió una decisión incompleta." };
    }
    return decision;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falló la llamada al modelo." };
  }
}

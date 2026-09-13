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
/**
 * En qué quedó la conversación, y por qué son TRES y no un sí/no.
 *
 * Antes esto era `interes: boolean`, y con eso el bot solo podía empujar hacia
 * arriba. El problema de agregarle el "no" era que `false` no significa "no le
 * interesa" sino **"todavía no"**: es el estado de toda conversación hasta que
 * la persona muestre interés, y el primer mensaje siempre es `false`. Mover
 * leads con esa señal descartaría a todo el mundo apenas dice "hola",
 * incluidos los que iban a comprar.
 *
 * Con tres estados, el silencio de "sigo conversando" deja de confundirse con
 * un rechazo.
 */
export type EstadoConversacion =
  /** Saludó, preguntó si está disponible, pidió una foto. Se queda donde está. */
  | "conversando"
  /** Interés real: pidió precio final, financiamiento, visita o permuta. */
  | "interesado"
  /** Cerró la puerta: dijo que no, ya compró, era otra cosa, número equivocado. */
  | "descartado";

export type DecisionAsistente = {
  respuesta: string;
  estado: EstadoConversacion;
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
    ? 'Antes de dar por interesado a alguien, averigua su presupuesto y cómo piensa pagar (contado, crédito o parte de pago). Recién con eso marca estado="interesado".'
    : 'Apenas detectes interés real de compra, marca estado="interesado". No sigas calificando.';

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
    "",
    /*
     * El "todavía no" tiene que ser explícito o el modelo lo confunde con el
     * "no": ante la duda entre conversando y descartado, conversando.
     */
    'Usa estado="conversando" mientras la conversación siga viva aunque no haya',
    "interés: saludar, preguntar si está disponible, pedir una foto, preguntar",
    "por el kilometraje. Es el estado normal, y en la duda es el que corresponde.",
    "",
    'Usa estado="descartado" SOLO si la persona cierra la puerta: dice que no le',
    "interesa, que ya compró otro auto, que se equivocó de número, o que su",
    "consulta era de otra cosa. Nunca por falta de respuesta ni por desinterés",
    "supuesto: descartar a alguien que iba a comprar es el peor error que puedes",
    "cometer acá, y nadie va a revisar esa carpeta.",
    "",
    'Cuando marques estado="interesado", cierra el mensaje avisando que un ejecutivo',
    c.instrucciones?.includes("sin nombre") ? "se pondrá en contacto." : "de ventas se pondrá en contacto a la brevedad.",
  ].filter(Boolean).join("\n");
}

/** Esquema del que no puede salirse: la decisión tiene que ser legible por código. */
const ESQUEMA = {
  type: "object" as const,
  properties: {
    respuesta: { type: "string" as const, description: "El mensaje de WhatsApp a enviar." },
    estado: {
      type: "string" as const,
      enum: ["conversando", "interesado", "descartado"],
      description:
        "conversando: la conversación sigue viva sin interés claro (lo normal). " +
        "interesado: mostró interés real de compra. " +
        "descartado: cerró la puerta explícitamente.",
    },
    motivo: { type: "string" as const, description: "Una frase explicando la decisión." },
  },
  required: ["respuesta", "estado", "motivo"],
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
    if (typeof decision.respuesta !== "string") {
      return { error: "El modelo devolvió una decisión incompleta." };
    }
    /*
     * Un estado que no reconocemos se trata como "conversando", no como un
     * error: el mensaje ya está redactado y vale la pena mandarlo. Lo único
     * que se pierde es un movimiento de etapa, que es recuperable; fallar
     * dejaría al cliente sin respuesta, que no lo es.
     */
    const validos: EstadoConversacion[] = ["conversando", "interesado", "descartado"];
    if (!validos.includes(decision.estado)) {
      console.warn("[asistente] estado no reconocido:", decision.estado);
      decision.estado = "conversando";
    }
    return decision;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falló la llamada al modelo." };
  }
}

import { buscarVehiculos } from "@/lib/data";
import type { Vehicle } from "@/lib/types";

/**
 * De qué auto habla un mensaje entrante.
 *
 * Tres caminos, en orden de confianza:
 *
 * 1. **El código en el texto** (`COD922145`). Es el caso del anuncio: en un
 *    aviso de clic-a-WhatsApp, Meta deja definir el mensaje que la persona
 *    envía al abrir el chat, y ahí va el código. Llega exacto y sin ambigüedad.
 * 2. **La patente**, por si alguien la copia de una publicación.
 * 3. **El texto libre** contra marca y modelo del inventario. Es el caso de
 *    quien escribe por su cuenta: "hola, tienen el Land Cruiser?".
 *
 * Devuelve null cuando no hay forma de saberlo — y eso NO es un error: es la
 * señal de que el bot tiene que preguntar en vez de adivinar. Adivinar mal el
 * auto es peor que preguntar: se cotiza el precio equivocado.
 */
const CODIGO = /\bCOD\s?(\d{4,})\b/i;
const PATENTE = /\b([A-Z]{2}[A-Z0-9]{2}\d{2})\b/i;

export async function identificarVehiculo(texto: string): Promise<Vehicle | null> {
  const codigo = CODIGO.exec(texto);
  if (codigo) {
    const { vehiculos } = await buscarVehiculos({ q: `COD${codigo[1]}`, porPagina: 1 });
    if (vehiculos[0]) return vehiculos[0];
  }

  const patente = PATENTE.exec(texto.replace(/[\s-]/g, ""));
  if (patente) {
    const { vehiculos } = await buscarVehiculos({ q: patente[1], porPagina: 1 });
    if (vehiculos[0]) return vehiculos[0];
  }

  /*
   * Búsqueda por texto: se exige que coincidan al menos dos palabras de más de
   * tres letras. Con una sola, "auto" o "precio" traerían cualquier cosa.
   */
  const palabras = texto
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 3);
  if (palabras.length === 0) return null;

  const { vehiculos } = await buscarVehiculos({ porPagina: 200 });
  let mejor: { v: Vehicle; puntos: number } | null = null;
  for (const v of vehiculos) {
    const campos = `${v.marca} ${v.modelo ?? ""} ${v.version ?? ""} ${v.anio}`.toLowerCase();
    const puntos = palabras.filter((p) => campos.includes(p)).length;
    if (puntos >= 2 && (!mejor || puntos > mejor.puntos)) mejor = { v, puntos };
  }
  return mejor?.v ?? null;
}

/**
 * La primera respuesta del bot.
 *
 * Contesta lo que la persona vino a preguntar —el precio— sin rodeos, y cierra
 * con una pregunta para que la conversación siga: un mensaje que no invita a
 * responder deja el lead frío y la ventana de 24 horas corriendo.
 */
export function respuestaDeVehiculo(v: Vehicle, automotora: string): string {
  const clp = new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0,
  }).format(v.precio);

  const ficha = [
    `${v.anio}`,
    `${v.km.toLocaleString("es-CL")} km`,
    v.combustible,
    v.transmision,
  ].filter(Boolean).join(" · ");

  return [
    `¡Hola! Te escribo de ${automotora} 👋`,
    "",
    `*${v.titulo}*`,
    ficha,
    `Precio: *${clp}*`,
    "",
    "¿Te gustaría agendar una visita para verlo, o prefieres que te cuente algo en particular?",
  ].join("\n");
}

/** Cuando no se pudo identificar el auto: preguntar, nunca adivinar. */
export function respuestaSinVehiculo(automotora: string): string {
  return [
    `¡Hola! Te escribo de ${automotora} 👋`,
    "",
    "¿Por cuál vehículo estás consultando? Si tienes el código de la publicación",
    "me sirve, o dime la marca y el modelo y lo busco.",
  ].join("\n");
}

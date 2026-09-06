import type { PedidoImagen, ProveedorImagen, ResultadoImagen } from "./tipos";

/**
 * Gemini — Nano Banana. https://ai.google.dev/gemini-api/docs/image-generation
 *
 *   POST https://generativelanguage.googleapis.com/v1beta/interactions
 *   cabecera `x-goog-api-key`
 *   → la imagen viene en la misma respuesta, en base64. No hay sondeo.
 *
 * Dos diferencias de fondo con FLUX, que se notan en el producto:
 *
 * 1. **No se pide el tamaño en píxeles**, sino una proporción de una lista fija
 *    y un tamaño (1K/2K/4K). El pedido igual viaja en píxeles porque es lo que
 *    entiende el resto de la app; acá se traduce a la proporción más cercana.
 *
 * 2. **No hay semilla.** Regenerar la misma escena da otra imagen. Por eso este
 *    proveedor se declara `reproducible: false` y el guardado deja la semilla en
 *    null en vez de mentir con un número que no sirve para repetir nada.
 *
 * Toda imagen sale con marca de agua SynthID (invisible, de Google).
 */
const BASE = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
const MODELO = process.env.GEMINI_MODELO ?? "gemini-3.1-flash-image";
/** 1K alcanza para el catálogo; 2K es el doble de nítido y ~50% más caro. */
const TAMANO = process.env.GEMINI_TAMANO ?? "2K";

/** Las proporciones que acepta la API, de más alta a más ancha. */
const PROPORCIONES: [string, number][] = [
  ["9:16", 9 / 16], ["2:3", 2 / 3], ["3:4", 3 / 4], ["4:5", 4 / 5], ["1:1", 1],
  ["5:4", 5 / 4], ["4:3", 4 / 3], ["3:2", 3 / 2], ["16:9", 16 / 9], ["21:9", 21 / 9],
];

/** 832×1408 (0.59) cae en 9:16, que es la vertical más parecida. */
export function proporcionMasCercana(ancho: number, alto: number) {
  const buscada = ancho / alto;
  return PROPORCIONES.reduce((mejor, actual) =>
    Math.abs(actual[1] - buscada) < Math.abs(mejor[1] - buscada) ? actual : mejor,
  )[0];
}

type BloqueImagen = { type?: string; data?: string; mime_type?: string };
type Respuesta = {
  status?: string;
  output_image?: BloqueImagen;
  steps?: { type?: string; content?: BloqueImagen[] }[];
  error?: { message?: string };
};

/** La imagen viene en `output_image`; si no, en el primer bloque de imagen de los pasos. */
function imagenDe(r: Respuesta): BloqueImagen | undefined {
  if (r.output_image?.data) return r.output_image;
  for (const paso of r.steps ?? []) {
    const bloque = paso.content?.find((c) => c.type === "image" && c.data);
    if (bloque) return bloque;
  }
}

export const proveedorGemini: ProveedorImagen = {
  id: "gemini",
  nombre: "Gemini (Nano Banana)",
  modelo: MODELO,
  envClave: "GEMINI_API_KEY",
  reproducible: false,
  costoUsd: TAMANO === "2K" ? 0.101 : 0.067,

  async generar(pedido: PedidoImagen, apiKey: string): Promise<ResultadoImagen> {
    let res: Response;
    try {
      res = await fetch(`${BASE}/v1beta/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          model: MODELO,
          input: [
            // Las imágenes van primero: el texto describe qué hacer con ellas.
            ...(pedido.imagenes ?? []).map((img) => ({
              type: "image",
              mime_type: img.tipo,
              data: img.datos.toString("base64"),
            })),
            { type: "text", text: pedido.prompt },
          ],
          response_format: {
            // Solo acepta jpeg: pedir png devuelve 400. Para un fondo
            // fotográfico da lo mismo y además pesa menos.
            type: "image",
            mime_type: "image/jpeg",
            aspect_ratio: proporcionMasCercana(pedido.ancho, pedido.alto),
            image_size: TAMANO,
          },
        }),
        // La respuesta trae la imagen entera, así que la espera es la generación completa.
        signal: AbortSignal.timeout(180_000),
      });
    } catch {
      return { ok: false, mensaje: "No se pudo contactar a Gemini." };
    }

    // El cuerpo se lee siempre: el detalle de Google es lo único que distingue
    // "falta facturación" de "demasiadas seguidas", y los dos llegan como 429.
    let cuerpo: Respuesta;
    try {
      cuerpo = await res.json();
    } catch {
      return { ok: false, mensaje: `Gemini respondió ${res.status} y no era JSON.` };
    }
    const detalle = cuerpo.error?.message?.split("\n")[0].trim();

    if (res.status === 401 || res.status === 403) {
      return { ok: false, mensaje: `Gemini rechazó la clave de API. ${detalle ?? ""}`.trim() };
    }
    if (res.status === 429) {
      // La capa gratis trae límite 0 para los modelos de imagen: no es un pico
      // de tráfico, es que la cuenta no puede generar imágenes hasta activar
      // facturación. Decirlo así ahorra buscar el error en la documentación.
      const capaGratis = cuerpo.error?.message?.includes("free_tier");
      return {
        ok: false,
        mensaje: capaGratis
          ? "La clave está en la capa gratis de Gemini, que no permite generar imágenes. " +
            "Activa la facturación del proyecto en https://aistudio.google.com/apikey"
          : `Gemini limitó la solicitud. ${detalle ?? ""}`.trim(),
      };
    }
    if (!res.ok) {
      return { ok: false, mensaje: `Gemini falló (${res.status}): ${detalle ?? "sin detalle"}` };
    }

    const imagen = imagenDe(cuerpo);
    if (!imagen?.data) {
      // Cuando el filtro de contenido bloquea, la llamada sale 200 pero sin imagen.
      return {
        ok: false,
        mensaje:
          cuerpo.status && cuerpo.status !== "completed"
            ? `Gemini no entregó la imagen (${cuerpo.status}). Reformula la escena.`
            : "Gemini no devolvió imagen. Suele ser el filtro de contenido: reformula la escena.",
      };
    }

    return {
      ok: true,
      datos: Buffer.from(imagen.data, "base64"),
      tipo: imagen.mime_type ?? "image/jpeg",
      modelo: MODELO,
      // Sin semilla a propósito: la API no la expone y este fondo no se puede repetir.
    };
  },
};

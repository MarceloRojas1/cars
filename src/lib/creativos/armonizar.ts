import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { claveDeImagenes, proveedorImagenActivo } from "@/lib/ia/imagenes";
import { guardarImagenGenerada } from "@/lib/storage";

/**
 * Integra el vehículo en el fondo con IA.
 *
 * El montaje lo seguimos armando nosotros —posición y tamaño son decisión de
 * quien edita— y al modelo se le pide UNA cosa: fundir el auto con la escena.
 * Es lo que ninguna fórmula nuestra logra bien: el reflejo con la geometría real
 * del piso, la sombra de contacto y la luz del auto ajustada a la del lugar.
 *
 * Se le manda el montaje ya hecho, no el recorte y el fondo por separado. Con
 * dos imágenes sueltas el modelo ubica el auto donde quiere: se le pidió al 86%
 * del ancho apoyado al 70% de altura y lo puso al 72% y al 62%. Eso rompe la
 * pieza, porque el precio y los datos se posicionan respecto del vehículo.
 * Editando una imagen existente respeta posición, tamaño y pose.
 *
 * El reflejo va condicionado al material —"solo si la superficie es
 * reflectante"—, que es lo que ninguna fórmula nuestra sabía hacer: aplicábamos
 * el mismo reflejo sobre mármol que sobre adoquín mojado.
 *
 * Los textos nunca se mandan: se dibujan encima del resultado.
 */
const INSTRUCCION =
  "This image is a photo composite: a real car photo was pasted onto a background, flat and unlit. " +
  "Keep the vehicle EXACTLY as it is — same model, body shape, proportions, wheels and rims, paint colour, " +
  "badges, trim, and above all the SAME POSITION AND SIZE in the frame. Do not move it, do not resize it, " +
  "do not mirror it, do not redraw it.\n\n" +
  "Only integrate it into the scene: match the lighting direction, colour temperature, contrast and exposure " +
  "of the environment onto the car body; add a realistic contact shadow under the tyres where they touch the " +
  "ground; add a reflection on the ground ONLY if that surface is reflective, and none if it is matte. " +
  "Leave the background unchanged. Photorealistic.";

export type Montaje = {
  fondoUrl: string;
  recorteUrl: string;
  /** Proporciones 0-1, como en el editor: centro del auto y línea de apoyo. */
  x: number;
  y: number;
  ancho: number;
};

export type ResultadoArmonizado = { ok: true; url: string } | { ok: false; mensaje: string };

const rutaLocal = (url: string) => path.join(process.cwd(), "public", url.replace(/^\//, ""));

/** Arma el montaje plano —sin sombra ni reflejo— que se le entrega al modelo. */
async function montar({ fondoUrl, recorteUrl, x, y, ancho }: Montaje) {
  const fondo = rutaLocal(fondoUrl);
  const recorte = rutaLocal(recorteUrl);
  if (!existsSync(fondo) || !existsSync(recorte)) return null;

  const { width: W = 0, height: H = 0 } = await sharp(fondo).metadata();
  const meta = await sharp(recorte).metadata();
  const anchoAuto = Math.max(1, Math.round(ancho * W));
  const altoAuto = Math.max(1, Math.round(anchoAuto * ((meta.height ?? 1) / (meta.width ?? 1))));
  const auto = await sharp(recorte).resize(anchoAuto, altoAuto).png().toBuffer();

  // El auto puede salirse del lienzo (se puede agrandar hasta el 200%), y sharp
  // no admite componer fuera de borde: se recorta a la parte visible.
  const izquierda = Math.round(x * W - anchoAuto / 2);
  const arriba = Math.round(y * H - altoAuto);
  const desdeX = Math.max(0, -izquierda);
  const desdeY = Math.max(0, -arriba);
  const visibleAncho = Math.min(anchoAuto - desdeX, W - Math.max(0, izquierda));
  const visibleAlto = Math.min(altoAuto - desdeY, H - Math.max(0, arriba));
  if (visibleAncho <= 0 || visibleAlto <= 0) return null;

  const visible = await sharp(auto)
    .extract({ left: desdeX, top: desdeY, width: visibleAncho, height: visibleAlto })
    .png()
    .toBuffer();

  const plano = await sharp(fondo)
    .composite([{ input: visible, left: Math.max(0, izquierda), top: Math.max(0, arriba) }])
    .png()
    .toBuffer();

  // Se manda a un ancho intermedio: suficiente detalle para que reconozca el
  // vehículo, sin inflar la petición con megabytes de base64.
  return sharp(plano).resize(1152).jpeg({ quality: 92 }).toBuffer();
}

export async function armonizarMontaje(
  orgId: string,
  montaje: Montaje,
): Promise<ResultadoArmonizado> {
  const plano = await montar(montaje);
  if (!plano) return { ok: false, mensaje: "No se pudo armar el montaje: falta el fondo o el recorte." };

  const proveedor = proveedorImagenActivo();
  const clave = await claveDeImagenes(orgId, proveedor);
  if (!clave) {
    return { ok: false, mensaje: `Falta la clave de ${proveedor.nombre} para armonizar.` };
  }

  const { width: W = 864, height: H = 1536 } = await sharp(plano).metadata();
  const imagen = await proveedor.generar(
    { prompt: INSTRUCCION, ancho: W, alto: H, imagenes: [{ datos: plano, tipo: "image/jpeg" }] },
    clave.apiKey,
  );
  if (!imagen.ok) return { ok: false, mensaje: imagen.mensaje };

  const { url } = await guardarImagenGenerada(imagen.datos, imagen.tipo, "piezas");
  return { ok: true, url };
}

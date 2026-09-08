import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { claveDeImagenes, proveedorImagenActivo } from "@/lib/ia/imagenes";
import { guardarImagenGenerada } from "@/lib/storage";

/**
 * Mete el vehículo dentro del fondo con IA.
 *
 * No hay recorte previo. Se pega la foto ORIGINAL —rectangular, con el
 * estacionamiento y los árboles que trajera— sobre la escena, en la posición y
 * el tamaño que eligió quien edita, y se le pide al modelo que borre el
 * rectángulo y funda el auto en el lugar.
 *
 * ¿Por qué pegar el rectángulo en vez de mandar las dos imágenes sueltas? Se
 * probó: con el fondo y el auto por separado el modelo ubica el vehículo donde
 * quiere —se pidió al 86% del ancho apoyado al 70% de altura y lo puso al 72% y
 * al 62%—, y eso rompe la pieza, porque el precio y los datos se posicionan
 * respecto del vehículo. Pegándolo primero, el modelo EDITA en vez de componer:
 * el auto ya está donde tiene que estar y solo tiene que limpiar alrededor.
 * Medido con la misma caja sobre la entrada y la salida, el auto conserva
 * posición y ancho.
 *
 * Esto reemplazó a rembg (segmentación local con U²-Net). El recorte daba un
 * PNG con transparencia y una vista previa más fiel, pero exigía python3 en el
 * servidor y por eso el Estudio no podía correr en Vercel. La sombra de
 * contacto y el reflejo los pone ahora el modelo, que además los adapta al
 * material del piso — algo que la fórmula anterior no sabía hacer: aplicaba el
 * mismo reflejo sobre mármol que sobre adoquín.
 *
 * Los textos nunca se mandan: se dibujan encima del resultado.
 */
/**
 * Se le mandan DOS imágenes —el fondo limpio y el montaje— y la geometría en
 * números. Las tres cosas salieron de medir, no de suponer; se probó la misma
 * foto contra cuatro fondos (mármol, adoquín de noche, carretera al atardecer y
 * duna) con tres formulaciones:
 *
 *  · Solo el montaje: conserva bien el tamaño, pero en dos de los cuatro fondos
 *    devolvió el rectángulo intacto o una franja de él. Un rectángulo visible es
 *    una pieza rota.
 *  · Fondo limpio + montaje: borra el rectángulo en los cuatro, pero encoge el
 *    auto y lo manda al fondo de la escena — en mármol quedó a un tercio.
 *  · Fondo limpio + montaje + la geometría dicha en porcentajes: limpio Y del
 *    tamaño correcto en los cuatro. Es esta.
 *
 * Mandar dos imágenes trae su propio riesgo, y se vio: en un quinto fondo el
 * modelo las apiló y devolvió la escena repetida, con un auto fantasma arriba.
 * Por eso el prompt declara el formato de salida antes que nada — una sola
 * fotografía, ni collage ni díptico.
 *
 * Decirle el ancho y el punto de apoyo en porcentajes es lo que evita que
 * interprete "mete el auto en la escena" como "estacionalo al fondo".
 */
export function instruccion(x: number, y: number, ancho: number) {
  const pc = (v: number) => `${Math.round(v * 100)}%`;
  return (
    "You are given two images.\n" +
    "IMAGE 1 is a clean background scene.\n" +
    "IMAGE 2 is that same scene with a rectangular photograph pasted on top of it, containing a car " +
    "standing somewhere else, surrounded by its own ground, sky and trees.\n\n" +
    "Produce IMAGE 1 again, unchanged, but with ONLY the car from IMAGE 2 placed into it.\n\n" +
    "OUTPUT FORMAT: one single photograph, with exactly the same framing, crop and composition as IMAGE 1. " +
    "It is NOT a collage, NOT a diptych, NOT a before/after. Never stack the two inputs one above the other " +
    "and never place them side by side. The scene and every object in it appears ONCE.\n\n" +
    "GEOMETRY — this is the strictest requirement. In your output the car must measure exactly " +
    `${pc(ancho)} of the image width, its horizontal centre must sit at ${pc(x)} of the image width, ` +
    `and the point where its tyres touch the ground must sit at ${pc(y)} of the image height. ` +
    "It is a large, close-up hero shot filling most of the frame — do NOT push it into the distance, " +
    "do NOT shrink it, do NOT recentre it. Copy its scale and placement from IMAGE 2 exactly.\n\n" +
    "Also:\n" +
    "· Keep the car identical: same model, body shape, wheels, rims, paint colour, badges and trim. Do not mirror it.\n" +
    "· Everything else from the pasted rectangle must be GONE — no rectangular seam, no leftover asphalt, " +
    "no leftover trees or sky. Where the rectangle was, show IMAGE 1's own scene.\n" +
    "· Relight the car to match IMAGE 1: lighting direction, colour temperature, contrast and exposure. " +
    "Add a contact shadow under the tyres. Add a ground reflection only if IMAGE 1's ground is reflective.\n\n" +
    "Photorealistic. No text, no logos, no watermarks."
  );
}

export type Montaje = {
  fondoUrl: string;
  /** La foto del vehículo tal cual está en el inventario. Sin recortar. */
  fotoUrl: string;
  /** Proporciones 0-1, como en el editor: centro del auto y línea de apoyo. */
  x: number;
  y: number;
  ancho: number;
};

export type ResultadoArmonizado = { ok: true; url: string } | { ok: false; mensaje: string };

/**
 * Lee una imagen del almacenamiento, esté donde esté.
 *
 * En desarrollo las imágenes viven en `public/uploads`; en producción, en
 * Vercel Blob, con URL absoluta. Sin esto, el Estudio funcionaría en local y
 * fallaría en producción con "falta el fondo", que no explica nada.
 */
async function leerImagen(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("http")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    return await readFile(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  } catch {
    return null;
  }
}

/** Arma el montaje plano que se le entrega al modelo. */
async function montar({ fondoUrl, fotoUrl, x, y, ancho }: Montaje) {
  const [fondo, foto] = await Promise.all([leerImagen(fondoUrl), leerImagen(fotoUrl)]);
  if (!fondo || !foto) return null;

  const { width: W = 0, height: H = 0 } = await sharp(fondo).metadata();
  const meta = await sharp(foto).metadata();
  if (!W || !H || !meta.width || !meta.height) return null;

  const anchoAuto = Math.max(1, Math.round(ancho * W));
  const altoAuto = Math.max(1, Math.round(anchoAuto * (meta.height / meta.width)));
  const auto = await sharp(foto).resize(anchoAuto, altoAuto).png().toBuffer();

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

  const compuesto = await sharp(fondo)
    .composite([{ input: visible, left: Math.max(0, izquierda), top: Math.max(0, arriba) }])
    .png()
    .toBuffer();

  // Los dos van al mismo ancho intermedio: suficiente detalle para reconocer el
  // vehículo, sin inflar la petición con megabytes de base64. Y al mismo ancho
  // porque el modelo tiene que poder superponerlos mentalmente.
  const [plano, limpio] = await Promise.all([
    sharp(compuesto).resize(1152).jpeg({ quality: 92 }).toBuffer(),
    sharp(fondo).resize(1152).jpeg({ quality: 92 }).toBuffer(),
  ]);
  return { plano, limpio };
}

export async function armonizarMontaje(
  orgId: string,
  montaje: Montaje,
): Promise<ResultadoArmonizado> {
  const imagenes = await montar(montaje);
  if (!imagenes) {
    return { ok: false, mensaje: "No se pudo armar el montaje: falta el fondo o la foto del vehículo." };
  }

  const proveedor = proveedorImagenActivo();
  const clave = await claveDeImagenes(orgId, proveedor);
  if (!clave) {
    return { ok: false, mensaje: `Falta la clave de ${proveedor.nombre} para poner el auto.` };
  }

  const { width: W = 864, height: H = 1536 } = await sharp(imagenes.plano).metadata();
  const imagen = await proveedor.generar(
    {
      prompt: instruccion(montaje.x, montaje.y, montaje.ancho),
      ancho: W,
      alto: H,
      // El orden importa: el prompt las nombra IMAGE 1 e IMAGE 2.
      imagenes: [
        { datos: imagenes.limpio, tipo: "image/jpeg" },
        { datos: imagenes.plano, tipo: "image/jpeg" },
      ],
    },
    clave.apiKey,
  );
  if (!imagen.ok) return { ok: false, mensaje: imagen.mensaje };

  const { url } = await guardarImagenGenerada(imagen.datos, imagen.tipo, "piezas");
  return { ok: true, url };
}

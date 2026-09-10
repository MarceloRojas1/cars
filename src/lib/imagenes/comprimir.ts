/**
 * Achica una foto en el navegador, antes de subirla.
 *
 * Es donde hay que hacerlo: desde que las fotos van directo del navegador a
 * Blob, lo que tarda es TRANSMITIR el archivo. Una foto de celular moderno son
 * 6–12 MB y unos 4000 px de lado; una automotora sube veinte por auto. Achicar
 * antes de enviar es la diferencia entre esperar un minuto y esperar cinco.
 *
 * El tope de 2000 px de lado largo no es arbitrario: la galería de la ficha
 * muestra la foto a unos 1200 px de ancho, y `next/image` sirve versiones más
 * chicas según la pantalla. 2000 deja margen para una pantalla grande con
 * densidad doble y para que alguien amplíe; más que eso es peso que nadie ve.
 */
const LADO_MAXIMO = 2000;
const CALIDAD = 0.82;

/** Por debajo de esto no vale la pena: se sube tal cual. */
const MINIMO_PARA_COMPRIMIR = 400 * 1024;

export type Comprimida = { archivo: File; original: number; final: number };

export async function comprimirImagen(archivo: File): Promise<Comprimida> {
  const sinTocar = { archivo, original: archivo.size, final: archivo.size };

  // Un formato que el navegador no sepa decodificar se sube como viene.
  if (!archivo.type.startsWith("image/") || archivo.size < MINIMO_PARA_COMPRIMIR) {
    return sinTocar;
  }

  try {
    /*
     * `imageOrientation: "from-image"` aplica la rotación EXIF al decodificar.
     * Sin eso, una foto vertical de celular —que guarda los píxeles apaisados
     * más una marca de "gírala"— se sube acostada: el lienzo copia píxeles y la
     * marca se pierde.
     */
    const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });

    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return sinTocar;

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      lienzo.toBlob(resolve, "image/webp", CALIDAD),
    );
    if (!blob) return sinTocar;

    /*
     * Si comprimir no achicó nada —una foto ya optimizada, o una muy chica—, se
     * manda la original: reencodificar sin ganancia solo pierde calidad.
     */
    if (blob.size >= archivo.size) return sinTocar;

    const nombre = archivo.name.replace(/\.[^.]+$/, "") + ".webp";
    return {
      archivo: new File([blob], nombre, { type: "image/webp" }),
      original: archivo.size,
      final: blob.size,
    };
  } catch {
    // Cualquier problema: se sube la original. Nunca se pierde una foto por
    // intentar aligerarla.
    return sinTocar;
  }
}

import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Adaptador de almacenamiento de imágenes: Vercel Blob o disco local.
 *
 * Elige según haya token de Blob configurado, no según `NODE_ENV`: así el mismo
 * código sirve para desarrollar sin cuenta de Vercel y para producción, y de
 * paso se puede probar Blob en local exportando el token.
 *
 * En Vercel el disco es de solo lectura y efímero — sin Blob, cada foto que
 * suba una automotora falla al guardarse, y las que ya estuvieran subidas
 * desaparecen en el siguiente despliegue. Por eso `blobConfigurado()` es lo
 * primero que revisa el chequeo de despliegue.
 *
 * El resto de la aplicación solo conoce la URL: no sabe ni le importa de dónde
 * salió.
 */

export const MAX_FOTOS = 50;
export const MAX_BYTES_POR_FOTO = 8 * 1024 * 1024; // 8 MB
export const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const DIRECTORIO = path.join(process.cwd(), "public", "uploads", "vehiculos");

export type ResultadoSubida = { url: string; nombre: string };

/** ¿Hay almacenamiento de objetos? Si no, se escribe en el disco local. */
export function blobConfigurado() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Sube a Vercel Blob y devuelve la URL pública definitiva. */
async function subirABlob(
  datos: Buffer | File, ruta: string, tipo?: string,
): Promise<string> {
  const { put } = await import("@vercel/blob");
  const { url } = await put(ruta, datos, {
    access: "public",
    contentType: tipo,
    /*
     * El nombre ya lleva un uuid, así que no hace falta que Blob le agregue su
     * propio sufijo aleatorio: con él la URL sería impredecible y no se podría
     * reconstruir la ruta de un recorte a partir de su hash.
     */
    addRandomSuffix: false,
  });
  return url;
}

/**
 * Escribir al disco en un servidor sin disco.
 *
 * En Vercel el sistema de archivos es de solo lectura, así que `mkdir` falla con
 * un ENOENT sobre `/var/task/...` que no le dice nada a nadie. Si falta el
 * almacenamiento de objetos, es mejor decir exactamente qué falta.
 */
function sinDiscoDondeEscribir() {
  return Boolean(process.env.VERCEL) && !blobConfigurado();
}

export async function guardarImagen(archivo: File): Promise<ResultadoSubida> {
  if (sinDiscoDondeEscribir()) {
    throw new Error(
      "No hay dónde guardar las fotos: falta conectar Vercel Blob. " +
        "En el panel de Vercel, Storage → Create → Blob, y vuelve a desplegar.",
    );
  }
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    throw new Error(`Formato no aceptado: ${archivo.type || "desconocido"}`);
  }
  if (archivo.size > MAX_BYTES_POR_FOTO) {
    throw new Error(`"${archivo.name}" pesa más de 8 MB`);
  }

  const extension = archivo.type.split("/")[1].replace("jpeg", "jpg");
  const nombre = `${randomUUID()}.${extension}`;

  if (blobConfigurado()) {
    const url = await subirABlob(archivo, `vehiculos/${nombre}`, archivo.type);
    return { url, nombre: archivo.name };
  }

  await mkdir(DIRECTORIO, { recursive: true });
  await writeFile(
    path.join(DIRECTORIO, nombre),
    Buffer.from(await archivo.arrayBuffer()),
  );

  return { url: `/uploads/vehiculos/${nombre}`, nombre: archivo.name };
}

const generados = (carpeta: string) => path.join(process.cwd(), "public", "uploads", carpeta);

/**
 * Guarda una imagen que generó un proveedor de IA.
 *
 * A diferencia de las fotos que sube el usuario, acá llega un Buffer y no un
 * File: el proveedor entrega la imagen en una URL firmada que expira, así que
 * se descarga y se guarda de inmediato (ver ia/imagenes/flux.ts).
 */
export async function guardarImagenGenerada(
  datos: Buffer,
  tipo: string,
  carpeta = "showrooms",
  nombreBase = randomUUID(),
): Promise<ResultadoSubida> {
  if (sinDiscoDondeEscribir()) {
    throw new Error(
      "No hay dónde guardar la imagen generada: falta conectar Vercel Blob.",
    );
  }

  const extension = (tipo.split("/")[1] ?? "png").replace("jpeg", "jpg");
  const nombre = `${nombreBase}.${extension}`;

  if (blobConfigurado()) {
    const url = await subirABlob(datos, `${carpeta}/${nombre}`, tipo);
    return { url, nombre };
  }

  await mkdir(generados(carpeta), { recursive: true });
  await writeFile(path.join(generados(carpeta), nombre), datos);

  return { url: `/uploads/${carpeta}/${nombre}`, nombre };
}

/**
 * ¿Existe ya el archivo de una URL local?
 *
 * Solo lo usa la biblioteca compartida, cuyo catálogo vive en código: la escena
 * está listada aunque su imagen todavía no se haya generado. Desaparece junto
 * con el disco local cuando esto se mueva a almacenamiento de objetos.
 */
export function imagenLocalExiste(url: string) {
  // Una URL de Blob es absoluta y no vive en el disco: si está, existe.
  if (url.startsWith("http")) return true;
  return existsSync(path.join(process.cwd(), "public", url.replace(/^\//, "")));
}

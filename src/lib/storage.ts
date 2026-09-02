import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Adaptador de almacenamiento de imágenes.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ATENCIÓN antes de desplegar: esta implementación escribe en el disco local y
 * SOLO SIRVE EN DESARROLLO. En Vercel el sistema de archivos es efímero y de
 * solo lectura, así que las fotos subidas se perderían en cada despliegue.
 *
 * Para producción hay que reemplazar `guardarImagen` por Supabase Storage o
 * Vercel Blob. Es lo único que cambia: el resto de la app solo conoce la URL.
 * ────────────────────────────────────────────────────────────────────────────
 */

export const MAX_FOTOS = 50;
export const MAX_BYTES_POR_FOTO = 8 * 1024 * 1024; // 8 MB
export const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const DIRECTORIO = path.join(process.cwd(), "public", "uploads", "vehiculos");

export type ResultadoSubida = { url: string; nombre: string };

export async function guardarImagen(archivo: File): Promise<ResultadoSubida> {
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    throw new Error(`Formato no aceptado: ${archivo.type || "desconocido"}`);
  }
  if (archivo.size > MAX_BYTES_POR_FOTO) {
    throw new Error(`"${archivo.name}" pesa más de 8 MB`);
  }

  const extension = archivo.type.split("/")[1].replace("jpeg", "jpg");
  const nombre = `${randomUUID()}.${extension}`;

  await mkdir(DIRECTORIO, { recursive: true });
  await writeFile(
    path.join(DIRECTORIO, nombre),
    Buffer.from(await archivo.arrayBuffer()),
  );

  return { url: `/uploads/vehiculos/${nombre}`, nombre: archivo.name };
}

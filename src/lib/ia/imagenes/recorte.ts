import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const ejecutar = promisify(execFile);

/**
 * Recorta el vehículo de su foto y devuelve un PNG con transparencia.
 *
 * NO usa un modelo de imágenes de pago, y es deliberado: un generador redibuja
 * el auto, y acá se publica el auto de un cliente — los píxeles tienen que ser
 * los de su vehículo. La segmentación local (rembg / U2-Net) recorta la foto
 * real, tarda ~6 s de CPU y no cuesta nada por foto.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DEPENDENCIA DE LA MÁQUINA: python3 con `rembg` instalado. En el contenedor de
 * producción hay que agregarlo a la imagen, o mover esto a un servicio aparte.
 * Si falta, el editor lo dice y deja seguir sin recorte.
 * ────────────────────────────────────────────────────────────────────────────
 */
const DIRECTORIO = path.join(process.cwd(), "public", "uploads", "recortes");
const GUION = path.join(process.cwd(), "scripts", "recortar.py");
const ESPERA_MAX_MS = 120_000;

export type ResultadoRecorte = { ok: true; url: string } | { ok: false; mensaje: string };

/**
 * Nombre determinista: la misma foto siempre da el mismo archivo.
 *
 * La versión entra en el hash para invalidar los recortes viejos cuando cambia
 * cómo se recorta. La v2 ajusta el PNG al vehículo: la v1 conservaba el tamaño
 * de la foto original y el margen transparente dejaba al auto levitando sobre
 * el fondo.
 */
const VERSION_RECORTE = "v2";

function nombreDe(urlFoto: string) {
  const hash = createHash("sha1").update(`${VERSION_RECORTE}:${urlFoto}`).digest("hex");
  return `${hash.slice(0, 16)}.png`;
}

/**
 * ¿Ya existe el recorte de esta foto? Sin generarlo.
 *
 * Lo usa la pantalla del editor para mostrar el vehículo puesto de entrada
 * cuando ya se recortó antes, en vez de gastar segundos de CPU en cada carga.
 */
export function recorteExistente(urlFoto: string | undefined | null): string | null {
  if (!urlFoto?.startsWith("/uploads/")) return null;
  const url = `/uploads/recortes/${nombreDe(urlFoto)}`;
  return existsSync(path.join(process.cwd(), "public", url.replace(/^\//, ""))) ? url : null;
}

/**
 * El resultado se guarda con el hash de la foto de origen: la misma foto no se
 * vuelve a recortar nunca, ni siquiera entre vehículos que compartan imagen.
 */
export async function recortarVehiculo(urlFoto: string): Promise<ResultadoRecorte> {
  if (!urlFoto.startsWith("/uploads/")) {
    return { ok: false, mensaje: "La foto tiene que estar subida al inventario." };
  }

  const origen = path.join(process.cwd(), "public", urlFoto.replace(/^\//, ""));
  if (!existsSync(origen)) {
    return { ok: false, mensaje: "No se encontró la foto del vehículo en el servidor." };
  }

  const nombre = nombreDe(urlFoto);
  const destino = path.join(DIRECTORIO, nombre);
  const url = `/uploads/recortes/${nombre}`;
  if (existsSync(destino)) return { ok: true, url };

  await mkdir(DIRECTORIO, { recursive: true });
  try {
    await ejecutar("python3", [GUION, origen, destino], { timeout: ESPERA_MAX_MS });
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      mensaje: detalle.includes("ENOENT")
        ? "Falta python3 en el servidor: sin él no se puede recortar el vehículo."
        : `El recorte falló: ${detalle.split("\n")[0]}`,
    };
  }

  return existsSync(destino)
    ? { ok: true, url }
    : { ok: false, mensaje: "El recorte no dejó ningún archivo." };
}

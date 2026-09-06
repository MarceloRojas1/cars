"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { crearShowroom, getVehiculo } from "@/lib/data";
import { ORG_UUID } from "@/lib/data/ids";
import { armonizarMontaje, type Montaje, type ResultadoArmonizado } from "@/lib/creativos/armonizar";
import { dbConfigurada } from "@/lib/db";
import { claveDeImagenes, proveedorImagenActivo } from "@/lib/ia/imagenes";
import { ALTO, ANCHO, promptDe } from "@/lib/ia/imagenes/escenas";
import { guardarImagenGenerada } from "@/lib/storage";
import { recortarVehiculo, type ResultadoRecorte } from "@/lib/ia/imagenes/recorte";
import type { Vehicle } from "@/lib/types";

const esquema = z.object({
  nombre: z.string().trim().min(2, "Ponle un nombre al fondo").max(40),
  /* La escena la describe el usuario; el encuadre lo pone el sistema. */
  escena: z.string().trim().min(15, "Describe la escena con un poco más de detalle").max(600),
  lineaPiso: z.coerce.number().min(0.4, "La línea de piso queda muy arriba").max(0.95),
});

export type ResultadoShowroom = { ok: boolean; mensaje: string };

/**
 * Genera un fondo propio y lo guarda.
 *
 * El usuario describe la escena, no el encuadre: `promptDe` agrega siempre el
 * de la biblioteca, porque es lo que hace que el fondo sirva para montar un auto —
 * perspectiva de un punto, cámara a ras de suelo y piso despejado adelante. Un
 * fondo bonito con el horizonte a media altura no se puede usar.
 *
 * Tarda: FLUX es asíncrono y la generación puede irse a un minuto o más.
 */
export async function generarShowroomAction(
  _previo: ResultadoShowroom,
  formData: FormData,
): Promise<ResultadoShowroom> {
  if (!dbConfigurada()) {
    return {
      ok: false,
      mensaje: "Sin DATABASE_URL no hay dónde guardar el fondo. Levanta la base con docker compose.",
    };
  }

  const parseado = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { ok: false, mensaje: z.prettifyError(parseado.error).split("\n")[0] };
  }
  const { nombre, escena, lineaPiso } = parseado.data;

  const proveedor = proveedorImagenActivo();
  const clave = await claveDeImagenes(ORG_UUID, proveedor);
  if (!clave) {
    return {
      ok: false,
      mensaje: `Falta la clave de ${proveedor.nombre}. Conéctala en Integraciones o define BFL_API_KEY en el servidor.`,
    };
  }

  const prompt = promptDe(escena);
  const imagen = await proveedor.generar({ prompt, ancho: ANCHO, alto: ALTO }, clave.apiKey);
  if (!imagen.ok) return { ok: false, mensaje: imagen.mensaje };

  const { url } = await guardarImagenGenerada(imagen.datos, imagen.tipo);
  await crearShowroom({
    nombre,
    url,
    proveedor: proveedor.id,
    modelo: imagen.modelo,
    prompt,
    semilla: imagen.semilla,
    lineaPiso,
    ancho: ANCHO,
    alto: ALTO,
  });

  revalidatePath("/estudio");
  return {
    ok: true,
    mensaje: clave.paga === "automotora"
      ? `"${nombre}" quedó en tus showrooms. Se generó con tu cuenta de ${proveedor.nombre}.`
      : `"${nombre}" quedó en tus showrooms.`,
  };
}

/**
 * Recorta el vehículo de su foto principal para poder montarlo sobre un fondo.
 *
 * El resultado se guarda con el hash de la foto, así que apretar dos veces no
 * vuelve a gastar los segundos de CPU.
 */
export async function recortarVehiculoAction(vehiculoId: string): Promise<ResultadoRecorte> {
  const vehiculo = await getVehiculo(vehiculoId);
  if (!vehiculo) return { ok: false, mensaje: "No se encontró el vehículo." };

  const foto = vehiculo.fotoPrincipal ?? vehiculo.fotos?.[0]?.url;
  if (!foto) {
    return { ok: false, mensaje: `${vehiculo.titulo} no tiene fotos cargadas todavía.` };
  }

  return recortarVehiculo(foto);
}

export type VehiculoParaPieza =
  | { ok: true; vehiculo: Vehicle; recorte: string | null; aviso?: string }
  | { ok: false; mensaje: string };

/**
 * Trae un vehículo listo para montarlo, recortándolo si hace falta.
 *
 * Lo usa el cambio de auto dentro del editor. El recorte está cacheado por foto,
 * así que volver a un auto ya usado es instantáneo; la primera vez son unos
 * segundos. Si el recorte falla, igual se devuelve el vehículo: se pueden
 * actualizar los textos aunque no haya imagen.
 */
export async function cargarVehiculoAction(vehiculoId: string): Promise<VehiculoParaPieza> {
  const vehiculo = await getVehiculo(vehiculoId);
  if (!vehiculo) return { ok: false, mensaje: "No se encontró el vehículo." };

  const foto = vehiculo.fotoPrincipal ?? vehiculo.fotos?.[0]?.url;
  if (!foto) return { ok: true, vehiculo, recorte: null, aviso: "No tiene fotos cargadas." };

  const recorte = await recortarVehiculo(foto);
  return recorte.ok
    ? { ok: true, vehiculo, recorte: recorte.url }
    : { ok: true, vehiculo, recorte: null, aviso: recorte.mensaje };
}

/**
 * Integra el vehículo con el fondo usando IA. Devuelve una imagen nueva que
 * reemplaza al par fondo+auto en el lienzo; los textos se siguen dibujando
 * encima en el navegador.
 */
export async function armonizarPiezaAction(montaje: Montaje): Promise<ResultadoArmonizado> {
  return armonizarMontaje(ORG_UUID, montaje);
}

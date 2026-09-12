"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  eliminarDiapositiva, getConfigSitio, guardarConfigSitio, guardarDiapositiva,
} from "@/lib/data";
import { mensajeParaElUsuario } from "@/lib/errores";
import { urlDeFotoValida } from "@/lib/storage";

export type EstadoSitio = { ok: boolean; mensaje: string };

/**
 * El color termina dentro de un atributo `style` del catálogo público, así que
 * se exige hexadecimal de seis dígitos. No es una restricción de comodidad.
 */
const COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser un hexadecimal, por ejemplo #0F4C4C");

const esquemaConfig = z.object({
  color: COLOR,
  heroTitulo: z.string().trim().max(80).optional(),
  heroSubtitulo: z.string().trim().max(160).optional(),
  logoUrl: z.string().optional(),
  portadaUrl: z.string().optional(),
});

/** Las URL de medios se validan contra la misma lista blanca que las fotos. */
const mediaValida = (u?: string) => !u || urlDeFotoValida(u);

export async function guardarSitioAction(
  _previo: EstadoSitio,
  formData: FormData,
): Promise<EstadoSitio> {
  const datos = esquemaConfig.safeParse({
    color: String(formData.get("color") ?? ""),
    heroTitulo: String(formData.get("heroTitulo") ?? "") || undefined,
    heroSubtitulo: String(formData.get("heroSubtitulo") ?? "") || undefined,
    logoUrl: String(formData.get("logoUrl") ?? "") || undefined,
    portadaUrl: String(formData.get("portadaUrl") ?? "") || undefined,
  });
  if (!datos.success) {
    return { ok: false, mensaje: z.flattenError(datos.error).fieldErrors.color?.[0] ?? "Revisa los campos." };
  }
  if (!mediaValida(datos.data.logoUrl) || !mediaValida(datos.data.portadaUrl)) {
    return { ok: false, mensaje: "Alguna imagen no viene del almacenamiento de la aplicación." };
  }

  try {
    await guardarConfigSitio(datos.data);
  } catch (e) {
    return { ok: false, mensaje: mensajeParaElUsuario(e, "No se pudo guardar.") };
  }

  const { slug } = await import("@/lib/data").then((m) => m.getOrganization());
  revalidatePath("/mi-sitio-web");
  revalidatePath(`/${slug}`);   // el catálogo público, que es lo que cambia
  return { ok: true, mensaje: "Guardado." };
}

const esquemaDiapositiva = z.object({
  id: z.string().optional(),
  mediaUrl: z.string().min(1, "Falta la imagen o el video."),
  tipo: z.enum(["imagen", "video"]),
  textoSuperior: z.string().trim().max(40).optional(),
  titulo: z.string().trim().max(80).optional(),
  subtitulo: z.string().trim().max(160).optional(),
  btnTexto: z.string().trim().max(30).optional(),
  btnLink: z.string().trim().max(300).optional(),
  posicion: z.string(),
  orden: z.coerce.number().int().min(0).max(99),
});

export async function guardarDiapositivaAction(
  _previo: EstadoSitio,
  formData: FormData,
): Promise<EstadoSitio> {
  const bruto = Object.fromEntries(formData.entries());
  const datos = esquemaDiapositiva.safeParse({
    ...bruto,
    id: bruto.id || undefined,
    textoSuperior: bruto.textoSuperior || undefined,
    titulo: bruto.titulo || undefined,
    subtitulo: bruto.subtitulo || undefined,
    btnTexto: bruto.btnTexto || undefined,
    btnLink: bruto.btnLink || undefined,
  });
  if (!datos.success) {
    const primero = Object.values(z.flattenError(datos.error).fieldErrors)[0]?.[0];
    return { ok: false, mensaje: primero ?? "Revisa los campos." };
  }
  if (!urlDeFotoValida(datos.data.mediaUrl)) {
    return { ok: false, mensaje: "El archivo no viene del almacenamiento de la aplicación." };
  }

  try {
    await guardarDiapositiva(datos.data);
  } catch (e) {
    return { ok: false, mensaje: mensajeParaElUsuario(e, "No se pudo guardar la diapositiva.") };
  }
  await revalidar();
  return { ok: true, mensaje: "Diapositiva guardada." };
}

export async function eliminarDiapositivaAction(id: string): Promise<EstadoSitio> {
  try {
    await eliminarDiapositiva(id);
  } catch (e) {
    return { ok: false, mensaje: mensajeParaElUsuario(e, "No se pudo eliminar.") };
  }
  await revalidar();
  return { ok: true, mensaje: "Diapositiva eliminada." };
}

async function revalidar() {
  const { slug } = await import("@/lib/data").then((m) => m.getOrganization());
  revalidatePath("/mi-sitio-web");
  revalidatePath(`/${slug}`);
}

export async function configActual() {
  return getConfigSitio();
}

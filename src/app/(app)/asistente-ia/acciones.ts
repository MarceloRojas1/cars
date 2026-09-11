"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  crearKnowledgeItem, eliminarKnowledgeItem, guardarAssistantConfig,
} from "@/lib/data";
import { mensajeParaElUsuario } from "@/lib/errores";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const esquema = z.object({
  triggerCtwa: bool,
  triggerContactosNuevos: bool,
  triggerContactosExistentes: bool,
  servicioConsignacion: bool,
  servicioCompraDirecta: bool,
  servicioFinanciamiento: bool,
  modoConsultor: bool,
  antiguedadMaxFinanciamiento: z.coerce.number().int().min(0).max(30),
  nombreAgente: z.string().trim().min(1, "El agente necesita un nombre").max(60),
  saludo: z.string().trim().max(500),
  tono: z.string().trim().max(500),
  instrucciones: z.string().trim().max(4000),
  prohibiciones: z.string().trim().max(2000),
});

export type EstadoAsistente = {
  ok?: boolean;
  errores?: Record<string, string[]>;
  mensaje?: string;
};

export async function guardarAsistenteAction(
  _previo: EstadoAsistente,
  formData: FormData,
): Promise<EstadoAsistente> {
  const parseado = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return {
      errores: z.flattenError(parseado.error).fieldErrors,
      mensaje: "Revisa los campos marcados.",
    };
  }

  try {
    await guardarAssistantConfig(parseado.data);
  } catch (e) {
    return { mensaje: mensajeParaElUsuario(e, "No se pudo guardar la configuración.") };
  }

  revalidatePath("/asistente-ia");
  return { ok: true, mensaje: "Comportamiento guardado." };
}

const esquemaFaq = z.object({
  titulo: z.string().trim().min(1, "Falta el título").max(120),
  contenido: z.string().trim().min(1, "Falta el contenido").max(2000),
});

export type ResultadoFaq = { ok: boolean; mensaje: string };

export async function crearFaqAction(
  _previo: ResultadoFaq,
  formData: FormData,
): Promise<ResultadoFaq> {
  const parseado = esquemaFaq.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { ok: false, mensaje: z.prettifyError(parseado.error).split("\n")[0] };
  }

  await crearKnowledgeItem({ ...parseado.data, tipo: "faq" });
  revalidatePath("/asistente-ia");
  return { ok: true, mensaje: "Agregado a la base de conocimiento." };
}

export async function eliminarFaqAction(id: string) {
  await eliminarKnowledgeItem(id);
  revalidatePath("/asistente-ia");
}

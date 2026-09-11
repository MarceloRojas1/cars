"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  agregarNotaLead, asignarLead, cambiarVehiculoLead, crearLead,
  getCurrentUser, getDetalleLead, moverLead,
} from "@/lib/data";
import { mensajeParaElUsuario } from "@/lib/errores";

function revalidar() {
  revalidatePath("/embudo");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/vehiculos");
}

export async function moverLeadAction(leadId: string, stageId: string) {
  const r = await moverLead(leadId, stageId);
  if (r.ok) revalidar();
  return r;
}

export async function asignarLeadAction(leadId: string, vendedorId: string | null) {
  await asignarLead(leadId, vendedorId);
  revalidar();
  return { ok: true };
}

const esquemaLead = z.object({
  nombre: z.string().trim().min(1, "El nombre no puede quedar vacío"),
  telefono: z.string().trim().min(8, "Teléfono inválido"),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.email("Correo inválido").optional()),
  source: z.string().trim().min(1),
  tipo: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["venta", "consigna_compra"]).optional(),
  ),
  vehicleId: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  notas: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
});

export type EstadoLead = { errores?: Record<string, string[]>; mensaje?: string; ok?: boolean };

export async function crearLeadAction(
  _previo: EstadoLead,
  formData: FormData,
): Promise<EstadoLead> {
  const parseado = esquemaLead.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { errores: z.flattenError(parseado.error).fieldErrors, mensaje: "Revisa los campos." };
  }
  try {
    await crearLead(parseado.data);
  } catch (e) {
    return { mensaje: mensajeParaElUsuario(e, "No se pudo crear el lead.") };
  }
  revalidar();
  return { ok: true };
}

/* --- panel de detalle --- */

export async function detalleLeadAction(leadId: string) {
  return getDetalleLead(leadId);
}

export async function agregarNotaAction(leadId: string, texto: string) {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "La nota no puede quedar vacía." };
  if (limpio.length > 2000) return { ok: false, error: "La nota es demasiado larga." };

  const usuario = await getCurrentUser();
  await agregarNotaLead(leadId, limpio, usuario.id);
  revalidar();
  return { ok: true };
}

export async function cambiarVehiculoAction(leadId: string, vehicleId: string | null) {
  await cambiarVehiculoLead(leadId, vehicleId);
  revalidar();
  return { ok: true };
}

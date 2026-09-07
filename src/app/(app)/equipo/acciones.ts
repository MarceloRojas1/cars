"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actualizarMiembro, cambiarEstadoMiembro, crearMiembro,
  type ResultadoEscritura,
} from "@/lib/data";

const esquema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  email: z.email("Correo inválido"),
  telefono: z.string().trim().optional(),
  rol: z.enum(["owner", "admin", "vendedor"]),
  branchId: z.string().trim().optional(),
});

export async function guardarMiembroAction(
  _previo: ResultadoEscritura,
  formData: FormData,
): Promise<ResultadoEscritura> {
  const id = String(formData.get("id") ?? "");
  const parseado = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { ok: false, mensaje: z.prettifyError(parseado.error).split("\n")[0] };
  }
  const datos = { ...parseado.data, branchId: parseado.data.branchId || undefined };

  const resultado = id ? await actualizarMiembro(id, datos) : await crearMiembro(datos);
  if (resultado.ok) {
    revalidatePath("/equipo");
    revalidatePath("/sucursales");   // el conteo de equipo por sucursal cambia
  }
  return resultado;
}

export async function cambiarEstadoMiembroAction(
  id: string, activo: boolean,
): Promise<ResultadoEscritura> {
  const resultado = await cambiarEstadoMiembro(id, activo);
  if (resultado.ok) revalidatePath("/equipo");
  return resultado;
}

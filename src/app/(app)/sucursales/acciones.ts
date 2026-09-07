"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actualizarSucursal, cambiarEstadoSucursal, crearSucursal,
  type ResultadoEscritura,
} from "@/lib/data";

const esquema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  direccion: z.string().trim().optional(),
  region: z.string().trim().optional(),
  comuna: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.union([z.literal(""), z.email("Correo inválido")]).optional(),
  esPrincipal: z.union([z.literal("on"), z.literal("")]).optional(),
});

/** Crea o edita según venga `id`: el mismo formulario sirve para las dos cosas. */
export async function guardarSucursalAction(
  _previo: ResultadoEscritura,
  formData: FormData,
): Promise<ResultadoEscritura> {
  const id = String(formData.get("id") ?? "");
  const parseado = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { ok: false, mensaje: z.prettifyError(parseado.error).split("\n")[0] };
  }
  const { esPrincipal, ...resto } = parseado.data;
  const datos = { ...resto, esPrincipal: esPrincipal === "on" };

  const resultado = id ? await actualizarSucursal(id, datos) : await crearSucursal(datos);
  if (resultado.ok) revalidatePath("/sucursales");
  return resultado;
}

export async function cambiarEstadoSucursalAction(
  id: string, activa: boolean,
): Promise<ResultadoEscritura> {
  const resultado = await cambiarEstadoSucursal(id, activa);
  if (resultado.ok) revalidatePath("/sucursales");
  return resultado;
}

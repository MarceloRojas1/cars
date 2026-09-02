"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  actualizarVehiculo, archivarVehiculo, cambiarEstadoVehiculo,
  crearVehiculo, eliminarVehiculo,
} from "@/lib/data";
import { COMBUSTIBLES } from "@/lib/catalogos";

/** Vacío en un formulario es "no informado", no cero ni cadena vacía. */
const opcional = (v: unknown) => (v === "" || v === null ? undefined : v);
const textoOpcional = z.preprocess(opcional, z.string().trim().optional());
const enteroOpcional = z.preprocess(
  (v) => (v === "" || v === null ? undefined : Number(String(v).replace(/\D/g, ""))),
  z.number().int().nonnegative().optional(),
);

const anioActual = new Date().getFullYear();

/**
 * Mínimo para guardar: marca, modelo, año y precio. El resto se completa
 * después — así el vendedor carga rápido y no pierde el auto por no tener a
 * mano la fecha de la revisión técnica.
 */
const esquema = z.object({
  patente: textoOpcional,
  marca: z.string().trim().min(1, "Elige o escribe una marca"),
  modelo: z.string().trim().min(1, "Elige o escribe un modelo"),
  version: textoOpcional,
  anio: z.coerce
    .number()
    .int()
    .min(1900, "Año fuera de rango")
    .max(anioActual + 1, `El año no puede ser mayor a ${anioActual + 1}`),
  titulo: z.string().trim().min(1, "El título no puede quedar vacío").max(100),
  precio: z.preprocess(
    (v) => Number(String(v ?? "").replace(/\D/g, "")),
    z.number().int().positive("El precio debe ser mayor que cero"),
  ),
  pieFinanciamiento: enteroOpcional,
  km: enteroOpcional,
  combustible: z.preprocess(opcional, z.enum(COMBUSTIBLES).optional()),
  transmision: textoOpcional,
  carroceria: textoOpcional,
  puertas: enteroOpcional,
  colorExterior: textoOpcional,
  colorInterior: textoOpcional,
  permisoCirculacionVence: textoOpcional,
  revisionTecnicaVence: textoOpcional,
  cantidadDuenos: enteroOpcional,
  equipamiento: textoOpcional,
  descripcion: textoOpcional,
  branchId: textoOpcional,
  vendedorId: textoOpcional,
  region: textoOpcional,
  comuna: textoOpcional,
});

/** Las fotos llegan como URLs: ya se subieron por /api/fotos antes del submit. */
const esquemaFotos = z
  .array(z.object({ url: z.string().startsWith("/"), esPrincipal: z.boolean() }))
  .max(50, "Máximo 50 fotos por vehículo");

export type EstadoFormulario = {
  errores?: Record<string, string[]>;
  mensaje?: string;
};

export async function crearVehiculoAction(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const crudo = Object.fromEntries(formData.entries());
  const parseado = esquema.safeParse(crudo);

  if (!parseado.success) {
    return {
      errores: z.flattenError(parseado.error).fieldErrors,
      mensaje: "Revisa los campos marcados.",
    };
  }

  const tags = formData.getAll("tags").map(String).filter(Boolean);

  const fotosCrudas = formData.get("fotos");
  const fotos = esquemaFotos.safeParse(
    fotosCrudas ? JSON.parse(String(fotosCrudas)) : [],
  );
  if (!fotos.success) {
    return { mensaje: "Hay un problema con las fotos cargadas." };
  }

  try {
    await crearVehiculo({ ...parseado.data, tags, fotos: fotos.data });
  } catch (e) {
    return {
      mensaje:
        e instanceof Error ? e.message : "No se pudo guardar el vehículo.",
    };
  }

  revalidatePath("/vehiculos");
  revalidatePath("/dashboard");
  redirect("/vehiculos");
}

/* --- acciones sobre una ficha existente --- */

const ESTADOS = ["disponible", "pendiente", "reservado", "vendido"] as const;

function revalidar() {
  revalidatePath("/vehiculos");
  revalidatePath("/dashboard");
}

export async function actualizarVehiculoAction(
  id: string,
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const parseado = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return {
      errores: z.flattenError(parseado.error).fieldErrors,
      mensaje: "Revisa los campos marcados.",
    };
  }

  const tags = formData.getAll("tags").map(String).filter(Boolean);
  const fotosCrudas = formData.get("fotos");
  const fotos = esquemaFotos.safeParse(fotosCrudas ? JSON.parse(String(fotosCrudas)) : []);
  if (!fotos.success) return { mensaje: "Hay un problema con las fotos cargadas." };

  try {
    await actualizarVehiculo(id, { ...parseado.data, tags, fotos: fotos.data });
  } catch (e) {
    return { mensaje: e instanceof Error ? e.message : "No se pudo guardar." };
  }

  revalidar();
  redirect("/vehiculos");
}

export async function cambiarEstadoAction(id: string, estado: string) {
  const valido = z.enum(ESTADOS).safeParse(estado);
  if (!valido.success) return { error: "Estado desconocido." };

  await cambiarEstadoVehiculo(id, valido.data);
  revalidar();
  return { ok: true };
}

export async function archivarAction(id: string, archivar: boolean) {
  await archivarVehiculo(id, archivar);
  revalidar();
  return { ok: true };
}

export async function eliminarAction(id: string) {
  await eliminarVehiculo(id);
  revalidar();
  return { ok: true };
}

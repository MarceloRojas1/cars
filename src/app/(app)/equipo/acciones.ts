"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actualizarMiembro, cambiarEstadoMiembro, crearMiembro, getCurrentUser,
  type ResultadoEscritura,
} from "@/lib/data";
import { crearInvitacion, type InvitacionCreada } from "@/lib/auth/invitaciones";
import { sesionActual, enDesarrolloSinLogin } from "@/lib/auth/sesion";

/**
 * El resultado de guardar un miembro, más el enlace de acceso cuando se acaba
 * de crear. La pantalla lo muestra una vez para que el admin lo copie: el token
 * no se guarda en ninguna parte, así que esta es la única oportunidad de verlo.
 */
export type ResultadoMiembro = ResultadoEscritura & {
  invitacion?: InvitacionCreada;
};

const esquema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  email: z.email("Correo inválido"),
  telefono: z.string().trim().optional(),
  rol: z.enum(["owner", "admin", "vendedor"]),
  branchId: z.string().trim().optional(),
});

/**
 * Invitar y cambiar roles es de dueños y administradores.
 *
 * Un vendedor que pudiera invitar podría darse a sí mismo una segunda cuenta
 * con rol owner, y ahí el rol deja de significar nada. Es el único permiso que
 * se aplica hoy; el resto sigue abierto (ver AGENTS.md, "permisos del rol
 * vendedor").
 */
async function puedeAdministrarEquipo() {
  const sesion = await sesionActual();
  if (!sesion) return enDesarrolloSinLogin();
  return sesion.rol === "owner" || sesion.rol === "admin";
}

export async function guardarMiembroAction(
  _previo: ResultadoMiembro,
  formData: FormData,
): Promise<ResultadoMiembro> {
  if (!(await puedeAdministrarEquipo())) {
    return { ok: false, mensaje: "Solo el dueño o un administrador puede cambiar el equipo." };
  }

  const id = String(formData.get("id") ?? "");
  const parseado = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { ok: false, mensaje: z.prettifyError(parseado.error).split("\n")[0] };
  }
  const datos = { ...parseado.data, branchId: parseado.data.branchId || undefined };

  const resultado = id ? await actualizarMiembro(id, datos) : await crearMiembro(datos);
  if (!resultado.ok) return resultado;

  revalidatePath("/equipo");
  revalidatePath("/sucursales");   // el conteo de equipo por sucursal cambia

  /*
   * Al crear se emite la invitación en el mismo paso. Antes, agregar a alguien
   * dejaba una ficha sin cuenta y sin nada que lo dijera: aparecía en el equipo
   * y no podía entrar.
   */
  if (!id) {
    const yo = await getCurrentUser().catch(() => null);
    const invitacion = await crearInvitacion(resultado.id, datos.rol, yo?.id);
    return { ...resultado, invitacion };
  }

  return resultado;
}

/** Vuelve a emitir el enlace: el anterior se perdió, o venció. */
export async function reinvitarAction(
  appUserId: string,
  rol: "owner" | "admin" | "vendedor",
): Promise<ResultadoMiembro> {
  if (!(await puedeAdministrarEquipo())) {
    return { ok: false, mensaje: "Solo el dueño o un administrador puede invitar." };
  }
  const yo = await getCurrentUser().catch(() => null);
  const invitacion = await crearInvitacion(appUserId, rol, yo?.id);
  revalidatePath("/equipo");
  return { ok: true, id: appUserId, invitacion };
}

export async function cambiarEstadoMiembroAction(
  id: string, activo: boolean,
): Promise<ResultadoEscritura> {
  if (!(await puedeAdministrarEquipo())) {
    return { ok: false, mensaje: "Solo el dueño o un administrador puede cambiar el equipo." };
  }
  /*
   * Desactivar corta el acceso sin tocar `membership`: `sesionActual()` exige
   * `activo` al buscar el perfil, así que una cuenta desactivada no resuelve
   * sesión. Se conserva la fila para poder reactivar a alguien que vuelve.
   */
  const resultado = await cambiarEstadoMiembro(id, activo);
  if (resultado.ok) revalidatePath("/equipo");
  return resultado;
}

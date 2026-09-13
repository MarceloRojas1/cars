"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { consultar } from "@/lib/db";
import { orgActual, sesionActual, enDesarrolloSinLogin } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { uuidDe } from "@/lib/data/ids";
import { getCurrentUser } from "@/lib/data";

export type EstadoCuenta = { ok: boolean; mensaje: string };

const perfil = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre."),
  telefono: z.string().trim().max(20).optional(),
});

/**
 * Los datos propios: nombre y teléfono.
 *
 * NO incluye el rol ni la sucursal a propósito: eso lo administra el dueño
 * desde Equipo. Si cada quien pudiera cambiarse el rol, el rol no serviría de
 * nada.
 *
 * El correo tampoco: es la identidad con la que se entra, vive en Supabase
 * además de en `app_user`, y cambiarlo dispara una confirmación por correo.
 * Es su propio flujo y todavía no está resuelto — ver docs/decisiones.md.
 */
export async function guardarPerfilAction(
  _previo: EstadoCuenta,
  formData: FormData,
): Promise<EstadoCuenta> {
  const sesion = await sesionActual();
  if (!sesion && !enDesarrolloSinLogin()) {
    return { ok: false, mensaje: "Tu sesión expiró. Vuelve a entrar." };
  }

  const parseado = perfil.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { ok: false, mensaje: z.prettifyError(parseado.error).split("\n")[0] };
  }

  const orgId = await orgActual();

  /*
   * El id sale de la SESIÓN, nunca del formulario: si viniera del cliente,
   * cualquiera podría editar la ficha de otro mandando otro id. El respaldo
   * solo corre en desarrollo sin login, donde `sesionActual()` es null y el
   * usuario es el primero de la semilla.
   */
  const yo = await getCurrentUser();
  const usuarioId = sesion?.usuarioId ?? uuidDe(yo.id);
  await consultar(
    orgId,
    `update app_user set nombre = $3, telefono = $4
      where organization_id = $1 and id = $2`,
    [orgId, usuarioId, parseado.data.nombre, parseado.data.telefono || null],
  );

  revalidatePath("/mi-cuenta");
  revalidatePath("/equipo");
  return { ok: true, mensaje: "Listo, guardado." };
}

const MINIMO = 8;

/**
 * Cambiar la contraseña propia.
 *
 * Usa la sesión de la persona, no la clave de servicio: Supabase ya sabe quién
 * es por la cookie. Por eso esto funciona aunque el servidor no tenga
 * SUPABASE_SERVICE_ROLE_KEY, a diferencia de crear cuentas.
 *
 * Se revalida la actual antes de cambiarla: sin eso, alguien que encuentre una
 * sesión abierta se queda con la cuenta cambiando la contraseña sin saber la
 * anterior.
 */
export async function cambiarPasswordAction(
  _previo: EstadoCuenta,
  formData: FormData,
): Promise<EstadoCuenta> {
  const sesion = await sesionActual();
  if (!sesion) return { ok: false, mensaje: "Tu sesión expiró. Vuelve a entrar." };

  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const repetida = String(formData.get("nueva2") ?? "");

  if (nueva.length < MINIMO) {
    return { ok: false, mensaje: `La contraseña nueva necesita al menos ${MINIMO} caracteres.` };
  }
  if (nueva !== repetida) return { ok: false, mensaje: "Las dos contraseñas nuevas no son iguales." };
  if (nueva === actual) return { ok: false, mensaje: "La contraseña nueva es igual a la actual." };

  const supabase = await createClient();

  const { error: malActual } = await supabase.auth.signInWithPassword({
    email: sesion.email, password: actual,
  });
  if (malActual) return { ok: false, mensaje: "Tu contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    console.error("[mi-cuenta] no se pudo cambiar la contraseña", error.message);
    return { ok: false, mensaje: "No se pudo cambiar la contraseña. Inténtalo de nuevo." };
  }

  return { ok: true, mensaje: "Contraseña cambiada." };
}

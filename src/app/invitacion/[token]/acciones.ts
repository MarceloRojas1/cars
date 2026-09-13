"use server";

import { redirect } from "next/navigation";
import { canjearInvitacion } from "@/lib/auth/invitaciones";
import { createClient } from "@/lib/supabase/server";

export type EstadoInvitacion = { mensaje: string };

/**
 * Longitud mínima. Supabase rechaza por debajo de 6 y devuelve su mensaje en
 * inglés; se valida acá para decirlo en español y antes de ir al servidor.
 */
const MINIMO = 8;

export async function activarCuentaAction(
  _previo: EstadoInvitacion,
  formData: FormData,
): Promise<EstadoInvitacion> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const repetida = String(formData.get("password2") ?? "");

  if (password.length < MINIMO) {
    return { mensaje: `La contraseña necesita al menos ${MINIMO} caracteres.` };
  }
  if (password !== repetida) {
    return { mensaje: "Las dos contraseñas no son iguales." };
  }

  const resultado = await canjearInvitacion(token, password);
  if (!resultado.ok) return { mensaje: resultado.mensaje };

  /*
   * Se entra sola en vez de mandar al login: la persona acaba de escribir su
   * contraseña dos veces, pedírsela una tercera para lo mismo no aporta nada.
   * Si el inicio falla —cosa que no debería— se cae al login, donde la cuenta
   * ya existe y sus credenciales sirven.
   */
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  redirect(error ? "/login" : "/dashboard");
}

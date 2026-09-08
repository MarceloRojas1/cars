"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { mensaje: string };

/** Solo caminos internos: con una URL absoluta esto sería un redirector abierto. */
function destinoSeguro(valor: FormDataEntryValue | null) {
  const v = typeof valor === "string" ? valor : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

export async function entrarAction(
  _previo: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const volver = destinoSeguro(formData.get("volver"));

  if (!email || !password) return { mensaje: "Escribe tu correo y tu contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  /*
   * Un mensaje único para credenciales malas: decir "ese correo no existe"
   * le confirma a cualquiera qué correos tienen cuenta.
   */
  if (error) return { mensaje: "Correo o contraseña incorrectos." };

  redirect(volver);
}

export async function salirAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

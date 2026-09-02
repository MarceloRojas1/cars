"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { desconectarIntegracion, guardarIntegracion } from "@/lib/data";
import { cifrar, enmascarar, hayClaveMaestra } from "@/lib/cripto";
import { probarClave } from "@/lib/ia/claude";
import { MODELOS_DISPONIBLES } from "@/lib/ia/modelos";

const esquema = z.object({
  // Las claves de Anthropic empiezan con sk-ant-. Validarlo acá evita gastar
  // una llamada de red en un pegado obviamente incorrecto.
  apiKey: z.string().trim().startsWith("sk-ant-", "La clave debe empezar con sk-ant-").min(20),
  modelo: z.enum(MODELOS_DISPONIBLES.map((m) => m.id) as [string, ...string[]]),
});

export type ResultadoClaude = { ok: boolean; mensaje: string };

/**
 * Prueba la clave y, solo si funciona, la guarda cifrada.
 *
 * La clave nunca vuelve al navegador: se devuelve una pista con los últimos
 * caracteres para que el usuario reconozca cuál dejó puesta.
 */
export async function conectarClaudeAction(
  _previo: ResultadoClaude,
  formData: FormData,
): Promise<ResultadoClaude> {
  if (!hayClaveMaestra()) {
    return {
      ok: false,
      mensaje: "Falta APP_ENCRYPTION_KEY en el servidor. Sin ella no se guardan credenciales.",
    };
  }

  const parseado = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!parseado.success) {
    return { ok: false, mensaje: z.prettifyError(parseado.error).split("\n")[0] };
  }
  const { apiKey, modelo } = parseado.data;

  const prueba = await probarClave(apiKey, modelo);
  if (!prueba.ok) return { ok: false, mensaje: prueba.mensaje };

  await guardarIntegracion("claude", {
    estado: "conectado",
    cuenta: enmascarar(apiKey),
    credenciales: { apiKey: cifrar(apiKey), modelo, pista: enmascarar(apiKey) },
  });

  revalidatePath("/integraciones");
  revalidatePath("/asistente-ia");
  return { ok: true, mensaje: `Conectado con ${prueba.modelo}.` };
}

export async function desconectarClaudeAction() {
  await desconectarIntegracion("claude");
  revalidatePath("/integraciones");
  return { ok: true };
}

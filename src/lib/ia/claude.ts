import Anthropic from "@anthropic-ai/sdk";
import { consultar } from "@/lib/db";
import { descifrar } from "@/lib/cripto";
import { MODELO_POR_DEFECTO } from "./modelos";

/**
 * Cliente de Claude por automotora.
 *
 * Cada organización trae SU propia clave de API: el consumo y la facturación son
 * suyos, y una automotora nunca gasta la cuota de otra. Por eso el cliente se
 * construye por organización y no una sola vez para toda la aplicación.
 */

type CredencialClaude = { apiKey: string; modelo?: string; paga: "automotora" | "plataforma" };

/**
 * Con qué clave habla el asistente — el mismo modelo mixto que las imágenes.
 *
 * Si la automotora conectó su cuenta, paga ella. Si no, se usa la de la
 * plataforma: el asistente es el corazón del producto y no puede depender de
 * que cada cliente abra una cuenta en Anthropic y cargue facturación. En el
 * producto original Claude figura como "incluido" en el plan, no como algo que
 * el cliente conecta.
 */
async function credencialDe(orgId: string): Promise<CredencialClaude | null> {
  const filas = await consultar<{ credenciales: { apiKey?: string; modelo?: string } | null }>(
    orgId,
    `select credenciales from integration
      where organization_id = $1 and proveedor = 'claude' and estado = 'conectado'`,
    [orgId],
  );
  const guardado = filas[0]?.credenciales;
  if (guardado?.apiKey) {
    return { apiKey: descifrar(guardado.apiKey), modelo: guardado.modelo, paga: "automotora" };
  }

  const plataforma = process.env.ANTHROPIC_API_KEY;
  return plataforma ? { apiKey: plataforma, paga: "plataforma" } : null;
}

/** null solo si no hay clave por ningún lado: ni de la automotora ni de la plataforma. */
export async function clienteClaude(
  orgId: string,
): Promise<{ cliente: Anthropic; modelo: string; paga: "automotora" | "plataforma" } | null> {
  const credencial = await credencialDe(orgId);
  if (!credencial) return null;

  return {
    cliente: new Anthropic({ apiKey: credencial.apiKey }),
    modelo: credencial.modelo ?? MODELO_POR_DEFECTO,
    paga: credencial.paga,
  };
}

export type ResultadoPrueba =
  | { ok: true; modelo: string; mensaje: string }
  | { ok: false; mensaje: string };

/**
 * Verifica la clave con una llamada mínima antes de guardarla.
 *
 * Guardar sin probar deja el problema para el día que llegue un lead de verdad,
 * que es el peor momento para descubrir que la clave estaba mal pegada.
 */
export async function probarClave(apiKey: string, modelo: string): Promise<ResultadoPrueba> {
  const cliente = new Anthropic({ apiKey });
  try {
    const respuesta = await cliente.messages.create({
      model: modelo,
      max_tokens: 32,
      system: "Responde únicamente con la palabra: listo",
      messages: [{ role: "user", content: "Prueba de conexión." }],
    });
    const texto = respuesta.content.find((b) => b.type === "text");
    return {
      ok: true,
      modelo: respuesta.model,
      mensaje: texto && texto.type === "text" ? texto.text.trim() : "Conexión correcta.",
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, mensaje: "La clave no es válida o fue revocada." };
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, mensaje: "La clave no tiene permiso para usar este modelo." };
    }
    if (error instanceof Anthropic.NotFoundError) {
      return { ok: false, mensaje: `Tu cuenta no tiene acceso al modelo ${modelo}.` };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, mensaje: "La cuenta está con el límite de uso alcanzado." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, mensaje: `Anthropic respondió ${error.status}: ${error.message}` };
    }
    return { ok: false, mensaje: "No se pudo contactar a Anthropic." };
  }
}

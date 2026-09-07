import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta firma cada POST del webhook con HMAC-SHA256 del cuerpo crudo, usando el
 * secreto de la app (no el token de acceso). Sin verificar esto, cualquiera
 * que adivine la URL puede mandar leads falsos o gastar la cuota de IA.
 *
 * Tiene que recibir el cuerpo SIN parsear: un JSON.stringify(JSON.parse(x))
 * no reproduce bytes idénticos y la firma no calzaría nunca.
 */
export function firmaValida(cuerpoCrudo: string, firmaRecibida: string | null): boolean {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !firmaRecibida) return false;

  const esperada = `sha256=${createHmac("sha256", secreto).update(cuerpoCrudo, "utf8").digest("hex")}`;
  const a = Buffer.from(esperada);
  const b = Buffer.from(firmaRecibida);
  return a.length === b.length && timingSafeEqual(a, b);
}

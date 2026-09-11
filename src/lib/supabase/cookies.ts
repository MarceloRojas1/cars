import type { CookieOptions } from "@supabase/ssr";

/**
 * Cómo se guarda la cookie de sesión.
 *
 * Por defecto `@supabase/ssr` la deja LEGIBLE desde JavaScript, porque su
 * cliente de navegador necesita sacar la sesión de ahí. Esta aplicación no usa
 * ese cliente —la sesión se resuelve siempre en el servidor— así que no hay
 * motivo para dejarla expuesta: con `httpOnly` un fallo de XSS ya no se lleva
 * la sesión de nadie.
 *
 * `secure` solo en producción: en desarrollo se sirve por http y una cookie
 * marcada como segura no se guardaría, dejando el login inservible en local.
 *
 * `sameSite: lax` deja que la cookie viaje al volver de un enlace externo —un
 * correo de invitación, por ejemplo— pero no en peticiones de otro sitio.
 */
export const OPCIONES_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

/** Mezcla lo nuestro sobre lo que proponga Supabase. Lo nuestro manda. */
export const conOpciones = (propias: CookieOptions = {}): CookieOptions => ({
  ...propias,
  ...OPCIONES_COOKIE,
});

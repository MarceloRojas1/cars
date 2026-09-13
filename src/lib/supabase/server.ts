import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { conOpciones, OPCIONES_COOKIE } from "./cookies";
import { clavePublica, hayAuthConfigurada, urlPublica } from "./publica";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    urlPublica()!,
    clavePublica()!,
    {
      cookieOptions: OPCIONES_COOKIE,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, conOpciones(options)),
            );
          } catch {
            // Llamado desde un Server Component: el middleware refresca la sesión.
          }
        },
      },
    },
  );
}

/** ¿Hay credenciales configuradas? Mientras no las haya, la app usa los datos semilla. */
export function supabaseConfigurado() {
  return hayAuthConfigurada();
}

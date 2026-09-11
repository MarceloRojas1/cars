import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { conOpciones, OPCIONES_COOKIE } from "./cookies";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

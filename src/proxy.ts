import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { esRutaDelPanel } from "@/lib/rutas";

/**
 * La puerta del panel.
 *
 * Corre ANTES de renderizar cualquier página, así que es lo único que garantiza
 * que una ruta nueva del panel nazca protegida: si se agrega una pantalla y se
 * olvida el chequeo de sesión, esta lista igual la cubre.
 *
 * En Next 16 el archivo se llama `proxy.ts` — `middleware.ts` quedó deprecado y
 * renombrado, con la misma funcionalidad.
 *
 * Tres caminos y solo tres:
 *  · El catálogo público (`/{slug}`) pasa sin tocar nada. No hay sesión que
 *    pedirle a un comprador anónimo.
 *  · Los webhooks (`/api/webhooks/*`) pasan sin sesión: los autentica Meta con
 *    su firma HMAC, no una cookie. Pedirles login los rompería.
 *  · El panel exige sesión.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esPanel = esRutaDelPanel(pathname);
  const esLogin = pathname === "/login";

  /*
   * El catálogo público sale de acá SIN consultar a Supabase.
   *
   * No es una optimización: es aislamiento. Si Supabase estuviera caído o
   * lento, consultarlo en cada visita al catálogo se llevaría puesto el sitio
   * público de todas las automotoras por un problema del login, que el
   * comprador ni usa.
   */
  if (!esPanel && !esLogin) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /*
   * Sin Supabase configurado no hay login posible. En desarrollo eso es lo
   * normal y se deja pasar; en producción sería un panel abierto, así que se
   * corta con 503 en vez de servirlo.
   *
   * `orgActual()` aplica exactamente la misma regla del otro lado.
   */
  if (!url || !anon) {
    if (process.env.NODE_ENV === "production" && esPanel) {
      return new NextResponse(
        "Falta configurar la autenticación (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).",
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  // La respuesta se crea antes de consultar para poder escribirle las cookies
  // que Supabase renueva al refrescar el token.
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options),
        );
      },
    },
  });

  /*
   * `getUser()` y no `getSession()`: el primero valida el token contra
   * Supabase; el segundo solo lee la cookie, que el navegador puede fabricar.
   *
   * Si la consulta falla —Supabase caído, red cortada— se trata como "no hay
   * usuario". Es la decisión segura: ante la duda, al login, nunca adentro.
   */
  let hayUsuario = false;
  try {
    const { data } = await supabase.auth.getUser();
    hayUsuario = Boolean(data.user);
  } catch (e) {
    console.error("[proxy] no se pudo validar la sesión", e);
  }

  if (esPanel && !hayUsuario) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    // A dónde volver después de entrar; solo caminos internos, nunca una URL
    // completa: con una absoluta esto sería un redirector abierto.
    destino.searchParams.set("volver", pathname);
    return NextResponse.redirect(destino);
  }

  if (esLogin && hayUsuario) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/dashboard";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  /*
   * Todo menos archivos estáticos, imágenes optimizadas y los webhooks. El
   * proxy corre en cada petición que pasa por acá, así que dejar fuera lo que
   * no necesita sesión es correctitud y de paso rendimiento.
   */
  matcher: [
    "/((?!_next/static|_next/image|api/webhooks|favicon.ico|icon.svg|uploads/|.*\\.(?:png|jpe?g|webp|avif|svg|gif|ico)$).*)",
  ],
};

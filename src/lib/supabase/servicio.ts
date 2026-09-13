/**
 * La clave con la que el servidor administra Supabase, con todos los nombres
 * que puede tener.
 *
 * SON DOS CLAVES DISTINTAS, no dos nombres de la misma:
 *
 *   · `SUPABASE_SECRET_KEY`       → la nueva, `sb_secret_…`
 *   · `SUPABASE_SERVICE_ROLE_KEY` → la legada, un JWT largo que parte con `eyJ`
 *
 * Supabase migró a las primeras y en el panel ya solo ofrece esas; las legadas
 * viven en una pestaña aparte y están en camino de desaparecer. Las dos sirven
 * para el API de administración, así que se aceptan las dos y gana la que esté.
 *
 * Encima, la integración de Supabase en Vercel inyecta las suyas con un PREFIJO
 * configurable, y en este proyecto ese prefijo quedó relleno con el valor de la
 * publishable key — así que las mismas claves existen además como
 * `sb_publishable_XpuoJO…_SUPABASE_SECRET_KEY`, nombres que ningún código
 * buscaría. El resultado era que crear cuentas fallaba en producción aunque la
 * credencial estuviera ahí.
 *
 * Es el mismo respaldo que `db.ts` hace con `POSTGRES_URL`, y por la misma
 * razón: que olvidar duplicar una variable a mano no se manifieste como una
 * función que simplemente no anda.
 */

/** Los sufijos que identifican una clave de administración, en orden de preferencia. */
const NOMBRES = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export function claveDeServicio(): string | undefined {
  // Primero los nombres exactos: son los que alguien puso a propósito.
  for (const nombre of NOMBRES) {
    const valor = process.env[nombre];
    if (valor?.trim()) return valor;
  }

  /*
   * Después, cualquier nombre TERMINADO en uno de esos. Se compara el sufijo y
   * no el prefijo escrito a mano, para que siga funcionando si alguien arregla
   * el prefijo de la integración o crea el proyecto de nuevo.
   */
  for (const sufijo of NOMBRES) {
    for (const [nombre, valor] of Object.entries(process.env)) {
      if (nombre.endsWith(`_${sufijo}`) && valor?.trim()) return valor;
    }
  }
  return undefined;
}

/**
 * La URL del proyecto. SIN respaldo, y eso es la decisión.
 *
 * Se intentó el mismo truco que arriba y salió mal en la primera prueba: como
 * `.env.local` trae las credenciales de PRODUCCIÓN bajo los nombres con
 * prefijo, resolver la URL así hizo que un canje de invitación en localhost
 * creara una cuenta de verdad en el Supabase de producción. La creó, y hubo
 * que borrarla a mano.
 *
 * Con solo `NEXT_PUBLIC_SUPABASE_URL`, el desarrollo local —que no la tiene—
 * falla ruidoso en vez de alcanzar producción por accidente. En producción sí
 * existe con el nombre correcto, así que el camino real no se ve afectado.
 *
 * La regla general: un respaldo de nombres está bien para LEER configuración
 * que ya es del entorno en que se corre; no está bien cuando el valor decide
 * CONTRA QUÉ SISTEMA se escribe.
 */
export function urlDeSupabase(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

/** Para los chequeos de despliegue y los mensajes de error. */
export const hayClaveDeServicio = () => Boolean(claveDeServicio());

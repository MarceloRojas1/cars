import { cache } from "react";
import { consultar } from "@/lib/db";
import { ORG_UUID } from "@/lib/data/ids";

/**
 * Quién está mirando, y de qué automotora.
 *
 * Es la pieza de seguridad del producto. Hasta ahora la organización era una
 * constante en el código: el aislamiento por RLS funcionaba, pero Postgres
 * servía fielmente los datos de la organización que le pidiéramos. Con esto, esa
 * organización sale de la sesión y no de una constante.
 *
 * `cache()` la resuelve UNA vez por petición: la capa de datos la pide en cada
 * consulta y sería absurdo ir a la base a preguntar quién es cada vez.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MIENTRAS NO HAY SESIÓN cae a `ORG_UUID`, que es la organización de la semilla.
 * Eso mantiene el desarrollo local andando sin login, pero NO puede llegar así a
 * producción: sin sesión, cualquiera vería los datos de esa organización. El
 * salto a producción es cambiar este `?? ORG_UUID` por un error.
 * ────────────────────────────────────────────────────────────────────────────
 */
export type Sesion = {
  usuarioId: string;
  organizacionId: string;
  rol: "owner" | "admin" | "vendedor";
  nombre: string;
  email: string;
};

/** null cuando no hay nadie autenticado. */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const { createClient } = await import("@/lib/supabase/server");

  let authUserId: string | undefined;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    authUserId = data.user?.id;
  } catch {
    return null;   // Supabase no configurado todavía
  }
  if (!authUserId) return null;

  /*
   * La organización sale de `membership`, no de un dato que mande el navegador.
   * Y el perfil sale de `app_user`, que es la lista del equipo que administra la
   * automotora: un usuario autenticado sin fila ahí no tiene acceso.
   */
  const filas = await consultar<{
    organization_id: string; rol: Sesion["rol"]; nombre: string; email: string; id: string;
  }>(
    ORG_UUID,
    `select m.organization_id, m.rol, u.nombre, u.email, u.id
       from membership m
       join app_user u
         on u.organization_id = m.organization_id and u.auth_user_id = m.user_id
      where m.user_id = $1
      limit 1`,
    [authUserId],
  );
  if (!filas[0]) return null;

  return {
    usuarioId: filas[0].id,
    organizacionId: filas[0].organization_id,
    rol: filas[0].rol,
    nombre: filas[0].nombre,
    email: filas[0].email,
  };
});

/**
 * La organización para la que se consulta. Toda consulta pasa por acá.
 *
 * Ver la advertencia de arriba sobre el respaldo a `ORG_UUID`.
 */
export const orgActual = cache(async (): Promise<string> => {
  const sesion = await sesionActual();
  return sesion?.organizacionId ?? ORG_UUID;
});

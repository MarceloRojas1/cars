import { cache } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { consultar } from "@/lib/db";
import { ORG_UUID } from "@/lib/data/ids";

/**
 * Organización nula para la consulta que todavía no sabe cuál es.
 * `membership` no lleva RLS, así que el valor no filtra nada; está para que
 * `consultar()` reciba algo y la transacción quede acotada igual.
 */
const SIN_ORGANIZACION = "00000000-0000-0000-0000-000000000000";

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
 * EN PRODUCCIÓN, sin sesión no hay organización: `orgActual()` lanza. En
 * desarrollo cae a la organización de la semilla para poder trabajar sin login.
 *
 * La condición es `NODE_ENV === "production"` y no "¿está Supabase
 * configurado?" a propósito: con la segunda, olvidar una variable de entorno en
 * el despliegue abriría el panel entero en silencio. Con esta, olvidarla rompe
 * ruidosamente, que es lo correcto para un fallo de autenticación.
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
   * DOS consultas, y el orden es lo que importa.
   *
   * Primero `membership`, que es la única tabla que se puede leer sin saber aún
   * la organización: no lleva RLS, justamente porque es la que responde "¿a
   * cuál perteneces?". Recién con esa respuesta se puede consultar `app_user`,
   * que sí la lleva.
   *
   * En una sola consulta con join no funciona: la transacción tiene que
   * declarar una organización ANTES de saber cuál es, y con la equivocada RLS
   * filtra las filas de `app_user` y la sesión sale nula. Se veía como "sin
   * sesión" después de un login correcto. En desarrollo pasaba desapercibido
   * porque la organización de la semilla era la única que existía.
   */
  const pertenencia = await consultar<{ organization_id: string; rol: Sesion["rol"] }>(
    SIN_ORGANIZACION,
    "select organization_id, rol from membership where user_id = $1 limit 1",
    [authUserId],
  );
  if (!pertenencia[0]) return null;

  const orgId = pertenencia[0].organization_id;

  // El perfil sale de `app_user`, la lista del equipo que administra la
  // automotora: un usuario autenticado sin fila ahí no tiene acceso.
  const perfil = await consultar<{ id: string; nombre: string; email: string }>(
    orgId,
    `select id, nombre, email from app_user
      where organization_id = $1 and auth_user_id = $2 and activo
      limit 1`,
    [orgId, authUserId],
  );
  if (!perfil[0]) return null;

  return {
    usuarioId: perfil[0].id,
    organizacionId: orgId,
    rol: pertenencia[0].rol,
    nombre: perfil[0].nombre,
    email: perfil[0].email,
  };
});

/**
 * Organización fijada a mano para trabajo que no nace de una sesión.
 *
 * El caso real es el webhook de WhatsApp: quien llama es Meta, no una persona,
 * así que no hay cookie que consultar — y sin embargo el mensaje pertenece a
 * una automotora concreta. Esa organización se resuelve del número que recibió
 * el mensaje y se fija acá para todo el procesamiento.
 *
 * `AsyncLocalStorage` y no una variable suelta: el servidor atiende varias
 * peticiones a la vez, y una global haría que el mensaje de una automotora se
 * procesara con la organización de otra. Cada cadena de llamadas ve la suya.
 */
const organizacionFijada = new AsyncLocalStorage<string>();

/** Corre `fn` declarando explícitamente la organización, sin sesión. */
export function comoOrganizacion<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  return organizacionFijada.run(orgId, fn);
}

/** ¿Corremos con el respaldo de desarrollo, sin login? */
export const enDesarrolloSinLogin = () => process.env.NODE_ENV !== "production";

/**
 * La organización para la que se consulta. Toda consulta del panel pasa por acá.
 *
 * El catálogo público NO la usa: ahí no hay sesión y la organización sale del
 * slug de la URL (ver `data/catalogo.ts`).
 */
/**
 * Solo la resolución por SESIÓN se memoriza. La organización fijada se consulta
 * fuera del `cache()` a propósito: dentro de una misma petición puede cambiar
 * —el webhook la fija al procesar cada mensaje— y un valor memorizado de antes
 * atribuiría el mensaje a la automotora equivocada.
 */
const organizacionDeSesion = cache(async (): Promise<string> => {
  const sesion = await sesionActual();
  if (sesion) return sesion.organizacionId;

  if (enDesarrolloSinLogin()) return ORG_UUID;

  /*
   * En producción esto no debería ocurrir nunca: el middleware manda a /login
   * antes de que se renderice cualquier página del panel. Si igual llega acá
   * —una acción de servidor invocada directamente, una ruta nueva fuera del
   * middleware— es un fallo de autenticación y se corta.
   */
  throw new Error("Sin sesión: no hay organización para consultar.");
});

export const orgActual = async (): Promise<string> =>
  organizacionFijada.getStore() ?? organizacionDeSesion();

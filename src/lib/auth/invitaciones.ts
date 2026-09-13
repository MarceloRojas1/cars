import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { consultar, enTransaccion } from "@/lib/db";
import { orgActual, comoOrganizacion } from "@/lib/auth/sesion";
import { claveDeServicio, urlDeSupabase } from "@/lib/supabase/servicio";

/**
 * Invitaciones: el puente entre una ficha del equipo y una cuenta que entra.
 *
 * `/equipo` crea la ficha (`app_user`). Esto crea el vale que la convierte en
 * acceso: un enlace de un solo uso que el admin manda por WhatsApp y que la
 * persona abre para elegir su contraseña.
 *
 * Ver docs/decisiones.md para por qué un enlace y no una contraseña temporal.
 */

/** Una semana. Suficiente para que a alguien le llegue el WhatsApp un viernes. */
const DIAS_VIGENCIA = 7;

/**
 * 32 bytes de aleatoriedad criptográfica. En base64url queda un token de 43
 * caracteres que no se adivina ni se enumera.
 */
function nuevoToken() {
  return randomBytes(32).toString("base64url");
}

/** Lo único que se guarda. El token vive en la URL y en ningún otro lado. */
export function hashDeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * De dónde sale el dominio del enlace.
 *
 * `VELIE_APP_URL` si está puesta; si no, la cabecera `host` de la petición en
 * curso. Lo segundo es lo que hace que el enlace funcione en Vercel sin
 * configurar nada, y en local apunte a localhost sin trucos.
 */
async function baseUrl() {
  const configurada = process.env.VELIE_APP_URL?.replace(/\/$/, "");
  if (configurada) return configurada;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/**
 * `dias` viaja calculado desde el servidor a propósito: la pantalla solo lo
 * muestra. Calcularlo en el render obliga a leer el reloj durante el render,
 * que no es puro y el compilador de React lo rechaza — con razón, porque el
 * mismo componente daría resultados distintos en cada pasada.
 */
export type InvitacionCreada = { url: string; expira: string; dias: number };

/**
 * Emite una invitación para un miembro del equipo que todavía no tiene cuenta.
 *
 * Las invitaciones anteriores del mismo miembro se dan por vencidas: si el
 * admin genera un enlace nuevo es porque el anterior se perdió, y dejar dos
 * vivos multiplica las puertas sin ninguna ganancia.
 */
export async function crearInvitacion(
  appUserId: string,
  rol: "owner" | "admin" | "vendedor",
  creadaPor?: string,
): Promise<InvitacionCreada> {
  const orgId = await orgActual();
  const token = nuevoToken();
  const expira = new Date(Date.now() + DIAS_VIGENCIA * 86_400_000);

  await enTransaccion(orgId, async (cliente) => {
    await cliente.query(
      `update invitacion set usada_at = coalesce(usada_at, now())
        where organization_id = $1 and app_user_id = $2 and usada_at is null`,
      [orgId, appUserId],
    );
    await cliente.query(
      `insert into invitacion
         (organization_id, app_user_id, token_hash, rol, creada_por, expira_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [orgId, appUserId, hashDeToken(token), rol, creadaPor ?? null, expira],
    );
  });

  return {
    url: `${await baseUrl()}/invitacion/${token}`,
    expira: expira.toISOString(),
    dias: DIAS_VIGENCIA,
  };
}

export type InvitacionLeida =
  | { valida: true; nombre: string; email: string; automotora: string }
  | { valida: false; motivo: "no_existe" | "vencida" | "usada" };

/**
 * Qué hay detrás de un enlace, para pintar la pantalla antes de canjearlo.
 *
 * No hay sesión acá: la invitación se resuelve con `invitacion_por_token()`,
 * que salta RLS a propósito y solo acierta con el token completo. Recién con
 * la organización en la mano se consulta el resto, ya declarándola.
 */
export async function leerInvitacion(token: string): Promise<InvitacionLeida> {
  const filas = await consultar<{
    id: string; organization_id: string; app_user_id: string;
    expira_at: Date; usada_at: Date | null;
  }>(
    "00000000-0000-0000-0000-000000000000",
    "select * from invitacion_por_token($1)",
    [hashDeToken(token)],
  );

  const inv = filas[0];
  if (!inv) return { valida: false, motivo: "no_existe" };
  if (inv.usada_at) return { valida: false, motivo: "usada" };
  if (inv.expira_at.getTime() < Date.now()) return { valida: false, motivo: "vencida" };

  return comoOrganizacion(inv.organization_id, async () => {
    const [persona] = await consultar<{ nombre: string; email: string }>(
      inv.organization_id,
      `select nombre, email from app_user where organization_id = $1 and id = $2`,
      [inv.organization_id, inv.app_user_id],
    );
    const [org] = await consultar<{ nombre: string }>(
      inv.organization_id,
      `select nombre from organization where id = $1`,
      [inv.organization_id],
    );
    if (!persona) return { valida: false as const, motivo: "no_existe" as const };

    return {
      valida: true as const,
      nombre: persona.nombre,
      email: persona.email,
      automotora: org?.nombre ?? "tu automotora",
    };
  });
}

export type ResultadoCanje = { ok: true } | { ok: false; mensaje: string };

/**
 * Convierte la invitación en una cuenta que entra.
 *
 * Tres escrituras que tienen que ir juntas: la cuenta en Supabase, la fila en
 * `membership` —que es lo que lee `current_org_ids()` y por lo tanto lo que
 * decide qué datos ve— y el enlace con `app_user`, que es quién es esta
 * persona dentro de la automotora. Sin la primera no puede entrar; sin la
 * segunda entra y no ve nada; sin la tercera la aplicación no sabe quién es.
 *
 * La cuenta de Supabase se crea ANTES de la transacción porque vive en otro
 * sistema y no participa del rollback. Si las escrituras locales fallan, la
 * invitación queda sin marcar y el enlace sirve otra vez: el segundo intento
 * encuentra la cuenta ya creada y la reutiliza, en vez de duplicarla.
 */
export async function canjearInvitacion(
  token: string,
  password: string,
): Promise<ResultadoCanje> {
  const url = urlDeSupabase();
  const servicio = claveDeServicio();
  if (!url || !servicio) {
    return {
      ok: false,
      mensaje: "La creación de cuentas no está configurada en este servidor. Avísale a quien te invitó.",
    };
  }

  const filas = await consultar<{
    id: string; organization_id: string; app_user_id: string;
    rol: "owner" | "admin" | "vendedor"; expira_at: Date; usada_at: Date | null;
  }>(
    "00000000-0000-0000-0000-000000000000",
    "select * from invitacion_por_token($1)",
    [hashDeToken(token)],
  );

  const inv = filas[0];
  if (!inv) return { ok: false, mensaje: "Esta invitación no existe." };
  if (inv.usada_at) return { ok: false, mensaje: "Esta invitación ya se usó." };
  if (inv.expira_at.getTime() < Date.now()) {
    return { ok: false, mensaje: "Esta invitación venció. Pídele a tu automotora que te mande una nueva." };
  }

  return comoOrganizacion(inv.organization_id, async () => {
    const [persona] = await consultar<{ email: string }>(
      inv.organization_id,
      `select email from app_user where organization_id = $1 and id = $2`,
      [inv.organization_id, inv.app_user_id],
    );
    if (!persona) return { ok: false as const, mensaje: "La ficha de esta persona ya no existe." };

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, servicio, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // `email_confirm`: la cuenta la da de alta la automotora, no se registra
    // sola, así que no hay correo que verificar.
    const { data, error } = await admin.auth.admin.createUser({
      email: persona.email, password, email_confirm: true,
    });

    let authUserId = data?.user?.id;

    /*
     * Ya existía. Pasa si un canje anterior creó la cuenta y falló después, o
     * si la persona trabaja en dos automotoras con el mismo correo — que el
     * modelo permite, porque `membership` es por par usuario-organización.
     * Se reutiliza la cuenta y se le fija la contraseña que acaba de elegir.
     */
    if (error && /already|registrado|exists/i.test(error.message)) {
      const { data: lista } = await admin.auth.admin.listUsers();
      const existente = lista?.users.find(
        (u) => u.email?.toLowerCase() === persona.email.toLowerCase(),
      );
      if (!existente) return { ok: false as const, mensaje: "No se pudo crear la cuenta." };
      await admin.auth.admin.updateUserById(existente.id, { password });
      authUserId = existente.id;
    } else if (error || !authUserId) {
      console.error("[invitacion] no se pudo crear la cuenta", error?.message);
      return { ok: false as const, mensaje: "No se pudo crear la cuenta. Inténtalo de nuevo." };
    }

    await enTransaccion(inv.organization_id, async (cliente) => {
      await cliente.query(
        `insert into membership (user_id, organization_id, rol) values ($1,$2,$3)
         on conflict (user_id, organization_id) do update set rol = excluded.rol`,
        [authUserId, inv.organization_id, inv.rol],
      );
      await cliente.query(
        `update app_user set auth_user_id = $1, activo = true
          where id = $2 and organization_id = $3`,
        [authUserId, inv.app_user_id, inv.organization_id],
      );
      await cliente.query(
        `update invitacion set usada_at = now() where id = $1 and organization_id = $2`,
        [inv.id, inv.organization_id],
      );
    });

    return { ok: true as const };
  });
}

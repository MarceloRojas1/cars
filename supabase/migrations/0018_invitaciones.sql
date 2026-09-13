-- ---------------------------------------------------------------------------
-- Invitaciones: cómo una segunda persona de la automotora consigue entrar.
--
-- Hasta ahora `/equipo` creaba fantasmas: una fila en `app_user` con
-- `auth_user_id` en NULL y sin `membership`. La persona aparecía en la lista
-- con su rol y su sucursal, y no podía iniciar sesión. La única cuenta que
-- existía la creaba `npm run alta` desde una máquina nuestra.
--
-- La estructura para varias cuentas por organización ya estaba —`membership`
-- es muchos-a-uno desde 0001— así que acá solo se agrega lo que faltaba: el
-- vale que convierte una ficha de equipo en una cuenta.
--
-- POR QUÉ UN ENLACE Y NO UNA CONTRASEÑA TEMPORAL: el enlace lo manda el admin
-- por WhatsApp, que es el canal que estas automotoras usan de verdad, y la
-- persona elige su propia contraseña. Una contraseña temporal viaja por el
-- mismo chat pero además sigue sirviendo hasta que alguien se acuerde de
-- cambiarla. Tampoco se usa el correo de invitación de Supabase: su SMTP por
-- defecto está limitado a unos pocos envíos por hora y no sirve en producción.
-- ---------------------------------------------------------------------------

create table if not exists invitacion (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  -- A quién invita. La ficha del equipo ya existe; esto solo le da acceso.
  app_user_id uuid not null references app_user on delete cascade,
  /*
   * SOLO EL HASH. El token va en la URL y no se guarda en ninguna parte: si
   * alguien se lleva un volcado de la base, no puede canjear ninguna
   * invitación. Es la misma razón por la que no se guardan contraseñas.
   */
  token_hash text not null,
  /*
   * El rol que tendrá en `membership`, que es el que de verdad manda.
   *
   * `text` con restricción y NO el enum `user_role`, aunque el enum exista y
   * sea lo que usan `app_user` y `membership`. El editor SQL de Supabase no
   * resuelve el tipo —falla con `type "user_role" does not exist`— y esta
   * migración tiene que poder aplicarse desde ahí, que es como se adopta una
   * base que ya está andando. Los valores son los mismos y Postgres convierte
   * el texto al insertar en `membership`.
   */
  rol text not null default 'vendedor'
    check (rol in ('owner', 'admin', 'vendedor')),
  creada_por uuid references app_user on delete set null,
  expira_at timestamptz not null,
  usada_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists invitacion_token_idx on invitacion (token_hash);
create index if not exists invitacion_usuario_idx
  on invitacion (organization_id, app_user_id);

alter table invitacion enable row level security;
alter table invitacion force row level security;
create policy tenant_isolation on invitacion
  using (organization_id in (select current_org_ids()));

/*
 * La ÚNICA puerta que salta el aislamiento, y a propósito.
 *
 * Quien abre un enlace de invitación no tiene sesión, así que no hay
 * organización que declarar — y sin embargo hay que poder encontrar la
 * invitación. Es el mismo problema que resuelve `organization` por slug en el
 * catálogo público.
 *
 * Se acota a lo mínimo: busca por el hash de un token de 32 bytes aleatorios,
 * que no se adivina, devuelve UNA fila y solo los campos que el canje
 * necesita. No acepta organización, ni correo, ni nada enumerable: sin el
 * token no devuelve nada. Todo lo que viene después del canje ya corre con la
 * organización declarada.
 */
create or replace function invitacion_por_token(hash text)
returns table (
  id uuid,
  organization_id uuid,
  app_user_id uuid,
  rol text,
  expira_at timestamptz,
  usada_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.organization_id, i.app_user_id, i.rol, i.expira_at, i.usada_at
    from invitacion i
   where i.token_hash = hash
   limit 1;
$$;

comment on function invitacion_por_token is
  'Resuelve una invitación sin sesión. Salta RLS deliberadamente: solo acierta con el token completo, que no se adivina.';

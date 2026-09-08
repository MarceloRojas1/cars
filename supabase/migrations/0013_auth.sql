-- Enlace entre las cuentas de Supabase y el equipo de cada automotora.
--
-- `membership` ya existía y mapea usuario → organización → rol; es lo que lee
-- `current_org_ids()` para el aislamiento. Lo que faltaba era unir esa cuenta
-- con la ficha del equipo (`app_user`), que es la que tiene nombre, teléfono y
-- sucursal, y la que administra la automotora desde la pantalla de Equipo.
--
-- Se separan a propósito: `membership` responde "¿a qué organización pertenece
-- esta cuenta?" y es lo que exige Postgres; `app_user` responde "¿quién es esta
-- persona en la automotora?". Un invitado que todavía no acepta existe en
-- `app_user` sin cuenta, y por eso la columna acepta nulos.

alter table app_user
  add column if not exists auth_user_id uuid references auth.users on delete set null;

create unique index if not exists app_user_auth_idx
  on app_user (auth_user_id) where auth_user_id is not null;

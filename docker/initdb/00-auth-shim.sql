-- Postgres a secas no trae el esquema `auth` de Supabase, y la migración lo usa
-- para las políticas de aislamiento por organización.
-- Este shim lo emula para que la MISMA migración corra local y en Supabase.
-- En Supabase este archivo no se aplica: allá el esquema `auth` ya existe.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);

-- En Supabase devuelve el usuario del JWT. En local, el que fijes con:
--   set local request.jwt.claim.sub = '<uuid>';
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

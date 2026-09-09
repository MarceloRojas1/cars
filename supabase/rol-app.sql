-- ---------------------------------------------------------------------------
-- Rol con el que la aplicación se conecta a Supabase.
--
-- CÓRRELO ANTES DE PONER LA APLICACIÓN EN LÍNEA, y no uses `postgres` para
-- conectarla.
--
-- El aislamiento entre automotoras es row level security, y RLS NO se le aplica
-- a un rol con BYPASSRLS ni al superusuario. Si la aplicación se conecta con el
-- rol dueño de las tablas, `current_org_ids()` deja de filtrar y una automotora
-- ve los datos de otra — con todas las políticas puestas y sin ningún error a
-- la vista. Ya nos pasó una vez en local (ver 0005_rls_forzado.sql).
--
-- Este rol es el equivalente en Supabase del `velie_app` del compose.
--
-- Cambia la contraseña antes de correrlo. No la guardes acá: va en las
-- variables de entorno de Vercel.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'velie_app') then
    create role velie_app login password 'CAMBIA-ESTA-CONTRASENA'
      nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;

grant usage on schema public to velie_app;
grant select, insert, update, delete on all tables in schema public to velie_app;
grant usage, select on all sequences in schema public to velie_app;
grant execute on all functions in schema public to velie_app;

-- Que las tablas futuras hereden los permisos sin tener que acordarse.
alter default privileges in schema public
  grant select, insert, update, delete on tables to velie_app;
alter default privileges in schema public
  grant usage, select on sequences to velie_app;

-- `current_org_ids()` consulta auth.uid(); el rol necesita ver ese esquema.
grant usage on schema auth to velie_app;
grant select on auth.users to velie_app;

-- Comprobación: las tres columnas tienen que dar 'f'. Si alguna da 't', ese rol
-- se salta el aislamiento y NO se puede usar para la aplicación.
select rolname, rolsuper, rolbypassrls, rolcreaterole
  from pg_roles where rolname in ('velie_app', 'postgres');

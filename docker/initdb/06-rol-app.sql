-- Rol con el que se conecta la aplicación.
--
-- El usuario que crea el contenedor (`velie`) es SUPERUSUARIO, y los
-- superusuarios se saltan row level security aunque esté forzado. Conectarse
-- con él anula por completo el aislamiento entre organizaciones.
--
-- Este rol no es superusuario, no puede saltarse RLS y solo tiene permisos de
-- lectura y escritura de datos. Es el equivalente local del rol `authenticated`
-- de Supabase, así que el comportamiento es el mismo en ambos entornos.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'velie_app') then
    create role velie_app login password 'velie_app'
      nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;

grant usage on schema public to velie_app;
grant select, insert, update, delete on all tables in schema public to velie_app;
grant usage, select on all sequences in schema public to velie_app;
grant execute on all functions in schema public to velie_app;

-- Que las tablas futuras hereden los mismos permisos sin tener que acordarse.
alter default privileges in schema public
  grant select, insert, update, delete on tables to velie_app;
alter default privileges in schema public
  grant usage, select on sequences to velie_app;

-- El shim de auth (local): la función de aislamiento lo consulta.
grant usage on schema auth to velie_app;
grant select on auth.users to velie_app;

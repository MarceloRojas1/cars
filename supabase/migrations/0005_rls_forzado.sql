-- ---------------------------------------------------------------------------
-- CORRECCIÓN CRÍTICA DE AISLAMIENTO
--
-- `enable row level security` NO aplica al dueño de la tabla. Como la app
-- conecta con el mismo rol que creó las tablas, las políticas de 0001 no
-- filtraban nada: una consulta devolvía datos de todas las organizaciones.
-- Verificado el 2026-08-31 con dos organizaciones de prueba.
--
-- `force row level security` somete también al dueño.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'branch','app_user','vehicle','stage','lead','conversation','client',
    'operation','monthly_close','campaign','knowledge_item','routing_rule',
    'hero_slide','integration','reminder'
  ] loop
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- La organización activa puede venir de dos lados:
--  · Supabase: del JWT del usuario, vía membership.
--  · Servidor propio: fijada por la app en la transacción (`app.organization_id`).
-- El segundo camino SOLO debe fijarse desde el servidor tras autenticar,
-- nunca con un valor que venga del navegador.
create or replace function current_org_ids()
returns setof uuid language sql stable security definer as $$
  select organization_id from membership where user_id = auth.uid()
  union
  select nullif(current_setting('app.organization_id', true), '')::uuid;
$$;

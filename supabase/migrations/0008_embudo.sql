-- El embudo como tubería de eventos, no como 9 columnas.

-- 1. Quién conduce cada etapa.
--    El bot atiende las primeras y las de reenganche; el humano toma desde el
--    traspaso en adelante. Es lo que permite saber cuándo asignar vendedor.
create type stage_responsable as enum ('ia', 'humano');
alter table stage add column if not exists responsable stage_responsable not null default 'humano';

-- El camino principal según el flujo del negocio: el bot recibe y califica,
-- y persigue a los que dejan de responder.
update stage set responsable = 'ia' where nombre in ('Nuevo', 'Calificando', 'Sin Respuesta');

-- 2. Trazabilidad del origen externo.
--    `external_id` es la clave de idempotencia: WhatsApp y Meta reentregan el
--    mismo evento y sin esto aparecerían leads duplicados.
alter table lead
  add column if not exists external_id text,
  add column if not exists canal_payload jsonb,
  add column if not exists traspasado_at timestamptz,
  add column if not exists notas text;

comment on column lead.traspasado_at is
  'Cuándo pasó de manos del bot a un humano. Base de la métrica de rapidez.';

create unique index if not exists lead_origen_unico
  on lead (organization_id, source, external_id)
  where external_id is not null;

-- 3. La bitácora ordena por fecha dentro del lead.
create index if not exists lead_activity_lead_idx on lead_activity (lead_id, created_at desc);

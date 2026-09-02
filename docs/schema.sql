-- Velie — esquema base. Derivado del análisis de VENPU (docs/00-analisis-venpu.md).
-- Postgres. Todo cuelga de organization_id (multi-tenant + RLS).

create type user_role       as enum ('owner','admin','vendedor');
create type stage_kind      as enum ('entry','progress','exit_won','exit_lost');
create type vehicle_status  as enum ('disponible','pendiente','reservado','vendido');
create type operation_kind  as enum ('venta','compra','consignacion','nota_venta');
create type routing_strategy as enum ('menos_ocupado','turno_rotativo','manual');

create table organization (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text unique not null,                    -- catálogo público: {dominio}/{slug}
  plan text not null default 'pro',
  limite_usuarios int default 10,
  limite_sucursales int default 3,
  limite_vehiculos int default 100,
  limite_conversaciones_ia int default 2000,
  proximo_cobro date,
  created_at timestamptz default now()
);

create table branch (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  codigo text not null,                         -- SUC-001
  nombre text not null,
  direccion text, comuna text, region text,
  telefono text, email text,
  es_principal boolean default false,
  activa boolean default true,
  created_at timestamptz default now(),
  unique (organization_id, codigo)
);

create table app_user (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  branch_id uuid references branch on delete set null,
  nombre text not null, email text not null, telefono text,
  rol user_role not null default 'vendedor',
  activo boolean default true,
  disponibilidad text default 'offline',        -- online | offline
  last_seen_at timestamptz,
  unique (organization_id, email)
);

create table vehicle (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  branch_id uuid references branch on delete set null,
  vendedor_id uuid references app_user on delete set null,
  codigo text not null,                         -- COD922142
  titulo text not null,
  marca text, modelo text, version text,
  anio int, patente text,
  precio bigint,                                -- CLP entero
  km int,
  combustible text,                             -- bencina|diesel|hibrido|electrico
  transmision text, color text,
  estado vehicle_status default 'disponible',
  completitud_pct int default 0,                -- calidad de la publicación
  publicado_at timestamptz,                     -- base de "días en salón"
  created_at timestamptz default now(),
  unique (organization_id, codigo)
);

create table vehicle_photo (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicle on delete cascade,
  url text not null, orden int default 0, es_principal boolean default false
);

create table vehicle_publication (                -- un vehículo en cada marketplace
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicle on delete cascade,
  canal text not null,                          -- mercadolibre|ml_propia|chileautos|yapo
  estado text default 'publicado',
  external_id text, url text,
  publicado_at timestamptz,
  unique (vehicle_id, canal)
);

create table stage (                              -- etapas del embudo, por organización
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  nombre text not null,
  kind stage_kind not null default 'progress',
  color text, orden int not null,
  ai_agent_enabled boolean default false,
  unique (organization_id, nombre)
);

create table lead (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  stage_id uuid not null references stage,
  vehicle_id uuid references vehicle on delete set null,   -- NULL = "sin vehículo"
  vendedor_id uuid references app_user on delete set null, -- NULL = sin asignar
  nombre text, telefono text, email text,
  source text not null,                         -- meta_ads|whatsapp|mercadolibre|chileautos|manual|web_dealer|landing_ads|referral|social|instagram|phone
  tipo text,                                    -- venta | consigna_compra
  temperatura text,                             -- hot | warm | cold
  perdido boolean default false,
  primera_respuesta_seg int,                    -- alimenta "rapidez en contactar"
  stage_changed_at timestamptz default now(),   -- alimenta "dónde se atoran"
  created_at timestamptz default now()
);
create index on lead (organization_id, stage_id);
create index on lead (organization_id, vendedor_id);
create index on lead (organization_id, created_at desc);

create table lead_activity (                      -- feed "Actividad reciente"
  id bigserial primary key,
  lead_id uuid not null references lead on delete cascade,
  actor_id uuid references app_user on delete set null,
  tipo text not null,                           -- stage_change|mensaje|nota|asignacion
  from_stage_id uuid references stage, to_stage_id uuid references stage,
  payload jsonb,
  created_at timestamptz default now()
);

create table conversation (                       -- hilo de WhatsApp
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  lead_id uuid references lead on delete cascade,
  canal text default 'whatsapp',
  asignado_a uuid references app_user on delete set null,
  mensajes_count int default 0,
  ia_activa boolean default true,
  last_message_at timestamptz
);

create table client (                             -- contraparte de compra/consignación
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  nombre text not null,
  rut text,                                     -- clave de deduplicación
  telefono text, email text, comuna text,
  fecha_nacimiento date,                        -- "Próximos cumpleaños"
  unique (organization_id, rut)
);

create table operation (                          -- venta / compra / consignación / nota de venta
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  vehicle_id uuid references vehicle on delete set null,
  client_id uuid references client on delete set null,
  vendedor_id uuid references app_user on delete set null,
  kind operation_kind not null,
  precio bigint, gastos bigint default 0,
  utilidad bigint generated always as (coalesce(precio,0) - coalesce(gastos,0)) stored,
  saldo_pendiente bigint default 0,
  financiera text,
  dias_en_stock int,
  fecha date not null,
  created_at timestamptz default now()
);

create table monthly_close (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  periodo_inicio date not null, periodo_fin date not null,
  ventas int, ingresos bigint, utilidad bigint,
  cerrado_at timestamptz, cerrado_por uuid references app_user,
  unique (organization_id, periodo_inicio)
);

create table campaign (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  external_id text,                             -- id en Meta
  nombre text not null,
  estado text default 'activa',                 -- activa|pausada|borrador
  canal text default 'whatsapp',
  regiones text[],
  presupuesto_diario bigint,
  synced_at timestamptz
);
create table campaign_vehicle (
  campaign_id uuid references campaign on delete cascade,
  vehicle_id uuid references vehicle on delete cascade,
  primary key (campaign_id, vehicle_id)
);
create table campaign_metric (                    -- snapshot diario traído de Meta
  campaign_id uuid references campaign on delete cascade,
  fecha date not null,
  gasto bigint, impresiones int, alcance int, clics int,
  ctr numeric, cpl bigint, contactos int, conv_whatsapp int,
  primary key (campaign_id, fecha)
);

create table assistant_config (
  organization_id uuid primary key references organization on delete cascade,
  trigger_ctwa boolean default true,
  trigger_contactos_nuevos boolean default true,
  trigger_contactos_existentes boolean default false,
  svc_consignacion boolean default true,
  svc_compra_directa boolean default true,
  svc_financiamiento boolean default true,
  modo_consultor boolean default false,
  antiguedad_max_financiamiento int default 10,
  nombre_agente text default 'Ben',
  saludo text, tono text, instrucciones text, prohibiciones text
);
create table knowledge_item (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  titulo text not null, contenido text not null,
  tipo text default 'faq'
);

create table routing_config (
  organization_id uuid primary key references organization on delete cascade,
  estrategia routing_strategy default 'turno_rotativo',
  reasignar_min int default 5,
  sla_enabled boolean default false,
  asignar_por_sucursal boolean default false
);
create table routing_rule (                       -- prioridad: origen > sucursal > tipo > rotación
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  match_source text, match_tipo text,
  vendedor_id uuid references app_user on delete cascade,
  orden int default 0
);

create table site_config (
  organization_id uuid primary key references organization on delete cascade,
  slug text unique,
  logo_url text, portada_url text, og_url text,
  color_principal text default '#000000',
  hero_texto_superior text, hero_titulo text, hero_subtitulo text,
  hero_btn1_texto text, hero_btn1_link text,
  hero_btn2_texto text, hero_btn2_link text
);
create table hero_slide (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  media_url text, media_tipo text default 'imagen',   -- imagen | video
  texto_superior text, titulo text, subtitulo text,
  btn_texto text, btn_link text,
  posicion text default 'bottom-left',                -- grilla 3x3
  orden int default 0
);

create table integration (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  proveedor text not null,                      -- meta|whatsapp|claude|mercadolibre|yapo|chileautos|zernio
  estado text default 'no_conectado',
  cuenta text, credenciales jsonb,
  unique (organization_id, proveedor)
);

create table reminder (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  user_id uuid references app_user on delete cascade,
  lead_id uuid references lead on delete cascade,
  titulo text, vence_at timestamptz, hecho boolean default false
);

create table plate_lookup (                       -- cache 24h de "Consultar patente"
  patente text primary key,
  data jsonb, tasacion jsonb, encargo_robo boolean,
  fetched_at timestamptz default now()
);

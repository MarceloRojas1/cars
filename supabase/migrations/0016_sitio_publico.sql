-- ---------------------------------------------------------------------------
-- Lo que le falta al sitio público para ser el sitio de la automotora y no
-- solo su catálogo: servicios, equipo, reseñas, horario y destacados.
--
-- Casi todo cuelga de tablas que ya existían. El equipo sale de `app_user` y la
-- dirección de `branch`: pedirle a la automotora que los cargue de nuevo para
-- su web sería hacerle mantener la misma información dos veces.
-- ---------------------------------------------------------------------------

-- Textos de las tres secciones de servicio. Vacío = la sección no se muestra.
alter table site_config
  add column if not exists sobre_titulo text,
  add column if not exists sobre_texto text,
  add column if not exists servicios jsonb,          -- [{titulo, texto, icono, link}]
  add column if not exists mostrar_equipo boolean not null default true,
  add column if not exists mostrar_resenas boolean not null default true;

comment on column site_config.servicios is
  'Lista de servicios de la portada: financiamiento, consignación, compra directa. Cada uno {titulo, texto, icono, link}.';

-- El horario vive en la sucursal porque puede diferir entre una y otra.
alter table branch
  add column if not exists horario text,
  add column if not exists mapa_url text;

comment on column branch.horario is
  'Texto libre: "Lun a Vie 9:30–19:00 · Sáb 10:00–14:00". Libre a propósito: los horarios reales tienen excepciones que una estructura rígida no cubre.';

-- Quién sale en la web y cómo. Un vendedor no aparece salvo que se marque.
alter table app_user
  add column if not exists foto_url text,
  add column if not exists cargo_publico text,
  add column if not exists en_sitio_web boolean not null default false;

comment on column app_user.en_sitio_web is
  'Si esta persona aparece en la sección Equipo del sitio público. Falso por defecto: que alguien salga en internet es una decisión, no un efecto secundario de darlo de alta.';

create table if not exists resena (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  autor text not null,
  texto text not null,
  estrellas int not null default 5 check (estrellas between 1 and 5),
  fuente text,                                  -- google | facebook | directa
  fecha date,
  visible boolean not null default true,
  orden int not null default 0,
  created_at timestamptz default now()
);

-- Destacados de la portada: los que la automotora quiere mostrar primero.
alter table vehicle
  add column if not exists destacado boolean not null default false;

create index if not exists vehicle_destacado_idx
  on vehicle (organization_id) where destacado;

-- Mismo aislamiento que el resto de las tablas con datos de cliente.
alter table resena enable row level security;
alter table resena force row level security;
create policy tenant_isolation on resena
  using (organization_id in (select current_org_ids()));

grant select, insert, update, delete on resena to velie_app;

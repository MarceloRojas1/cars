-- Biblioteca de fondos (showrooms) para el Estudio.
--
-- `organization_id` NULL = fondo compartido de la plataforma, visible para todas
-- las automotoras. Con valor = fondo propio de esa automotora. Eso implementa el
-- modelo mixto: la biblioteca base la paga la plataforma, los fondos a medida
-- los paga quien los pide.

create table if not exists showroom (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organization on delete cascade,
  nombre text not null,
  url text not null,
  /* Con qué se generó: permite reproducirlo y auditar el costo. */
  proveedor text,
  modelo text,
  prompt text,
  semilla bigint,
  /* Línea de piso anotada, 0-1 desde arriba. Sin esto el auto flota:
     la detección automática se probó y no funciona. */
  linea_piso real not null default 0.72,
  ancho int,
  alto int,
  usos int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists showroom_org_idx on showroom (organization_id, created_at desc);

alter table showroom enable row level security;
alter table showroom force row level security;
drop policy if exists tenant_isolation on showroom;
-- Los compartidos (organization_id null) los ve todo el mundo; los propios, solo su dueña.
create policy tenant_isolation on showroom
  using (organization_id is null or organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

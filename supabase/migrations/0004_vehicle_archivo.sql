-- Archivar es distinto de eliminar y de vender:
-- el auto sale del listado activo pero conserva su historial y se puede recuperar.
alter table vehicle
  add column if not exists archivado_at timestamptz,
  add column if not exists actualizado_at timestamptz default now();

comment on column vehicle.archivado_at is
  'Fecha en que salió del listado activo. NULL = activo. No borra nada.';

-- El listado por defecto solo muestra los activos.
create index if not exists vehicle_activos_idx
  on vehicle (organization_id, publicado_at desc) where archivado_at is null;

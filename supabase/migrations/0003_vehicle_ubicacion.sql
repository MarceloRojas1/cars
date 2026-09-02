-- Descripción libre y ubicación física del vehículo.
-- La sucursal y el vendedor ya existían como FK desde 0001.

alter table vehicle
  add column if not exists descripcion text,
  add column if not exists region text,
  add column if not exists comuna text;

comment on column vehicle.region is
  'Dónde está el auto. Se prellena con la sucursal, pero puede diferir.';

-- Las fotos ya tenían tabla en 0001; faltaba garantizar una sola principal.
create unique index if not exists vehicle_photo_una_principal
  on vehicle_photo (vehicle_id) where es_principal;

create index if not exists vehicle_photo_orden_idx
  on vehicle_photo (vehicle_id, orden);

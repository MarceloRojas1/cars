-- Campos que pide el formulario de publicación de vehículo.
-- No se toca 0001: esa migración ya corrió y la historia no se reescribe.

alter table vehicle
  add column if not exists pie_financiamiento bigint,          -- CLP; "pie desde $X"
  add column if not exists color_interior text,
  add column if not exists carroceria text,
  add column if not exists puertas int,
  add column if not exists permiso_circulacion_vence date,
  add column if not exists revision_tecnica_vence date,
  add column if not exists tags text[] not null default '{}',
  add column if not exists cantidad_duenos int,                -- 1 = único dueño
  add column if not exists equipamiento text;

comment on column vehicle.cantidad_duenos is
  'Número de dueños que tuvo. 1 equivale a "único dueño"; null = no informado.';
comment on column vehicle.pie_financiamiento is
  'Pie sugerido en CLP. Opcional: no todos los vehículos se ofrecen con financiamiento.';

-- Los modelos se autocompletan desde el inventario ya cargado.
create index if not exists vehicle_marca_modelo_idx
  on vehicle (organization_id, marca, modelo);

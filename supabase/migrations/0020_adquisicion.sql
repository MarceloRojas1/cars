-- ---------------------------------------------------------------------------
-- Cómo llegó el auto a la automotora.
--
-- Hoy no se registra en ninguna parte al cargar un vehículo, y es el dato que
-- decide qué plata es de quién: un auto comprado es capital propio, uno en
-- consignación es de un tercero y lo que se gana es una comisión. Sin esto, la
-- utilidad del Control de Ventas mezcla las dos cosas.
--
-- En VENPU tampoco está en el formulario: son pestañas aparte de Control de
-- Ventas, y por eso su propio panel muestra las ventas como "Sin tipo".
--
-- ES UN DATO INTERNO. No sale al catálogo público ni lo ve el asistente de
-- WhatsApp — las dos cosas se garantizan por listas de permitidos que ya
-- existen (`CAMPOS` en lib/data/catalogo.ts y `FichaPublica` en
-- lib/ia/ficha-publica.ts), así que una columna nueva queda fuera por omisión.
-- Decirle a un comprador que el auto está en consignación le regala la
-- negociación: sabe que el precio no lo decide quien se lo está vendiendo.
-- ---------------------------------------------------------------------------

alter table vehicle
  add column if not exists adquisicion text
    check (adquisicion in ('compra', 'consignacion', 'parte_pago'));

comment on column vehicle.adquisicion is
  'Cómo entró el auto: compra (es nuestro), consignacion (es de un tercero, ganamos comisión), parte_pago (lo recibimos al vender otro). INTERNO: nunca se expone al público ni al asistente.';

/*
 * `text` con restricción y no un tipo enum, por lo aprendido con 0018: el
 * editor SQL de Supabase no resuelve los tipos creados en otra sesión, y esta
 * migración tiene que poder aplicarse desde cualquiera de los dos caminos.
 *
 * Nullable a propósito: los vehículos que ya están cargados no saben cómo
 * llegaron, y obligar a un valor haría inventar uno. Vacío significa "no se
 * registró", que es la verdad.
 */

-- Se consulta al filtrar el inventario por origen, siempre dentro de una
-- automotora: el índice va encabezado por `organization_id`, como el resto.
create index if not exists vehicle_adquisicion_idx
  on vehicle (organization_id, adquisicion) where adquisicion is not null;

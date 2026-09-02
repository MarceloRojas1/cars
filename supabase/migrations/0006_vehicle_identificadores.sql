-- Identificadores y cilindrada.
--
-- `numero_motor` ya llega con el plan gratuito de Boostr y hoy se descarta.
-- `vin` y `cilindrada` llegan con el plan extendido; se agregan ahora para que
-- activarlo sea solo poner la clave de API, sin migrar nada.

alter table vehicle
  add column if not exists vin text,
  add column if not exists numero_motor text,
  add column if not exists cilindrada text;

comment on column vehicle.vin is 'Chasis / VIN. Requiere el plan extendido.';
comment on column vehicle.numero_motor is 'Va en la transferencia. Disponible en el plan gratuito.';
comment on column vehicle.cilindrada is 'Tamaño del motor, ej. "2.0". Requiere el plan extendido.';

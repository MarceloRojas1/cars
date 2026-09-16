-- ---------------------------------------------------------------------------
-- Las condiciones con que entró el auto, que son distintas según cómo entró.
--
-- Marcar el tipo no bastaba: cada uno trae su propia plata y sin ella el tipo
-- es una etiqueta que no alimenta ningún cálculo.
--
--   Compra          cuánto se pagó, y la comisión de quien la trajo.
--   Consignación    entre cuánto y cuánto se puede publicar, la comisión que
--                   nos queda, y cuánto se le promete al dueño ("libre a pago").
--   Parte de pago   cuánto se le reconoció al cliente por su auto.
--
-- Es el mismo reparto que usa VENPU en Control de Ventas, en sus pestañas
-- Compras y Consignaciones. Se copia porque es el vocabulario que la automotora
-- ya tiene en la cabeza.
--
-- TODO ESTO ES INTERNO. Ver `FichaPublica` en lib/ia/ficha-publica.ts y
-- `CAMPOS` en lib/data/catalogo.ts: las dos son listas de permitidos, así que
-- estas columnas quedan fuera por omisión. Que un comprador sepa en cuánto
-- compraste el auto que te está comprando es lo peor que puede pasar acá.
-- ---------------------------------------------------------------------------

alter table vehicle
  -- Compra y parte de pago: lo que salió de la caja (o se reconoció).
  add column if not exists precio_compra bigint,
  -- Compra: lo que se le paga a quien consiguió el auto.
  add column if not exists comision_compra bigint,
  -- Consignación: entre cuánto y cuánto acordamos publicarlo.
  add column if not exists publicacion_min bigint,
  add column if not exists publicacion_max bigint,
  -- Consignación: lo nuestro, y lo del dueño.
  add column if not exists comision_consignacion bigint,
  add column if not exists libre_a_pago bigint;

comment on column vehicle.libre_a_pago is
  'Lo que recibe el dueño del auto consignado una vez vendido. INTERNO.';

/*
 * LOS QUE YA ESTÁN CARGADOS PASAN A "COMPRA".
 *
 * Se pidió explícitamente, y es el supuesto correcto para este inventario:
 * son autos que la automotora tiene en su salón. No es adivinar — es fijar el
 * caso normal y dejar que se corrija el que no lo sea, que son menos.
 *
 * Solo los que no tienen valor: si alguien ya marcó uno a mano, se respeta.
 */
update vehicle set adquisicion = 'compra' where adquisicion is null;

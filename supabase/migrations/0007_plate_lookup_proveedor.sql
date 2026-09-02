-- La caché de patentes ahora distingue de qué proveedor vino el dato.
-- Sin esto, cambiar de proveedor seguiría sirviendo la respuesta del anterior
-- durante 24 horas.

alter table plate_lookup add column if not exists proveedor text not null default 'boostr';

alter table plate_lookup drop constraint if exists plate_lookup_pkey;
alter table plate_lookup add primary key (patente, proveedor);

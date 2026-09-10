-- ---------------------------------------------------------------------------
-- Qué automotora es dueña de un número de WhatsApp.
--
-- El webhook no tiene sesión —quien llama es Meta— así que la organización no
-- puede salir de ahí. Sale del número que RECIBIÓ el mensaje, que es lo único
-- que identifica a la automotora en el evento entrante.
--
-- Sin esto, con dos automotoras los mensajes de una caerían en la otra; y con
-- una sola, el webhook fallaba con "Sin sesión: no hay organización".
-- ---------------------------------------------------------------------------

alter table organization
  add column if not exists whatsapp_phone_number_id text;

comment on column organization.whatsapp_phone_number_id is
  'El phone_number_id de la Cloud API de Meta. Es lo que trae el webhook en value.metadata y lo que permite saber a qué automotora pertenece el mensaje.';

create unique index if not exists organization_whatsapp_phone_idx
  on organization (whatsapp_phone_number_id)
  where whatsapp_phone_number_id is not null;

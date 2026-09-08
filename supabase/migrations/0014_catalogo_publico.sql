-- ---------------------------------------------------------------------------
-- Catálogo público: lo que la automotora muestra en {dominio}/{slug}
--
-- El número de WhatsApp va en la organización y NO en una variable de entorno:
-- es distinto para cada automotora. El teléfono de la sucursal no sirve para
-- esto — puede ser un fijo, y el botón del catálogo abre un chat.
-- ---------------------------------------------------------------------------

alter table organization
  add column if not exists whatsapp text,                -- E.164 sin +, como lo quiere wa.me
  add column if not exists sitio_web text,
  add column if not exists descripcion text,             -- una línea bajo el nombre
  add column if not exists catalogo_publico boolean not null default true;

comment on column organization.whatsapp is
  'Número al que apunta el botón del catálogo público. Formato wa.me: solo dígitos, con código de país y sin +.';
comment on column organization.catalogo_publico is
  'Interruptor del catálogo. En false, {dominio}/{slug} responde 404 aunque la organización exista.';

-- El catálogo entra por el slug, y esa consulta corre sin sesión en cada visita.
create unique index if not exists organization_slug_idx on organization (slug);

-- Listado público: disponibles, no archivados, ordenados por publicación.
create index if not exists vehicle_catalogo_idx
  on vehicle (organization_id, publicado_at desc)
  where estado = 'disponible' and archivado_at is null;

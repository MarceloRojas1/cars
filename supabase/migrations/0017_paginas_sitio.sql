-- ---------------------------------------------------------------------------
-- Las páginas del sitio y las redes sociales.
--
-- Una automotora no tiene solo catálogo: tiene "quiénes somos", "compramos tu
-- auto", "consignaciones", "financiamiento" y "contacto". Las tres del medio
-- existen para captar: su formulario tiene que entrar al embudo como lead, no
-- mandar un correo que alguien tiene que acordarse de mirar.
-- ---------------------------------------------------------------------------

alter table site_config
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists aliados jsonb;          -- [{nombre, logoUrl}]

comment on column site_config.aliados is
  'Financieras y marcas con las que trabaja la automotora, para la franja "trabajamos con los mejores".';

create table if not exists pagina (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  ruta text not null,                              -- quienes-somos, contacto…
  titulo text not null,
  rotulo text,                                     -- el texto pequeño sobre el título
  bajada text,
  contenido text,
  imagen_url text,
  /*
   * Qué formulario lleva la página, si lleva alguno. El tipo decide qué campos
   * se piden y con qué origen entra el lead al embudo: no es lo mismo alguien
   * que quiere vender su auto que alguien que pregunta por financiamiento.
   */
  formulario text,                                 -- null | cotizar | consignar | financiar | contacto
  en_menu boolean not null default true,
  orden int not null default 0,
  visible boolean not null default true,
  unique (organization_id, ruta)
);

alter table pagina enable row level security;
alter table pagina force row level security;
create policy tenant_isolation on pagina
  using (organization_id in (select current_org_ids()));

grant select, insert, update, delete on pagina to velie_app;

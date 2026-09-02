-- Notas del lead.
--
-- En el producto original son varias, cada una con su fecha y su autor, no un
-- campo de texto. `lead.notas` queda para la nota inicial del alta manual.
create table if not exists lead_note (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization on delete cascade,
  lead_id uuid not null references lead on delete cascade,
  autor_id uuid references app_user on delete set null,
  texto text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_note_lead_idx on lead_note (lead_id, created_at desc);

alter table lead_note enable row level security;
alter table lead_note force row level security;
drop policy if exists tenant_isolation on lead_note;
create policy tenant_isolation on lead_note
  using (organization_id in (select current_org_ids()));

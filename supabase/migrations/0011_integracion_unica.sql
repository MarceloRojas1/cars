-- Una fila por proveedor y organización: la conexión se actualiza, no se apila.
create unique index if not exists integration_org_proveedor
  on integration (organization_id, proveedor);

comment on column integration.credenciales is
  'Credenciales del proveedor. Los secretos van CIFRADOS (ver src/lib/cripto.ts); '
  'nunca en texto plano. La pista visible son solo los últimos caracteres.';

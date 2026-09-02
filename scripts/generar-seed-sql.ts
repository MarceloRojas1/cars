/**
 * Convierte los datos semilla de TypeScript a un .sql plano.
 *
 * La imagen de demo no lleva el código fuente ni tsx, así que la semilla tiene
 * que viajar como SQL y aplicarse con psql al arrancar.
 *   npm run db:seed-sql
 */
import { writeFileSync } from "node:fs";
import {
  organization, branches, users, stages, vehicles, clients,
} from "../src/lib/data/seed";

const uuid = (semilla: string) => {
  const hex = Buffer.from(semilla).toString("hex").padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const q = (v: unknown) =>
  v === undefined || v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const arr = (v: string[]) => `'{${v.map((x) => `"${x.replace(/"/g, '\\"')}"`).join(",")}}'`;

const orgId = uuid(organization.id);
const l: string[] = [
  "-- Generado por scripts/generar-seed-sql.ts. No editar a mano.",
  "begin;",
  `insert into organization (id, nombre, slug, plan, limite_usuarios, limite_sucursales, limite_vehiculos, limite_conversaciones_ia, proximo_cobro)
   values (${q(orgId)}, ${q(organization.nombre)}, ${q(organization.slug)}, ${q(organization.plan)}, ${organization.limiteUsuarios}, ${organization.limiteSucursales}, ${organization.limiteVehiculos}, ${organization.limiteConversacionesIa}, ${q(organization.proximoCobro)})
   on conflict (id) do nothing;`,
  // A partir de acá manda RLS: hay que declarar la organización, igual que la app.
  `select set_config('app.organization_id', ${q(orgId)}, false);`,
];

for (const b of branches)
  l.push(`insert into branch (id, organization_id, codigo, nombre, direccion, comuna, region, telefono, email, es_principal, activa)
   values (${q(uuid(b.id))}, ${q(orgId)}, ${q(b.codigo)}, ${q(b.nombre)}, ${q(b.direccion)}, ${q(b.comuna)}, ${q(b.region)}, ${q(b.telefono)}, ${q(b.email)}, ${b.esPrincipal}, ${b.activa}) on conflict (id) do nothing;`);

for (const u of users)
  l.push(`insert into app_user (id, organization_id, branch_id, nombre, email, telefono, rol, activo)
   values (${q(uuid(u.id))}, ${q(orgId)}, ${u.branchId ? q(uuid(u.branchId)) : "null"}, ${q(u.nombre)}, ${q(u.email)}, ${q(u.telefono)}, ${q(u.rol)}, ${u.activo}) on conflict (id) do nothing;`);

for (const s of stages)
  l.push(`insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values (${q(uuid(s.id))}, ${q(orgId)}, ${q(s.nombre)}, ${q(s.kind)}, ${q(s.color)}, ${s.orden}, ${s.agenteIaActivo}) on conflict (id) do nothing;`);

for (const c of clients)
  l.push(`insert into client (id, organization_id, nombre, rut, telefono, comuna)
   values (${q(uuid(c.id))}, ${q(orgId)}, ${q(c.nombre)}, ${q(c.rut)}, ${q(c.telefono)}, ${q(c.comuna)}) on conflict (id) do nothing;`);

for (const v of vehicles)
  l.push(`insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values (${q(uuid(v.id))}, ${q(orgId)}, ${q(uuid(v.branchId))}, ${q(v.codigo)}, ${q(v.titulo)}, ${q(v.marca)}, ${v.anio}, ${v.precio}, ${v.km}, ${q(v.combustible)}, ${q(v.estado)}, ${v.completitudPct}, now() - interval '${v.publicadoHaceDias} days', ${arr(v.tags)}) on conflict (id) do nothing;`);

l.push("commit;");
writeFileSync("supabase/seed.sql", l.join("\n") + "\n");
console.log(`✓ supabase/seed.sql — ${vehicles.length} vehículos, ${l.length} sentencias`);

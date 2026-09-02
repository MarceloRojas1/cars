/**
 * Carga los datos semilla en Postgres. Idempotente: se puede correr varias veces.
 *   npm run db:seed
 */
import { config } from "dotenv";
import { Pool } from "pg";
import {
  organization, branches, users, stages, vehicles, clients, leads,
} from "../src/lib/data/seed";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** ids estables para que volver a correr el script no duplique nada. */
const uuid = (semilla: string) => {
  const hex = Buffer.from(semilla).toString("hex").padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

async function main() {
  const orgId = uuid(organization.id);

  // `organization` es la raíz del árbol y no lleva RLS.
  await pool.query(
    `insert into organization (id, nombre, slug, plan, limite_usuarios, limite_sucursales,
       limite_vehiculos, limite_conversaciones_ia, proximo_cobro)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (id) do update set nombre = excluded.nombre`,
    [orgId, organization.nombre, organization.slug, organization.plan,
     organization.limiteUsuarios, organization.limiteSucursales,
     organization.limiteVehiculos, organization.limiteConversacionesIa,
     organization.proximoCobro],
  );

  // Todo lo demás vive detrás de RLS: hay que declarar la organización, igual
  // que hace la app. El rol de la aplicación no es superusuario y no tiene atajo.
  const cliente = await pool.connect();
  await cliente.query("begin");
  await cliente.query("select set_config('app.organization_id', $1, true)", [orgId]);

  for (const b of branches) {
    await cliente.query(
      `insert into branch (id, organization_id, codigo, nombre, direccion, comuna, region,
         telefono, email, es_principal, activa)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do nothing`,
      [uuid(b.id), orgId, b.codigo, b.nombre, b.direccion, b.comuna, b.region,
       b.telefono, b.email, b.esPrincipal, b.activa],
    );
  }

  for (const u of users) {
    await cliente.query(
      `insert into app_user (id, organization_id, branch_id, nombre, email, telefono, rol, activo)
       values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing`,
      [uuid(u.id), orgId, u.branchId ? uuid(u.branchId) : null, u.nombre, u.email,
       u.telefono ?? null, u.rol, u.activo],
    );
  }

  for (const s of stages) {
    await cliente.query(
      `insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
      [uuid(s.id), orgId, s.nombre, s.kind, s.color, s.orden, s.agenteIaActivo],
    );
  }

  for (const c of clients) {
    await cliente.query(
      `insert into client (id, organization_id, nombre, rut, telefono, comuna)
       values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing`,
      [uuid(c.id), orgId, c.nombre, c.rut ?? null, c.telefono, c.comuna ?? null],
    );
  }

  for (const v of vehicles) {
    const publicado = new Date();
    publicado.setDate(publicado.getDate() - v.publicadoHaceDias);
    await cliente.query(
      `insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio,
         precio, km, combustible, estado, completitud_pct, publicado_at, tags)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (id) do nothing`,
      [uuid(v.id), orgId, uuid(v.branchId), v.codigo, v.titulo, v.marca, v.anio,
       v.precio, v.km, v.combustible, v.estado, v.completitudPct, publicado, v.tags],
    );
  }

  for (const l of leads) {
    await cliente.query(
      `insert into lead (id, organization_id, stage_id, vehicle_id, vendedor_id,
         nombre, telefono, email, source, tipo, temperatura, perdido,
         stage_changed_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
               now() - ($13 || ' days')::interval, now() - ($13 || ' days')::interval)
       on conflict (id) do nothing`,
      [uuid(l.id), orgId, uuid(l.stageId), l.vehicleId ? uuid(l.vehicleId) : null,
       l.vendedorId ? uuid(l.vendedorId) : null, l.nombre, l.telefono, l.email ?? null,
       l.source, l.tipo ?? null, l.temperatura, l.perdido, String(l.diasEnEtapa || 0)],
    );
    if (l.mensajes > 0) {
      await cliente.query(
        `insert into conversation (organization_id, lead_id, canal, mensajes_count, last_message_at)
         values ($1,$2,'whatsapp',$3, now())
         on conflict (lead_id, canal) do update set mensajes_count = excluded.mensajes_count`,
        [orgId, uuid(l.id), l.mensajes],
      );
    }
  }

  // Los conteos van ANTES del commit: después, la conexión ya no declara
  // organización y RLS —correctamente— devuelve cero.
  const { rows } = await cliente.query(
    "select (select count(*) from vehicle)::int as v, (select count(*) from lead)::int as l",
  );
  await cliente.query("commit");
  cliente.release();
  console.log(`✓ semilla cargada — ${rows[0].v} vehículos, ${rows[0].l} leads`);
  await pool.end();
}

main().catch((e) => {
  console.error("✗ falló la carga:", e.message);
  process.exit(1);
});

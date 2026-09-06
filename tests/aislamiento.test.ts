/**
 * Aislamiento entre automotoras.
 *
 * Es el test más importante del proyecto: una filtración acá expone los leads
 * y los precios de compra de una automotora a otra. No es un bug, es el fin
 * del producto.
 *
 *   npm run test:aislamiento
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ORG_A = "aaaaaaaa-0000-0000-0000-00000000000a";
const ORG_B = "bbbbbbbb-0000-0000-0000-00000000000b";

/** Consulta declarando una organización, igual que hace la app. */
async function comoOrg<T = Record<string, unknown>>(
  orgId: string, sql: string, params: unknown[] = [],
): Promise<T[]> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('app.organization_id', $1, true)", [orgId]);
    const { rows } = await c.query(sql, params);
    await c.query("commit");
    return rows as T[];
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

before(async () => {
  // `organization` no lleva RLS (es la raíz del árbol), así que se crea directo.
  for (const [id, nombre, slug] of [
    [ORG_A, "Automotora A", "test-a"],
    [ORG_B, "Automotora B", "test-b"],
  ]) {
    await pool.query(
      `insert into organization (id, nombre, slug) values ($1,$2,$3)
       on conflict (id) do nothing`, [id, nombre, slug],
    );
  }

  // Los vehículos SÍ llevan RLS: cada uno se inserta declarando su organización,
  // igual que lo hace la app. No hay atajo, y eso es justamente lo que se prueba.
  await comoOrg(ORG_A, `delete from vehicle where codigo = 'TEST-A'`);
  await comoOrg(ORG_B, `delete from vehicle where codigo = 'TEST-B'`);
  await comoOrg(ORG_A,
    `insert into vehicle (organization_id, codigo, titulo, marca, anio, precio)
     values ($1,'TEST-A','Auto de la automotora A','Toyota',2020,10000000)`, [ORG_A]);
  await comoOrg(ORG_B,
    `insert into vehicle (organization_id, codigo, titulo, marca, anio, precio)
     values ($1,'TEST-B','Auto de la automotora B','Ferrari',2024,190000000)`, [ORG_B]);
});

after(async () => {
  await comoOrg(ORG_A, `delete from vehicle where codigo = 'TEST-A'`);
  await comoOrg(ORG_B, `delete from vehicle where codigo = 'TEST-B'`);
  await pool.query(`delete from organization where id in ($1,$2)`, [ORG_A, ORG_B]);
  await pool.end();
});

test("A ve solo sus propios vehículos", async () => {
  const filas = await comoOrg(ORG_A, "select codigo from vehicle");
  const codigos = filas.map((f) => f.codigo);
  assert.ok(codigos.includes("TEST-A"), "A debería ver su propio auto");
  assert.ok(!codigos.includes("TEST-B"), "FILTRACIÓN: A está viendo autos de B");
});

test("B no ve los vehículos de A", async () => {
  const filas = await comoOrg(ORG_B, "select codigo from vehicle");
  const codigos = filas.map((f) => f.codigo);
  assert.ok(codigos.includes("TEST-B"));
  assert.ok(!codigos.includes("TEST-A"), "FILTRACIÓN: B está viendo autos de A");
});

test("apuntar directo al id de otra organización no sirve", async () => {
  const filas = await comoOrg(ORG_A, "select codigo from vehicle where codigo = 'TEST-B'");
  assert.equal(filas.length, 0, "FILTRACIÓN: se puede leer por id ajeno");
});

test("no se puede modificar un vehículo ajeno", async () => {
  await comoOrg(ORG_A, "update vehicle set precio = 1 where codigo = 'TEST-B'");
  const [b] = await comoOrg(ORG_B, "select precio from vehicle where codigo = 'TEST-B'");
  assert.equal(Number(b.precio), 190000000, "FILTRACIÓN: A modificó un auto de B");
});

test("no se puede borrar un vehículo ajeno", async () => {
  await comoOrg(ORG_A, "delete from vehicle where codigo = 'TEST-B'");
  const filas = await comoOrg(ORG_B, "select codigo from vehicle where codigo = 'TEST-B'");
  assert.equal(filas.length, 1, "FILTRACIÓN: A borró un auto de B");
});

test("no se puede insertar a nombre de otra organización", async () => {
  await assert.rejects(
    () => comoOrg(ORG_A,
      `insert into vehicle (organization_id, codigo, titulo, anio, precio)
       values ($1,'TEST-INTRUSO','Auto plantado',2024,1)`, [ORG_B]),
    "FILTRACIÓN: A insertó un registro dentro de B",
  );
});

test("sin organización declarada no se ve nada", async () => {
  const { rows } = await pool.query(
    "select count(*)::int as n from vehicle where codigo in ('TEST-A','TEST-B')",
  );
  assert.equal(rows[0].n, 0, "FILTRACIÓN: se lee sin declarar organización");
});

test("las tablas con datos de cliente tienen RLS forzado", async () => {
  const { rows } = await pool.query(`
    select c.relname from pg_class c
     where c.relname in ('branch','app_user','vehicle','stage','lead','conversation',
                         'client','operation','monthly_close','campaign','knowledge_item',
                         'routing_rule','hero_slide','integration','reminder','lead_note',
                         'showroom')
       and not (c.relrowsecurity and c.relforcerowsecurity)`);
  assert.deepEqual(rows.map((r) => r.relname), [],
    "Estas tablas no tienen RLS forzado y filtran entre organizaciones");
});

/**
 * `showroom` es la única tabla con política mixta: las filas sin organización
 * son la biblioteca compartida de la plataforma y las ve todo el mundo. Eso
 * solo es seguro si sigue siendo imposible ver —o crear— un fondo ajeno.
 */
test("los fondos propios no cruzan de automotora, los compartidos sí", async () => {
  await comoOrg(ORG_A, `delete from showroom where nombre = 'TEST-FONDO-A'`);
  await comoOrg(ORG_A,
    `insert into showroom (organization_id, nombre, url) values ($1,'TEST-FONDO-A','/x.png')`,
    [ORG_A]);

  const ajenos = await comoOrg(ORG_B,
    `select id from showroom where nombre = 'TEST-FONDO-A'`);
  assert.equal(ajenos.length, 0, "FILTRACIÓN: se ve el fondo propio de otra automotora");

  await assert.rejects(
    () => comoOrg(ORG_B,
      `insert into showroom (organization_id, nombre, url) values (null,'TEST-COMPARTIDO','/x.png')`),
    "Una automotora pudo crear un fondo compartido para todas",
  );
});

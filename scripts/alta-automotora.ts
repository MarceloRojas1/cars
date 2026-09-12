/**
 * Da de alta una automotora nueva.
 *
 *   npm run alta -- --nombre "Automotora Sur" --slug automotora-sur \
 *                   --email dueno@automotorasur.cl --duenio "María Pérez" \
 *                   --whatsapp 56912345678
 *
 * El cobro es POR ORGANIZACIÓN, no por usuario: el plan y todos los límites
 * viven en la fila de `organization`. Por eso el alta la hacemos nosotros a
 * mano cuando alguien contrata, y no hay registro público.
 *
 * Una automotora no es una fila: sin sucursal principal los vehículos no tienen
 * dónde vivir, y sin una etapa de entrada en el embudo `registrarLeadEntrante`
 * falla y se pierden los leads. Todo eso se crea acá, en una transacción: si
 * algo falla, no queda una automotora a medio nacer.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { enTransaccion } from "../src/lib/db";

/** El embudo estándar. Cada automotora lo puede editar después. */
const ETAPAS: [string, string, number, "ia" | "humano", boolean][] = [
  ["Nuevo", "entry", 1, "ia", true],
  ["Calificando", "progress", 2, "ia", true],
  ["Calificado", "progress", 3, "humano", false],
  ["Contactado/Seguimiento", "progress", 4, "humano", false],
  ["Visita Agendada", "progress", 5, "humano", false],
  ["Sin Respuesta", "progress", 6, "ia", true],
  ["Ganado", "exit_won", 7, "humano", false],
  ["Descartado", "exit_lost", 8, "humano", false],
  ["Consigna / Compra", "progress", 9, "humano", false],
];

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const nombre = argumento("nombre");
  const slug = argumento("slug");
  const email = argumento("email");
  const duenio = argumento("duenio") ?? "Dueño";
  const plan = argumento("plan") ?? "Pro";
  const sucursal = argumento("sucursal") ?? "Casa matriz";
  // Solo dígitos: es el formato que quiere wa.me.
  const whatsapp = argumento("whatsapp")?.replace(/\D/g, "") || undefined;
  const numeroId = argumento("phone-number-id") ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!nombre || !slug || !email) {
    console.error("Faltan datos. Uso:");
    console.error('  npm run alta -- --nombre "Automotora Sur" --slug automotora-sur \\');
    console.error('                  --email dueno@automotorasur.cl --duenio "María Pérez"');
    console.error("\nOpcionales: --plan Pro  --sucursal \"Casa matriz\"");
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error(`✗ El slug "${slug}" no sirve: va en la URL del catálogo público.`);
    console.error("  Solo minúsculas, números y guiones.");
    process.exit(1);
  }

  // La organización todavía no existe, así que la transacción no puede declarar
  // una organización para RLS. Se usa el rol de la aplicación, que es dueño de
  // las tablas: esto es una operación de plataforma, no de un cliente.
  const resultado = await enTransaccion("00000000-0000-0000-0000-000000000000", async (cliente) => {
    const { rows: yaExiste } = await cliente.query(
      `select id from organization where slug = $1`, [slug],
    );
    if (yaExiste[0]) throw new Error(`Ya hay una automotora con el slug "${slug}".`);

    const { rows: orgs } = await cliente.query<{ id: string }>(
      /*
       * El número de WhatsApp va desde el alta: sin él el catálogo público no
       * muestra el botón de consultar, que es de donde salen los leads. Y el
       * `phone_number_id` es lo que permite al webhook saber de qué automotora
       * es cada mensaje entrante.
       */
      `insert into organization (nombre, slug, plan, whatsapp, whatsapp_phone_number_id)
       values ($1,$2,$3,$4,$5) returning id`,
      [nombre, slug, plan, whatsapp ?? null, numeroId ?? null],
    );
    const orgId = orgs[0].id;

    /*
     * Recién ahora existe la organización, así que recién ahora se puede
     * declarar. Sin esto, RLS rechaza todo lo que sigue — y con razón: estaría
     * insertando filas de una organización distinta a la declarada. Que el
     * script se haya topado con esto es la prueba de que el aislamiento funciona
     * incluso para nosotros.
     */
    await cliente.query("select set_config('app.organization_id', $1, true)", [orgId]);

    const { rows: sucursales } = await cliente.query<{ id: string }>(
      `insert into branch (organization_id, codigo, nombre, es_principal, activa)
       values ($1,'SUC-001',$2,true,true) returning id`,
      [orgId, sucursal],
    );

    for (const [nombreEtapa, kind, orden, responsable, ia] of ETAPAS) {
      await cliente.query(
        `insert into stage (organization_id, nombre, kind, orden, responsable, ai_agent_enabled)
         values ($1,$2,$3,$4,$5,$6)`,
        [orgId, nombreEtapa, kind, orden, responsable, ia],
      );
    }

    await cliente.query(
      `insert into assistant_config (organization_id) values ($1)
       on conflict (organization_id) do nothing`, [orgId],
    );

    const { rows: usuarios } = await cliente.query<{ id: string }>(
      `insert into app_user (organization_id, branch_id, nombre, email, rol, activo)
       values ($1,$2,$3,$4,'owner',true) returning id`,
      [orgId, sucursales[0].id, duenio, email],
    );

    return { orgId, sucursalId: sucursales[0].id, usuarioId: usuarios[0].id };
  });

  console.log(`\n✓ ${nombre} dada de alta`);
  console.log(`  organización : ${resultado.orgId}`);
  console.log(`  catálogo     : /${slug}`);
  console.log(`  plan         : ${plan}`);
  console.log(`  sucursal     : ${sucursal}`);
  console.log(`  dueño        : ${duenio} <${email}>`);
  console.log(`  embudo       : ${ETAPAS.length} etapas`);
  await crearCuenta(resultado.orgId, resultado.usuarioId, email, argumento("password"));
}

/**
 * Crea la cuenta de acceso del dueño y la enlaza con la automotora.
 *
 * Son dos filas distintas y hacen cosas distintas: `membership` es lo que
 * Postgres exige para dejar ver los datos, y `app_user.auth_user_id` es lo que
 * conecta esa cuenta con la ficha del equipo. Sin la primera no ve nada; sin la
 * segunda, la aplicación no sabe quién es.
 */
async function crearCuenta(
  orgId: string, usuarioId: string, email: string, password: string | undefined,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !servicio) {
    console.log("\n⚠ Falta el acceso: Supabase no está configurado todavía.");
    console.log("  Cuando pongas NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY,");
    console.log(`  vuelve a correr esto con --password para crear la cuenta de ${email}.`);
    return;
  }
  if (!password) {
    console.log("\n⚠ Sin --password no se crea la cuenta de acceso.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, servicio, { auth: { autoRefreshToken: false, persistSession: false } });

  // `email_confirm` evita el correo de verificación: la cuenta la damos de alta
  // nosotros cuando la automotora contrata, no se registra sola.
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) {
    console.error("\n✗ No se pudo crear la cuenta:", error?.message);
    return;
  }

  await enTransaccion(orgId, async (cliente) => {
    await cliente.query(
      `insert into membership (user_id, organization_id, rol) values ($1,$2,'owner')
       on conflict (user_id, organization_id) do update set rol = 'owner'`,
      [data.user.id, orgId],
    );
    await cliente.query(
      `update app_user set auth_user_id = $1 where id = $2 and organization_id = $3`,
      [data.user.id, usuarioId, orgId],
    );
  });

  console.log(`\n✓ Cuenta creada: ${email} ya puede entrar con su contraseña.`);
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });

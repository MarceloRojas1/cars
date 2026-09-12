/**
 * Carga en Velie el contenido real del sitio de Market car.
 *
 *   npx tsx scripts/migrar-marketcar.ts            # contra la base local
 *   DATABASE_URL="…" npx tsx scripts/migrar-marketcar.ts
 *
 * Es un script de migración de contenido, no de esquema: toma lo que hoy está
 * escrito a mano en marketcar.cl —servicios, equipo, testimonios, dirección,
 * horario, redes— y lo deja en la base, que es de donde el sitio nuevo lo lee.
 *
 * Es idempotente: se puede correr dos veces sin duplicar nada.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { enTransaccion } from "../src/lib/db";

const SLUG = "market-car";

const SERVICIOS = [
  { titulo: "Financiamiento Flexible",
    texto: "Convenio con distintas financieras para encontrar la mejor opción para ti." },
  { titulo: "Certificación de Vehículos",
    texto: "Cada auto pasa por revisión profesional antes de llegar al showroom." },
  { titulo: "Atención Personalizada",
    texto: "Te acompañamos desde la primera visita hasta la entrega de llaves." },
];

/** El equipo que hoy aparece en el sitio, con su cargo y su WhatsApp propio. */
const EQUIPO = [
  { nombre: "Juan José Domínguez", cargo: "Gerente General", whatsapp: "56959555576" },
  { nombre: "Martin Stuckrath", cargo: "Asesor Comercial", whatsapp: "56989069916" },
];

const TESTIMONIOS = [
  { autor: "Álvaro Cortés", estrellas: 5, texto:
    "Dejé mi Ram Rampage y la vendieron en una semana. La atención de Martín y Juan José fue muy buena, me pagaron el vehículo el mismo día en que se vendió. Excelente atención." },
  { autor: "Juan Ignacio González", estrellas: 5, texto:
    "Muy buena atención, fueron súper flexibles y siempre con buena disposición. Quedé muy feliz con mi compra. Juan José, un 7. Gracias." },
  { autor: "Diego Real", estrellas: 5, texto:
    "Agradable experiencia. Excelente trato y un proceso súper fluido de principio a fin." },
];

/** Las pestañas del sitio actual, en su orden y con su formulario. */
const PAGINAS = [
  { ruta: "quienes-somos", titulo: "Una boutique automotriz, no una automotora más.",
    rotulo: "Quiénes somos",
    bajada: "Marketcar nace en 2024.",
    contenido:
      "De la mano de Juan José Domínguez, quien decide emprender y tener su propia automotora " +
      "después de más de 20 años en el rubro.\n\n" +
      "Nos caracterizamos por nuestra transparencia, calidad y excelente experiencia para nuestros " +
      "clientes. Tenemos todo el proceso 100% en línea, lo que hace que comprar un auto sea tan " +
      "fácil y entretenido como conducirlo.\n\n" +
      "Nuestros autos y motos están revisados minuciosamente en más de 150 puntos antes de llegar " +
      "al showroom de Los Trapenses.",
    formulario: null, orden: 1 },
  { ruta: "compramos-tu-auto", titulo: "Compramos tu auto.", rotulo: "Vende sin vueltas",
    bajada: "Oferta justa, pago inmediato y sin complicaciones. Cotiza tu vehículo en minutos.",
    contenido:
      "Cómo funciona:\n\n" +
      "1. Completas el formulario — marca, modelo, año, kilometraje y tu contacto.\n" +
      "2. Recibes tu cotización, sin trámites engorrosos ni visitas a tu casa.\n" +
      "3. Vendes y cobras.",
    formulario: "cotizar", orden: 2 },
  { ruta: "consignaciones", titulo: "Consignaciones", rotulo: "Nosotros lo vendemos",
    bajada: "Te ayudamos a vender tu vehículo de forma segura, rápida y sin que expongas tu casa.",
    contenido:
      "Exhibimos tu vehículo en el showroom y gestionamos las visitas nosotros.\n\n" +
      "No te expones ni tú, ni tu familia, ni tu hogar al mostrar el auto.",
    formulario: "consignar", orden: 3 },
  { ruta: "financiamiento", titulo: "Financiamiento", rotulo: "A tu medida",
    bajada: "Convenios con las principales instituciones del país. Pre-aprobación en menos de 1 hora.",
    contenido:
      "Trabajamos con bancos e instituciones financieras para ofrecerte tasas preferenciales, " +
      "plazos flexibles y evaluación rápida.\n\n" +
      "Evaluación en menos de 1 hora. Sin compromiso ni obligación de compra.",
    formulario: "financiar", orden: 4 },
  { ruta: "contacto", titulo: "Conversemos.", rotulo: "Contacto",
    bajada: "Estamos para acompañarte. Visítanos en el showroom o escríbenos.",
    contenido: null, formulario: "contacto", orden: 5 },
];

async function main() {
  const orgId = await enTransaccion("00000000-0000-0000-0000-000000000000", async (c) => {
    const { rows } = await c.query<{ id: string }>(
      "select id from organization where slug = $1", [SLUG],
    );
    if (!rows[0]) throw new Error(`No existe la automotora "${SLUG}".`);
    return rows[0].id;
  });

  await enTransaccion(orgId, async (c) => {
    await c.query(
      `insert into site_config (organization_id, color_principal, hero_titulo, hero_subtitulo,
                                sobre_titulo, sobre_texto, servicios,
                                instagram_url, tiktok_url, facebook_url, aliados)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (organization_id) do update set
         hero_titulo = excluded.hero_titulo, hero_subtitulo = excluded.hero_subtitulo,
         sobre_titulo = excluded.sobre_titulo, sobre_texto = excluded.sobre_texto,
         servicios = excluded.servicios, instagram_url = excluded.instagram_url,
         tiktok_url = excluded.tiktok_url, facebook_url = excluded.facebook_url,
         aliados = excluded.aliados`,
      [orgId, "#0F4C4C", "Autos elegidos uno por uno.",
       "Una experiencia boutique para comprar, vender o consignar tu auto. Atención personalizada, vehículos revisados y financiamiento a tu medida.",
       "Vive una experiencia boutique.",
       "Nos caracteriza la transparencia, la calidad y una excelente experiencia para nuestros clientes. Tenemos todo el proceso 100% en línea, lo que hace que comprar un auto sea tan fácil y entretenido como conducirlo.",
       JSON.stringify(SERVICIOS),
       "https://www.instagram.com/marketcaroficialchile",
       "https://www.tiktok.com/@marketcar.cl",
       "https://www.facebook.com/61556833379463",
       JSON.stringify([{ nombre: "BK" }, { nombre: "Autofin" }, { nombre: "Dily" }])],
    );

    await c.query(
      `update organization set whatsapp = $2, descripcion = $3 where id = $1`,
      [orgId, "56959555576", "Boutique Automotriz · Los Trapenses"],
    );

    await c.query(
      `update branch set
         nombre = 'Showroom Distrito Los Trapenses',
         direccion = 'Los Trapenses 3061, Local 13 y 14',
         comuna = 'Lo Barnechea', region = 'Metropolitana',
         telefono = '+56 9 5955 5576',
         horario = 'Lun a Vie 10:00 — 19:00 · Sáb 10:00 — 14:00',
         mapa_url = 'https://waze.com/ul?ll=-33.347311,-70.542523&navigate=yes'
       where organization_id = $1 and es_principal`,
      [orgId],
    );

    for (const m of EQUIPO) {
      // Por correo no se puede: el sitio no los publica. Se busca por nombre y
      // si no está, se crea desactivado para que no ocupe un cupo del plan.
      const { rowCount } = await c.query(
        `update app_user set cargo_publico = $3, en_sitio_web = true, telefono = $4
          where organization_id = $1 and nombre = $2`,
        [orgId, m.nombre, m.cargo, "+" + m.whatsapp],
      );
      if (!rowCount) {
        await c.query(
          `insert into app_user (organization_id, nombre, email, telefono, rol,
                                 activo, cargo_publico, en_sitio_web)
           values ($1,$2,$3,$4,'vendedor',false,$5,true)
           on conflict (organization_id, email) do update
             set cargo_publico = excluded.cargo_publico, en_sitio_web = true`,
          [orgId, m.nombre, `${m.nombre.toLowerCase().replace(/[^a-z]+/g, ".")}@marketcar.cl`,
           "+" + m.whatsapp, m.cargo],
        );
      }
    }

    for (const [i, t] of TESTIMONIOS.entries()) {
      await c.query(
        `insert into resena (organization_id, autor, texto, estrellas, fuente, orden)
         select $1,$2,$3,$4,'Google',$5
          where not exists (select 1 from resena where organization_id=$1 and autor=$2)`,
        [orgId, t.autor, t.texto, t.estrellas, i],
      );
    }

    for (const p of PAGINAS) {
      await c.query(
        `insert into pagina (organization_id, ruta, titulo, rotulo, bajada, contenido, formulario, orden)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (organization_id, ruta) do update set
           titulo=excluded.titulo, rotulo=excluded.rotulo, bajada=excluded.bajada,
           contenido=excluded.contenido, formulario=excluded.formulario, orden=excluded.orden`,
        [orgId, p.ruta, p.titulo, p.rotulo, p.bajada, p.contenido, p.formulario, p.orden],
      );
    }
  });

  console.log(`\n✓ Contenido de ${SLUG} migrado: ${SERVICIOS.length} servicios, ` +
              `${EQUIPO.length} personas, ${TESTIMONIOS.length} testimonios, ${PAGINAS.length} páginas.`);
  process.exit(0);
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });

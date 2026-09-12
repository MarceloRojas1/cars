/**
 * Trae a Vercel Blob las imágenes de marca de marketcar.cl y las deja
 * referenciadas en la base.
 *
 *   npx tsx scripts/traer-imagenes-marketcar.ts
 *
 * Se copian a NUESTRO almacenamiento en vez de enlazar las suyas: enlazar
 * dejaría el sitio nuevo dependiendo de que el viejo siga en pie, que es
 * justamente lo que se está reemplazando.
 *
 * Idempotente: si el archivo ya está subido con el mismo nombre, lo reemplaza.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { put } from "@vercel/blob";
import { enTransaccion } from "../src/lib/db";

const BASE = "https://www.marketcar.cl";

const IMAGENES: { clave: string; url: string; destino: string }[] = [
  { clave: "logo",      url: `${BASE}/logo-marketcar.webp`,            destino: "marca/logo.webp" },
  { clave: "portada",   url: `${BASE}/hero/slide-02.webp`,             destino: "marca/portada.webp" },
  { clave: "serv1",     url: `${BASE}/service-01-financiamiento.jpg`,  destino: "marca/servicio-1.jpg" },
  { clave: "serv2",     url: `${BASE}/service-02-certificacion.jpg`,   destino: "marca/servicio-2.jpg" },
  { clave: "serv3",     url: `${BASE}/service-03-atencion.jpg`,        destino: "marca/servicio-3.jpg" },
  { clave: "juanjose",  url: `${BASE}/juan-jose-showroom.webp`,        destino: "marca/juan-jose.webp" },
  { clave: "martin",    url: `${BASE}/matin-stuckrath.webp`,           destino: "marca/martin.webp" },
  { clave: "autofin",   url: `${BASE}/_image?href=%2F_astro%2Flogo-autofin.Tz-_3hvl.webp&w=800&h=400&f=webp`, destino: "marca/aliado-autofin.webp" },
  { clave: "dily",      url: `${BASE}/_image?href=%2F_astro%2Flogo-dily.Cv3kCYVj.webp&w=800&h=400&f=webp`,    destino: "marca/aliado-dily.webp" },
];

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Falta BLOB_READ_WRITE_TOKEN.");
    process.exit(1);
  }

  const subidas: Record<string, string> = {};
  for (const img of IMAGENES) {
    const res = await fetch(img.url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) { console.log(`✗ ${img.clave}: ${res.status}`); continue; }
    const datos = Buffer.from(await res.arrayBuffer());
    const { url } = await put(img.destino, datos, {
      access: "public",
      contentType: res.headers.get("content-type") ?? "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    subidas[img.clave] = url;
    console.log(`✓ ${img.clave.padEnd(10)} ${(datos.length / 1024).toFixed(0).padStart(5)} KB`);
  }

  const orgId = await enTransaccion("00000000-0000-0000-0000-000000000000", async (c) => {
    const { rows } = await c.query<{ id: string }>(
      "select id from organization where slug = 'market-car'");
    if (!rows[0]) throw new Error("No existe market-car.");
    return rows[0].id;
  });

  await enTransaccion(orgId, async (c) => {
    // Los servicios conservan su texto; solo se les agrega la foto.
    const { rows } = await c.query<{ servicios: { titulo: string; texto: string }[] | null }>(
      "select servicios from site_config where organization_id = $1", [orgId]);
    const servicios = (rows[0]?.servicios ?? []).map((s, i) => ({
      ...s, imagenUrl: subidas[`serv${i + 1}`],
    }));

    await c.query(
      `update site_config set logo_url = $2, portada_url = $3, servicios = $4, aliados = $5
        where organization_id = $1`,
      [orgId, subidas.logo ?? null, subidas.portada ?? null, JSON.stringify(servicios),
       JSON.stringify([
         { nombre: "Autofin", logoUrl: subidas.autofin },
         { nombre: "Dily", logoUrl: subidas.dily },
       ])],
    );

    for (const [nombre, clave] of [
      ["Juan José Domínguez", "juanjose"], ["Martin Stuckrath", "martin"],
    ] as const) {
      await c.query(
        "update app_user set foto_url = $3 where organization_id = $1 and nombre = $2",
        [orgId, nombre, subidas[clave] ?? null],
      );
    }

    // La portada como primera diapositiva, con el titular real del sitio.
    await c.query(
      `insert into hero_slide (organization_id, media_url, media_tipo, texto_superior,
                               titulo, subtitulo, btn_texto, btn_link, posicion, orden)
       select $1,$2,'imagen','Boutique Automotriz · Los Trapenses',
              'Autos elegidos uno por uno.',
              'Una experiencia boutique para comprar, vender o consignar tu auto.',
              'Ver stock','/market-car/catalogo','center-left',0
        where not exists (select 1 from hero_slide where organization_id = $1)`,
      [orgId, subidas.portada ?? null],
    );
  });

  console.log(`\n✓ ${Object.keys(subidas).length} imágenes en Blob y referenciadas.`);
  process.exit(0);
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });

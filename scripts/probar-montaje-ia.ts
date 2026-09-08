/**
 * Verifica que la IA siga metiendo el auto en el fondo sin recorte previo.
 *
 *   npx tsx scripts/probar-montaje-ia.ts
 *
 * Corre la MISMA instrucción que usa el Estudio contra cuatro fondos distintos
 * y deja las salidas para mirarlas. Existe porque un acierto suelto no dice
 * nada: el modelo no tiene semilla, así que hay que ver varios. Cada corrida
 * cuesta ~US$0,40.
 *
 * Qué mirar en cada salida:
 *  1. ¿Desapareció el rectángulo? Una franja de árboles o un borde recto es un fallo.
 *  2. ¿El auto quedó del tamaño pedido, o se fue al fondo de la escena?
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { proveedorGemini } from "../src/lib/ia/imagenes/gemini";
import { instruccion } from "../src/lib/creativos/armonizar";

const FOTO = "public/uploads/vehiculos/prueba-crosstrek.webp";
/*
 * Cinco fondos y no uno: el modelo falla distinto según la escena. El último es
 * el que en su momento devolvió la escena apilada en un collage, así que se
 * queda en la lista como caso de regresión.
 */
const FONDOS = [
  "marmol.jpg", "casa-adoquin.jpg", "carretera.jpg", "duna.jpg",
  "9145ac3e-b3f9-4603-a82c-c46bf849df86.jpg",
];
const SALIDA = "/tmp/velie-montaje";

/** Lo que pone el editor por defecto. */
const X = 0.5, Y = 0.72, ANCHO = 0.86;

async function main() {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) { console.error("Falta GEMINI_API_KEY"); process.exit(1); }
  await mkdir(SALIDA, { recursive: true });

  const foto = path.join(process.cwd(), FOTO);
  const meta = await sharp(foto).metadata();

  for (const nombre of FONDOS) {
    const fondoRuta = path.join(process.cwd(), "public/uploads/showrooms", nombre);
    const { width: W = 0, height: H = 0 } = await sharp(fondoRuta).metadata();

    const anchoAuto = Math.round(ANCHO * W);
    const altoAuto = Math.round(anchoAuto * ((meta.height ?? 1) / (meta.width ?? 1)));
    const auto = await sharp(foto).resize(anchoAuto, altoAuto).png().toBuffer();
    const compuesto = await sharp(fondoRuta)
      .composite([{
        input: auto,
        left: Math.max(0, Math.round(X * W - anchoAuto / 2)),
        top: Math.max(0, Math.round(Y * H - altoAuto)),
      }])
      .jpeg({ quality: 92 }).toBuffer();

    const [plano, limpio] = await Promise.all([
      sharp(compuesto).resize(1152).jpeg({ quality: 92 }).toBuffer(),
      sharp(fondoRuta).resize(1152).jpeg({ quality: 92 }).toBuffer(),
    ]);
    await writeFile(`${SALIDA}/${nombre}-entrada.jpg`, plano);

    const t = Date.now();
    const r = await proveedorGemini.generar(
      {
        prompt: instruccion(X, Y, ANCHO),
        ancho: W, alto: H,
        imagenes: [
          { datos: limpio, tipo: "image/jpeg" },
          { datos: plano, tipo: "image/jpeg" },
        ],
      },
      clave,
    );
    if (!r.ok) { console.log(`${nombre}: FALLÓ — ${r.mensaje}`); continue; }
    await writeFile(`${SALIDA}/${nombre}-salida.jpg`, r.datos);
    console.log(`${nombre}: ok en ${((Date.now() - t) / 1000).toFixed(0)}s`);
  }
  console.log(`\nMíralas en ${SALIDA}`);
}

main();

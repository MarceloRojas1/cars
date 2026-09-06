/**
 * Genera la biblioteca compartida de fondos.
 *   npm run showrooms            → todas las escenas
 *   npm run showrooms marmol     → solo esa
 *
 * Usa el proveedor que esté puesto en PROVEEDOR_IMAGEN (Gemini por defecto) y
 * su clave, la misma que usa la app.
 *
 * Las escenas viven en src/lib/ia/imagenes/escenas.ts, que es lo que también
 * lee la app: acá no se escribe ningún prompt, para que lo que se genera y lo
 * que muestra el Estudio no se separen nunca.
 *
 * Los archivos quedan en public/uploads/showrooms con el id de la escena. La
 * pantalla los toma de ahí; una escena sin archivo aparece "sin generar".
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFile, mkdir } from "node:fs/promises";
import { proveedorImagenActivo } from "../src/lib/ia/imagenes/registro";
import { ALTO, ANCHO, ESCENAS, promptDe } from "../src/lib/ia/imagenes/escenas";

async function main() {
  const proveedor = proveedorImagenActivo();
  const apiKey = process.env[proveedor.envClave];
  if (!apiKey) {
    console.error(`✗ Falta ${proveedor.envClave} en .env.local`);
    console.error(
      proveedor.id === "gemini"
        ? "  Consíguela en https://aistudio.google.com/apikey y vuelve a correr esto."
        : "  Consíguela en https://dashboard.bfl.ai y vuelve a correr esto.",
    );
    process.exit(1);
  }

  const destino = "public/uploads/showrooms";
  await mkdir(destino, { recursive: true });
  const soloEstos = process.argv.slice(2);
  const lista = soloEstos.length ? ESCENAS.filter((e) => soloEstos.includes(e.id)) : ESCENAS;

  const costo = proveedor.costoUsd ? ` · ~US$${(lista.length * proveedor.costoUsd).toFixed(2)}` : "";
  console.log(`generando ${lista.length} fondos · ${proveedor.modelo}${costo}\n`);
  const resumen: string[] = [];

  for (const escena of lista) {
    const t = Date.now();
    // La semilla solo la respetan los proveedores reproducibles; los demás la ignoran.
    const r = await proveedor.generar(
      { prompt: promptDe(escena), ancho: ANCHO, alto: ALTO, semilla: 7 },
      apiKey,
    );
    const seg = ((Date.now() - t) / 1000).toFixed(1);

    if (!r.ok) {
      console.log(`  ✗ ${escena.id.padEnd(10)} ${seg}s  ${r.mensaje}`);
      resumen.push(`${escena.id}: FALLÓ`);
      continue;
    }
    // Se respeta el formato que entregue el proveedor: la pantalla busca el id
    // de la escena con cualquiera de las extensiones conocidas.
    const ext = r.tipo.includes("jpeg") ? "jpg" : "png";
    const archivo = `${destino}/${escena.id}.${ext}`;
    await writeFile(archivo, r.datos);
    console.log(`  ✓ ${escena.id.padEnd(10)} ${seg}s  ${(r.datos.length / 1024).toFixed(0)} KB  → ${archivo}`);
    resumen.push(`${escena.id}: ok`);
  }

  console.log("\n" + resumen.join(" · "));
  console.log("Revisa los fondos en /estudio y ajusta la línea de piso de la escena si el auto quedaría flotando.");
  if (!proveedor.reproducible) {
    console.log(`Ojo: ${proveedor.nombre} no admite semilla, así que regenerar una escena da otra imagen.`);
  }
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });

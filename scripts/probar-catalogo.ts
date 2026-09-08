import { config } from "dotenv";
config({ path: ".env.local" });

import { getAutomotoraPorSlug, getCatalogo, getVehiculoPublico, getSimilares } from "../src/lib/data/catalogo";

async function main() {
  for (const slug of ["market-car", "velie", "no-existe", "api"]) {
    const a = await getAutomotoraPorSlug(slug);
    if (!a) { console.log(`${slug.padEnd(12)} → null`); continue; }
    const c = await getCatalogo(a.id);
    console.log(`${slug.padEnd(12)} → ${a.nombre} | tel ${a.telefono ?? "—"} | ${a.comuna ?? "—"} | ${c.length} publicables`);
    if (c[0]) {
      const v = await getVehiculoPublico(a.id, c[0].codigo);
      console.log(`   ${v!.codigo} ${v!.titulo} $${v!.precio} · ${v!.fotos.length} fotos · pie ${v!.pieFinanciamiento ?? "—"} · ${v!.comuna ?? "—"}`);
      console.log("   similares:", (await getSimilares(a.id, v!.codigo, v!.precio)).map((s) => s.codigo).join(", "));
    }
  }
  process.exit(0);
}
main();

/**
 * Corta la build si la base a la que va a servir el despliegue no tiene las
 * migraciones que este código necesita.
 *
 *   npm run verificar-migraciones               # informa
 *   npm run verificar-migraciones -- --estricto # además falla
 *
 * Va enganchado a `npm run build`, y esa es la razón de existir: **una build
 * fallida no reemplaza lo que está sirviendo.** La versión anterior sigue en
 * pie. Es la diferencia entre "no se pudo desplegar" y "el panel de todos los
 * clientes devuelve 500", que fue lo que pasó el 2026-09-13 con la migración
 * 0018.
 *
 * En Vercel es estricto siempre: es el único lugar donde bloquear sirve de
 * algo. En local informa y deja seguir, porque ahí `npm run build` se usa para
 * comprobar que compila, no para publicar.
 *
 * NO bloquea cuando no hay certeza, a propósito:
 *  · Sin credenciales de base no hay nada que verificar.
 *  · Si la base no responde, un problema de red no puede ser lo que impida
 *    desplegar un cambio de CSS.
 * Solo bloquea ante el único hecho que importa: la base contestó y le faltan.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { verificarMigraciones } from "../src/lib/migraciones";

async function main() {
  const estricto = process.argv.includes("--estricto") || Boolean(process.env.VERCEL);
  const r = await verificarMigraciones();

  switch (r.estado) {
    case "al_dia":
      console.log(`✓ Migraciones al día (${r.total}) en ${r.host}.`);
      return;

    case "sin_base":
      console.log("— Sin credenciales de base: no hay migraciones que verificar.");
      return;

    case "inalcanzable":
      console.log(`! No se pudo consultar la base: ${r.motivo}`);
      console.log("  No bloquea: un problema de red no debe impedir un despliegue.");
      return;

    case "pendientes":
      console.error(`\n✗ A LA BASE (${r.host}) LE FALTAN ${r.lista.length} MIGRACIÓN(ES):\n`);
      for (const a of r.lista) console.error(`    · ${a}`);
      console.error(
        "\n  Este código las necesita. Desplegarlo así deja el panel en 500." +
        "\n  Aplícalas primero:  npm run migrar -- --produccion\n",
      );
      if (estricto) process.exit(1);
  }
}

main().catch((e) => {
  // Un fallo del propio chequeo tampoco puede tumbar un despliegue.
  console.log("! El chequeo de migraciones falló:", e instanceof Error ? e.message : e);
});

import { consultar, dbConfigurada } from "@/lib/db";
import { ORG_UUID } from "@/lib/data/ids";
import { normalizarPatente, patenteValida } from "./normalizar";
import { proveedorFixtures } from "./fixtures";
import { proveedorBoostr } from "./boostr";
import { proveedorAutoriesgo } from "./autoriesgo";
import type { DatosPatente, Proveedor, ResultadoPatente } from "./tipos";

export type { DatosPatente, ResultadoPatente, Proveedor } from "./tipos";
export { normalizarPatente, patenteValida } from "./normalizar";

const CACHE_HORAS = 24;

const PROVEEDORES: Record<string, Proveedor> = {
  fixtures: proveedorFixtures,
  boostr: proveedorBoostr,
  autoriesgo: proveedorAutoriesgo,
};

/**
 * Qué proveedor se usa.
 *
 * `PROVEEDOR_PATENTE` manda. Si no está, se elige el primero que tenga clave y,
 * como último recurso, los datos de ejemplo — de modo que la aplicación siempre
 * funcione aunque ningún tercero esté disponible. Ese fue el motivo de separar
 * los adaptadores: hoy Boostr bloquea su propio endpoint público y AutoRiesgo
 * exige créditos, y aun así el proyecto avanza.
 */
export function proveedorActivo(): Proveedor {
  const elegido = process.env.PROVEEDOR_PATENTE;
  if (elegido && PROVEEDORES[elegido]) return PROVEEDORES[elegido];
  if (process.env.BOOSTR_API_KEY) return proveedorBoostr;
  if (process.env.AUTORIESGO_API_KEY) return proveedorAutoriesgo;
  return proveedorFixtures;
}

export async function consultarPatente(
  entrada: string,
  forzar = false,
): Promise<ResultadoPatente> {
  const patente = normalizarPatente(entrada);
  if (!patenteValida(patente)) {
    return { ok: false, mensaje: "Formato inválido. Usa AA1234 o ABCD12." };
  }

  const proveedor = proveedorActivo();

  // Si el proveedor solo responde a un conjunto cerrado, se avisa antes de
  // gastar una consulta que ya sabemos que va a fallar.
  if (proveedor.patentesDisponibles && !proveedor.patentesDisponibles.includes(patente)) {
    return {
      ok: false,
      mensaje: `${proveedor.nombre} solo responde a un listado fijo de patentes. Prueba con ${proveedor.patentesDisponibles.slice(0, 3).join(", ")}…`,
    };
  }

  // La caché guarda de qué proveedor vino: cambiar de proveedor no debe servir
  // el dato viejo de otro.
  if (dbConfigurada() && !forzar) {
    const filas = await consultar<{ data: DatosPatente }>(
      ORG_UUID,
      `select data from plate_lookup
        where patente = $1 and proveedor = $2
          and fetched_at > now() - interval '${CACHE_HORAS} hours'`,
      [patente, proveedor.id],
    );
    if (filas[0]?.data) {
      return { ok: true, datos: { ...filas[0].data, desdeCache: true } };
    }
  }

  const resultado = await proveedor.buscar(patente);

  if (resultado.ok && dbConfigurada()) {
    await consultar(
      ORG_UUID,
      `insert into plate_lookup (patente, proveedor, data, fetched_at)
       values ($1, $2, $3, now())
       on conflict (patente, proveedor)
       do update set data = excluded.data, fetched_at = now()`,
      [patente, proveedor.id, JSON.stringify(resultado.datos)],
    );
  }
  return resultado;
}

import { consultar } from "@/lib/db";
import { ORG_UUID } from "@/lib/data/ids";

/**
 * Motor de asignación.
 *
 * El producto original documenta esta prioridad y se respeta:
 *   1. Origen del lead   — "todo lo de Yapo a este vendedor"
 *   2. Sucursal del vehículo
 *   3. Tipo de lead      — compra / consignación a su especialista
 *   4. Rotación general
 *
 * Hoy solo está implementado el paso 4. Los tres primeros necesitan las reglas
 * que se configuran en /asignacion-de-leads, que todavía no existe: por eso la
 * función ya recibe el contexto completo aunque no lo use todo. Agregar un paso
 * es agregar un `if` acá, no rehacer las llamadas.
 */
export type ContextoAsignacion = {
  source: string;
  tipo?: string;
  branchId?: string;
};

export async function elegirVendedor(
  ctx: ContextoAsignacion,
): Promise<string | undefined> {
  void ctx; // los pasos 1-3 lo usarán

  // Rotación: el vendedor activo con menos leads abiertos.
  const filas = await consultar<{ id: string }>(
    ORG_UUID,
    `select u.id
       from app_user u
       left join lead l
         on l.vendedor_id = u.id
        and l.organization_id = u.organization_id
        and l.perdido = false
      where u.organization_id = $1 and u.activo and u.rol in ('vendedor', 'owner')
      group by u.id
      order by count(l.id), u.id
      limit 1`,
    [ORG_UUID],
  );
  return filas[0]?.id;
}

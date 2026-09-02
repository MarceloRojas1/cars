/**
 * Puente entre los ids legibles de la semilla ("suc_001") y los uuid de Postgres.
 *
 * Mientras solo los vehículos vengan de la base y el resto de las pantallas siga
 * leyendo la semilla, las referencias tienen que seguir calzando. La conversión
 * es determinista, así que ida y vuelta dan siempre lo mismo.
 *
 * Se puede borrar cuando todas las entidades vivan en la base.
 */
import { branches, users } from "./seed";

export function uuidDe(semilla: string) {
  const hex = Buffer.from(semilla).toString("hex").padEnd(32, "0").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const porUuid = new Map<string, string>([
  ...branches.map((b) => [uuidDe(b.id), b.id] as const),
  ...users.map((u) => [uuidDe(u.id), u.id] as const),
]);

/** uuid de la base → id de la semilla. Si no está mapeado, devuelve el uuid tal cual. */
export function idSemilla(uuid: string | null | undefined) {
  if (!uuid) return undefined;
  return porUuid.get(uuid) ?? uuid;
}

export const ORG_UUID = uuidDe("org_marketcar");
export const SUCURSAL_POR_DEFECTO = uuidDe(branches[0].id);

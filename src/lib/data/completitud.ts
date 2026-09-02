import type { Vehicle } from "@/lib/types";

/**
 * % de completitud de la publicación.
 *
 * PROVISORIO. En el producto original este número decide la visibilidad en los
 * portales, pero no sabemos qué campos pondera ni con qué peso — es una de las
 * preguntas abiertas con el cliente (ver docs/decisiones.md).
 *
 * Mientras tanto: cada campo que suma valor a un aviso cuenta lo mismo. Cuando
 * se defina la fórmula real, se cambia solo esta función.
 */
const CAMPOS_QUE_SUMAN: ((v: Partial<Vehicle>) => boolean)[] = [
  (v) => Boolean(v.marca),
  (v) => Boolean(v.modelo),
  (v) => Boolean(v.version),
  (v) => Boolean(v.anio),
  (v) => Boolean(v.precio),
  (v) => v.km !== undefined && v.km !== null,
  (v) => Boolean(v.combustible),
  (v) => Boolean(v.transmision),
  (v) => Boolean(v.carroceria),
  (v) => Boolean(v.puertas),
  (v) => Boolean(v.colorExterior),
  (v) => Boolean(v.colorInterior),
  (v) => Boolean(v.patente),
  (v) => Boolean(v.permisoCirculacionVence),
  (v) => Boolean(v.revisionTecnicaVence),
  (v) => v.cantidadDuenos !== undefined && v.cantidadDuenos !== null,
  (v) => Boolean(v.tags?.length),
  (v) => Boolean(v.equipamiento),
];

export function calcularCompletitud(v: Partial<Vehicle>) {
  const llenos = CAMPOS_QUE_SUMAN.filter((tiene) => tiene(v)).length;
  return Math.round((llenos / CAMPOS_QUE_SUMAN.length) * 100);
}

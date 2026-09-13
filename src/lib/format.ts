/** CLP siempre entero: en Chile no se muestran decimales. */
export function clp(value: number, opts: { compacto?: boolean } = {}) {
  if (opts.compacto) {
    if (Math.abs(value) >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
    if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  }
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function numero(value: number) {
  return new Intl.NumberFormat("es-CL").format(value);
}

export function km(value: number) {
  return `${numero(value)} km`;
}

export function porcentaje(value: number, decimales = 0) {
  return `${value.toFixed(decimales).replace(".", ",")}%`;
}

/**
 * Fecha corta en español de Chile: "8 jun 2026".
 *
 * `timeZone: "UTC"` a propósito. Las fechas del dominio son columnas `date` de
 * Postgres —un día, sin hora— y llegan como medianoche UTC. Formateadas en la
 * zona local de Chile (UTC-3/-4) retroceden al día anterior: un cierre del 1 de
 * mayo se mostraba como 30 de abril.
 */
export function fecha(valor: string | Date) {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Umbrales de antigüedad de stock que usa el producto (ver docs, regla R4). */
export function severidadDias(dias: number): "ok" | "warn" | "crit" {
  if (dias > 60) return "crit";
  if (dias > 30) return "warn";
  return "ok";
}

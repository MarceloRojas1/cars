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

/** Umbrales de antigüedad de stock que usa el producto (ver docs, regla R4). */
export function severidadDias(dias: number): "ok" | "warn" | "crit" {
  if (dias > 60) return "crit";
  if (dias > 30) return "warn";
  return "ok";
}

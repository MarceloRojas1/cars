/**
 * Simulador de crédito automotriz.
 *
 * Es REFERENCIAL y la pantalla tiene que decirlo. No conocemos la tasa que le
 * darán a esta persona: depende de su historial, de la financiera y del plazo.
 * Por eso se muestra un RANGO y no una cifra: una cuota exacta que después no
 * se cumple es peor que no mostrar nada.
 *
 * La banda de 1,7 %–1,9 % mensual está calibrada contra las cuotas que publica
 * el mercado chileno para autos usados (≈22–25 % anual). Cuando exista un
 * convenio real con una financiera, esto se reemplaza por su tabla.
 */
export const TASA_MIN = 0.017;
export const TASA_MAX = 0.019;
export const PIE_PCT = 0.2;
export const PLAZOS = [24, 36, 48, 60] as const;

/** Cuota francesa: capital e interés parejos en todo el plazo. */
function cuota(monto: number, tasa: number, meses: number) {
  if (monto <= 0 || meses <= 0) return 0;
  return Math.round((monto * tasa) / (1 - Math.pow(1 + tasa, -meses)));
}

export function simular(precio: number, piePct = PIE_PCT, meses = 48) {
  const pie = Math.round(precio * piePct);
  const financiado = precio - pie;
  return {
    pie,
    financiado,
    meses,
    desde: cuota(financiado, TASA_MIN, meses),
    hasta: cuota(financiado, TASA_MAX, meses),
  };
}

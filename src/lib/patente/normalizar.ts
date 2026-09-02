import { CARROCERIAS, MODELOS_SEMILLA } from "@/lib/catalogos";

/** Formatos chilenos: 2 letras + 4 dígitos (antiguo) o 4 letras + 2 dígitos. */
const FORMATO = /^(?:[A-Z]{2}\d{4}|[A-Z]{4}\d{2})$/;

export function normalizarPatente(entrada: string) {
  return entrada.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function patenteValida(patente: string) {
  return FORMATO.test(normalizarPatente(patente));
}

export function aTitulo(s: string) {
  return s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()).trim();
}

export const aEntero = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Tipos del Registro Civil con equivalente claro en nuestro catálogo. */
export const CARROCERIA_POR_TIPO: Record<string, (typeof CARROCERIAS)[number]> = {
  "STATION WAGON": "Station Wagon",
  CAMIONETA: "Camioneta",
  JEEP: "SUV",
  FURGON: "Furgón",
  MINIBUS: "Minibús",
  // "AUTOMOVIL" queda fuera: no distingue sedán de hatchback.
};

export const COMBUSTIBLE_POR_VALOR: Record<string, string> = {
  "HIBRIDO ENCHUFABLE": "Híbrido enchufable",
  PLUG: "Híbrido enchufable",
  HIBRIDO: "Híbrido",
  HYBRID: "Híbrido",
  ELECTRIC: "Eléctrico",
  ELECTRICO: "Eléctrico",
  DIESEL: "Diésel",
  PETROLEO: "Diésel",
  BENCINA: "Bencina",
  GASOLINA: "Bencina",
  GAS: "Gas (GLP/GNV)",
};

export const TRANSMISION_POR_VALOR: Record<string, string> = {
  CVT: "CVT",
  SEMI: "Semiautomática",
  AUTOMAT: "Automática",
  MECANIC: "Manual",
  MANUAL: "Manual",
};

/**
 * Los valores del Registro Civil vienen en mayúsculas y con variantes. Si no se
 * reconoce, se deja pasar tal cual en vez de descartarlo: un dato raro es mejor
 * que ninguno.
 */
export function normalizar(valor: string | undefined, tabla: Record<string, string>) {
  if (!valor) return undefined;
  const limpio = valor.trim().toUpperCase();
  for (const [patron, salida] of Object.entries(tabla)) {
    if (limpio.includes(patron)) return salida;
  }
  return aTitulo(valor);
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Varios proveedores entregan modelo y versión pegados ("NEW WRX S AWD CVT").
 * Si reconocemos un modelo conocido de la marca, se separan; si no, todo va al
 * modelo y el vendedor lo corrige.
 */
export function separarModeloVersion(marca: string, texto: string) {
  const conocidos = MODELOS_SEMILLA[marca] ?? [];
  const encontrado = conocidos
    .filter((m) => new RegExp(`\\b${escapar(m)}\\b`, "i").test(texto))
    .sort((a, b) => b.length - a.length)[0];

  if (!encontrado) return { modelo: aTitulo(texto), version: undefined };

  const version = texto
    .replace(new RegExp(`\\b${escapar(encontrado)}\\b`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
  return { modelo: encontrado, version: version || undefined };
}

import type { Vehicle } from "@/lib/types";
import { crearXlsx, type Celda } from "./xlsx";

/**
 * El inventario en la planilla que usa la automotora.
 *
 * El formato NO lo elegimos nosotros: sale del Libro1.xlsx que ya usan, y por
 * eso las columnas se llaman como se llaman ("Version" sin tilde, "P.
 * Publicación") y los valores vienen abreviados. Copiar su planilla es lo que
 * permite pegar esto en lo que ya tienen sin reordenar nada.
 */

const ENCABEZADOS = [
  "Patente", "Marca", "Tipo", "Modelo", "Version",
  "Transmision", "Año", "Kilometraje", "P. Publicación",
] as const;

/**
 * Su vocabulario no es el nuestro.
 *
 * Nosotros guardamos "Automática" porque es lo que se elige en el formulario;
 * la planilla dice AT. Traducir acá y no cambiar el catálogo es deliberado: la
 * interfaz sigue hablando en español completo, y el que se adapta es el export.
 *
 * CVT y Semiautomática caen en AT porque para esta planilla lo que importa es
 * si el conductor embraga o no.
 */
const TRANSMISION: Record<string, string> = {
  "Manual": "MT",
  "Automática": "AT",
  "CVT": "AT",
  "Semiautomática": "AT",
};

/**
 * Lo mismo con la carrocería, que en su planilla es la columna "Tipo".
 *
 * Las que no tienen equivalente —Van, Furgón, Minibús— pasan tal cual: es
 * preferible una celda que diga "Furgón" a una vacía o a un "Otro" que pierde
 * el dato. La planilla trae además "Moto", que nuestro catálogo no tiene.
 */
const CARROCERIA: Record<string, string> = {
  "Sedán": "Sedan",
  "Hatchback": "HB",
  "Camioneta": "Pick Up",
  "Station Wagon": "SW",
  "Coupé": "Coupe",
};

/** Como en su planilla: la ausencia se escribe, no se deja en blanco. */
const SIN_PATENTE = "Sin Patente";

export function filasDeInventario(vehiculos: Vehicle[]): Celda[][] {
  const filas: Celda[][] = [[...ENCABEZADOS]];

  for (const v of vehiculos) {
    filas.push([
      v.patente?.trim() || SIN_PATENTE,
      v.marca,
      v.carroceria ? CARROCERIA[v.carroceria] ?? v.carroceria : "",
      v.modelo ?? "",
      v.version ?? "",
      v.transmision ? TRANSMISION[v.transmision] ?? v.transmision : "",
      /*
       * Año, kilometraje y precio van como NÚMERO, no como texto. En su
       * planilla lo son, y es lo que permite ordenar y sumar en Excel: un
       * "47.450.000" con puntos se ordena como texto y pone 9.000.000 arriba
       * de 47.000.000.
       */
      v.anio || null,
      Number.isFinite(v.km) ? v.km : null,
      v.precio || null,
    ]);
  }

  return filas;
}

export function xlsxDeInventario(vehiculos: Vehicle[]): Buffer {
  return crearXlsx(filasDeInventario(vehiculos), "Inventario");
}

/** `inventario-marketcar-2026-09-15.xlsx` */
export function nombreDeArchivo(automotora: string): string {
  const limpio = automotora
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hoy = new Date().toISOString().slice(0, 10);
  return `inventario-${limpio || "velie"}-${hoy}.xlsx`;
}

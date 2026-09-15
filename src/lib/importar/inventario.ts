import type { NuevoVehiculo } from "@/lib/data";

/**
 * Traduce la planilla de la automotora a vehículos nuestros.
 *
 * El formato es el de su `Libro1.xlsx` y no uno que hayamos inventado:
 *
 *   Patente · Marca · Tipo · Modelo · Version · Transmision · Año · Kilometraje · P. Publicación
 *
 * Nada de esto escribe en la base: analiza y clasifica. Quien llama decide.
 * Separarlo es lo que permite mostrar la vista previa antes de crear 32 autos,
 * que es una operación que nadie quiere descubrir después de hecha.
 */

/** Los encabezados esperados, normalizados para comparar. */
const COLUMNAS = [
  "patente", "marca", "tipo", "modelo", "version",
  "transmision", "ano", "kilometraje", "p. publicacion",
] as const;

const normalizar = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Su vocabulario → el nuestro. Es el inverso del que usa la exportación. */
const TRANSMISION: Record<string, string> = {
  at: "Automática",
  mt: "Manual",
  automatica: "Automática",
  manual: "Manual",
  cvt: "CVT",
};

const CARROCERIA: Record<string, string> = {
  "pick up": "Camioneta",
  pickup: "Camioneta",
  hb: "Hatchback",
  sedan: "Sedán",
  suv: "SUV",
  moto: "Moto",
  sw: "Station Wagon",
  coupe: "Coupé",
  van: "Van",
};

/**
 * Un número de la planilla. Acepta lo que Excel guarda ("47450000") y también
 * lo que alguien puede haber escrito a mano ("$ 47.450.000", "18.000 km").
 */
function numero(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const digitos = v.replace(/[^\d]/g, "");
  if (!digitos) return undefined;
  const n = Number(digitos);
  return Number.isFinite(n) ? n : undefined;
}

export type FilaInvalida = { fila: number; descripcion: string; motivo: string };
export type FilaRepetida = { fila: number; patente: string; descripcion: string };

export type AnalisisPlanilla = {
  /** Listos para crear. */
  nuevos: { fila: number; datos: NuevoVehiculo }[];
  /** Ya están en el inventario, por patente. Se saltan. */
  repetidos: FilaRepetida[];
  /** No se pueden crear: les falta algo obligatorio. */
  invalidos: FilaInvalida[];
  /** Si los encabezados no calzan con los esperados. */
  advertenciaEncabezados?: string;
};

const ANIO_MAX = new Date().getFullYear() + 1;

/**
 * El título no viene en la planilla: se compone.
 *
 * `Marca Modelo Version` es como se ven los títulos que ya existen en el panel
 * ("BMW X3 xDrive30i M Sport"). Se limita a 100 caracteres porque es lo que
 * acepta el formulario, y se recorta por palabra para no cortar a la mitad.
 */
function componerTitulo(marca: string, modelo: string, version?: string): string {
  const completo = [marca, modelo, version].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (completo.length <= 100) return completo;

  let corto = "";
  for (const palabra of completo.split(" ")) {
    if ((corto + " " + palabra).trim().length > 100) break;
    corto = (corto + " " + palabra).trim();
  }
  return corto || completo.slice(0, 100);
}

export function analizarPlanilla(
  filas: string[][],
  patentesExistentes: Set<string>,
): AnalisisPlanilla {
  const resultado: AnalisisPlanilla = { nuevos: [], repetidos: [], invalidos: [] };
  if (filas.length === 0) return resultado;

  /*
   * La primera fila son los encabezados y se descarta. Si no calzan con los
   * esperados se avisa pero NO se aborta: alguien pudo renombrar una columna o
   * agregar una al final, y rechazar la planilla entera por eso sería peor que
   * intentar leerla por posición, que es como está definido el formato.
   */
  const encabezados = (filas[0] ?? []).map(normalizar);
  const calzan = COLUMNAS.every((c, i) => encabezados[i]?.startsWith(c.slice(0, 6)));
  if (!calzan) {
    resultado.advertenciaEncabezados =
      "Los encabezados no son los esperados. Se leyó por posición: " +
      COLUMNAS.join(" · ");
  }

  const vistas = new Set<string>();

  filas.slice(1).forEach((fila, i) => {
    const numeroFila = i + 2;          // +1 por el encabezado, +1 porque Excel cuenta desde 1
    const celda = (n: number) => (fila[n] ?? "").trim();

    const patenteCruda = celda(0);
    const marca = celda(1);
    const modelo = celda(3);
    const version = celda(4) || undefined;
    const anio = numero(celda(6));
    const precio = numero(celda(8));

    const descripcion = [marca, modelo, version].filter(Boolean).join(" ") || "(fila vacía)";

    // Una fila del todo vacía no es un error: Excel deja filas fantasma al final.
    if (!patenteCruda && !marca && !modelo && !anio && !precio) return;

    /*
     * "Sin Patente" es como su planilla escribe la ausencia, no una patente.
     * Sin patente no se puede deduplicar, así que esas filas siempre se crean.
     */
    const patente =
      patenteCruda && normalizar(patenteCruda) !== "sin patente"
        ? patenteCruda.toUpperCase().replace(/[\s-]/g, "")
        : undefined;

    const faltan: string[] = [];
    if (!marca) faltan.push("marca");
    if (!modelo) faltan.push("modelo");
    if (!anio) faltan.push("año");
    if (!precio) faltan.push("precio");

    if (faltan.length > 0) {
      resultado.invalidos.push({
        fila: numeroFila,
        descripcion,
        motivo: `falta ${faltan.join(", ")}`,
      });
      return;
    }
    if (anio! < 1900 || anio! > ANIO_MAX) {
      resultado.invalidos.push({
        fila: numeroFila, descripcion, motivo: `año fuera de rango (${anio})`,
      });
      return;
    }

    if (patente && patentesExistentes.has(patente)) {
      resultado.repetidos.push({ fila: numeroFila, patente, descripcion });
      return;
    }
    // Repetida dentro de la MISMA planilla: la segunda también se salta, o se
    // crearían dos autos con la misma patente en una sola importación.
    if (patente && vistas.has(patente)) {
      resultado.repetidos.push({ fila: numeroFila, patente, descripcion });
      return;
    }
    if (patente) vistas.add(patente);

    const transmisionCruda = normalizar(celda(5));
    const carroceriaCruda = normalizar(celda(2));

    resultado.nuevos.push({
      fila: numeroFila,
      datos: {
        patente,
        marca,
        modelo,
        version,
        anio: anio!,
        precio: precio!,
        titulo: componerTitulo(marca, modelo, version),
        km: numero(celda(7)),
        // Lo que no reconocemos pasa tal cual: es mejor guardar "Buggy" que
        // perder el dato por no tenerlo en el catálogo.
        transmision: transmisionCruda ? TRANSMISION[transmisionCruda] ?? celda(5) : undefined,
        carroceria: carroceriaCruda ? CARROCERIA[carroceriaCruda] ?? celda(2) : undefined,
        tags: [],
      },
    });
  });

  return resultado;
}

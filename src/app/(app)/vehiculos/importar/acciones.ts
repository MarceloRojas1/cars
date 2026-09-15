"use server";

import { revalidatePath } from "next/cache";
import { buscarVehiculos, crearVehiculo, getOrganization, type NuevoVehiculo } from "@/lib/data";
import { leerXlsx } from "@/lib/importar/xlsx";
import { analizarPlanilla, type AnalisisPlanilla } from "@/lib/importar/inventario";
import { mensajeParaElUsuario } from "@/lib/errores";

/**
 * Importar es en dos pasos, y el primero no escribe nada.
 *
 * Crear treinta autos de una vez es de las pocas cosas del panel que no se
 * deshacen con un clic: habría que archivarlos uno por uno. Así que primero se
 * muestra qué va a pasar y recién después se hace.
 */

export type EstadoAnalisis =
  | { fase: "vacio" }
  | { fase: "error"; mensaje: string }
  | {
      fase: "previsualizado";
      nombreArchivo: string;
      resumen: { nuevos: number; repetidos: number; invalidos: number };
      repetidos: AnalisisPlanilla["repetidos"];
      invalidos: AnalisisPlanilla["invalidos"];
      advertencia?: string;
      /** Lo que se va a crear. Vuelve al servidor tal cual al confirmar. */
      datos: NuevoVehiculo[];
    };

/** Las patentes que ya están, para no duplicar. */
async function patentesDelInventario(): Promise<Set<string>> {
  // Activos y archivados: un auto archivado sigue ocupando su patente, y
  // volver a crearlo desde la planilla dejaría dos fichas del mismo vehículo.
  const [activos, archivados] = await Promise.all([
    buscarVehiculos({ porPagina: 5000 }),
    buscarVehiculos({ archivados: true, porPagina: 5000 }),
  ]);
  return new Set(
    [...activos.vehiculos, ...archivados.vehiculos]
      .map((v) => v.patente?.toUpperCase().replace(/[\s-]/g, ""))
      .filter((p): p is string => Boolean(p)),
  );
}

const MAX_BYTES = 5 * 1024 * 1024;

export async function analizarPlanillaAction(
  _previo: EstadoAnalisis,
  formData: FormData,
): Promise<EstadoAnalisis> {
  const archivo = formData.get("planilla");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { fase: "error", mensaje: "Elige un archivo .xlsx." };
  }
  if (archivo.size > MAX_BYTES) {
    return { fase: "error", mensaje: "El archivo es muy grande (máximo 5 MB)." };
  }
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
    return {
      fase: "error",
      mensaje: "Tiene que ser un .xlsx. Si es un .xls o un .csv, ábrelo en Excel y guárdalo como .xlsx.",
    };
  }

  try {
    const filas = leerXlsx(Buffer.from(await archivo.arrayBuffer()));
    const analisis = analizarPlanilla(filas, await patentesDelInventario());

    if (analisis.nuevos.length === 0 && analisis.repetidos.length === 0 && analisis.invalidos.length === 0) {
      return { fase: "error", mensaje: "La planilla no tiene filas con datos." };
    }

    return {
      fase: "previsualizado",
      nombreArchivo: archivo.name,
      resumen: {
        nuevos: analisis.nuevos.length,
        repetidos: analisis.repetidos.length,
        invalidos: analisis.invalidos.length,
      },
      repetidos: analisis.repetidos,
      invalidos: analisis.invalidos,
      advertencia: analisis.advertenciaEncabezados,
      datos: analisis.nuevos.map((n) => n.datos),
    };
  } catch (e) {
    return {
      fase: "error",
      mensaje: mensajeParaElUsuario(e, "No se pudo leer la planilla. ¿Es un .xlsx válido?"),
    };
  }
}

export type ResultadoImportacion = {
  ok: boolean;
  creados: number;
  fallidos: { titulo: string; motivo: string }[];
  mensaje?: string;
};

/**
 * Los datos vuelven desde el navegador en vez de guardarse entre los dos pasos.
 *
 * Es información que el cliente podría alterar, y está bien: lo peor que puede
 * hacer con esto es crear vehículos en SU propia automotora, que es justo lo que
 * el formulario de «Nuevo vehículo» ya le permite. La organización sale de
 * `orgActual()` dentro de `crearVehiculo()`, nunca de acá, así que no hay forma
 * de escribir en la de otro. Lo único que sí hay que revalidar es el cupo del
 * plan, y se hace abajo.
 */
export async function importarAction(datos: NuevoVehiculo[]): Promise<ResultadoImportacion> {
  if (!Array.isArray(datos) || datos.length === 0) {
    return { ok: false, creados: 0, fallidos: [], mensaje: "No hay nada que importar." };
  }

  /*
   * El cupo del plan se revisa ACÁ y no solo en la pantalla: `crearVehiculo` no
   * lo mira, y una planilla de 300 filas podría pasarse del límite sin que nada
   * lo dijera. Se corta antes de escribir, no a la mitad.
   */
  const organizacion = await getOrganization();
  const { total } = await buscarVehiculos({ porPagina: 1 });
  if (total + datos.length > organizacion.limiteVehiculos) {
    const caben = Math.max(0, organizacion.limiteVehiculos - total);
    return {
      ok: false,
      creados: 0,
      fallidos: [],
      mensaje:
        `Tu plan ${organizacion.plan} permite ${organizacion.limiteVehiculos} vehículos y tienes ${total}. ` +
        `Caben ${caben} y la planilla trae ${datos.length}.`,
    };
  }

  /*
   * De a uno y sin transacción envolvente, a propósito: `crearVehiculo` calcula
   * el correlativo COD9xxxxx leyendo el máximo actual, así que necesita ver lo
   * que insertó la fila anterior. Si una falla, las anteriores quedan creadas y
   * se informa cuál falló — es preferible a perder 31 autos por culpa del 32.
   */
  const fallidos: ResultadoImportacion["fallidos"] = [];
  let creados = 0;

  for (const vehiculo of datos) {
    try {
      await crearVehiculo(vehiculo);
      creados++;
    } catch (e) {
      fallidos.push({
        titulo: vehiculo.titulo,
        motivo: mensajeParaElUsuario(e, "no se pudo crear"),
      });
    }
  }

  revalidatePath("/vehiculos");
  revalidatePath("/dashboard");

  return { ok: fallidos.length === 0, creados, fallidos };
}

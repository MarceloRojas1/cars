"use server";

import { revalidatePath } from "next/cache";
import { buscarVehiculos, crearVehiculo, getOrganization } from "@/lib/data";
import { guardarImagenGenerada } from "@/lib/storage";
import { traerImagen, traerPagina, UrlNoPermitida } from "@/lib/importar/traer";
import {
  candidatasDeCatalogo, leerCatalogoVenpu, reconocerVenpu, traducirVenpu,
  type VehiculoTraducido,
} from "@/lib/importar/venpu";

/**
 * Importar el inventario desde el sitio que la automotora todavía tiene en
 * VENPU.
 *
 * Es el camino de entrada al producto: quien llega viene de ahí, con su
 * inventario cargado y fotografiado, y volver a subir treinta autos con
 * cuarenta fotos cada uno a mano es motivo suficiente para no cambiarse.
 *
 * Dos pasos, como el importador de Excel: primero se mira, después se escribe.
 * Y el segundo va de a UN vehículo por llamada — con cuarenta fotos cada uno,
 * hacerlo todo en una sola pasada se come el límite de tiempo de la función y
 * deja al usuario mirando una pantalla quieta sin saber si avanza.
 */

export type FichaEncontrada = {
  codigoVenpu: string;
  titulo: string;
  patenteProbable?: string;
  fotos: number;
  vendido: boolean;
  /** Qué hacer con ella, decidido al analizar. */
  estado: "nuevo" | "completar_fotos" | "ya_esta";
  /** El vehículo nuestro con el que se emparejó, si hubo. */
  emparejadoCon?: { codigo: string; titulo: string; fotos: number };
};

export type AnalisisSitio =
  | { fase: "vacio" }
  | { fase: "error"; mensaje: string }
  | {
      fase: "previsualizado";
      sitio: string;
      resumen: { nuevos: number; completar: number; yaEstan: number; vendidos: number; fotos: number };
      fichas: FichaEncontrada[];
      /** Lo que se va a importar, listo para mandar de vuelta al confirmar. */
      datos: ParaImportar[];
    };

/** Un vehículo listo para importar; `idDestino` significa "solo le faltan fotos". */
export type ParaImportar = VehiculoTraducido & { idDestino?: string };

const norm = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

export async function analizarSitioAction(
  _previo: AnalisisSitio,
  formData: FormData,
): Promise<AnalisisSitio> {
  const crudo = String(formData.get("url") ?? "").trim();
  if (!crudo) return { fase: "error", mensaje: "Pega la dirección de tu sitio." };

  let url: URL;
  try {
    url = new URL(crudo.startsWith("http") ? crudo : `https://${crudo}`);
  } catch {
    return { fase: "error", mensaje: "Esa no parece una dirección web." };
  }

  /*
   * Se prueban las rutas conocidas: la persona puede pegar la portada, una
   * ficha o el catálogo, y lo que necesitamos es la página que trae el
   * inventario completo embebido. Se queda con la que más vehículos devuelva.
   */
  let mejor: { sitio: string; vehiculos: ReturnType<typeof leerCatalogoVenpu> } | null = null;
  let ultimoMotivo = "No encontré vehículos publicados en ese sitio.";

  for (const candidata of candidatasDeCatalogo(url)) {
    try {
      const { url: final, html } = await traerPagina(candidata);
      const reconocido = reconocerVenpu(html);
      if (!reconocido.es) { ultimoMotivo = reconocido.motivo!; continue; }

      const vehiculos = leerCatalogoVenpu(html);
      if (!mejor || vehiculos.length > mejor.vehiculos.length) {
        mejor = { sitio: final, vehiculos };
      }
      // El catálogo completo ya apareció: no hace falta seguir pidiendo páginas.
      if (vehiculos.length >= 20) break;
    } catch (e) {
      if (e instanceof UrlNoPermitida) ultimoMotivo = e.message;
    }
  }

  if (!mejor || mejor.vehiculos.length === 0) {
    return { fase: "error", mensaje: ultimoMotivo };
  }

  /* Lo que ya tenemos, para no duplicar. */
  const [activos, archivados] = await Promise.all([
    buscarVehiculos({ porPagina: 5000 }),
    buscarVehiculos({ archivados: true, porPagina: 5000 }),
  ]);
  const nuestros = [...activos.vehiculos, ...archivados.vehiculos];

  const fichas: FichaEncontrada[] = [];
  const datos: ParaImportar[] = [];

  for (const v of mejor.vehiculos) {
    const t = traducirVenpu(v);
    if (!t) continue;

    /*
     * El cruce es por MARCA + AÑO + KILOMETRAJE, no por patente: su sitio no
     * publica patentes —ninguna automotora lo hace— pero el kilometraje es casi
     * una huella digital, y con marca y año encima no hubo un solo choque al
     * medirlo contra un catálogo real de 100 vehículos.
     */
    const par = nuestros.find(
      (n) =>
        norm(n.marca) === norm(t.datos.marca) &&
        n.anio === t.datos.anio &&
        Math.abs(Number(n.km ?? -1) - Number(t.datos.km ?? -2)) <= 1,
    );

    const estado: FichaEncontrada["estado"] = !par
      ? "nuevo"
      : (par.fotos?.length ?? 0) === 0
        ? "completar_fotos"
        : "ya_esta";

    fichas.push({
      codigoVenpu: t.codigoVenpu,
      titulo: t.datos.titulo,
      patenteProbable: par?.patente,
      fotos: t.fotos.length,
      vendido: t.vendido,
      estado,
      emparejadoCon: par
        ? { codigo: par.codigo, titulo: par.titulo, fotos: par.fotos?.length ?? 0 }
        : undefined,
    });

    if (estado !== "ya_esta") datos.push({ ...t, idDestino: par?.id });
  }

  const cuenta = (e: FichaEncontrada["estado"]) => fichas.filter((f) => f.estado === e).length;

  return {
    fase: "previsualizado",
    sitio: mejor.sitio,
    resumen: {
      nuevos: cuenta("nuevo"),
      completar: cuenta("completar_fotos"),
      yaEstan: cuenta("ya_esta"),
      vendidos: fichas.filter((f) => f.vendido).length,
      fotos: datos.reduce((a, d) => a + d.fotos.length, 0),
    },
    fichas,
    datos,
  };
}

export type ResultadoUno = {
  ok: boolean;
  titulo: string;
  fotos: number;
  mensaje?: string;
};

/**
 * Importa UN vehículo con sus fotos. La pantalla llama a esto en serie y va
 * mostrando el avance.
 *
 * Las fotos se copian a NUESTRO almacenamiento en vez de enlazar las suyas:
 * enlazarlas dejaría el catálogo nuevo dependiendo de que el viejo siga en pie,
 * que es justamente lo que se está reemplazando.
 */
export async function importarUnoAction(
  v: ParaImportar,
  incluirVendidos = false,
): Promise<ResultadoUno> {
  if (v.vendido && !incluirVendidos) {
    return { ok: true, titulo: v.datos.titulo, fotos: 0, mensaje: "vendido, se saltó" };
  }

  try {
    const fotos: { url: string; esPrincipal: boolean }[] = [];
    for (const [i, origen] of v.fotos.entries()) {
      try {
        const { datos, tipo } = await traerImagen(origen);
        const { url } = await guardarImagenGenerada(datos, tipo, "vehiculos");
        fotos.push({ url, esPrincipal: i === 0 });
      } catch (e) {
        // Una foto que falla no puede costar el vehículo entero.
        console.error("[venpu] no se pudo traer una foto", origen, e);
      }
    }

    if (v.idDestino) {
      // Ya existe: solo le faltaban las fotos.
      const { agregarFotos } = await import("@/lib/data");
      await agregarFotos(v.idDestino, fotos);
      revalidatePath("/vehiculos");
      return { ok: true, titulo: v.datos.titulo, fotos: fotos.length };
    }

    const organizacion = await getOrganization();
    const { total } = await buscarVehiculos({ porPagina: 1 });
    if (total >= organizacion.limiteVehiculos) {
      return {
        ok: false, titulo: v.datos.titulo, fotos: 0,
        mensaje: `Tu plan ${organizacion.plan} llegó a ${organizacion.limiteVehiculos} vehículos.`,
      };
    }

    await crearVehiculo({ ...v.datos, fotos });
    revalidatePath("/vehiculos");
    return { ok: true, titulo: v.datos.titulo, fotos: fotos.length };
  } catch (e) {
    return {
      ok: false, titulo: v.datos.titulo, fotos: 0,
      mensaje: e instanceof Error ? e.message : "no se pudo importar",
    };
  }
}

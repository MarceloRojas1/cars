import { buscarVehiculos, getOrganization } from "@/lib/data";
import { nombreDeArchivo, xlsxDeInventario } from "@/lib/exportar/inventario";

/**
 * El inventario, en la planilla que la automotora ya usa.
 *
 * Vive DENTRO de `/vehiculos` y no en `/api` a propósito: `esRutaDelPanel()`
 * mira el primer segmento del camino, así que esta ruta hereda la puerta del
 * panel sin escribir un solo chequeo. Colgada de `/api` habría quedado abierta
 * —como le pasó a `/api/fotos`— y con ella se llevaría el inventario completo
 * con precios de cualquiera que adivinara la URL.
 *
 * Genera el archivo en memoria: el inventario de una automotora son decenas de
 * filas, no millones. Si algún día lo fueran, esto se convierte en un trabajo
 * en segundo plano que deja el archivo en Blob.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const texto = (k: string) => url.searchParams.get(k) || undefined;
  const entero = (k: string) => {
    const n = Number(url.searchParams.get(k));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  /*
   * Se exporta LO QUE SE ESTÁ VIENDO. Los filtros llegan en la URL desde la
   * pantalla, así que "filtro por Peugeot y exporto" da los Peugeot. Exportar
   * siempre el inventario entero sería una sorpresa para quien acaba de
   * filtrar, y además obligaría a limpiar la planilla a mano después.
   *
   * `porPagina` alto y no la paginación de la pantalla: se exporta el
   * resultado completo del filtro, no la página que se ve.
   */
  const [{ vehiculos }, organizacion] = await Promise.all([
    buscarVehiculos({
      q: texto("q"),
      marca: texto("marca"),
      estado: texto("estado"),
      combustible: texto("combustible"),
      anioDesde: entero("anioDesde"),
      anioHasta: entero("anioHasta"),
      precioDesde: entero("precioDesde"),
      precioHasta: entero("precioHasta"),
      branchId: texto("branchId"),
      vendedorId: texto("vendedorId"),
      soloIncompletas: url.searchParams.get("incompletas") === "1",
      archivados: url.searchParams.get("vista") === "archivados",
      pagina: 1,
      porPagina: 5000,
    }),
    getOrganization(),
  ]);

  const archivo = xlsxDeInventario(vehiculos);

  return new Response(new Uint8Array(archivo), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${nombreDeArchivo(organizacion.nombre)}"`,
      // Nunca cachear: el inventario cambia y bajar una planilla vieja sin
      // saberlo es peor que esperar el segundo que tarda en generarse.
      "cache-control": "no-store",
    },
  });
}

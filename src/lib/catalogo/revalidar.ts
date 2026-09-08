import { revalidatePath } from "next/cache";
import { consultar, dbConfigurada } from "@/lib/db";
import { orgActual } from "@/lib/auth/sesion";
import { getVehiculo } from "@/lib/data";

/**
 * Caduca el catálogo público después de editar un vehículo.
 *
 * El panel se sirve siempre fresco (`force-dynamic`), pero el catálogo se
 * guarda: sin esta llamada, la automotora corrige un precio y el comprador
 * sigue viendo el viejo hasta que expire la hora de `revalidate`. Publicar un
 * precio que ya no es el precio no es un detalle de caché.
 *
 * Silencioso a propósito: si falla, el peor caso es una página desactualizada
 * por una hora. Tumbar el guardado del vehículo por eso sería peor.
 */
export async function revalidarCatalogo(vehiculoId?: string) {
  if (!dbConfigurada()) return;
  try {
    const orgId = await orgActual();
    const filas = await consultar<{ slug: string }>(
      orgId,
      "select slug from organization where id = $1",
      [orgId],
    );
    const slug = filas[0]?.slug;
    if (!slug) return;

    revalidatePath(`/${slug}`);

    /*
     * La ficha se dirige por código, no por id, así que hay que traducirlo.
     * Si el vehículo ya no existe —se eliminó— no hay ficha que caducar: el
     * listado, que sí se revalidó arriba, deja de enlazarla.
     */
    if (vehiculoId) {
      const v = await getVehiculo(vehiculoId);
      if (v) revalidatePath(`/${slug}/vehiculos/${v.codigo}`);
    }
  } catch (e) {
    console.error("[catalogo] no se pudo revalidar el catálogo público", e);
  }
}

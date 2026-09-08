import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Completitud, DiasEnSalon, EstadoVehiculo } from "@/components/badges";
import { VehiculoAcciones } from "@/components/vehiculo-acciones";
import { clp, km } from "@/lib/format";
import type { Branch, Vehicle } from "@/lib/types";

/**
 * Inventario en tarjetas con la foto grande.
 *
 * La foto es el dato que más pesa al vender un auto, y en una fila de tabla
 * cabía en 52 píxeles. Acá manda, y de paso la ausencia de foto se vuelve
 * evidente: una publicación sin fotos no la ve nadie, y en la tabla eso era un
 * iconito gris fácil de pasar por alto.
 */
export function VehiculosGrilla({
  vehiculos, sucursales,
}: {
  vehiculos: Vehicle[];
  sucursales: Branch[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vehiculos.map((v) => {
        const sucursal = sucursales.find((b) => b.id === v.branchId);
        return (
          <li key={v.id}>
            <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
              <Link
                href={`/vehiculos/${v.id}/editar`}
                className="relative block aspect-[4/3] overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label={`Abrir ${v.titulo}`}
              >
                {v.fotoPrincipal ? (
                  <Image
                    src={v.fotoPrincipal}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center gap-1.5 text-muted-foreground/60">
                    <ImageOff className="size-6" strokeWidth={1.25} />
                    <span className="text-[11.5px]">Sin fotos</span>
                  </span>
                )}

                {/* El estado va sobre la foto: es lo primero que se pregunta al
                    mirar un auto en una grilla. */}
                <span className="absolute left-2.5 top-2.5 rounded-md bg-background/85 px-2 py-1 backdrop-blur-sm">
                  <EstadoVehiculo estado={v.estado} />
                </span>
              </Link>

              <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13.5px] font-medium" title={v.titulo}>
                      {v.titulo}
                    </h3>
                    <p className="tabular mt-0.5 text-[11px] text-muted-foreground">{v.codigo}</p>
                  </div>
                  <VehiculoAcciones
                    id={v.id} titulo={v.titulo} estado={v.estado} archivado={v.archivado}
                  />
                </div>

                <p className="tabular text-[18px] font-medium leading-none">{clp(v.precio)}</p>

                <p className="text-[12px] text-muted-foreground">
                  {v.anio} · {km(v.km)} · {v.combustible}
                  {sucursal?.comuna ? ` · ${sucursal.comuna}` : ""}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-2.5">
                  <DiasEnSalon dias={v.publicadoHaceDias} />
                  <Completitud pct={v.completitudPct} />
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

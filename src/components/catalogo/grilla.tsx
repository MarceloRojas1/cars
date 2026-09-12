"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { clp, km, numero } from "@/lib/format";
import type { VehiculoPublico } from "@/lib/data/catalogo";

/**
 * "Ayer", "Hace 5 días". Un auto recién publicado es lo que más mueve a un
 * comprador: le dice que el stock está vivo y que vale la pena volver.
 */
function publicado(dias: number | undefined) {
  if (dias === undefined || dias > 30) return null;
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}

const POR_TANDA = 12;

type Orden = "recientes" | "precio-asc" | "precio-desc" | "km-asc";

const ORDENES: { id: Orden; nombre: string }[] = [
  { id: "recientes", nombre: "Más recientes" },
  { id: "precio-asc", nombre: "Menor precio" },
  { id: "precio-desc", nombre: "Mayor precio" },
  { id: "km-asc", nombre: "Menos kilómetros" },
];

const control =
  "h-9 rounded-[var(--radius)] border border-border bg-card px-3 text-[13px] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * El listado del catálogo.
 *
 * Filtra y ordena en el navegador sobre la lista completa, no contra el
 * servidor: un catálogo de automotora son decenas de autos, no miles, y ya
 * vienen todos en la página estática. Filtrar en el servidor obligaría a que
 * cada clic tocara Postgres y tiraría abajo justamente la ventaja de servir
 * esto guardado.
 */
export function GrillaCatalogo({
  slug, vehiculos, color,
}: {
  slug: string;
  vehiculos: VehiculoPublico[];
  /** El color de la automotora: la cápsula del precio y el botón lo usan. */
  color: string;
}) {
  const [marca, setMarca] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [visibles, setVisibles] = useState(POR_TANDA);

  const marcas = useMemo(
    () => [...new Set(vehiculos.map((v) => v.marca).filter(Boolean))].sort(),
    [vehiculos],
  );

  const lista = useMemo(() => {
    const filtrados = marca ? vehiculos.filter((v) => v.marca === marca) : vehiculos;
    const copia = [...filtrados];
    if (orden === "precio-asc") copia.sort((a, b) => a.precio - b.precio);
    if (orden === "precio-desc") copia.sort((a, b) => b.precio - a.precio);
    if (orden === "km-asc") copia.sort((a, b) => a.km - b.km);
    return copia;
  }, [vehiculos, marca, orden]);

  function cambiarFiltro(fn: () => void) {
    fn();
    setVisibles(POR_TANDA); // volver a la primera tanda: si no, se ve un hueco
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <p className="tabular text-[13px] text-muted-foreground">
          <span className="text-foreground">{numero(lista.length)}</span>{" "}
          {lista.length === 1 ? "vehículo disponible" : "vehículos disponibles"}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {marcas.length > 1 && (
            <>
              <label htmlFor="marca" className="sr-only">Marca</label>
              <select
                id="marca" value={marca} className={control}
                onChange={(e) => cambiarFiltro(() => setMarca(e.target.value))}
              >
                <option value="">Todas las marcas</option>
                {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </>
          )}
          <label htmlFor="orden" className="sr-only">Ordenar por</label>
          <select
            id="orden" value={orden} className={control}
            onChange={(e) => cambiarFiltro(() => setOrden(e.target.value as Orden))}
          >
            {ORDENES.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="border-t border-border py-16 text-center text-[13.5px] text-muted-foreground">
          No hay vehículos que coincidan con ese filtro.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.slice(0, visibles).map((v) => (
            <li key={v.codigo}>
              <Link
                href={`/${slug}/vehiculos/${v.codigo}`}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={v.fotos[0]}
                    alt={v.titulo}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />

                  {publicado(v.publicadoHaceDias) && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-background/85 px-2.5 py-1 text-[11px] backdrop-blur-sm">
                      {publicado(v.publicadoHaceDias)}
                    </span>
                  )}

                  {v.fotos.length > 1 && (
                    <span className="tabular absolute right-2.5 top-2.5 rounded-full bg-background/85 px-2 py-1 text-[11px] backdrop-blur-sm">
                      {v.fotos.length} fotos
                    </span>
                  )}

                  {/* El precio sobre la foto: es lo que la gente compara al
                      recorrer una grilla, y así no hay que bajar la vista. */}
                  <span
                    className="tabular absolute bottom-2.5 left-2.5 rounded-lg px-2.5 py-1.5 text-[15px] font-semibold text-white shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {clp(v.precio)}
                  </span>

                  {v.anio > 0 && (
                    <span className="tabular absolute bottom-2.5 right-2.5 rounded-lg bg-background/85 px-2 py-1.5 text-[12px] backdrop-blur-sm">
                      {v.anio}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="text-[14px] font-medium leading-snug">{v.titulo}</h2>
                  <p className="text-[12px] text-muted-foreground">
                    {[km(v.km), v.combustible, v.transmision, v.comuna]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <span className="mt-auto flex h-9 items-center justify-center rounded-[var(--radius)] border border-border text-[13px] font-medium transition-colors group-hover:bg-accent">
                    Ver detalles
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {visibles < lista.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibles((n) => n + POR_TANDA)}
            className="h-10 rounded-[var(--radius)] border border-border bg-card px-5 text-[13px] font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Cargar más vehículos ({numero(lista.length - visibles)})
          </button>
        </div>
      )}
    </>
  );
}

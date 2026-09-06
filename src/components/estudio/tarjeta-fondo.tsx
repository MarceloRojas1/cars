import Image from "next/image";
import type { Showroom } from "@/lib/types";

/**
 * Un fondo de la biblioteca.
 *
 * La miniatura tiene la misma proporción con la que se generan los fondos
 * (9:16), así que no recorta nada. Importa: la línea de piso se dibuja sobre la
 * caja, y si la caja recortara la imagen, la línea quedaría corrida respecto del
 * suelo real.
 */
export function TarjetaFondo({ fondo }: { fondo: Showroom }) {
  return (
    <figure className="border border-border bg-card">
      <div className="relative aspect-[9/16] bg-muted/30">
        {fondo.url ? (
          <>
            <Image
              src={fondo.url}
              alt={fondo.nombre}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover"
            />
            {/* Dónde se apoyaría el vehículo: es el dato que hace útil al fondo. */}
            <span
              className="absolute inset-x-0 border-t border-dashed border-primary/40"
              style={{ top: `${fondo.lineaPiso * 100}%` }}
              title={`Línea de piso ${fondo.lineaPiso.toFixed(2)}`}
            />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center border border-dashed border-border p-3 text-center">
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Sin generar
            </p>
          </div>
        )}
      </div>

      <figcaption className="flex items-baseline justify-between gap-2 px-2.5 py-2">
        <span className="truncate text-[12.5px] font-medium">{fondo.nombre}</span>
        <span className="tabular shrink-0 text-[11px] text-muted-foreground">
          {fondo.url ? `${fondo.usos} usos` : "—"}
        </span>
      </figcaption>
    </figure>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Galería de la ficha: una foto grande y las miniaturas debajo. */
export function Galeria({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [i, setI] = useState(0);
  const mover = (d: number) => setI((n) => (n + d + fotos.length) % fotos.length);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
        <Image
          key={fotos[i]}
          src={fotos[i]}
          alt={`${titulo} — foto ${i + 1} de ${fotos.length}`}
          fill
          priority
          sizes="(min-width: 1024px) 62vw, 92vw"
          className="object-cover"
        />

        {fotos.length > 1 && (
          <>
            <button
              type="button" onClick={() => mover(-1)} aria-label="Foto anterior"
              className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button" onClick={() => mover(1)} aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="tabular absolute bottom-3 right-3 rounded-md bg-background/80 px-2 py-1 text-[11.5px] backdrop-blur-sm">
              {i + 1}/{fotos.length}
            </span>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <ul className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, n) => (
            <li key={f} className="shrink-0">
              <button
                type="button" onClick={() => setI(n)}
                aria-label={`Ver foto ${n + 1}`} aria-current={n === i}
                className={`relative block h-16 w-24 overflow-hidden rounded-md border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  n === i ? "border-primary" : "border-border opacity-65 hover:opacity-100"
                }`}
              >
                <Image src={f} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

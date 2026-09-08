"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Showroom, Vehicle } from "@/lib/types";

/**
 * Paso previo al editor: qué auto y sobre qué fondo.
 *
 * Se elige acá y no dentro del editor porque son las dos decisiones que definen
 * la pieza; verlas como imagen —la foto real del auto y el fondo— evita elegir
 * a ciegas desde una lista de texto. Los vehículos sin foto se muestran igual,
 * pero no se pueden elegir: sin foto no hay recorte que montar.
 */
export function ElegirPieza({
  vehiculos, fondos,
}: {
  vehiculos: Vehicle[];
  fondos: Showroom[];
}) {
  const router = useRouter();
  const conFoto = vehiculos.filter((v) => v.fotoPrincipal);
  const [vehiculo, setVehiculo] = useState<string | null>(conFoto[0]?.id ?? null);
  const [fondo, setFondo] = useState<string | null>(fondos[0]?.url ?? null);

  const listo = Boolean(vehiculo && fondo);

  function crear() {
    if (!vehiculo || !fondo) return;
    router.push(`/estudio/editor?vehiculo=${vehiculo}&fondo=${encodeURIComponent(fondo)}`);
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="etiqueta">1 · Vehículo</h2>
          <span className="text-[11.5px] text-muted-foreground">
            Se monta su foto principal
          </span>
        </div>

        {conFoto.length === 0 ? (
          <p className="border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
            Ningún vehículo tiene fotos cargadas. Sube una desde su ficha y vuelve.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {vehiculos.map((v) => {
              const elegible = Boolean(v.fotoPrincipal);
              return (
                <li key={v.id}>
                  <button
                    disabled={!elegible}
                    onClick={() => setVehiculo(v.id)}
                    className={cn(
                      "w-full border text-left transition-colors",
                      vehiculo === v.id ? "border-primary" : "border-border hover:bg-accent/30",
                      !elegible && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <div className="relative aspect-[4/3] bg-muted/30">
                      {v.fotoPrincipal ? (
                        <Image
                          src={v.fotoPrincipal} alt="" fill sizes="220px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageOff className="absolute inset-0 m-auto size-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="truncate text-[12.5px] font-medium">{v.titulo}</p>
                      <p className="tabular text-[11px] text-muted-foreground">{clp(v.precio)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="etiqueta">2 · Fondo</h2>
          <span className="text-[11.5px] text-muted-foreground">
            Se puede cambiar después
          </span>
        </div>
        {fondos.length === 0 ? (
          <p className="border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
            Todavía no hay fondos generados.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {fondos.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setFondo(f.url)}
                  className={cn(
                    "w-full border transition-colors",
                    fondo === f.url ? "border-primary" : "border-border hover:bg-accent/30",
                  )}
                >
                  <div className="relative aspect-[9/16] bg-muted/30">
                    <Image src={f.url!} alt={f.nombre} fill sizes="160px" className="object-cover" />
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11.5px]">{f.nombre}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-4 border-t border-border pt-5">
        <Button onClick={crear} disabled={!listo} className="h-9 gap-2">
          Crear pieza <ArrowRight className="size-3.5" />
        </Button>
        <p className="text-[12px] text-muted-foreground">
          El auto se recorta al abrir el editor. La primera vez tarda unos segundos.
        </p>
      </div>
    </div>
  );
}

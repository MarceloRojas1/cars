"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { consultarPatenteAction } from "@/app/(app)/vehiculos/acciones";
import type { ResultadoPatente } from "@/lib/patente";
import { Button } from "@/components/ui/button";
import { controlBase } from "@/components/form/campos";
import { cn } from "@/lib/utils";

export function BuscadorPatente({ patentesDePrueba }: { patentesDePrueba?: readonly string[] }) {
  const [patente, setPatente] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPatente | null>(null);

  async function buscar(forzar = false) {
    setBuscando(true);
    setResultado(null);
    try {
      setResultado(await consultarPatenteAction(patente, forzar));
    } finally {
      setBuscando(false);
    }
  }

  const datos = resultado?.ok ? resultado.datos : null;

  return (
    <>
      <div className="max-w-xl border border-border bg-card p-5">
        <p className="overline mb-3">Ingresa una patente</p>
        <div className="flex gap-2">
          <input
            value={patente}
            onChange={(e) => setPatente(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(false); }}
            placeholder="ABCD12"
            maxLength={8}
            className={cn(controlBase, "font-mono uppercase")}
          />
          <Button
            onClick={() => buscar(false)}
            disabled={buscando || patente.trim().length < 6}
            className="h-9 shrink-0 gap-2"
          >
            <Search className="size-4" /> {buscando ? "Consultando…" : "Consultar"}
          </Button>
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Los datos se guardan 24 h para no pagar dos veces la misma consulta.
        </p>

        {patentesDePrueba && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="overline mb-2">Patentes que responden sin clave</p>
            <div className="flex flex-wrap gap-1.5">
              {patentesDePrueba.map((p) => (
                <button
                  key={p} type="button"
                  onClick={() => { setPatente(p); setResultado(null); }}
                  className="tabular border border-border px-2 py-0.5 text-[11.5px] text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {resultado && !resultado.ok && (
        <p className="mt-4 max-w-xl border-l-2 border-l-crit bg-crit/[0.06] px-4 py-3 text-[13px] text-crit">
          {resultado.mensaje}
        </p>
      )}

      {datos && (
        <div className="mt-6 max-w-xl border border-border bg-card">
          <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
            <p className="tabular text-[15px]">
              {datos.patente}
              {datos.dv && <span className="text-muted-foreground">-{datos.dv}</span>}
            </p>
            {datos.desdeCache && (
              <button
                type="button" onClick={() => buscar(true)} disabled={buscando}
                className="overline underline underline-offset-4 hover:text-foreground"
              >
                desde caché · consultar de nuevo
              </button>
            )}
          </div>
          <dl className="divide-y divide-border">
            {[
              ["Marca", datos.marca],
              ["Modelo", datos.modelo],
              ["Versión", datos.version],
              ["Año", datos.anio?.toString()],
              ["Carrocería", datos.carroceria],
              ["N.º de motor", datos.motor],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-2.5 text-[13.5px]">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={v ? "" : "text-muted-foreground"}>{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-border px-5 py-3">
            <Link
              href="/vehiculos/nuevo"
              className="text-[13px] text-foreground underline underline-offset-4"
            >
              Crear una publicación con estos datos →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

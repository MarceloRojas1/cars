"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { controlBase } from "@/components/form/campos";
import { COMBUSTIBLES } from "@/lib/catalogos";
import { cn } from "@/lib/utils";
import type { AppUser, Branch } from "@/lib/types";

const ESTADOS = ["disponible", "reservado", "pendiente", "vendido"];

/**
 * Los filtros viven en la URL, no en estado local.
 *
 * Así el listado se puede compartir y volver atrás funciona; y como la página es
 * un componente de servidor, el filtrado ocurre en la base y no en el navegador.
 */
export function VehiculosFiltros({
  marcas, sucursales, vendedores,
}: {
  marcas: string[];
  sucursales: Branch[];
  vendedores: AppUser[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(
    () => ["anioDesde", "anioHasta", "precioDesde", "precioHasta", "branchId", "vendedorId", "incompletas"]
      .some((k) => params.get(k)),
  );
  const [texto, setTexto] = useState(params.get("q") ?? "");

  const valor = (k: string) => params.get(k) ?? "";

  function aplicar(cambios: Record<string, string>) {
    const siguiente = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) siguiente.set(k, v);
      else siguiente.delete(k);
    }
    siguiente.delete("pagina"); // cualquier filtro nuevo vuelve a la página 1
    iniciar(() => router.push(`/vehiculos?${siguiente.toString()}`, { scroll: false }));
  }

  const activos = [...params.keys()].filter((k) => !["vista", "pagina"].includes(k)).length;

  return (
    <div className={cn("mb-4", pendiente && "opacity-60 transition-opacity")}>
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); aplicar({ q: texto }); }}
          className="relative min-w-[240px] flex-1 sm:max-w-xs"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por código, título o patente…"
            className={cn(controlBase, "pl-8")}
          />
        </form>

        <select
          value={valor("marca")} onChange={(e) => aplicar({ marca: e.target.value })}
          className={cn(controlBase, "w-auto")} aria-label="Marca"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={valor("estado")} onChange={(e) => aplicar({ estado: e.target.value })}
          className={cn(controlBase, "w-auto capitalize")} aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e} className="capitalize">{e}</option>)}
        </select>

        <select
          value={valor("combustible")} onChange={(e) => aplicar({ combustible: e.target.value })}
          className={cn(controlBase, "w-auto")} aria-label="Combustible"
        >
          <option value="">Todos los combustibles</option>
          {COMBUSTIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <Button
          type="button" variant="outline" size="sm"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className={cn("h-9 gap-2", abierto && "border-foreground")}
        >
          <SlidersHorizontal className="size-3.5" /> Más filtros
        </Button>

        {activos > 0 && (
          <button
            type="button"
            onClick={() => { setTexto(""); iniciar(() => router.push("/vehiculos")); }}
            className="flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Limpiar ({activos})
          </button>
        )}
      </div>

      {abierto && (
        <div className="mt-3 grid gap-4 border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Rango
            etiqueta="Año" desde={valor("anioDesde")} hasta={valor("anioHasta")}
            onDesde={(v) => aplicar({ anioDesde: v })} onHasta={(v) => aplicar({ anioHasta: v })}
          />
          <Rango
            etiqueta="Precio" desde={valor("precioDesde")} hasta={valor("precioHasta")}
            onDesde={(v) => aplicar({ precioDesde: v })} onHasta={(v) => aplicar({ precioHasta: v })}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-sucursal" className="overline">Sucursal</label>
            <select
              id="f-sucursal" value={valor("branchId")}
              onChange={(e) => aplicar({ branchId: e.target.value })} className={controlBase}
            >
              <option value="">Todas</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-vendedor" className="overline">Vendedor</label>
            <select
              id="f-vendedor" value={valor("vendedorId")}
              onChange={(e) => aplicar({ vendedorId: e.target.value })} className={controlBase}
            >
              <option value="">Todos</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] sm:col-span-2">
            <input
              type="checkbox" checked={valor("incompletas") === "1"}
              onChange={(e) => aplicar({ incompletas: e.target.checked ? "1" : "" })}
              className="size-3.5 accent-current"
            />
            Solo publicaciones incompletas
          </label>
        </div>
      )}
    </div>
  );
}

function Rango({
  etiqueta, desde, hasta, onDesde, onHasta,
}: {
  etiqueta: string; desde: string; hasta: string;
  onDesde: (v: string) => void; onHasta: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="overline">{etiqueta}</p>
      <div className="flex items-center gap-2">
        <input
          defaultValue={desde} inputMode="numeric" placeholder="desde"
          onBlur={(e) => e.target.value !== desde && onDesde(e.target.value)}
          className={cn(controlBase, "tabular")} aria-label={`${etiqueta} desde`}
        />
        <span className="text-muted-foreground">–</span>
        <input
          defaultValue={hasta} inputMode="numeric" placeholder="hasta"
          onBlur={(e) => e.target.value !== hasta && onHasta(e.target.value)}
          className={cn(controlBase, "tabular")} aria-label={`${etiqueta} hasta`}
        />
      </div>
    </div>
  );
}

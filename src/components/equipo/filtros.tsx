"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/form/campos";
import type { Branch } from "@/lib/types";

/**
 * Filtros de la tabla de equipo.
 *
 * Escriben en la URL en vez de en estado local: el enlace se puede compartir,
 * el botón de atrás funciona y recargar no pierde el filtro.
 */
export function FiltrosEquipo({
  sucursales, sucursal, rol, mostrando, total,
}: {
  sucursales: Branch[];
  sucursal: string;
  rol: string;
  mostrando: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function cambiar(clave: string, valor: string) {
    const siguiente = new URLSearchParams(params.toString());
    if (valor) siguiente.set(clave, valor);
    else siguiente.delete(clave);
    router.push(siguiente.size ? `/equipo?${siguiente}` : "/equipo");
  }

  const filtrando = Boolean(sucursal || rol);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select
        aria-label="Filtrar por sucursal"
        value={sucursal}
        onChange={(e) => cambiar("sucursal", e.target.value)}
        className="h-9 w-auto min-w-[190px] text-[12.5px]"
      >
        <option value="">Todas las sucursales</option>
        {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </Select>

      <Select
        aria-label="Filtrar por rol"
        value={rol}
        onChange={(e) => cambiar("rol", e.target.value)}
        className="h-9 w-auto min-w-[160px] text-[12.5px]"
      >
        <option value="">Todos los roles</option>
        <option value="owner">Dueño</option>
        <option value="admin">Administrador</option>
        <option value="vendedor">Vendedor</option>
      </Select>

      {filtrando && (
        <>
          <span className="text-[12px] text-muted-foreground">
            <span className="tabular">{mostrando}</span> de <span className="tabular">{total}</span>
          </span>
          <button
            onClick={() => router.push("/equipo")}
            className="text-[12.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Limpiar
          </button>
        </>
      )}
    </div>
  );
}

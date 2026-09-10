"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { controlBase } from "@/components/form/campos";

/**
 * Campo que se escribe libremente y además sugiere.
 *
 * Reemplaza a `<input list>` + `<datalist>`. El desplegable de un datalist lo
 * dibuja el navegador y NO se puede estilar: salía blanco con letras casi
 * blancas sobre el tema oscuro, y no había CSS que lo arreglara. Acá la lista
 * es nuestra, así que hereda los colores de la aplicación.
 *
 * Sigue siendo un campo de texto, no una lista cerrada: la marca o el color que
 * no esté en las sugerencias se escribe igual. Por eso no es un `<select>`.
 */
export function Combo({
  id, name, value, onChange, opciones, placeholder, disabled, autoComplete = "off",
}: {
  id?: string;
  name: string;
  value: string;
  onChange: (valor: string) => void;
  opciones: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [resaltada, setResaltada] = useState(-1);
  const caja = useRef<HTMLDivElement>(null);
  const listaId = useId();

  const sugerencias = useMemo(() => {
    const q = value.trim().toLowerCase();
    const coinciden = q
      ? opciones.filter((o) => o.toLowerCase().includes(q))
      : opciones;
    // Un tope: con 300 comunas, una lista sin fin no ayuda a elegir.
    return coinciden.slice(0, 8);
  }, [opciones, value]);

  // Cerrar al tocar fuera. Sin esto la lista queda flotando sobre el formulario.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  function elegir(opcion: string) {
    onChange(opcion);
    setAbierto(false);
    setResaltada(-1);
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setAbierto(false); return; }
    if (!abierto && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setAbierto(true);
      return;
    }
    if (!abierto || sugerencias.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltada((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltada((i) => (i <= 0 ? sugerencias.length : i) - 1);
    } else if (e.key === "Enter" && resaltada >= 0) {
      // Solo intercepta Enter si hay algo resaltado: si no, el formulario se envía.
      e.preventDefault();
      elegir(sugerencias[resaltada]);
    }
  }

  const desplegado = abierto && sugerencias.length > 0 && !disabled;

  return (
    <div ref={caja} className="relative">
      <input
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        role="combobox"
        aria-expanded={desplegado}
        aria-controls={listaId}
        aria-autocomplete="list"
        className={controlBase}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setResaltada(-1); }}
        onFocus={() => setAbierto(true)}
        onKeyDown={teclado}
      />

      {desplegado && (
        <ul
          id={listaId}
          role="listbox"
          /*
           * Debajo del campo, y encima de todo lo demás. `max-h` con scroll
           * propio para que ocho sugerencias no empujen el formulario.
           */
          className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 max-h-64 overflow-y-auto rounded-[var(--radius)] border border-border bg-popover py-1 shadow-lg"
        >
          {sugerencias.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={i === resaltada}
                // `pointerdown` y no `click`: el clic llega después de que el
                // campo pierde el foco, y para entonces la lista ya se cerró.
                onPointerDown={(e) => { e.preventDefault(); elegir(o); }}
                onMouseEnter={() => setResaltada(i)}
                className={cn(
                  "block w-full px-3 py-1.5 text-left text-[13px] text-popover-foreground",
                  i === resaltada && "bg-accent",
                )}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

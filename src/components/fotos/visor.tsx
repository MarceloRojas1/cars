"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Ver una foto en grande, sin salir de donde estás.
 *
 * En una grilla de miniaturas de 130px no se distingue una foto bien tomada de
 * una movida, y eso es justamente lo que hay que decidir al ordenar el
 * catálogo. Acá se ve entera —`object-contain`, no recortada— porque el punto
 * es juzgar la foto, no ver cómo quedaría encuadrada.
 *
 * No usa el Dialog del proyecto a propósito: ese centra una caja con ancho
 * máximo y padding, y acá se quiere la pantalla completa en negro.
 */
export function VisorFotos({
  fotos, indice, onCerrar, onCambiar,
}: {
  fotos: { url: string; nombre?: string }[];
  /** Cuál se está viendo. `null` = cerrado. */
  indice: number | null;
  onCerrar: () => void;
  onCambiar: (i: number) => void;
}) {
  const abierto = indice !== null;
  const total = fotos.length;
  const cerrarRef = useRef<HTMLButtonElement>(null);

  /*
   * El foco entra al visor y vuelve de donde salió.
   *
   * Sin esto queda en el elemento que abrió el visor, detrás del modal: además
   * de ser incorrecto para un diálogo, hace que las teclas lleguen a los dos
   * sitios. Pasó de verdad — las flechas navegaban el visor y a la vez
   * reordenaban la foto en la grilla de atrás.
   */
  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();
    return () => previo?.focus?.();
  }, [abierto]);

  const mover = useCallback(
    (paso: number) => {
      if (indice === null || total === 0) return;
      // Da la vuelta: desde la última, siguiente vuelve a la primera.
      onCambiar((indice + paso + total) % total);
    },
    [indice, total, onCambiar],
  );

  /*
   * El teclado es la mitad de esto: quien revisa treinta fotos las pasa con las
   * flechas, no persiguiendo un botón con el mouse.
   */
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", alPulsar);
    // Sin esto, la página de atrás sigue desplazándose bajo el visor.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflow;
    };
  }, [abierto, mover, onCerrar]);

  if (!abierto) return null;
  const foto = fotos[indice];
  if (!foto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={foto.nombre ? `Foto: ${foto.nombre}` : "Foto ampliada"}
      // Clic en el fondo cierra; clic en la imagen no, para poder mirarla.
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white/70">
        <span className="tabular text-[12px]">
          {indice + 1} / {total}
        </span>
        <button
          ref={cerrarRef}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="grid size-8 place-items-center rounded-full hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
        <Image
          key={foto.url}
          src={foto.url}
          alt={foto.nombre ?? ""}
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/80 transition-colors hover:bg-black/70 hover:text-white"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/80 transition-colors hover:bg-black/70 hover:text-white"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {foto.nombre && (
        <p className="truncate px-4 py-3 text-center text-[12px] text-white/60">
          {foto.nombre}
        </p>
      )}
    </div>
  );
}

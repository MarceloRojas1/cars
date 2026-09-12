"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Diapositiva } from "@/lib/data/catalogo";

const SEGUNDOS = 6;

/**
 * ¿El sistema pide menos movimiento?
 *
 * El nombre empieza en inglés contra la convención del proyecto porque React lo
 * exige: un hook tiene que llamarse `useAlgo` para que sus reglas lo reconozcan.
 *
 * Con `useSyncExternalStore` en vez de un efecto que fija estado: así el valor
 * es correcto ya en el primer render —no hay un parpadeo donde el carrusel
 * arranca y se detiene— y además reacciona si la persona cambia la preferencia
 * sin recargar. En el servidor devuelve false, que es el caso común.
 */
function useMenosMovimiento() {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", avisar);
      return () => mq.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** La grilla de 3x3 donde puede ir el texto de cada diapositiva. */
const POSICIONES: Record<string, string> = {
  "top-left": "items-start justify-start text-left",
  "top-center": "items-start justify-center text-center",
  "top-right": "items-start justify-end text-right",
  "center-left": "items-center justify-start text-left",
  "center-center": "items-center justify-center text-center",
  "center-right": "items-center justify-end text-right",
  "bottom-left": "items-end justify-start text-left",
  "bottom-center": "items-end justify-center text-center",
  "bottom-right": "items-end justify-end text-right",
};

/**
 * La portada con diapositivas.
 *
 * Cambia con fundido y no con desplazamiento: un corte duro entre dos fotos de
 * autos se lee como un parpadeo, y el desplazamiento obliga a cargar las dos a
 * la vez. Se detiene al pasar el puntero —nadie quiere leer algo que se va— y
 * respeta `prefers-reduced-motion`: a quien pidió menos movimiento se le muestra
 * la primera y nada se mueve.
 */
export function PortadaSlider({
  diapositivas, color, alto = "min-h-[420px] lg:min-h-[520px]",
}: {
  diapositivas: Diapositiva[];
  color: string;
  alto?: string;
}) {
  const [activa, setActiva] = useState(0);
  const [detenido, setDetenido] = useState(false);
  const menosMovimiento = useMenosMovimiento();

  useEffect(() => {
    if (menosMovimiento || detenido || diapositivas.length < 2) return;
    const t = setInterval(
      () => setActiva((i) => (i + 1) % diapositivas.length),
      SEGUNDOS * 1000,
    );
    return () => clearInterval(t);
  }, [diapositivas.length, detenido, menosMovimiento]);

  if (diapositivas.length === 0) return null;

  return (
    <section
      className={cn("relative overflow-hidden", alto)}
      style={{ backgroundColor: color }}
      onPointerEnter={() => setDetenido(true)}
      onPointerLeave={() => setDetenido(false)}
      aria-roledescription="carrusel"
    >
      {diapositivas.map((d, i) => (
        <div
          key={d.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            i === activa ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={i !== activa}
        >
          {d.tipo === "video" ? (
            // Silenciado y en bucle: un video con sonido en una portada es
            // motivo suficiente para cerrar la pestaña.
            <video
              src={d.mediaUrl}
              autoPlay={!menosMovimiento}
              muted
              loop
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <Image
              src={d.mediaUrl}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
        </div>
      ))}

      {/* El texto de la diapositiva activa, donde la automotora lo puso. */}
      <div
        className={cn(
          // pt mayor que py: la barra de navegación es fija y se superpone.
          "relative mx-auto flex h-full min-h-[inherit] max-w-[1200px] flex-col px-5 pb-14 pt-28 lg:px-8 lg:pb-20 lg:pt-32",
          POSICIONES[diapositivas[activa].posicion] ?? POSICIONES["bottom-left"],
        )}
      >
        <div className="max-w-xl">
          {diapositivas[activa].textoSuperior && (
            <p className="etiqueta mb-2 text-white/80">
              {diapositivas[activa].textoSuperior}
            </p>
          )}
          {diapositivas[activa].titulo && (
            <h1 className="display text-[34px] leading-tight text-white lg:text-[48px]">
              {diapositivas[activa].titulo}
            </h1>
          )}
          {diapositivas[activa].subtitulo && (
            <p className="mt-2.5 text-[15px] leading-relaxed text-white/85">
              {diapositivas[activa].subtitulo}
            </p>
          )}
          {diapositivas[activa].btnTexto && diapositivas[activa].btnLink && (
            <a
              href={diapositivas[activa].btnLink}
              className="mt-5 inline-flex h-10 items-center rounded-[var(--radius)] px-5 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
            >
              {diapositivas[activa].btnTexto}
            </a>
          )}
        </div>
      </div>

      {diapositivas.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {diapositivas.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              aria-current={i === activa}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activa ? "w-7 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

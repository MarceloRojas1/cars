import Image from "next/image";
import { numero } from "@/lib/format";
import type { Automotora, MarcaPublica } from "@/lib/data/catalogo";

/**
 * La portada del catálogo: lo primero que ve un comprador.
 *
 * Lleva la identidad de la AUTOMOTORA, no la de Velie. Es su sitio: su logo, su
 * color, su nombre. Lo nuestro queda en una línea del pie.
 *
 * El color se usa como fondo sólido y se oscurece hacia abajo para que el texto
 * blanco tenga contraste con cualquier color que elija la automotora — incluido
 * un amarillo, donde el blanco puro sería ilegible.
 */
export function Portada({
  automotora, marca, cuantos,
}: {
  automotora: Automotora;
  marca: MarcaPublica;
  cuantos: number;
}) {
  return (
    <header
      className="relative overflow-hidden"
      style={{ backgroundColor: marca.color }}
    >
      {marca.portadaUrl && (
        <Image
          src={marca.portadaUrl}
          alt=""
          fill
          priority
          className="object-cover opacity-35"
        />
      )}

      {/* Velo oscuro: garantiza el contraste del texto sobre cualquier color. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />

      <div className="relative mx-auto max-w-[1200px] px-5 pb-14 pt-24 lg:px-8 lg:pb-20 lg:pt-28">
        {marca.logoUrl && (
          <Image
            src={marca.logoUrl}
            alt={automotora.nombre}
            width={64}
            height={64}
            className="mb-5 size-16 rounded-xl bg-white/95 object-contain p-2"
          />
        )}

        <h1 className="display text-[34px] leading-tight text-white lg:text-[46px]">
          {marca.heroTitulo ?? automotora.nombre}
        </h1>

        {(marca.heroSubtitulo ?? automotora.descripcion) && (
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/85">
            {marca.heroSubtitulo ?? automotora.descripcion}
          </p>
        )}

        <p className="mt-6 inline-flex items-center rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] text-white backdrop-blur-sm">
          <span className="tabular font-medium">{numero(cuantos)}</span>
          <span className="ml-1.5">
            {cuantos === 1 ? "vehículo disponible" : "vehículos disponibles"}
          </span>
        </p>
      </div>
    </header>
  );
}

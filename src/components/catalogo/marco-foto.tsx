import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Una foto, o el hueco donde va.
 *
 * Cuando la automotora todavía no subió la imagen se dibuja un recuadro punteado
 * con la medida recomendada, en vez de dejar el espacio en blanco o —peor—
 * colapsar la sección. Así quien arma el sitio ve dónde encaja cada foto y de
 * qué proporción tiene que ser, sin tener que adivinar mirando el resultado.
 */
export function MarcoFoto({
  src, alt = "", proporcion = "aspect-[4/3]", nota, className, prioridad,
}: {
  src?: string;
  alt?: string;
  proporcion?: string;
  /** Qué foto va acá, para quien esté completando el sitio. */
  nota?: string;
  className?: string;
  prioridad?: boolean;
}) {
  if (src) {
    return (
      <span className={cn("relative block overflow-hidden bg-muted", proporcion, className)}>
        <Image src={src} alt={alt} fill priority={prioridad} sizes="(min-width: 1024px) 33vw, 92vw"
               className="object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid place-items-center border border-dashed border-border bg-muted/40 text-center",
        proporcion, className,
      )}
    >
      <span className="px-4 text-muted-foreground">
        <ImagePlus className="mx-auto mb-2 size-6" strokeWidth={1.25} />
        <span className="block text-[12px] leading-snug">{nota ?? "Falta la foto"}</span>
      </span>
    </span>
  );
}

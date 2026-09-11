import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * El logo de Velie, según `pdf/Velie-Guia-de-Marca.pdf`.
 *
 * Isotipo y wordmark UNO AL LADO DEL OTRO, no apilados, que es como está
 * definido. El wordmark va en Sora ExtraBold con tracking −0.01em; esos valores
 * son de la guía, no elegidos acá.
 *
 * Las proporciones salen de medir el lockup dentro del PDF: el isotipo mide
 * 43,5 de alto, el wordmark 39 de cuerpo (0,9 del alto del ícono) y entre los
 * dos hay 19,7 de aire (0,45). Pasarlas a proporciones deja que el logo se use
 * a cualquier tamaño sin volver a medir.
 *
 * La guía fija un mínimo de 24px de alto para el ícono solo.
 */
export function Logotipo({
  alto = 40,
  soloIcono = false,
  className,
}: {
  /** Alto del isotipo en píxeles. El resto se deriva de él. */
  alto?: number;
  soloIcono?: boolean;
  className?: string;
}) {
  const ancho = Math.round(alto * (46.27 / 43.51)); // proporción del archivo

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/marca/velie-isotipo-color.svg"
        alt={soloIcono ? "Velie" : ""}
        aria-hidden={soloIcono ? undefined : true}
        width={ancho}
        height={alto}
        priority
        style={{ height: alto, width: "auto" }}
      />
      {!soloIcono && (
        <span
          className="font-marca text-foreground"
          style={{
            marginLeft: alto * 0.45,
            fontSize: alto * 0.9,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          Velie
        </span>
      )}
    </span>
  );
}

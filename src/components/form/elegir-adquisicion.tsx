import Link from "next/link";
import { ArrowRight, Handshake, Repeat, Wallet } from "lucide-react";
import { ADQUISICIONES, ADQUISICION_LABEL, type TipoAdquisicion } from "@/lib/types";

/**
 * Primer paso de un vehículo nuevo: cómo llegó.
 *
 * Va ANTES del formulario y no dentro, porque no es un campo más: decide qué
 * se va a preguntar después. Un auto comprado pide precio de compra; uno
 * consignado pide el rango en que se puede publicar, la comisión y lo que se le
 * promete al dueño. Meterlo como un desplegable en medio de la ficha dejaba
 * esos campos apareciendo y desapareciendo a mitad de la carga.
 *
 * Es un enlace y no un estado: la elección viaja en la URL (`?tipo=`), así que
 * el botón de atrás del navegador funciona y el enlace se puede compartir.
 */

const DESCRIPCION: Record<TipoAdquisicion, { texto: string; pide: string; Icono: typeof Wallet }> = {
  compra: {
    texto: "Se lo compraste a alguien. El auto es tuyo.",
    pide: "Precio de compra y comisión",
    Icono: Wallet,
  },
  consignacion: {
    texto: "Es de un tercero y lo vendes por él. Ganas una comisión.",
    pide: "Rango de publicación, comisión y libre a pago",
    Icono: Handshake,
  },
  parte_pago: {
    texto: "Lo recibiste de un cliente al venderle otro auto.",
    pide: "Cuánto se le reconoció",
    Icono: Repeat,
  },
};

export function ElegirAdquisicion({ patente }: { patente?: string }) {
  // La patente ya consultada no se pierde al elegir el tipo.
  const extra = patente ? `&patente=${encodeURIComponent(patente)}` : "";

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted-foreground">
        Es lo que decide de quién es la plata, y cambia lo que hay que registrar.
        Solo lo ves tú: no sale al catálogo público ni lo ve el asistente.
      </p>

      <ul className="flex flex-col gap-2">
        {ADQUISICIONES.map((tipo) => {
          const { texto, pide, Icono } = DESCRIPCION[tipo];
          return (
            <li key={tipo}>
              <Link
                href={`/vehiculos/nuevo?tipo=${tipo}${extra}`}
                className="group flex items-center gap-4 border border-border px-4 py-4 transition-colors hover:border-foreground hover:bg-accent/30"
              >
                <Icono className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <div className="flex-1">
                  <p className="text-[14px] font-medium">{ADQUISICION_LABEL[tipo]}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">{texto}</p>
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground/70">
                    Se te va a pedir: {pide}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>

      {/*
        La salida para quien solo quiere cargar el auto y resolver el papeleo
        después. Sin esto, un dato que todavía no se sabe bloquea toda la carga.
      */}
      <Link
        href={`/vehiculos/nuevo?tipo=sin-definir${extra.replace("&", "&")}`}
        className="mt-4 inline-block text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        Todavía no lo sé — cargar el auto igual
      </Link>
    </div>
  );
}

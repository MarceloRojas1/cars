"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * El enlace de acceso, mostrado UNA vez.
 *
 * Del token solo se guarda su hash, así que esto no se puede volver a ver: si
 * se pierde, hay que generar otro. Por eso el diálogo lo dice y por eso copiar
 * es la acción principal.
 */
export function DialogoEnlace({
  url, dias, nombre, alCerrar,
}: {
  url: string;
  /** Ya calculado en el servidor: leer el reloj en render no es puro. */
  dias: number;
  nombre: string;
  alCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Sin permiso de portapapeles el enlace igual está a la vista. */
    }
  }

  // El texto que se manda, ya redactado: es lo que el admin iba a escribir igual.
  const mensaje = `Hola ${nombre}, te sumé al equipo en Velie. Activa tu cuenta acá: ${url}`;

  return (
    <Dialog open onOpenChange={(v) => !v && alCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-[19px]">
            Mándale este enlace a {nombre}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Con él elige su propia contraseña y entra. Sirve una sola vez y vence en{" "}
            {dias} {dias === 1 ? "día" : "días"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="break-all border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12px] leading-relaxed">
            {url}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copiar}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-primary px-3.5 text-[13px] font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiado ? "Copiado" : "Copiar enlace"}
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-border px-3.5 text-[13px] hover:bg-accent/50"
            >
              <MessageCircle className="size-3.5" />
              Enviar por WhatsApp
            </a>

            <button
              type="button"
              onClick={alCerrar}
              className="ml-auto text-[13px] text-muted-foreground hover:text-foreground"
            >
              Listo
            </button>
          </div>

          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            No se vuelve a mostrar. Si se pierde, genera otro desde el menú de la fila.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

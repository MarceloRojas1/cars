"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copiar el código cierra el círculo con el bot: la persona copia `COD922149`,
 * abre WhatsApp y lo pega. `identificarVehiculo()` lo reconoce en el primer
 * mensaje y el bot responde con el precio de ESE auto.
 */
export function CopiarCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(codigo);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        } catch {
          /* Sin permiso de portapapeles el código igual está a la vista. */
        }
      }}
      className="tabular inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11.5px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={`Copiar el código ${codigo}`}
    >
      {codigo}
      {copiado ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
    </button>
  );
}

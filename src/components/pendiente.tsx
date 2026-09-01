import { Construction } from "lucide-react";

/**
 * Estado honesto para las rutas que existen en la navegación pero todavía no
 * están construidas. Dice qué falta y de qué fase depende.
 */
export function Pendiente({ que, fase, detalle }: { que: string; fase: string; detalle?: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-card/40 px-6 py-14 text-center">
      <Construction className="mx-auto size-6 text-muted-foreground" strokeWidth={1.5} />
      <p className="mt-3 text-[15px] font-medium">{que}</p>
      {detalle && (
        <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
          {detalle}
        </p>
      )}
      <p className="mt-3 inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
        {fase}
      </p>
    </div>
  );
}

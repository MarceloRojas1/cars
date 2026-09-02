/**
 * Estado honesto para las rutas que existen en la navegación pero todavía no
 * están construidas. Dice qué falta y de qué fase depende.
 */
export function Pendiente({ que, fase, detalle }: { que: string; fase: string; detalle?: string }) {
  return (
    <div className="border border-dashed border-border px-8 py-16 text-center">
      <p className="display text-[19px]">{que}</p>
      {detalle && (
        <p className="mx-auto mt-2.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {detalle}
        </p>
      )}
      <p className="overline mt-5">{fase}</p>
    </div>
  );
}

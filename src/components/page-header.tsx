import type { ReactNode } from "react";

export function PageHeader({
  titulo, descripcion, accion, meta,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="display text-[32px] leading-[1.1]">{titulo}</h1>
        {descripcion && (
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">{descripcion}</p>
        )}
        {meta && <div className="mt-2.5 text-[12.5px] text-muted-foreground">{meta}</div>}
      </div>
      {accion}
    </div>
  );
}

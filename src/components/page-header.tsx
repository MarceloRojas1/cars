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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-[14px] text-muted-foreground">{descripcion}</p>}
        {meta && <div className="mt-2 text-[13px] text-muted-foreground">{meta}</div>}
      </div>
      {accion}
    </div>
  );
}

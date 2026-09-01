import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  etiqueta, valor, nota, delta, icon: Icon,
}: {
  etiqueta: string;
  valor: string | number;
  nota?: string;
  delta?: { valor: number; sufijo?: string };
  icon?: LucideIcon;
}) {
  const sube = (delta?.valor ?? 0) > 0;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {etiqueta}
        </p>
        {Icon && <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      </div>
      <p className="tabular mt-2 text-[27px] font-bold leading-none tracking-tight">{valor}</p>
      {delta && (
        <p className={cn("mt-2 flex items-center gap-1 text-[12px]", sube ? "text-ok" : "text-crit")}>
          {sube ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
          {Math.abs(delta.valor)}% {delta.sufijo ?? "vs mes anterior"}
        </p>
      )}
      {!delta && nota && <p className="mt-2 text-[12px] text-muted-foreground">{nota}</p>}
    </div>
  );
}

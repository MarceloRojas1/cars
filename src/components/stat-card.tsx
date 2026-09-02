import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sin caja: los indicadores se separan por filetes verticales, no por tarjetas.
 * La cifra va en serif — es lo único que debe leerse a distancia.
 */
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
    <div className="border-l border-border px-5 py-1 first:border-l-0 first:pl-0">
      <div className="flex items-center gap-2">
        <p className="overline">{etiqueta}</p>
        {Icon && <Icon className="size-3.5 opacity-30" strokeWidth={1.5} />}
      </div>
      <p className="display mt-2.5 text-[34px] leading-none">{valor}</p>
      {delta ? (
        <p className={cn("mt-2.5 text-[12px]", sube ? "text-ok" : "text-crit")}>
          {sube ? "↑" : "↓"} {Math.abs(delta.valor)}%{" "}
          <span className="text-muted-foreground">{delta.sufijo ?? "vs mes anterior"}</span>
        </p>
      ) : (
        nota && <p className="mt-2.5 text-[12px] text-muted-foreground">{nota}</p>
      )}
    </div>
  );
}

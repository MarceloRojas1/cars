import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { numero } from "@/lib/format";

/**
 * Con muchas páginas no se listan todas: primera, última, la actual y sus
 * vecinas, con elipsis en los saltos.
 */
function ventana(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas = new Set([1, total, actual, actual - 1, actual + 1]);
  const lista = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const salida: (number | "…")[] = [];
  lista.forEach((p, i) => {
    if (i > 0 && p - (lista[i - 1] as number) > 1) salida.push("…");
    salida.push(p);
  });
  return salida;
}

export function Paginacion({
  pagina, total, porPagina, base, params,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  base: string;
  params: Record<string, string | undefined>;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    else q.delete("pagina");
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const enlace = "grid h-8 min-w-8 place-items-center border px-2 text-[12.5px] transition-colors";
  const inactivo = "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12.5px] text-muted-foreground">
        <span className="tabular">{numero(desde)}–{numero(hasta)}</span> de{" "}
        <span className="tabular text-foreground">{numero(total)}</span>
      </p>

      {paginas > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginación">
          {pagina > 1 ? (
            <Link href={href(pagina - 1)} className={cn(enlace, inactivo)} aria-label="Anterior">
              <ChevronLeft className="size-3.5" />
            </Link>
          ) : (
            <span className={cn(enlace, "border-border text-muted-foreground/30")}>
              <ChevronLeft className="size-3.5" />
            </span>
          )}

          {ventana(pagina, paginas).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-[12.5px] text-muted-foreground">…</span>
            ) : (
              <Link
                key={p} href={href(p)}
                aria-current={p === pagina ? "page" : undefined}
                className={cn(
                  enlace, "tabular",
                  p === pagina ? "border-foreground bg-foreground text-background" : inactivo,
                )}
              >
                {p}
              </Link>
            ),
          )}

          {pagina < paginas ? (
            <Link href={href(pagina + 1)} className={cn(enlace, inactivo)} aria-label="Siguiente">
              <ChevronRight className="size-3.5" />
            </Link>
          ) : (
            <span className={cn(enlace, "border-border text-muted-foreground/30")}>
              <ChevronRight className="size-3.5" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

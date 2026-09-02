import { Sparkles, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getStages } from "@/lib/data";

export const metadata = { title: "Automatización" };

const KIND_LABEL: Record<string, string> = {
  entry: "entry", progress: "progress", exit_won: "exit_won", exit_lost: "exit_lost",
};

export default async function AutomatizacionPage() {
  const stages = await getStages();

  return (
    <>
      <PageHeader
        titulo="Automatización del Embudo"
        descripcion="Configura qué hace el sistema en cada etapa. Las etapas se crean y ordenan desde el Embudo."
      />

      <ul className="space-y-2">
        {stages.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 border border-border bg-card px-5 py-3.5"
            style={{ borderLeft: `3px solid ${s.color}` }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="display text-[16px]">{s.nombre}</h2>
                <span className="rounded border px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
                  {KIND_LABEL[s.kind]}
                </span>
              </div>
              {s.agenteIaActivo ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-chart-3/40 bg-chart-3/12 px-2 py-0.5 text-[11px] text-chart-3">
                    <Sparkles className="size-3" /> Agente IA
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">Inactivo</span>
                </div>
              ) : (
                <p className="mt-1 text-[12px] text-muted-foreground">Sin configuración</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Configurar ${s.nombre}`}>
              <SlidersHorizontal className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

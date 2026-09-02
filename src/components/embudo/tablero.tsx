"use client";

import { useOptimistic, useState, useTransition } from "react";
import { MessageSquare, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { moverLeadAction } from "@/app/(app)/embudo/acciones";
import { cn } from "@/lib/utils";
import { PanelLead } from "@/components/embudo/panel-lead";
import type { AppUser, Lead, Stage, Vehicle } from "@/lib/types";

const KIND_LABEL: Record<string, string> = { entry: "Auto", exit_won: "Final", exit_lost: "Final" };

export function Tablero({
  leads: inicial, stages, vehiculos, usuarios,
}: {
  leads: Lead[];
  stages: Stage[];
  vehiculos: Pick<Vehicle, "id" | "titulo" | "codigo">[];
  usuarios: AppUser[];
}) {
  const [pendiente, iniciar] = useTransition();
  // El movimiento se pinta al instante y se corrige solo si el servidor falla.
  const [leads, moverOptimista] = useOptimistic(
    inicial,
    (estado: Lead[], { leadId, stageId }: { leadId: string; stageId: string }) =>
      estado.map((l) => (l.id === leadId ? { ...l, stageId, diasEnEtapa: 0 } : l)),
  );
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const vehiculo = (id?: string) => vehiculos.find((v) => v.id === id);
  const vendedor = (id?: string) => usuarios.find((u) => u.id === id);

  function soltar(stageId: string) {
    const leadId = arrastrando;
    setArrastrando(null);
    setEncima(null);
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stageId === stageId) return;

    iniciar(async () => {
      moverOptimista({ leadId, stageId });
      const r = await moverLeadAction(leadId, stageId);
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo mover el lead.");
        return;
      }
      const destino = stages.find((s) => s.id === stageId)!;
      if (r.traspasado) {
        const v = usuarios.find((u) => u.id === r.vendedorAsignado);
        toast.success(`Traspasado a ${v?.nombre ?? "un vendedor"}`, {
          description: "El bot entregó el lead y ahora lo atiende una persona.",
        });
      } else if (r.vehiculoGanado) {
        toast.success(`Ganado · ${r.vehiculoGanado.titulo} quedó vendido`, {
          description: "Registra la venta en Control de Ventas cuando corresponda.",
        });
      } else {
        toast.success(`Movido a ${destino.nombre}`);
      }
    });
  }

  return (
    <div className={cn("flex flex-1 gap-3 overflow-x-auto pb-3", pendiente && "opacity-90")}>
      {stages.map((stage) => {
        const enEtapa = leads.filter((l) => l.stageId === stage.id);
        const activa = encima === stage.id;
        return (
          <section
            key={stage.id}
            onDragOver={(e) => { e.preventDefault(); setEncima(stage.id); }}
            onDragLeave={() => setEncima((s) => (s === stage.id ? null : s))}
            onDrop={() => soltar(stage.id)}
            className={cn(
              "flex w-[268px] shrink-0 flex-col border bg-card transition-colors",
              activa ? "border-foreground bg-accent/40" : "border-border",
            )}
            aria-label={`Etapa ${stage.nombre}`}
          >
            <header
              className="flex items-center gap-2 border-b border-border px-3 py-2.5"
              style={{ borderTop: `2px solid ${stage.color}` }}
            >
              {stage.responsable === "ia" && (
                <Sparkles className="size-3.5 shrink-0 text-chart-3" aria-label="La atiende el bot" />
              )}
              <h2 className="truncate text-[13.5px] font-semibold">{stage.nombre}</h2>
              {KIND_LABEL[stage.kind] && (
                <span className="shrink-0 border border-border px-1.5 py-px text-[10px] text-muted-foreground">
                  {KIND_LABEL[stage.kind]}
                </span>
              )}
              <span className="tabular ml-auto bg-muted px-1.5 text-[11px] text-muted-foreground">
                {enEtapa.length}
              </span>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {enEtapa.length === 0 && (
                <p className="border border-dashed border-border py-8 text-center text-[12px] text-muted-foreground">
                  {activa ? "Soltar aquí" : "Sin leads"}
                </p>
              )}
              {enEtapa.map((lead) => {
                const v = vehiculo(lead.vehicleId);
                const u = vendedor(lead.vendedorId);
                return (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={() => setArrastrando(lead.id)}
                    onDragEnd={() => { setArrastrando(null); setEncima(null); }}
                    onClick={() => { if (!arrastrando) setAbierto(lead.id); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAbierto(lead.id); }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "cursor-grab border border-border bg-background p-2.5 outline-none",
                      "transition-colors hover:border-muted-foreground active:cursor-grabbing",
                      "focus-visible:border-foreground",
                      arrastrando === lead.id && "opacity-40",
                    )}
                    style={lead.temperatura === "hot" ? { borderLeft: "2px solid var(--hot)" } : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      {lead.temperatura === "hot" && (
                        <span className="size-[5px] shrink-0 rounded-full bg-hot" aria-label="Caliente" />
                      )}
                      <p className="truncate text-[12.5px] font-medium">{lead.nombre || "Sin nombre"}</p>
                    </div>
                    <p className="tabular mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {lead.telefono}
                    </p>
                    {v && <p className="mt-1.5 truncate text-[11.5px] text-muted-foreground">{v.titulo}</p>}

                    <div className="mt-2 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                      {lead.perdido && <span className="text-crit">Perdido</span>}
                      {lead.mensajes > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="size-2.5" /> {lead.mensajes}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 truncate">
                        {u ? (
                          u.nombre.split(" ")[0]
                        ) : stage.responsable === "ia" ? (
                          <span className="text-chart-3">bot</span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-warn">
                            <User className="size-2.5" /> sin asignar
                          </span>
                        )}
                        {lead.diasEnEtapa > 0 && ` · ${lead.diasEnEtapa}d`}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {abierto && (
        <PanelLead
          key={abierto}
          leadId={abierto}
          leads={leads}
          stages={stages}
          vehiculos={vehiculos}
          usuarios={usuarios}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </div>
  );
}

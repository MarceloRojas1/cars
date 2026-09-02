import { Flame, MessageSquare, Plus, Search, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agruparPorEtapa, getLeads, getStages, getUsers, getVehicles, vehiculoDe } from "@/lib/data";

export const metadata = { title: "Embudo" };

const KIND_LABEL: Record<string, string> = {
  entry: "Auto", exit_won: "Final", exit_lost: "Final",
};

export default async function EmbudoPage() {
  const [leads, stages, vehicles, users] = await Promise.all([
    getLeads(), getStages(), getVehicles(), getUsers(),
  ]);
  const columnas = agruparPorEtapa(leads, stages);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs defaultValue="todos">
          <TabsList>
            <TabsTrigger value="mis">Mis leads</TabsTrigger>
            <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
            <TabsTrigger value="todos">Todos ({leads.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar lead…" className="h-9 pl-8" />
        </div>
        <Button variant="outline" size="sm" className="ml-auto h-9 gap-2">
          <Pencil className="size-3.5" /> Editar embudo
        </Button>
        <Button size="sm" className="h-9 gap-2"><Plus className="size-3.5" /> Añadir lead</Button>
      </div>

      <div className="flex flex-1 gap-3 overflow-x-auto pb-3">
        {columnas.map(({ stage, leads: leadsEtapa }) => (
          <section
            key={stage.id}
            className="flex w-[268px] shrink-0 flex-col border border-border bg-card"
            aria-label={`Etapa ${stage.nombre}`}
          >
            <header
              className="flex items-center gap-2 rounded-t-lg border-b px-3 py-2.5"
              style={{ borderTop: `2px solid ${stage.color}` }}
            >
              {stage.agenteIaActivo && <Sparkles className="size-3.5 text-primary" />}
              <h2 className="truncate text-[13.5px] font-semibold">{stage.nombre}</h2>
              {KIND_LABEL[stage.kind] && (
                <span className="rounded border px-1.5 py-px text-[10px] text-muted-foreground">
                  {KIND_LABEL[stage.kind]}
                </span>
              )}
              <span className="tabular ml-auto rounded bg-muted px-1.5 text-[11px] text-muted-foreground">
                {leadsEtapa.length}
              </span>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {leadsEtapa.length === 0 && (
                <p className="rounded border border-dashed py-8 text-center text-[12px] text-muted-foreground">
                  Sin leads
                </p>
              )}
              {leadsEtapa.map((lead) => {
                const vehiculo = vehiculoDe(vehicles, lead.vehicleId);
                const vendedor = users.find((u) => u.id === lead.vendedorId);
                return (
                  <article
                    key={lead.id}
                    className="border border-border bg-background p-2.5"
                    style={lead.temperatura === "hot" ? { borderLeft: "2px solid var(--hot)" } : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      {lead.temperatura === "hot" && <Flame className="size-3 shrink-0 text-hot" />}
                      <p className="truncate text-[12.5px] font-medium">{lead.nombre}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{lead.telefono}</p>
                    {vehiculo && (
                      <p className="mt-1.5 truncate text-[11.5px] text-muted-foreground">{vehiculo.titulo}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                      {lead.perdido && <span className="text-crit">Perdido</span>}
                      {lead.mensajes > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="size-2.5" /> {lead.mensajes}
                        </span>
                      )}
                      <span className="ml-auto truncate">
                        {vendedor?.nombre.split(" ")[0] ?? "Sin asignar"}
                        {lead.diasEnEtapa > 0 && ` · ${lead.diasEnEtapa}d`}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

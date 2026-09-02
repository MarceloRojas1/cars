import Link from "next/link";
import { Pencil, Sparkles } from "lucide-react";
import { Tablero } from "@/components/embudo/tablero";
import { NuevoLead } from "@/components/embudo/nuevo-lead";
import { buttonVariants } from "@/components/ui/button";
import { getLeads, getStages, getUsers, getVehicles } from "@/lib/data";

export const metadata = { title: "Embudo" };

export default async function EmbudoPage() {
  const [leads, stages, vehicles, users] = await Promise.all([
    getLeads(), getStages(), getVehicles(), getUsers(),
  ]);

  const sinAsignar = leads.filter(
    (l) => !l.vendedorId && stages.find((s) => s.id === l.stageId)?.responsable === "humano",
  ).length;
  const conBot = leads.filter(
    (l) => stages.find((s) => s.id === l.stageId)?.responsable === "ia",
  ).length;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">
          <span className="tabular text-foreground">{leads.length}</span> leads ·{" "}
          <span className="inline-flex items-center gap-1 text-chart-3">
            <Sparkles className="size-3" />
            <span className="tabular">{conBot}</span> con el bot
          </span>
          {sinAsignar > 0 && (
            <>
              {" · "}
              <span className="text-warn">
                <span className="tabular">{sinAsignar}</span> sin asignar
              </span>
            </>
          )}
        </p>

        <Link
          href="/automatizacion"
          className={buttonVariants({ variant: "outline", size: "sm", className: "ml-auto h-9 gap-2" })}
        >
          <Pencil className="size-3.5" /> Editar embudo
        </Link>
        <NuevoLead vehiculos={vehicles.map((v) => ({ id: v.id, titulo: v.titulo, codigo: v.codigo }))} />
      </div>

      <Tablero
        leads={leads}
        stages={stages}
        vehiculos={vehicles.map((v) => ({ id: v.id, titulo: v.titulo, codigo: v.codigo }))}
        usuarios={users}
      />

      <p className="mt-2 text-[11.5px] text-muted-foreground">
        Haz clic en una tarjeta para ver el detalle, o arrástrala para cambiarla de etapa. Al pasarla de una etapa del
        bot a una de personas se asigna vendedor automáticamente.
      </p>
    </div>
  );
}

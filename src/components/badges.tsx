import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { severidadDias } from "@/lib/format";
import type { LeadSource, Stage, VehicleStatus } from "@/lib/types";

const SOURCE_LABEL: Record<LeadSource, string> = {
  meta_ads: "Meta Ads",
  whatsapp: "WhatsApp",
  mercadolibre: "MercadoLibre",
  chileautos: "Chile Autos",
  manual: "Manual",
  web_dealer: "Web del dealer",
  landing_ads: "Landing ads",
  referral: "Referido",
  social: "Social",
  instagram: "Instagram",
  phone: "Teléfono",
  marketplace: "Marketplace",
};

export function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px]">
      <span className="size-1.5 rounded-full" style={{ background: stage.color }} />
      {stage.nombre}
    </span>
  );
}

export function EstadoVehiculo({ estado }: { estado: VehicleStatus }) {
  const estilos: Record<VehicleStatus, string> = {
    disponible: "border-primary/40 bg-primary/12 text-primary",
    pendiente: "border-warn/40 bg-warn/12 text-warn",
    reservado: "border-chart-3/40 bg-chart-3/12 text-chart-3",
    vendido: "border-ok/40 bg-ok/12 text-ok",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] capitalize", estilos[estado])}>
      {estado}
    </span>
  );
}

/** Antigüedad de publicación con el código de color del producto (regla R4). */
export function DiasEnSalon({ dias }: { dias: number }) {
  const sev = severidadDias(dias);
  return (
    <span
      className={cn(
        "tabular inline-flex rounded px-1.5 py-0.5 font-mono text-[11px]",
        sev === "crit" && "bg-crit/15 text-crit",
        sev === "warn" && "bg-warn/15 text-warn",
        sev === "ok" && "bg-muted text-muted-foreground",
      )}
    >
      {dias}d
    </span>
  );
}

export function Hot() {
  return <Flame className="size-3.5 text-hot" strokeWidth={2} aria-label="Lead caliente" />;
}

export function Completitud({ pct }: { pct: number }) {
  const completa = pct >= 100;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      <span className={cn("size-1.5 rounded-full", completa ? "bg-ok" : "bg-warn")} />
      <span className={cn("tabular", completa ? "text-ok" : "text-muted-foreground")}>
        {completa ? "100%" : `${pct}%`}
      </span>
    </span>
  );
}

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

/** El origen es un dato, no un estado: va en texto, sin caja de color. */
export function SourceBadge({ source }: { source: LeadSource }) {
  return <span className="text-[12px] text-muted-foreground">{SOURCE_LABEL[source]}</span>;
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px]">
      <span className="size-[5px] shrink-0 rounded-full" style={{ background: stage.color }} />
      {stage.nombre}
    </span>
  );
}

export function EstadoVehiculo({ estado }: { estado: VehicleStatus }) {
  const estilos: Record<VehicleStatus, string> = {
    disponible: "text-foreground",
    pendiente: "text-warn",
    reservado: "text-chart-3",
    vendido: "text-ok",
  };
  return (
    <span className={cn("inline-flex items-center gap-2 text-[12.5px] capitalize", estilos[estado])}>
      <span className="size-[5px] rounded-full bg-current opacity-70" />
      {estado}
    </span>
  );
}

/** Antigüedad de publicación con los umbrales del producto (regla R4). */
export function DiasEnSalon({ dias }: { dias: number }) {
  const sev = severidadDias(dias);
  return (
    <span
      className={cn(
        "tabular text-[12.5px]",
        sev === "crit" && "text-crit",
        sev === "warn" && "text-warn",
        sev === "ok" && "text-muted-foreground",
      )}
    >
      {dias}d
    </span>
  );
}

export function Hot() {
  return (
    <span
      className="inline-block size-[5px] shrink-0 rounded-full bg-hot"
      title="Lead caliente"
      aria-label="Lead caliente"
    />
  );
}

export function Completitud({ pct }: { pct: number }) {
  const completa = pct >= 100;
  return (
    <span className={cn("tabular text-[12.5px]", completa ? "text-ok" : "text-muted-foreground")}>
      {pct}%
    </span>
  );
}

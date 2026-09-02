"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { crearLeadAction, type EstadoLead } from "@/app/(app)/embudo/acciones";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Campo, Select, controlBase } from "@/components/form/campos";
import { LEAD_SOURCES } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/lib/types";

const ETIQUETA_FUENTE: Record<string, string> = {
  meta_ads: "Meta Ads", whatsapp: "WhatsApp", mercadolibre: "MercadoLibre",
  chileautos: "Chile Autos", manual: "Manual", web_dealer: "Web del dealer",
  landing_ads: "Landing ads", referral: "Referido", social: "Social",
  instagram: "Instagram", phone: "Teléfono", marketplace: "Marketplace",
};

const inicial: EstadoLead = {};

export function NuevoLead({ vehiculos }: { vehiculos: Pick<Vehicle, "id" | "titulo" | "codigo">[] }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoLead>(inicial);
  const [pendiente, iniciar] = useTransition();

  // Se llama la acción directamente en vez de useActionState: así el cierre del
  // diálogo ocurre en el mismo flujo del envío y no dentro de un efecto.
  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await crearLeadAction(inicial, formData);
      setEstado(r);
      if (r.ok) {
        setAbierto(false);
        toast.success("Lead creado", { description: "Entró en la primera etapa del embudo." });
      }
    });
  }

  const e = estado.errores ?? {};

  return (
    <>
      <Button size="sm" className="h-9 gap-2" onClick={() => setAbierto(true)}>
        <Plus className="size-3.5" /> Añadir lead
      </Button>

      <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (v) setEstado(inicial); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[19px]">Nuevo lead</DialogTitle>
            <DialogDescription className="text-[13px]">
              Entra en la primera etapa del embudo, igual que los que llegan por
              los canales.
            </DialogDescription>
          </DialogHeader>

          <form action={enviar} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre" htmlFor="nombre" error={e.nombre}>
              <input id="nombre" name="nombre" className={controlBase} autoFocus />
            </Campo>
            <Campo label="Teléfono" htmlFor="telefono" error={e.telefono}>
              <input id="telefono" name="telefono" inputMode="tel" placeholder="+569…"
                className={cn(controlBase, "tabular")} />
            </Campo>
            <Campo label="Correo" htmlFor="email" error={e.email}>
              <input id="email" name="email" type="email" className={controlBase} />
            </Campo>
            <Campo label="Fuente" htmlFor="source">
              <Select id="source" name="source" defaultValue="manual">
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>{ETIQUETA_FUENTE[s] ?? s}</option>
                ))}
              </Select>
            </Campo>
            <Campo label="Tipo" htmlFor="tipo" hint="Consignación: quiere venderte su auto.">
              <Select id="tipo" name="tipo" defaultValue="venta">
                <option value="venta">Quiere comprar</option>
                <option value="consigna_compra">Consigna / compra</option>
              </Select>
            </Campo>
            <Campo label="Vehículo de interés" htmlFor="vehicleId" hint="Opcional.">
              <Select id="vehicleId" name="vehicleId" defaultValue="">
                <option value="">Sin vehículo</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.codigo} · {v.titulo}</option>
                ))}
              </Select>
            </Campo>
            <Campo label="Notas" htmlFor="notas" ancho="completo">
              <textarea id="notas" name="notas" rows={3}
                className={cn(controlBase, "h-auto resize-y py-2")} />
            </Campo>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={pendiente} className="h-9">
                {pendiente ? "Creando…" : "Crear lead"}
              </Button>
              <button type="button" onClick={() => setAbierto(false)}
                className="text-[13px] text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
              {estado.mensaje && <p className="text-[12.5px] text-crit">{estado.mensaje}</p>}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Car, ClipboardCopy, DollarSign, Mail, MessageSquare, Phone,
  Plus, Sparkles, UserPlus, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  agregarNotaAction, asignarLeadAction, cambiarVehiculoAction,
  detalleLeadAction, moverLeadAction,
} from "@/app/(app)/embudo/acciones";
import { Button } from "@/components/ui/button";
import { Select, controlBase } from "@/components/form/campos";
import { cn } from "@/lib/utils";
import type { DetalleLead } from "@/lib/data";
import type { AppUser, Lead, Stage, Vehicle } from "@/lib/types";

const ETIQUETA_FUENTE: Record<string, string> = {
  meta_ads: "Meta Ads", whatsapp: "WhatsApp", mercadolibre: "MercadoLibre",
  chileautos: "Chile Autos", manual: "Manual", web_dealer: "Web del dealer",
  landing_ads: "Landing ads", referral: "Referido", social: "Social",
  instagram: "Instagram", phone: "Teléfono", marketplace: "Marketplace",
};

/** Sección con título y una acción opcional a la derecha. */
function Bloque({
  titulo, accion, children,
}: {
  titulo: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="overline">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Acción todavía no construida: se muestra pero dice por qué no se puede usar. */
function Pendiente({ children, motivo }: { children: React.ReactNode; motivo: string }) {
  return (
    <span title={motivo} className="cursor-not-allowed text-[12px] text-muted-foreground/50">
      {children}
    </span>
  );
}

export function PanelLead({
  leadId, leads, stages, vehiculos, usuarios, onCerrar,
}: {
  leadId: string;
  leads: Lead[];
  stages: Stage[];
  vehiculos: Pick<Vehicle, "id" | "titulo" | "codigo">[];
  usuarios: AppUser[];
  onCerrar: () => void;
}) {
  const [detalle, setDetalle] = useState<DetalleLead | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pendiente, iniciar] = useTransition();
  const [nota, setNota] = useState("");
  const [cambiandoVehiculo, setCambiandoVehiculo] = useState(false);

  const lead = detalle?.lead ?? leads.find((l) => l.id === leadId);

  // El panel se monta de nuevo con cada lead (key en el padre), así que no hay
  // que reiniciar estado acá: basta con pedir el detalle.
  useEffect(() => {
    let vigente = true;
    detalleLeadAction(leadId).then((d) => {
      if (vigente) { setDetalle(d); setCargando(false); }
    });
    return () => { vigente = false; };
  }, [leadId]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  async function recargar() {
    setDetalle(await detalleLeadAction(leadId));
  }

  if (!lead) return null;

  const etapa = stages.find((s) => s.id === lead.stageId);
  const vehiculo = vehiculos.find((v) => v.id === lead.vehicleId);
  const vendedor = usuarios.find((u) => u.id === lead.vendedorId);

  const copiar = (texto: string, que: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${que} copiado`);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/70"
        onClick={onCerrar}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={`Lead ${lead.nombre}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[860px] border-l border-border bg-surface shadow-2xl"
      >
        {/* --- detalle --- */}
        <div className="flex w-full flex-col overflow-y-auto lg:w-[420px] lg:shrink-0 lg:border-r lg:border-border">
          <header className="flex items-start gap-3 border-b border-border px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[13px]">
              {(lead.nombre || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{lead.nombre || "Sin nombre"}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                  {ETIQUETA_FUENTE[lead.source] ?? lead.source}
                </span>
                {etapa && (
                  <span className="flex items-center gap-1 bg-foreground px-1.5 py-0.5 text-[10.5px] text-background">
                    {etapa.responsable === "ia" && <Sparkles className="size-2.5" />}
                    {etapa.nombre}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </header>

          <Bloque titulo="Contacto">
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              {lead.email || "—"}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="tabular text-[13px]">{lead.telefono || "—"}</span>
              {lead.telefono && (
                <button
                  onClick={() => copiar(lead.telefono, "Teléfono")}
                  aria-label="Copiar teléfono"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ClipboardCopy className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-3">
              <Pendiente motivo="Necesita la integración de telefonía">
                <span className="flex h-8 items-center justify-center gap-2 border border-dashed border-border">
                  <Phone className="size-3.5" /> Registrar llamada
                </span>
              </Pendiente>
            </div>
          </Bloque>

          <Bloque
            titulo="Vehículo de interés"
            accion={
              <button
                onClick={() => setCambiandoVehiculo((v) => !v)}
                className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {cambiandoVehiculo ? "Cancelar" : "Cambiar"}
              </button>
            }
          >
            {cambiandoVehiculo ? (
              <Select
                defaultValue={lead.vehicleId ?? ""}
                onChange={(e) =>
                  iniciar(async () => {
                    await cambiarVehiculoAction(leadId, e.target.value || null);
                    setCambiandoVehiculo(false);
                    await recargar();
                    toast.success("Vehículo actualizado");
                  })
                }
              >
                <option value="">Sin vehículo</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.codigo} · {v.titulo}</option>
                ))}
              </Select>
            ) : (
              <p className="flex items-center gap-2 text-[13px]">
                <Car className="size-3.5 shrink-0 text-muted-foreground" />
                {vehiculo?.titulo ?? <span className="text-muted-foreground">Sin vehículo</span>}
              </p>
            )}

            <div className="mt-3">
              <Pendiente motivo="Falta la pantalla de nueva operación en Control de Ventas">
                <span className="flex h-8 items-center justify-center gap-2 border border-dashed border-border">
                  <DollarSign className="size-3.5" /> Registrar venta
                </span>
              </Pendiente>
            </div>
          </Bloque>

          <Bloque titulo="Asignación">
            <p className="flex items-center gap-2 text-[13px]">
              <UserPlus className="size-3.5 shrink-0 text-muted-foreground" />
              {vendedor?.nombre ?? (
                <span className={etapa?.responsable === "ia" ? "text-chart-3" : "text-warn"}>
                  {etapa?.responsable === "ia" ? "Lo atiende el bot" : "Sin asignar"}
                </span>
              )}
            </p>
            <Select
              className="mt-2.5"
              value={lead.vendedorId ?? ""}
              onChange={(e) =>
                iniciar(async () => {
                  await asignarLeadAction(leadId, e.target.value || null);
                  await recargar();
                  toast.success("Asignación actualizada");
                })
              }
            >
              <option value="">Sin asignar</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </Select>
          </Bloque>

          <Bloque
            titulo="Recordatorios"
            accion={<Pendiente motivo="La pantalla de Recordatorios está pendiente">+ Recordatorio</Pendiente>}
          >
            <p className="text-[12.5px] text-muted-foreground">Sin recordatorios.</p>
          </Bloque>

          <Bloque titulo="Etapa">
            <div className="flex flex-wrap gap-1.5">
              {stages.map((s) => {
                const actual = s.id === lead.stageId;
                return (
                  <button
                    key={s.id}
                    disabled={actual || pendiente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await moverLeadAction(leadId, s.id);
                        if (!r.ok) { toast.error(r.error ?? "No se pudo mover."); return; }
                        await recargar();
                        toast.success(
                          r.traspasado
                            ? `Traspasado a ${usuarios.find((u) => u.id === r.vendedorAsignado)?.nombre ?? "un vendedor"}`
                            : `Movido a ${s.nombre}`,
                        );
                      })
                    }
                    className={cn(
                      "flex items-center gap-1 border px-2 py-1 text-[11.5px] transition-colors",
                      actual
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.responsable === "ia" && <Sparkles className="size-2.5" />}
                    {s.nombre}
                  </button>
                );
              })}
            </div>
          </Bloque>

          <Bloque titulo="Notas">
            <div className="flex gap-2">
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nota.trim()) {
                    iniciar(async () => {
                      const r = await agregarNotaAction(leadId, nota);
                      if (!r.ok) { toast.error(r.error!); return; }
                      setNota(""); await recargar();
                    });
                  }
                }}
                placeholder="Escribe una nota y presiona Enter"
                className={controlBase}
              />
              <Button
                type="button" variant="outline" className="h-9 shrink-0"
                disabled={!nota.trim() || pendiente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await agregarNotaAction(leadId, nota);
                    if (!r.ok) { toast.error(r.error!); return; }
                    setNota(""); await recargar();
                  })
                }
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <ul className="mt-3 space-y-3">
              {detalle?.notas.length === 0 && (
                <li className="text-[12.5px] text-muted-foreground">Sin notas.</li>
              )}
              {detalle?.notas.map((n) => (
                <li key={n.id} className="border-l-2 border-l-border pl-3">
                  <p className="text-[13px] leading-snug">{n.texto}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {n.cuando}{n.autor ? ` · ${n.autor}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Bloque>

          <Bloque titulo="Bitácora">
            {cargando && <p className="text-[12.5px] text-muted-foreground">Cargando…</p>}
            <ul className="space-y-2.5">
              {!cargando && detalle?.bitacora.length === 0 && (
                <li className="text-[12.5px] text-muted-foreground">Sin movimientos.</li>
              )}
              {detalle?.bitacora.map((b) => (
                <li key={b.id} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 size-[5px] shrink-0 rounded-full",
                      b.traspaso ? "bg-chart-3" : "bg-muted-foreground/50",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px]">
                      {b.tipo === "ingreso"
                        ? `Entró al embudo${b.hasta ? ` en ${b.hasta}` : ""}`
                        : `${b.desde ?? "—"} → ${b.hasta ?? "—"}`}
                      {b.traspaso && <span className="ml-1.5 text-chart-3">traspaso</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.cuando}{b.actor ? ` · ${b.actor}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Bloque>
        </div>

        {/* --- conversación --- */}
        <div className="hidden flex-1 flex-col items-center justify-center gap-2 p-8 text-center lg:flex">
          <MessageSquare className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
          {detalle?.conversacion ? (
            <>
              <p className="text-[14px]">
                {detalle.conversacion.mensajes} mensajes de WhatsApp
              </p>
              <p className="max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
                El historial se mostrará acá cuando esté conectada la integración
                de WhatsApp.
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px]">Sin conversación de WhatsApp</p>
              <p className="max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
                Este lead no llegó por WhatsApp.
              </p>
            </>
          )}
          <Link
            href="/integraciones"
            className="mt-1 text-[12.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Ver integraciones
          </Link>
        </div>
      </aside>
    </>
  );
}

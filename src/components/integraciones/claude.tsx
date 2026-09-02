"use client";

import { useState, useTransition } from "react";
import { ChevronRight, ExternalLink, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  conectarClaudeAction, desconectarClaudeAction, type ResultadoClaude,
} from "@/app/(app)/integraciones/acciones";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Campo, Select, controlBase } from "@/components/form/campos";
import { MODELOS_DISPONIBLES } from "@/lib/ia/modelos";
import { cn } from "@/lib/utils";
import type { Integration } from "@/lib/types";

const inicial: ResultadoClaude = { ok: false, mensaje: "" };

export function IntegracionClaude({ integracion }: { integracion: Integration }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<ResultadoClaude>(inicial);
  const [pendiente, iniciar] = useTransition();
  const conectado = integracion.estado === "conectado";

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await conectarClaudeAction(inicial, formData);
      setEstado(r);
      if (r.ok) {
        setAbierto(false);
        toast.success("Claude conectado", { description: r.mensaje });
      }
    });
  }

  function desconectar() {
    iniciar(async () => {
      await desconectarClaudeAction();
      setAbierto(false);
      toast.success("Claude desconectado", { description: "La clave se borró de la base." });
    });
  }

  const modelo = MODELOS_DISPONIBLES.find((m) => m.id === integracion.modelo);

  return (
    <>
      <button
        onClick={() => { setEstado(inicial); setAbierto(true); }}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium">{integracion.nombre}</p>
          <p className="truncate text-[12px] text-muted-foreground">{integracion.descripcion}</p>
        </div>
        <div className="text-right">
          <p className={cn("text-[12.5px]", conectado ? "text-ok" : "text-muted-foreground")}>
            {conectado ? "Conectado" : "Conectar"}
          </p>
          {conectado && (
            <p className="tabular text-[11px] text-muted-foreground">
              {integracion.detalle}{modelo ? ` · ${modelo.nombre}` : ""}
            </p>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[19px]">Conectar Claude</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              El asistente usa <span className="text-foreground">tu propia cuenta</span> de
              Anthropic: el consumo se factura a tu organización y nadie más gasta tu cuota.
            </DialogDescription>
          </DialogHeader>

          <form action={enviar} className="grid gap-4">
            <Campo
              label="Clave de API"
              htmlFor="apiKey"
              hint={conectado
                ? `Hay una clave guardada (${integracion.detalle}). Pega otra para reemplazarla.`
                : undefined}
            >
              <input
                id="apiKey" name="apiKey" type="password" autoComplete="off"
                placeholder="sk-ant-api03-…"
                className={cn(controlBase, "tabular")}
                autoFocus
              />
            </Campo>

            <Campo label="Modelo" htmlFor="modelo">
              <Select id="modelo" name="modelo" defaultValue={integracion.modelo ?? "claude-opus-5"}>
                {MODELOS_DISPONIBLES.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre} — {m.nota}</option>
                ))}
              </Select>
            </Campo>

            <div className="flex items-start gap-2.5 border border-border bg-card px-3 py-2.5">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                La clave se guarda cifrada con AES-256-GCM y nunca vuelve al navegador:
                solo se muestran los últimos caracteres. Antes de guardarla se prueba
                con una llamada real a Anthropic.
              </p>
            </div>

            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ExternalLink className="size-3.5" /> Crear una clave en la consola de Anthropic
            </a>

            {estado.mensaje && !estado.ok && (
              <p className="border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit">
                {estado.mensaje}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pendiente} className="h-9 gap-2">
                <KeyRound className="size-3.5" />
                {pendiente ? "Probando la clave…" : conectado ? "Reemplazar clave" : "Probar y conectar"}
              </Button>
              {conectado && (
                <button
                  type="button" onClick={desconectar} disabled={pendiente}
                  className="text-[13px] text-crit underline-offset-4 hover:underline"
                >
                  Desconectar
                </button>
              )}
              <button
                type="button" onClick={() => setAbierto(false)}
                className="ml-auto text-[13px] text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoMiembroAction, guardarMiembroAction } from "@/app/(app)/equipo/acciones";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Campo, Select, controlBase } from "@/components/form/campos";
import type { AppUser, Branch } from "@/lib/types";

const ROLES: { id: AppUser["rol"]; nombre: string; nota: string }[] = [
  { id: "owner", nombre: "Dueño", nota: "Todo, incluido el plan y la facturación" },
  { id: "admin", nombre: "Administrador", nota: "Todo menos el plan" },
  { id: "vendedor", nombre: "Vendedor", nota: "Sus leads y el inventario" },
];

export function DialogoMiembro({
  miembro, sucursales, cupoLleno, abierto, alCerrar,
}: {
  miembro?: AppUser;
  sucursales: Branch[];
  cupoLleno?: boolean;
  /**
   * Modo controlado, para abrirlo desde el menú de la fila. El diálogo tiene que
   * vivir FUERA del menú: si está dentro, cerrar el menú lo desmonta y no
   * alcanza a abrirse.
   */
  abierto?: boolean;
  alCerrar?: () => void;
}) {
  const [propio, setPropio] = useState(false);
  const controlado = abierto !== undefined;
  const visible = controlado ? abierto : propio;
  const cerrar = () => (controlado ? alCerrar?.() : setPropio(false));
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const editando = Boolean(miembro);

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await guardarMiembroAction({ ok: false, mensaje: "" }, formData);
      if (!r.ok) { setError(r.mensaje); return; }
      cerrar();
      setError("");
      toast.success(editando ? "Miembro actualizado" : "Miembro agregado");
    });
  }

  return (
    <>
      {controlado ? null : (
        <Button
          onClick={() => { setError(""); setPropio(true); }}
          disabled={cupoLleno}
          title={cupoLleno ? "Tu plan no tiene cupos disponibles" : undefined}
          className="gap-2"
        >
          <Plus className="size-4" /> Nuevo miembro
        </Button>
      )}

      <Dialog open={visible} onOpenChange={(v) => (v ? setPropio(true) : cerrar())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[19px]">
              {editando ? miembro!.nombre : "Nuevo miembro"}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              El rol define qué ve y qué puede cambiar. La sucursal decide qué leads le
              tocan cuando el reparto es por sucursal.
            </DialogDescription>
          </DialogHeader>

          <form action={enviar} className="grid gap-4 sm:grid-cols-2">
            {editando && <input type="hidden" name="id" value={miembro!.id} />}

            <Campo label="Nombre" htmlFor="nombre">
              <input id="nombre" name="nombre" defaultValue={miembro?.nombre} className={controlBase} autoFocus />
            </Campo>

            <Campo label="Correo" htmlFor="email">
              <input
                id="email" name="email" type="email" defaultValue={miembro?.email}
                className={controlBase}
              />
            </Campo>

            <Campo label="Teléfono" htmlFor="telefono">
              <input id="telefono" name="telefono" defaultValue={miembro?.telefono} className={controlBase} />
            </Campo>

            <Campo label="Sucursal" htmlFor="branchId">
              <Select id="branchId" name="branchId" defaultValue={miembro?.branchId ?? ""}>
                <option value="">Sin asignar</option>
                {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
            </Campo>

            <Campo label="Rol" htmlFor="rol" ancho="completo">
              <Select id="rol" name="rol" defaultValue={miembro?.rol ?? "vendedor"}>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre} — {r.nota}</option>
                ))}
              </Select>
            </Campo>

            {error && (
              <p className="border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit sm:col-span-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={pendiente} className="h-9">
                {pendiente ? "Guardando…" : editando ? "Guardar cambios" : "Agregar al equipo"}
              </Button>
              <button
                type="button" onClick={cerrar}
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

export function AccionesMiembro({ miembro, sucursales }: { miembro: AppUser; sucursales: Branch[] }) {
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function cambiarEstado() {
    iniciar(async () => {
      const r = await cambiarEstadoMiembroAction(miembro.id, !miembro.activo);
      setMenu(false);
      if (!r.ok) { toast.error("No se pudo cambiar el estado", { description: r.mensaje }); return; }
      toast.success(miembro.activo ? "Miembro desactivado" : "Miembro activado");
    });
  }

  return (
    <div className="relative">
      <Button
        variant="ghost" size="icon" className="size-7"
        aria-label={`Acciones de ${miembro.nombre}`}
        onClick={() => setMenu((v) => !v)}
      >
        <MoreHorizontal className="size-4" />
      </Button>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 border border-border bg-card py-1">
            <button
              onClick={() => { setMenu(false); setEditando(true); }}
              className="w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-accent/40"
            >
              Editar
            </button>
            <button
              onClick={cambiarEstado} disabled={pendiente}
              className="w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-accent/40 disabled:opacity-50"
            >
              {miembro.activo ? "Desactivar" : "Activar"}
            </button>
          </div>
        </>
      )}

      {/* Fuera del menú: cerrarlo no debe desmontar el diálogo. */}
      <DialogoMiembro
        miembro={miembro}
        sucursales={sucursales}
        abierto={editando}
        alCerrar={() => setEditando(false)}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  cambiarEstadoSucursalAction, guardarSucursalAction,
} from "@/app/(app)/sucursales/acciones";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Campo, Select, controlBase } from "@/components/form/campos";
import { NOMBRES_REGIONES, REGIONES } from "@/lib/geo-chile";
import type { Branch } from "@/lib/types";

/**
 * Alta y edición de sucursal en un diálogo.
 *
 * El mismo formulario sirve para las dos: si llega `sucursal` es edición y va
 * su id en un campo oculto. El código (SUC-001) no se pide — lo calcula la
 * capa de datos, porque escribirlo a mano solo produce duplicados.
 */
export function DialogoSucursal({
  sucursal, abierto, alCerrar,
}: {
  sucursal?: Branch;
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
  const [region, setRegion] = useState(sucursal?.region ?? "");
  const [pendiente, iniciar] = useTransition();
  const editando = Boolean(sucursal);

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await guardarSucursalAction({ ok: false, mensaje: "" }, formData);
      if (!r.ok) { setError(r.mensaje); return; }
      cerrar();
      setError("");
      toast.success(editando ? "Sucursal actualizada" : "Sucursal creada");
    });
  }

  return (
    <>
      {controlado ? null : (
        <Button onClick={() => { setError(""); setPropio(true); }} className="gap-2">
          <Plus className="size-4" /> Crear sucursal
        </Button>
      )}

      <Dialog open={visible} onOpenChange={(v) => (v ? setPropio(true) : cerrar())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[19px]">
              {editando ? sucursal!.nombre : "Nueva sucursal"}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              {editando
                ? `Código ${sucursal!.codigo}. El código no cambia: lo usan los vehículos y las ventas ya registradas.`
                : "El código se asigna solo, siguiendo la numeración de las que ya existen."}
            </DialogDescription>
          </DialogHeader>

          <form action={enviar} className="grid gap-4 sm:grid-cols-2">
            {editando && <input type="hidden" name="id" value={sucursal!.id} />}

            <Campo label="Nombre" htmlFor="nombre" ancho="completo">
              <input
                id="nombre" name="nombre" defaultValue={sucursal?.nombre}
                className={controlBase} autoFocus
              />
            </Campo>

            <Campo label="Dirección" htmlFor="direccion" ancho="completo">
              <input id="direccion" name="direccion" defaultValue={sucursal?.direccion} className={controlBase} />
            </Campo>

            <Campo label="Región" htmlFor="region">
              <Select
                id="region" name="region" value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Sin especificar</option>
                {NOMBRES_REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Campo>

            <Campo label="Comuna" htmlFor="comuna" hint={region ? undefined : "Elige primero una región."}>
              <Select id="comuna" name="comuna" defaultValue={sucursal?.comuna} disabled={!region}>
                <option value="">Sin especificar</option>
                {(REGIONES[region] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Campo>

            <Campo label="Teléfono" htmlFor="telefono">
              <input id="telefono" name="telefono" defaultValue={sucursal?.telefono} className={controlBase} />
            </Campo>

            <Campo label="Correo" htmlFor="email">
              <input id="email" name="email" type="email" defaultValue={sucursal?.email} className={controlBase} />
            </Campo>

            <label className="flex items-start gap-2.5 text-[12.5px] sm:col-span-2">
              <input
                type="checkbox" name="esPrincipal" defaultChecked={sucursal?.esPrincipal}
                className="mt-0.5"
              />
              <span>
                Sucursal principal
                <span className="block text-[11.5px] text-muted-foreground">
                  Hereda lo que no tenga sucursal asignada. Solo puede haber una.
                </span>
              </span>
            </label>

            {error && (
              <p className="border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit sm:col-span-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={pendiente} className="h-9">
                {pendiente ? "Guardando…" : editando ? "Guardar cambios" : "Crear sucursal"}
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

/** Menú de fila: editar y activar/desactivar. No hay borrar, a propósito. */
export function AccionesSucursal({ sucursal }: { sucursal: Branch }) {
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function cambiarEstado() {
    iniciar(async () => {
      const r = await cambiarEstadoSucursalAction(sucursal.id, !sucursal.activa);
      setMenu(false);
      if (!r.ok) { toast.error("No se pudo cambiar el estado", { description: r.mensaje }); return; }
      toast.success(sucursal.activa ? "Sucursal desactivada" : "Sucursal activada");
    });
  }

  return (
    <div className="relative">
      <Button
        variant="ghost" size="icon" className="size-7"
        aria-label={`Acciones de ${sucursal.nombre}`}
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
              {sucursal.activa ? "Desactivar" : "Activar"}
            </button>
          </div>
        </>
      )}

      {/* Fuera del menú: cerrarlo no debe desmontar el diálogo. */}
      <DialogoSucursal
        sucursal={sucursal}
        abierto={editando}
        alCerrar={() => setEditando(false)}
      />
    </div>
  );
}

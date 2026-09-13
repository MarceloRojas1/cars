"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  cambiarEstadoMiembroAction, guardarMiembroAction, reinvitarAction,
} from "@/app/(app)/equipo/acciones";
import { DialogoEnlace } from "@/components/equipo/enlace-invitacion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  /*
   * El enlace de acceso que devuelve la acción al crear. Se guarda acá porque
   * el token solo existe en esa respuesta: no está en la base ni se puede
   * volver a pedir.
   */
  const [enlace, setEnlace] = useState<{ url: string; dias: number; nombre: string } | null>(null);

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await guardarMiembroAction({ ok: false, mensaje: "" }, formData);
      if (!r.ok) { setError(r.mensaje); return; }
      cerrar();
      setError("");
      if (r.invitacion) {
        setEnlace({ ...r.invitacion, nombre: String(formData.get("nombre") ?? "") });
      } else {
        toast.success("Miembro actualizado");
      }
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

      {enlace && (
        <DialogoEnlace {...enlace} alCerrar={() => setEnlace(null)} />
      )}
    </>
  );
}

export function AccionesMiembro({ miembro, sucursales }: { miembro: AppUser; sucursales: Branch[] }) {
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [enlace, setEnlace] = useState<{ url: string; dias: number; nombre: string } | null>(null);

  function cambiarEstado() {
    iniciar(async () => {
      const r = await cambiarEstadoMiembroAction(miembro.id, !miembro.activo);
      if (!r.ok) { toast.error("No se pudo cambiar el estado", { description: r.mensaje }); return; }
      toast.success(miembro.activo ? "Miembro desactivado" : "Miembro activado");
    });
  }

  function reinvitar() {
    iniciar(async () => {
      const r = await reinvitarAction(miembro.id, miembro.rol);
      if (!r.ok) { toast.error("No se pudo generar el enlace", { description: r.mensaje }); return; }
      if (r.invitacion) setEnlace({ ...r.invitacion, nombre: miembro.nombre });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-7" aria-label={`Acciones de ${miembro.nombre}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setEditando(true)}>Editar</DropdownMenuItem>
          {/*
            Solo para quien todavía no tiene cuenta. A quien ya entra no se le
            ofrece un enlace: cambiarle la contraseña es cosa suya, desde Mi
            cuenta, y un admin generándole accesos sería otra cosa.
          */}
          {miembro.acceso !== "con_cuenta" && (
            <DropdownMenuItem onClick={reinvitar} disabled={pendiente}>
              {miembro.acceso === "invitado" ? "Generar otro enlace" : "Generar enlace de acceso"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={cambiarEstado} disabled={pendiente}>
            {miembro.activo ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Fuera del menú: cerrarlo no debe desmontar el diálogo. */}
      <DialogoMiembro
        miembro={miembro}
        sucursales={sucursales}
        abierto={editando}
        alCerrar={() => setEditando(false)}
      />

      {enlace && <DialogoEnlace {...enlace} alCerrar={() => setEnlace(null)} />}
    </>
  );
}

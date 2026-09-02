"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  archivarAction, cambiarEstadoAction, eliminarAction,
} from "@/app/(app)/vehiculos/acciones";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { VehicleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ESTADOS: { valor: VehicleStatus; etiqueta: string }[] = [
  { valor: "disponible", etiqueta: "Disponible" },
  { valor: "reservado", etiqueta: "Reservado" },
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "vendido", etiqueta: "Vendido" },
];

export function VehiculoAcciones({
  id, titulo, estado, archivado = false,
}: {
  id: string;
  titulo: string;
  estado: VehicleStatus;
  archivado?: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  const correr = (fn: () => Promise<unknown>, exito: string) =>
    iniciar(async () => {
      try {
        await fn();
        toast.success(exito);
      } catch {
        toast.error("No se pudo completar la acción.");
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost" size="icon" className="size-7"
              aria-label={`Acciones de ${titulo}`} disabled={pendiente}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            render={
              <Link href={`/vehiculos/${id}/editar`}>
                <Pencil className="size-3.5" /> Editar ficha
              </Link>
            }
          />

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="overline">Estado</DropdownMenuLabel>
            {ESTADOS.map((e) => (
              <DropdownMenuItem
                key={e.valor}
                disabled={e.valor === estado}
                onClick={() =>
                  correr(() => cambiarEstadoAction(id, e.valor), `Marcado como ${e.etiqueta.toLowerCase()}`)
                }
              >
                <Check className={cn("size-3.5", e.valor !== estado && "opacity-0")} />
                {e.etiqueta}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              correr(
                () => archivarAction(id, !archivado),
                archivado ? "Vehículo restaurado" : "Vehículo archivado",
              )
            }
          >
            {archivado ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
            {archivado ? "Restaurar" : "Archivar"}
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmando(true)}
          >
            <Trash2 className="size-3.5" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[19px]">Eliminar esta ficha</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Se elimina <span className="text-foreground">{titulo}</span> de forma permanente.
              Los leads asociados se conservan, pero quedan sin vehículo.
              <br />
              <br />
              Si el auto existió de verdad y solo quieres sacarlo del listado,
              usa <span className="text-foreground">Archivar</span>: conserva el historial
              y se puede revertir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={() => {
                setConfirmando(false);
                correr(() => eliminarAction(id), "Ficha eliminada");
              }}
            >
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

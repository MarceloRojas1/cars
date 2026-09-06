"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  generarShowroomAction, type ResultadoShowroom,
} from "@/app/(app)/estudio/acciones";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Campo, Select, controlBase } from "@/components/form/campos";
import { ESCENAS } from "@/lib/ia/imagenes/escenas";
import { cn } from "@/lib/utils";

const inicial: ResultadoShowroom = { ok: false, mensaje: "" };

/** La escena de la biblioteca que se usa como punto de partida. */
const BASE = ESCENAS[1];

export function GenerarFondo({ proveedor }: { proveedor: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<ResultadoShowroom>(inicial);
  const [pendiente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await generarShowroomAction(inicial, formData);
      setEstado(r);
      if (r.ok) {
        setAbierto(false);
        toast.success("Fondo generado", { description: r.mensaje });
      }
    });
  }

  return (
    <>
      <Button
        onClick={() => { setEstado(inicial); setAbierto(true); }}
        className="h-9 gap-2"
      >
        <Sparkles className="size-3.5" /> Generar fondo
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[19px]">Generar un fondo</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Describe el lugar; del encuadre nos encargamos nosotros. La cámara va
              siempre a ras de suelo y con el piso despejado adelante — es lo que
              permite montar el vehículo encima después.
            </DialogDescription>
          </DialogHeader>

          <form action={enviar} className="grid gap-4">
            <Campo label="Nombre" htmlFor="nombre">
              <input
                id="nombre" name="nombre" defaultValue="Mi showroom"
                className={controlBase} autoFocus
              />
            </Campo>

            <Campo
              label="Escena"
              htmlFor="escena"
              hint="En inglés funciona mejor. Describe en positivo lo que sí quieres ver: negar lo que no quieres funciona mal en todos los modelos."
            >
              <textarea
                id="escena" name="escena" rows={4}
                defaultValue={BASE.escena}
                className={cn(controlBase, "h-auto py-2 leading-relaxed")}
              />
            </Campo>

            <Campo
              label="Línea de piso"
              htmlFor="lineaPiso"
              hint="Dónde queda el suelo en la imagen, de arriba hacia abajo. Se ajusta a ojo mirando el resultado."
            >
              <Select id="lineaPiso" name="lineaPiso" defaultValue="0.70">
                <option value="0.66">0.66 · horizonte alto (caminos, costa)</option>
                <option value="0.70">0.70 · intermedio</option>
                <option value="0.74">0.74 · piso amplio (estudio, salón)</option>
              </Select>
            </Campo>

            {estado.mensaje && !estado.ok && (
              <p className="border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit">
                {estado.mensaje}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pendiente} className="h-9 gap-2">
                <Wand2 className="size-3.5" />
                {pendiente ? "Generando…" : "Generar"}
              </Button>
              <p className="text-[11.5px] text-muted-foreground">
                {pendiente ? `${proveedor} demora hasta un par de minutos.` : `Se genera con ${proveedor}.`}
              </p>
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

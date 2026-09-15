"use client";

import { useActionState, useState, useTransition } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import {
  analizarPlanillaAction, importarAction, type EstadoAnalisis,
} from "@/app/(app)/vehiculos/importar/acciones";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const INICIAL: EstadoAnalisis = { fase: "vacio" };

/**
 * Importar el inventario desde la planilla que la automotora ya usa.
 *
 * Dos pasos: se lee el archivo y se muestra qué va a pasar, y recién con el
 * segundo clic se escribe. Crear treinta autos es de las pocas cosas del panel
 * que no se deshacen con un clic —habría que archivarlos uno por uno— así que
 * la vista previa no es un lujo.
 */
export function ImportarPlanilla() {
  const [abierto, setAbierto] = useState(false);
  const [estado, analizar, analizando] = useActionState(analizarPlanillaAction, INICIAL);
  const [importando, iniciar] = useTransition();

  function cerrar() {
    setAbierto(false);
  }

  function confirmar() {
    if (estado.fase !== "previsualizado") return;
    iniciar(async () => {
      const r = await importarAction(estado.datos);

      if (r.mensaje) {
        toast.error("No se pudo importar", { description: r.mensaje });
        return;
      }
      if (r.creados > 0) {
        toast.success(`${r.creados} ${r.creados === 1 ? "vehículo importado" : "vehículos importados"}`, {
          description: r.fallidos.length
            ? `${r.fallidos.length} no se pudieron crear.`
            : undefined,
        });
      }
      if (r.fallidos.length > 0 && r.creados === 0) {
        toast.error("Ninguno se pudo crear", { description: r.fallidos[0]?.motivo });
      }
      cerrar();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={buttonVariants({ variant: "outline", className: "gap-2" })}
      >
        <Upload className="size-4" /> Importar Excel
      </button>

      <Dialog open={abierto} onOpenChange={(v) => (v ? setAbierto(true) : cerrar())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[19px]">Importar inventario</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Un archivo .xlsx con las columnas Patente, Marca, Tipo, Modelo, Version,
              Transmision, Año, Kilometraje y P. Publicación.
            </DialogDescription>
          </DialogHeader>

          {estado.fase !== "previsualizado" ? (
            <form action={analizar} className="flex flex-col gap-4">
              <label
                htmlFor="planilla"
                className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-border px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
              >
                <FileSpreadsheet className="size-6 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-[13px]">Elige tu planilla</span>
                <span className="text-[11.5px] text-muted-foreground">.xlsx · hasta 5 MB</span>
              </label>
              <input
                id="planilla" name="planilla" type="file" required
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
              />

              {estado.fase === "error" && (
                <p role="alert" className="border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit">
                  {estado.mensaje}
                </p>
              )}

              {analizando && (
                <p className="text-center text-[12.5px] text-muted-foreground">Leyendo la planilla…</p>
              )}

              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                No se crea nada todavía: primero te muestro qué va a pasar.
              </p>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[12.5px] text-muted-foreground">{estado.nombreArchivo}</p>

              <dl className="grid grid-cols-3 border-y border-border py-4 text-center">
                {[
                  { n: estado.resumen.nuevos, etiqueta: "se crean", clase: "text-foreground" },
                  { n: estado.resumen.repetidos, etiqueta: "ya existen", clase: "text-muted-foreground" },
                  { n: estado.resumen.invalidos, etiqueta: "no se pueden", clase: estado.resumen.invalidos ? "text-warn" : "text-muted-foreground" },
                ].map(({ n, etiqueta, clase }) => (
                  <div key={etiqueta}>
                    <dd className={`display text-[26px] leading-none ${clase}`}>{n}</dd>
                    <dt className="mt-1.5 text-[11.5px] text-muted-foreground">{etiqueta}</dt>
                  </div>
                ))}
              </dl>

              {estado.advertencia && (
                <p className="flex gap-2 border-l-2 border-l-warn bg-warn/[0.06] px-3 py-2 text-[12px] leading-relaxed text-warn">
                  <AlertTriangle className="mt-px size-3.5 shrink-0" />
                  {estado.advertencia}
                </p>
              )}

              {/* El detalle de lo que NO va a entrar: es lo que hay que poder revisar. */}
              {(estado.invalidos.length > 0 || estado.repetidos.length > 0) && (
                <div className="max-h-48 overflow-y-auto border border-border">
                  {estado.invalidos.map((f) => (
                    <p key={`i${f.fila}`} className="flex gap-2 border-b px-3 py-2 text-[12px] last:border-b-0">
                      <span className="tabular w-12 shrink-0 text-muted-foreground">fila {f.fila}</span>
                      <span className="flex-1 truncate">{f.descripcion}</span>
                      <span className="shrink-0 text-warn">{f.motivo}</span>
                    </p>
                  ))}
                  {estado.repetidos.map((f) => (
                    <p key={`r${f.fila}`} className="flex gap-2 border-b px-3 py-2 text-[12px] last:border-b-0">
                      <span className="tabular w-12 shrink-0 text-muted-foreground">fila {f.fila}</span>
                      <span className="flex-1 truncate">{f.descripcion}</span>
                      <span className="tabular shrink-0 text-muted-foreground">{f.patente} ya está</span>
                    </p>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="button" onClick={confirmar} className="h-9 gap-2"
                  disabled={importando || estado.resumen.nuevos === 0}
                >
                  <Check className="size-4" />
                  {importando
                    ? "Importando…"
                    : estado.resumen.nuevos === 0
                      ? "No hay nada que crear"
                      : `Importar ${estado.resumen.nuevos}`}
                </Button>
                <button
                  type="button" onClick={cerrar} disabled={importando}
                  className="ml-auto text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

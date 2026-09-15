"use client";

import { useActionState, useState, useTransition } from "react";
import { Globe, Link2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  analizarSitioAction, importarUnoAction,
  type AnalisisSitio, type ParaImportar,
} from "@/app/(app)/vehiculos/importar/sitio";
import { Button } from "@/components/ui/button";
import { controlBase } from "@/components/form/campos";

const INICIAL: AnalisisSitio = { fase: "vacio" };

/**
 * Importar el inventario desde el sitio que la automotora todavía tiene en
 * VENPU: se pega la dirección y se trae todo, fotos incluidas.
 *
 * El avance se muestra de a un vehículo porque de verdad tarda: treinta autos
 * con cuarenta fotos cada uno son más de mil imágenes que hay que bajar y
 * volver a subir. Una barra que no se mueve en cinco minutos se lee como
 * "se colgó", y la gente cierra la pestaña a la mitad.
 */
export function ImportarDesdeSitio({ alTerminar }: { alTerminar: () => void }) {
  const [estado, analizar, analizando] = useActionState(analizarSitioAction, INICIAL);
  const [importando, iniciar] = useTransition();
  const [avance, setAvance] = useState<{ hechos: number; total: number; actual: string } | null>(null);
  const [incluirVendidos, setIncluirVendidos] = useState(false);

  function importar(lista: ParaImportar[]) {
    if (lista.length === 0) return;

    iniciar(async () => {
      let ok = 0, fotos = 0;
      const fallidos: string[] = [];

      for (const [i, v] of lista.entries()) {
        setAvance({ hechos: i, total: lista.length, actual: v.datos.titulo });
        const r = await importarUnoAction(v, incluirVendidos);
        if (r.ok) { ok++; fotos += r.fotos; } else { fallidos.push(`${r.titulo}: ${r.mensaje}`); }
      }

      setAvance(null);
      if (ok > 0) {
        toast.success(`${ok} ${ok === 1 ? "vehículo importado" : "vehículos importados"}`, {
          description: `${fotos} fotos traídas${fallidos.length ? ` · ${fallidos.length} con problemas` : ""}`,
        });
      }
      if (fallidos.length > 0 && ok === 0) {
        toast.error("No se pudo importar", { description: fallidos[0] });
      }
      alTerminar();
    });
  }

  if (estado.fase !== "previsualizado") {
    return (
      <form action={analizar} className="flex flex-col gap-4">
        <div>
          <label htmlFor="url" className="etiqueta mb-1.5 block">
            Dirección de tu sitio
          </label>
          <div className="relative">
            <Link2 className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="url" name="url" required autoFocus
              placeholder="www.tuautomotora.cl"
              className={`${controlBase} pl-8`}
            />
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            El sitio que te generó VENPU. Se lee su catálogo público — el mismo que
            ve cualquiera que entre— y de ahí salen los autos con todas sus fotos.
          </p>
        </div>

        {estado.fase === "error" && (
          <p role="alert" className="border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit">
            {estado.mensaje}
          </p>
        )}

        <div>
          <Button type="submit" disabled={analizando} className="h-9 gap-2">
            <Globe className="size-4" />
            {analizando ? "Leyendo tu sitio…" : "Buscar mi inventario"}
          </Button>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          No se crea nada todavía: primero te muestro qué encontré.
        </p>
      </form>
    );
  }

  const { resumen, fichas, datos } = estado;
  /*
   * Lo que de verdad se va a traer, según esté marcado o no lo vendido. El
   * conteo de fotos tiene que seguir a esa casilla: decía "2.981 fotos" y el
   * botón iba a traer mil, que es la clase de número que hace desconfiar de
   * todo lo demás que diga la pantalla.
   */
  const seleccionados = incluirVendidos ? datos : datos.filter((d) => !d.vendido);
  const aImportar = seleccionados.length;
  const fotosAImportar = seleccionados.reduce((a, d) => a + d.fotos.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="truncate text-[12.5px] text-muted-foreground">{estado.sitio}</p>

      <dl className="grid grid-cols-3 border-y border-border py-4 text-center">
        {[
          { n: resumen.nuevos, etiqueta: "autos nuevos" },
          { n: resumen.completar, etiqueta: "les faltan fotos" },
          { n: resumen.yaEstan, etiqueta: "ya completos" },
        ].map(({ n, etiqueta }) => (
          <div key={etiqueta}>
            <dd className="display text-[26px] leading-none">{n}</dd>
            <dt className="mt-1.5 text-[11.5px] text-muted-foreground">{etiqueta}</dt>
          </div>
        ))}
      </dl>

      <p className="text-[12.5px]">
        <span className="tabular font-medium">{fotosAImportar}</span>{" "}
        <span className="text-muted-foreground">
          fotos por traer. Puede tardar varios minutos: no cierres esta ventana.
        </span>
      </p>

      {resumen.vendidos > 0 && (
        <label className="flex cursor-pointer items-start gap-2.5 border border-border px-3 py-2.5 text-[12.5px]">
          <input
            type="checkbox" checked={incluirVendidos}
            onChange={(e) => setIncluirVendidos(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Traer también los {resumen.vendidos} vendidos
            <span className="block text-[11.5px] text-muted-foreground">
              Sirven de historial, pero son muchas más fotos y no se publican.
            </span>
          </span>
        </label>
      )}

      {/* El detalle: qué se empareja con qué, para poder revisarlo antes. */}
      <div className="max-h-56 overflow-y-auto border border-border">
        {fichas.map((f) => (
          <p key={f.codigoVenpu} className="flex items-center gap-2 border-b px-3 py-2 text-[12px] last:border-b-0">
            <span className="flex-1 truncate">{f.titulo}</span>
            {f.vendido && <span className="shrink-0 text-[11px] text-muted-foreground">vendido</span>}
            <span className="tabular shrink-0 text-muted-foreground">{f.fotos} fotos</span>
            <span className="w-32 shrink-0 text-right">
              {f.estado === "nuevo" ? (
                <span className="text-foreground">se crea</span>
              ) : f.estado === "completar_fotos" ? (
                <span className="text-primary">{f.patenteProbable ?? "—"} · fotos</span>
              ) : (
                <span className="text-muted-foreground">ya está</span>
              )}
            </span>
          </p>
        ))}
      </div>

      {avance && (
        <div>
          <div className="mb-1.5 flex justify-between text-[12px]">
            <span className="truncate text-muted-foreground">{avance.actual}</span>
            <span className="tabular shrink-0">{avance.hechos}/{avance.total}</span>
          </div>
          <div className="h-1 bg-border">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(avance.hechos / Math.max(1, avance.total)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {resumen.completar > 0 && (
        <p className="flex gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          Los que «les faltan fotos» se emparejaron por marca, año y kilometraje —
          tu sitio no publica patentes. Revisa la lista antes de seguir.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button" onClick={() => importar(seleccionados)}
          disabled={importando || aImportar === 0} className="h-9 gap-2"
        >
          <Check className="size-4" />
          {importando ? "Importando…" : aImportar === 0 ? "Nada que traer" : `Importar ${aImportar}`}
        </Button>
        <button
          type="button" onClick={alTerminar} disabled={importando}
          className="ml-auto text-[13px] text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

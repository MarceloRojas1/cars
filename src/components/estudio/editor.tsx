"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { armonizarPiezaAction, cargarVehiculoAction } from "@/app/(app)/estudio/acciones";
import { Button } from "@/components/ui/button";
import { Campo, Select, controlBase } from "@/components/form/campos";
import { clp } from "@/lib/format";
import {
  ALTO, ANCHO, COLORES, FUENTES, cambiarVehiculo, creativoInicial,
  type Alineacion, type Creativo, type Elemento, type Fuente,
} from "@/lib/creativos/plantilla";
import { cargarImagen, dibujar, familiasDelDocumento, type Caja, type Familias } from "./dibujar";
import { cn } from "@/lib/utils";
import type { Showroom, Vehicle } from "@/lib/types";

/**
 * Editor de piezas.
 *
 * Lo generado es solo el fondo; la IA mete el vehículo dentro de él y
 * los textos, de su ficha. Acá se mueve y se ajusta todo, que es la parte que
 * ninguna IA acierta sola — dónde va el precio depende del fondo y del auto.
 *
 * La vista previa NO es HTML: es el mismo `dibujar()` que produce el archivo
 * final, a menor escala. Lo que se ve arrastrando es lo que se descarga.
 */
export function EditorCreativo({
  vehiculo, vehiculos, fondos, automotora, foto, fondoInicial,
}: {
  vehiculo: Vehicle;
  /** Los del inventario con foto, para cambiar de auto sin salir del editor. */
  vehiculos: Vehicle[];
  fondos: Showroom[];
  automotora: string;
  /** Recorte ya hecho de este vehículo, si lo hay. */
  /** Foto principal del vehículo, sin recortar. */
  foto: string | null;
  fondoInicial: string | null;
}) {
  const disponibles = fondos.filter((f) => f.url);
  const [actual, setActual] = useState(vehiculo);
  const [creativo, setCreativo] = useState<Creativo>(() =>
    creativoInicial(vehiculo, fondoInicial ?? disponibles[0]?.url ?? null, foto, automotora),
  );
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [armonizando, setArmonizando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>("precio");
  const [familias, setFamilias] = useState<Familias | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cajas = useRef<Caja[]>([]);
  const arrastre = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const elemento = creativo.elementos.find((e) => e.id === seleccionado) ?? null;
  const auto = creativo.elementos.find((e) => e.tipo === "auto");

  /* Las fuentes reales del documento, para que el canvas use las mismas. */
  useEffect(() => {
    document.fonts.ready.then(() => setFamilias(familiasDelDocumento(document.documentElement)));
  }, []);

  const repintar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !familias) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    cajas.current = dibujar(ctx, creativo, canvas.width, canvas.height, familias);
  }, [creativo, familias]);

  /* Cargar las imágenes que falten y repintar cuando lleguen. */
  useEffect(() => {
    const urls = [
      creativo.armonizadoUrl, creativo.fondoUrl,
      auto?.tipo === "auto" ? auto.url : null,
    ].filter(Boolean) as string[];
    Promise.allSettled(urls.map(cargarImagen)).then(repintar);
  }, [creativo.armonizadoUrl, creativo.fondoUrl, auto, repintar]);

  useEffect(repintar, [repintar]);

  function actualizar(id: string, cambios: Partial<Elemento>) {
    setCreativo((c) => ({
      ...c,
      // Solo mover, redimensionar o cambiar el vehículo invalida la versión
      // armonizada: ahí la imagen integrada deja de corresponder al montaje.
      // La sombra y el reflejo NO la invalidan — en modo armonizado los pone el
      // modelo, y descartar por eso tiraba a la basura una imagen ya pagada.
      armonizadoUrl:
        id === "auto" && ["x", "y", "ancho", "url"].some((k) => k in cambios)
          ? null
          : c.armonizadoUrl,
      elementos: c.elementos.map((e) => (e.id === id ? ({ ...e, ...cambios } as Elemento) : e)),
    }));
  }

  /* --- arrastrar sobre el lienzo --- */

  function posicionEnLienzo(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * ANCHO,
      y: ((e.clientY - r.top) / r.height) * ALTO,
    };
  }

  function alPresionar(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = posicionEnLienzo(e);
    // De arriba hacia abajo: gana el elemento dibujado más encima.
    const tocado = [...cajas.current].reverse().find(
      (c) => p.x >= c.x && p.x <= c.x + c.ancho && p.y >= c.y && p.y <= c.y + c.alto,
    );
    if (!tocado) { setSeleccionado(null); return; }

    const el = creativo.elementos.find((x) => x.id === tocado.id)!;
    setSeleccionado(el.id);
    arrastre.current = { id: el.id, dx: p.x - el.x * ANCHO, dy: p.y - el.y * ALTO };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function alMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!arrastre.current) return;
    const p = posicionEnLienzo(e);
    const { id, dx, dy } = arrastre.current;
    const el = creativo.elementos.find((x) => x.id === id);
    if (!el) return;

    let x = p.x - dx;
    let y = p.y - dy;

    /*
     * Se limita la CAJA visible, no el ancla: un texto centrado se ancla en su
     * medio y el vehículo en su línea de apoyo, así que limitar el ancla igual
     * deja arrastrar el elemento entero fuera del borde y perderlo.
     *
     * La regla es que el CENTRO del elemento no salga del lienzo. Sacar medio
     * auto por el borde es una decisión de diseño válida; que quede reducido a
     * una esquina, no. Se probó dejar salir hasta un 80% y con dos bordes a la
     * vez el elemento desaparecía de hecho.
     */
    const caja = cajas.current.find((c) => c.id === id);
    if (caja) {
      const centroX = caja.x - el.x * ANCHO + caja.ancho / 2;
      const centroY = caja.y - el.y * ALTO + caja.alto / 2;
      x = Math.min(ANCHO - centroX, Math.max(-centroX, x));
      y = Math.min(ALTO - centroY, Math.max(-centroY, y));
    }

    actualizar(id, { x: x / ANCHO, y: y / ALTO } as Partial<Elemento>);
  }

  function alSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    arrastre.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  /* --- descarga --- */

  /**
   * Cambia el auto sin salir: se conserva la disposición y solo cambian el
   * foto y los textos que salen de la ficha. Así se prueba el mismo diseño
   * con varios vehículos en vez de rearmarlo cada vez.
   */
  async function cambiarAuto(id: string) {
    if (id === actual.id) return;
    setCambiando(id);
    const r = await cargarVehiculoAction(id);
    setCambiando(null);
    if (!r.ok) { toast.error("No se pudo cambiar el vehículo", { description: r.mensaje }); return; }

    if (r.foto) await cargarImagen(r.foto);
    setActual(r.vehiculo);
    setCreativo((c) => cambiarVehiculo(c, r.vehiculo, r.foto, automotora));
    if (r.aviso) toast.warning(r.vehiculo.titulo, { description: r.aviso });
  }

  /**
   * Funde el auto con el fondo usando IA. Reemplaza al par fondo+auto; los
   * textos se siguen dibujando encima, así que quedan nítidos y editables.
   */
  async function armonizar() {
    if (creativo.armonizadoUrl) {           // volver al montaje manual
      setCreativo((c) => ({ ...c, armonizadoUrl: null }));
      return;
    }
    if (!creativo.fondoUrl || auto?.tipo !== "auto" || !auto.url) {
      toast.error("Falta el fondo o la foto del vehículo.");
      return;
    }
    setArmonizando(true);
    const r = await armonizarPiezaAction({
      fondoUrl: creativo.fondoUrl, fotoUrl: auto.url,
      x: auto.x, y: auto.y, ancho: auto.ancho,
    });
    setArmonizando(false);
    if (!r.ok) { toast.error("No se pudo armonizar", { description: r.mensaje }); return; }

    await cargarImagen(r.url);
    setCreativo((c) => ({ ...c, armonizadoUrl: r.url }));
    toast.success("Pieza armonizada", {
      description: "El vehículo quedó integrado. Mueve un texto o vuelve al montaje si quieres reubicarlo.",
    });
  }

  function descargar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `${actual.codigo}.jpg`;
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.click();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* lienzo */}
      <div className="flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          width={ANCHO}
          height={ALTO}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          className="max-h-[74vh] w-auto touch-none border border-border bg-card"
          style={{ aspectRatio: `${ANCHO}/${ALTO}` }}
        />
        <p className="text-[11.5px] text-muted-foreground">
          {creativo.armonizadoUrl
            ? `Arrastra los textos para acomodarlos. Se descarga en ${ANCHO}×${ALTO}.`
            : `Arrastra para ubicar. La foto se ve entera: su fondo lo quita la IA al poner el auto.`}
        </p>
      </div>

      {/* panel */}
      <aside className="space-y-5">
        {/*
          El orden cuenta el flujo: primero la IA mete el auto en la escena,
          después se acomodan los textos encima. Por eso poner el auto es la
          acción principal y descargar queda al final, no arriba.
        */}
        <div>
          <p className="etiqueta mb-1.5">1 · El auto en la escena</p>
          <Button
            onClick={armonizar}
            disabled={armonizando}
            variant={creativo.armonizadoUrl ? "outline" : "default"}
            className="h-9 w-full gap-2"
          >
            {armonizando ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {armonizando
              ? "Poniendo el auto…"
              : creativo.armonizadoUrl ? "Volver al montaje manual" : "Poner el auto con IA"}
          </Button>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {creativo.armonizadoUrl
              ? "Listo. Ahora mueve los textos: siguen siendo editables porque se dibujan encima."
              : "Le quita el fondo a la foto y mete el auto en la escena, con la luz, la sombra y el reflejo del lugar. Tarda ~20 s y tiene costo."}
          </p>
        </div>

        <Button onClick={descargar} variant="outline" className="h-9 w-full gap-2">
          <Download className="size-3.5" /> Descargar
        </Button>

        {/* Cambiar de auto o de fondo se hace mirando, no leyendo una lista. */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="etiqueta">Vehículo</p>
            <span className="truncate text-[11px] text-muted-foreground">{actual.titulo}</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {vehiculos.map((v) => (
              <button
                key={v.id}
                onClick={() => cambiarAuto(v.id)}
                title={`${v.titulo} · ${clp(v.precio)}`}
                className={cn(
                  "relative aspect-[4/3] w-16 shrink-0 border transition-colors",
                  v.id === actual.id ? "border-primary" : "border-border hover:border-muted-foreground",
                )}
              >
                {v.fotoPrincipal && (
                  <Image src={v.fotoPrincipal} alt="" fill sizes="64px" className="object-cover" />
                )}
                {cambiando === v.id && (
                  <span className="absolute inset-0 grid place-items-center bg-background/70">
                    <Loader2 className="size-3.5 animate-spin" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="etiqueta mb-1.5">Fondo</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {disponibles.map((f) => (
              <button
                key={f.id}
                onClick={() => setCreativo((c) => ({ ...c, fondoUrl: f.url, armonizadoUrl: null }))}
                title={f.nombre}
                className={cn(
                  "relative aspect-[9/16] w-11 shrink-0 border transition-colors",
                  creativo.fondoUrl === f.url ? "border-primary" : "border-border hover:border-muted-foreground",
                )}
              >
                <Image src={f.url!} alt="" fill sizes="44px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="etiqueta mb-2">
            {creativo.armonizadoUrl ? "2 · Textos" : "Capas"}
          </p>
          <ul className="divide-y border border-border">
            {[...creativo.elementos].reverse().map((el) => (
              <li key={el.id}>
                <button
                  onClick={() => setSeleccionado(el.id)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/40",
                    seleccionado === el.id && "bg-accent/60",
                  )}
                >
                  <span className="text-[12.5px]">{el.etiqueta}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {el.tipo === "texto" ? el.texto : "vehículo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {elemento?.tipo === "texto" && (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="etiqueta">{elemento.etiqueta}</p>

            <Campo label="Texto" htmlFor="texto">
              <input
                id="texto" value={elemento.texto} className={controlBase}
                onChange={(e) => actualizar(elemento.id, { texto: e.target.value })}
              />
            </Campo>

            <Campo label="Fuente" htmlFor="fuente">
              <Select
                id="fuente" value={elemento.fuente}
                onChange={(e) => actualizar(elemento.id, { fuente: e.target.value as Fuente })}
              >
                {FUENTES.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </Select>
            </Campo>

            <Deslizador
              etiqueta="Tamaño" valor={elemento.tamano} min={0.01} max={0.14} paso={0.002}
              formato={(v) => `${Math.round(v * ALTO)} px`}
              alCambiar={(v) => actualizar(elemento.id, { tamano: v })}
            />

            <Campo label="Peso" htmlFor="peso">
              <Select
                id="peso" value={String(elemento.peso)}
                onChange={(e) => actualizar(elemento.id, { peso: Number(e.target.value) })}
              >
                <option value="400">Normal</option>
                <option value="500">Medio</option>
                <option value="600">Seminegrita</option>
              </Select>
            </Campo>

            <div>
              <p className="etiqueta mb-1.5">Color</p>
              <div className="flex flex-wrap gap-1.5">
                {COLORES.map((c) => (
                  <button
                    key={c.id} title={c.nombre}
                    onClick={() => actualizar(elemento.id, { color: c.valor })}
                    style={{ background: c.valor }}
                    className={cn(
                      "size-6 border transition-transform",
                      elemento.color === c.valor ? "border-primary scale-110" : "border-border",
                    )}
                  />
                ))}
              </div>
            </div>

            <Campo label="Alineación" htmlFor="alineacion">
              <Select
                id="alineacion" value={elemento.alineacion}
                onChange={(e) => actualizar(elemento.id, { alineacion: e.target.value as Alineacion })}
              >
                <option value="izquierda">Izquierda</option>
                <option value="centro">Centro</option>
                <option value="derecha">Derecha</option>
              </Select>
            </Campo>

            <label className="flex items-center gap-2 text-[12.5px]">
              <input
                type="checkbox" checked={elemento.sombra}
                onChange={(e) => actualizar(elemento.id, { sombra: e.target.checked })}
              />
              Sombra bajo el texto
            </label>
          </div>
        )}

        {elemento?.tipo === "auto" && (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="etiqueta">Vehículo</p>
            {!elemento.url && (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Este vehículo no tiene fotos cargadas. Súbelas en su ficha del
                inventario y vuelve.
              </p>
            )}
            <Deslizador
              etiqueta="Tamaño" valor={elemento.ancho} min={0.3} max={2} paso={0.01}
              formato={(v) => `${Math.round(v * 100)} %`}
              alCambiar={(v) => actualizar(elemento.id, { ancho: v })}
            />
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              {creativo.armonizadoUrl
                ? "La sombra y el reflejo los puso la IA según el material del piso."
                : "Ubícalo y ajusta el tamaño; al poner el auto con IA se recorta el fondo de la foto y se le agregan sombra y reflejo."}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Deslizador({
  etiqueta, valor, min, max, paso, formato, alCambiar,
}: {
  etiqueta: string; valor: number; min: number; max: number; paso: number;
  formato: (v: number) => string; alCambiar: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="etiqueta">{etiqueta}</span>
        <span className="tabular text-[11px] text-muted-foreground">{formato(valor)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={paso} value={valor}
        onChange={(e) => alCambiar(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

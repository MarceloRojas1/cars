"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { comprimirImagen } from "@/lib/imagenes/comprimir";
import Image from "next/image";
import { ImagePlus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VehiclePhoto } from "@/lib/types";
import { VisorFotos } from "@/components/fotos/visor";

export const MAX_FOTOS = 50;

export type Foto = { url: string; nombre: string };

export function CargaDeFotos({ iniciales }: { iniciales?: VehiclePhoto[] }) {
  /*
   * LA PRIMERA ES LA PRINCIPAL.
   *
   * Antes la portada se marcaba con una estrella, independiente del orden. Al
   * poder arrastrar aparecían dos nociones de "primera" que podían
   * contradecirse: mover una foto al frente y que la portada siguiera siendo
   * otra. Ahora hay una sola regla, y la estrella pasó a ser un atajo para
   * traer una foto al principio.
   *
   * Las que vienen de la base se reordenan al cargar para que la principal
   * quede primera: en fichas viejas puede no estarlo.
   */
  const [fotos, setFotos] = useState<Foto[]>(() => {
    const lista = (iniciales ?? []).map((f) => ({
      url: f.url,
      nombre: f.url.split("/").pop() ?? "foto",
      esPrincipal: f.esPrincipal,
    }));
    const i = lista.findIndex((f) => f.esPrincipal);
    if (i > 0) lista.unshift(...lista.splice(i, 1));
    return lista.map(({ url, nombre }) => ({ url, nombre }));
  });

  /** Cuál se está arrastrando, para pintar el hueco donde va a caer. */
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [encima, setEncima] = useState<number | null>(null);
  /** Qué foto está abierta en el visor. */
  const [viendo, setViendo] = useState<number | null>(null);

  const [subiendo, setSubiendo] = useState(false);
  const [avance, setAvance] = useState<{ hechas: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const cupo = MAX_FOTOS - fotos.length;

  /**
   * Sube DIRECTO del navegador a Blob, sin pasar por una función de Vercel.
   *
   * Ese rodeo es lo que quita el tope de tamaño: una función tiene un límite de
   * cuerpo de ~4,5 MB, y una foto de celular moderno lo pasa sin esfuerzo. Acá
   * el archivo va del teléfono a la tienda; el servidor solo firma el permiso.
   *
   * Sin Blob configurado (desarrollo local) se cae al camino anterior, que
   * escribe en `public/uploads` y ahí sí manda el límite de la función.
   */
  async function subirDirecto(archivos: File[]): Promise<Foto[]> {
    const resultado: Foto[] = [];
    let hechas = 0;
    setAvance({ hechas: 0, total: archivos.length });

    /*
     * De a tres, no todas de golpe. Veinte subidas simultáneas se pelean el
     * ancho de banda: tardan lo mismo en total y la barra no se mueve hasta el
     * final, que es justo la sensación de "se colgó" que se quiere evitar.
     */
    const TANDA = 3;
    for (let i = 0; i < archivos.length; i += TANDA) {
      const tanda = await Promise.all(
        archivos.slice(i, i + TANDA).map(async (original) => {
          // Comprimir ANTES de subir: lo que tarda es transmitir.
          const { archivo } = await comprimirImagen(original);
          const subido = await upload(archivo.name, archivo, {
            access: "public",
            handleUploadUrl: "/api/fotos/token",
          });
          setAvance({ hechas: ++hechas, total: archivos.length });
          return { url: subido.url, nombre: original.name };
        }),
      );
      resultado.push(...tanda);
    }
    return resultado;
  }

  async function subirPorServidor(archivos: File[]): Promise<Foto[]> {
    const cuerpo = new FormData();
    archivos.forEach((f) => cuerpo.append("fotos", f));
    const res = await fetch("/api/fotos", { method: "POST", body: cuerpo });
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error ?? "No se pudieron subir las fotos.");
    return datos.fotos as Foto[];
  }

  async function subir(lista: FileList | null) {
    if (!lista?.length) return;
    setError(null);

    const elegidos = Array.from(lista);
    if (elegidos.length > cupo) {
      setError(`Solo caben ${cupo} fotos más. Se subirán las primeras ${cupo}.`);
      elegidos.length = cupo;
    }

    setSubiendo(true);
    try {
      let subidas: Foto[];
      try {
        subidas = await subirDirecto(elegidos);
      } catch (e) {
        /*
         * El endpoint del permiso responde 501 cuando no hay Blob: es el caso
         * de desarrollo local, no un fallo. Cualquier otro error sí se muestra.
         */
        const sinBlob = e instanceof Error && /501|almacenamiento de objetos/i.test(e.message);
        if (!sinBlob) throw e;
        subidas = await subirPorServidor(elegidos);
      }
      setFotos((prev) => [...prev, ...subidas]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setSubiendo(false);
      setAvance(null);
      if (input.current) input.current.value = "";
    }
  }

  function quitar(i: number) {
    setFotos((prev) => prev.filter((_, idx) => idx !== i));
    setViendo(null);
  }

  /** Mueve la foto `desde` a la posición `hasta`, corriendo el resto. */
  function reordenar(desde: number, hasta: number) {
    if (desde === hasta) return;
    setFotos((prev) => {
      const copia = [...prev];
      const [movida] = copia.splice(desde, 1);
      copia.splice(hasta, 0, movida);
      return copia;
    });
  }

  /*
   * Arrastrar con el teclado.
   *
   * La API de arrastre del navegador no responde al teclado ni al dedo, así que
   * sin esto el orden de las fotos sería inalcanzable para quien no use mouse.
   * Con la miniatura enfocada, las flechas la mueven.
   */
  function alPulsarEnFoto(e: React.KeyboardEvent, i: number) {
    /*
     * Con el visor abierto, NO.
     *
     * La miniatura conserva el foco detrás del modal, así que las flechas
     * llegaban a los dos sitios: navegaban el visor y además movían la foto de
     * lugar. Mirar las fotos terminaba reordenándolas sin que nadie lo pidiera.
     */
    if (viendo !== null) return;

    const paso = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (paso === 0) return;
    const destino = i + paso;
    if (destino < 0 || destino >= fotos.length) return;
    e.preventDefault();
    reordenar(i, destino);
    // El foco sigue a la foto, no se queda en la posición.
    requestAnimationFrame(() => {
      document.getElementById(`foto-${destino}`)?.focus();
    });
  }

  return (
    <div className="sm:col-span-2">
      {/*
        Lo que viaja al servidor. El ORDEN del array es el orden de la galería
        —`crearVehiculo` guarda el índice en `vehicle_photo.orden`— y la primera
        va marcada como principal.
      */}
      <input
        type="hidden"
        name="fotos"
        value={JSON.stringify(
          fotos.map((f, i) => ({ url: f.url, esPrincipal: i === 0 })),
        )}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="etiqueta">Fotos</p>
        <p className="tabular text-[11.5px] text-muted-foreground">
          {fotos.length}/{MAX_FOTOS}
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); subir(e.dataTransfer.files); }}
        className="border border-dashed border-border px-6 py-8 text-center"
      >
        <ImagePlus className="mx-auto size-5 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-2.5 text-[13px]">Arrastra las fotos o elígelas del computador</p>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          JPG, PNG, WebP o AVIF · hasta 8 MB cada una · máximo {MAX_FOTOS}
        </p>
        <input
          ref={input} type="file" accept="image/*" multiple hidden
          onChange={(e) => subir(e.target.files)}
        />
        <Button
          type="button" variant="outline" className="mt-4 h-9"
          disabled={subiendo || cupo <= 0}
          onClick={() => input.current?.click()}
        >
          {subiendo
            ? avance
              ? `Subiendo ${avance.hechas} de ${avance.total}…`
              : "Preparando…"
            : cupo <= 0 ? "Llegaste al máximo" : "Elegir fotos"}
        </Button>
      </div>

      {error && <p className="mt-2 text-[11.5px] text-crit">{error}</p>}

      {fotos.length > 0 && (
        <>
          <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
            <span className="text-foreground">La primera es la portada</span> — se ve en
            el listado, en los portales y primero en el catálogo. Arrástralas para
            cambiar el orden, o muévelas con las flechas del teclado. Haz clic en una
            para verla en grande.
          </p>

          <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
            {fotos.map((foto, i) => (
              <li
                key={foto.url}
                draggable
                onDragStart={(e) => {
                  setArrastrando(i);
                  e.dataTransfer.effectAllowed = "move";
                  /*
                   * Hay que escribir ALGO en el portapapeles del arrastre o
                   * Firefox no inicia el gesto. Y sirve para distinguir este
                   * arrastre del de archivos: aquel trae `files`, este no.
                   */
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragEnd={() => { setArrastrando(null); setEncima(null); }}
                onDragOver={(e) => {
                  if (arrastrando === null) return;   // es un archivo, no una foto
                  e.preventDefault();
                  e.stopPropagation();
                  setEncima(i);
                }}
                onDrop={(e) => {
                  if (arrastrando === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  reordenar(arrastrando, i);
                  setArrastrando(null);
                  setEncima(null);
                }}
                className={cn(
                  "group relative aspect-[4/3] border transition-opacity",
                  i === 0 ? "border-foreground" : "border-border",
                  arrastrando === i && "opacity-40",
                  encima === i && arrastrando !== i && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                {/*
                  La imagen es un botón: clic la abre en grande. Las flechas la
                  mueven de lugar, que es el reemplazo de teclado del arrastre.
                */}
                <button
                  type="button"
                  id={`foto-${i}`}
                  onClick={() => setViendo(i)}
                  onKeyDown={(e) => alPulsarEnFoto(e, i)}
                  aria-label={`Ver ${foto.nombre} en grande. Posición ${i + 1} de ${fotos.length}. Usa las flechas para moverla.`}
                  className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Image
                    src={foto.url} alt={foto.nombre} fill sizes="200px"
                    className="object-cover"
                  />
                </button>

                {/* Atajo: trae la foto al frente, que es lo mismo que hacerla portada. */}
                {i !== 0 && (
                  <button
                    type="button" onClick={() => reordenar(i, 0)}
                    aria-label={`Hacer portada a ${foto.nombre}`}
                    title="Hacer portada"
                    className="absolute left-1 top-1 grid size-6 place-items-center border border-border bg-background/85 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <Star className="size-3" />
                  </button>
                )}

                <button
                  type="button" onClick={() => quitar(i)}
                  aria-label={`Quitar ${foto.nombre}`}
                  className="absolute right-1 top-1 grid size-6 place-items-center border border-border bg-background/85 text-muted-foreground opacity-0 transition-opacity hover:text-crit group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>

                {i === 0 ? (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-foreground py-0.5 text-center text-[10px] font-medium text-background">
                    Portada
                  </span>
                ) : (
                  <span className="tabular pointer-events-none absolute bottom-1 right-1 grid size-5 place-items-center bg-background/85 text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <VisorFotos
        fotos={fotos}
        indice={viendo}
        onCerrar={() => setViendo(null)}
        onCambiar={setViendo}
      />
    </div>
  );
}

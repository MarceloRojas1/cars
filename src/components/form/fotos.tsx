"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { ImagePlus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VehiclePhoto } from "@/lib/types";

export const MAX_FOTOS = 50;

export type Foto = { url: string; nombre: string };

export function CargaDeFotos({ iniciales }: { iniciales?: VehiclePhoto[] }) {
  const [fotos, setFotos] = useState<Foto[]>(
    () => (iniciales ?? []).map((f) => ({ url: f.url, nombre: f.url.split("/").pop() ?? "foto" })),
  );
  const [principal, setPrincipal] = useState(
    () => Math.max(0, (iniciales ?? []).findIndex((f) => f.esPrincipal)),
  );
  const [subiendo, setSubiendo] = useState(false);
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
    return Promise.all(
      archivos.map(async (archivo) => {
        const subido = await upload(archivo.name, archivo, {
          access: "public",
          handleUploadUrl: "/api/fotos/token",
        });
        return { url: subido.url, nombre: archivo.name };
      }),
    );
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
      if (input.current) input.current.value = "";
    }
  }

  function quitar(i: number) {
    setFotos((prev) => prev.filter((_, idx) => idx !== i));
    setPrincipal((p) => (i === p ? 0 : i < p ? p - 1 : p));
  }

  return (
    <div className="sm:col-span-2">
      {/* lo que realmente viaja al servidor */}
      <input
        type="hidden"
        name="fotos"
        value={JSON.stringify(
          fotos.map((f, i) => ({ url: f.url, esPrincipal: i === principal })),
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
          {subiendo ? "Subiendo…" : cupo <= 0 ? "Llegaste al máximo" : "Elegir fotos"}
        </Button>
      </div>

      {error && <p className="mt-2 text-[11.5px] text-crit">{error}</p>}

      {fotos.length > 0 && (
        <>
          <p className="mt-4 text-[11.5px] text-muted-foreground">
            La foto principal es la que se ve en el listado y en los portales.
            Haz clic en la estrella para cambiarla.
          </p>
          <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
            {fotos.map((foto, i) => (
              <li
                key={foto.url}
                className={cn(
                  "group relative aspect-[4/3] border",
                  i === principal ? "border-foreground" : "border-border",
                )}
              >
                <Image
                  src={foto.url} alt={foto.nombre} fill sizes="200px"
                  className="object-cover"
                />
                <button
                  type="button" onClick={() => setPrincipal(i)}
                  aria-label={`Marcar ${foto.nombre} como principal`}
                  aria-pressed={i === principal}
                  className={cn(
                    "absolute left-1 top-1 grid size-6 place-items-center border bg-background/85",
                    i === principal
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
                  )}
                >
                  <Star className={cn("size-3", i === principal && "fill-current")} />
                </button>
                <button
                  type="button" onClick={() => quitar(i)}
                  aria-label={`Quitar ${foto.nombre}`}
                  className="absolute right-1 top-1 grid size-6 place-items-center border border-border bg-background/85 text-muted-foreground opacity-0 transition-opacity hover:text-crit group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
                {i === principal && (
                  <span className="absolute inset-x-0 bottom-0 bg-foreground py-0.5 text-center text-[10px] font-medium text-background">
                    Principal
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

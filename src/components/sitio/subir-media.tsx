"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { comprimirImagen } from "@/lib/imagenes/comprimir";
import { Campo } from "@/components/form/campos";

/**
 * Sube un archivo suelto (logo, portada, diapositiva) y devuelve su URL.
 *
 * Va directo del navegador a Blob, igual que las fotos de vehículos: un video
 * de portada pesa más que cualquier foto, y por una función de Vercel no
 * pasaría. Las imágenes se comprimen antes; los videos NO, porque recodificar
 * video en el navegador tarda más de lo que ahorra.
 */
export function SubirMedia({
  etiqueta, valor, alCambiar, admiteVideo = false,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (url: string, esVideo: boolean) => void;
  admiteVideo?: boolean;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setError("");
    setSubiendo(true);
    try {
      const esVideo = archivo.type.startsWith("video/");
      const aSubir = esVideo ? archivo : (await comprimirImagen(archivo)).archivo;
      const subido = await upload(aSubir.name, aSubir, {
        access: "public",
        handleUploadUrl: "/api/fotos/token",
      });
      alCambiar(subido.url, esVideo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  }

  const esVideo = /\.(mp4|webm|mov)$/i.test(valor);

  return (
    <Campo label={etiqueta} ancho="completo">
      <div className="flex items-center gap-3">
        {valor && (
          <span className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius)] border border-border bg-muted">
            {esVideo ? (
              <video src={valor} muted className="size-full object-cover" />
            ) : (
              <Image src={valor} alt="" fill sizes="56px" className="object-cover" />
            )}
          </span>
        )}

        <input
          ref={input}
          type="file"
          accept={admiteVideo ? "image/*,video/mp4,video/webm" : "image/*"}
          hidden
          onChange={(e) => elegir(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={subiendo}
          className="h-9 rounded-[var(--radius)] border border-border px-3.5 text-[13px] hover:bg-accent disabled:opacity-60"
        >
          {subiendo ? "Subiendo…" : valor ? "Cambiar" : "Elegir archivo"}
        </button>

        {valor && !subiendo && (
          <button
            type="button"
            onClick={() => alCambiar("", false)}
            className="text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            Quitar
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[11.5px] text-crit">{error}</p>}
    </Campo>
  );
}

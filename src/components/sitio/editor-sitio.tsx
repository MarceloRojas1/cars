"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  eliminarDiapositivaAction, guardarDiapositivaAction, guardarSitioAction,
  type EstadoSitio,
} from "@/app/(app)/mi-sitio-web/acciones";
import { Button } from "@/components/ui/button";
import { Campo, Select, controlBase } from "@/components/form/campos";
import { SubirMedia } from "@/components/sitio/subir-media";
import type { ConfigSitio, Diapositiva } from "@/lib/data";

const INICIAL: EstadoSitio = { ok: false, mensaje: "" };

const POSICIONES = [
  ["top-left", "Arriba izquierda"], ["top-center", "Arriba centro"], ["top-right", "Arriba derecha"],
  ["center-left", "Centro izquierda"], ["center-center", "Centro"], ["center-right", "Centro derecha"],
  ["bottom-left", "Abajo izquierda"], ["bottom-center", "Abajo centro"], ["bottom-right", "Abajo derecha"],
];

export function EditorSitio({
  config, diapositivas, slug,
}: {
  config: ConfigSitio;
  diapositivas: Diapositiva[];
  slug: string;
}) {
  return (
    <div className="space-y-9">
      <Identidad config={config} slug={slug} />
      <Diapositivas diapositivas={diapositivas} />
    </div>
  );
}

function Identidad({ config, slug }: { config: ConfigSitio; slug: string }) {
  const [estado, enviar, pendiente] = useActionState(guardarSitioAction, INICIAL);
  const [color, setColor] = useState(config.color);
  const [logo, setLogo] = useState(config.logoUrl ?? "");
  const [portada, setPortada] = useState(config.portadaUrl ?? "");

  return (
    <section className="border border-border bg-card p-5">
      <h2 className="etiqueta mb-1">Identidad</h2>
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        Es lo que ve un comprador en <span className="tabular text-foreground">/{slug}</span>.
        El catálogo es tu sitio, no el nuestro.
      </p>

      <form action={enviar} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="logoUrl" value={logo} />
        <input type="hidden" name="portadaUrl" value={portada} />

        <Campo label="Color de tu marca" htmlFor="color">
          <div className="flex items-center gap-2">
            <input
              type="color" value={color} aria-label="Elegir color"
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="size-9 shrink-0 cursor-pointer rounded-[var(--radius)] border border-border bg-transparent"
            />
            <input
              id="color" name="color" value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className={`${controlBase} tabular`}
            />
          </div>
        </Campo>

        <Campo label="Título de la portada" htmlFor="heroTitulo" hint="Si lo dejas vacío, se usa el nombre de la automotora.">
          <input id="heroTitulo" name="heroTitulo" defaultValue={config.heroTitulo} className={controlBase} />
        </Campo>

        <Campo label="Eslogan" htmlFor="heroSubtitulo" ancho="completo">
          <input id="heroSubtitulo" name="heroSubtitulo" defaultValue={config.heroSubtitulo} className={controlBase} />
        </Campo>

        <SubirMedia etiqueta="Logo" valor={logo} alCambiar={setLogo} />
        <SubirMedia etiqueta="Imagen de portada" valor={portada} alCambiar={setPortada} />

        {estado.mensaje && (
          <p className={`text-[12.5px] sm:col-span-2 ${estado.ok ? "text-ok" : "text-crit"}`}>
            {estado.mensaje}
          </p>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" disabled={pendiente} className="h-9">
            {pendiente ? "Guardando…" : "Guardar identidad"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Diapositivas({ diapositivas }: { diapositivas: Diapositiva[] }) {
  const [nueva, setNueva] = useState(false);

  return (
    <section className="border border-border bg-card p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="etiqueta">Portada con diapositivas</h2>
        {!nueva && (
          <button type="button" onClick={() => setNueva(true)} className="text-[12.5px] text-primary hover:underline">
            Agregar diapositiva
          </button>
        )}
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-muted-foreground">
        Imágenes o videos que se van alternando arriba del catálogo. Sin ninguna,
        se muestra una portada simple con tu color y tu eslogan.
      </p>

      <div className="space-y-3">
        {diapositivas.map((d) => (
          <FormularioDiapositiva key={d.id} diapositiva={d} />
        ))}
        {nueva && (
          <FormularioDiapositiva
            diapositiva={{
              id: "", mediaUrl: "", tipo: "imagen", posicion: "bottom-left",
              orden: diapositivas.length,
            }}
            alCerrar={() => setNueva(false)}
          />
        )}
        {diapositivas.length === 0 && !nueva && (
          <p className="py-6 text-center text-[12.5px] text-muted-foreground">
            Todavía no hay diapositivas.
          </p>
        )}
      </div>
    </section>
  );
}

function FormularioDiapositiva({
  diapositiva, alCerrar,
}: {
  diapositiva: Diapositiva;
  alCerrar?: () => void;
}) {
  const [estado, enviar, pendiente] = useActionState(guardarDiapositivaAction, INICIAL);
  const [media, setMedia] = useState(diapositiva.mediaUrl);
  const [tipo, setTipo] = useState(diapositiva.tipo);
  const esNueva = !diapositiva.id;

  async function borrar() {
    const r = await eliminarDiapositivaAction(diapositiva.id);
    toast[r.ok ? "success" : "error"](r.mensaje);
  }

  return (
    <form action={enviar} className="grid gap-3 border border-border bg-background p-4 sm:grid-cols-2">
      {!esNueva && <input type="hidden" name="id" value={diapositiva.id} />}
      <input type="hidden" name="mediaUrl" value={media} />
      <input type="hidden" name="tipo" value={tipo} />

      <div className="sm:col-span-2">
        <SubirMedia
          etiqueta={esNueva ? "Imagen o video" : "Cambiar medio"}
          valor={media}
          admiteVideo
          alCambiar={(url, esVideo) => { setMedia(url); setTipo(esVideo ? "video" : "imagen"); }}
        />
      </div>

      <Campo label="Texto superior" htmlFor={`ts-${diapositiva.id}`}>
        <input id={`ts-${diapositiva.id}`} name="textoSuperior" defaultValue={diapositiva.textoSuperior} className={controlBase} />
      </Campo>
      <Campo label="Título" htmlFor={`t-${diapositiva.id}`}>
        <input id={`t-${diapositiva.id}`} name="titulo" defaultValue={diapositiva.titulo} className={controlBase} />
      </Campo>
      <Campo label="Subtítulo" htmlFor={`s-${diapositiva.id}`} ancho="completo">
        <input id={`s-${diapositiva.id}`} name="subtitulo" defaultValue={diapositiva.subtitulo} className={controlBase} />
      </Campo>
      <Campo label="Texto del botón" htmlFor={`bt-${diapositiva.id}`}>
        <input id={`bt-${diapositiva.id}`} name="btnTexto" defaultValue={diapositiva.btnTexto} className={controlBase} />
      </Campo>
      <Campo label="Enlace del botón" htmlFor={`bl-${diapositiva.id}`}>
        <input id={`bl-${diapositiva.id}`} name="btnLink" defaultValue={diapositiva.btnLink} className={controlBase} />
      </Campo>
      <Campo label="Posición del texto" htmlFor={`p-${diapositiva.id}`}>
        <Select id={`p-${diapositiva.id}`} name="posicion" defaultValue={diapositiva.posicion}>
          {POSICIONES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </Select>
      </Campo>
      <Campo label="Orden" htmlFor={`o-${diapositiva.id}`}>
        <input id={`o-${diapositiva.id}`} name="orden" type="number" min={0} max={99}
               defaultValue={diapositiva.orden} className={`${controlBase} tabular`} />
      </Campo>

      {estado.mensaje && (
        <p className={`text-[12.5px] sm:col-span-2 ${estado.ok ? "text-ok" : "text-crit"}`}>
          {estado.mensaje}
        </p>
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pendiente || !media} className="h-9">
          {pendiente ? "Guardando…" : esNueva ? "Agregar" : "Guardar"}
        </Button>
        {esNueva ? (
          <button type="button" onClick={alCerrar} className="text-[13px] text-muted-foreground hover:text-foreground">
            Cancelar
          </button>
        ) : (
          <button type="button" onClick={borrar}
                  className="ml-auto flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-crit">
            <Trash2 className="size-3.5" /> Eliminar
          </button>
        )}
      </div>
    </form>
  );
}

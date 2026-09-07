"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  crearFaqAction, eliminarFaqAction, guardarAsistenteAction,
  type EstadoAsistente, type ResultadoFaq,
} from "@/app/(app)/asistente-ia/acciones";
import { Campo, Seccion, controlBase } from "@/components/form/campos";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AssistantConfig, KnowledgeItem } from "@/lib/types";

const inicialAsistente: EstadoAsistente = {};
const inicialFaq: ResultadoFaq = { ok: false, mensaje: "" };

function Toggle({
  id, label, hint, checked, onCheckedChange, children,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <Switch id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(Boolean(v))} />
        <label htmlFor={id} className="flex-1 text-[13.5px]">{label}</label>
        <input type="hidden" name={id} value={checked ? "true" : "false"} />
      </div>
      {hint && <p className="mt-1.5 pl-[44px] text-[11.5px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export function PanelAsistente({
  config, faq, modeloConectado,
}: {
  config: AssistantConfig;
  faq: KnowledgeItem[];
  modeloConectado?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(guardarAsistenteAction, inicialAsistente);

  const [triggerCtwa, setTriggerCtwa] = useState(config.triggerCtwa);
  const [triggerNuevos, setTriggerNuevos] = useState(config.triggerContactosNuevos);
  const [triggerExistentes, setTriggerExistentes] = useState(config.triggerContactosExistentes);
  const [svcConsignacion, setSvcConsignacion] = useState(config.servicioConsignacion);
  const [svcCompra, setSvcCompra] = useState(config.servicioCompraDirecta);
  const [svcFinanciamiento, setSvcFinanciamiento] = useState(config.servicioFinanciamiento);
  const [modoConsultor, setModoConsultor] = useState(config.modoConsultor);

  return (
    <>
      <form action={enviar}>
        <Seccion
          numero="01" titulo="Cuándo responde"
          descripcion="El bot solo atiende Nuevo, Calificando y Sin Respuesta. Desde Calificado en adelante lo lleva una persona."
        >
          <div className="sm:col-span-2 space-y-2.5">
            <Toggle
              id="triggerCtwa" checked={triggerCtwa} onCheckedChange={setTriggerCtwa}
              label="Leads que llegan desde un anuncio (CTWA)"
              hint="El chat nació de un clic en un anuncio de Instagram o Facebook."
            />
            <Toggle
              id="triggerContactosNuevos" checked={triggerNuevos} onCheckedChange={setTriggerNuevos}
              label="Contactos nuevos por WhatsApp"
              hint="Alguien escribe por primera vez, sin venir de una campaña."
            />
            <Toggle
              id="triggerContactosExistentes" checked={triggerExistentes} onCheckedChange={setTriggerExistentes}
              label="Contactos que ya existían antes del bot"
              hint="Números que ya estaban en tu WhatsApp cuando activaste el asistente."
            />
          </div>
        </Seccion>

        <Seccion numero="02" titulo="Qué puede ofrecer" descripcion="Lo que el bot puede mencionar mientras califica.">
          <div className="sm:col-span-2 space-y-2.5">
            <Toggle
              id="servicioConsignacion" checked={svcConsignacion} onCheckedChange={setSvcConsignacion}
              label="Consignación"
            />
            <Toggle
              id="servicioCompraDirecta" checked={svcCompra} onCheckedChange={setSvcCompra}
              label="Compra directa del vehículo del cliente"
            />
            <Toggle
              id="servicioFinanciamiento" checked={svcFinanciamiento} onCheckedChange={setSvcFinanciamiento}
              label="Financiamiento"
            >
              {svcFinanciamiento && (
                <div className="mt-3 max-w-[220px] pl-[44px]">
                  <Campo
                    label="Antigüedad máxima financiable" htmlFor="antiguedadMaxFinanciamiento"
                    hint="Años desde la fabricación." error={estado.errores?.antiguedadMaxFinanciamiento}
                  >
                    <input
                      id="antiguedadMaxFinanciamiento" name="antiguedadMaxFinanciamiento"
                      inputMode="numeric" defaultValue={config.antiguedadMaxFinanciamiento}
                      className={cn(controlBase, "tabular")}
                    />
                  </Campo>
                </div>
              )}
            </Toggle>
            <Toggle
              id="modoConsultor" checked={modoConsultor} onCheckedChange={setModoConsultor}
              label="Modo consultor"
              hint="Responde dudas generales aunque el lead todavía no muestre intención de compra."
            />
          </div>
        </Seccion>

        <Seccion
          numero="03" titulo="Personalidad"
          descripcion={modeloConectado
            ? `Corre sobre ${modeloConectado}. Cámbialo desde Integraciones.`
            : "Cómo se presenta y cómo escribe."}
        >
          <Campo label="Nombre del agente" htmlFor="nombreAgente" error={estado.errores?.nombreAgente}>
            <input
              id="nombreAgente" name="nombreAgente" defaultValue={config.nombreAgente}
              className={controlBase}
            />
          </Campo>
          <Campo label="Saludo inicial" htmlFor="saludo" hint="Vacío usa uno genérico con el nombre del agente.">
            <input id="saludo" name="saludo" defaultValue={config.saludo} className={controlBase} />
          </Campo>
          <Campo label="Tono" htmlFor="tono" hint="Cercano, formal, directo…" ancho="completo">
            <input id="tono" name="tono" defaultValue={config.tono} className={controlBase} />
          </Campo>
          <Campo
            label="Instrucciones" htmlFor="instrucciones" ancho="completo"
            hint="Cómo debe calificar, qué preguntar antes de traspasar a una persona."
          >
            <textarea
              id="instrucciones" name="instrucciones" rows={5}
              defaultValue={config.instrucciones}
              className={cn(controlBase, "h-auto resize-y py-2 leading-relaxed")}
            />
          </Campo>
          <Campo
            label="Prohibiciones" htmlFor="prohibiciones" ancho="completo"
            hint="Lo que nunca debe hacer: prometer precio final, hablar de la competencia, etc."
          >
            <textarea
              id="prohibiciones" name="prohibiciones" rows={4}
              defaultValue={config.prohibiciones}
              className={cn(controlBase, "h-auto resize-y py-2 leading-relaxed")}
            />
          </Campo>
        </Seccion>

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="submit" disabled={pendiente} className="h-9">
            {pendiente ? "Guardando…" : "Guardar comportamiento"}
          </Button>
          {estado.mensaje && (
            <p className={cn("text-[12.5px]", estado.ok ? "text-ok" : "text-crit")}>
              {estado.mensaje}
            </p>
          )}
        </div>
      </form>

      <Seccion
        numero="04" titulo="Base de conocimiento"
        descripcion="Preguntas frecuentes que el bot puede citar al responder."
      >
        <div className="sm:col-span-2">
          <ListaFaq items={faq} />
        </div>
      </Seccion>
    </>
  );
}

function ListaFaq({ items }: { items: KnowledgeItem[] }) {
  const [estado, enviar, pendiente] = useActionState(crearFaqAction, inicialFaq);
  const [borrando, iniciarBorrado] = useTransition();

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <ul className="divide-y border border-border bg-card">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{item.titulo}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {item.contenido}
                </p>
              </div>
              <Button
                type="button" variant="ghost" size="icon" className="size-8 shrink-0"
                disabled={borrando} aria-label={`Borrar ${item.titulo}`}
                onClick={() => iniciarBorrado(async () => { await eliminarFaqAction(item.id); })}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form action={enviar} className="grid gap-3 border border-dashed border-border p-4 sm:grid-cols-[1fr_2fr_auto]">
        <input name="titulo" placeholder="Título" className={controlBase} />
        <input name="contenido" placeholder="Respuesta" className={controlBase} />
        <Button type="submit" disabled={pendiente} className="h-9 gap-1.5">
          <Plus className="size-3.5" /> Agregar
        </Button>
        {estado.mensaje && !estado.ok && (
          <p className="text-[12px] text-crit sm:col-span-3">{estado.mensaje}</p>
        )}
      </form>
    </div>
  );
}

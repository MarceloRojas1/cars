"use client";

import { useActionState } from "react";
import { enviarFormularioAction, type EstadoFormulario } from "@/app/[slug]/[pagina]/acciones";
import { Campo, controlBase } from "@/components/form/campos";

const INICIAL: EstadoFormulario = { ok: false, mensaje: "" };

/** Qué pide cada formulario. El de contacto no necesita saber de qué auto. */
const CAMPOS: Record<string, { vehiculo?: string; mensaje: string; boton: string }> = {
  cotizar: {
    vehiculo: "Tu auto (marca, modelo y año)",
    mensaje: "Kilometraje, estado y lo que quieras contarnos",
    boton: "Pedir cotización",
  },
  consignar: {
    vehiculo: "Tu auto (marca, modelo y año)",
    mensaje: "Cuéntanos del auto y en cuánto lo quieres vender",
    boton: "Quiero consignar",
  },
  financiar: {
    vehiculo: "Auto que te interesa",
    mensaje: "Cuánto puedes dar de pie y en cuántas cuotas te acomoda",
    boton: "Consultar financiamiento",
  },
  contacto: { mensaje: "Tu mensaje", boton: "Enviar" },
};

export function FormularioSitio({
  tipo, slug, color,
}: {
  tipo: keyof typeof CAMPOS;
  slug: string;
  color: string;
}) {
  const [estado, enviar, pendiente] = useActionState(enviarFormularioAction, INICIAL);
  const campos = CAMPOS[tipo] ?? CAMPOS.contacto;

  /*
   * Con el envío exitoso desaparece el formulario. Dejarlo abierto invita a
   * mandar lo mismo otra vez, y en el embudo eso son dos leads de una persona.
   */
  if (estado.ok) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="display text-[20px]">{estado.mensaje}</p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Revisa tu WhatsApp: es por ahí donde solemos responder primero.
        </p>
      </div>
    );
  }

  return (
    <form action={enviar} className="grid gap-4 rounded-lg border border-border p-6 sm:grid-cols-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="tipo" value={tipo} />

      <Campo label="Nombre" htmlFor={`n-${tipo}`}>
        <input id={`n-${tipo}`} name="nombre" required className={controlBase} />
      </Campo>
      <Campo label="Teléfono" htmlFor={`t-${tipo}`}>
        <input id={`t-${tipo}`} name="telefono" type="tel" required placeholder="+56 9 …" className={controlBase} />
      </Campo>
      <Campo label="Correo (opcional)" htmlFor={`e-${tipo}`} ancho={campos.vehiculo ? "medio" : "completo"}>
        <input id={`e-${tipo}`} name="email" type="email" className={controlBase} />
      </Campo>
      {campos.vehiculo && (
        <Campo label={campos.vehiculo} htmlFor={`v-${tipo}`}>
          <input id={`v-${tipo}`} name="vehiculo" className={controlBase} />
        </Campo>
      )}
      <Campo label={campos.mensaje} htmlFor={`m-${tipo}`} ancho="completo">
        <textarea id={`m-${tipo}`} name="mensaje" rows={4} className={controlBase} />
      </Campo>

      {estado.mensaje && !estado.ok && (
        <p role="alert" className="text-[12.5px] text-crit sm:col-span-2">{estado.mensaje}</p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendiente}
          style={{ backgroundColor: color }}
          className="h-11 rounded-[var(--radius)] px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pendiente ? "Enviando…" : campos.boton}
        </button>
      </div>
    </form>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Seccion({
  numero, titulo, descripcion, children,
}: {
  numero: string;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-8 border-t border-border py-8 lg:grid-cols-[220px_1fr]">
      <header>
        <p className="etiqueta">{numero}</p>
        <h2 className="display mt-1.5 text-[19px]">{titulo}</h2>
        {descripcion && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {descripcion}
          </p>
        )}
      </header>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Campo({
  label, htmlFor, hint, error, ancho = "medio", children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string[];
  ancho?: "medio" | "completo";
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", ancho === "completo" && "sm:col-span-2")}>
      <label htmlFor={htmlFor} className="etiqueta">
        {label}
      </label>
      {children}
      {hint && !error?.length && (
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      )}
      {error?.length ? <p className="text-[11.5px] text-crit">{error[0]}</p> : null}
    </div>
  );
}

/** Estilo único para todos los controles nativos: aristas rectas, sin sombra. */
export const controlBase =
  "h-9 w-full border border-input bg-transparent px-2.5 text-[13.5px] " +
  "outline-none transition-colors placeholder:text-muted-foreground/60 " +
  "focus:border-ring disabled:opacity-50";

export function Select(props: React.ComponentProps<"select">) {
  return (
    <select {...props} className={cn(controlBase, "appearance-none pr-8", props.className)} />
  );
}

"use client";

import { useState } from "react";
import { PLAZOS, simular } from "@/lib/catalogo/financiamiento";
import { clp } from "@/lib/format";

const PIES = [0.1, 0.2, 0.3, 0.4];

/**
 * Simulador de cuota. Es una estimación y la pantalla lo dice explícitamente:
 * la tasa real la fija la financiera, no nosotros.
 */
export function Simulador({ precio, pieSugerido }: { precio: number; pieSugerido?: number }) {
  const [piePct, setPiePct] = useState(
    pieSugerido && precio > 0
      ? PIES.reduce((a, b) =>
          Math.abs(b - pieSugerido / precio) < Math.abs(a - pieSugerido / precio) ? b : a)
      : 0.2,
  );
  const [meses, setMeses] = useState<number>(48);
  const s = simular(precio, piePct, meses);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="etiqueta mb-3">Simula tu crédito</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px] text-muted-foreground">
          Pie
          <select
            value={piePct} onChange={(e) => setPiePct(Number(e.target.value))}
            className="mt-1 h-9 w-full rounded-[var(--radius)] border border-border bg-background px-2.5 text-[13px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {PIES.map((p) => (
              <option key={p} value={p}>{Math.round(p * 100)}% · {clp(Math.round(precio * p))}</option>
            ))}
          </select>
        </label>

        <label className="text-[12px] text-muted-foreground">
          Plazo
          <select
            value={meses} onChange={(e) => setMeses(Number(e.target.value))}
            className="mt-1 h-9 w-full rounded-[var(--radius)] border border-border bg-background px-2.5 text-[13px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {PLAZOS.map((m) => <option key={m} value={m}>{m} meses</option>)}
          </select>
        </label>
      </div>

      <p className="tabular mt-4 text-[24px] font-medium leading-none">
        {clp(s.desde)} <span className="text-muted-foreground">–</span> {clp(s.hasta)}
        <span className="ml-1 text-[13px] font-normal text-muted-foreground">/mes</span>
      </p>
      <p className="tabular mt-2 text-[12px] text-muted-foreground">
        Financias {clp(s.financiado)} en {meses} cuotas.
      </p>
      <p className="mt-3 border-t border-border pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Estimación referencial con una tasa de 1,7 % a 1,9 % mensual. No es una oferta
        de crédito: la tasa final la define la financiera según tu evaluación.
      </p>
    </section>
  );
}

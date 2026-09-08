import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getIntegrations } from "@/lib/data";
import { IntegracionClaude } from "@/components/integraciones/claude";
import { hayClaveMaestra } from "@/lib/cripto";
import type { Integration } from "@/lib/types";

export const metadata = { title: "Integraciones" };

const GRUPOS: { id: Integration["grupo"]; titulo: string }[] = [
  { id: "comunicacion", titulo: "Comunicación" },
  { id: "asistente", titulo: "Asistente IA" },
  { id: "marketplaces", titulo: "Publicación en marketplaces" },
  { id: "social", titulo: "Redes sociales y campañas" },
];

const ESTADO: Record<Integration["estado"], { texto: string; clase: string }> = {
  conectado: { texto: "Conectado", clase: "text-ok" },
  incluido: { texto: "Incluido", clase: "text-primary" },
  no_conectado: { texto: "No conectado", clase: "text-muted-foreground" },
};

export default async function IntegracionesPage() {
  const integraciones = await getIntegrations();
  const puedeGuardarClaves = hayClaveMaestra();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Integraciones"
        descripcion="Conecta tus canales de comunicación, publicación e inteligencia artificial"
      />

      {!puedeGuardarClaves && (
        <p className="mb-5 border-l-2 border-l-warn bg-warn/[0.06] px-4 py-3 text-[12.5px] leading-relaxed">
          <span className="text-warn">Falta la clave maestra del servidor.</span>{" "}
          <span className="text-muted-foreground">
            Sin <code className="tabular">APP_ENCRYPTION_KEY</code> no se pueden
            guardar credenciales cifradas.
          </span>
        </p>
      )}

      <div className="space-y-6">
        {GRUPOS.map((g) => {
          const items = integraciones.filter((i) => i.grupo === g.id);
          if (!items.length) return null;
          return (
            <section key={g.id}>
              <h2 className="etiqueta mb-2.5">
                {g.titulo}
              </h2>
              <ul className="divide-y border border-border bg-card">
                {items.map((i) => (
                  <li key={i.id}>
                    {i.id === "int_claude" ? (
                      <IntegracionClaude integracion={i} />
                    ) : (
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium">{i.nombre}</p>
                          <p className="truncate text-[12px] text-muted-foreground">{i.descripcion}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[12.5px] ${ESTADO[i.estado].clase}`}>
                            {ESTADO[i.estado].texto}
                          </p>
                          {i.detalle && (
                            <p className="text-[11px] text-muted-foreground">{i.detalle}</p>
                          )}
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

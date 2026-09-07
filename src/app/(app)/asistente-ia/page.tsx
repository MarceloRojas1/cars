import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PanelAsistente } from "@/components/asistente-ia/panel";
import { getAssistantConfig, getIntegrations, getKnowledgeItems } from "@/lib/data";

export const metadata = { title: "Asistente IA" };

export default async function AsistenteIaPage() {
  const [config, faq, integraciones] = await Promise.all([
    getAssistantConfig(), getKnowledgeItems(), getIntegrations(),
  ]);
  const claude = integraciones.find((i) => i.id === "int_claude");
  const conectado = claude?.estado === "conectado";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Asistente IA"
        descripcion="Decide a quién responde automáticamente el bot y cómo se comporta"
      />

      {!conectado && (
        <Link
          href="/integraciones"
          className="mb-6 flex items-center gap-4 border-l-2 border-l-warn bg-warn/[0.06] px-4 py-3 text-[12.5px] leading-relaxed transition-colors hover:bg-warn/[0.1]"
        >
          <div className="flex-1">
            <span className="text-warn">Claude no está conectado.</span>{" "}
            <span className="text-muted-foreground">
              Este panel guarda el comportamiento, pero el bot no puede responder
              sin una cuenta enlazada. Conéctala en Integraciones.
            </span>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <PanelAsistente config={config} faq={faq} modeloConectado={claude?.modelo} />
    </div>
  );
}

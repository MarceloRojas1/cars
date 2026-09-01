import { PageHeader } from "@/components/page-header";
import { Pendiente } from "@/components/pendiente";

export const metadata = { title: "Asistente IA" };

export default function Page() {
  return (
    <>
      <PageHeader titulo="Asistente IA" descripcion="Decide a quién responde automáticamente el asistente de WhatsApp" />
      <Pendiente que="Configuración del agente" fase="Fase 7 · Agente IA" detalle="Triggers, servicios ofrecidos, política de financiamiento, personalidad y base de conocimiento." />
    </>
  );
}

import { PageHeader } from "@/components/page-header";
import { Pendiente } from "@/components/pendiente";

export const metadata = { title: "Recordatorios" };

export default function Page() {
  return (
    <>
      <PageHeader titulo="Recordatorios" descripcion="Tareas y seguimientos con fecha" />
      <Pendiente que="Pantalla sin capturas de referencia" fase="Fase 3 · Leads y embudo" detalle="No hay ninguna captura de esta sección, así que no sabemos su estructura. Necesitamos verla antes de construirla." />
    </>
  );
}

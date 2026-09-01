import { PageHeader } from "@/components/page-header";
import { Pendiente } from "@/components/pendiente";

export const metadata = { title: "Rendimiento" };

export default function Page() {
  return (
    <>
      <PageHeader titulo="Rendimiento" descripcion="Cómo atiende tu equipo las oportunidades comerciales" />
      <Pendiente que="Analítica de equipo y embudo" fase="Fase 5 · Analítica" detalle="Depende de tener datos reales que agregar: rapidez de contacto, dónde se atoran los leads y origen de clientes." />
    </>
  );
}

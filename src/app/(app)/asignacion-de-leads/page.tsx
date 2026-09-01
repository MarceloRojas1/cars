import { PageHeader } from "@/components/page-header";
import { Pendiente } from "@/components/pendiente";

export const metadata = { title: "Asignación de leads" };

export default function Page() {
  return (
    <>
      <PageHeader titulo="Asignación de leads" descripcion="Configura cómo se asignan los leads a tus vendedores" />
      <Pendiente que="Motor de routing" fase="Fase 6 · Canales" detalle="La estrategia, la reasignación por tiempo y las reglas por origen solo tienen sentido con leads entrando de verdad." />
    </>
  );
}

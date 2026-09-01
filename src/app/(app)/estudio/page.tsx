import { PageHeader } from "@/components/page-header";
import { Pendiente } from "@/components/pendiente";

export const metadata = { title: "Estudio IA" };

export default function Page() {
  return (
    <>
      <PageHeader titulo="Estudio IA" descripcion="Gestiona tus showrooms y creativos" />
      <Pendiente que="Generación de fondos con IA" fase="Fase 7 · Agente IA" detalle="Requiere definir el proveedor de generación de imágenes y el flujo de recorte del vehículo." />
    </>
  );
}

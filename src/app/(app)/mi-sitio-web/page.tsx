import { PageHeader } from "@/components/page-header";
import { Pendiente } from "@/components/pendiente";

export const metadata = { title: "Mi sitio web" };

export default function Page() {
  return (
    <>
      <PageHeader titulo="Mi sitio web" descripcion="Edita el slider principal y el eslogan de tu sitio web" />
      <Pendiente que="Catálogo público y editor del hero" fase="Fase 8 · Sitio público" detalle="Incluye el catálogo público en /{slug}, la carga de logo y portada, y los slides con posición de texto." />
    </>
  );
}

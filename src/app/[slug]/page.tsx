import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAutomotoraPorSlug, getCatalogo, getDiapositivas, getMarcaPublica,
  getSlugsPublicos,
} from "@/lib/data/catalogo";
import { GrillaCatalogo } from "@/components/catalogo/grilla";
import { Portada } from "@/components/catalogo/portada";
import { PortadaSlider } from "@/components/catalogo/portada-slider";
import { SeccionesDelSitio } from "@/components/catalogo/secciones";
import { getSeccionesSitio } from "@/lib/data/sitio";

/** Los catálogos se hornean al construir; los que aparezcan después, al visitarse. */
export async function generateStaticParams() {
  return (await getSlugsPublicos()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const automotora = await getAutomotoraPorSlug(slug);
  if (!automotora) return {};
  return {
    // Sin plantilla "· Velie": esta página es de la automotora, no nuestra.
    title: { absolute: `${automotora.nombre} — Vehículos disponibles` },
    description:
      automotora.descripcion ??
      `Revisa el catálogo de vehículos de ${automotora.nombre} y consulta por WhatsApp.`,
  };
}

export default async function CatalogoPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const automotora = await getAutomotoraPorSlug(slug);
  if (!automotora) notFound();

  const [vehiculos, marca, diapositivas, secciones] = await Promise.all([
    getCatalogo(automotora.id),
    getMarcaPublica(automotora.id),
    getDiapositivas(automotora.id),
    getSeccionesSitio(automotora.id),
  ]);

  return (
    <>
      {/* Con diapositivas manda el carrusel; sin ellas, la portada simple. Una
          automotora recién dada de alta publica su catálogo antes de tener
          material gráfico, y no puede quedarse sin encabezado por eso. */}
      {diapositivas.length > 0 ? (
        <PortadaSlider diapositivas={diapositivas} color={marca.color} />
      ) : (
        <Portada automotora={automotora} marca={marca} cuantos={vehiculos.length} />
      )}

      <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-8 lg:py-14">
      {vehiculos.length === 0 ? (
        <p className="border-t border-border py-20 text-center text-[13.5px] text-muted-foreground">
          Todavía no hay vehículos publicados.
        </p>
      ) : (
        <GrillaCatalogo slug={automotora.slug} vehiculos={vehiculos} color={marca.color} />
      )}
      </div>

      <SeccionesDelSitio
        secciones={secciones}
        color={marca.color}
        nombre={automotora.nombre}
      />
    </>
  );
}

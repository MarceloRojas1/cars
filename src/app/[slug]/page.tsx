import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAutomotoraPorSlug, getCatalogo, getDestacados, getDiapositivas,
  getMarcaPublica, getSlugsPublicos,
} from "@/lib/data/catalogo";
import { Portada } from "@/components/catalogo/portada";
import { PortadaSlider } from "@/components/catalogo/portada-slider";
import {
  Aliados, Destacados, Equipo, Servicios, Testimonios, Ubicacion, VerStock,
} from "@/components/catalogo/secciones";
import { getRedes, getSeccionesSitio } from "@/lib/data/sitio";

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

  const [vehiculos, destacados, marca, diapositivas, secciones, redes] = await Promise.all([
    getCatalogo(automotora.id),
    getDestacados(automotora.id),
    getMarcaPublica(automotora.id),
    getDiapositivas(automotora.id),
    getSeccionesSitio(automotora.id),
    getRedes(automotora.id),
  ]);

  return (
    <>
      {/* Con diapositivas manda el carrusel; sin ellas, la portada simple. Una
          automotora recién dada de alta publica su sitio antes de tener
          material gráfico, y no puede quedarse sin encabezado por eso. */}
      {diapositivas.length > 0 ? (
        <PortadaSlider diapositivas={diapositivas} color={marca.color} />
      ) : (
        <Portada automotora={automotora} marca={marca} cuantos={vehiculos.length} />
      )}

      <Destacados vehiculos={destacados} slug={automotora.slug} color={marca.color} />
      <Servicios servicios={secciones.servicios} color={marca.color} />
      <VerStock slug={automotora.slug} cuantos={vehiculos.length} />
      <Equipo
        equipo={secciones.equipo}
        sobreTitulo={secciones.sobreTitulo}
        sobreTexto={secciones.sobreTexto}
        nombre={automotora.nombre}
      />
      <Testimonios resenas={secciones.resenas} />
      <Ubicacion sucursales={secciones.sucursales} />
      <Aliados aliados={redes.aliados} />
    </>
  );
}

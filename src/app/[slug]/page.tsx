import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAutomotoraPorSlug, getCatalogo, getSlugsPublicos } from "@/lib/data/catalogo";
import { GrillaCatalogo } from "@/components/catalogo/grilla";

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

  const vehiculos = await getCatalogo(automotora.id);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-8 lg:py-14">
      <div className="mb-9 max-w-2xl">
        <h1 className="display text-[30px] leading-tight lg:text-[38px]">
          Vehículos en {automotora.nombre}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          {automotora.descripcion ??
            "Revisa el stock disponible, mira las fotos y consulta por WhatsApp el que te interese."}
        </p>
      </div>

      {vehiculos.length === 0 ? (
        <p className="border-t border-border py-20 text-center text-[13.5px] text-muted-foreground">
          Todavía no hay vehículos publicados.
        </p>
      ) : (
        <GrillaCatalogo slug={automotora.slug} vehiculos={vehiculos} />
      )}
    </div>
  );
}

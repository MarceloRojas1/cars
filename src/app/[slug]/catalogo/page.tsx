import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getAutomotoraPorSlug, getCatalogo, getMarcaPublica,
} from "@/lib/data/catalogo";
import { GrillaCatalogo } from "@/components/catalogo/grilla";

/**
 * El catálogo completo, aparte de la portada.
 *
 * La portada muestra unos pocos destacados y cuenta quién es la automotora;
 * acá está todo el stock con sus filtros. Separarlos es lo que hace una
 * automotora real: la portada convence, el catálogo deja buscar.
 */
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[slug]/catalogo">): Promise<Metadata> {
  const { slug } = await params;
  const automotora = await getAutomotoraPorSlug(slug);
  if (!automotora) return {};
  return {
    title: { absolute: `Catálogo — ${automotora.nombre}` },
    description: `Todos los vehículos disponibles en ${automotora.nombre}.`,
  };
}

export default async function CatalogoPage({ params }: PageProps<"/[slug]/catalogo">) {
  const { slug } = await params;
  const automotora = await getAutomotoraPorSlug(slug);
  if (!automotora) notFound();

  const [vehiculos, marca] = await Promise.all([
    getCatalogo(automotora.id),
    getMarcaPublica(automotora.id),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-8 lg:py-14">
      <Link
        href={`/${automotora.slug}`}
        className="mb-6 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" /> Volver al inicio
      </Link>

      <h1 className="display mb-8 text-[28px] leading-tight lg:text-[34px]">
        Todos los vehículos
      </h1>

      {vehiculos.length === 0 ? (
        <p className="border-t border-border py-20 text-center text-[13.5px] text-muted-foreground">
          Todavía no hay vehículos publicados.
        </p>
      ) : (
        <GrillaCatalogo slug={automotora.slug} vehiculos={vehiculos} color={marca.color} />
      )}
    </div>
  );
}

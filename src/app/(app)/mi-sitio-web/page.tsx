import Link from "next/link";
import { ExternalLink, ImageOff, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EditorSitio } from "@/components/sitio/editor-sitio";
import { getConfigSitio, getDiapositivasPanel } from "@/lib/data";
import { getResumenCatalogo } from "@/lib/data/catalogo";
import { orgActual } from "@/lib/auth/sesion";
import { numero } from "@/lib/format";

export const metadata = { title: "Mi sitio web" };

export default async function Page() {
  const orgId = await orgActual();
  const [resumen, config, diapositivas] = await Promise.all([
    getResumenCatalogo(orgId),
    getConfigSitio(),
    getDiapositivasPanel(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Mi sitio web"
        descripcion="Cómo se ve tu catálogo para quien te compra"
      />

      {resumen && (
        <section className="mb-6 border border-border bg-card p-5">
          <h2 className="etiqueta mb-2">Tu catálogo público</h2>

          <Link
            href={`/${resumen.slug}`}
            target="_blank"
            className="tabular inline-flex items-center gap-2 text-[15px] hover:underline"
          >
            /{resumen.slug}
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </Link>

          <p className="mt-3 text-[13px] text-muted-foreground">
            <span className="tabular text-foreground">{numero(resumen.publicados)}</span>{" "}
            {resumen.publicados === 1 ? "vehículo visible" : "vehículos visibles"}. Sale
            todo lo que esté disponible, sin archivar y con al menos una foto.
          </p>

          {resumen.sinFotos > 0 && (
            <p className="mt-3 flex items-start gap-2 border-l-2 border-l-warn bg-warn/[0.06] px-3 py-2 text-[12.5px] leading-relaxed">
              <ImageOff className="mt-0.5 size-3.5 shrink-0 text-warn" />
              <span>
                <span className="tabular text-warn">{numero(resumen.sinFotos)}</span>{" "}
                {resumen.sinFotos === 1
                  ? "vehículo disponible no aparece porque no tiene fotos."
                  : "vehículos disponibles no aparecen porque no tienen fotos."}{" "}
                <Link href="/vehiculos" className="underline">Cargarlas en el inventario</Link>.
              </span>
            </p>
          )}

          {!resumen.whatsapp && (
            <p className="mt-3 flex items-start gap-2 border-l-2 border-l-warn bg-warn/[0.06] px-3 py-2 text-[12.5px] leading-relaxed">
              <MessageCircle className="mt-0.5 size-3.5 shrink-0 text-warn" />
              <span>
                Falta el número de WhatsApp de la automotora: sin él el catálogo no
                muestra el botón de consultar, que es de donde salen los leads.
              </span>
            </p>
          )}
        </section>
      )}

      <EditorSitio
        config={config}
        diapositivas={diapositivas}
        slug={resumen?.slug ?? ""}
      />
    </div>
  );
}

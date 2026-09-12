import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAutomotoraPorSlug, getMarcaPublica } from "@/lib/data/catalogo";
import { getPaginas, getSeccionesSitio } from "@/lib/data/sitio";
import { FormularioSitio } from "@/components/catalogo/formulario-sitio";
import { MarcoFoto } from "@/components/catalogo/marco-foto";

/**
 * Las pestañas del sitio: quiénes somos, compramos tu auto, consignaciones,
 * financiamiento, contacto.
 *
 * Una sola ruta para todas porque su forma es la misma —rótulo, título, texto,
 * foto y a veces un formulario— y lo que cambia es el contenido, que vive en la
 * base. Agregar una pestaña nueva no debería exigir escribir una página nueva.
 */
export const revalidate = 3600;

async function cargar(params: PageProps<"/[slug]/[pagina]">["params"]) {
  const { slug, pagina } = await params;
  const automotora = await getAutomotoraPorSlug(slug);
  if (!automotora) return null;
  const paginas = await getPaginas(automotora.id);
  const actual = paginas.find((p) => p.ruta === pagina);
  return actual ? { automotora, actual } : null;
}

export async function generateMetadata({ params }: PageProps<"/[slug]/[pagina]">): Promise<Metadata> {
  const d = await cargar(params);
  if (!d) return {};
  return {
    title: { absolute: `${d.actual.titulo} — ${d.automotora.nombre}` },
    description: d.actual.bajada ?? d.actual.contenido?.slice(0, 150),
  };
}

export default async function PaginaDelSitio({ params }: PageProps<"/[slug]/[pagina]">) {
  const d = await cargar(params);
  if (!d) notFound();
  const { automotora, actual } = d;

  const [marca, secciones] = await Promise.all([
    getMarcaPublica(automotora.id),
    getSeccionesSitio(automotora.id),
  ]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12 lg:px-8 lg:py-20">
      {actual.rotulo && <p className="etiqueta mb-2 text-muted-foreground">{actual.rotulo}</p>}
      <h1 className="display text-[30px] leading-tight lg:text-[40px]">{actual.titulo}</h1>
      {actual.bajada && (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {actual.bajada}
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <MarcoFoto
            src={actual.imagenUrl}
            proporcion="aspect-[4/3]"
            className="rounded-lg"
            nota={`Foto de "${actual.titulo}" · 1200×900`}
          />
          {actual.contenido && (
            <p className="mt-6 whitespace-pre-line text-[14.5px] leading-relaxed text-muted-foreground">
              {actual.contenido}
            </p>
          )}

          {/* En "quiénes somos" el equipo es el contenido, no un adorno. */}
          {actual.ruta === "quienes-somos" && secciones.equipo.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {secciones.equipo.map((m) => (
                <li key={m.nombre}>
                  <MarcoFoto src={m.fotoUrl} alt={m.nombre} proporcion="aspect-[3/4]"
                             className="rounded-lg" nota={`Foto de ${m.nombre.split(" ")[0]}`} />
                  <p className="mt-2 text-[13px] font-medium">{m.nombre}</p>
                  {m.cargo && <p className="text-[12px] text-muted-foreground">{m.cargo}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {actual.formulario && (
          <div>
            <FormularioSitio tipo={actual.formulario} slug={automotora.slug} color={marca.color} />
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Al enviar, tu consulta entra directo a nuestro equipo. No compartimos
              tus datos con terceros.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

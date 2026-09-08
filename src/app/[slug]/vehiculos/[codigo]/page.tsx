import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronLeft, MessageCircle } from "lucide-react";
import {
  getAutomotoraPorSlug, getFichasPublicas, getSimilares, getVehiculoPublico,
  type VehiculoPublico,
} from "@/lib/data/catalogo";
import { enlaceWhatsapp } from "@/lib/catalogo/whatsapp";
import { Galeria } from "@/components/catalogo/galeria";
import { Simulador } from "@/components/catalogo/simulador";
import { CopiarCodigo } from "@/components/catalogo/copiar-codigo";
import { clp, km, numero } from "@/lib/format";

/**
 * La ficha se identifica por CÓDIGO y no por id, igual que en el panel: el
 * código es lo que la automotora dice por teléfono, lo que va en el anuncio y
 * lo que el comprador copia para pegarlo en WhatsApp. Un uuid en la URL no le
 * sirve a nadie.
 *
 * `generateStaticParams` NO es opcional acá aunque haya `revalidate`: sin él
 * Next trata la ruta como dinámica y la vuelve a renderizar en cada visita.
 * Se verificó midiéndolo — cambiar el precio en la base se veía al instante en
 * la ficha (o sea, sin guardar) mientras el listado, que sí es estático, seguía
 * sirviendo el precio anterior.
 *
 * Con `dynamicParams`, las fichas que no entran en el tope de prerenderizado
 * igual funcionan: se generan al primer visitante y quedan guardadas.
 */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return getFichasPublicas();
}

type Props = PageProps<"/[slug]/vehiculos/[codigo]">;

async function cargar(params: Props["params"]) {
  const { slug, codigo } = await params;
  const automotora = await getAutomotoraPorSlug(slug);
  if (!automotora) return null;
  const vehiculo = await getVehiculoPublico(automotora.id, codigo.toUpperCase());
  if (!vehiculo) return null;
  return { automotora, vehiculo };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const datos = await cargar(params);
  if (!datos) return {};
  const { automotora, vehiculo } = datos;
  return {
    title: { absolute: `${vehiculo.titulo} — ${automotora.nombre}` },
    description: `${vehiculo.titulo}. ${vehiculo.anio}, ${km(vehiculo.km)}, ${vehiculo.combustible}. ${clp(vehiculo.precio)} en ${automotora.nombre}.`,
    openGraph: {
      title: `${vehiculo.titulo} — ${clp(vehiculo.precio)}`,
      images: vehiculo.fotos.slice(0, 1),
      type: "website",
    },
  };
}

/** Una fila de la ficha técnica. Se omite sola cuando el dato no está cargado. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | number | null }) {
  if (valor === undefined || valor === null || valor === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="text-[12.5px] text-muted-foreground">{etiqueta}</dt>
      <dd className="tabular text-right text-[13px]">{valor}</dd>
    </div>
  );
}

/**
 * Bloque plegable de la ficha. `<details>` nativo: no necesita JavaScript y
 * el navegador ya le da el comportamiento de teclado. Abierto por defecto —
 * quien mira un auto quiere ver las especificaciones, no ir abriéndolas.
 */
function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-border py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13.5px] font-medium marker:content-none">
        {titulo}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <dl className="mt-2">{children}</dl>
    </details>
  );
}

export default async function FichaPublicaPage({ params }: Props) {
  const datos = await cargar(params);
  if (!datos) notFound();
  const { automotora, vehiculo: v } = datos;

  const wa = enlaceWhatsapp(automotora, v);
  const similares = await getSimilares(automotora.id, v.codigo, v.precio);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 lg:px-8 lg:py-12">
      <Link
        href={`/${automotora.slug}`}
        className="mb-6 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" /> Volver al catálogo
      </Link>

      {/*
        Tres piezas en una grilla de dos columnas y dos filas. En pantalla ancha
        la galería y la ficha van apiladas a la izquierda y el panel de compra
        ocupa la derecha entera; en móvil, al colapsar a una columna, el orden
        del DOM manda y queda: fotos → precio → botón de WhatsApp → ficha.

        Es la razón de la grilla y no de dos columnas sueltas: el botón de
        consultar tiene que ir ANTES de la ficha técnica en móvil. Con el
        encabezado duplicado y escondido por CSS quedaban dos <h1> en el
        documento y el botón enterrado bajo la ficha.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Galeria fotos={v.fotos} titulo={v.titulo} />
        </div>

        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
          <Encabezado v={v} />

          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] bg-primary text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <MessageCircle className="size-4" />
              Consultar por WhatsApp
            </a>
          )}
          <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
            Te responden con el precio y la disponibilidad de este vehículo.
          </p>

          <div className="mt-5">
            <Simulador precio={v.precio} pieSugerido={v.pieFinanciamiento} />
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <section>
            <h2 className="etiqueta mb-1">Ficha técnica</h2>
            <Bloque titulo="Motor y mecánica">
              <Dato etiqueta="Combustible" valor={v.combustible} />
              <Dato etiqueta="Transmisión" valor={v.transmision} />
              <Dato etiqueta="Cilindrada" valor={v.cilindrada} />
              <Dato etiqueta="Carrocería" valor={v.carroceria} />
              <Dato etiqueta="Puertas" valor={v.puertas} />
            </Bloque>

            <Bloque titulo="Historial y estado">
              <Dato etiqueta="Año" valor={v.anio} />
              <Dato etiqueta="Kilometraje" valor={km(v.km)} />
              <Dato
                etiqueta="Dueños"
                valor={v.cantidadDuenos === 1 ? "Único dueño" : v.cantidadDuenos}
              />
              <Dato etiqueta="Color exterior" valor={v.color} />
              <Dato etiqueta="Color interior" valor={v.colorInterior} />
            </Bloque>

            {v.equipamiento && (
              <Bloque titulo="Equipamiento">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {v.equipamiento}
                </p>
              </Bloque>
            )}

            {v.descripcion && (
              <Bloque titulo="Descripción">
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                  {v.descripcion}
                </p>
              </Bloque>
            )}

            {(v.comuna || v.region) && (
              <Bloque titulo="Ubicación">
                <Dato etiqueta="Comuna" valor={v.comuna} />
                <Dato etiqueta="Región" valor={v.region} />
              </Bloque>
            )}
          </section>
        </div>
      </div>

      {similares.length > 0 && (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="display mb-4 text-[20px]">Vehículos similares</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {similares.map((s) => (
              <li key={s.codigo}>
                <Link
                  href={`/${automotora.slug}/vehiculos/${s.codigo}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <Image
                      src={s.fotos[0]} alt={s.titulo} fill sizes="(min-width: 640px) 33vw, 92vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                    <p className="text-[13.5px] font-medium leading-snug">{s.titulo}</p>
                    <p className="text-[12px] text-muted-foreground">{s.anio} · {km(s.km)}</p>
                    <p className="tabular mt-auto pt-1 text-[16px] font-medium">{clp(s.precio)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Encabezado({ v }: { v: VehiculoPublico }) {
  return (
    <>
      <div className="mb-2.5 flex items-center gap-2">
        <CopiarCodigo codigo={v.codigo} />
      </div>
      <h1 className="display text-[26px] leading-tight lg:text-[28px]">{v.titulo}</h1>
      <p className="tabular mt-3 text-[30px] font-medium leading-none">{clp(v.precio)}</p>

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          { t: "Año", v: String(v.anio) },
          { t: "Kilómetros", v: numero(v.km) },
          { t: "Combustible", v: v.combustible },
        ].map((d) => (
          <div key={d.t} className="rounded-[var(--radius)] border border-border bg-card px-2 py-3">
            <dt className="text-[11px] text-muted-foreground">{d.t}</dt>
            <dd className="tabular mt-1 truncate text-[13.5px] capitalize">{d.v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

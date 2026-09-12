import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { MarcoFoto } from "@/components/catalogo/marco-foto";
import { clp, km, numero } from "@/lib/format";
import type { SeccionesSitio } from "@/lib/data/sitio";
import type { VehiculoPublico } from "@/lib/data/catalogo";

/**
 * Las secciones del sitio, en el orden que usa una automotora real: primero los
 * autos que quiere empujar, después qué ofrece, quiénes son, qué dicen sus
 * clientes y dónde encontrarla.
 *
 * Cada una se omite si no tiene contenido, salvo donde falta solo la FOTO: ahí
 * se deja el recuadro punteado, para que quien arma el sitio vea dónde encaja
 * cada imagen en vez de descubrirlo probando.
 */

/** Rótulo pequeño sobre cada título. Ordena la lectura de una página larga. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="etiqueta mb-2 text-center text-muted-foreground">{children}</p>;
}

function Seccion({
  rotulo, titulo, bajada, oscura, ancha, children,
}: {
  rotulo?: string;
  titulo?: string;
  bajada?: string;
  oscura?: boolean;
  ancha?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={oscura ? "bg-[#17171A] text-white" : "border-t border-border"}>
      <div className={`mx-auto px-5 py-14 lg:px-8 lg:py-20 ${ancha ? "max-w-[1400px]" : "max-w-[1200px]"}`}>
        {rotulo && <Rotulo>{rotulo}</Rotulo>}
        {titulo && (
          <h2 className="display text-center text-[26px] leading-tight lg:text-[34px]">{titulo}</h2>
        )}
        {bajada && (
          <p className="mx-auto mt-2 max-w-xl text-center text-[13.5px] leading-relaxed opacity-70">
            {bajada}
          </p>
        )}
        {children && <div className={titulo ? "mt-10" : ""}>{children}</div>}
      </div>
    </section>
  );
}

export function Destacados({
  vehiculos, slug, color,
}: {
  vehiculos: VehiculoPublico[];
  slug: string;
  color: string;
}) {
  if (vehiculos.length === 0) return null;

  return (
    <Seccion rotulo="Selección del mes" titulo="Vehículos destacados"
             bajada="Cada auto pasa por una revisión antes de entrar al showroom.">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {vehiculos.map((v) => (
          <li key={v.codigo}>
            <Link href={`/${slug}/vehiculos/${v.codigo}`} className="group block">
              <MarcoFoto src={v.fotos[0]} alt={v.titulo} proporcion="aspect-[4/3]"
                         className="rounded-lg" nota="Foto del vehículo" />
              <h3 className="mt-3 text-[13.5px] font-medium leading-snug">{v.titulo}</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {[v.anio, km(v.km), v.combustible].filter(Boolean).join(" · ")}
              </p>
              <p className="tabular mt-2 text-[17px] font-semibold" style={{ color }}>
                {clp(v.precio)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

export function Servicios({
  servicios, color,
}: {
  servicios: SeccionesSitio["servicios"];
  color: string;
}) {
  if (servicios.length === 0) return null;

  return (
    <Seccion rotulo="Servicios" titulo="Asesoría completa"
             bajada="Más que vender autos: te acompañamos en la decisión.">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {servicios.map((s, i) => (
          <li key={s.titulo}>
            <MarcoFoto
              src={s.imagenUrl}
              proporcion="aspect-[4/3]"
              className="rounded-lg"
              nota={`Foto de "${s.titulo}" · 1200×900`}
            />
            <p className="tabular mt-4 text-[12px]" style={{ color }}>
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-1 text-[16px] font-medium leading-snug">{s.titulo}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.texto}</p>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

/** Banda oscura que corta la página y empuja al catálogo completo. */
export function VerStock({ slug, cuantos }: { slug: string; cuantos: number }) {
  return (
    <Seccion oscura rotulo="Stock completo" titulo="Ver todos los vehículos">
      <div className="text-center">
        <Link
          href={`/${slug}/catalogo`}
          className="inline-flex h-11 items-center rounded-[var(--radius)] border border-white/25 px-7 text-[13.5px] font-medium transition-colors hover:bg-white hover:text-[#17171A]"
        >
          Ver catálogo
        </Link>
        <p className="mt-4 text-[12.5px] opacity-60">
          <span className="tabular">{numero(cuantos)}</span>{" "}
          {cuantos === 1 ? "vehículo disponible" : "vehículos disponibles"}
        </p>
      </div>
    </Seccion>
  );
}

export function Equipo({
  equipo, sobreTitulo, sobreTexto, nombre,
}: {
  equipo: SeccionesSitio["equipo"];
  sobreTitulo?: string;
  sobreTexto?: string;
  nombre: string;
}) {
  if (equipo.length === 0 && !sobreTexto) return null;

  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:px-8 lg:py-20">
        <div>
          <p className="etiqueta mb-2 text-muted-foreground">El equipo</p>
          <h2 className="display text-[26px] leading-tight lg:text-[32px]">
            {sobreTitulo ?? `Así trabajamos en ${nombre}`}
          </h2>
          {sobreTexto && (
            <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
              {sobreTexto}
            </p>
          )}
        </div>

        {equipo.length > 0 && (
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {equipo.map((m) => (
              <li key={m.nombre}>
                <MarcoFoto src={m.fotoUrl} alt={m.nombre} proporcion="aspect-[3/4]"
                           className="rounded-lg" nota={`Foto de ${m.nombre.split(" ")[0]}`} />
                <p className="mt-2.5 text-[13px] font-medium">{m.nombre}</p>
                {m.cargo && <p className="text-[12px] text-muted-foreground">{m.cargo}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function Testimonios({ resenas }: { resenas: SeccionesSitio["resenas"] }) {
  if (resenas.length === 0) return null;

  return (
    <Seccion rotulo="Testimonios" titulo="La voz de nuestros clientes"
             bajada="Lo que dicen quienes ya compraron.">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {resenas.map((r) => (
          <li key={r.id} className="rounded-lg bg-muted/50 p-6">
            <p className="display text-[28px] leading-none text-muted-foreground/40">&ldquo;</p>
            <p className="mt-2 text-[13.5px] leading-relaxed">{r.texto}</p>
            <div className="mt-5 flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/10 text-[11px] font-semibold">
                {r.autor.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <span>
                <span className="block text-[12.5px] font-medium">{r.autor}</span>
                <span className="tabular block text-[11px] text-muted-foreground">
                  {"★".repeat(r.estrellas)}
                  {r.fuente ? ` · ${r.fuente}` : ""}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

/**
 * Financieras y marcas con las que trabaja la automotora.
 *
 * Cada logo va sobre una tarjeta CLARA. No es decoración: los logos de las
 * financieras son arte oscuro, pensado para papel y para fondos blancos. Sobre
 * el fondo oscuro de la página desaparecían — se veía el título y debajo nada.
 */
export function Aliados({ aliados }: { aliados: { nombre: string; logoUrl?: string }[] }) {
  if (aliados.length === 0) return null;

  return (
    <Seccion rotulo="Aliados financieros" titulo="Trabajamos con los mejores">
      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
        {aliados.map((a) => (
          <li key={a.nombre} className="grid h-16 w-40 place-items-center rounded-lg bg-white px-4">
            {a.logoUrl ? (
              // Alto fijo y ancho automático: los logos vienen de distintas
              // proporciones y encajonarlos en una caja los deforma.
              <Image
                src={a.logoUrl}
                alt={a.nombre}
                width={160}
                height={36}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-[15px] font-medium text-[#17171A]">{a.nombre}</span>
            )}
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

export function Ubicacion({ sucursales }: { sucursales: SeccionesSitio["sucursales"] }) {
  if (sucursales.length === 0) return null;

  return (
    <Seccion rotulo="Visítanos" titulo={sucursales.length > 1 ? "Dónde estamos" : "Dónde encontrarnos"}>
      <ul className={`grid gap-6 ${sucursales.length > 1 ? "sm:grid-cols-2" : "mx-auto max-w-xl"}`}>
        {sucursales.map((s) => (
          <li key={s.nombre} className="rounded-lg border border-border p-6">
            <h3 className="mb-4 text-[15px] font-medium">{s.nombre}</h3>
            <dl className="space-y-2.5 text-[13px] text-muted-foreground">
              {s.direccion && (
                <Dato icono={MapPin}>
                  {s.direccion}
                  {s.comuna ? `, ${s.comuna}` : ""}
                  {s.region ? `, ${s.region}` : ""}
                </Dato>
              )}
              {s.horario && <Dato icono={Clock}>{s.horario}</Dato>}
              {s.telefono && (
                <Dato icono={Phone}>
                  <a href={`tel:${s.telefono.replace(/\s/g, "")}`} className="hover:underline">
                    {s.telefono}
                  </a>
                </Dato>
              )}
              {s.email && (
                <Dato icono={Mail}>
                  <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
                </Dato>
              )}
            </dl>
            {s.mapaUrl && (
              <a href={s.mapaUrl} target="_blank" rel="noopener noreferrer"
                 className="mt-4 inline-block text-[12.5px] underline underline-offset-4">
                Ver en el mapa
              </a>
            )}
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

function Dato({ icono: Icono, children }: { icono: typeof MapPin; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icono className="mt-0.5 size-3.5 shrink-0 opacity-70" />
      <dd className="leading-relaxed">{children}</dd>
    </div>
  );
}

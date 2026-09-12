import Image from "next/image";
import { Clock, Mail, MapPin, Phone, Star } from "lucide-react";
import type { SeccionesSitio } from "@/lib/data/sitio";

/**
 * Las secciones del sitio de la automotora, bajo el catálogo.
 *
 * Cada una se omite entera si no tiene contenido. Es la regla que hace que el
 * sitio sirva desde el primer día: una automotora recién dada de alta muestra
 * portada y autos, y las demás secciones aparecen a medida que las llena. Una
 * sección vacía con un título y nada debajo se ve peor que no tenerla.
 */
export function SeccionesDelSitio({
  secciones, color, nombre,
}: {
  secciones: SeccionesSitio;
  color: string;
  nombre: string;
}) {
  const { sobreTitulo, sobreTexto, servicios, equipo, resenas, sucursales } = secciones;

  return (
    <>
      {servicios.length > 0 && (
        <Seccion titulo="Servicios" fondo>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servicios.map((s) => (
              <li key={s.titulo} className="rounded-lg border border-border bg-card p-5">
                <span
                  className="mb-3 block h-1 w-9 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <h3 className="text-[15px] font-medium">{s.titulo}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {s.texto}
                </p>
                {s.link && (
                  <a
                    href={s.link}
                    className="mt-3 inline-block text-[12.5px] hover:underline"
                    style={{ color }}
                  >
                    Saber más
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {sobreTexto && (
        <Seccion titulo={sobreTitulo ?? `Sobre ${nombre}`}>
          <p className="max-w-2xl whitespace-pre-line text-[14.5px] leading-relaxed text-muted-foreground">
            {sobreTexto}
          </p>
        </Seccion>
      )}

      {equipo.length > 0 && (
        <Seccion titulo="El equipo" fondo>
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {equipo.map((m) => (
              <li key={m.nombre} className="text-center">
                <span className="relative mx-auto mb-3 block size-24 overflow-hidden rounded-full bg-muted">
                  {m.fotoUrl ? (
                    <Image src={m.fotoUrl} alt="" fill sizes="96px" className="object-cover" />
                  ) : (
                    <span
                      className="grid size-full place-items-center text-[28px] font-semibold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {m.nombre.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <p className="text-[13.5px] font-medium">{m.nombre}</p>
                {m.cargo && (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{m.cargo}</p>
                )}
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {resenas.length > 0 && (
        <Seccion titulo="La voz de nuestros clientes">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resenas.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-5">
                <span className="mb-2.5 flex gap-0.5" aria-label={`${r.estrellas} de 5 estrellas`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className="size-3.5"
                      style={{ color: i < r.estrellas ? color : undefined }}
                      fill={i < r.estrellas ? "currentColor" : "none"}
                      strokeWidth={i < r.estrellas ? 0 : 1.5}
                    />
                  ))}
                </span>
                <p className="text-[13.5px] leading-relaxed">{r.texto}</p>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  {r.autor}
                  {r.fuente ? ` · ${r.fuente}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {sucursales.length > 0 && (
        <Seccion titulo={sucursales.length > 1 ? "Dónde estamos" : "Dónde encontrarnos"} fondo>
          <ul className="grid gap-5 sm:grid-cols-2">
            {sucursales.map((s) => (
              <li key={s.nombre} className="rounded-lg border border-border bg-card p-5">
                <h3 className="mb-3 text-[15px] font-medium">{s.nombre}</h3>
                <dl className="space-y-2 text-[13px] text-muted-foreground">
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
                  <a
                    href={s.mapaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-[12.5px] hover:underline"
                    style={{ color }}
                  >
                    Ver en el mapa
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Seccion>
      )}
    </>
  );
}

function Seccion({
  titulo, fondo, children,
}: {
  titulo: string;
  fondo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={fondo ? "border-t border-border bg-card/40" : "border-t border-border"}>
      <div className="mx-auto max-w-[1200px] px-5 py-12 lg:px-8 lg:py-16">
        <h2 className="display mb-6 text-[22px] lg:text-[26px]">{titulo}</h2>
        {children}
      </div>
    </section>
  );
}

function Dato({
  icono: Icono, children,
}: {
  icono: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icono className="mt-0.5 size-3.5 shrink-0 opacity-70" />
      <dd className="leading-relaxed">{children}</dd>
    </div>
  );
}

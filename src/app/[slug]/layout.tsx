import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getAutomotoraPorSlug, getMarcaPublica } from "@/lib/data/catalogo";
import { getPaginas, getRedes } from "@/lib/data/sitio";
import { enlaceWhatsapp } from "@/lib/catalogo/whatsapp";

/**
 * El catálogo público.
 *
 * Esta es la ÚNICA parte de la aplicación abierta a internet, y por eso vive
 * fuera del grupo `(app)`: no hereda la barra de navegación del panel, ni su
 * `force-dynamic`, ni nada que asuma una sesión. Acá no hay sesión — quien mira
 * es un comprador anónimo — y la organización sale del slug de la URL.
 *
 * Y a diferencia del panel, estas páginas SÍ se guardan: son iguales para todos
 * los visitantes. Los `revalidatePath` que ya existen en las acciones son los
 * que las mantienen al día cuando la automotora edita un auto.
 */
export const revalidate = 3600;

export default async function CatalogoLayout({ params, children }: LayoutProps<"/[slug]">) {
  const { slug } = await params;
  const automotora = await getAutomotoraPorSlug(slug);
  if (!automotora) notFound();

  const wa = enlaceWhatsapp(automotora);
  const [marca, paginas, redes] = await Promise.all([
    getMarcaPublica(automotora.id),
    getPaginas(automotora.id),
    getRedes(automotora.id),
  ]);
  const menu = paginas.filter((p) => p.enMenu);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-5 lg:px-8">
          <Link href={`/${automotora.slug}`} className="flex min-w-0 items-center gap-2.5">
            {marca.logoUrl && (
              <Image
                src={marca.logoUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg bg-white/95 object-contain p-1"
              />
            )}
            <span className="min-w-0">
              <span className="display block truncate text-[17px] leading-none">
                {automotora.nombre}
              </span>
              {automotora.comuna && (
                <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                  {automotora.comuna}
                  {automotora.region ? `, ${automotora.region}` : ""}
                </span>
              )}
            </span>
          </Link>

          {/* Las pestañas salen de la base: agregar una sección no exige tocar
              este archivo. En pantalla chica se ocultan y queda el catálogo,
              que es a lo que la gente viene. */}
          {menu.length > 0 && (
            <nav className="ml-6 hidden items-center gap-5 lg:flex" aria-label="Secciones">
              <Link href={`/${automotora.slug}/catalogo`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                Vehículos
              </Link>
              {menu.map((p) => (
                <Link
                  key={p.ruta}
                  href={`/${automotora.slug}/${p.ruta}`}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {p.titulo}
                </Link>
              ))}
            </nav>
          )}

          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              // El botón lleva el color de la automotora, no el nuestro.
              style={{ backgroundColor: marca.color }}
              className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius)] px-3.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <MessageCircle className="size-4" />
              <span className="hidden sm:inline">Escríbenos</span>
            </a>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-[1200px] px-5 py-12 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="display text-[17px]">{automotora.nombre}</p>
              {automotora.descripcion && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {automotora.descripcion}
                </p>
              )}
            </div>

            <div>
              <p className="etiqueta mb-3">Navegación</p>
              <ul className="space-y-1.5 text-[12.5px] text-muted-foreground">
                <li>
                  <Link href={`/${automotora.slug}/catalogo`} className="hover:text-foreground">
                    Vehículos
                  </Link>
                </li>
                {menu.map((p) => (
                  <li key={p.ruta}>
                    <Link href={`/${automotora.slug}/${p.ruta}`} className="hover:text-foreground">
                      {p.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="etiqueta mb-3">Contacto</p>
              <ul className="space-y-1.5 text-[12.5px] text-muted-foreground">
                {automotora.comuna && (
                  <li>
                    {automotora.comuna}
                    {automotora.region ? `, ${automotora.region}` : ""}
                  </li>
                )}
                {automotora.telefono && (
                  <li>
                    <a href={`tel:${automotora.telefono.replace(/\s/g, "")}`} className="hover:text-foreground">
                      {automotora.telefono}
                    </a>
                  </li>
                )}
                {wa && (
                  <li>
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                      WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {(redes.instagram || redes.tiktok || redes.facebook) && (
              <div>
                <p className="etiqueta mb-3">Síguenos</p>
                <ul className="space-y-1.5 text-[12.5px] text-muted-foreground">
                  {redes.instagram && <li><a href={redes.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Instagram</a></li>}
                  {redes.tiktok && <li><a href={redes.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">TikTok</a></li>}
                  {redes.facebook && <li><a href={redes.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Facebook</a></li>}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-[11.5px] text-muted-foreground lg:flex-row lg:items-center">
            <p>© {new Date().getFullYear()} {automotora.nombre}</p>
            <p className="lg:ml-auto">
              Sitio publicado con <span className="text-foreground">Velie</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getAutomotoraPorSlug, getMarcaPublica } from "@/lib/data/catalogo";
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

  const [wa, marca] = [enlaceWhatsapp(automotora), await getMarcaPublica(automotora.id)];

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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-8 text-[12px] text-muted-foreground lg:flex-row lg:items-center lg:px-8">
          <p>
            {automotora.nombre}
            {automotora.telefono ? ` · ${automotora.telefono}` : ""}
          </p>
          <p className="lg:ml-auto">
            Catálogo publicado con <span className="text-foreground">Velie</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

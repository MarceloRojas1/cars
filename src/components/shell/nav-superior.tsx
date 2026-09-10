"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, MessageSquare, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_CUENTA, NAV_HERRAMIENTAS, NAV_PRINCIPAL, type NavItem } from "@/lib/nav";

/**
 * Lo que se ofrece bajo el avatar. No es todo `NAV_CUENTA` —esos ocho ya están
 * en su propio menú, al lado— sino lo que alguien busca cuando hace clic en su
 * propia cuenta: su plan, su equipo y lo que tiene conectado.
 */
const CUENTA_RAPIDO: NavItem[] = NAV_CUENTA.filter((i) =>
  ["/mi-plan", "/equipo", "/integraciones"].includes(i.href),
);
import { salirAction } from "@/app/login/acciones";
import { cn } from "@/lib/utils";

/**
 * Navegación de la aplicación, arriba y en una sola fila.
 *
 * Reemplaza a la barra lateral: el ancho completo importa en las pantallas que
 * más se usan —el inventario, el embudo, el editor del Estudio—, y una columna
 * fija de 224px se los estaba comiendo en todas.
 */
export function NavSuperior({ usuario }: { usuario: { nombre: string; email: string } }) {
  const ruta = usePathname();
  const activo = (href: string) => ruta === href || ruta.startsWith(`${href}/`);
  const inicial = usuario.nombre.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5 lg:px-8">
        <Link href="/dashboard" className="marca text-[19px] leading-none">
          Velie
        </Link>

        <nav className="flex flex-wrap items-center gap-1" aria-label="Principal">
          {NAV_PRINCIPAL.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={activo(i.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                activo(i.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {i.label}
            </Link>
          ))}

          <MenuNav etiqueta="Más" items={NAV_HERRAMIENTAS} activo={activo} />
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          {/* El estado de la cuenta deja de ser una banda propia: es un punto
              junto a las notificaciones. Informaba sin gritar; ahora ni ocupa. */}
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Conversaciones">
            <MessageSquare className="size-[15px]" strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground" aria-label="Notificaciones">
            <Bell className="size-[15px]" strokeWidth={1.5} />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-crit" />
          </Button>

          <MenuNav etiqueta="Cuenta" items={NAV_CUENTA} activo={activo} icono />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="ml-1.5 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-accent/50"
                  aria-label={`Cuenta de ${usuario.nombre}`}
                >
                  <span className="grid size-7 place-items-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
                    {inicial}
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-60">
              {/*
                El encabezado va dentro de un Group a propósito: `GroupLabel`
                exige ese contexto y sin él Base UI lanza "MenuGroupContext is
                missing" — que no rompía solo la etiqueta, tumbaba el menú
                entero. El botón parecía muerto: se hacía clic y no pasaba nada.
              */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <p className="text-[13px] font-medium">{usuario.nombre}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{usuario.email}</p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {CUENTA_RAPIDO.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  render={
                    <Link href={item.href}>
                      <item.icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </Link>
                  }
                />
              ))}

              <DropdownMenuSeparator />

              {/*
                Un formulario y no un onClick: `salirAction` termina en
                `redirect()`, y un servidor solo puede redirigir al navegador
                dentro del envío de un formulario o una transición. Llamada
                suelta desde un manejador, la sesión se cerraba y la pantalla se
                quedaba igual.
              */}
              <form action={salirAction}>
                <DropdownMenuItem
                  // `nativeButton`: se le dice a Base UI que lo que se le pasa
                  // ya es un <button>, para que conserve su comportamiento
                  // nativo —enviar el formulario— en vez de simularlo.
                  nativeButton
                  render={
                    <button type="submit" className="w-full">
                      <LogOut className="size-4 text-muted-foreground" />
                      Cerrar sesión
                    </button>
                  }
                />
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function MenuNav({
  etiqueta, items, activo, icono,
}: {
  etiqueta: string;
  items: NavItem[];
  activo: (href: string) => boolean;
  icono?: boolean;
}) {
  const alguno = items.some((i) => activo(i.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          icono ? (
            <Button
              variant="ghost" size="icon"
              className={cn("size-8", alguno ? "text-foreground" : "text-muted-foreground")}
              aria-label={etiqueta}
            >
              <Settings2 className="size-[15px]" strokeWidth={1.5} />
            </Button>
          ) : (
            <button
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                alguno ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {etiqueta}
              <ChevronDown className="size-3.5" />
            </button>
          )
        }
      />
      <DropdownMenuContent align={icono ? "end" : "start"} className="w-56">
        {items.map((i) => (
          <DropdownMenuItem
            key={i.href}
            render={<Link href={i.href} />}
            className={cn("gap-2", activo(i.href) && "text-foreground")}
          >
            <i.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
            {i.label}
            {i.pendiente && (
              <span className="ml-auto text-[10px] text-muted-foreground">pendiente</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

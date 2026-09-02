"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Isotipo } from "@/components/marca/isotipo";

export function Sidebar({ usuario }: { usuario: { nombre: string; email: string } }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5 text-foreground"
      >
        <Isotipo className="h-[22px] w-auto shrink-0" />
        <span className="wordmark text-[20px] leading-none">Velie</span>
      </Link>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((grupo, i) => (
          <div key={grupo.label ?? i} className="mb-1">
            {grupo.label && (
              <p className="overline px-5 pb-2 pt-5">{grupo.label}</p>
            )}
            <ul>
              {grupo.items.map((item) => {
                const activo = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={activo ? "page" : undefined}
                      className={cn(
                        // El filete de la izquierda es el que marca la sección activa.
                        "flex items-center gap-3 border-l-2 py-[7px] pl-[18px] pr-4 text-[13px] transition-colors",
                        activo
                          ? "border-l-foreground bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "border-l-transparent text-sidebar-foreground hover:border-l-border hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon
                        className={cn("size-[15px] shrink-0", !activo && "opacity-60")}
                        strokeWidth={1.5}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.pendiente && !activo && (
                        <span
                          className="ml-auto size-1 rounded-full bg-muted-foreground/40"
                          title="Pendiente"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="truncate text-[12.5px] font-medium leading-tight">{usuario.nombre}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{usuario.email}</p>
      </div>
    </aside>
  );
}

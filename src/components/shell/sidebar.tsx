"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar({ usuario }: { usuario: { nombre: string; email: string } }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <Link href="/dashboard" className="flex h-14 items-center gap-2 px-4">
        <span className="grid size-6 place-items-center rounded bg-primary text-[13px] font-bold text-primary-foreground">
          V
        </span>
        <span className="text-[17px] font-bold italic tracking-tight">CARS</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV.map((grupo, i) => (
          <div key={grupo.label ?? i} className="mb-1">
            {grupo.label && (
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {grupo.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {grupo.items.map((item) => {
                const activo = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={activo ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] transition-colors",
                        activo
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                      {item.pendiente && !activo && (
                        <span className="ml-auto size-1.5 rounded-full bg-muted-foreground/40" title="Pendiente" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-sidebar-border px-3 py-3">
        <Avatar className="size-7">
          <AvatarFallback className="bg-muted text-[11px]">
            {usuario.nombre.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium leading-tight">{usuario.nombre}</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">{usuario.email}</p>
        </div>
      </div>
    </aside>
  );
}

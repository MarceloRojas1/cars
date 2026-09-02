import { MessageSquare, Bell, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Banda de estado de la cuenta. Contenida a propósito: informa sin gritar.
 * El punto rojo carga el significado; el fondo se mantiene neutro.
 */
export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
      <span className="size-1.5 shrink-0 rounded-full bg-crit" aria-hidden />
      <p className="text-[12.5px] text-muted-foreground">
        No estás recibiendo leads nuevos
      </p>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-[12.5px] text-foreground underline-offset-4"
      >
        Activar
      </Button>

      <div className="ml-auto flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Conversaciones">
          <MessageSquare className="size-[15px]" strokeWidth={1.5} />
        </Button>
        <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground" aria-label="Notificaciones">
          <Bell className="size-[15px]" strokeWidth={1.5} />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-crit" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Pantalla">
          <Monitor className="size-[15px]" strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  );
}

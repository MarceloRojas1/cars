import { AlertTriangle, MessageSquare, Bell, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Banda superior con el estado global de la cuenta.
 * En el producto real esto se enciende cuando la integración de canales se cae.
 */
export function Topbar() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-crit/30 bg-crit/12 px-4">
      <AlertTriangle className="size-4 shrink-0 text-crit" strokeWidth={2} />
      <p className="text-[13px] text-crit">No estás recibiendo leads nuevos</p>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Conversaciones">
          <MessageSquare className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground" aria-label="Notificaciones">
          <Bell className="size-4" />
          <span className="absolute -right-0.5 -top-0.5 rounded-full bg-crit px-1 text-[9px] font-semibold text-crit-foreground">
            9+
          </span>
        </Button>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Pantalla">
          <Monitor className="size-4" />
        </Button>
        <Button size="sm" className="ml-2 h-7 bg-crit text-crit-foreground hover:bg-crit/90">
          Activar
        </Button>
      </div>
    </header>
  );
}

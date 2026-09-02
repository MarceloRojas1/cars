"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AssistantFab() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("El asistente llega en la fase 7", {
          description: "Por ahora el botón solo marca su lugar en el layout.",
        })
      }
      className="fixed bottom-6 right-6 z-40 h-9 border-border bg-surface px-4 text-[12.5px] font-normal tracking-wide shadow-lg hover:bg-accent"
    >
      Asistente
    </Button>
  );
}

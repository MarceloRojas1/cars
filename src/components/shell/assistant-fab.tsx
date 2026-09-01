"use client";

import { Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AssistantFab() {
  return (
    <Button
      onClick={() => toast("El asistente llega en la fase 7", {
        description: "Por ahora el botón solo marca su lugar en el layout.",
      })}
      className="fixed bottom-5 right-5 z-40 h-10 gap-2 rounded-full px-4 shadow-lg"
    >
      <Bot className="size-4" />
      Asistente
    </Button>
  );
}

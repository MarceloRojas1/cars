"use client";

import { useActionState } from "react";
import { entrarAction, type EstadoLogin } from "@/app/login/acciones";
import { Button } from "@/components/ui/button";
import { Campo, controlBase } from "@/components/form/campos";

const INICIAL: EstadoLogin = { mensaje: "" };

export function FormularioLogin({ volver }: { volver: string }) {
  const [estado, enviar, pendiente] = useActionState(entrarAction, INICIAL);

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="volver" value={volver} />

      <Campo label="Correo" htmlFor="email">
        <input
          id="email" name="email" type="email" autoComplete="username"
          required autoFocus className={controlBase}
        />
      </Campo>

      <Campo label="Contraseña" htmlFor="password">
        <input
          id="password" name="password" type="password"
          autoComplete="current-password" required className={controlBase}
        />
      </Campo>

      {estado.mensaje && (
        <p
          role="alert"
          className="border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit"
        >
          {estado.mensaje}
        </p>
      )}

      <Button type="submit" disabled={pendiente} className="h-10">
        {pendiente ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

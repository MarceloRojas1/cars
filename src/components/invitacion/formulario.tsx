"use client";

import { useActionState } from "react";
import { activarCuentaAction, type EstadoInvitacion } from "@/app/invitacion/[token]/acciones";
import { Button } from "@/components/ui/button";
import { Campo, controlBase } from "@/components/form/campos";

const INICIAL: EstadoInvitacion = { mensaje: "" };

export function FormularioInvitacion({ token, email }: { token: string; email: string }) {
  const [estado, enviar, pendiente] = useActionState(activarCuentaAction, INICIAL);

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />

      {/*
        El correo se muestra y no se edita: es el que la automotora registró y
        con el que va a entrar. Cambiarlo acá desharía el enlace con su ficha
        del equipo. El campo visible lleva `autoComplete="username"` para que el
        gestor de contraseñas guarde el par correcto.
      */}
      <Campo label="Tu correo" htmlFor="correo-visible">
        <input
          id="correo-visible" type="email" value={email} readOnly
          autoComplete="username"
          className={`${controlBase} cursor-not-allowed text-muted-foreground`}
        />
      </Campo>

      <Campo label="Elige una contraseña" htmlFor="password">
        <input
          id="password" name="password" type="password" minLength={8}
          autoComplete="new-password" required autoFocus className={controlBase}
        />
      </Campo>

      <Campo label="Repítela" htmlFor="password2">
        <input
          id="password2" name="password2" type="password" minLength={8}
          autoComplete="new-password" required className={controlBase}
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
        {pendiente ? "Activando…" : "Activar mi cuenta"}
      </Button>
    </form>
  );
}

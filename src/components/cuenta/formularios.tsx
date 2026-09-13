"use client";

import { useActionState } from "react";
import {
  cambiarPasswordAction, guardarPerfilAction, type EstadoCuenta,
} from "@/app/(app)/mi-cuenta/acciones";
import { Button } from "@/components/ui/button";
import { Campo, controlBase } from "@/components/form/campos";

const INICIAL: EstadoCuenta = { ok: false, mensaje: "" };

function Aviso({ estado }: { estado: EstadoCuenta }) {
  if (!estado.mensaje) return null;
  return (
    <p
      role="alert"
      className={
        estado.ok
          ? "border-l-2 border-l-ok bg-ok/[0.06] px-3 py-2 text-[12.5px] text-ok"
          : "border-l-2 border-l-crit bg-crit/[0.06] px-3 py-2 text-[12.5px] text-crit"
      }
    >
      {estado.mensaje}
    </p>
  );
}

export function FormularioPerfil({
  nombre, telefono,
}: { nombre: string; telefono?: string }) {
  const [estado, enviar, pendiente] = useActionState(guardarPerfilAction, INICIAL);

  return (
    <form action={enviar} className="flex max-w-sm flex-col gap-4">
      <Campo label="Nombre" htmlFor="nombre">
        <input
          id="nombre" name="nombre" defaultValue={nombre}
          required minLength={2} className={controlBase}
        />
      </Campo>

      <Campo label="Teléfono" htmlFor="telefono">
        <input
          id="telefono" name="telefono" type="tel" defaultValue={telefono ?? ""}
          placeholder="+56 9 1234 5678" className={controlBase}
        />
      </Campo>

      <Aviso estado={estado} />

      <div>
        <Button type="submit" disabled={pendiente} variant="outline">
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

export function FormularioPassword() {
  const [estado, enviar, pendiente] = useActionState(cambiarPasswordAction, INICIAL);

  return (
    <form action={enviar} className="flex max-w-sm flex-col gap-4">
      <Campo label="Contraseña actual" htmlFor="actual">
        <input
          id="actual" name="actual" type="password"
          autoComplete="current-password" required className={controlBase}
        />
      </Campo>

      <Campo label="Contraseña nueva" htmlFor="nueva">
        <input
          id="nueva" name="nueva" type="password" minLength={8}
          autoComplete="new-password" required className={controlBase}
        />
      </Campo>

      <Campo label="Repite la nueva" htmlFor="nueva2">
        <input
          id="nueva2" name="nueva2" type="password" minLength={8}
          autoComplete="new-password" required className={controlBase}
        />
      </Campo>

      <Aviso estado={estado} />

      <div>
        <Button type="submit" disabled={pendiente} variant="outline">
          {pendiente ? "Cambiando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}

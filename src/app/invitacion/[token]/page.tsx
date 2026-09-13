import Link from "next/link";
import { leerInvitacion } from "@/lib/auth/invitaciones";
import { Logotipo } from "@/components/marca/logotipo";
import { FormularioInvitacion } from "@/components/invitacion/formulario";

export const metadata = { title: "Activa tu cuenta" };

/*
 * Esta ruta se abre SIN sesión: es la única forma de que alguien que todavía no
 * tiene cuenta pueda crearse una. `proxy.ts` la deja pasar porque no está en
 * RUTAS_DEL_PANEL, y `invitacion` es slug reservado para que nunca la tape el
 * catálogo de una automotora.
 */
export const dynamic = "force-dynamic";

const MOTIVO: Record<string, { titulo: string; detalle: string }> = {
  no_existe: {
    titulo: "Este enlace no sirve",
    detalle: "Puede estar incompleto o mal copiado. Pídele a tu automotora que te mande uno nuevo.",
  },
  vencida: {
    titulo: "El enlace venció",
    detalle: "Las invitaciones duran siete días. Pídele a tu automotora que te genere otra.",
  },
  usada: {
    titulo: "Este enlace ya se usó",
    detalle: "Tu cuenta ya está creada. Entra con tu correo y la contraseña que elegiste.",
  },
};

export default async function InvitacionPage({ params }: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const invitacion = await leerInvitacion(token);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logotipo className="h-9" />
        </div>

        {invitacion.valida ? (
          <>
            <div className="mb-7 text-center">
              <h1 className="display text-[26px] leading-tight">Hola, {invitacion.nombre}</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                <span className="text-foreground">{invitacion.automotora}</span> te sumó a su
                equipo en Velie. Elige una contraseña y ya puedes entrar.
              </p>
            </div>
            <FormularioInvitacion token={token} email={invitacion.email} />
          </>
        ) : (
          <div className="text-center">
            <h1 className="display text-[24px] leading-tight">
              {MOTIVO[invitacion.motivo].titulo}
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
              {MOTIVO[invitacion.motivo].detalle}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-[13px] text-primary hover:underline"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

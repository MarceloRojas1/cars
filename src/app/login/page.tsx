import type { Metadata } from "next";
import Image from "next/image";
import { FormularioLogin } from "@/components/login/formulario";

export const metadata: Metadata = {
  title: { absolute: "Entrar · Velie" },
  // Nada de esto tiene que aparecer en un buscador.
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const volver = typeof sp.volver === "string" ? sp.volver : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        {/* El isotipo manda acá: es la única pantalla sin barra de navegación,
            así que es lo único que dice de quién es la aplicación. */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/marca/velie-isotipo-color.svg"
            alt="Velie"
            width={72}
            height={68}
            priority
            className="h-[68px] w-auto"
          />
          <p className="display mt-4 text-[30px] leading-none">Velie</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Entra con la cuenta de tu automotora.
          </p>
        </div>

        <FormularioLogin volver={volver} />

        <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">
          ¿No tienes cuenta? Las crea la automotora desde{" "}
          <span className="text-foreground">Equipo</span>. Si perdiste el acceso,
          pídele a quien administra tu cuenta que te reenvíe la invitación.
        </p>
      </div>
    </main>
  );
}

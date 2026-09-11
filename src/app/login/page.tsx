import type { Metadata } from "next";
import { Logotipo } from "@/components/marca/logotipo";
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
        <div className="mb-9 flex flex-col items-center text-center">
          <Logotipo alto={64} />
          <p className="mt-5 text-[13px] text-muted-foreground">
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

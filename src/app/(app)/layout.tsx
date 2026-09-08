import { NavSuperior } from "@/components/shell/nav-superior";
import { AssistantFab } from "@/components/shell/assistant-fab";
import { getCurrentUser } from "@/lib/data";

/**
 * Nada dentro del panel se puede prerenderizar: todo depende de la organización
 * que esté mirando y del estado actual de la base. Sin esto, Next hornea las
 * páginas al construir la imagen y en producción sirve para siempre los datos
 * que existían en el momento del build.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <NavSuperior usuario={{ nombre: usuario.nombre, email: usuario.email }} />
      <main className="flex-1 px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
      <AssistantFab />
    </div>
  );
}

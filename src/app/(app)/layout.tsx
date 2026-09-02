import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
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
    <div className="flex min-h-screen">
      <Sidebar usuario={{ nombre: usuario.nombre, email: usuario.email }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-5 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
      <AssistantFab />
    </div>
  );
}

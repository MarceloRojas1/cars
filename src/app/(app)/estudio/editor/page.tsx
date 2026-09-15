import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EditorCreativo } from "@/components/estudio/editor";
import { getOrganization, getShowrooms, getVehiculo, getVehicles } from "@/lib/data";

export const metadata = { title: "Editor de piezas" };

export default async function EditorPage({ searchParams }: PageProps<"/estudio/editor">) {
  const sp = await searchParams;
  const pedido = typeof sp.vehiculo === "string" ? sp.vehiculo : undefined;
  const fondoPedido = typeof sp.fondo === "string" ? sp.fondo : undefined;
  const fotoPedida = typeof sp.foto === "string" ? sp.foto : undefined;

  const [vehiculos, { biblioteca, propios }, organizacion] = await Promise.all([
    getVehicles(),
    getShowrooms(),
    getOrganization(),
  ]);

  // Sin vehículo elegido se toma el primero QUE TENGA FOTO: sin foto no hay
  // foto, y abrir el editor con un vehículo que no se puede montar recibe a
  // quien entra con un error en vez de con una pieza.
  const id = pedido ?? (vehiculos.find((v) => v.fotoPrincipal) ?? vehiculos[0])?.id;
  const vehiculo = id ? await getVehiculo(id) : null;
  const fotosDelVehiculo = (vehiculo?.fotos ?? []).map((f) => f.url);

  return (
    <>
      <PageHeader
        titulo="Editor de piezas"
        descripcion="El fondo lo genera la IA; el resto lo armas tú"
        accion={
          <Link
            href="/estudio"
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Volver al Estudio
          </Link>
        }
        meta={
          <>
            Piezas de <span className="text-foreground">{vehiculo?.titulo ?? "—"}</span>
            {" · "}el vehículo y el fondo se cambian en el panel de la derecha
          </>
        }
      />

      {!vehiculo ? (
        <p className="border border-dashed border-border px-8 py-16 text-center text-[13px] text-muted-foreground">
          No hay vehículos en el inventario todavía.
        </p>
      ) : (
        <EditorCreativo
          vehiculo={vehiculo}
          vehiculos={vehiculos.filter((v) => v.fotoPrincipal)}
          fondos={[...propios, ...biblioteca]}
          automotora={organizacion.nombre}
          /*
           * La foto pedida solo si de verdad es de este vehículo: llega de la
           * URL, y montar una imagen arbitraria porque alguien la escribió ahí
           * dejaría al editor cargar cualquier cosa de internet.
           */
          foto={
            (fotoPedida && fotosDelVehiculo.includes(fotoPedida) ? fotoPedida : null)
            ?? vehiculo.fotoPrincipal ?? fotosDelVehiculo[0] ?? null
          }
          fotos={fotosDelVehiculo}
          fondoInicial={fondoPedido ?? null}
        />
      )}
    </>
  );
}

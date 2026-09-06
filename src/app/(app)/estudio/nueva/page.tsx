import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ElegirPieza } from "@/components/estudio/elegir-pieza";
import { getShowrooms, getVehicles } from "@/lib/data";

export const metadata = { title: "Nueva pieza" };

export default async function NuevaPiezaPage() {
  const [vehiculos, { biblioteca, propios }] = await Promise.all([getVehicles(), getShowrooms()]);
  const fondos = [...propios, ...biblioteca].filter((f) => f.url);

  return (
    <>
      <PageHeader
        titulo="Nueva pieza"
        descripcion="Elige el vehículo y el fondo; el resto se arma en el editor"
        accion={
          <Link
            href="/estudio"
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Volver al Estudio
          </Link>
        }
      />
      <ElegirPieza vehiculos={vehiculos} fondos={fondos} />
    </>
  );
}

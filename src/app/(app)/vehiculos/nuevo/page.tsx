import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { VehiculoForm } from "@/components/form/vehiculo-form";
import { getBranches, getCatalogoModelos, getUsers } from "@/lib/data";

export const metadata = { title: "Nuevo vehículo" };

export default async function NuevoVehiculoPage() {
  const [catalogoModelos, sucursales, usuarios] = await Promise.all([
    getCatalogoModelos(), getBranches(), getUsers(),
  ]);
  // Por ahora hay una sola sucursal, pero el desplegable se puebla solo cuando haya más.
  const vendedores = usuarios.filter((u) => u.rol === "vendedor" || u.rol === "owner");

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/vehiculos"
        className="mb-5 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" /> Vehículos
      </Link>

      <PageHeader
        titulo="Nuevo vehículo"
        descripcion="Crea la ficha del auto y su publicación."
      />

      <VehiculoForm
        catalogoModelos={catalogoModelos}
        sucursales={sucursales}
        vendedores={vendedores}
      />
    </div>
  );
}

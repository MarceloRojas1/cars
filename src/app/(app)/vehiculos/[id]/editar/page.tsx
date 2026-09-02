import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { VehiculoForm } from "@/components/form/vehiculo-form";
import { getBranches, getCatalogoModelos, getUsers, getVehiculo } from "@/lib/data";

export const metadata = { title: "Editar vehículo" };

export default async function EditarVehiculoPage({ params }: PageProps<"/vehiculos/[id]/editar">) {
  const { id } = await params;
  const vehiculo = await getVehiculo(id);
  if (!vehiculo) notFound();

  const [catalogoModelos, sucursales, usuarios] = await Promise.all([
    getCatalogoModelos(), getBranches(), getUsers(),
  ]);
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
        titulo="Editar ficha"
        descripcion={vehiculo.titulo}
        meta={
          <>
            <span className="tabular">{vehiculo.codigo}</span> · completitud actual{" "}
            <span className="tabular">{vehiculo.completitudPct}%</span>
          </>
        }
      />

      <VehiculoForm
        catalogoModelos={catalogoModelos}
        sucursales={sucursales}
        vendedores={vendedores}
        vehiculo={vehiculo}
      />
    </div>
  );
}

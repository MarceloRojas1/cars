import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { VehiculoForm } from "@/components/form/vehiculo-form";
import { getBranches, getCatalogoModelos, getUsers } from "@/lib/data";
import { consultarPatente } from "@/lib/patente";

export const metadata = { title: "Nuevo vehículo" };

export default async function NuevoVehiculoPage({ searchParams }: PageProps<"/vehiculos/nuevo">) {
  const sp = await searchParams;
  const patenteInicial = typeof sp.patente === "string" ? sp.patente : undefined;

  const [catalogoModelos, sucursales, usuarios, resultadoPatente] = await Promise.all([
    getCatalogoModelos(), getBranches(), getUsers(),
    // Viene de "Consultar patente": ya se sabe el dato, no hace falta que el
    // vendedor la vuelva a escribir. Reusa la caché de 24 h de esa búsqueda.
    patenteInicial ? consultarPatente(patenteInicial) : Promise.resolve(undefined),
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
        patenteInicial={patenteInicial}
        resultadoPatenteInicial={resultadoPatente}
      />
    </div>
  );
}

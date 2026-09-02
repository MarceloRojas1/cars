import { PageHeader } from "@/components/page-header";
import { BuscadorPatente } from "./buscador";
import { proveedorActivo } from "@/lib/patente";

export const metadata = { title: "Consultar patente" };

export default function ConsultarPatentePage() {
  const proveedor = proveedorActivo();

  return (
    <>
      <PageHeader
        titulo="Consultar patente"
        descripcion="Consulta los datos del vehículo sin tener que crear una publicación"
      />

      {proveedor.advertencia && (
        <p className="mb-5 max-w-xl border-l-2 border-l-warn bg-warn/[0.06] px-4 py-3 text-[12.5px] leading-relaxed">
          <span className="text-warn">
            Fuente: {proveedor.nombre}
            {proveedor.esReal ? "" : " (ficticios)"}.
          </span>{" "}
          <span className="text-muted-foreground">{proveedor.advertencia}</span>
        </p>
      )}

      <BuscadorPatente patentesDePrueba={proveedor.patentesDisponibles} />
    </>
  );
}

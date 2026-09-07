import { Mail, Phone, Building2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBranches, getOrganization, getUsers } from "@/lib/data";
import { AccionesMiembro, DialogoMiembro } from "@/components/equipo/dialogo";
import { FiltrosEquipo } from "@/components/equipo/filtros";

export const metadata = { title: "Equipo" };

// El rol es un dato, no un estado: se distingue por peso, no por color.
const ROL_ESTILO: Record<string, string> = {
  owner: "text-foreground",
  admin: "text-foreground",
  vendedor: "text-muted-foreground",
};

export default async function EquipoPage({ searchParams }: PageProps<"/equipo">) {
  const sp = await searchParams;
  const sucursalFiltro = typeof sp.sucursal === "string" ? sp.sucursal : "";
  const rolFiltro = typeof sp.rol === "string" ? sp.rol : "";

  const [todos, branches, org] = await Promise.all([getUsers(true), getBranches(), getOrganization()]);

  // El filtro vive en la URL: así se puede compartir el enlace y el botón de
  // atrás del navegador funciona, en vez de perderse el estado al recargar.
  const users = todos.filter(
    (u) =>
      (!sucursalFiltro || u.branchId === sucursalFiltro) &&
      (!rolFiltro || u.rol === rolFiltro),
  );
  const cupoLleno = todos.length >= org.limiteUsuarios;

  return (
    <>
      <PageHeader
        titulo="Equipo"
        descripcion="Administra los miembros de tu equipo"
        meta={
          <>
            <span className="tabular font-medium text-foreground">{todos.length}/{org.limiteUsuarios}</span>{" "}
            usuarios en tu plan {org.plan} · {org.limiteUsuarios - todos.length} disponibles
          </>
        }
        accion={<DialogoMiembro sucursales={branches} cupoLleno={cupoLleno} />}
      />

      <FiltrosEquipo
        sucursales={branches}
        sucursal={sucursalFiltro}
        rol={rolFiltro}
        mostrando={users.length}
        total={todos.length}
      />

      <div className="overflow-x-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Último acceso</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="text-[13px] font-medium">{u.nombre}</p>
                  <p className="text-[11.5px] text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <span className={`text-[12.5px] capitalize ${ROL_ESTILO[u.rol]}`}>{u.rol}</span>
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">
                  {u.telefono && <p className="flex items-center gap-1"><Phone className="size-3" />{u.telefono}</p>}
                  <p className="flex items-center gap-1"><Mail className="size-3" />{u.email}</p>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {u.branchId ? (
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5" />
                      {branches.find((b) => b.id === u.branchId)?.nombre}
                    </span>
                  ) : "Sin asignar"}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-2 text-[12.5px] ${u.activo ? "text-ok" : "text-muted-foreground"}`}>
                    <span className="size-[5px] rounded-full bg-current opacity-70" />
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </TableCell>
                <TableCell className="text-right text-[12.5px] text-muted-foreground">{u.ultimoAcceso}</TableCell>
                <TableCell>
                  <AccionesMiembro miembro={u} sucursales={branches} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

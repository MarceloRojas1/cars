import { MapPin, Phone, Mail, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBranches, getUsers, POR_PAGINA } from "@/lib/data";
import { Paginacion } from "@/components/paginacion";
import { AccionesSucursal, DialogoSucursal } from "@/components/sucursales/dialogo";

export const metadata = { title: "Sucursales" };

export default async function SucursalesPage({ searchParams }: PageProps<"/sucursales">) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const [todas, users] = await Promise.all([getBranches(), getUsers()]);
  const branches = todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <>
      <PageHeader
        titulo="Sucursales"
        descripcion="Administra las sucursales de tu organización"
        accion={<DialogoSucursal />}
      />

      <div className="overflow-x-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Sucursal</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Creación</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => {
              const equipo = users.filter((u) => u.branchId === b.id);
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="text-[13px] font-medium">{b.nombre}</p>
                    <p className="font-mono text-[11.5px] text-muted-foreground">{b.codigo}</p>
                  </TableCell>
                  <TableCell className="text-[12.5px]">
                    <p className="flex items-center gap-1"><MapPin className="size-3" />{b.comuna}, {b.region}</p>
                    <p className="text-muted-foreground">{b.direccion}</p>
                  </TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">
                    <p className="flex items-center gap-1"><Phone className="size-3" />{b.telefono}</p>
                    <p className="flex items-center gap-1"><Mail className="size-3" />{b.email}</p>
                  </TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {equipo.length === 0
                        ? "Sin asignar"
                        : `${equipo.length} ${equipo.length === 1 ? "persona" : "personas"}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <span className={`inline-flex items-center gap-2 text-[12.5px] ${b.activa ? "text-ok" : "text-muted-foreground"}`}>
                        <span className="size-[5px] rounded-full bg-current opacity-70" />
                        {b.activa ? "Activa" : "Inactiva"}
                      </span>
                      {b.esPrincipal && (
                        <span className="etiqueta">Principal</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[12.5px] text-muted-foreground">{b.creadaHace}</TableCell>
                  <TableCell>
                    <AccionesSucursal sucursal={b} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Paginacion
        pagina={pagina}
        total={todas.length}
        porPagina={POR_PAGINA}
        base="/sucursales"
        params={{}}
      />
    </>
  );
}

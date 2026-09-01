import { Plus, MapPin, Phone, Mail, Users, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBranches, getUsers } from "@/lib/data";

export const metadata = { title: "Sucursales" };

export default async function SucursalesPage() {
  const [branches, users] = await Promise.all([getBranches(), getUsers()]);

  return (
    <>
      <PageHeader
        titulo="Sucursales"
        descripcion="Administra las sucursales de tu organización"
        accion={<Button className="gap-2"><Plus className="size-4" /> Crear sucursal</Button>}
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
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
                      {equipo.length} {equipo.length === 1 ? "vendedor" : "vendedores"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <span className="inline-flex rounded-full border border-ok/40 bg-ok/12 px-2 py-0.5 text-[11px] text-ok">Activa</span>
                      {b.esPrincipal && (
                        <span className="inline-flex rounded-full border border-chart-3/40 bg-chart-3/12 px-2 py-0.5 text-[11px] text-chart-3">Principal</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[12.5px] text-muted-foreground">{b.creadaHace}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-7" aria-label="Acciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

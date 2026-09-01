import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClients } from "@/lib/data";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const clients = await getClients();

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descripcion="Contrapartes de tus consignaciones y compras, deduplicadas por RUT."
        accion={<Button className="gap-2"><Plus className="size-4" /> Nuevo cliente</Button>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o RUT…" className="h-9 pl-8" />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Comuna</TableHead>
              <TableHead className="text-right">Operaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-[13px] font-medium">{c.nombre}</TableCell>
                <TableCell className="tabular text-[13px] text-muted-foreground">{c.rut ?? "—"}</TableCell>
                <TableCell className="tabular text-[13px] text-muted-foreground">{c.telefono}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{c.comuna ?? "—"}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{c.operaciones}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

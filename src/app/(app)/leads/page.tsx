import { Plus, Search, Download, MoreHorizontal, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Hot, SourceBadge, StageBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeads, getStages, getVehicles, vehiculoDe } from "@/lib/data";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const [leads, stages, vehicles] = await Promise.all([getLeads(), getStages(), getVehicles()]);
  const mios = leads.filter((l) => l.vendedorId === "usr_juan").length;
  const disponibles = leads.filter((l) => !l.vendedorId).length;

  return (
    <>
      <PageHeader titulo="Leads" descripcion="Gestiona las consultas de tus clientes potenciales" />

      <Tabs defaultValue="todos" className="mb-4">
        <TabsList>
          <TabsTrigger value="mis">Mis leads ({mios})</TabsTrigger>
          <TabsTrigger value="disponibles">Disponibles ({disponibles})</TabsTrigger>
          <TabsTrigger value="todos">Todos ({leads.length})</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="eliminados">Eliminados</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, email o teléfono…" className="h-9 pl-8" />
        </div>
        <Button variant="outline" size="sm" className="h-9">Fuente</Button>
        <Button variant="outline" size="sm" className="h-9">Tipo de lead</Button>
        <Button variant="outline" size="sm" className="h-9">Vendedor</Button>
        <Button variant="outline" size="sm" className="ml-auto h-9 gap-2">
          <Download className="size-3.5" /> Exportar
        </Button>
        <Button size="sm" className="h-9 gap-2"><Plus className="size-3.5" /> Agregar lead</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Contacto</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const stage = stages.find((s) => s.id === lead.stageId)!;
              const vehiculo = vehiculoDe(vehicles, lead.vehicleId);
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {lead.temperatura === "hot" && <Hot />}
                      <span className="text-[13px] font-medium">{lead.nombre}</span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                      <Phone className="size-3" /> {lead.telefono}
                    </p>
                    {lead.email && (
                      <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Mail className="size-3" /> {lead.email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {vehiculo ? (
                      <>
                        <p className="max-w-[260px] truncate text-[13px]">{vehiculo.titulo}</p>
                        <p className="font-mono text-[11.5px] text-muted-foreground">{vehiculo.codigo}</p>
                      </>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">Sin vehículo</p>
                    )}
                  </TableCell>
                  <TableCell><StageBadge stage={stage} /></TableCell>
                  <TableCell><SourceBadge source={lead.source} /></TableCell>
                  <TableCell className="text-right text-[12.5px] text-muted-foreground">{lead.creadoHace}</TableCell>
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

import { Plus, Search, Download, SlidersHorizontal, Lightbulb, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Completitud, DiasEnSalon, EstadoVehiculo } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clp, km } from "@/lib/format";
import { getBranches, getOrganization, getUsers, getVehicles } from "@/lib/data";

export const metadata = { title: "Vehículos" };

const CANAL_LABEL: Record<string, string> = {
  mercadolibre: "ML", ml_propia: "ML+", chileautos: "CA", yapo: "YP",
};

export default async function VehiculosPage() {
  const [vehicles, branches, users, org] = await Promise.all([
    getVehicles(), getBranches(), getUsers(), getOrganization(),
  ]);
  const incompletas = vehicles.filter((v) => v.completitudPct < 100).length;

  return (
    <>
      <PageHeader
        titulo="Vehículos"
        descripcion="Gestiona tu inventario de vehículos"
        meta={
          <>
            <span className="tabular font-medium text-foreground">
              {vehicles.length}/{org.limiteVehiculos}
            </span>{" "}
            vehículos publicados · {org.limiteVehiculos - vehicles.length} disponibles
          </>
        }
        accion={<Button className="gap-2"><Plus className="size-4" /> Nuevo vehículo</Button>}
      />

      {incompletas > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-warn/30 bg-warn/8 px-4 py-3">
          <Lightbulb className="size-4 shrink-0 text-warn" />
          <p className="flex-1 text-[13.5px]">
            <span className="font-medium">{incompletas} publicaciones incompletas</span>
            <span className="text-muted-foreground"> — están perdiendo visibilidad frente a la competencia</span>
          </p>
          <Button size="sm" variant="outline" className="h-7">Completar</Button>
        </div>
      )}

      <Tabs defaultValue="disponibles" className="mb-4">
        <TabsList>
          <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por código, título, patente…" className="h-9 pl-8" />
        </div>
        <Button variant="outline" size="sm" className="h-9">Marca</Button>
        <Button variant="outline" size="sm" className="h-9">Estado</Button>
        <Button variant="outline" size="sm" className="h-9">Combustible</Button>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <SlidersHorizontal className="size-3.5" /> Más filtros
        </Button>
        <Button variant="outline" size="sm" className="ml-auto h-9 gap-2">
          <Download className="size-3.5" /> Exportar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[110px]">Código</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Km</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Canales</TableHead>
              <TableHead className="text-right">Días</TableHead>
              <TableHead className="w-[60px] text-right">Ficha</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => {
              const sucursal = branches.find((b) => b.id === v.branchId);
              const vendedor = users.find((u) => u.id === v.vendedorId);
              return (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-[12px] text-primary">{v.codigo}</TableCell>
                  <TableCell>
                    <p className="max-w-[320px] truncate text-[13px] font-medium">{v.titulo}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {v.combustible} · {sucursal?.comuna}
                    </p>
                  </TableCell>
                  <TableCell className="tabular text-right text-[13px] font-medium">{clp(v.precio)}</TableCell>
                  <TableCell className="tabular text-[13px]">{v.anio}</TableCell>
                  <TableCell className="tabular text-[13px] text-muted-foreground">{km(v.km)}</TableCell>
                  <TableCell><EstadoVehiculo estado={v.estado} /></TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{vendedor?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {v.canales.map((c) => (
                        <span key={c} className="rounded border bg-muted px-1 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                          {CANAL_LABEL[c]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><DiasEnSalon dias={v.publicadoHaceDias} /></TableCell>
                  <TableCell className="text-right"><Completitud pct={v.completitudPct} /></TableCell>
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

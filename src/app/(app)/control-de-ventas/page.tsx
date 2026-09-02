import { Download, Lock, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DiasEnSalon } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clp } from "@/lib/format";
import { getOperations, getUsers } from "@/lib/data";

export const metadata = { title: "Control de Ventas" };

export default async function ControlDeVentasPage() {
  const [operations, users] = await Promise.all([getOperations(), getUsers()]);
  const ingresos = operations.reduce((a, o) => a + o.precio, 0);
  const utilidad = operations.reduce((a, o) => a + (o.precio - o.gastos), 0);
  const ticket = Math.round(ingresos / operations.length);
  const diasProm = operations.reduce((a, o) => a + o.diasEnStock, 0) / operations.length;

  return (
    <>
      <PageHeader titulo="Control de Ventas" descripcion="Resumen del negocio, compras, consignaciones y notas de venta" />

      <Tabs defaultValue="dashboard" className="mb-5">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="consignaciones">Consignaciones</TabsTrigger>
          <TabsTrigger value="notas">Notas de Venta</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-8 grid grid-cols-2 border-y border-border py-6 xl:grid-cols-5">
        <StatCard etiqueta="Unidades vendidas" valor={operations.length} delta={{ valor: 75 }} />
        <StatCard etiqueta="Ingresos" valor={clp(ingresos, { compacto: true })} delta={{ valor: 54 }} />
        <StatCard etiqueta="Utilidad" valor={clp(utilidad, { compacto: true })} nota="Falta definir qué entra en gastos" />
        <StatCard etiqueta="Ticket promedio" valor={clp(ticket, { compacto: true })} delta={{ valor: -12 }} />
        <StatCard etiqueta="Días promedio en stock" valor={diasProm.toFixed(1)} delta={{ valor: 6 }} />
      </div>

      <section className="mb-8 border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="display text-[17px]">Cierres mensuales</h2>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Lock className="size-3.5" /> Cerrar mes
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex-1">
            <p className="text-[13.5px] font-medium">1 de mayo de 2026 — 31 de mayo de 2026</p>
            <p className="text-[12px] text-muted-foreground">Cerrado el 8 jun 2026, 12:09 p. m.</p>
          </div>
          <div className="flex gap-6 text-right">
            <div><p className="text-[11px] text-muted-foreground">Ventas</p><p className="tabular text-[14px] font-medium">5</p></div>
            <div><p className="text-[11px] text-muted-foreground">Ingresos</p><p className="tabular text-[14px] font-medium">{clp(94700000)}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Utilidad</p><p className="tabular text-[14px] font-medium">{clp(0)}</p></div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="h-9">Todos los vendedores</Button>
        <Button variant="outline" size="sm" className="h-9">Todas las financieras</Button>
        <Button variant="outline" size="sm" className="h-9">Todos los tipos</Button>
        <Button variant="outline" size="sm" className="ml-auto h-9 gap-2">
          <Download className="size-3.5" /> Descargar Excel
        </Button>
      </div>

      <div className="overflow-x-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Vehículo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Precio venta</TableHead>
              <TableHead className="text-right">Gastos</TableHead>
              <TableHead className="text-right">Utilidad</TableHead>
              <TableHead className="text-right">Días</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="text-[13px] font-medium">{o.vehiculoTitulo}</p>
                  <p className="font-mono text-[11.5px] text-muted-foreground">{o.vehiculoCodigo}</p>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">—</TableCell>
                <TableCell className="text-[13px]">{users.find((u) => u.id === o.vendedorId)?.nombre}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{clp(o.precio)}</TableCell>
                <TableCell className="tabular text-right text-[13px] text-muted-foreground">
                  {o.gastos ? clp(o.gastos) : "—"}
                </TableCell>
                <TableCell className="tabular text-right text-[13px]">{clp(o.precio - o.gastos)}</TableCell>
                <TableCell className="text-right"><DiasEnSalon dias={o.diasEnStock} /></TableCell>
                <TableCell className="tabular text-right text-[12.5px] text-muted-foreground">{o.fecha}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-medium hover:bg-transparent">
              <TableCell colSpan={3}>Totales</TableCell>
              <TableCell className="tabular text-right">{clp(ingresos)}</TableCell>
              <TableCell className="tabular text-right">—</TableCell>
              <TableCell className="tabular text-right text-ok">{clp(utilidad)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </>
  );
}

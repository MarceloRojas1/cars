import { Plus, Search, Download, RefreshCw, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clp, numero, porcentaje } from "@/lib/format";
import { getCampaigns } from "@/lib/data";

export const metadata = { title: "Campañas" };

export default async function CampanasPage() {
  const campaigns = await getCampaigns();
  const activas = campaigns.filter((c) => c.estado === "activa").length;

  return (
    <>
      <PageHeader
        titulo="Campañas"
        descripcion="Crea y gestiona tus campañas de Meta Ads"
        accion={<Button className="gap-2"><Plus className="size-4" /> Nueva campaña</Button>}
      />

      <Tabs defaultValue="activas" className="mb-4">
        <TabsList>
          <TabsTrigger value="activas">Activas ({activas})</TabsTrigger>
          <TabsTrigger value="pausadas">Pausadas (0)</TabsTrigger>
          <TabsTrigger value="borradores">Borradores (0)</TabsTrigger>
          <TabsTrigger value="todas">Todas ({campaigns.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre…" className="h-9 pl-8" />
        </div>
        <Button variant="outline" size="sm" className="ml-auto h-9 gap-2">
          <Download className="size-3.5" /> Descargar CSV
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <RefreshCw className="size-3.5" /> Sincronizar con Meta
        </Button>
      </div>
      <p className="mb-4 text-[12px] text-muted-foreground">
        Estado local — sincronización automática cada hora.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Estado</TableHead>
              <TableHead>Campaña</TableHead>
              <TableHead>Regiones</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">Impresiones</TableHead>
              <TableHead className="text-right">Alcance</TableHead>
              <TableHead className="text-right">Clics</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Conv. WhatsApp</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-[12.5px] text-ok">
                    <span className="size-1.5 rounded-full bg-ok" /> Activa
                  </span>
                </TableCell>
                <TableCell>
                  <p className="max-w-[280px] truncate text-[13px] font-medium">{c.nombre}</p>
                  <p className="text-[11.5px] text-muted-foreground">{c.canal} · {c.vehiculos} vehículos</p>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-[12.5px] text-muted-foreground">
                  {c.regiones.join(", ")}
                </TableCell>
                <TableCell className="tabular text-right text-[13px]">{clp(c.presupuestoDiario)}<span className="text-muted-foreground">/día</span></TableCell>
                <TableCell className="tabular text-right text-[13px]">{clp(c.gasto)}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{numero(c.impresiones)}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{numero(c.alcance)}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{numero(c.clics)}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{porcentaje(c.ctr, 2)}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{c.convWhatsapp}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-7" aria-label="Acciones">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

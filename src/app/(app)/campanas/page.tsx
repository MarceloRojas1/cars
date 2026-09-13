import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clp, numero, porcentaje } from "@/lib/format";
import { getCampaigns } from "@/lib/data";
import type { Campaign } from "@/lib/types";

export const metadata = { title: "Campañas" };

/**
 * Cómo se pinta cada estado.
 *
 * La columna imprimía "Activa" en verde para TODAS las filas, sin mirar el
 * dato: una campaña pausada se veía corriendo. El color sigue la convención
 * del proyecto — solo aparece cuando significa algo.
 */
const ESTADO: Record<Campaign["estado"], { texto: string; clase: string }> = {
  activa: { texto: "Activa", clase: "text-ok" },
  pausada: { texto: "Pausada", clase: "text-warn" },
  borrador: { texto: "Borrador", clase: "text-muted-foreground" },
};

export default async function CampanasPage({ searchParams }: PageProps<"/campanas">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  const campaigns = await getCampaigns();

  const normalizar = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibles = q
    ? campaigns.filter((c) => normalizar(c.nombre).includes(normalizar(q)))
    : campaigns;

  return (
    <>
      {/*
        * Se fueron: el botón "Nueva campaña", "Descargar CSV", "Sincronizar
        * con Meta" y el menú de cada fila — ninguno tenía acción. También las
        * pestañas Activas/Pausadas/Borradores, que no filtraban y además
        * llevaban los contadores "(0)" escritos a mano.
        *
        * Y la línea "sincronización automática cada hora": esa sincronización
        * no existe. No hay cron en vercel.json ni ruta que la ejecute. Las
        * campañas se pueblan a mano hasta que se construya (ver docs/
        * escalar-a-200-clientes.md, "Sync de campañas Meta").
        */}
      <PageHeader
        titulo="Campañas"
        descripcion="Crea y gestiona tus campañas de Meta Ads"
      />

      {campaigns.length > 0 && (
        <form className="relative mb-4 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre…"
            className="h-9 pl-8"
          />
        </form>
      )}

      {/*
        * Sin campañas el buscador no se muestra, y entonces la línea de arriba
        * ya la puso el PageHeader: con las dos quedaba una banda vacía.
        */}
      <div className={`overflow-x-auto ${campaigns.length > 0 ? "border-t border-border" : ""}`}>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="py-10 text-center text-[13px] text-muted-foreground">
                  {q
                    ? `Ninguna campaña coincide con "${q}".`
                    : "Todavía no hay campañas."}
                </TableCell>
              </TableRow>
            )}
            {visibles.map((c) => {
              const estado = ESTADO[c.estado] ?? ESTADO.borrador;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className={`flex items-center gap-2 text-[12.5px] ${estado.clase}`}>
                      <span className="size-[5px] rounded-full bg-current opacity-70" />
                      {estado.texto}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[280px] truncate text-[13px] font-medium">{c.nombre}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {c.canal} · {c.vehiculos} {c.vehiculos === 1 ? "vehículo" : "vehículos"}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-[12.5px] text-muted-foreground">
                    {c.regiones.length ? c.regiones.join(", ") : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right text-[13px]">
                    {clp(c.presupuestoDiario)}<span className="text-muted-foreground">/día</span>
                  </TableCell>
                  <TableCell className="tabular text-right text-[13px]">{clp(c.gasto)}</TableCell>
                  <TableCell className="tabular text-right text-[13px]">{numero(c.impresiones)}</TableCell>
                  <TableCell className="tabular text-right text-[13px]">{numero(c.alcance)}</TableCell>
                  <TableCell className="tabular text-right text-[13px]">{numero(c.clics)}</TableCell>
                  <TableCell className="tabular text-right text-[13px]">{porcentaje(c.ctr, 2)}</TableCell>
                  <TableCell className="tabular text-right text-[13px]">{c.convWhatsapp}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

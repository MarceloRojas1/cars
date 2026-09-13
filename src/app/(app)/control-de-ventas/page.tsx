import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DiasEnSalon } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clp, fecha as fmtFecha } from "@/lib/format";
import { getCierresMensuales, getOperations, getUsers } from "@/lib/data";
import type { OperationKind } from "@/lib/types";

export const metadata = { title: "Control de Ventas" };

/** Cómo se lee cada tipo de operación en pantalla. */
const TIPO: Record<OperationKind, string> = {
  venta: "Venta",
  compra: "Compra",
  consignacion: "Consignación",
  nota_venta: "Nota de venta",
};

export default async function ControlDeVentasPage() {
  const [operations, users, cierres] = await Promise.all([
    getOperations(), getUsers(), getCierresMensuales(),
  ]);

  const ingresos = operations.reduce((a, o) => a + o.precio, 0);
  const utilidad = operations.reduce((a, o) => a + (o.precio - o.gastos), 0);

  /*
   * Los promedios se calculan solo si hay de qué promediar.
   *
   * Antes eran `ingresos / operations.length` sin más. Mientras la pantalla
   * servía la semilla el divisor era 14 y nunca se notó; con una automotora
   * sin ventas es una división por cero, y `clp(NaN)` imprimía "$NaN" en la
   * cabecera. Sin dato se muestra una raya, que es lo que significa.
   */
  const ticket = operations.length ? Math.round(ingresos / operations.length) : null;
  const diasProm = operations.length
    ? operations.reduce((a, o) => a + o.diasEnStock, 0) / operations.length
    : null;

  return (
    <>
      <PageHeader titulo="Control de Ventas" descripcion="Resumen del negocio, compras, consignaciones y notas de venta" />

      {/*
        * Los deltas "vs mes anterior" estaban escritos a mano en el JSX
        * (75%, 54%, -12%, 6%): cifras inventadas que no salían de ningún
        * cálculo y que se mostraban igual con cero ventas. Se van hasta que
        * haya de dónde sacarlas — es el mismo criterio que en el Dashboard.
        */}
      {/*
        * `border-b` y no `border-y`: la línea de arriba la pone el PageHeader.
        * Con las dos quedaba una banda vacía entre dos rayas, que antes tapaban
        * las pestañas que había en medio.
        */}
      <div className="mb-8 grid grid-cols-2 border-b border-border pb-6 xl:grid-cols-5">
        <StatCard etiqueta="Unidades vendidas" valor={operations.length} />
        <StatCard etiqueta="Ingresos" valor={clp(ingresos, { compacto: true })} />
        <StatCard etiqueta="Utilidad" valor={clp(utilidad, { compacto: true })} nota="Falta definir qué entra en gastos" />
        <StatCard etiqueta="Ticket promedio" valor={ticket === null ? "—" : clp(ticket, { compacto: true })} />
        <StatCard etiqueta="Días promedio en stock" valor={diasProm === null ? "—" : diasProm.toFixed(1)} />
      </div>

      {cierres.length > 0 && (
        <section className="mb-8 border border-border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="display text-[17px]">Cierres mensuales</h2>
          </div>
          {cierres.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 border-b px-4 py-3 last:border-b-0">
              <div className="flex-1">
                <p className="text-[13.5px] font-medium">
                  {fmtFecha(c.periodoInicio)} — {fmtFecha(c.periodoFin)}
                </p>
                {c.cerradoAt && (
                  <p className="text-[12px] text-muted-foreground">
                    Cerrado el {fmtFecha(c.cerradoAt)}
                  </p>
                )}
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-[11px] text-muted-foreground">Ventas</p>
                  <p className="tabular text-[14px] font-medium">{c.ventas}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Ingresos</p>
                  <p className="tabular text-[14px] font-medium">{clp(c.ingresos)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Utilidad</p>
                  <p className="tabular text-[14px] font-medium">{clp(c.utilidad)}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

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
            {operations.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-10 text-center text-[13px] text-muted-foreground">
                  Todavía no hay operaciones registradas.
                </TableCell>
              </TableRow>
            )}
            {operations.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="text-[13px] font-medium">{o.vehiculoTitulo}</p>
                  <p className="font-mono text-[11.5px] text-muted-foreground">{o.vehiculoCodigo}</p>
                </TableCell>
                {/* La columna imprimía "—" fijo teniendo el tipo en los datos. */}
                <TableCell className="text-[13px] text-muted-foreground">{TIPO[o.kind] ?? "—"}</TableCell>
                <TableCell className="text-[13px]">
                  {users.find((u) => u.id === o.vendedorId)?.nombre ?? "—"}
                </TableCell>
                <TableCell className="tabular text-right text-[13px]">{clp(o.precio)}</TableCell>
                <TableCell className="tabular text-right text-[13px] text-muted-foreground">
                  {o.gastos ? clp(o.gastos) : "—"}
                </TableCell>
                <TableCell className="tabular text-right text-[13px]">{clp(o.precio - o.gastos)}</TableCell>
                <TableCell className="text-right"><DiasEnSalon dias={o.diasEnStock} /></TableCell>
                <TableCell className="tabular text-right text-[12.5px] text-muted-foreground">{o.fecha}</TableCell>
              </TableRow>
            ))}
            {operations.length > 0 && (
              <TableRow className="border-t-2 font-medium hover:bg-transparent">
                <TableCell colSpan={3}>Totales</TableCell>
                <TableCell className="tabular text-right">{clp(ingresos)}</TableCell>
                <TableCell className="tabular text-right">—</TableCell>
                <TableCell className="tabular text-right text-ok">{clp(utilidad)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

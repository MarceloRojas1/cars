import Link from "next/link";
import { Car, ShoppingCart, Users, DollarSign, Flame, Clock, ChevronRight, Plus, Timer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DiasEnSalon } from "@/components/badges";
import { buttonVariants } from "@/components/ui/button";
import { clp } from "@/lib/format";
import { getResumenDashboard, getCurrentUser } from "@/lib/data";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [usuario, r] = await Promise.all([getCurrentUser(), getResumenDashboard()]);
  const nombrePila = usuario.nombre.split(" ")[0];

  return (
    <>
      <PageHeader
        titulo={`Hola, ${nombrePila}`}
        descripcion="Lo que requiere tu atención hoy"
      />

      <Link href="/vehiculos/nuevo" className={buttonVariants({ className: "mb-8 gap-2" })}>
        <Plus className="size-4" /> Agregar vehículo
      </Link>

      <div className="mb-8 grid grid-cols-2 border-y border-border py-6 xl:grid-cols-4">
        <StatCard etiqueta="Stock disponible" valor={r.stockDisponible} icon={Car} nota={`${r.publicados} publicados`} />
        <StatCard etiqueta="Ventas del mes" valor={r.ventasMes} icon={ShoppingCart} delta={{ valor: -100 }} />
        <StatCard etiqueta="Leads del mes" valor={r.leadsMes} icon={Users} delta={{ valor: -100 }} />
        <StatCard etiqueta="Utilidad del mes" valor={clp(r.utilidadMes)} icon={DollarSign} nota="Sin datos previos" />
      </div>

      <section className="mb-8 border border-border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Clock className="size-4 text-warn" />
          <h2 className="display text-[17px]">Requiere atención</h2>
          <span className="tabular rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {r.hotSinAtender + r.sinMovimiento + r.notasConSaldo.cantidad}
          </span>
        </div>

        <ul className="divide-y">
          <li className="flex items-center gap-3 border-l-2 border-l-crit px-4 py-3">
            <Flame className="size-4 shrink-0 text-hot" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium">{r.hotSinAtender} leads HOT sin atender</p>
              {r.hotSinAtenderNombres.length > 0 && (
                <p className="truncate text-[12px] text-muted-foreground">
                  {r.hotSinAtenderNombres.slice(0, 3).join(" · ")}
                  {r.hotSinAtenderNombres.length > 3 && ` +${r.hotSinAtenderNombres.length - 3} más`}
                </p>
              )}
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </li>

          <li className="border-l-2 border-l-warn bg-warn/5 px-4 py-3">
            <p className="mb-2 flex items-center gap-2 text-[13.5px] font-medium">
              <Clock className="size-4 text-warn" />
              {r.sinMovimiento} autos sin movimiento (+45 días)
            </p>
            <ul className="space-y-1.5 pl-6">
              {r.enSalon.slice(0, 5).map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="truncate font-medium">{v.titulo}</span>
                  <span className="text-muted-foreground">· {clp(v.precio)}</span>
                  <span className="ml-auto"><DiasEnSalon dias={v.publicadoHaceDias} /></span>
                </li>
              ))}
            </ul>
          </li>

          <li className="flex items-center gap-3 border-l-2 border-l-warn px-4 py-3">
            <DollarSign className="size-4 shrink-0 text-warn" />
            <div className="flex-1">
              <p className="text-[13.5px] font-medium">
                {r.notasConSaldo.cantidad} notas de venta con saldo pendiente
              </p>
              <p className="text-[12px] text-muted-foreground">
                Total pendiente: {clp(r.notasConSaldo.total)}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </li>
        </ul>
      </section>

      <div className="mb-8 grid gap-px bg-border lg:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <h2 className="display mb-3 text-[17px]">Mejor auto del mes</h2>
          <p className="text-[13px] text-muted-foreground">Sin ventas este mes</p>
        </div>
        <div className="border border-border bg-card p-5">
          <h2 className="display mb-3 text-[17px]">Leads por canal</h2>
          <p className="text-[13px] text-muted-foreground">Sin leads este mes</p>
        </div>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Timer className="size-4 text-warn" />
          <h2 className="display text-[17px]">Días en salón</h2>
          <Link href="/vehiculos" className="ml-auto flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
            Ver todos <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div className="px-4 py-3">
          <p className="mb-3 text-[13px] text-muted-foreground">
            <span className="font-semibold text-foreground">{r.enSalon.length}</span> autos llevan más de 30 días publicados ·{" "}
            <span className="font-medium text-crit">{r.criticos} críticos</span>
          </p>
          <ul className="space-y-1.5">
            {r.enSalon.slice(0, 5).map((v) => (
              <li key={v.id} className="flex items-center gap-3 border-b border-border px-1 py-2.5">
                <DiasEnSalon dias={v.publicadoHaceDias} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{v.titulo}</p>
                  <p className="tabular text-[12px] text-muted-foreground">{clp(v.precio)}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

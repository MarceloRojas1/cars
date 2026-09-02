import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clp, numero } from "@/lib/format";
import { getBranches, getMetricas, getOrganization, getUsers, getVehicles } from "@/lib/data";

export const metadata = { title: "Mi Plan" };

function Uso({ etiqueta, usado, limite }: { etiqueta: string; usado: number; limite: number }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[14px] font-medium">{etiqueta}</p>
        <p className="tabular text-[13px] text-muted-foreground">
          {numero(usado)} / {numero(limite)}
        </p>
      </div>
      <Progress value={(usado / limite) * 100} className="h-1.5" />
    </div>
  );
}

export default async function MiPlanPage() {
  const [org, users, branches, vehicles, metricas] = await Promise.all([
    getOrganization(), getUsers(), getBranches(), getVehicles(), getMetricas(),
  ]);
  const neto = 400000;
  const iva = Math.round(neto * 0.19);

  return (
    <>
      <PageHeader titulo="Mi Plan" descripcion="Gestiona tus datos de facturación y contrata addons." />

      <Tabs defaultValue="resumen" className="mb-5">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          <TabsTrigger value="pago">Método de pago</TabsTrigger>
          <TabsTrigger value="addons">Tienda de addons</TabsTrigger>
          <TabsTrigger value="cancelar">Cancelar</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="max-w-2xl space-y-3">
        <div className="flex items-center justify-between border border-border bg-card p-5">
          <div>
            <p className="overline">Estado</p>
            <p className="text-[17px] font-semibold text-ok">Activo</p>
          </div>
          <div className="text-right">
            <p className="overline">Próximo cobro</p>
            <p className="text-[17px] font-semibold">4 de agosto de 2026</p>
          </div>
        </div>

        <div className="border border-border bg-card p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[14px] font-medium">Conversaciones IA</p>
            <p className="tabular text-[13px] text-muted-foreground">
              {numero(metricas.conversacionesIaUsadas)} / {numero(org.limiteConversacionesIa)}
            </p>
          </div>
          <Progress value={(metricas.conversacionesIaUsadas / org.limiteConversacionesIa) * 100} className="h-1.5" />
          <Button variant="outline" size="sm" className="mt-3 h-7">Ver detalle</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Uso etiqueta="Usuarios" usado={users.length} limite={org.limiteUsuarios} />
          <Uso etiqueta="Sucursales" usado={branches.length} limite={org.limiteSucursales} />
          <Uso etiqueta="Vehículos" usado={vehicles.length} limite={org.limiteVehiculos} />
        </div>

        <div className="border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <p className="display text-[17px]">Estimado del próximo cobro</p>
            <p className="tabular text-[19px] font-bold">{clp(neto + iva)}</p>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Según tu uso a la fecha. El total puede variar si sigues consumiendo conversaciones.
          </p>
          <dl className="mt-4 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt>Plan</dt><dd className="tabular">{clp(neto)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Subtotal neto</dt><dd className="tabular">{clp(neto)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>IVA (19%)</dt><dd className="tabular">{clp(iva)}</dd></div>
            <div className="flex justify-between border-t pt-1.5 font-semibold"><dt>Total</dt><dd className="tabular">{clp(neto + iva)}</dd></div>
          </dl>
        </div>
      </div>
    </>
  );
}

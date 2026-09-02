import { ScanSearch, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Consultar patente" };

export default function ConsultarPatentePage() {
  return (
    <>
      <PageHeader
        titulo="Consultar patente"
        descripcion="Consulta datos del Registro Civil, tasación de mercado y alerta de encargo por robo sin crear un vehículo"
      />

      <div className="max-w-xl border border-border bg-card p-5">
        <p className="mb-3 flex items-center gap-2 text-[14px] font-medium">
          <ScanSearch className="size-4 text-primary" /> Ingresa una patente
        </p>
        <div className="flex gap-2">
          <Input placeholder="ABCD12" className="h-9 font-mono uppercase" maxLength={6} />
          <Button className="h-9 gap-2"><Search className="size-4" /> Consultar</Button>
        </div>
      </div>

      <p className="mt-3 max-w-xl text-[12px] text-muted-foreground">
        Los datos se cachean por 24 h para reducir costos.
      </p>

      <div className="mt-5 max-w-xl border-l-2 border-l-warn bg-warn/[0.06] px-4 py-3">
        <p className="text-[13px] font-medium text-warn">Falta definir el proveedor de datos</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          El Registro Civil no expone una API pública: esta pantalla necesita un proveedor
          contratado (AutoFact, Vehicular u otro). Hasta entonces el formulario no consulta nada.
        </p>
      </div>
    </>
  );
}

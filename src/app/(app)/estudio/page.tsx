import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TarjetaFondo } from "@/components/estudio/tarjeta-fondo";
import { GenerarFondo } from "@/components/estudio/generar-fondo";
import { getShowrooms } from "@/lib/data";
import { proveedorImagenActivo } from "@/lib/ia/imagenes";
import { recorteDisponible } from "@/lib/ia/imagenes/recorte";

export const metadata = { title: "Estudio IA" };

export default async function EstudioPage() {
  const { biblioteca, propios } = await getShowrooms();
  const proveedor = proveedorImagenActivo();
  const sinGenerar = biblioteca.filter((f) => !f.url).length;

  return (
    <>
      <PageHeader
        titulo="Estudio IA"
        descripcion="Fondos para fotografiar tu inventario sin sacarlo del taller"
        meta={
          <>
            <span className="tabular">{biblioteca.length - sinGenerar + propios.length}</span> fondos
            disponibles · generados con {proveedor.nombre}
          </>
        }
      />

      {/* Se avisa ANTES de que elija un vehículo: descubrir que el recorte no
          funciona a mitad del flujo es peor que saberlo al entrar. */}
      {!recorteDisponible() && (
        <p className="mb-6 border-l-2 border-l-warn bg-warn/[0.06] px-4 py-3 text-[12.5px] leading-relaxed">
          <span className="text-warn">El recorte automático no está disponible acá.</span>{" "}
          <span className="text-muted-foreground">
            Necesita python3 con rembg, que no corre en las funciones de Vercel.
            Los fondos se pueden generar y mirar; el montaje de un vehículo sobre
            un fondo solo funciona en un servidor con Python instalado.
          </span>
        </p>
      )}

      {/* Las dos cosas que se pueden hacer acá, dichas como acciones. */}
      <div className="mb-9 grid gap-3 sm:grid-cols-2">
        <Link
          href="/estudio/nueva"
          className="group border border-border bg-card px-5 py-5 transition-colors hover:bg-accent/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="display text-[18px]">Crear una pieza</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Eliges un vehículo y un fondo. Se recorta su foto y se abre el editor
                con el precio y los datos de su ficha ya puestos.
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        <div className="border border-border bg-card px-5 py-5">
          <h2 className="display text-[18px]">Crear un fondo</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Describes el lugar y {proveedor.nombre} lo genera con el encuadre correcto
            para montar un auto encima.
          </p>
          <div className="mt-3.5">
            <GenerarFondo proveedor={proveedor.nombre} />
          </div>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="etiqueta">Biblioteca Velie ({biblioteca.length})</h2>
          {sinGenerar > 0 && (
            <p className="text-[11.5px] text-muted-foreground">
              <span className="tabular">{sinGenerar}</span> sin generar ·{" "}
              <code className="tabular">npm run showrooms</code>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {biblioteca.map((f) => (
            <TarjetaFondo key={f.id} fondo={f} />
          ))}
        </div>
      </section>

      {propios.length > 0 && (
        <section className="mt-8">
          <h2 className="etiqueta mb-3">Mis showrooms ({propios.length})</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {propios.map((f) => (
              <TarjetaFondo key={f.id} fondo={f} />
            ))}
          </div>
        </section>
      )}

    </>
  );
}

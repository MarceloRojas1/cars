import Link from "next/link";
import Image from "next/image";
import { Plus, Lightbulb, ImageOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Completitud, DiasEnSalon, EstadoVehiculo } from "@/components/badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { VehiculoAcciones } from "@/components/vehiculo-acciones";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clp, km } from "@/lib/format";
import {
  buscarVehiculos, getBranches, getMarcasEnInventario, getOrganization,
  getUsers, POR_PAGINA,
} from "@/lib/data";
import { VehiculosFiltros } from "@/components/vehiculos-filtros";
import { Paginacion } from "@/components/paginacion";
import { VehiculosGrilla } from "@/components/vehiculos-grilla";
import { LayoutGrid, Rows3 } from "lucide-react";

export const metadata = { title: "Vehículos" };

const CANAL_LABEL: Record<string, string> = {
  mercadolibre: "ML", ml_propia: "ML+", chileautos: "CA", yapo: "YP",
};

export default async function VehiculosPage({ searchParams }: PageProps<"/vehiculos">) {
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const entero = (k: string) => {
    const n = Number(texto(k));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const verArchivados = texto("vista") === "archivados";
  const pagina = entero("pagina") ?? 1;

  // La grilla pide más por página: doce llenan tres o cuatro columnas sin
  // dejar una fila coja; la tabla se lee mejor de a diez.
  const enTabla = texto("modo") === "tabla";
  const porPagina = enTabla ? POR_PAGINA : 12;

  const filtros = {
    q: texto("q"),
    marca: texto("marca"),
    estado: texto("estado"),
    combustible: texto("combustible"),
    anioDesde: entero("anioDesde"),
    anioHasta: entero("anioHasta"),
    precioDesde: entero("precioDesde"),
    precioHasta: entero("precioHasta"),
    branchId: texto("branchId"),
    vendedorId: texto("vendedorId"),
    soloIncompletas: texto("incompletas") === "1",
    archivados: verArchivados,
    pagina,
    porPagina,
  };

  const [{ vehiculos: vehicles, total }, cuentaArchivados, marcas, branches, users, org] =
    await Promise.all([
      buscarVehiculos(filtros),
      buscarVehiculos({ archivados: true, porPagina: 1 }),
      getMarcasEnInventario(),
      getBranches(), getUsers(), getOrganization(),
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
              {total}/{org.limiteVehiculos}
            </span>{" "}
            vehículos publicados · {org.limiteVehiculos - total} disponibles
          </>
        }
        accion={
          <Link href="/vehiculos/nuevo" className={buttonVariants({ className: "gap-2" })}>
            <Plus className="size-4" /> Nuevo vehículo
          </Link>
        }
      />

      {incompletas > 0 && (
        <div className="mb-5 flex items-center gap-3 border-l-2 border-l-warn bg-warn/[0.06] px-4 py-3">
          <Lightbulb className="size-4 shrink-0 text-warn" />
          <p className="flex-1 text-[13.5px]">
            <span className="font-medium">{incompletas} publicaciones incompletas</span>
            <span className="text-muted-foreground"> — están perdiendo visibilidad frente a la competencia</span>
          </p>
          <Button size="sm" variant="outline" className="h-7">Completar</Button>
        </div>
      )}

      <nav className="mb-5 flex gap-5 border-b border-border">
        {[
          { href: "/vehiculos", etiqueta: "Activos", activo: !verArchivados },
          { href: "/vehiculos?vista=archivados", etiqueta: `Archivados (${cuentaArchivados.total})`, activo: verArchivados },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b py-2 text-[13px] transition-colors ${
              t.activo
                ? "border-b-foreground text-foreground"
                : "border-b-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.etiqueta}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <VehiculosFiltros
          marcas={marcas}
          sucursales={branches}
          vendedores={users.filter((u) => u.rol === "vendedor" || u.rol === "owner")}
        />

        {/*
          Las dos vistas se quedan: la grilla para mirar el inventario, la tabla
          para compararlo. Con cien autos y una columna de precios, una tabla
          sigue siendo más rápida de barrer que cualquier grilla.
        */}
        <div className="flex overflow-hidden rounded-lg border border-border" role="group" aria-label="Vista">
          {[
            { modo: "grilla", etiqueta: "Grilla", Icono: LayoutGrid, activo: !enTabla },
            { modo: "tabla", etiqueta: "Tabla", Icono: Rows3, activo: enTabla },
          ].map(({ modo, etiqueta, Icono, activo }) => {
            const q = new URLSearchParams(
              Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][],
            );
            q.delete("pagina");
            if (modo === "tabla") q.set("modo", "tabla");
            else q.delete("modo");
            const cadena = q.toString();

            return (
              <Link
                key={modo}
                href={cadena ? `/vehiculos?${cadena}` : "/vehiculos"}
                aria-current={activo ? "true" : undefined}
                title={etiqueta}
                className={`flex h-9 items-center gap-1.5 px-3 text-[12.5px] transition-colors ${
                  activo ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icono className="size-3.5" strokeWidth={1.5} />
                {etiqueta}
              </Link>
            );
          })}
        </div>
      </div>


      {vehicles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-6 py-16 text-center text-[13px] text-muted-foreground">
          {verArchivados
            ? "No hay vehículos archivados."
            : total === 0 && Object.keys(sp).length > 0
              ? "Ningún vehículo coincide con los filtros."
              : "Todavía no cargas ningún vehículo."}
        </p>
      ) : enTabla ? (
      <div className="overflow-x-auto border-t border-border">
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
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-14 text-center text-[13px] text-muted-foreground">
                  {verArchivados
                    ? "No hay vehículos archivados."
                    : total === 0 && Object.keys(sp).length > 0
                      ? "Ningún vehículo coincide con los filtros."
                      : "Todavía no cargas ningún vehículo."}
                </TableCell>
              </TableRow>
            )}
            {vehicles.map((v) => {
              const sucursal = branches.find((b) => b.id === v.branchId);
              const vendedor = users.find((u) => u.id === v.vendedorId);
              return (
                <TableRow key={v.id}>
                  <TableCell className="tabular text-[12px] text-muted-foreground">{v.codigo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {v.fotoPrincipal ? (
                        <Image
                          src={v.fotoPrincipal}
                          alt=""
                          width={52}
                          height={39}
                          className="size-[39px] w-[52px] shrink-0 border border-border object-cover"
                        />
                      ) : (
                        <span
                          className="grid size-[39px] w-[52px] shrink-0 place-items-center border border-dashed border-border text-muted-foreground/50"
                          title="Sin fotos"
                        >
                          <ImageOff className="size-3.5" strokeWidth={1.5} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[300px] truncate text-[13px] font-medium">{v.titulo}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {v.combustible} · {sucursal?.comuna}
                        </p>
                      </div>
                    </div>
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
                    <VehiculoAcciones
                      id={v.id} titulo={v.titulo} estado={v.estado} archivado={v.archivado}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      ) : (
        <VehiculosGrilla vehiculos={vehicles} sucursales={branches} />
      )}

      <Paginacion
        pagina={pagina}
        total={total}
        porPagina={porPagina}
        base="/vehiculos"
        params={Object.fromEntries(
          Object.entries(sp).filter(([, v]) => typeof v === "string"),
        ) as Record<string, string>}
      />
    </>
  );
}

import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClients } from "@/lib/data";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  const clients = await getClients();

  /*
   * El buscador filtra de verdad. Era un `Input` suelto, sin formulario ni
   * estado: se escribía en él y no pasaba nada.
   *
   * El filtro va en memoria y no en SQL porque la lista de contrapartes de una
   * automotora son decenas, no miles — y así el buscador funciona igual con la
   * semilla. Si algún día crece, se baja a la consulta.
   *
   * Se normaliza sin tildes: nadie escribe "Muñoz" con tilde en un buscador, y
   * el RUT se compara sin puntos ni guion por lo mismo.
   */
  const normalizar = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const soloDigitos = (s: string) => s.replace(/[^0-9kK]/g, "").toLowerCase();

  const visibles = q
    ? clients.filter(
        (c) =>
          normalizar(c.nombre).includes(normalizar(q)) ||
          (c.rut && soloDigitos(c.rut).includes(soloDigitos(q))),
      )
    : clients;

  return (
    <>
      {/*
        * El botón "Nuevo cliente" se fue: no tenía acción. Los clientes nacen
        * hoy de una operación de compra o consignación, no de un alta manual.
        */}
      <PageHeader
        titulo="Clientes"
        descripcion="Contrapartes de tus consignaciones y compras, deduplicadas por RUT."
      />

      <form className="relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o RUT…"
          className="h-9 pl-8"
        />
      </form>

      <div className="overflow-x-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Comuna</TableHead>
              <TableHead className="text-right">Operaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-10 text-center text-[13px] text-muted-foreground">
                  {q
                    ? `Ningún cliente coincide con "${q}".`
                    : "Todavía no hay clientes. Se crean al registrar una compra o una consignación."}
                </TableCell>
              </TableRow>
            )}
            {visibles.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-[13px] font-medium">{c.nombre}</TableCell>
                <TableCell className="tabular text-[13px] text-muted-foreground">{c.rut ?? "—"}</TableCell>
                <TableCell className="tabular text-[13px] text-muted-foreground">{c.telefono || "—"}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{c.comuna ?? "—"}</TableCell>
                <TableCell className="tabular text-right text-[13px]">{c.operaciones}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  actualizarVehiculoAction, consultarPatenteAction, crearVehiculoAction,
  type EstadoFormulario,
} from "@/app/(app)/vehiculos/acciones";
import { Campo, Seccion, Select, controlBase } from "@/components/form/campos";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CARROCERIAS, COLORES_EXTERIOR, COLORES_INTERIOR, COMBUSTIBLES,
  MARCAS, PUERTAS, TAGS, TRANSMISIONES,
} from "@/lib/catalogos";
import { REGIONES, NOMBRES_REGIONES } from "@/lib/geo-chile";
import { CargaDeFotos } from "@/components/form/fotos";
import { Combo } from "@/components/form/combo";
import type { AppUser, Branch, Vehicle } from "@/lib/types";

const MAX_TITULO = 100;
const inicial: EstadoFormulario = {};

export function VehiculoForm({
  catalogoModelos, sucursales, vendedores, vehiculo,
}: {
  catalogoModelos: Record<string, string[]>;
  sucursales: Branch[];
  vendedores: AppUser[];
  /** Si viene, el formulario edita en vez de crear. */
  vehiculo?: Vehicle;
}) {
  const editando = Boolean(vehiculo);
  const accion = vehiculo
    ? actualizarVehiculoAction.bind(null, vehiculo.id)
    : crearVehiculoAction;
  const [estado, enviar, pendiente] = useActionState(accion, inicial);

  const [marca, setMarca] = useState(vehiculo?.marca ?? "");
  const [modelo, setModelo] = useState(vehiculo?.modelo ?? "");
  const [version, setVersion] = useState(vehiculo?.version ?? "");
  const [anio, setAnio] = useState(vehiculo?.anio ? String(vehiculo.anio) : "");

  // El título se arma solo hasta que lo tocas. Desde ahí manda lo que escribiste.
  const [tituloManual, setTituloManual] = useState<string | null>(vehiculo?.titulo ?? null);
  const tituloAuto = useMemo(
    () => [marca, modelo, version, anio].filter(Boolean).join(" ").trim(),
    [marca, modelo, version, anio],
  );
  const titulo = tituloManual ?? tituloAuto;

  const sucursalInicial = sucursales.find((s) => s.id === vehiculo?.branchId) ?? sucursales[0];
  const [sucursalId, setSucursalId] = useState(sucursalInicial?.id ?? "");
  const [region, setRegion] = useState(vehiculo?.region ?? sucursalInicial?.region ?? "");
  const [comuna, setComuna] = useState(vehiculo?.comuna ?? sucursalInicial?.comuna ?? "");

  /** Al cambiar de sucursal se reubica el auto, salvo que ya lo hayas movido a mano. */
  function elegirSucursal(id: string) {
    setSucursalId(id);
    const suc = sucursales.find((s) => s.id === id);
    if (suc) { setRegion(suc.region); setComuna(suc.comuna); }
  }

  const [patente, setPatente] = useState(vehiculo?.patente ?? "");
  const [buscando, setBuscando] = useState(false);
  const [avisoPatente, setAvisoPatente] = useState<
    { tipo: "ok" | "error"; texto: string } | null
  >(null);
  const [carroceriaAuto, setCarroceriaAuto] = useState<string | undefined>();
  /** Campos que rellena la consulta de patente; el vendedor los puede corregir. */
  const [desdePatente, setDesdePatente] = useState<Record<string, string>>({});
  const campo = (k: string, guardado?: string | number) =>
    desdePatente[k] ?? (guardado !== undefined ? String(guardado) : "");

  async function buscarPorPatente() {
    setBuscando(true);
    setAvisoPatente(null);
    try {
      const r = await consultarPatenteAction(patente);
      if (!r.ok) {
        setAvisoPatente({ tipo: "error", texto: r.mensaje });
        return;
      }
      const d = r.datos;
      if (d.marca) setMarca(d.marca);
      if (d.modelo) setModelo(d.modelo);
      if (d.version) setVersion(d.version);
      if (d.anio) setAnio(String(d.anio));
      if (d.carroceria) setCarroceriaAuto(d.carroceria);

      // Lo que solo llega con el plan extendido. Si no viene, no se toca.
      const traidos: Record<string, string> = {};
      if (d.km) traidos.km = String(d.km);
      if (d.combustible) traidos.combustible = d.combustible;
      if (d.transmision) traidos.transmision = d.transmision;
      if (d.puertas) traidos.puertas = String(d.puertas);
      if (d.color) traidos.colorExterior = d.color;
      if (d.vin) traidos.vin = d.vin;
      if (d.motor) traidos.numeroMotor = d.motor;
      if (d.cilindrada) traidos.cilindrada = d.cilindrada;
      setDesdePatente((prev) => ({ ...prev, ...traidos }));

      setTituloManual(null); // que el título se rearme con lo que llegó
      setAvisoPatente({
        tipo: "ok",
        texto: [
          "Ficha rellenada" + (d.desdeCache ? " (dato en caché)" : "") + ".",
          d.extendido ? "" : "El plan gratuito no trae la ficha técnica.",
          "Revísala antes de guardar.",
        ].filter(Boolean).join(" "),
      });
    } finally {
      setBuscando(false);
    }
  }

  const [unicoDueno, setUnicoDueno] = useState(vehiculo?.cantidadDuenos === 1);
  const [tags, setTags] = useState<string[]>(vehiculo?.tags ?? []);
  const [tagPropio, setTagPropio] = useState("");

  const modelos = catalogoModelos[marca] ?? [];
  const e = estado.errores ?? {};

  const alternarTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const agregarTagPropio = () => {
    const limpio = tagPropio.trim();
    if (limpio && !tags.includes(limpio)) setTags([...tags, limpio]);
    setTagPropio("");
  };

  return (
    <form action={enviar}>
      {tags.map((t) => (
        <input key={t} type="hidden" name="tags" value={t} />
      ))}

      {/* --- búsqueda por patente --- */}
      <section className="mb-2 border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[200px] flex-col gap-1.5">
            <label htmlFor="patente" className="etiqueta">Patente</label>
            <input
              id="patente"
              name="patente"
              value={patente}
              onChange={(ev) => setPatente(ev.target.value.toUpperCase())}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") { ev.preventDefault(); buscarPorPatente(); }
              }}
              maxLength={8}
              placeholder="ABCD12"
              className={cn(controlBase, "font-mono uppercase")}
            />
          </div>
          <Button
            type="button" variant="outline" className="h-9 gap-2"
            onClick={buscarPorPatente}
            disabled={buscando || patente.trim().length < 6}
          >
            <Search className="size-3.5" />
            {buscando ? "Buscando…" : "Buscar y rellenar"}
          </Button>
          <p className="flex-1 text-[11.5px] leading-relaxed">
            {avisoPatente ? (
              <span className={avisoPatente.tipo === "ok" ? "text-ok" : "text-crit"}>
                {avisoPatente.texto}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Trae la ficha desde el Registro Civil. Lo que llegue se puede
                corregir antes de guardar.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* --- 1. identificación --- */}
      <Seccion
        numero="01"
        titulo="Identificación"
        descripcion="Lo mínimo para guardar: marca, modelo, año y precio."
      >
        <Campo label="Marca" htmlFor="marca" error={e.marca} hint="Si no está en la lista, escríbela.">
          <Combo
            id="marca" name="marca" value={marca} opciones={MARCAS}
            onChange={(v) => { setMarca(v); setModelo(""); }}
          />
        </Campo>

        <Campo
          label="Modelo" htmlFor="modelo" error={e.modelo}
          hint={marca ? `${modelos.length} sugeridos para ${marca}` : "Elige primero una marca."}
        >
          <Combo
            id="modelo" name="modelo" value={modelo} opciones={modelos}
            onChange={setModelo}
          />
        </Campo>

        <Campo label="Versión" htmlFor="version" hint="Ej: 2.0 TFSI Highline">
          <input
            id="version" name="version" value={version}
            onChange={(ev) => setVersion(ev.target.value)} className={controlBase}
          />
        </Campo>

        <Campo label="Año" htmlFor="anio" error={e.anio}>
          <input
            id="anio" name="anio" inputMode="numeric" maxLength={4} value={anio}
            onChange={(ev) => setAnio(ev.target.value.replace(/\D/g, ""))}
            className={cn(controlBase, "tabular")}
          />
        </Campo>

        <Campo
          label="Título de la publicación" htmlFor="titulo" ancho="completo" error={e.titulo}
        >
          <input
            id="titulo" name="titulo" value={titulo} maxLength={MAX_TITULO}
            onChange={(ev) => setTituloManual(ev.target.value)}
            className={controlBase}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-muted-foreground">
              {tituloManual === null
                ? "Se arma solo con marca + modelo + versión + año."
                : "Lo estás editando a mano."}
              {tituloManual !== null && (
                <button
                  type="button"
                  onClick={() => setTituloManual(null)}
                  className="ml-2 text-foreground underline underline-offset-2"
                >
                  volver al automático
                </button>
              )}
            </p>
            <span
              className={cn(
                "tabular text-[11.5px]",
                titulo.length > MAX_TITULO - 10 ? "text-warn" : "text-muted-foreground",
              )}
            >
              {titulo.length}/{MAX_TITULO}
            </span>
          </div>
        </Campo>
      </Seccion>

      {/* --- 2. precio --- */}
      <Seccion numero="02" titulo="Precio" descripcion="En pesos, sin decimales.">
        <Campo label="Precio de venta" htmlFor="precio" error={e.precio}>
          <input
            id="precio" name="precio" inputMode="numeric" placeholder="16450000"
            defaultValue={vehiculo?.precio ?? ""}
            className={cn(controlBase, "tabular")}
          />
        </Campo>
        <Campo
          label="Pie de financiamiento" htmlFor="pieFinanciamiento"
          hint="Opcional. Se publica como “pie desde”."
        >
          <input
            id="pieFinanciamiento" name="pieFinanciamiento" inputMode="numeric"
            defaultValue={vehiculo?.pieFinanciamiento ?? ""}
            className={cn(controlBase, "tabular")}
          />
        </Campo>
      </Seccion>

      {/* --- 3. ficha técnica --- */}
      <Seccion numero="03" titulo="Ficha técnica" descripcion="Todo opcional, pero suma a la completitud del aviso.">
        <Campo label="Kilometraje" htmlFor="km">
          <input id="km" name="km" inputMode="numeric"
            value={campo("km", vehiculo?.km)}
            onChange={(ev) => setDesdePatente((p) => ({ ...p, km: ev.target.value }))}
            className={cn(controlBase, "tabular")} />
        </Campo>
        <Campo label="Combustible" htmlFor="combustible">
          <Select id="combustible" name="combustible"
            value={campo("combustible", vehiculo?.combustible)}
            onChange={(ev) => setDesdePatente((p) => ({ ...p, combustible: ev.target.value }))}>
            <option value="">Sin especificar</option>
            {COMBUSTIBLES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Campo>
        <Campo label="Transmisión" htmlFor="transmision">
          <Select id="transmision" name="transmision"
            value={campo("transmision", vehiculo?.transmision)}
            onChange={(ev) => setDesdePatente((p) => ({ ...p, transmision: ev.target.value }))}>
            <option value="">Sin especificar</option>
            {TRANSMISIONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Carrocería" htmlFor="carroceria">
          <Select
            id="carroceria" name="carroceria"
            value={carroceriaAuto ?? undefined}
            defaultValue={carroceriaAuto ? undefined : (vehiculo?.carroceria ?? "")}
            onChange={(ev) => setCarroceriaAuto(ev.target.value)}
          >
            <option value="">Sin especificar</option>
            {CARROCERIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Campo>
        <Campo label="Puertas" htmlFor="puertas">
          <Select id="puertas" name="puertas"
            value={campo("puertas", vehiculo?.puertas)}
            onChange={(ev) => setDesdePatente((p) => ({ ...p, puertas: ev.target.value }))}>
            <option value="">Sin especificar</option>
            {PUERTAS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Campo>
        <Campo label="Color exterior" htmlFor="colorExterior">
          <Combo
            id="colorExterior" name="colorExterior" opciones={COLORES_EXTERIOR}
            value={campo("colorExterior", vehiculo?.colorExterior)}
            onChange={(v) => setDesdePatente((p) => ({ ...p, colorExterior: v }))}
          />
        </Campo>
        <Campo label="Cilindrada" htmlFor="cilindrada" hint="Ej: 2.0">
          <input
            id="cilindrada" name="cilindrada"
            value={campo("cilindrada", vehiculo?.cilindrada)}
            onChange={(ev) => setDesdePatente((p) => ({ ...p, cilindrada: ev.target.value }))}
            className={cn(controlBase, "tabular")}
          />
        </Campo>
        <Campo label="Color interior" htmlFor="colorInterior">
          <Combo
            id="colorInterior" name="colorInterior" opciones={COLORES_INTERIOR}
            value={campo("colorInterior", vehiculo?.colorInterior)}
            onChange={(v) => setDesdePatente((p) => ({ ...p, colorInterior: v }))}
          />
        </Campo>
      </Seccion>

      {/* --- 4. documentación --- */}
      <Seccion numero="04" titulo="Documentación" descripcion="Fechas de vencimiento e historial de dueños.">
        <Campo label="VIN / chasis" htmlFor="vin" hint="Llega con el plan extendido de patentes.">
          <input
            id="vin" name="vin" maxLength={17}
            value={campo("vin", vehiculo?.vin)}
            onChange={(ev) => setDesdePatente((p) => ({ ...p, vin: ev.target.value.toUpperCase() }))}
            className={cn(controlBase, "tabular uppercase")}
          />
        </Campo>
        <Campo label="N.º de motor" htmlFor="numeroMotor" hint="Va en la transferencia.">
          <input
            id="numeroMotor" name="numeroMotor"
            value={campo("numeroMotor", vehiculo?.numeroMotor)}
            onChange={(ev) => setDesdePatente((p) => ({ ...p, numeroMotor: ev.target.value.toUpperCase() }))}
            className={cn(controlBase, "tabular uppercase")}
          />
        </Campo>
        <Campo label="Permiso de circulación vence" htmlFor="permisoCirculacionVence">
          <input
            id="permisoCirculacionVence" name="permisoCirculacionVence" type="date"
            defaultValue={vehiculo?.permisoCirculacionVence ?? ""}
            className={controlBase}
          />
        </Campo>
        <Campo label="Revisión técnica vence" htmlFor="revisionTecnicaVence">
          <input
            id="revisionTecnicaVence" name="revisionTecnicaVence" type="date"
            defaultValue={vehiculo?.revisionTecnicaVence ?? ""}
            className={controlBase}
          />
        </Campo>

        <div className="sm:col-span-2">
          <div className="flex items-center gap-3 border border-border px-4 py-3">
            <Switch
              id="unicoDueno" checked={unicoDueno}
              onCheckedChange={(v) => setUnicoDueno(Boolean(v))}
            />
            <label htmlFor="unicoDueno" className="text-[13.5px]">Único dueño</label>
            <input type="hidden" name="cantidadDuenos" value={unicoDueno ? "1" : ""} />
          </div>

          {!unicoDueno && (
            <div className="mt-4 max-w-[220px]">
              <Campo label="¿Cuántos dueños tuvo?" htmlFor="duenos" hint="Déjalo vacío si no lo sabes.">
                <input
                  id="duenos" name="cantidadDuenos" inputMode="numeric"
                  defaultValue={vehiculo?.cantidadDuenos !== 1 ? vehiculo?.cantidadDuenos ?? "" : ""}
                  className={cn(controlBase, "tabular")}
                />
              </Campo>
            </div>
          )}
        </div>
      </Seccion>

      {/* --- 5. presentación --- */}
      <Seccion numero="05" titulo="Presentación" descripcion="Cómo se le muestra el auto al comprador.">
        <div className="sm:col-span-2">
          <p className="etiqueta mb-2.5">Tags</p>
          <div className="flex flex-wrap gap-2">
            {[...TAGS, ...tags.filter((t) => !TAGS.includes(t as never))].map((t) => (
              <button
                key={t} type="button" onClick={() => alternarTag(t)}
                aria-pressed={tags.includes(t)}
                className={cn(
                  "border px-2.5 py-1 text-[12px] transition-colors",
                  tags.includes(t)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 flex max-w-sm gap-2">
            <input
              value={tagPropio}
              onChange={(ev) => setTagPropio(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") { ev.preventDefault(); agregarTagPropio(); }
              }}
              placeholder="Agregar uno propio"
              className={controlBase}
            />
            <Button type="button" variant="outline" onClick={agregarTagPropio} className="h-9 shrink-0">
              Agregar
            </Button>
          </div>
        </div>

        <Campo label="Equipamiento" htmlFor="equipamiento" ancho="completo"
          hint="Aire acondicionado, cámara de retroceso, mantenciones al día…">
          <textarea
            id="equipamiento" name="equipamiento" rows={5}
            defaultValue={vehiculo?.equipamiento ?? ""}
            className={cn(controlBase, "h-auto resize-y py-2 leading-relaxed")}
          />
        </Campo>
      </Seccion>

      {/* --- 6. descripción --- */}
      <Seccion
        numero="06"
        titulo="Descripción"
        descripcion="El texto que lee el comprador. Cuenta el estado real del auto y su historia."
      >
        <Campo
          label="Descripción de la publicación" htmlFor="descripcion" ancho="completo"
          hint="Mantenciones, detalles estéticos, motivo de venta, todo lo que evite una consulta."
        >
          <textarea
            id="descripcion" name="descripcion" rows={7}
            defaultValue={vehiculo?.descripcion ?? ""}
            className={cn(controlBase, "h-auto resize-y py-2 leading-relaxed")}
          />
        </Campo>
      </Seccion>

      {/* --- 7. ubicación y asignación --- */}
      <Seccion
        numero="07"
        titulo="Ubicación y asignación"
        descripcion="Dónde está el auto y quién lo atiende. La región y la comuna se prellenan con la sucursal."
      >
        <Campo label="Sucursal" htmlFor="branchId">
          <Select
            id="branchId" name="branchId" value={sucursalId}
            onChange={(ev) => elegirSucursal(ev.target.value)}
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </Select>
        </Campo>

        <Campo label="Vendedor asignado" htmlFor="vendedorId" hint="Puede quedar sin asignar.">
          <Select id="vendedorId" name="vendedorId" defaultValue={vehiculo?.vendedorId ?? ""}>
            <option value="">Sin asignar</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </Select>
        </Campo>

        <Campo label="Región" htmlFor="region">
          <Select
            id="region" name="region" value={region}
            onChange={(ev) => { setRegion(ev.target.value); setComuna(""); }}
          >
            <option value="">Sin especificar</option>
            {NOMBRES_REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Campo>

        <Campo
          label="Comuna" htmlFor="comuna"
          hint={region ? undefined : "Elige primero una región."}
        >
          <Select
            id="comuna" name="comuna" value={comuna} disabled={!region}
            onChange={(ev) => setComuna(ev.target.value)}
          >
            <option value="">Sin especificar</option>
            {(REGIONES[region] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Campo>
      </Seccion>

      {/* --- 8. fotos --- */}
      <Seccion
        numero="08"
        titulo="Fotos"
        descripcion="Los avisos con más fotos reciben más consultas. La principal encabeza la publicación."
      >
        <CargaDeFotos iniciales={vehiculo?.fotos} />
      </Seccion>

      {/* --- acciones --- */}
      <div className="sticky bottom-0 -mx-5 flex items-center gap-4 border-t border-border bg-background px-5 py-4 lg:-mx-8 lg:px-8">
        <Button type="submit" disabled={pendiente} className="h-9">
          {pendiente ? "Guardando…" : editando ? "Guardar cambios" : "Publicar vehículo"}
        </Button>
        <Link
          href="/vehiculos"
          className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Cancelar
        </Link>
        {estado.mensaje && <p className="text-[12.5px] text-crit">{estado.mensaje}</p>}
      </div>
    </form>
  );
}

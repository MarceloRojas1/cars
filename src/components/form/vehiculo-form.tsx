"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  actualizarVehiculoAction, consultarPatenteAction, consultarTasacionAction,
  crearVehiculoAction, type EstadoFormulario,
} from "@/app/(app)/vehiculos/acciones";
import { Campo, Seccion, Select, controlBase } from "@/components/form/campos";
import { ADQUISICIONES, ADQUISICION_LABEL, type TipoAdquisicion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { clp } from "@/lib/format";
import {
  CARROCERIAS, COLORES_EXTERIOR, COLORES_INTERIOR, COMBUSTIBLES,
  MARCAS, PUERTAS, TAGS, TRANSMISIONES,
} from "@/lib/catalogos";
import { REGIONES, NOMBRES_REGIONES } from "@/lib/geo-chile";
import { CargaDeFotos } from "@/components/form/fotos";
import { Combo } from "@/components/form/combo";
import type { DatosTasacion, ResultadoPatente, ResultadoTasacion } from "@/lib/patente";
import type { AppUser, Branch, Vehicle, VehiclePhoto } from "@/lib/types";

const MAX_TITULO = 100;
const inicial: EstadoFormulario = {};

/** Solo se usa creando (no editando): un vehículo real ya tiene su propia verdad guardada. */
const CLAVE_BORRADOR = "velie:borrador-vehiculo";

function escribirEnDom(form: HTMLFormElement, nombre: string, valor: string) {
  const el = form.elements.namedItem(nombre);
  if (el && "value" in el) (el as unknown as { value: string }).value = valor;
}

type AvisoPatente = { tipo: "ok" | "error"; texto: string };

/**
 * Traduce un `ResultadoPatente` a lo que necesita el formulario. La misma
 * función arma el estado inicial (búsqueda ya resuelta en el servidor,
 * viniendo de "Consultar patente") y el resultado de una búsqueda manual —
 * un solo lugar donde vive el mapeo, no dos copias que se puedan desalinear.
 */
function camposDesdeResultado(r: ResultadoPatente) {
  if (!r.ok) {
    return { aviso: { tipo: "error", texto: r.mensaje } satisfies AvisoPatente };
  }
  const d = r.datos;

  // Lo que solo llega con el plan extendido. Si no viene, no se toca.
  const desdePatente: Record<string, string> = {};
  if (d.km) desdePatente.km = String(d.km);
  if (d.combustible) desdePatente.combustible = d.combustible;
  if (d.transmision) desdePatente.transmision = d.transmision;
  if (d.puertas) desdePatente.puertas = String(d.puertas);
  if (d.color) desdePatente.colorExterior = d.color;
  if (d.vin) desdePatente.vin = d.vin;
  if (d.motor) desdePatente.numeroMotor = d.motor;
  if (d.cilindrada) desdePatente.cilindrada = d.cilindrada;

  return {
    marca: d.marca, modelo: d.modelo, version: d.version,
    anio: d.anio ? String(d.anio) : undefined,
    carroceria: d.carroceria,
    desdePatente,
    aviso: {
      tipo: "ok",
      texto: [
        "Ficha rellenada" + (d.desdeCache ? " (dato en caché)" : "") + ".",
        d.extendido ? "" : "El plan gratuito no trae la ficha técnica.",
        "Revísala antes de guardar.",
      ].filter(Boolean).join(" "),
    } satisfies AvisoPatente,
  };
}

export function VehiculoForm({
  catalogoModelos, sucursales, vendedores, vehiculo, patenteInicial,
  resultadoPatenteInicial, resultadoTasacionInicial, adquisicionInicial,
}: {
  catalogoModelos: Record<string, string[]>;
  sucursales: Branch[];
  vendedores: AppUser[];
  /** Si viene, el formulario edita en vez de crear. */
  vehiculo?: Vehicle;
  /** Viene de "Consultar patente": la patente que se escribió allá. */
  patenteInicial?: string;
  /** La búsqueda de `patenteInicial`, ya resuelta en el servidor. */
  resultadoPatenteInicial?: ResultadoPatente;
  /** La tasación de `patenteInicial`, ya resuelta en el servidor. Solo informativa. */
  resultadoTasacionInicial?: ResultadoTasacion;
  /** Elegido en el paso previo. Decide qué condiciones se piden. */
  adquisicionInicial?: TipoAdquisicion;
}) {
  const editando = Boolean(vehiculo);
  const accion = vehiculo
    ? actualizarVehiculoAction.bind(null, vehiculo.id)
    : crearVehiculoAction;
  const [estado, enviar, pendiente] = useActionState(accion, inicial);

  const campos = resultadoPatenteInicial ? camposDesdeResultado(resultadoPatenteInicial) : null;

  const [marca, setMarca] = useState(campos?.marca ?? vehiculo?.marca ?? "");
  const [modelo, setModelo] = useState(campos?.modelo ?? vehiculo?.modelo ?? "");
  const [version, setVersion] = useState(campos?.version ?? vehiculo?.version ?? "");
  const [anio, setAnio] = useState(campos?.anio ?? (vehiculo?.anio ? String(vehiculo.anio) : ""));

  // El título se arma solo hasta que lo tocas. Desde ahí manda lo que escribiste.
  const [tituloManual, setTituloManual] = useState<string | null>(vehiculo?.titulo ?? null);
  const tituloAuto = useMemo(
    () => [marca, modelo, version, anio].filter(Boolean).join(" ").trim(),
    [marca, modelo, version, anio],
  );
  const titulo = tituloManual ?? tituloAuto;

  const [precio, setPrecio] = useState(vehiculo?.precio ? String(vehiculo.precio) : "");
  /*
   * Vacío es un valor válido: los autos que ya están cargados no saben cómo
   * llegaron, y obligar a elegir haría inventar el dato. Volver a tocar el
   * botón elegido lo deja en blanco.
   */
  const [adquisicion, setAdquisicion] = useState<string>(
    vehiculo?.adquisicion ?? adquisicionInicial ?? "",
  );

  /*
   * Las condiciones con que entró. Cuáles se piden depende del tipo: una
   * compra pide cuánto se pagó; una consignación, entre cuánto se puede
   * publicar, qué comisión queda y cuánto se le promete al dueño.
   */
  const [precioCompra, setPrecioCompra] = useState(
    vehiculo?.precioCompra ? String(vehiculo.precioCompra) : "");
  const [comisionCompra, setComisionCompra] = useState(
    vehiculo?.comisionCompra ? String(vehiculo.comisionCompra) : "");
  const [publicacionMin, setPublicacionMin] = useState(
    vehiculo?.publicacionMin ? String(vehiculo.publicacionMin) : "");
  const [publicacionMax, setPublicacionMax] = useState(
    vehiculo?.publicacionMax ? String(vehiculo.publicacionMax) : "");
  const [comisionConsignacion, setComisionConsignacion] = useState(
    vehiculo?.comisionConsignacion ? String(vehiculo.comisionConsignacion) : "");
  const [libreAPago, setLibreAPago] = useState(
    vehiculo?.libreAPago ? String(vehiculo.libreAPago) : "");

  // El pie se puede escribir en pesos o en porcentaje del precio; lo que se
  // guarda siempre es el monto en pesos (ver DatosPatente/pieFinanciamiento).
  const [modoPie, setModoPie] = useState<"monto" | "porcentaje">("monto");
  const [pieValor, setPieValor] = useState(
    vehiculo?.pieFinanciamiento ? String(vehiculo.pieFinanciamiento) : "",
  );
  function cambiarModoPie(nuevo: "monto" | "porcentaje") {
    if (nuevo === modoPie) return;
    const n = Number(pieValor);
    const precioNum = Number(precio);
    if (n > 0 && precioNum > 0) {
      setPieValor(
        nuevo === "porcentaje"
          ? String(Math.round((n / precioNum) * 100))
          : String(Math.round((n / 100) * precioNum)),
      );
    }
    setModoPie(nuevo);
  }
  const pieEnPesos = modoPie === "monto"
    ? pieValor
    : (Number(pieValor) > 0 && Number(precio) > 0
      ? String(Math.round((Number(pieValor) / 100) * Number(precio)))
      : "");

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

  const [patente, setPatente] = useState(patenteInicial ?? vehiculo?.patente ?? "");
  const [buscando, setBuscando] = useState(false);
  const [avisoPatente, setAvisoPatente] = useState<AvisoPatente | null>(campos?.aviso ?? null);
  const [carroceriaAuto, setCarroceriaAuto] = useState<string | undefined>(campos?.carroceria);
  /** Campos que rellena la consulta de patente; el vendedor los puede corregir. */
  const [desdePatente, setDesdePatente] = useState<Record<string, string>>(
    campos?.desdePatente ?? {},
  );
  const campo = (k: string, guardado?: string | number) =>
    desdePatente[k] ?? (guardado !== undefined ? String(guardado) : "");

  /** Solo informativa: referencia de mercado, nunca llena el precio de venta. */
  const [tasacion, setTasacion] = useState<DatosTasacion | undefined>(
    resultadoTasacionInicial?.ok ? resultadoTasacionInicial.datos : undefined,
  );

  async function buscarPorPatente() {
    setBuscando(true);
    setAvisoPatente(null);
    try {
      const [r, t] = await Promise.all([
        consultarPatenteAction(patente),
        consultarTasacionAction(patente),
      ]);
      setTasacion(t.ok ? t.datos : undefined);

      const c = camposDesdeResultado(r);
      if (!r.ok) {
        setAvisoPatente(c.aviso);
        return;
      }
      if (c.marca) setMarca(c.marca);
      if (c.modelo) setModelo(c.modelo);
      if (c.version) setVersion(c.version);
      if (c.anio) setAnio(c.anio);
      if (c.carroceria) setCarroceriaAuto(c.carroceria);
      setDesdePatente((prev) => ({ ...prev, ...c.desdePatente }));
      setTituloManual(null); // que el título se rearme con lo que llegó
      setAvisoPatente(c.aviso);
    } finally {
      setBuscando(false);
    }
  }

  const [unicoDueno, setUnicoDueno] = useState(vehiculo?.cantidadDuenos === 1);
  const [tags, setTags] = useState<string[]>(vehiculo?.tags ?? []);
  const [tagPropio, setTagPropio] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const [fotosRestauradas, setFotosRestauradas] = useState<VehiclePhoto[] | null>(null);
  const [avisoBorrador, setAvisoBorrador] = useState<number | null>(null);

  /**
   * Restaura lo que se estaba llenando si se salió o recargó la página antes
   * de publicar. No pisa una edición real (`vehiculo` ya tiene su propia
   * verdad en la base) ni una búsqueda de patente recién resuelta en el
   * servidor (`patenteInicial`) — esa es más nueva que cualquier borrador.
   */
  useEffect(() => {
    if (editando || patenteInicial) return;

    // Diferido a un microtask: el linter de React exige que un efecto no
    // llame a setState de forma síncrona en su propio cuerpo (mismo motivo
    // que en el fetch de "Consultar patente" — ver docs/decisiones.md).
    queueMicrotask(function restaurarBorrador() {
      let crudo: string | null;
      try {
        crudo = localStorage.getItem(CLAVE_BORRADOR);
      } catch {
        return; // localStorage bloqueado (modo privado): no hay borrador que ofrecer.
      }
      if (!crudo) return;

      let guardado: { guardadoEn: number; campos: Record<string, string | string[]> } | null;
      try {
        guardado = JSON.parse(crudo);
      } catch {
        guardado = null;
      }
      const campos = guardado?.campos;
      if (!campos) return;

      // Los nombres son los `name=` del formulario, no los estados de React.
      const CONTROLADOS: Record<string, (v: string) => void> = {
        patente: setPatente, marca: setMarca, modelo: setModelo, version: setVersion,
        anio: setAnio, titulo: setTituloManual, precio: setPrecio,
        pieFinanciamiento: (v) => { setModoPie("monto"); setPieValor(v); },
        carroceria: setCarroceriaAuto, branchId: setSucursalId,
        region: setRegion, comuna: setComuna,
      };
      const DE_PATENTE = [
        "km", "combustible", "transmision", "puertas",
        "colorExterior", "colorInterior", "vin", "numeroMotor", "cilindrada",
      ];

      const form = formRef.current;
      const nuevoDesdePatente: Record<string, string> = {};

      for (const [nombre, valor] of Object.entries(campos)) {
        if (nombre === "tags") {
          setTags(Array.isArray(valor) ? valor : [valor]);
          continue;
        }
        if (nombre === "fotos" && typeof valor === "string") {
          try {
            const guardadas = JSON.parse(valor) as { url: string; esPrincipal: boolean }[];
            setFotosRestauradas(
              guardadas.map((f, i) => ({ id: f.url, url: f.url, orden: i, esPrincipal: f.esPrincipal })),
            );
          } catch { /* nada que restaurar */ }
          continue;
        }
        if (typeof valor !== "string") continue;
        if (nombre === "cantidadDuenos") {
          setUnicoDueno(valor === "1");
          if (valor !== "1" && form) escribirEnDom(form, nombre, valor);
          continue;
        }
        if (DE_PATENTE.includes(nombre)) { nuevoDesdePatente[nombre] = valor; continue; }
        if (CONTROLADOS[nombre]) { CONTROLADOS[nombre](valor); continue; }
        // El resto (equipamiento, descripción, fechas, vendedor…) no es
        // estado controlado: se escribe directo en el elemento del DOM.
        if (form) escribirEnDom(form, nombre, valor);
      }
      if (Object.keys(nuevoDesdePatente).length) {
        setDesdePatente((prev) => ({ ...prev, ...nuevoDesdePatente }));
      }
      setAvisoBorrador(guardado?.guardadoEn ?? Date.now());
    });
    // Solo al montar: es una restauración de una sola vez, no una sincronización continua.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Autoguardado. Lee el DOM en vez de depender de cada estado de React por
   * separado — así cubre también los campos no controlados (equipamiento,
   * descripción, fechas, vendedor) sin tener que enumerarlos dos veces.
   */
  useEffect(() => {
    if (editando) return;
    const form = formRef.current;
    if (!form) return;

    let temporizador: ReturnType<typeof setTimeout>;
    function guardarBorrador() {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        const datos = new FormData(form!);
        const campos: Record<string, string | string[]> = {};
        for (const [nombre, valor] of datos.entries()) {
          if (typeof valor !== "string") continue; // este formulario no tiene inputs de archivo
          const previo = campos[nombre];
          campos[nombre] = previo === undefined
            ? valor
            : Array.isArray(previo) ? [...previo, valor] : [previo, valor];
        }
        try {
          localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ guardadoEn: Date.now(), campos }));
        } catch { /* localStorage bloqueado: no hay borrador, pero tampoco se rompe nada */ }
      }, 800);
    }

    form.addEventListener("input", guardarBorrador);
    form.addEventListener("change", guardarBorrador);
    return () => {
      form.removeEventListener("input", guardarBorrador);
      form.removeEventListener("change", guardarBorrador);
      clearTimeout(temporizador);
    };
  }, [editando]);

  function descartarBorrador() {
    try { localStorage.removeItem(CLAVE_BORRADOR); } catch { /* nada que borrar */ }
    window.location.reload();
  }

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
    <form
      ref={formRef}
      action={enviar}
      onSubmit={() => {
        // Se publicó (o se intentó): el borrador ya cumplió su función.
        if (!editando) {
          try { localStorage.removeItem(CLAVE_BORRADOR); } catch { /* nada que borrar */ }
        }
      }}
    >
      {tags.map((t) => (
        <input key={t} type="hidden" name="tags" value={t} />
      ))}

      {avisoBorrador && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-ok bg-ok/[0.06] px-4 py-3 text-[12.5px]">
          <span>
            Se restauró un borrador sin publicar de las{" "}
            {new Date(avisoBorrador).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}.
            Revísalo antes de guardar.
          </span>
          <button
            type="button" onClick={descartarBorrador}
            className="shrink-0 text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Descartar y empezar de cero
          </button>
        </div>
      )}

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
            value={precio}
            onChange={(ev) => setPrecio(ev.target.value.replace(/\D/g, ""))}
            className={cn(controlBase, "tabular")}
          />
        </Campo>
        {tasacion && (
          <div className="flex flex-col gap-1.5">
            <p className="etiqueta">Referencia de mercado (GetAPI)</p>
            <p className="tabular text-[13.5px]">
              {clp(tasacion.precioUsado)}
              <span className="text-muted-foreground">
                {" "}(banda {clp(tasacion.bandaMin)} – {clp(tasacion.bandaMax)})
              </span>
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Retoma: <span className="tabular">{clp(tasacion.precioRetoma)}</span>.
              Solo informativa — el precio de venta se pone a mano.
            </p>
          </div>
        )}

        <Campo
          label="Pie de financiamiento" htmlFor="pieFinanciamiento"
          hint={
            modoPie === "porcentaje" && pieEnPesos
              ? `Se guarda como ${clp(Number(pieEnPesos))}. Se publica como “pie desde”.`
              : "Opcional. Se publica como “pie desde”."
          }
        >
          <div className="flex gap-1.5">
            <input
              id="pieFinanciamiento" inputMode="numeric"
              placeholder={modoPie === "porcentaje" ? "20" : "3290000"}
              value={pieValor}
              onChange={(ev) => setPieValor(ev.target.value.replace(/\D/g, ""))}
              className={cn(controlBase, "tabular")}
            />
            <input type="hidden" name="pieFinanciamiento" value={pieEnPesos} />
            <div className="flex h-9 shrink-0 divide-x divide-input border border-input">
              {(["monto", "porcentaje"] as const).map((m) => (
                <button
                  key={m} type="button" onClick={() => cambiarModoPie(m)}
                  aria-pressed={modoPie === m}
                  className={cn(
                    "w-9 text-[13px] transition-colors",
                    modoPie === m
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "monto" ? "$" : "%"}
                </button>
              ))}
            </div>
          </div>
        </Campo>

        {/*
          * Va en Precio y no en la ficha técnica porque no describe el auto:
          * dice de quién es la plata. Un auto comprado es capital propio; uno
          * consignado es de un tercero y lo que se gana es una comisión.
          */}
        <Campo
          label="¿Cómo llegó este auto?"
          htmlFor="adquisicion"
          hint="Solo lo ves tú: no sale al catálogo público ni lo ve el asistente."
          ancho="completo"
        >
          <div className="flex flex-wrap gap-1.5">
            {ADQUISICIONES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAdquisicion(adquisicion === a ? "" : a)}
                aria-pressed={adquisicion === a}
                className={cn(
                  "h-9 rounded-[10px] border px-3.5 text-[13px] transition-colors",
                  adquisicion === a
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-accent/50",
                )}
              >
                {ADQUISICION_LABEL[a]}
              </button>
            ))}
          </div>
          <input type="hidden" name="adquisicion" value={adquisicion} />
        </Campo>

        {/*
          * Cada tipo pide lo suyo. Es la razón de que la elección vaya antes
          * del formulario: si fuera un campo más, estos aparecerían y
          * desaparecerían a mitad de la carga.
          *
          * Todos opcionales: el papeleo de una consignación a veces se cierra
          * después, y un dato que falta no puede bloquear la carga del auto.
          */}
        {(adquisicion === "compra" || adquisicion === "parte_pago") && (
          <>
            <Campo
              label={adquisicion === "compra" ? "Precio de compra" : "Valor reconocido al cliente"}
              htmlFor="precioCompra"
              hint={adquisicion === "compra"
                ? "Lo que saliste a pagar. Con el precio de venta sale la utilidad."
                : "Cuánto se le descontó del auto que compró."}
            >
              <input
                id="precioCompra" name="precioCompra" inputMode="numeric" placeholder="13500000"
                value={precioCompra}
                onChange={(ev) => setPrecioCompra(ev.target.value.replace(/\D/g, ""))}
                className={cn(controlBase, "tabular")}
              />
            </Campo>
            {adquisicion === "compra" && (
              <Campo label="Comisión de compra" htmlFor="comisionCompra"
                hint="Lo que se le paga a quien consiguió el auto.">
                <input
                  id="comisionCompra" name="comisionCompra" inputMode="numeric" placeholder="200000"
                  value={comisionCompra}
                  onChange={(ev) => setComisionCompra(ev.target.value.replace(/\D/g, ""))}
                  className={cn(controlBase, "tabular")}
                />
              </Campo>
            )}
          </>
        )}

        {adquisicion === "consignacion" && (
          <>
            <Campo label="Publicar desde" htmlFor="publicacionMin"
              hint="El piso acordado con el dueño.">
              <input
                id="publicacionMin" name="publicacionMin" inputMode="numeric" placeholder="40000000"
                value={publicacionMin}
                onChange={(ev) => setPublicacionMin(ev.target.value.replace(/\D/g, ""))}
                className={cn(controlBase, "tabular")}
              />
            </Campo>
            <Campo label="Hasta" htmlFor="publicacionMax" hint="El techo, si lo hay.">
              <input
                id="publicacionMax" name="publicacionMax" inputMode="numeric" placeholder="41000000"
                value={publicacionMax}
                onChange={(ev) => setPublicacionMax(ev.target.value.replace(/\D/g, ""))}
                className={cn(controlBase, "tabular")}
              />
            </Campo>
            <Campo label="Tu comisión" htmlFor="comisionConsignacion"
              hint="Lo que queda para la automotora.">
              <input
                id="comisionConsignacion" name="comisionConsignacion" inputMode="numeric"
                placeholder="1000000" value={comisionConsignacion}
                onChange={(ev) => setComisionConsignacion(ev.target.value.replace(/\D/g, ""))}
                className={cn(controlBase, "tabular")}
              />
            </Campo>
            <Campo label="Libre a pago" htmlFor="libreAPago"
              hint="Lo que recibe el dueño una vez vendido.">
              <input
                id="libreAPago" name="libreAPago" inputMode="numeric" placeholder="39000000"
                value={libreAPago}
                onChange={(ev) => setLibreAPago(ev.target.value.replace(/\D/g, ""))}
                className={cn(controlBase, "tabular")}
              />
            </Campo>
          </>
        )}
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
        <CargaDeFotos
          key={fotosRestauradas ? "restaurado" : "original"}
          iniciales={fotosRestauradas ?? vehiculo?.fotos}
        />
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

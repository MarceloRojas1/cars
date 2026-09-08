/**
 * Capa de acceso a datos.
 *
 * Hoy devuelve los datos semilla de seed.ts. Todas las funciones son async a
 * propósito: cuando conectemos Supabase, cada cuerpo se reemplaza por su query
 * y ninguna pantalla cambia.
 *
 *   export async function getVehicles() {
 *     const supabase = await createClient();
 *     const { data } = await supabase.from("vehicle").select("*").order("publicado_at");
 *     return data ?? [];
 *   }
 */
import * as seed from "./seed";
import { consultar, dbConfigurada, enTransaccion } from "@/lib/db";
import { idSemilla, uuidDe, SUCURSAL_POR_DEFECTO } from "./ids";
import { orgActual, sesionActual } from "@/lib/auth/sesion";
import { calcularCompletitud } from "./completitud";
import { MODELOS_SEMILLA } from "@/lib/catalogos";
import { ESCENAS, promptDe } from "@/lib/ia/imagenes/escenas";
import { imagenLocalExiste } from "@/lib/storage";
import type {
  AppUser, AssistantConfig, Branch, Combustible, Integration, KnowledgeItem,
  Lead, Organization, Showroom, Stage, Vehicle,
} from "@/lib/types";

/** Fila de `vehicle` tal como vuelve de Postgres. */
type FilaVehiculo = {
  id: string; codigo: string; titulo: string; marca: string | null;
  modelo: string | null; version: string | null; anio: number | null;
  patente: string | null; precio: string | null; km: number | null;
  combustible: string | null; branch_id: string | null; vendedor_id: string | null;
  estado: Vehicle["estado"]; completitud_pct: number; publicado_at: Date | null;
  pie_financiamiento: string | null; transmision: string | null; carroceria: string | null;
  puertas: number | null; color: string | null; color_interior: string | null;
  permiso_circulacion_vence: Date | null; revision_tecnica_vence: Date | null;
  tags: string[] | null; cantidad_duenos: number | null; equipamiento: string | null;
  descripcion: string | null; region: string | null; comuna: string | null;
  archivado_at: Date | null;
  foto_principal?: string | null;
  vin: string | null;
  numero_motor: string | null;
  cilindrada: string | null;
};

type FilaSucursal = {
  id: string; codigo: string; nombre: string; direccion: string | null;
  comuna: string | null; region: string | null; telefono: string | null;
  email: string | null; es_principal: boolean; activa: boolean;
};

type FilaUsuario = {
  id: string; nombre: string; email: string; telefono: string | null;
  rol: AppUser["rol"]; branch_id: string | null; activo: boolean;
};

const diasDesde = (fecha: Date | null) =>
  fecha ? Math.floor((Date.now() - fecha.getTime()) / 86_400_000) : 0;

const soloFecha = (f: Date | null) => (f ? f.toISOString().slice(0, 10) : undefined);

function aVehiculo(f: FilaVehiculo): Vehicle {
  return {
    id: f.id,
    codigo: f.codigo,
    titulo: f.titulo,
    marca: f.marca ?? "",
    modelo: f.modelo ?? undefined,
    version: f.version ?? undefined,
    anio: f.anio ?? 0,
    patente: f.patente ?? undefined,
    precio: Number(f.precio ?? 0),
    km: f.km ?? 0,
    combustible: (f.combustible ?? "Bencina") as Vehicle["combustible"],
    branchId: idSemilla(f.branch_id) ?? "",
    vendedorId: idSemilla(f.vendedor_id),
    estado: f.estado,
    completitudPct: f.completitud_pct,
    publicadoHaceDias: diasDesde(f.publicado_at),
    canales: [],
    pieFinanciamiento: f.pie_financiamiento ? Number(f.pie_financiamiento) : undefined,
    transmision: f.transmision ?? undefined,
    carroceria: f.carroceria ?? undefined,
    puertas: f.puertas ?? undefined,
    colorExterior: f.color ?? undefined,
    colorInterior: f.color_interior ?? undefined,
    vin: f.vin ?? undefined,
    numeroMotor: f.numero_motor ?? undefined,
    cilindrada: f.cilindrada ?? undefined,
    permisoCirculacionVence: soloFecha(f.permiso_circulacion_vence),
    revisionTecnicaVence: soloFecha(f.revision_tecnica_vence),
    tags: f.tags ?? [],
    cantidadDuenos: f.cantidad_duenos ?? undefined,
    equipamiento: f.equipamiento ?? undefined,
    descripcion: f.descripcion ?? undefined,
    region: f.region ?? undefined,
    comuna: f.comuna ?? undefined,
    archivado: Boolean(f.archivado_at),
    fotoPrincipal: f.foto_principal ?? undefined,
  };
}

/**
 * La automotora que está mirando.
 *
 * Devolvía siempre la semilla, lo que con un solo cliente no se notaba y con
 * dos habría dicho el nombre equivocado — incluido el que el bot usa para
 * presentarse por WhatsApp.
 */
export async function getOrganization(): Promise<Organization> {
  if (!dbConfigurada()) return seed.organization;

  const orgId = await orgActual();
  const filas = await consultar<{
    id: string; nombre: string; slug: string; plan: string;
    limite_usuarios: number; limite_sucursales: number;
    limite_vehiculos: number; limite_conversaciones_ia: number;
    proximo_cobro: Date | null;
  }>(orgId, "select * from organization where id = $1", [orgId]);

  const o = filas[0];
  if (!o) return seed.organization;

  return {
    id: idSemilla(o.id) ?? o.id,
    nombre: o.nombre,
    slug: o.slug,
    plan: o.plan,
    limiteUsuarios: o.limite_usuarios,
    limiteSucursales: o.limite_sucursales,
    limiteVehiculos: o.limite_vehiculos,
    limiteConversacionesIa: o.limite_conversaciones_ia,
    proximoCobro: o.proximo_cobro ? o.proximo_cobro.toISOString().slice(0, 10) : "",
  };
}
export async function getBranches(): Promise<Branch[]> {
  if (!dbConfigurada()) return seed.branches;

  const rows = await consultar<FilaSucursal>(
    (await orgActual()),
    `select * from branch where organization_id = $1 order by es_principal desc, nombre`,
    [(await orgActual())],
  );
  return rows.map((b) => ({
    id: idSemilla(b.id)!,
    codigo: b.codigo,
    nombre: b.nombre,
    direccion: b.direccion ?? "",
    comuna: b.comuna ?? "",
    region: b.region ?? "",
    telefono: b.telefono ?? "",
    email: b.email ?? "",
    esPrincipal: b.es_principal,
    activa: b.activa,
    creadaHace: "",
  }));
}
/**
 * `incluirInactivos` solo lo usa la pantalla de Equipo, que administra el
 * equipo y tiene que poder reactivar a alguien. El resto —asignar un lead,
 * elegir vendedor de un vehículo— solo debe ver a los activos: ofrecer a
 * alguien que ya no trabaja ahí es un error silencioso.
 */
export async function getUsers(incluirInactivos = false): Promise<AppUser[]> {
  if (!dbConfigurada()) return seed.users;

  const rows = await consultar<FilaUsuario>(
    (await orgActual()),
    `select * from app_user
      where organization_id = $1 and ($2::boolean or activo)
      order by nombre`,
    [(await orgActual()), incluirInactivos],
  );
  return rows.map((u) => ({
    id: idSemilla(u.id)!,
    nombre: u.nombre,
    email: u.email,
    telefono: u.telefono ?? undefined,
    rol: u.rol,
    branchId: idSemilla(u.branch_id),
    activo: u.activo,
    disponibilidad: "offline" as const,
    ultimoAcceso: "",
    chatsActivos: 0,
  }));
}
/**
 * Quién está usando el panel. Sale de la sesión; la semilla es solo el respaldo
 * de desarrollo, cuando todavía no hay login.
 */
export async function getCurrentUser(): Promise<AppUser> {
  const sesion = await sesionActual();
  if (!sesion) return seed.users[0];

  const usuarios = await getUsers(true);
  return (
    usuarios.find((u) => u.email === sesion.email) ?? {
      ...seed.users[0],
      id: sesion.usuarioId,
      nombre: sesion.nombre,
      email: sesion.email,
      rol: sesion.rol,
    }
  );
}
export async function getVehicles(archivados = false): Promise<Vehicle[]> {
  if (!dbConfigurada()) return archivados ? [] : seed.vehicles;

  const rows = await consultar<FilaVehiculo>(
    (await orgActual()),
    `select v.*, p.url as foto_principal
       from vehicle v
       left join lateral (
         select url from vehicle_photo
          where vehicle_id = v.id
          order by es_principal desc, orden
          limit 1
       ) p on true
      where v.organization_id = $1
        and case when $2::boolean then v.archivado_at is not null else v.archivado_at is null end
      order by v.publicado_at desc nulls last`,
    [(await orgActual()), archivados],
  );
  return rows.map(aVehiculo);
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Id de la interfaz → uuid de la base.
 *
 * Al leer, los ids se traducen a los legibles de la semilla ("usr_juan"), así
 * que lo que vuelve en un formulario puede ser cualquiera de los dos. `uuidDe`
 * aplicado a un uuid lo convertiría en otro distinto, de ahí el guardia.
 */
const aUuid = (id: string) => (ES_UUID.test(id) ? id : uuidDe(id));

/** Una ficha con sus fotos, para la pantalla de edición. */
export async function getVehiculo(id: string): Promise<Vehicle | null> {
  if (!dbConfigurada()) return seed.vehicles.find((v) => v.id === id) ?? null;
  // Un id con formato inválido es un 404, no un error 500 de Postgres.
  if (!ES_UUID.test(id)) return null;

  const rows = await consultar<FilaVehiculo>(
    (await orgActual()),
    `select * from vehicle where id = $1 and organization_id = $2`,
    [id, (await orgActual())],
  );
  if (!rows[0]) return null;

  const fotos = await consultar<{ id: string; url: string; orden: number; es_principal: boolean }>(
    (await orgActual()),
    `select id, url, orden, es_principal from vehicle_photo
      where vehicle_id = $1 order by orden`,
    [id],
  );
  return {
    ...aVehiculo(rows[0]),
    fotos: fotos.map((f) => ({
      id: f.id, url: f.url, orden: f.orden, esPrincipal: f.es_principal,
    })),
  };
}

/**
 * Modelos sugeridos para una marca: los que ya cargaste, más una semilla corta
 * para que el desplegable no arranque vacío. Sin catálogo que mantener.
 */
export async function getModelosDe(marca: string): Promise<string[]> {
  const semilla = MODELOS_SEMILLA[marca] ?? [];
  if (!dbConfigurada()) return semilla;

  const rows = await consultar<{ modelo: string }>(
    (await orgActual()),
    `select distinct modelo from vehicle
      where organization_id = $1 and marca = $2 and modelo is not null and modelo <> ''
      order by modelo`,
    [(await orgActual()), marca],
  );
  return [...new Set([...rows.map((r) => r.modelo), ...semilla])].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}
type FilaEtapa = {
  id: string; nombre: string; kind: Stage["kind"]; color: string | null;
  orden: number; ai_agent_enabled: boolean; responsable: Stage["responsable"];
};

export async function getStages(): Promise<Stage[]> {
  if (!dbConfigurada()) return [...seed.stages].sort((a, b) => a.orden - b.orden);

  const filas = await consultar<FilaEtapa>(
    (await orgActual()),
    `select * from stage where organization_id = $1 order by orden`,
    [(await orgActual())],
  );
  return filas.map((f) => ({
    id: f.id, nombre: f.nombre, kind: f.kind, color: f.color ?? "#8A8A8E",
    orden: f.orden, agenteIaActivo: f.ai_agent_enabled, responsable: f.responsable,
  }));
}

type FilaLead = {
  id: string; nombre: string | null; telefono: string | null; email: string | null;
  stage_id: string; vehicle_id: string | null; vendedor_id: string | null;
  source: Lead["source"]; tipo: string | null; temperatura: string | null;
  perdido: boolean; stage_changed_at: Date | null; created_at: Date;
  external_id: string | null; traspasado_at: Date | null; notas: string | null;
  mensajes: string | null;
};

/** "hace 3 horas", "hace 2 días" — como lo muestra el producto. */
function hace(fecha: Date) {
  const min = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 60000));
  if (min < 60) return `hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

function aLead(f: FilaLead): Lead {
  return {
    id: f.id,
    nombre: f.nombre ?? "",
    telefono: f.telefono ?? "",
    email: f.email ?? undefined,
    stageId: f.stage_id,
    vehicleId: f.vehicle_id ?? undefined,
    vendedorId: idSemilla(f.vendedor_id),
    source: f.source,
    tipo: (f.tipo as Lead["tipo"]) ?? undefined,
    temperatura: (f.temperatura as Lead["temperatura"]) ?? "warm",
    perdido: f.perdido,
    mensajes: Number(f.mensajes ?? 0),
    diasEnEtapa: f.stage_changed_at
      ? Math.floor((Date.now() - f.stage_changed_at.getTime()) / 86_400_000)
      : 0,
    creadoHace: hace(f.created_at),
    externalId: f.external_id ?? undefined,
    traspasadoAt: f.traspasado_at?.toISOString(),
    notas: f.notas ?? undefined,
  };
}

export async function getLeads(): Promise<Lead[]> {
  if (!dbConfigurada()) return seed.leads;

  const filas = await consultar<FilaLead>(
    (await orgActual()),
    // Lateral con límite y no un join directo: si un lead tuviera más de una
    // conversación, un join multiplicaría sus filas.
    `select l.*, coalesce(c.mensajes_count, 0) as mensajes
       from lead l
       left join lateral (
         select mensajes_count from conversation
          where lead_id = l.id order by last_message_at desc nulls last limit 1
       ) c on true
      where l.organization_id = $1
      order by l.created_at desc`,
    [(await orgActual())],
  );
  return filas.map(aLead);
}
export async function getClients() {
  return seed.clients;
}
export async function getOperations() {
  return seed.operations;
}
export async function getCampaigns() {
  return seed.campaigns;
}
export async function getIntegrations(): Promise<Integration[]> {
  if (!dbConfigurada()) return seed.integrations;

  const filas = await consultar<{
    proveedor: string; estado: string; cuenta: string | null;
    credenciales: { modelo?: string; pista?: string } | null;
  }>(
    (await orgActual()),
    `select proveedor, estado, cuenta, credenciales from integration
      where organization_id = $1`,
    [(await orgActual())],
  );
  const porProveedor = new Map(filas.map((f) => [f.proveedor, f]));

  // El catálogo de integraciones es fijo; la base solo aporta el estado de cada
  // una. Así aparece una integración nueva sin tener que insertar filas.
  return seed.integrations.map((base) => {
    const guardado = porProveedor.get(base.id.replace("int_", ""));
    if (!guardado) return base;
    return {
      ...base,
      estado: guardado.estado as Integration["estado"],
      detalle: guardado.cuenta ?? guardado.credenciales?.pista ?? base.detalle,
      modelo: guardado.credenciales?.modelo,
    };
  });
}
export async function getMetricas() {
  return seed.metricas;
}

/** Fila de `assistant_config` tal como vuelve de Postgres. */
type FilaAssistantConfig = {
  trigger_ctwa: boolean; trigger_contactos_nuevos: boolean;
  trigger_contactos_existentes: boolean; svc_consignacion: boolean;
  svc_compra_directa: boolean; svc_financiamiento: boolean; modo_consultor: boolean;
  antiguedad_max_financiamiento: number; nombre_agente: string;
  saludo: string | null; tono: string | null; instrucciones: string | null;
  prohibiciones: string | null;
};

function aAssistantConfig(f: FilaAssistantConfig): AssistantConfig {
  return {
    triggerCtwa: f.trigger_ctwa,
    triggerContactosNuevos: f.trigger_contactos_nuevos,
    triggerContactosExistentes: f.trigger_contactos_existentes,
    servicioConsignacion: f.svc_consignacion,
    servicioCompraDirecta: f.svc_compra_directa,
    servicioFinanciamiento: f.svc_financiamiento,
    modoConsultor: f.modo_consultor,
    antiguedadMaxFinanciamiento: f.antiguedad_max_financiamiento,
    nombreAgente: f.nombre_agente,
    saludo: f.saludo ?? "",
    tono: f.tono ?? "",
    instrucciones: f.instrucciones ?? "",
    prohibiciones: f.prohibiciones ?? "",
  };
}

/** Si la organización nunca guardó su config, no hay fila: se devuelven los valores por defecto. */
export async function getAssistantConfig(): Promise<AssistantConfig> {
  if (!dbConfigurada()) return seed.assistantConfig;

  const filas = await consultar<FilaAssistantConfig>(
    (await orgActual()),
    `select * from assistant_config where organization_id = $1`,
    [(await orgActual())],
  );
  return filas[0] ? aAssistantConfig(filas[0]) : seed.assistantConfig;
}

export async function guardarAssistantConfig(datos: AssistantConfig) {
  await consultar(
    (await orgActual()),
    `insert into assistant_config (
       organization_id, trigger_ctwa, trigger_contactos_nuevos,
       trigger_contactos_existentes, svc_consignacion, svc_compra_directa,
       svc_financiamiento, modo_consultor, antiguedad_max_financiamiento,
       nombre_agente, saludo, tono, instrucciones, prohibiciones)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     on conflict (organization_id) do update set
       trigger_ctwa = excluded.trigger_ctwa,
       trigger_contactos_nuevos = excluded.trigger_contactos_nuevos,
       trigger_contactos_existentes = excluded.trigger_contactos_existentes,
       svc_consignacion = excluded.svc_consignacion,
       svc_compra_directa = excluded.svc_compra_directa,
       svc_financiamiento = excluded.svc_financiamiento,
       modo_consultor = excluded.modo_consultor,
       antiguedad_max_financiamiento = excluded.antiguedad_max_financiamiento,
       nombre_agente = excluded.nombre_agente,
       saludo = excluded.saludo, tono = excluded.tono,
       instrucciones = excluded.instrucciones, prohibiciones = excluded.prohibiciones`,
    [
      (await orgActual()), datos.triggerCtwa, datos.triggerContactosNuevos,
      datos.triggerContactosExistentes, datos.servicioConsignacion,
      datos.servicioCompraDirecta, datos.servicioFinanciamiento, datos.modoConsultor,
      datos.antiguedadMaxFinanciamiento, datos.nombreAgente,
      datos.saludo || null, datos.tono || null, datos.instrucciones || null,
      datos.prohibiciones || null,
    ],
  );
}

export async function getKnowledgeItems(): Promise<KnowledgeItem[]> {
  if (!dbConfigurada()) return seed.knowledgeItems;

  return consultar<KnowledgeItem>(
    (await orgActual()),
    `select id, titulo, contenido, tipo from knowledge_item
      where organization_id = $1 order by titulo`,
    [(await orgActual())],
  );
}

export async function crearKnowledgeItem(datos: {
  titulo: string; contenido: string; tipo: string;
}): Promise<KnowledgeItem> {
  const filas = await consultar<KnowledgeItem>(
    (await orgActual()),
    `insert into knowledge_item (organization_id, titulo, contenido, tipo)
     values ($1,$2,$3,$4)
     returning id, titulo, contenido, tipo`,
    [(await orgActual()), datos.titulo, datos.contenido, datos.tipo],
  );
  return filas[0];
}

export async function eliminarKnowledgeItem(id: string) {
  await consultar(
    (await orgActual()),
    `delete from knowledge_item where id = $1 and organization_id = $2`,
    [id, (await orgActual())],
  );
}

/* --- Canal de WhatsApp --- */

/**
 * El lead más nuevo con ese teléfono. No hay índice único sobre `telefono`
 * a propósito: dos personas de la misma familia pueden escribir por el mismo
 * número en momentos distintos y son leads separados; acá solo evitamos
 * abrir un lead nuevo por cada mensaje de una conversación ya en curso.
 */
export async function buscarLeadPorTelefono(
  telefono: string,
): Promise<{ id: string } | null> {
  if (!dbConfigurada()) return null;

  const filas = await consultar<{ id: string }>(
    (await orgActual()),
    `select id from lead where organization_id = $1 and telefono = $2
      order by created_at desc limit 1`,
    [(await orgActual()), telefono],
  );
  return filas[0] ?? null;
}

/**
 * Dos escrituras por mensaje: la bitácora del lead (para el historial) y el
 * contador de `conversation` (lo que ya lee el panel del lead). No existe
 * todavía una tabla de mensajes con el texto buscable — ver decisiones.md.
 */
export async function registrarMensajeWhatsapp(
  leadId: string,
  datos: { direccion: "entrante" | "saliente"; cuerpo: string; externalId?: string },
) {
  await enTransaccion((await orgActual()), async (cliente) => {
    /*
     * Meta reentrega un webhook si no recibe 200 rápido, así que el mismo
     * mensaje puede llegar dos veces. Sin este chequeo se duplicaba en la
     * bitácora y el contador de la conversación subía de a dos.
     */
    if (datos.externalId) {
      const { rows } = await cliente.query(
        `select 1 from lead_activity
          where lead_id = $1 and tipo = 'mensaje' and payload->>'externalId' = $2
          limit 1`,
        [leadId, datos.externalId],
      );
      if (rows.length) return;
    }

    await cliente.query(
      `insert into lead_activity (lead_id, tipo, payload)
       values ($1, 'mensaje', $2)`,
      [leadId, JSON.stringify(datos)],
    );
    await cliente.query(
      `insert into conversation (organization_id, lead_id, canal, mensajes_count, last_message_at)
       values ($1, $2, 'whatsapp', 1, now())
       on conflict (lead_id, canal) do update set
         mensajes_count = conversation.mensajes_count + 1,
         last_message_at = now()`,
      [(await orgActual()), leadId],
    );
  });
}

/* --- derivados: en producción son vistas agregadas, no columnas --- */

export function vehiculoDe(vehicles: Vehicle[], id?: string) {
  return id ? vehicles.find((v) => v.id === id) : undefined;
}

export function agruparPorEtapa(leads: Lead[], stages: Stage[]) {
  return stages.map((stage) => ({
    stage,
    leads: leads.filter((l) => l.stageId === stage.id),
  }));
}

export async function getResumenDashboard() {
  const [vehicles, leads, operations, metricas] = await Promise.all([
    getVehicles(), getLeads(), getOperations(), getMetricas(),
  ]);

  const disponibles = vehicles.filter((v) => v.estado === "disponible");
  const enSalon = disponibles.filter((v) => v.publicadoHaceDias > 30);
  const criticos = disponibles.filter((v) => v.publicadoHaceDias > 60);
  const incompletas = disponibles.filter((v) => v.completitudPct < 100);

  return {
    stockDisponible: disponibles.length,
    ventasMes: metricas.ventasMes,
    leadsMes: 0,
    utilidadMes: operations.reduce((acc, o) => acc + (o.precio - o.gastos) * 0, 0),
    hotSinAtender: metricas.leadsHotSinAtender,
    sinMovimiento: metricas.autosSinMovimiento,
    notasConSaldo: metricas.notasConSaldo,
    enSalon,
    criticos: criticos.length,
    incompletas: incompletas.length,
    leadsPerdidosViejos: leads.filter((l) => l.perdido).length,
    publicados: disponibles.length,
  };
}

/* --- escritura --- */

export type NuevoVehiculo = {
  patente?: string;
  marca: string;
  modelo: string;
  version?: string;
  anio: number;
  titulo: string;
  precio: number;
  pieFinanciamiento?: number;
  km?: number;
  combustible?: Combustible;
  transmision?: string;
  carroceria?: string;
  puertas?: number;
  colorExterior?: string;
  colorInterior?: string;
  vin?: string;
  numeroMotor?: string;
  cilindrada?: string;
  permisoCirculacionVence?: string;
  revisionTecnicaVence?: string;
  cantidadDuenos?: number;
  tags: string[];
  equipamiento?: string;
  descripcion?: string;
  branchId?: string;
  vendedorId?: string;
  region?: string;
  comuna?: string;
  /** URLs ya subidas por /api/fotos. La primera es la principal salvo que se indique otra. */
  fotos?: { url: string; esPrincipal: boolean }[];
};

/** Correlativo con el formato del producto: COD9xxxxx. */
async function siguienteCodigo(): Promise<string> {
  const rows = await consultar<{ max: string | null }>(
    (await orgActual()),
    `select max(substring(codigo from 4)::bigint)::text as max
       from vehicle where organization_id = $1 and codigo ~ '^COD[0-9]+$'`,
    [(await orgActual())],
  );
  const ultimo = rows[0]?.max ? Number(rows[0].max) : 922_000;
  return `COD${ultimo + 1}`;
}

export async function crearVehiculo(datos: NuevoVehiculo): Promise<Vehicle> {
  const codigo = await siguienteCodigo();
  const { fotos = [], ...escalares } = datos;
  const completitud = calcularCompletitud(escalares);
  return enTransaccion((await orgActual()), async (cliente) => {
    const { rows } = await cliente.query<FilaVehiculo>(
      `insert into vehicle (
         organization_id, branch_id, vendedor_id, codigo, titulo, marca, modelo,
         version, anio, patente, precio, km, combustible, transmision, carroceria,
         puertas, color, color_interior, pie_financiamiento, permiso_circulacion_vence,
         revision_tecnica_vence, cantidad_duenos, tags, equipamiento, descripcion,
         region, comuna, vin, numero_motor, cilindrada, estado, completitud_pct, publicado_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               $20,$21,$22,$23,$24,$25,$26,$27,$29,$30,$31,'disponible',$28, now())
       returning *`,
      [
        (await orgActual()),
        datos.branchId ? uuidDe(datos.branchId) : SUCURSAL_POR_DEFECTO,
        datos.vendedorId ? uuidDe(datos.vendedorId) : null,
        codigo, datos.titulo, datos.marca, datos.modelo, datos.version ?? null,
        datos.anio, datos.patente ?? null, datos.precio, datos.km ?? null,
        datos.combustible ?? null, datos.transmision ?? null, datos.carroceria ?? null,
        datos.puertas ?? null, datos.colorExterior ?? null, datos.colorInterior ?? null,
        datos.pieFinanciamiento ?? null, datos.permisoCirculacionVence || null,
        datos.revisionTecnicaVence || null, datos.cantidadDuenos ?? null,
        datos.tags, datos.equipamiento ?? null, datos.descripcion ?? null,
        datos.region ?? null, datos.comuna ?? null, completitud,
        datos.vin ?? null, datos.numeroMotor ?? null, datos.cilindrada ?? null,
      ],
    );

    const vehiculo = rows[0];

    for (const [i, foto] of fotos.entries()) {
      await cliente.query(
        `insert into vehicle_photo (vehicle_id, url, orden, es_principal)
         values ($1,$2,$3,$4)`,
        [vehiculo.id, foto.url, i, foto.esPrincipal],
      );
    }

    return aVehiculo(vehiculo);
  });
}

/** marca → modelos sugeridos (inventario + semilla). Se usa en el formulario. */
export async function getCatalogoModelos(): Promise<Record<string, string[]>> {
  const catalogo: Record<string, Set<string>> = {};
  for (const [marca, modelos] of Object.entries(MODELOS_SEMILLA)) {
    catalogo[marca] = new Set(modelos);
  }
  if (dbConfigurada()) {
    const rows = await consultar<{ marca: string; modelo: string }>(
      (await orgActual()),
      `select distinct marca, modelo from vehicle
        where organization_id = $1 and marca is not null and modelo is not null and modelo <> ''`,
      [(await orgActual())],
    );
    for (const { marca, modelo } of rows) {
      (catalogo[marca] ??= new Set()).add(modelo);
    }
  }
  return Object.fromEntries(
    Object.entries(catalogo).map(([m, set]) => [
      m,
      [...set].sort((a, b) => a.localeCompare(b, "es")),
    ]),
  );
}

export async function actualizarVehiculo(id: string, datos: NuevoVehiculo): Promise<void> {
  const { fotos = [], ...escalares } = datos;
  const completitud = calcularCompletitud(escalares);
  await enTransaccion((await orgActual()), async (cliente) => {
    const { rowCount } = await cliente.query(
      `update vehicle set
         branch_id = $2, vendedor_id = $3, titulo = $4, marca = $5, modelo = $6,
         version = $7, anio = $8, patente = $9, precio = $10, km = $11,
         combustible = $12, transmision = $13, carroceria = $14, puertas = $15,
         color = $16, color_interior = $17, pie_financiamiento = $18,
         permiso_circulacion_vence = $19, revision_tecnica_vence = $20,
         cantidad_duenos = $21, tags = $22, equipamiento = $23, descripcion = $24,
         region = $25, comuna = $26, completitud_pct = $27,
         vin = $29, numero_motor = $30, cilindrada = $31, actualizado_at = now()
       where id = $1 and organization_id = $28`,
      [
        id,
        datos.branchId ? uuidDe(datos.branchId) : SUCURSAL_POR_DEFECTO,
        datos.vendedorId ? uuidDe(datos.vendedorId) : null,
        datos.titulo, datos.marca, datos.modelo, datos.version ?? null, datos.anio,
        datos.patente ?? null, datos.precio, datos.km ?? null, datos.combustible ?? null,
        datos.transmision ?? null, datos.carroceria ?? null, datos.puertas ?? null,
        datos.colorExterior ?? null, datos.colorInterior ?? null,
        datos.pieFinanciamiento ?? null, datos.permisoCirculacionVence || null,
        datos.revisionTecnicaVence || null, datos.cantidadDuenos ?? null,
        datos.tags, datos.equipamiento ?? null, datos.descripcion ?? null,
        datos.region ?? null, datos.comuna ?? null, completitud, (await orgActual()),
        datos.vin ?? null, datos.numeroMotor ?? null, datos.cilindrada ?? null,
      ],
    );
    if (!rowCount) throw new Error("El vehículo no existe.");

    // Las fotos se reemplazan completas: la interfaz manda el set final.
    await cliente.query(`delete from vehicle_photo where vehicle_id = $1`, [id]);
    for (const [i, foto] of fotos.entries()) {
      await cliente.query(
        `insert into vehicle_photo (vehicle_id, url, orden, es_principal) values ($1,$2,$3,$4)`,
        [id, foto.url, i, foto.esPrincipal],
      );
    }

  });
}

export async function cambiarEstadoVehiculo(id: string, estado: Vehicle["estado"]) {
  await consultar((await orgActual()),
    `update vehicle set estado = $3, actualizado_at = now()
      where id = $1 and organization_id = $2`,
    [id, (await orgActual()), estado],
  );
}

/** Archivar no borra: saca del listado activo y se puede revertir. */
export async function archivarVehiculo(id: string, archivar = true) {
  await consultar((await orgActual()),
    `update vehicle set archivado_at = $3, actualizado_at = now()
      where id = $1 and organization_id = $2`,
    [id, (await orgActual()), archivar ? new Date() : null],
  );
}

/**
 * Borrado real. Los leads y operaciones que apuntaban al vehículo quedan con
 * vehicle_id nulo (on delete set null), así que no se pierde el historial de
 * contactos — pero la ficha no vuelve.
 */
export async function eliminarVehiculo(id: string) {
  await consultar((await orgActual()), `delete from vehicle where id = $1 and organization_id = $2`, [id, (await orgActual())]);
}

/* --- búsqueda con filtros y paginación --- */

export type FiltrosVehiculo = {
  q?: string;
  marca?: string;
  estado?: string;
  combustible?: string;
  anioDesde?: number;
  anioHasta?: number;
  precioDesde?: number;
  precioHasta?: number;
  branchId?: string;
  vendedorId?: string;
  soloIncompletas?: boolean;
  archivados?: boolean;
  pagina?: number;
  porPagina?: number;
};

export const POR_PAGINA = 10;

/**
 * Filtra y pagina en la base, no en memoria.
 *
 * `count(*) over()` devuelve el total en la misma consulta: evita una segunda
 * ida a la base solo para saber cuántas páginas hay.
 */
export async function buscarVehiculos(
  f: FiltrosVehiculo = {},
): Promise<{ vehiculos: Vehicle[]; total: number }> {
  const porPagina = f.porPagina ?? POR_PAGINA;
  const pagina = Math.max(1, f.pagina ?? 1);

  if (!dbConfigurada()) {
    const todos = f.archivados ? [] : seed.vehicles;
    return {
      vehiculos: todos.slice((pagina - 1) * porPagina, pagina * porPagina),
      total: todos.length,
    };
  }

  const cond: string[] = [
    "v.organization_id = $1",
    f.archivados ? "v.archivado_at is not null" : "v.archivado_at is null",
  ];
  const params: unknown[] = [(await orgActual())];
  const agregar = (sql: string, valor: unknown) => {
    params.push(valor);
    // replaceAll y no replace: la búsqueda usa el mismo parámetro varias veces.
    cond.push(sql.replaceAll("$n", `$${params.length}`));
  };

  if (f.q?.trim()) {
    agregar("(v.codigo ilike $n or v.titulo ilike $n or v.patente ilike $n)", `%${f.q.trim()}%`);
  }
  if (f.marca) agregar("v.marca = $n", f.marca);
  if (f.estado) agregar("v.estado = $n::vehicle_status", f.estado);
  if (f.combustible) agregar("v.combustible = $n", f.combustible);
  if (f.anioDesde) agregar("v.anio >= $n", f.anioDesde);
  if (f.anioHasta) agregar("v.anio <= $n", f.anioHasta);
  if (f.precioDesde) agregar("v.precio >= $n", f.precioDesde);
  if (f.precioHasta) agregar("v.precio <= $n", f.precioHasta);
  if (f.branchId) agregar("v.branch_id = $n", uuidDe(f.branchId));
  if (f.vendedorId) agregar("v.vendedor_id = $n", uuidDe(f.vendedorId));
  if (f.soloIncompletas) cond.push("v.completitud_pct < 100");

  params.push(porPagina, (pagina - 1) * porPagina);
  const filas = await consultar<FilaVehiculo & { total: string }>(
    (await orgActual()),
    `select v.*, p.url as foto_principal, count(*) over() as total
       from vehicle v
       left join lateral (
         select url from vehicle_photo
          where vehicle_id = v.id order by es_principal desc, orden limit 1
       ) p on true
      where ${cond.join("\n        and ")}
      order by v.publicado_at desc nulls last
      limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return {
    vehiculos: filas.map(aVehiculo),
    total: filas[0] ? Number(filas[0].total) : 0,
  };
}

/** Marcas presentes en el inventario, para el desplegable de filtro. */
export async function getMarcasEnInventario(): Promise<string[]> {
  if (!dbConfigurada()) {
    return [...new Set(seed.vehicles.map((v) => v.marca))].sort((a, b) => a.localeCompare(b, "es"));
  }
  const filas = await consultar<{ marca: string }>(
    (await orgActual()),
    `select distinct marca from vehicle
      where organization_id = $1 and marca is not null and marca <> '' order by marca`,
    [(await orgActual())],
  );
  return filas.map((f) => f.marca);
}

/* --- operaciones del embudo --- */

export type ResultadoMovimiento = {
  ok: boolean;
  /** true si el lead pasó de manos del bot a un humano en este movimiento. */
  traspasado?: boolean;
  vendedorAsignado?: string;
  /** Vehículo que quedó en juego al ganar: la interfaz ofrece cerrar la venta. */
  vehiculoGanado?: { id: string; titulo: string };
  error?: string;
};

/**
 * Mueve un lead de etapa.
 *
 * Concentra tres efectos que deben ocurrir juntos o no ocurrir:
 *  · el cambio de etapa y su marca de tiempo (base de "días en etapa"),
 *  · la bitácora, de donde salen "dónde se atoran" y la actividad reciente,
 *  · el traspaso: si la etapa nueva la conduce un humano y el lead venía del
 *    bot sin dueño, se asigna vendedor y se registra el momento.
 */
export async function moverLead(
  leadId: string,
  stageId: string,
  actorId?: string,
): Promise<ResultadoMovimiento> {
  const { elegirVendedor } = await import("@/lib/leads/routing");

  return enTransaccion((await orgActual()), async (cliente) => {
    const { rows: leads } = await cliente.query(
      `select l.*, e.responsable as etapa_responsable
         from lead l join stage e on e.id = l.stage_id
        where l.id = $1 and l.organization_id = $2`,
      [leadId, (await orgActual())],
    );
    if (!leads[0]) return { ok: false, error: "El lead no existe." };
    const lead = leads[0];
    if (lead.stage_id === stageId) return { ok: true };

    const { rows: etapas } = await cliente.query(
      `select * from stage where id = $1 and organization_id = $2`,
      [stageId, (await orgActual())],
    );
    if (!etapas[0]) return { ok: false, error: "La etapa no existe." };
    const destino = etapas[0];

    // Traspaso: el bot entrega y recién ahí entra un humano.
    const traspasado =
      destino.responsable === "humano" && !lead.vendedor_id && !lead.traspasado_at;
    const vendedorId = traspasado
      ? await elegirVendedor({ source: lead.source, tipo: lead.tipo ?? undefined })
      : lead.vendedor_id;

    await cliente.query(
      `update lead set
         stage_id = $3,
         stage_changed_at = now(),
         vendedor_id = $4,
         traspasado_at = case when $5 then now() else traspasado_at end,
         perdido = ($6 = 'exit_lost')
       where id = $1 and organization_id = $2`,
      [leadId, (await orgActual()), stageId, vendedorId ?? null, traspasado, destino.kind],
    );

    await cliente.query(
      `insert into lead_activity (lead_id, actor_id, tipo, from_stage_id, to_stage_id, payload)
       values ($1, $2, 'stage_change', $3, $4, $5)`,
      [
        leadId, actorId ? uuidDe(actorId) : null, lead.stage_id, stageId,
        JSON.stringify({ traspaso: traspasado }),
      ],
    );

    // Ganar cierra el vehículo: sale del stock disponible.
    let vehiculoGanado: ResultadoMovimiento["vehiculoGanado"];
    if (destino.kind === "exit_won" && lead.vehicle_id) {
      const { rows } = await cliente.query(
        `update vehicle set estado = 'vendido', actualizado_at = now()
          where id = $1 and organization_id = $2 returning id, titulo`,
        [lead.vehicle_id, (await orgActual())],
      );
      if (rows[0]) vehiculoGanado = { id: rows[0].id, titulo: rows[0].titulo };
    }

    return { ok: true, traspasado, vendedorAsignado: idSemilla(vendedorId), vehiculoGanado };
  });
}

export async function asignarLead(leadId: string, vendedorId: string | null) {
  await consultar(
    (await orgActual()),
    `update lead set vendedor_id = $3 where id = $1 and organization_id = $2`,
    [leadId, (await orgActual()), vendedorId ? uuidDe(vendedorId) : null],
  );
}

export type NuevoLead = {
  nombre: string;
  telefono: string;
  email?: string;
  source: string;
  tipo?: "venta" | "consigna_compra";
  vehicleId?: string;
  vendedorId?: string;
  notas?: string;
};

/** Alta manual, la del botón "Añadir lead". Entra por la misma puerta. */
export async function crearLead(datos: NuevoLead): Promise<string> {
  const etapas = await consultar<{ id: string }>(
    (await orgActual()),
    `select id from stage where organization_id = $1 and kind = 'entry' order by orden limit 1`,
    [(await orgActual())],
  );
  if (!etapas[0]) throw new Error("El embudo no tiene etapa de entrada.");

  return enTransaccion((await orgActual()), async (cliente) => {
    const { rows } = await cliente.query<{ id: string }>(
      `insert into lead (organization_id, stage_id, vehicle_id, vendedor_id,
         nombre, telefono, email, source, tipo, temperatura, notas)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'warm',$10) returning id`,
      [
        (await orgActual()), etapas[0].id, datos.vehicleId ?? null,
        datos.vendedorId ? uuidDe(datos.vendedorId) : null,
        datos.nombre, datos.telefono, datos.email ?? null,
        datos.source, datos.tipo ?? null, datos.notas ?? null,
      ],
    );
    await cliente.query(
      `insert into lead_activity (lead_id, tipo, to_stage_id, payload)
       values ($1, 'ingreso', $2, '{"source":"manual"}')`,
      [rows[0].id, etapas[0].id],
    );
    return rows[0].id;
  });
}

/* --- detalle del lead --- */

export type EventoBitacora = {
  id: string;
  tipo: string;
  desde?: string;
  hasta?: string;
  actor?: string;
  cuando: string;
  traspaso?: boolean;
};

export type NotaLead = { id: string; texto: string; autor?: string; cuando: string };

export type DetalleLead = {
  lead: Lead;
  bitacora: EventoBitacora[];
  notas: NotaLead[];
  /** Conversación de WhatsApp. Vacía hasta que exista la integración. */
  conversacion: { mensajes: number } | null;
};

export async function getDetalleLead(leadId: string): Promise<DetalleLead | null> {
  if (!dbConfigurada()) {
    const l = seed.leads.find((x) => x.id === leadId);
    return l ? { lead: l, bitacora: [], notas: [], conversacion: null } : null;
  }
  if (!ES_UUID.test(leadId)) return null;

  const leads = await consultar<FilaLead>(
    (await orgActual()),
    `select l.*, coalesce(c.mensajes_count, 0) as mensajes
       from lead l
       left join lateral (
         select mensajes_count from conversation
          where lead_id = l.id order by last_message_at desc nulls last limit 1
       ) c on true
      where l.id = $1 and l.organization_id = $2`,
    [leadId, (await orgActual())],
  );
  if (!leads[0]) return null;

  const bitacora = await consultar<{
    id: string; tipo: string; desde: string | null; hasta: string | null;
    actor: string | null; created_at: Date; payload: { traspaso?: boolean } | null;
  }>(
    (await orgActual()),
    `select a.id, a.tipo, d.nombre as desde, h.nombre as hasta,
            u.nombre as actor, a.created_at, a.payload
       from lead_activity a
       left join stage d on d.id = a.from_stage_id
       left join stage h on h.id = a.to_stage_id
       left join app_user u on u.id = a.actor_id
      where a.lead_id = $1
      order by a.created_at desc
      limit 50`,
    [leadId],
  );

  const notas = await consultar<{ id: string; texto: string; autor: string | null; created_at: Date }>(
    (await orgActual()),
    `select n.id, n.texto, u.nombre as autor, n.created_at
       from lead_note n left join app_user u on u.id = n.autor_id
      where n.lead_id = $1 and n.organization_id = $2
      order by n.created_at desc`,
    [leadId, (await orgActual())],
  );

  const fecha = (d: Date) =>
    d.toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return {
    lead: aLead(leads[0]),
    bitacora: bitacora.map((b) => ({
      id: b.id, tipo: b.tipo,
      desde: b.desde ?? undefined, hasta: b.hasta ?? undefined,
      actor: idSemilla(b.actor ?? undefined) ?? b.actor ?? undefined,
      cuando: fecha(b.created_at),
      traspaso: b.payload?.traspaso ?? undefined,
    })),
    notas: notas.map((n) => ({
      id: n.id, texto: n.texto, autor: n.autor ?? undefined, cuando: fecha(n.created_at),
    })),
    conversacion: leads[0].mensajes && Number(leads[0].mensajes) > 0
      ? { mensajes: Number(leads[0].mensajes) }
      : null,
  };
}

export async function agregarNotaLead(leadId: string, texto: string, autorId?: string) {
  await consultar(
    (await orgActual()),
    `insert into lead_note (organization_id, lead_id, autor_id, texto)
     values ($1, $2, $3, $4)`,
    [(await orgActual()), leadId, autorId ? uuidDe(autorId) : null, texto],
  );
}

export async function cambiarVehiculoLead(leadId: string, vehicleId: string | null) {
  await consultar(
    (await orgActual()),
    `update lead set vehicle_id = $3 where id = $1 and organization_id = $2`,
    [leadId, (await orgActual()), vehicleId],
  );
}

/**
 * Guarda la credencial de un proveedor. La clave llega ya cifrada: esta capa
 * nunca ve el texto plano y la base nunca lo almacena.
 */
export async function guardarIntegracion(
  proveedor: string,
  datos: { estado: string; cuenta?: string; credenciales?: Record<string, unknown> },
) {
  await consultar(
    (await orgActual()),
    `insert into integration (organization_id, proveedor, estado, cuenta, credenciales)
     values ($1,$2,$3,$4,$5)
     on conflict (organization_id, proveedor)
     do update set estado = excluded.estado,
                   cuenta = excluded.cuenta,
                   credenciales = excluded.credenciales`,
    [
      (await orgActual()), proveedor, datos.estado, datos.cuenta ?? null,
      datos.credenciales ? JSON.stringify(datos.credenciales) : null,
    ],
  );
}

export async function desconectarIntegracion(proveedor: string) {
  await consultar(
    (await orgActual()),
    `update integration set estado = 'no_conectado', cuenta = null, credenciales = null
      where organization_id = $1 and proveedor = $2`,
    [(await orgActual()), proveedor],
  );
}

/* --- Estudio: biblioteca de fondos --- */

/**
 * Los fondos de la plataforma salen del catálogo en código (`ESCENAS`) y los de
 * la automotora, de la base. Es la misma división que en integraciones: el
 * catálogo compartido no se replica por organización.
 *
 * Una escena catalogada cuyo archivo todavía no se generó viaja con `url: null`
 * en vez de omitirse — la pantalla dice qué falta en lugar de mostrar menos.
 */
export async function getShowrooms(): Promise<{ biblioteca: Showroom[]; propios: Showroom[] }> {
  const biblioteca: Showroom[] = ESCENAS.map((e) => {
    // El archivo lo deja `npm run showrooms` con el id de la escena; la
    // extensión depende de lo que entregue el proveedor.
    const url = ["png", "jpg", "webp"]
      .map((ext) => `/uploads/showrooms/${e.id}.${ext}`)
      .find(imagenLocalExiste) ?? null;
    return {
      id: e.id,
      nombre: e.nombre,
      url,
      origen: "biblioteca",
      lineaPiso: e.lineaPiso,
      usos: 0,
      prompt: promptDe(e),
    };
  });

  if (!dbConfigurada()) return { biblioteca, propios: [] };

  const filas = await consultar<{
    id: string; nombre: string; url: string; linea_piso: number;
    usos: number; modelo: string | null; prompt: string | null;
  }>(
    (await orgActual()),
    `select id, nombre, url, linea_piso, usos, modelo, prompt from showroom
      where organization_id = $1
      order by created_at desc`,
    [(await orgActual())],
  );

  return {
    biblioteca,
    propios: filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      url: f.url,
      origen: "propio",
      lineaPiso: Number(f.linea_piso),
      usos: f.usos,
      modelo: f.modelo ?? undefined,
      prompt: f.prompt ?? undefined,
    })),
  };
}

export type NuevoShowroom = {
  nombre: string;
  url: string;
  proveedor: string;
  modelo: string;
  prompt: string;
  semilla?: number;
  lineaPiso: number;
  ancho: number;
  alto: number;
};

export async function crearShowroom(datos: NuevoShowroom): Promise<string> {
  const filas = await consultar<{ id: string }>(
    (await orgActual()),
    `insert into showroom
       (organization_id, nombre, url, proveedor, modelo, prompt, semilla, linea_piso, ancho, alto)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id`,
    [
      (await orgActual()), datos.nombre, datos.url, datos.proveedor, datos.modelo,
      datos.prompt, datos.semilla ?? null, datos.lineaPiso, datos.ancho, datos.alto,
    ],
  );
  return filas[0].id;
}

/* --- Sucursales y equipo: escritura --- */

/**
 * El código de la sucursal se calcula, no se pide.
 *
 * Es visible y ordenado (SUC-001, SUC-002), y dejarlo escribir a mano invita a
 * duplicados — la base tiene `unique (organization_id, codigo)` y el error de
 * restricción no le dice nada a quien está creando una sucursal.
 */
async function siguienteCodigoSucursal(): Promise<string> {
  const filas = await consultar<{ codigo: string }>(
    (await orgActual()),
    `select codigo from branch where organization_id = $1 order by codigo desc limit 1`,
    [(await orgActual())],
  );
  const ultimo = Number(filas[0]?.codigo?.replace(/\D/g, "") ?? 0);
  return `SUC-${String(ultimo + 1).padStart(3, "0")}`;
}

export type DatosSucursal = {
  nombre: string;
  direccion?: string;
  comuna?: string;
  region?: string;
  telefono?: string;
  email?: string;
  esPrincipal?: boolean;
};

export type ResultadoEscritura =
  | { ok: true; id: string }
  | { ok: false; mensaje: string };

export async function crearSucursal(datos: DatosSucursal): Promise<ResultadoEscritura> {
  if (!dbConfigurada()) return { ok: false, mensaje: "Sin base de datos no se pueden crear sucursales." };

  const organizacion = await getOrganization();
  const existentes = await consultar<{ n: string }>(
    (await orgActual()),
    `select count(*)::int as n from branch where organization_id = $1`,
    [(await orgActual())],
  );
  // El límite del plan se muestra en pantalla, así que también se respeta acá:
  // si solo viviera en la interfaz, bastaría una segunda pestaña para saltarlo.
  if (Number(existentes[0].n) >= organizacion.limiteSucursales) {
    return {
      ok: false,
      mensaje: `Tu plan ${organizacion.plan} permite ${organizacion.limiteSucursales} sucursales.`,
    };
  }

  return enTransaccion((await orgActual()), async (cliente) => {
    if (datos.esPrincipal) {
      await cliente.query(
        `update branch set es_principal = false where organization_id = $1`, [(await orgActual())],
      );
    }
    const { rows } = await cliente.query<{ id: string }>(
      `insert into branch
         (organization_id, codigo, nombre, direccion, comuna, region, telefono, email, es_principal)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [
        (await orgActual()), await siguienteCodigoSucursal(), datos.nombre,
        datos.direccion ?? null, datos.comuna ?? null, datos.region ?? null,
        datos.telefono ?? null, datos.email ?? null, datos.esPrincipal ?? false,
      ],
    );
    return { ok: true as const, id: rows[0].id };
  });
}

export async function actualizarSucursal(idInterfaz: string, datos: DatosSucursal): Promise<ResultadoEscritura> {
  if (!dbConfigurada()) return { ok: false, mensaje: "Sin base de datos no se pueden editar sucursales." };

  const id = aUuid(idInterfaz);
  return enTransaccion((await orgActual()), async (cliente) => {
    // Una sola principal por organización: marcar una desmarca la anterior.
    if (datos.esPrincipal) {
      await cliente.query(
        `update branch set es_principal = false where organization_id = $1 and id <> $2`,
        [(await orgActual()), id],
      );
    }
    await cliente.query(
      `update branch set nombre = $3, direccion = $4, comuna = $5, region = $6,
                         telefono = $7, email = $8, es_principal = $9
        where organization_id = $1 and id = $2`,
      [
        (await orgActual()), id, datos.nombre, datos.direccion ?? null, datos.comuna ?? null,
        datos.region ?? null, datos.telefono ?? null, datos.email ?? null,
        datos.esPrincipal ?? false,
      ],
    );
    return { ok: true as const, id };
  });
}

/**
 * Las sucursales no se borran, se desactivan.
 *
 * Tienen vehículos, ventas y leads colgando: borrarlas dejaría el historial sin
 * dónde apoyarse. La principal no se puede desactivar, porque es la que hereda
 * lo que no tiene sucursal asignada.
 */
export async function cambiarEstadoSucursal(idInterfaz: string, activa: boolean): Promise<ResultadoEscritura> {
  if (!dbConfigurada()) return { ok: false, mensaje: "Sin base de datos no se puede cambiar el estado." };

  const id = aUuid(idInterfaz);
  const filas = await consultar<{ es_principal: boolean }>(
    (await orgActual()),
    `select es_principal from branch where organization_id = $1 and id = $2`,
    [(await orgActual()), id],
  );
  if (!filas[0]) return { ok: false, mensaje: "No se encontró la sucursal." };
  if (filas[0].es_principal && !activa) {
    return { ok: false, mensaje: "La sucursal principal no se puede desactivar. Marca otra como principal primero." };
  }

  await consultar(
    (await orgActual()),
    `update branch set activa = $3 where organization_id = $1 and id = $2`,
    [(await orgActual()), id, activa],
  );
  return { ok: true, id };
}

export type DatosMiembro = {
  nombre: string;
  email: string;
  telefono?: string;
  rol: AppUser["rol"];
  branchId?: string;
};

export async function crearMiembro(datos: DatosMiembro): Promise<ResultadoEscritura> {
  if (!dbConfigurada()) return { ok: false, mensaje: "Sin base de datos no se pueden invitar miembros." };

  const organizacion = await getOrganization();
  const existentes = await consultar<{ n: string }>(
    (await orgActual()), `select count(*)::int as n from app_user where organization_id = $1`, [(await orgActual())],
  );
  if (Number(existentes[0].n) >= organizacion.limiteUsuarios) {
    return {
      ok: false,
      mensaje: `Tu plan ${organizacion.plan} permite ${organizacion.limiteUsuarios} usuarios. Libera uno o cambia de plan.`,
    };
  }

  try {
    const filas = await consultar<{ id: string }>(
      (await orgActual()),
      `insert into app_user (organization_id, branch_id, nombre, email, telefono, rol)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [
        (await orgActual()), datos.branchId ? aUuid(datos.branchId) : null,
        datos.nombre, datos.email, datos.telefono ?? null, datos.rol,
      ],
    );
    return { ok: true, id: filas[0].id };
  } catch (e) {
    // `unique (organization_id, email)`: el correo ya está en el equipo.
    const detalle = e instanceof Error ? e.message : "";
    return {
      ok: false,
      mensaje: detalle.includes("app_user_organization_id_email_key") || detalle.includes("duplicate key")
        ? `${datos.email} ya es parte del equipo.`
        : "No se pudo agregar el miembro.",
    };
  }
}

export async function actualizarMiembro(idInterfaz: string, datos: DatosMiembro): Promise<ResultadoEscritura> {
  if (!dbConfigurada()) return { ok: false, mensaje: "Sin base de datos no se pueden editar miembros." };

  const id = aUuid(idInterfaz);
  await consultar(
    (await orgActual()),
    `update app_user set nombre = $3, email = $4, telefono = $5, rol = $6, branch_id = $7
      where organization_id = $1 and id = $2`,
    [
      (await orgActual()), id, datos.nombre, datos.email, datos.telefono ?? null, datos.rol,
      datos.branchId ? aUuid(datos.branchId) : null,
    ],
  );
  return { ok: true, id };
}

/**
 * Desactivar en vez de borrar: un vendedor tiene leads y ventas a su nombre.
 * La organización no puede quedarse sin ningún dueño activo.
 */
export async function cambiarEstadoMiembro(idInterfaz: string, activo: boolean): Promise<ResultadoEscritura> {
  if (!dbConfigurada()) return { ok: false, mensaje: "Sin base de datos no se puede cambiar el estado." };

  const id = aUuid(idInterfaz);
  if (!activo) {
    const duenos = await consultar<{ n: string }>(
      (await orgActual()),
      `select count(*)::int as n from app_user
        where organization_id = $1 and rol = 'owner' and activo and id <> $2`,
      [(await orgActual()), id],
    );
    if (Number(duenos[0].n) === 0) {
      return { ok: false, mensaje: "Tiene que quedar al menos un dueño activo en la organización." };
    }
  }

  await consultar(
    (await orgActual()),
    `update app_user set activo = $3 where organization_id = $1 and id = $2`,
    [(await orgActual()), id, activo],
  );
  return { ok: true, id };
}

/* --- Asistente de WhatsApp: contexto para decidir --- */

/**
 * Estado de un lead para que el bot decida: su etapa, quién la conduce y la
 * conversación completa. En una consulta, porque esto corre por cada mensaje
 * entrante y son 120.000 al día a escala del producto.
 */
export async function contextoDelBot(leadId: string): Promise<{
  etapaId: string;
  etapaResponsable: "ia" | "humano";
  vehicleId: string | null;
  historial: { direccion: "entrante" | "saliente"; cuerpo: string }[];
} | null> {
  if (!dbConfigurada()) return null;

  const filas = await consultar<{
    stage_id: string; responsable: "ia" | "humano"; vehicle_id: string | null;
  }>(
    (await orgActual()),
    `select l.stage_id, e.responsable, l.vehicle_id
       from lead l join stage e on e.id = l.stage_id
      where l.id = $1 and l.organization_id = $2`,
    [leadId, (await orgActual())],
  );
  if (!filas[0]) return null;

  const mensajes = await consultar<{ direccion: string; cuerpo: string }>(
    (await orgActual()),
    `select a.payload->>'direccion' as direccion, a.payload->>'cuerpo' as cuerpo
       from lead_activity a
      where a.lead_id = $1 and a.tipo = 'mensaje'
      order by a.created_at asc
      limit 40`,
    [leadId],
  );

  return {
    etapaId: filas[0].stage_id,
    etapaResponsable: filas[0].responsable,
    vehicleId: filas[0].vehicle_id,
    historial: mensajes.map((m) => ({
      direccion: m.direccion === "saliente" ? "saliente" : "entrante",
      cuerpo: m.cuerpo,
    })),
  };
}

/**
 * A qué etapa pasa un lead cuando el bot detecta interés: la primera del embudo
 * que conduce una persona. No se codifica un nombre porque el embudo lo
 * configura cada automotora — lo que no cambia es que ahí empieza el humano.
 */
export async function primeraEtapaHumana(): Promise<{ id: string; nombre: string } | null> {
  if (!dbConfigurada()) return null;
  const filas = await consultar<{ id: string; nombre: string }>(
    (await orgActual()),
    `select id, nombre from stage
      where organization_id = $1 and responsable = 'humano' and kind = 'progress'
      order by orden limit 1`,
    [(await orgActual())],
  );
  return filas[0] ?? null;
}

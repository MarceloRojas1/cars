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
import { idSemilla, uuidDe, ORG_UUID, SUCURSAL_POR_DEFECTO } from "./ids";
import { calcularCompletitud } from "./completitud";
import { MODELOS_SEMILLA } from "@/lib/catalogos";
import type { AppUser, Branch, Combustible, Lead, Stage, Vehicle } from "@/lib/types";

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

export async function getOrganization() {
  return seed.organization;
}
export async function getBranches(): Promise<Branch[]> {
  if (!dbConfigurada()) return seed.branches;

  const rows = await consultar<FilaSucursal>(
    ORG_UUID,
    `select * from branch where organization_id = $1 order by es_principal desc, nombre`,
    [ORG_UUID],
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
export async function getUsers(): Promise<AppUser[]> {
  if (!dbConfigurada()) return seed.users;

  const rows = await consultar<FilaUsuario>(
    ORG_UUID,
    `select * from app_user where organization_id = $1 and activo order by nombre`,
    [ORG_UUID],
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
export async function getCurrentUser() {
  return seed.users[0];
}
export async function getVehicles(archivados = false): Promise<Vehicle[]> {
  if (!dbConfigurada()) return archivados ? [] : seed.vehicles;

  const rows = await consultar<FilaVehiculo>(
    ORG_UUID,
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
    [ORG_UUID, archivados],
  );
  return rows.map(aVehiculo);
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Una ficha con sus fotos, para la pantalla de edición. */
export async function getVehiculo(id: string): Promise<Vehicle | null> {
  if (!dbConfigurada()) return seed.vehicles.find((v) => v.id === id) ?? null;
  // Un id con formato inválido es un 404, no un error 500 de Postgres.
  if (!ES_UUID.test(id)) return null;

  const rows = await consultar<FilaVehiculo>(
    ORG_UUID,
    `select * from vehicle where id = $1 and organization_id = $2`,
    [id, ORG_UUID],
  );
  if (!rows[0]) return null;

  const fotos = await consultar<{ id: string; url: string; orden: number; es_principal: boolean }>(
    ORG_UUID,
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
    ORG_UUID,
    `select distinct modelo from vehicle
      where organization_id = $1 and marca = $2 and modelo is not null and modelo <> ''
      order by modelo`,
    [ORG_UUID, marca],
  );
  return [...new Set([...rows.map((r) => r.modelo), ...semilla])].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}
export async function getStages() {
  return [...seed.stages].sort((a, b) => a.orden - b.orden);
}
export async function getLeads() {
  return seed.leads;
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
export async function getIntegrations() {
  return seed.integrations;
}
export async function getMetricas() {
  return seed.metricas;
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
    ORG_UUID,
    `select max(substring(codigo from 4)::bigint)::text as max
       from vehicle where organization_id = $1 and codigo ~ '^COD[0-9]+$'`,
    [ORG_UUID],
  );
  const ultimo = rows[0]?.max ? Number(rows[0].max) : 922_000;
  return `COD${ultimo + 1}`;
}

export async function crearVehiculo(datos: NuevoVehiculo): Promise<Vehicle> {
  const codigo = await siguienteCodigo();
  const { fotos = [], ...escalares } = datos;
  const completitud = calcularCompletitud(escalares);
  return enTransaccion(ORG_UUID, async (cliente) => {
    const { rows } = await cliente.query<FilaVehiculo>(
      `insert into vehicle (
         organization_id, branch_id, vendedor_id, codigo, titulo, marca, modelo,
         version, anio, patente, precio, km, combustible, transmision, carroceria,
         puertas, color, color_interior, pie_financiamiento, permiso_circulacion_vence,
         revision_tecnica_vence, cantidad_duenos, tags, equipamiento, descripcion,
         region, comuna, estado, completitud_pct, publicado_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               $20,$21,$22,$23,$24,$25,$26,$27,'disponible',$28, now())
       returning *`,
      [
        ORG_UUID,
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
      ORG_UUID,
      `select distinct marca, modelo from vehicle
        where organization_id = $1 and marca is not null and modelo is not null and modelo <> ''`,
      [ORG_UUID],
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
  await enTransaccion(ORG_UUID, async (cliente) => {
    const { rowCount } = await cliente.query(
      `update vehicle set
         branch_id = $2, vendedor_id = $3, titulo = $4, marca = $5, modelo = $6,
         version = $7, anio = $8, patente = $9, precio = $10, km = $11,
         combustible = $12, transmision = $13, carroceria = $14, puertas = $15,
         color = $16, color_interior = $17, pie_financiamiento = $18,
         permiso_circulacion_vence = $19, revision_tecnica_vence = $20,
         cantidad_duenos = $21, tags = $22, equipamiento = $23, descripcion = $24,
         region = $25, comuna = $26, completitud_pct = $27, actualizado_at = now()
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
        datos.region ?? null, datos.comuna ?? null, completitud, ORG_UUID,
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
  await consultar(ORG_UUID,
    `update vehicle set estado = $3, actualizado_at = now()
      where id = $1 and organization_id = $2`,
    [id, ORG_UUID, estado],
  );
}

/** Archivar no borra: saca del listado activo y se puede revertir. */
export async function archivarVehiculo(id: string, archivar = true) {
  await consultar(ORG_UUID,
    `update vehicle set archivado_at = $3, actualizado_at = now()
      where id = $1 and organization_id = $2`,
    [id, ORG_UUID, archivar ? new Date() : null],
  );
}

/**
 * Borrado real. Los leads y operaciones que apuntaban al vehículo quedan con
 * vehicle_id nulo (on delete set null), así que no se pierde el historial de
 * contactos — pero la ficha no vuelve.
 */
export async function eliminarVehiculo(id: string) {
  await consultar(ORG_UUID, `delete from vehicle where id = $1 and organization_id = $2`, [id, ORG_UUID]);
}

import { consultar, dbConfigurada } from "@/lib/db";

/**
 * Datos del catálogo público.
 *
 * Vive aparte de `data/index.ts` por una razón de seguridad, no de orden: ahí
 * toda consulta resuelve la organización desde la SESIÓN, y acá no hay sesión —
 * el visitante es un comprador anónimo. La organización sale del slug de la URL
 * y de ningún otro lado.
 *
 * Y solo se expone lo que una publicación muestra: disponible, no archivado y
 * con al menos una foto. Un auto vendido, archivado o sin fotos no existe para
 * el público, aunque exista en el inventario.
 */
export type Automotora = {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  /** Destino del botón del catálogo. Sin él no se muestra el botón. */
  whatsapp?: string;
  sitioWeb?: string;
  telefono?: string;
  comuna?: string;
  region?: string;
};

/**
 * Organización nula para la única consulta que todavía no sabe cuál es.
 * `organization` no lleva RLS, así que el valor no filtra nada; está para que
 * `consultar()` siempre reciba algo y la transacción quede acotada igual.
 */
const SIN_ORG = "00000000-0000-0000-0000-000000000000";

/** Slugs que chocarían con rutas del panel. Ninguna automotora puede tomarlos. */
export const SLUGS_RESERVADOS = new Set([
  "api", "dashboard", "vehiculos", "leads", "embudo", "clientes", "campanas",
  "equipo", "sucursales", "estudio", "integraciones", "mi-plan", "rendimiento",
  "recordatorios", "consultar-patente", "control-de-ventas", "mi-sitio-web",
  "asistente-ia", "automatizacion", "asignacion-de-leads", "login", "admin",
]);

/** La automotora dueña de ese slug, o null. */
export async function getAutomotoraPorSlug(slug: string): Promise<Automotora | null> {
  if (!dbConfigurada() || SLUGS_RESERVADOS.has(slug)) return null;

  /*
   * Dos consultas y no un join, por RLS: `organization` es la raíz del árbol y
   * no lleva política —es la única tabla que se puede consultar sin saber aún
   * cuál es la organización—, pero `branch` sí la lleva. Un join lateral con
   * una organización falsa devuelve siempre null; hay que resolver el id
   * primero y recién entonces declararlo.
   */
  const orgs = await consultar<{
    id: string; nombre: string; slug: string; descripcion: string | null;
    whatsapp: string | null; sitio_web: string | null;
  }>(
    SIN_ORG,
    `select id, nombre, slug, descripcion, whatsapp, sitio_web
       from organization where slug = $1 and catalogo_publico`,
    [slug],
  );
  if (!orgs[0]) return null;

  const suc = await consultar<{ telefono: string | null; comuna: string | null; region: string | null }>(
    orgs[0].id,
    `select telefono, comuna, region from branch
      where organization_id = $1 and activa order by es_principal desc limit 1`,
    [orgs[0].id],
  );

  return {
    id: orgs[0].id,
    nombre: orgs[0].nombre,
    slug: orgs[0].slug,
    descripcion: orgs[0].descripcion ?? undefined,
    whatsapp: orgs[0].whatsapp?.replace(/\D/g, "") || undefined,
    sitioWeb: orgs[0].sitio_web ?? undefined,
    telefono: suc[0]?.telefono ?? undefined,
    comuna: suc[0]?.comuna ?? undefined,
    region: suc[0]?.region ?? undefined,
  };
}

type FilaPublica = {
  id: string; codigo: string; titulo: string; marca: string | null;
  modelo: string | null; version: string | null; anio: number | null;
  precio: string | null; km: number | null; combustible: string | null;
  transmision: string | null; carroceria: string | null; puertas: number | null;
  color: string | null; color_interior: string | null; cilindrada: string | null;
  cantidad_duenos: number | null; equipamiento: string | null;
  descripcion: string | null; comuna: string | null; region: string | null;
  pie_financiamiento: string | null; fotos: string[] | null;
};

/** Solo campos que una publicación muestra. El resto del inventario no sale. */
export type VehiculoPublico = {
  codigo: string;
  titulo: string;
  marca: string;
  modelo?: string;
  version?: string;
  anio: number;
  precio: number;
  km: number;
  combustible: string;
  transmision?: string;
  carroceria?: string;
  puertas?: number;
  color?: string;
  colorInterior?: string;
  cilindrada?: string;
  cantidadDuenos?: number;
  equipamiento?: string;
  descripcion?: string;
  comuna?: string;
  region?: string;
  pieFinanciamiento?: number;
  fotos: string[];
};

function aPublico(f: FilaPublica): VehiculoPublico {
  return {
    codigo: f.codigo,
    titulo: f.titulo,
    marca: f.marca ?? "",
    modelo: f.modelo ?? undefined,
    version: f.version ?? undefined,
    anio: f.anio ?? 0,
    precio: Number(f.precio ?? 0),
    km: f.km ?? 0,
    combustible: f.combustible ?? "",
    transmision: f.transmision ?? undefined,
    carroceria: f.carroceria ?? undefined,
    puertas: f.puertas ?? undefined,
    color: f.color ?? undefined,
    colorInterior: f.color_interior ?? undefined,
    cilindrada: f.cilindrada ?? undefined,
    cantidadDuenos: f.cantidad_duenos ?? undefined,
    equipamiento: f.equipamiento ?? undefined,
    descripcion: f.descripcion ?? undefined,
    comuna: f.comuna ?? undefined,
    region: f.region ?? undefined,
    pieFinanciamiento: f.pie_financiamiento ? Number(f.pie_financiamiento) : undefined,
    fotos: f.fotos ?? [],
  };
}

const CAMPOS = `v.id, v.codigo, v.titulo, v.marca, v.modelo, v.version, v.anio,
  v.precio, v.km, v.combustible, v.transmision, v.carroceria, v.puertas,
  v.color, v.color_interior, v.cilindrada, v.cantidad_duenos, v.equipamiento, v.descripcion, v.comuna,
  v.region, v.pie_financiamiento,
  (select array_agg(p.url order by p.es_principal desc, p.orden)
     from vehicle_photo p where p.vehicle_id = v.id) as fotos`;

const PUBLICABLE = `v.organization_id = $1
  and v.estado = 'disponible'
  and v.archivado_at is null
  and exists (select 1 from vehicle_photo p where p.vehicle_id = v.id)`;

export async function getCatalogo(orgId: string): Promise<VehiculoPublico[]> {
  const filas = await consultar<FilaPublica>(
    orgId,
    `select ${CAMPOS} from vehicle v where ${PUBLICABLE} order by v.publicado_at desc nulls last`,
    [orgId],
  );
  return filas.map(aPublico);
}

export async function getVehiculoPublico(
  orgId: string, codigo: string,
): Promise<VehiculoPublico | null> {
  const filas = await consultar<FilaPublica>(
    orgId,
    `select ${CAMPOS} from vehicle v where ${PUBLICABLE} and v.codigo = $2`,
    [orgId, codigo],
  );
  return filas[0] ? aPublico(filas[0]) : null;
}

/** Del mismo rango de precio, para el bloque "también te puede interesar". */
export async function getSimilares(
  orgId: string, codigo: string, precio: number, cuantos = 3,
): Promise<VehiculoPublico[]> {
  const filas = await consultar<FilaPublica>(
    orgId,
    `select ${CAMPOS} from vehicle v
      where ${PUBLICABLE} and v.codigo <> $2
      order by abs(v.precio - $3) limit $4`,
    [orgId, codigo, precio, cuantos],
  );
  return filas.map(aPublico);
}

/**
 * Los slugs a prerenderizar. Sin sesión y sin RLS: `organization` es la raíz.
 * Es la lista que `generateStaticParams` convierte en páginas al construir.
 */
export async function getSlugsPublicos(): Promise<string[]> {
  if (!dbConfigurada()) return [];
  const filas = await consultar<{ slug: string }>(
    SIN_ORG,
    "select slug from organization where catalogo_publico order by slug",
  );
  return filas.map((f) => f.slug).filter((s) => !SLUGS_RESERVADOS.has(s));
}

/**
 * Cuántas fichas por automotora se hornean al construir. Las que quedan fuera
 * igual funcionan: `dynamicParams` las genera la primera vez que alguien las
 * abre y desde ahí quedan guardadas como el resto. El tope existe para que el
 * despliegue no crezca con el inventario acumulado de todos los clientes.
 */
const FICHAS_PRERENDERIZADAS = 50;

/** Las fichas a prerenderizar, las más recientes de cada automotora. */
export async function getFichasPublicas(): Promise<{ slug: string; codigo: string }[]> {
  const slugs = await getSlugsPublicos();
  const fichas: { slug: string; codigo: string }[] = [];

  // Una consulta por automotora y no una sola con join: cada una tiene que
  // declarar su organización para pasar por RLS.
  for (const slug of slugs) {
    const automotora = await getAutomotoraPorSlug(slug);
    if (!automotora) continue;
    const filas = await consultar<{ codigo: string }>(
      automotora.id,
      `select v.codigo from vehicle v
        where ${PUBLICABLE}
        order by v.publicado_at desc nulls last
        limit $2`,
      [automotora.id, FICHAS_PRERENDERIZADAS],
    );
    for (const f of filas) fichas.push({ slug, codigo: f.codigo });
  }
  return fichas;
}

/** Lo que el panel necesita saber de su propio catálogo: dónde está y qué falta. */
export type ResumenCatalogo = {
  slug: string;
  activo: boolean;
  whatsapp?: string;
  publicados: number;
  /** Disponibles que NO salen porque nadie les cargó fotos. */
  sinFotos: number;
};

export async function getResumenCatalogo(orgId: string): Promise<ResumenCatalogo | null> {
  if (!dbConfigurada()) return null;

  const org = await consultar<{ slug: string; catalogo_publico: boolean; whatsapp: string | null }>(
    orgId,
    "select slug, catalogo_publico, whatsapp from organization where id = $1",
    [orgId],
  );
  if (!org[0]) return null;

  const conteo = await consultar<{ publicados: string; sin_fotos: string }>(
    orgId,
    `select
       count(*) filter (where tiene_fotos) as publicados,
       count(*) filter (where not tiene_fotos) as sin_fotos
     from (
       select exists (select 1 from vehicle_photo p where p.vehicle_id = v.id) as tiene_fotos
         from vehicle v
        where v.organization_id = $1 and v.estado = 'disponible' and v.archivado_at is null
     ) t`,
    [orgId],
  );

  return {
    slug: org[0].slug,
    activo: org[0].catalogo_publico,
    whatsapp: org[0].whatsapp ?? undefined,
    publicados: Number(conteo[0]?.publicados ?? 0),
    sinFotos: Number(conteo[0]?.sin_fotos ?? 0),
  };
}

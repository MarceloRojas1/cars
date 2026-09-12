import { consultar, dbConfigurada } from "@/lib/db";

/**
 * Las secciones del sitio público, más allá del catálogo.
 *
 * Vive junto a `catalogo.ts` y por la misma razón: acá no hay sesión, la
 * organización llega como argumento desde el slug de la URL, y solo se lee lo
 * que la automotora decidió publicar. Un vendedor no aparece salvo que esté
 * marcado; una reseña oculta no sale.
 */

export type Servicio = { titulo: string; texto: string; link?: string; imagenUrl?: string };

export type MiembroPublico = {
  nombre: string;
  cargo?: string;
  fotoUrl?: string;
};

export type Resena = {
  id: string;
  autor: string;
  texto: string;
  estrellas: number;
  fuente?: string;
  fecha?: string;
};

export type Sucursal = {
  nombre: string;
  direccion?: string;
  comuna?: string;
  region?: string;
  telefono?: string;
  email?: string;
  horario?: string;
  mapaUrl?: string;
};

export type SeccionesSitio = {
  sobreTitulo?: string;
  sobreTexto?: string;
  servicios: Servicio[];
  equipo: MiembroPublico[];
  resenas: Resena[];
  sucursales: Sucursal[];
};

export type PaginaSitio = {
  ruta: string;
  titulo: string;
  rotulo?: string;
  bajada?: string;
  contenido?: string;
  imagenUrl?: string;
  /** null = solo contenido. El resto decide qué campos pide y cómo entra el lead. */
  formulario?: "cotizar" | "consignar" | "financiar" | "contacto";
  enMenu: boolean;
};

/** Las pestañas del sitio, en orden. */
export async function getPaginas(orgId: string): Promise<PaginaSitio[]> {
  if (!dbConfigurada()) return [];
  const filas = await consultar<{
    ruta: string; titulo: string; rotulo: string | null; bajada: string | null;
    contenido: string | null; imagen_url: string | null; formulario: string | null;
    en_menu: boolean;
  }>(
    orgId,
    `select ruta, titulo, rotulo, bajada, contenido, imagen_url, formulario, en_menu
       from pagina where organization_id = $1 and visible order by orden, titulo`,
    [orgId],
  );
  return filas.map((f) => ({
    ruta: f.ruta,
    titulo: f.titulo,
    rotulo: f.rotulo ?? undefined,
    bajada: f.bajada ?? undefined,
    contenido: f.contenido ?? undefined,
    imagenUrl: f.imagen_url ?? undefined,
    formulario: (f.formulario as PaginaSitio["formulario"]) ?? undefined,
    enMenu: f.en_menu,
  }));
}

export type RedesSociales = {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  aliados: { nombre: string; logoUrl?: string }[];
};

export async function getRedes(orgId: string): Promise<RedesSociales> {
  if (!dbConfigurada()) return { aliados: [] };
  const [c] = await consultar<{
    instagram_url: string | null; tiktok_url: string | null;
    facebook_url: string | null; youtube_url: string | null;
    aliados: { nombre: string; logoUrl?: string }[] | null;
  }>(
    orgId,
    `select instagram_url, tiktok_url, facebook_url, youtube_url, aliados
       from site_config where organization_id = $1`,
    [orgId],
  );
  return {
    instagram: c?.instagram_url ?? undefined,
    tiktok: c?.tiktok_url ?? undefined,
    facebook: c?.facebook_url ?? undefined,
    youtube: c?.youtube_url ?? undefined,
    aliados: (c?.aliados ?? []).filter((a) => a?.nombre),
  };
}

export async function getSeccionesSitio(orgId: string): Promise<SeccionesSitio> {
  const vacio: SeccionesSitio = { servicios: [], equipo: [], resenas: [], sucursales: [] };
  if (!dbConfigurada()) return vacio;

  const [config] = await consultar<{
    sobre_titulo: string | null; sobre_texto: string | null;
    servicios: Servicio[] | null;
    mostrar_equipo: boolean; mostrar_resenas: boolean;
  }>(
    orgId,
    `select sobre_titulo, sobre_texto, servicios, mostrar_equipo, mostrar_resenas
       from site_config where organization_id = $1`,
    [orgId],
  );

  /*
   * Las tres consultas van juntas: son independientes entre sí y esperar una
   * detrás de otra alarga la generación de la página sin ninguna ganancia.
   */
  const [equipo, resenas, sucursales] = await Promise.all([
    config?.mostrar_equipo === false ? [] : consultar<{
      nombre: string; cargo_publico: string | null; foto_url: string | null;
    }>(
      orgId,
      `select nombre, cargo_publico, foto_url from app_user
        where organization_id = $1 and activo and en_sitio_web
        order by nombre`,
      [orgId],
    ),
    config?.mostrar_resenas === false ? [] : consultar<{
      id: string; autor: string; texto: string; estrellas: number;
      fuente: string | null; fecha: Date | null;
    }>(
      orgId,
      `select id, autor, texto, estrellas, fuente, fecha from resena
        where organization_id = $1 and visible order by orden, created_at desc limit 12`,
      [orgId],
    ),
    consultar<{
      nombre: string; direccion: string | null; comuna: string | null; region: string | null;
      telefono: string | null; email: string | null; horario: string | null; mapa_url: string | null;
    }>(
      orgId,
      `select nombre, direccion, comuna, region, telefono, email, horario, mapa_url
         from branch where organization_id = $1 and activa
        order by es_principal desc, nombre`,
      [orgId],
    ),
  ]);

  return {
    sobreTitulo: config?.sobre_titulo ?? undefined,
    sobreTexto: config?.sobre_texto ?? undefined,
    // Se filtra lo incompleto: un servicio sin título es una fila a medio llenar.
    servicios: (config?.servicios ?? []).filter((s) => s?.titulo),
    equipo: equipo.map((m) => ({
      nombre: m.nombre,
      cargo: m.cargo_publico ?? undefined,
      fotoUrl: m.foto_url ?? undefined,
    })),
    resenas: resenas.map((r) => ({
      id: r.id,
      autor: r.autor,
      texto: r.texto,
      estrellas: r.estrellas,
      fuente: r.fuente ?? undefined,
      fecha: r.fecha ? r.fecha.toISOString().slice(0, 10) : undefined,
    })),
    sucursales: sucursales.map((s) => ({
      nombre: s.nombre,
      direccion: s.direccion ?? undefined,
      comuna: s.comuna ?? undefined,
      region: s.region ?? undefined,
      telefono: s.telefono ?? undefined,
      email: s.email ?? undefined,
      horario: s.horario ?? undefined,
      mapaUrl: s.mapa_url ?? undefined,
    })),
  };
}

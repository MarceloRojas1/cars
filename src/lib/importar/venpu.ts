/**
 * Lee el catálogo público de una automotora que todavía usa VENPU.
 *
 * Es el camino de entrada al producto: quien llega viene de ahí, con su
 * inventario cargado y fotografiado, y volver a subir treinta autos con
 * cuarenta fotos cada uno a mano es motivo suficiente para no cambiarse.
 *
 * CÓMO FUNCIONA. El sitio que VENPU le genera a cada automotora está hecho con
 * Astro, y su página de catálogo trae los vehículos COMPLETOS embebidos en el
 * HTML —la paginación que se ve es JavaScript sobre datos que ya están—. Así
 * que una sola petición devuelve todo el inventario con sus fotos, en vez de
 * cien peticiones a cien fichas.
 *
 * Son datos que la automotora publicó ella misma para que cualquiera los lea:
 * esto es lo mismo que hace un navegador al abrir la página.
 */

import type { Combustible } from "@/lib/types";

/**
 * Astro serializa envolviendo cada valor: `[0, valor]` para uno simple y
 * `[1, [...]]` para una lista. Esto lo deshace en profundidad.
 */
function desenvolver(v: unknown): unknown {
  if (Array.isArray(v) && v.length === 2 && (v[0] === 0 || v[0] === 1)) {
    return desenvolver(v[1]);
  }
  if (Array.isArray(v)) return v.map(desenvolver);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, desenvolver(x)]),
    );
  }
  return v;
}

/** Un vehículo tal como lo publica VENPU. */
export type VehiculoVenpu = {
  code: string;
  title: string;
  description?: string;
  brand?: { name?: string };
  model?: { name?: string };
  version?: string;
  year?: number;
  kms?: number;
  price?: number;
  color?: string;
  doors?: number;
  fuel?: string;
  transmission?: string;
  bodyType?: string;
  status?: string;
  comuna?: { name?: string };
  region?: { name?: string };
  downPaymentPercentage?: number;
  tags?: string[];
  image?: string;
  images?: { url?: string }[];
};

/**
 * ¿Esta página la generó VENPU?
 *
 * Se piden DOS señales, no una. El enlace a venpu.cl del pie solo, o la forma
 * de los códigos sola, podrían aparecer por casualidad — un blog que hable de
 * VENPU, otra herramienta que use el mismo formato de código. Juntas, no.
 *
 * Se devuelve el motivo para poder decirle a la persona QUÉ falló, en vez de
 * un "no se pudo" que no se sabe cómo arreglar.
 */
export function reconocerVenpu(html: string): { es: boolean; motivo?: string } {
  const enlaceVenpu = /venpu\.cl/i.test(html);
  const codigos = /\/vehiculos\/COD\d{5,}/.test(html) || /"code":\[0,"COD\d{5,}"\]/.test(html.replace(/&quot;/g, '"'));

  if (!enlaceVenpu && !codigos) {
    return { es: false, motivo: "Esta página no parece de VENPU: no encontré ni su firma ni vehículos publicados." };
  }
  if (!codigos) {
    return { es: false, motivo: "Parece un sitio de VENPU pero no encontré vehículos. ¿Es la página del catálogo?" };
  }
  return { es: true };
}

/**
 * Los vehículos embebidos en el HTML del catálogo.
 *
 * Se recorre buscando `"code":"COD…"` y desde ahí se retrocede hasta la llave
 * que abre el objeto, equilibrando llaves hacia adelante. Es más tosco que
 * parsear la estructura entera, y a propósito: la envoltura de Astro cambia
 * entre versiones, pero un objeto JSON con una clave `code` se reconoce igual.
 */
export function leerCatalogoVenpu(html: string): VehiculoVenpu[] {
  const texto = html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'");

  const vistos = new Set<string>();
  const vehiculos: VehiculoVenpu[] = [];

  for (const m of texto.matchAll(/"code":\s*\[0,\s*"(COD\d{5,})"\]/g)) {
    const codigo = m[1];
    if (vistos.has(codigo)) continue;

    const ini = texto.lastIndexOf("{", m.index);
    if (ini < 0) continue;

    // Equilibra llaves respetando las cadenas, para no cortar en una `}` que
    // viva dentro de una descripción.
    let prof = 0, fin = -1, enCadena = false, escapado = false;
    for (let j = ini; j < texto.length && j < ini + 200_000; j++) {
      const c = texto[j];
      if (escapado) { escapado = false; continue; }
      if (c === "\\") { escapado = true; continue; }
      if (c === '"') { enCadena = !enCadena; continue; }
      if (enCadena) continue;
      if (c === "{") prof++;
      else if (c === "}") { prof--; if (prof === 0) { fin = j; break; } }
    }
    if (fin < 0) continue;

    try {
      const crudo = desenvolver(JSON.parse(texto.slice(ini, fin + 1))) as VehiculoVenpu;
      if (!crudo?.code) continue;
      vistos.add(codigo);
      vehiculos.push(crudo);
    } catch {
      // Un objeto que no parsea se salta: mejor importar 99 que ninguno.
    }
  }

  return vehiculos;
}

/** Las fotos de un vehículo, sin repetir y en el orden que trae VENPU. */
export function fotosDe(v: VehiculoVenpu): string[] {
  const urls = [
    ...(v.image ? [v.image] : []),
    ...(v.images ?? []).map((i) => i?.url).filter((u): u is string => Boolean(u)),
  ];
  return [...new Set(urls)];
}

/**
 * De dónde bajar el catálogo, a partir de lo que la persona pegue.
 *
 * Puede pegar la portada, una ficha, o el catálogo. Se prueban las rutas
 * conocidas en orden: lo que importa es llegar a la página que trae el
 * inventario completo embebido.
 */
export function candidatasDeCatalogo(url: URL): string[] {
  const base = `${url.protocol}//${url.host}`;
  const suyas = url.pathname !== "/" ? [url.toString()] : [];
  return [...new Set([...suyas, `${base}/catalogo`, `${base}/seminuevos`, base])];
}

/* ── Traducción a nuestro modelo ──────────────────────────────────────── */

/**
 * Su vocabulario y el nuestro casi coinciden, pero «casi» no sirve: un valor
 * que no esté en nuestro catálogo deja el desplegable de la ficha en blanco.
 * Lo que no reconocemos pasa tal cual — mejor guardar el dato que perderlo.
 */
const CARROCERIA: Record<string, string> = {
  pickup: "Camioneta",
  "pick up": "Camioneta",
  suv: "SUV",
  sedan: "Sedán",
  hatchback: "Hatchback",
  "station wagon": "Station Wagon",
  convertible: "Convertible",
  coupe: "Coupé",
  moto: "Moto",
  van: "Van",
  otro: "",          // "Otro" no dice nada: mejor vacío que un valor inventado
};

const COMBUSTIBLE: Record<string, Combustible> = {
  bencina: "Bencina",
  diesel: "Diésel",
  "diésel": "Diésel",
  hibrido: "Híbrido",
  "híbrido": "Híbrido",
  electrico: "Eléctrico",
  "eléctrico": "Eléctrico",
  gas: "Gas (GLP/GNV)",
};

const TRANSMISION: Record<string, string> = {
  automatico: "Automática",
  "automático": "Automática",
  automatica: "Automática",
  manual: "Manual",
  cvt: "CVT",
};

const clave = (s?: string) =>
  (s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * La MARCA viene en mayúsculas («PEUGEOT») y se ve mal así en la ficha.
 *
 * El MODELO no se toca, y es deliberado: están llenos de siglas —GLA, CX-5,
 * XV, RAV4— y capitalizarlas las estropea («Gla 250»). Dejar «OUTBACK» a
 * gritos es un defecto menor que escribir mal el nombre del auto.
 */
function capitalizar(s?: string): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  // Solo si viene TODO en mayúsculas: "BMW" y "RAM" se quedan como están.
  if (t !== t.toUpperCase() || t.length <= 3) return t;
  return t
    .toLowerCase()
    .replace(/(^|[\s/-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());
}

export type VehiculoTraducido = {
  codigoVenpu: string;
  vendido: boolean;
  fotos: string[];
  datos: {
    marca: string; modelo: string; version?: string; anio: number; precio: number;
    titulo: string; km?: number; combustible?: Combustible; transmision?: string;
    carroceria?: string; puertas?: number; colorExterior?: string;
    descripcion?: string; region?: string; comuna?: string;
    pieFinanciamiento?: number; tags: string[];
  };
};

export function traducirVenpu(v: VehiculoVenpu): VehiculoTraducido | null {
  const marca = capitalizar(v.brand?.name);
  const modelo = (v.model?.name ?? "").trim();
  const anio = Number(v.year) || 0;
  const precio = Number(v.price) || 0;
  // Lo mismo que exige el formulario: sin esto no se puede crear la ficha.
  if (!marca || !modelo || !anio || !precio) return null;

  const carroceria = CARROCERIA[clave(v.bodyType)] ?? v.bodyType ?? "";

  return {
    codigoVenpu: v.code,
    vendido: v.status === "sold",
    fotos: fotosDe(v),
    datos: {
      marca,
      modelo,
      version: v.version?.trim() || undefined,
      anio,
      precio,
      // Su título ya está escrito para vender («Peugeot 3008 1.6 GT Hibrido año
      // 2023»): se respeta en vez de recomponerlo peor.
      titulo: (v.title ?? `${marca} ${modelo}`).trim().slice(0, 100),
      km: Number.isFinite(Number(v.kms)) ? Number(v.kms) : undefined,
      /*
       * Solo si cae en nuestro catálogo: `combustible` es un tipo cerrado y un
       * valor libre rompería el desplegable de la ficha. Es la excepción a
       * "pasa tal cual" que se aplica al resto.
       */
      combustible: COMBUSTIBLE[clave(v.fuel)],
      transmision: TRANSMISION[clave(v.transmission)] ?? v.transmission ?? undefined,
      carroceria: carroceria || undefined,
      puertas: Number(v.doors) || undefined,
      colorExterior: v.color?.trim() || undefined,
      descripcion: v.description?.trim() || undefined,
      region: v.region?.name?.trim() || undefined,
      comuna: v.comuna?.name?.trim() || undefined,
      pieFinanciamiento: undefined,
      tags: Array.isArray(v.tags) ? v.tags.filter((t): t is string => typeof t === "string") : [],
    },
  };
}

import type {
  DatosPatente, DatosTasacion, Proveedor, ResultadoPatente, ResultadoTasacion,
} from "./tipos";
import {
  aEntero, aTitulo, CARROCERIA_POR_TIPO, COMBUSTIBLE_POR_VALOR,
  marcaCanonica, normalizar, TRANSMISION_POR_VALOR,
} from "./normalizar";

/**
 * GetAPI — https://getapi.cl/docs/
 * GET /v1/vehicles/plate/{patente} · cabecera X-Api-Key.
 *
 * A diferencia de Boostr, ya trae marca, modelo, versión, VIN, color y
 * kilometraje separados en el plan base — no hace falta un plan extendido
 * para eso. `plantaRevisora` es de pago (plan PRO) y no se usa acá.
 *
 * Verificado contra la API real el 2026-09-14 (ver docs/decisiones.md).
 * `model.typeVehicle.name` trae el tipo en el vocabulario del Registro Civil
 * ("STATION WAGON") — es ese campo el que cruza con `CARROCERIA_POR_TIPO`,
 * NO `typeVehicle.category` (que es una clase más ancha, "LIVIANO"/"PESADO",
 * y siempre falla contra esa tabla).
 */
const BASE = process.env.GETAPI_BASE_URL ?? "https://chile.getapi.cl";

type DatosGetApi = {
  licensePlate?: string;
  dvLicensePlate?: string;
  version?: string | null;
  mileage?: number | string | null;
  color?: string | null;
  year?: number;
  vinNumber?: string | null;
  engineNumber?: string | null;
  engine?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  doors?: number | string | null;
  model?: {
    name?: string;
    typeVehicle?: { name?: string };
    brand?: { name?: string };
  };
};

type RespuestaGetApi = {
  success: boolean;
  status: number;
  data?: DatosGetApi;
  message?: string;
};

const clave = () => process.env.GETAPI_API_KEY;

export function mapearGetApi(d: DatosGetApi): DatosPatente {
  const marca = d.model?.brand?.name ? marcaCanonica(d.model.brand.name) : undefined;
  const tipo = d.model?.typeVehicle?.name;
  const km = aEntero(d.mileage);

  return {
    patente: d.licensePlate ?? "",
    marca,
    modelo: d.model?.name ? aTitulo(d.model.name) : undefined,
    version: d.version?.trim() || undefined,
    anio: d.year && d.year > 1900 ? d.year : undefined,
    carroceria: tipo ? CARROCERIA_POR_TIPO[tipo.toUpperCase()] : undefined,
    motor: d.engineNumber ?? undefined,
    dv: d.dvLicensePlate ?? undefined,
    vin: d.vinNumber ?? undefined,
    color: d.color ? aTitulo(d.color) : undefined,
    combustible: normalizar(d.fuel ?? undefined, COMBUSTIBLE_POR_VALOR),
    transmision: normalizar(d.transmission ?? undefined, TRANSMISION_POR_VALOR),
    km,
    puertas: aEntero(d.doors),
    cilindrada: d.engine?.trim() || undefined,
    desdeCache: false,
    extendido: Boolean(d.vinNumber ?? d.color ?? km),
  };
}

export const proveedorGetApi: Proveedor = {
  id: "getapi",
  nombre: "GetAPI",
  esReal: true,
  get advertencia() {
    return clave() ? undefined : "Falta GETAPI_API_KEY.";
  },

  async buscar(patente: string): Promise<ResultadoPatente> {
    const k = clave();
    if (!k) {
      return { ok: false, mensaje: "Falta GETAPI_API_KEY." };
    }

    let respuesta: Response;
    try {
      respuesta = await fetch(`${BASE}/v1/vehicles/plate/${patente}`, {
        headers: { Accept: "application/json", "X-Api-Key": k },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { ok: false, mensaje: "No se pudo contactar a GetAPI." };
    }

    if (respuesta.status === 429) {
      return { ok: false, mensaje: "Demasiadas consultas seguidas. Espera unos segundos." };
    }

    let cuerpo: RespuestaGetApi;
    try {
      cuerpo = await respuesta.json();
    } catch {
      return { ok: false, mensaje: "GetAPI devolvió una respuesta ilegible." };
    }

    if (!cuerpo.success || !cuerpo.data) {
      return { ok: false, mensaje: cuerpo.message ?? "No se encontró el vehículo." };
    }
    return { ok: true, datos: mapearGetApi(cuerpo.data) };
  },
};

type RespuestaTasacion = {
  success: boolean;
  data?: {
    precioUsado?: { precio?: number; banda_max?: number; banda_min?: number };
    precioRetoma?: number;
  };
  message?: string;
};

/**
 * Tasación — GET /v1/vehicles/appraisal/{patente}. Solo GetAPI la tiene, así
 * que no pasa por el mismo mecanismo intercambiable que `proveedorActivo()`;
 * se llama directo cuando `GETAPI_API_KEY` está puesta.
 *
 * Es informativa nada más: el precio de venta lo sigue poniendo el vendedor
 * a mano (ver `docs/decisiones.md`, 2026-09-14). No tiene caché propia —a
 * diferencia de `plate_lookup`— así que recargar la página de "Nuevo
 * vehículo" con la misma patente vuelve a gastar una consulta.
 */
export async function consultarTasacionGetApi(patente: string): Promise<ResultadoTasacion> {
  const k = clave();
  if (!k) return { ok: false, mensaje: "Falta GETAPI_API_KEY." };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}/v1/vehicles/appraisal/${patente}`, {
      headers: { Accept: "application/json", "X-Api-Key": k },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, mensaje: "No se pudo contactar a GetAPI." };
  }

  if (respuesta.status === 429) {
    return { ok: false, mensaje: "Demasiadas consultas seguidas. Espera unos segundos." };
  }

  let cuerpo: RespuestaTasacion;
  try {
    cuerpo = await respuesta.json();
  } catch {
    return { ok: false, mensaje: "GetAPI devolvió una respuesta ilegible." };
  }

  const u = cuerpo.data?.precioUsado;
  if (!cuerpo.success || !u?.precio || !cuerpo.data?.precioRetoma) {
    return { ok: false, mensaje: cuerpo.message ?? "No hay tasación para este vehículo." };
  }

  const datos: DatosTasacion = {
    precioUsado: u.precio,
    bandaMin: u.banda_min ?? u.precio,
    bandaMax: u.banda_max ?? u.precio,
    precioRetoma: cuerpo.data.precioRetoma,
  };
  return { ok: true, datos };
}

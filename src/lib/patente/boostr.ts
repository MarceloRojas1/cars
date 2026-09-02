import type { Proveedor, ResultadoPatente, DatosPatente } from "./tipos";
import {
  aEntero, aTitulo, CARROCERIA_POR_TIPO, COMBUSTIBLE_POR_VALOR,
  normalizar, separarModeloVersion, TRANSMISION_POR_VALOR,
} from "./normalizar";

/**
 * Boostr — https://docs.boostr.cl/reference/car-plate
 * GET /vehicle/{patente}.json · cabecera X-API-KEY · 5 consultas cada 10 s.
 *
 * El plan gratuito devuelve lo básico; el extendido (plan Pro) agrega la ficha
 * técnica. Todos los campos son opcionales, así que el mismo mapeo sirve para
 * los dos y activar el de pago es solo poner la clave.
 *
 * OJO: su endpoint público de pruebas (/vehicle/fake/) está documentado con
 * `security: []` pero Cloudflare lo bloquea con 403 sin clave — verificado el
 * 2026-09-02, Ray ID a34a1c246fe0df53. Es un error de configuración de ellos.
 */
const BASE = process.env.BOOSTR_BASE_URL ?? "https://api.boostr.cl";

const PATENTES_DE_PRUEBA = [
  "JG5165", "KFHD30", "UE2083", "ORE044", "AW0129", "RRLH58",
  "GRVF16", "LPPT66", "BPCW69", "KCYT22", "TTFB95", "RE1792",
  "LJKG41", "AA3556", "SZ2777", "YR2587", "WW6785", "DZTD28",
] as const;

type DatosBoostr = {
  plate?: string; dv?: string; make?: string; model?: string;
  year?: number; type?: string; engine?: string;
  vin?: string; chassis?: string; color?: string;
  fuel?: string; fuel_type?: string;
  mileage?: number | string; kilometers?: number | string;
  doors?: number | string; version?: string; transmission?: string;
  engine_size?: string | number; engineSize?: string | number;
};

type RespuestaBoostr = {
  status: "success" | "error";
  data?: DatosBoostr | string;
  code?: string;
  message?: string;
};

const MENSAJES: Record<string, string> = {
  "V-01": "Falta indicar la patente.",
  "V-02": "No hay datos asociados a esa patente.",
  "V-04": "La patente no es válida.",
};

export function mapearBoostr(d: DatosBoostr): DatosPatente {
  const marca = d.make ? aTitulo(d.make) : undefined;
  const versionExplicita = d.version?.trim() || undefined;
  const separado = marca && d.model && !versionExplicita
    ? separarModeloVersion(marca, d.model.trim())
    : { modelo: d.model ? aTitulo(d.model) : undefined, version: versionExplicita };

  const km = aEntero(d.mileage ?? d.kilometers);

  return {
    patente: d.plate ?? "",
    marca,
    modelo: separado.modelo,
    version: separado.version,
    anio: d.year && d.year > 1900 ? d.year : undefined,
    carroceria: d.type ? CARROCERIA_POR_TIPO[d.type.toUpperCase()] : undefined,
    motor: d.engine,
    dv: d.dv,
    vin: d.vin ?? d.chassis,
    color: d.color ? aTitulo(d.color) : undefined,
    combustible: normalizar(d.fuel ?? d.fuel_type, COMBUSTIBLE_POR_VALOR),
    transmision: normalizar(d.transmission, TRANSMISION_POR_VALOR),
    km,
    puertas: aEntero(d.doors),
    cilindrada: (d.engine_size ?? d.engineSize)?.toString().trim() || undefined,
    desdeCache: false,
    extendido: Boolean(
      d.vin ?? d.chassis ?? d.color ?? d.fuel ?? d.fuel_type ??
      d.transmission ?? d.doors ?? versionExplicita ?? km,
    ),
  };
}

const clave = () => process.env.BOOSTR_API_KEY;

export const proveedorBoostr: Proveedor = {
  id: "boostr",
  nombre: "Boostr",
  esReal: true,
  get patentesDisponibles() {
    return clave() ? undefined : PATENTES_DE_PRUEBA;
  },
  get advertencia() {
    return clave()
      ? undefined
      : "Sin BOOSTR_API_KEY se usa su endpoint de pruebas, que hoy responde 403 " +
        "por una regla de Cloudflare mal configurada de su lado.";
  },

  async buscar(patente: string): Promise<ResultadoPatente> {
    const k = clave();
    const url = k
      ? `${BASE}/vehicle/${patente}.json`
      : `${BASE}/vehicle/fake/${patente}.json`;

    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        headers: { Accept: "application/json", ...(k ? { "X-API-KEY": k } : {}) },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { ok: false, mensaje: "No se pudo contactar a Boostr." };
    }

    // Cloudflare responde HTML al bloquear; su aplicación siempre responde JSON.
    const tipo = respuesta.headers.get("content-type") ?? "";
    if (respuesta.status === 403 && !tipo.includes("json")) {
      return {
        ok: false,
        mensaje: k
          ? "Cloudflare bloqueó la consulta pese a la clave. Repórtalo a Boostr."
          : "Boostr bloquea su propio endpoint de pruebas (403 de Cloudflare). Hace falta una clave.",
      };
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      return { ok: false, mensaje: "Boostr rechazó la clave de API." };
    }
    if (respuesta.status === 429) {
      return { ok: false, mensaje: "Demasiadas consultas seguidas. Espera unos segundos." };
    }

    let cuerpo: RespuestaBoostr;
    try {
      cuerpo = await respuesta.json();
    } catch {
      return { ok: false, mensaje: "Boostr devolvió una respuesta ilegible." };
    }

    if (cuerpo.status !== "success" || !cuerpo.data || typeof cuerpo.data === "string") {
      return {
        ok: false,
        mensaje: MENSAJES[cuerpo.code ?? ""] ?? cuerpo.message ?? "No se encontró el vehículo.",
      };
    }
    return { ok: true, datos: mapearBoostr(cuerpo.data) };
  },
};

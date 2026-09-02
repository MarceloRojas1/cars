import type { Proveedor, ResultadoPatente } from "./tipos";
import {
  aEntero, aTitulo, CARROCERIA_POR_TIPO, COMBUSTIBLE_POR_VALOR,
  normalizar, separarModeloVersion, TRANSMISION_POR_VALOR,
} from "./normalizar";

/**
 * AutoRiesgo — https://autoriesgo.cl/api
 *
 * Su endpoint de consulta exige `X-Api-Key`; sin clave responde:
 *   {"detail":"Not allowed on this endpoint. Programmatic use: commercial API
 *    with X-Api-Key ... (credits from $5.000 CLP)"}
 *
 * El mapeo está escrito contra la forma esperada de `vehicle_data`. NO se ha
 * podido verificar con una respuesta real: al contratar la clave hay que
 * confirmar los nombres de los campos antes de confiar en este adaptador.
 */
const BASE = process.env.AUTORIESGO_BASE_URL ?? "https://api.autoriesgo.cl";

type VehicleData = Record<string, unknown>;
const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export const proveedorAutoriesgo: Proveedor = {
  id: "autoriesgo",
  nombre: "AutoRiesgo",
  esReal: true,
  get advertencia() {
    return process.env.AUTORIESGO_API_KEY
      ? "Mapeo no verificado contra una respuesta real. Revisa los campos."
      : "Falta AUTORIESGO_API_KEY. Su consulta programática requiere créditos.";
  },

  async buscar(patente: string): Promise<ResultadoPatente> {
    const k = process.env.AUTORIESGO_API_KEY;
    if (!k) {
      return { ok: false, mensaje: "Falta AUTORIESGO_API_KEY." };
    }

    let respuesta: Response;
    try {
      respuesta = await fetch(
        `${BASE}/api/v1/report/agent/lookup?patente=${encodeURIComponent(patente)}`,
        { headers: { Accept: "application/json", "X-Api-Key": k }, signal: AbortSignal.timeout(10_000) },
      );
    } catch {
      return { ok: false, mensaje: "No se pudo contactar a AutoRiesgo." };
    }

    let cuerpo: { vehicle_data?: VehicleData; detail?: string };
    try {
      cuerpo = await respuesta.json();
    } catch {
      return { ok: false, mensaje: "AutoRiesgo devolvió una respuesta ilegible." };
    }

    if (!respuesta.ok || !cuerpo.vehicle_data) {
      return { ok: false, mensaje: cuerpo.detail ?? "No se encontró el vehículo." };
    }

    const d = cuerpo.vehicle_data;
    const marca = texto(d.marca ?? d.brand ?? d.make);
    const modeloCrudo = texto(d.modelo ?? d.model);
    const versionExplicita = texto(d.version);
    const separado = marca && modeloCrudo && !versionExplicita
      ? separarModeloVersion(aTitulo(marca), modeloCrudo)
      : { modelo: modeloCrudo ? aTitulo(modeloCrudo) : undefined, version: versionExplicita };

    const km = aEntero(d.kilometraje ?? d.mileage);

    return {
      ok: true,
      datos: {
        patente,
        marca: marca ? aTitulo(marca) : undefined,
        modelo: separado.modelo,
        version: separado.version,
        anio: aEntero(d.anio ?? d.year),
        carroceria: texto(d.tipo ?? d.type)
          ? CARROCERIA_POR_TIPO[String(d.tipo ?? d.type).toUpperCase()]
          : undefined,
        motor: texto(d.numero_motor ?? d.engine),
        vin: texto(d.vin ?? d.chasis),
        color: texto(d.color) ? aTitulo(String(d.color)) : undefined,
        combustible: normalizar(texto(d.combustible ?? d.fuel), COMBUSTIBLE_POR_VALOR),
        transmision: normalizar(texto(d.transmision ?? d.transmission), TRANSMISION_POR_VALOR),
        km,
        puertas: aEntero(d.puertas ?? d.doors),
        cilindrada: texto(d.cilindrada),
        desdeCache: false,
        extendido: Boolean(d.vin ?? d.color ?? d.combustible ?? km),
      },
    };
  },
};

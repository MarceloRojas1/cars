import type { DatosPatente, Proveedor, ResultadoPatente } from "./tipos";

/**
 * Proveedor local con autos inventados. Es el modo por defecto.
 *
 * Existe para que el desarrollo y las demos no dependan de que un tercero tenga
 * bien configurado su firewall. Los datos son FICTICIOS: las patentes tienen
 * formato válido pero no corresponden a vehículos reales.
 *
 * Trae ficha completa a propósito, para poder ejercitar el mapeo del plan
 * extendido sin haberlo contratado.
 */
const AUTOS: Record<string, Omit<DatosPatente, "desdeCache" | "extendido">> = {
  JG5165: {
    patente: "JG5165", dv: "2", marca: "Toyota", modelo: "Hilux",
    version: "2.4 DX 4X4 MT", anio: 2019, carroceria: "Camioneta",
    motor: "2GD1234567", vin: "MR0FZ29G8K1234567", color: "Blanco",
    combustible: "Diésel", transmision: "Manual", km: 87450, puertas: 4,
    cilindrada: "2.4",
  },
  KFHD30: {
    patente: "KFHD30", dv: "7", marca: "Mazda", modelo: "CX-5",
    version: "2.0 R AWD AT", anio: 2022, carroceria: "SUV",
    motor: "PEV5512340", vin: "JM3KFBCM6N0512340", color: "Gris",
    combustible: "Bencina", transmision: "Automática", km: 31200, puertas: 5,
    cilindrada: "2.0",
  },
  BCYT91: {
    patente: "BCYT91", dv: "4", marca: "Jeep", modelo: "Grand Cherokee",
    version: "Limited 3.6 4x4", anio: 2021, carroceria: "SUV",
    motor: "J55512988", vin: "1C4RJFBG7MC512988", color: "Negro",
    combustible: "Bencina", transmision: "Automática", km: 54800, puertas: 5,
    cilindrada: "3.6",
  },
  UE2083: {
    patente: "UE2083", dv: "9", marca: "Suzuki", modelo: "Swift",
    version: "1.2 GL MT", anio: 2017, carroceria: "Hatchback",
    motor: "K12B889021", vin: "MMSZC72S0H0889021", color: "Rojo",
    combustible: "Bencina", transmision: "Manual", km: 112300, puertas: 5,
    cilindrada: "1.2",
  },
  AA3556: {
    patente: "AA3556", dv: "1", marca: "Volkswagen", modelo: "Amarok",
    version: "2.0 TDI Highline 4Motion", anio: 2015, carroceria: "Camioneta",
    motor: "CNF445612", vin: "WV1ZZZ2HZFA445612", color: "Plata",
    combustible: "Diésel", transmision: "Automática", km: 168900, puertas: 4,
    cilindrada: "2.0",
  },
};

export const proveedorFixtures: Proveedor = {
  id: "fixtures",
  nombre: "Datos de ejemplo",
  esReal: false,
  patentesDisponibles: Object.keys(AUTOS),
  advertencia:
    "Datos ficticios. Sirven para desarrollar y mostrar el flujo sin depender " +
    "de un proveedor externo.",

  async buscar(patente: string): Promise<ResultadoPatente> {
    const auto = AUTOS[patente];
    if (!auto) {
      return {
        ok: false,
        mensaje: `Sin datos para ${patente}. Con datos de ejemplo solo responden: ${Object.keys(AUTOS).join(", ")}.`,
      };
    }
    return { ok: true, datos: { ...auto, desdeCache: false, extendido: true } };
  },
};

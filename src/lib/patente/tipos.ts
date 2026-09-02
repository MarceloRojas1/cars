/** Contrato que cumple cualquier proveedor de datos de patente. */

export type DatosPatente = {
  patente: string;
  marca?: string;
  modelo?: string;
  version?: string;
  anio?: number;
  carroceria?: string;
  motor?: string;
  dv?: string;

  /* Solo los proveedores con plan extendido llenan estos. */
  vin?: string;
  color?: string;
  combustible?: string;
  transmision?: string;
  km?: number;
  puertas?: number;
  cilindrada?: string;

  desdeCache: boolean;
  /** true si la respuesta traía ficha técnica y no solo lo básico. */
  extendido: boolean;
};

export type ResultadoPatente =
  | { ok: true; datos: DatosPatente }
  | { ok: false; mensaje: string };

export type Proveedor = {
  /** Identificador estable: se guarda en la caché para no mezclar orígenes. */
  id: string;
  nombre: string;
  /** false para los datos de ejemplo: la interfaz lo advierte. */
  esReal: boolean;
  /** Si el proveedor solo responde a un conjunto cerrado, se muestra en pantalla. */
  patentesDisponibles?: readonly string[];
  /** Por qué no está operativo, si no lo está. */
  advertencia?: string;
  buscar(patente: string): Promise<ResultadoPatente>;
};

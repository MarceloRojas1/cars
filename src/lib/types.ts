/**
 * Modelo de dominio — derivado del análisis en docs/00-analisis-venpu.md.
 * Los nombres coinciden con las tablas de supabase/migrations/0001_init.sql.
 */

export type UserRole = "owner" | "admin" | "vendedor";
export type StageKind = "entry" | "progress" | "exit_won" | "exit_lost";
export type VehicleStatus = "disponible" | "pendiente" | "reservado" | "vendido";
export type OperationKind = "venta" | "compra" | "consignacion" | "nota_venta";
export type RoutingStrategy = "menos_ocupado" | "turno_rotativo" | "manual";
export type Temperatura = "hot" | "warm" | "cold";

/** Canales por los que entra un lead. Vistos en las capturas de /leads y /rendimiento. */
export const LEAD_SOURCES = [
  "meta_ads",
  "whatsapp",
  "mercadolibre",
  "chileautos",
  "manual",
  "web_dealer",
  "landing_ads",
  "referral",
  "social",
  "instagram",
  "phone",
  "marketplace",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Marketplaces donde se publica un vehículo. */
export const PUBLICATION_CHANNELS = ["mercadolibre", "ml_propia", "chileautos", "yapo"] as const;
export type PublicationChannel = (typeof PUBLICATION_CHANNELS)[number];

export type Organization = {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  limiteUsuarios: number;
  limiteSucursales: number;
  limiteVehiculos: number;
  limiteConversacionesIa: number;
  proximoCobro: string;
};

export type Branch = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  telefono: string;
  email: string;
  esPrincipal: boolean;
  activa: boolean;
  creadaHace: string;
};

export type AppUser = {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: UserRole;
  branchId?: string;
  activo: boolean;
  disponibilidad: "online" | "offline";
  ultimoAcceso: string;
  chatsActivos: number;
};

export type Combustible =
  | "Bencina" | "Diésel" | "Híbrido" | "Híbrido enchufable" | "Eléctrico" | "Gas (GLP/GNV)";

export type Vehicle = {
  id: string;
  codigo: string;
  titulo: string;
  marca: string;
  modelo?: string;
  version?: string;
  anio: number;
  patente?: string;
  precio: number;
  km: number;
  combustible: Combustible;
  branchId: string;
  estado: VehicleStatus;
  vendedorId?: string;
  /** Calidad de la publicación: 100 % = ficha completa. Penaliza visibilidad en portales. */
  completitudPct: number;
  /** Base del cálculo "días en salón". */
  publicadoHaceDias: number;
  canales: PublicationChannel[];

  /* --- ficha extendida (migración 0002) --- */
  /** Pie sugerido en CLP. Opcional: no todo vehículo se ofrece con financiamiento. */
  pieFinanciamiento?: number;
  transmision?: string;
  carroceria?: string;
  puertas?: number;
  colorExterior?: string;
  colorInterior?: string;
  permisoCirculacionVence?: string;
  revisionTecnicaVence?: string;
  tags: string[];
  /** 1 equivale a "único dueño". undefined = no informado. */
  cantidadDuenos?: number;
  equipamiento?: string;

  /* --- ubicación y presentación (migración 0003) --- */
  descripcion?: string;
  region?: string;
  comuna?: string;
  archivado?: boolean;
  /** URL de la foto principal. Viene resuelta en el listado. */
  fotoPrincipal?: string;
  fotos?: VehiclePhoto[];
};

export type VehiclePhoto = {
  id: string;
  url: string;
  orden: number;
  esPrincipal: boolean;
};

export type Stage = {
  id: string;
  nombre: string;
  kind: StageKind;
  color: string;
  orden: number;
  agenteIaActivo: boolean;
};

export type Lead = {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  stageId: string;
  /** NULL a propósito: un lead puede llegar sin vehículo (consignación, compra o consulta). */
  vehicleId?: string;
  vendedorId?: string;
  source: LeadSource;
  tipo?: "venta" | "consigna_compra";
  temperatura: Temperatura;
  perdido: boolean;
  mensajes: number;
  diasEnEtapa: number;
  creadoHace: string;
};

export type Client = {
  id: string;
  nombre: string;
  rut?: string;
  telefono: string;
  comuna?: string;
  operaciones: number;
};

export type Operation = {
  id: string;
  kind: OperationKind;
  vehicleId?: string;
  vehiculoTitulo: string;
  vehiculoCodigo: string;
  clientId?: string;
  vendedorId: string;
  precio: number;
  gastos: number;
  saldoPendiente: number;
  diasEnStock: number;
  fecha: string;
};

export type Campaign = {
  id: string;
  nombre: string;
  estado: "activa" | "pausada" | "borrador";
  canal: string;
  vehiculos: number;
  regiones: string[];
  presupuestoDiario: number;
  gasto: number;
  contactos?: number;
  cpl?: number;
  impresiones: number;
  alcance: number;
  clics: number;
  ctr: number;
  convWhatsapp: number;
};

export type Integration = {
  id: string;
  grupo: "comunicacion" | "asistente" | "marketplaces" | "social";
  nombre: string;
  descripcion: string;
  estado: "conectado" | "no_conectado" | "incluido";
  detalle?: string;
};

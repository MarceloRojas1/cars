/**
 * Datos semilla extraídos de las capturas en fotos/.
 * Los precios de venta de las operaciones venían tachados en las capturas:
 * esos valores son estimados y están marcados con `estimado: true`.
 */
import type {
  AppUser, Branch, Campaign, Client, Integration, Lead, Operation,
  Organization, Stage, Vehicle,
} from "@/lib/types";

export const organization: Organization = {
  id: "org_marketcar",
  nombre: "Marketcar",
  slug: "market-car",
  plan: "Pro",
  limiteUsuarios: 10,
  limiteSucursales: 3,
  limiteVehiculos: 100,
  limiteConversacionesIa: 2000,
  proximoCobro: "2026-08-04",
};

export const branches: Branch[] = [
  {
    id: "suc_001",
    codigo: "SUC-001",
    nombre: "Los Trapenses",
    direccion: "Los Trapenses 3061 L13 y L14",
    comuna: "Lo Barnechea",
    region: "Metropolitana",
    telefono: "+5695955 5576",
    email: "contacto@marketcar.cl",
    esPrincipal: true,
    activa: true,
    creadaHace: "hace 3 meses",
  },
];

export const users: AppUser[] = [
  {
    id: "usr_juan",
    nombre: "Juan José Domínguez",
    email: "juanjodominguez@marketcar.cl",
    rol: "owner",
    activo: true,
    disponibilidad: "offline",
    ultimoAcceso: "hace 8 minutos",
    chatsActivos: 2,
  },
  {
    id: "usr_martin",
    nombre: "Martin Stuckrath",
    email: "martin@marketcar.cl",
    telefono: "+56989069916",
    rol: "vendedor",
    branchId: "suc_001",
    activo: true,
    disponibilidad: "offline",
    ultimoAcceso: "hace 38 minutos",
    chatsActivos: 8,
  },
];

export const stages: Stage[] = [
  { id: "st_nuevo", nombre: "Nuevo", kind: "entry", color: "#7C8DAE", orden: 1, agenteIaActivo: true, responsable: "ia" },
  { id: "st_calificando", nombre: "Calificando", kind: "progress", color: "#C08A3E", orden: 2, agenteIaActivo: true, responsable: "ia" },
  { id: "st_calificado", nombre: "Calificado", kind: "progress", color: "#6FAF8B", orden: 3, agenteIaActivo: false, responsable: "humano" },
  { id: "st_contactado", nombre: "Contactado/Seguimiento", kind: "progress", color: "#6E9BA6", orden: 4, agenteIaActivo: false, responsable: "humano" },
  { id: "st_visita", nombre: "Visita Agendada", kind: "progress", color: "#9C8AAE", orden: 5, agenteIaActivo: false, responsable: "humano" },
  { id: "st_sin_respuesta", nombre: "Sin Respuesta", kind: "progress", color: "#A8896B", orden: 6, agenteIaActivo: true, responsable: "ia" },
  { id: "st_ganado", nombre: "Ganado", kind: "exit_won", color: "#F2F0EC", orden: 7, agenteIaActivo: false, responsable: "humano" },
  { id: "st_descartado", nombre: "Descartado", kind: "exit_lost", color: "#55555A", orden: 8, agenteIaActivo: false, responsable: "humano" },
  { id: "st_consigna", nombre: "Consigna / Compra", kind: "progress", color: "#8FA88F", orden: 9, agenteIaActivo: false, responsable: "humano" },
];

const V = (
  codigo: string, titulo: string, marca: string, anio: number, precio: number,
  kilometros: number, combustible: Vehicle["combustible"], completitudPct: number,
  publicadoHaceDias: number, canales: Vehicle["canales"] = ["mercadolibre"],
): Vehicle => ({
  id: `veh_${codigo.toLowerCase()}`,
  codigo, titulo, marca, anio, precio, km: kilometros, combustible,
  branchId: "suc_001", estado: "disponible", completitudPct, publicadoHaceDias, canales,
  tags: [],
});

export const vehicles: Vehicle[] = [
  V("COD922142", "Mercedes Benz GLA 200 1.6 AT año 2016", "Mercedes Benz", 2016, 16450000, 59000, "Bencina", 91, 12),
  V("COD922081", "Mercedes Benz E 63 AMG Año 2011", "Mercedes Benz", 2011, 45950000, 81216, "Bencina", 91, 14),
  V("COD922048", "RAM 1500 Limited año 2023", "RAM", 2023, 43950000, 59160, "Bencina", 91, 16),
  V("COD922018", "Maserati Grecale GT Mild-Hybrid 4x4 año 2024", "Maserati", 2024, 54450000, 18879, "Bencina", 100, 18),
  V("COD922014", "Peugeot 5008 Blue HDI 130 1.5 Año 2023", "Peugeot", 2023, 22250000, 38681, "Diésel", 91, 21),
  V("COD921984", "FORD Explorer XLT 4x4 año 2023", "Ford", 2023, 28950000, 71908, "Bencina", 91, 24),
  V("COD921973", "Peugeot 3008 1.6 GT Hibrido año 2023", "Peugeot", 2023, 21550000, 48903, "Híbrido", 91, 27),
  V("COD921934", "JEEP Wrangler 3.6 Unlimited Rubicon 4X4 Año 2013", "Jeep", 2013, 22950000, 94617, "Bencina", 91, 31),
  V("COD921914", "Chevrolet Corvette Stingray C3 V8 5.7 Año 1974", "Chevrolet", 1974, 27950000, 150000, "Bencina", 100, 33),
  V("COD921910", "AUDI Q3 35 TFSI Sport AT Año 2023", "Audi", 2023, 28750000, 44271, "Bencina", 91, 35),
  V("COD921820", "Chevrolet Silverado Trail Boss 5.3 LTS Año 2021", "Chevrolet", 2021, 31450000, 47739, "Bencina", 91, 38),
  V("COD921766", "FORD F 150 LARIAT BLACK 5.0 V8 2025 Facturable", "Ford", 2025, 47450000, 45000, "Bencina", 97, 42),
  V("COD921740", "CHEVROLET Silverado Diesel 3.0L 4X4 AT 2023", "Chevrolet", 2023, 51950000, 40500, "Diésel", 91, 45),
  V("COD921659", "JEEP Grand Cherokee LAREDO 3.6 4x2 2019", "Jeep", 2019, 18450000, 59000, "Bencina", 97, 52, ["mercadolibre", "ml_propia", "chileautos"]),
  V("COD921217", "MERCEDES BENZ E 350 Elegance 3.5 V6 AMG 2006", "Mercedes Benz", 2006, 8450000, 199192, "Bencina", 97, 61, ["mercadolibre", "ml_propia", "chileautos"]),
  V("COD921088", "RAM 700 1.3 SLT 4X2 CAB. SIM. MT 2P 2025", "RAM", 2025, 14950000, 12400, "Bencina", 91, 66),
  V("COD921074", "SUBARU Outback Field Edition 2.5 2024", "Subaru", 2024, 26950000, 21500, "Bencina", 91, 70),
  V("COD921002", "NISSAN Pathfinder 3.5 Exclusive 2025", "Nissan", 2025, 39950000, 15800, "Bencina", 91, 74),
  // los 5 críticos del dashboard: 112 días publicados
  V("COD920915", "BMW 530 M Sport 2024", "BMW", 2024, 52950000, 18200, "Bencina", 91, 112),
  V("COD920902", "SUBARU Outback Field Edition 2.5 2022", "Subaru", 2022, 24950000, 48300, "Bencina", 91, 112),
  V("COD920888", "VOLKSWAGEN Tiguan 2.0 TFSI Highline 2013", "Volkswagen", 2013, 8950000, 128400, "Bencina", 91, 112),
  V("COD920871", "BMW X5 M Sport 2024", "BMW", 2024, 68950000, 14900, "Bencina", 91, 112),
  V("COD920841", "AUDI E-Tron Sportback 55 Quattro 2022", "Audi", 2022, 33950000, 31200, "Eléctrico", 91, 112),
];

const L = (
  id: string, nombre: string, telefono: string, stageId: string, source: Lead["source"],
  opts: Partial<Lead> = {},
): Lead => ({
  id, nombre, telefono, stageId, source,
  temperatura: "warm", perdido: false, mensajes: 0, diasEnEtapa: 0,
  creadoHace: "hace 1 día", ...opts,
});

export const leads: Lead[] = [
  L("ld_01", "?????", "+56989131848", "st_contactado", "chileautos", { vehicleId: "veh_cod921074", creadoHace: "hace 3 horas", vendedorId: "usr_juan", mensajes: 3, temperatura: "hot" }),
  L("ld_02", "ramon sepulveda", "+56935402073", "st_consigna", "web_dealer", { email: "bruno.sepulveda.vilaza14@gmail.com", tipo: "consigna_compra", creadoHace: "hace 3 horas" }),
  L("ld_03", "Soledad / Marido Moises Nissan", "56982496371", "st_contactado", "whatsapp", { vehicleId: "veh_cod921002", creadoHace: "hace 6 horas", vendedorId: "usr_martin", mensajes: 22 }),
  L("ld_04", "Tomás", "56983725181", "st_descartado", "meta_ads", { creadoHace: "hace 7 horas", perdido: true }),
  L("ld_05", "Verito", "56996227555", "st_sin_respuesta", "meta_ads", { vehicleId: "veh_cod921088", creadoHace: "hace 7 horas", vendedorId: "usr_martin", mensajes: 5, diasEnEtapa: 1 }),
  L("ld_06", "CR", "56966880703", "st_descartado", "meta_ads", { creadoHace: "hace 8 horas", perdido: true }),
  L("ld_07", "Alejandro Avilos", "+56966122846", "st_consigna", "referral", { tipo: "consigna_compra", creadoHace: "hace 9 horas" }),
  L("ld_08", "Cristian", "+56933702133", "st_consigna", "instagram", { tipo: "consigna_compra", creadoHace: "hace 9 horas" }),
  L("ld_09", "Hector Sepúlveda", "56951975195", "st_descartado", "whatsapp", { vehicleId: "veh_cod922142", creadoHace: "hace 9 horas", perdido: true }),
  L("ld_10", "Alfredo", "56997908088", "st_contactado", "meta_ads", { vehicleId: "veh_cod921659", creadoHace: "hace 10 horas", vendedorId: "usr_martin", mensajes: 19, temperatura: "hot", diasEnEtapa: 1 }),
  L("ld_11", "????", "+56938779046", "st_descartado", "chileautos", { vehicleId: "veh_cod921934", creadoHace: "hace 11 horas", perdido: true }),
  L("ld_12", "Andres", "56965996386", "st_contactado", "meta_ads", { vehicleId: "veh_cod922142", creadoHace: "hace 11 horas", vendedorId: "usr_martin", mensajes: 30 }),
  L("ld_13", "Juan", "+56971353509", "st_descartado", "marketplace", { vehicleId: "veh_cod920841", creadoHace: "hace 12 horas", perdido: true }),
  L("ld_14", "Marlly Lopez", "56987432541", "st_contactado", "meta_ads", { vehicleId: "veh_cod921934", vendedorId: "usr_martin", mensajes: 6, diasEnEtapa: 1, temperatura: "hot" }),
  L("ld_15", "Joaquín Ampuero", "56961715027", "st_contactado", "whatsapp", { vehicleId: "veh_cod920902", vendedorId: "usr_martin", mensajes: 12, diasEnEtapa: 4, temperatura: "hot" }),
  L("ld_16", "mauricio", "56952368363", "st_contactado", "whatsapp", { vehicleId: "veh_cod921659", vendedorId: "usr_martin", mensajes: 21, diasEnEtapa: 1, temperatura: "hot" }),
  L("ld_17", "servicio electricos TDP", "56975889248", "st_contactado", "meta_ads", { vehicleId: "veh_cod921074", vendedorId: "usr_juan", mensajes: 4, diasEnEtapa: 7, perdido: true, temperatura: "hot" }),
  L("ld_18", "Jorge T", "56993828925", "st_contactado", "meta_ads", { vehicleId: "veh_cod921934", vendedorId: "usr_martin", mensajes: 3, diasEnEtapa: 2 }),
  L("ld_19", "Alvaro", "+56989061720", "st_visita", "chileautos", { vehicleId: "veh_cod922142", vendedorId: "usr_martin", diasEnEtapa: 1 }),
  L("ld_20", "ProEventoschile Producciones", "56981883959", "st_visita", "meta_ads", { vehicleId: "veh_cod921973", vendedorId: "usr_martin", mensajes: 5, diasEnEtapa: 4, perdido: true }),
  L("ld_21", "Cristian Ahumada S.", "56998298221", "st_visita", "whatsapp", { vehicleId: "veh_cod921973", vendedorId: "usr_martin", mensajes: 14, diasEnEtapa: 10 }),
  L("ld_22", "Matias", "56956477630", "st_sin_respuesta", "meta_ads", { vehicleId: "veh_cod921934", vendedorId: "usr_martin", mensajes: 7, diasEnEtapa: 1 }),
  L("ld_23", "Gustavo", "56958631124", "st_sin_respuesta", "meta_ads", { vehicleId: "veh_cod922142", vendedorId: "usr_martin", mensajes: 4, diasEnEtapa: 1 }),
  L("ld_24", "Marco Montiel", "56994482829", "st_sin_respuesta", "meta_ads", { vehicleId: "veh_cod921934", vendedorId: "usr_martin", mensajes: 6, diasEnEtapa: 2 }),
  L("ld_25", "Claudio", "56964458244", "st_sin_respuesta", "whatsapp", { vehicleId: "veh_cod921934", vendedorId: "usr_martin", mensajes: 13, diasEnEtapa: 2 }),
  L("ld_26", "JEANNETTE", "56982393012", "st_sin_respuesta", "meta_ads", { vehicleId: "veh_cod922142", vendedorId: "usr_martin", mensajes: 3, diasEnEtapa: 1 }),
  L("ld_27", "Sahil", "+56956654167", "st_sin_respuesta", "web_dealer", { tipo: "consigna_compra", vendedorId: "usr_martin", diasEnEtapa: 1 }),
  L("ld_28", "Cristian Riveros", "+56985270983", "st_ganado", "whatsapp", { vehicleId: "veh_cod921820", vendedorId: "usr_juan", mensajes: 116, diasEnEtapa: 55 }),
  L("ld_29", "David Bolaños", "+56978450002", "st_ganado", "chileautos", { vehicleId: "veh_cod922142", vendedorId: "usr_juan", diasEnEtapa: 12 }),
  L("ld_30", "Pato", "56940016059", "st_ganado", "whatsapp", { vehicleId: "veh_cod921910", vendedorId: "usr_martin", mensajes: 107, diasEnEtapa: 44 }),
  L("ld_31", "Consuelo Astorquiza", "56992337174", "st_ganado", "whatsapp", { vendedorId: "usr_juan", mensajes: 66, diasEnEtapa: 10 }),
  L("ld_32", "Gladis Peña", "+56992796298", "st_ganado", "chileautos", { vendedorId: "usr_martin", mensajes: 56, diasEnEtapa: 24 }),
  L("ld_33", ".", "56977207233", "st_calificando", "mercadolibre", { vehicleId: "veh_cod921984", vendedorId: "usr_juan", mensajes: 15, diasEnEtapa: 7, perdido: true, temperatura: "hot" }),
];

export const clients: Client[] = [
  { id: "cl_01", nombre: "Alberto Javier Cortez Romero", rut: "13.643.414-4", telefono: "+56999970506", comuna: "Antofagasta", operaciones: 1 },
  { id: "cl_02", nombre: "Camila Mac-Donald Vicuna", rut: "18.934.592-5", telefono: "56997880793", operaciones: 1 },
  { id: "cl_03", nombre: "Juan Jose Valenzuela", telefono: "+56992609373", operaciones: 1 },
  { id: "cl_04", nombre: "Kaufmann", rut: "1-9", telefono: "+56987740366", comuna: "Lo Barnechea", operaciones: 1 },
  { id: "cl_05", nombre: "Miguel Khaliliyeh", rut: "6.595.276-9", telefono: "+56987740366", comuna: "Lo Barnechea", operaciones: 1 },
  { id: "cl_06", nombre: "Sebastian Raul Orellana Jimenez", rut: "17.670.938-3", telefono: "56961913323", comuna: "Santiago", operaciones: 1 },
];

/** Precios estimados: venían tachados en las capturas de Control de Ventas. */
export const operations: Operation[] = [
  { id: "op_01", kind: "venta", vehiculoTitulo: "Mercedes Benz GLB 200", vehiculoCodigo: "COD921935", vendedorId: "usr_juan", precio: 27950000, gastos: 0, saldoPendiente: 0, diasEnStock: 37, fecha: "2026-08-31" },
  { id: "op_02", kind: "venta", vehiculoTitulo: "AUDI Q3 Sportback", vehiculoCodigo: "COD921513", vendedorId: "usr_martin", precio: 24950000, gastos: 0, saldoPendiente: 0, diasEnStock: 65, fecha: "2026-08-29" },
  { id: "op_03", kind: "venta", vehiculoTitulo: "Porsche Macan", vehiculoCodigo: "COD922102", vendedorId: "usr_martin", precio: 32000000, gastos: 0, saldoPendiente: 0, diasEnStock: 12, fecha: "2026-08-26" },
  { id: "op_04", kind: "venta", vehiculoTitulo: "Mercedes Benz GLC 43", vehiculoCodigo: "COD922067", vendedorId: "usr_juan", precio: 34500000, gastos: 0, saldoPendiente: 0, diasEnStock: 11, fecha: "2026-08-22" },
  { id: "op_05", kind: "venta", vehiculoTitulo: "BMW 118i LCI", vehiculoCodigo: "COD922167", vendedorId: "usr_juan", precio: 15500000, gastos: 0, saldoPendiente: 0, diasEnStock: 0, fecha: "2026-08-21" },
  { id: "op_06", kind: "venta", vehiculoTitulo: "BMW 118i LCI", vehiculoCodigo: "COD922167", vendedorId: "usr_juan", precio: 15500000, gastos: 0, saldoPendiente: 0, diasEnStock: 0, fecha: "2026-08-21" },
  { id: "op_07", kind: "venta", vehiculoTitulo: "VOLKSWAGEN Nivus Highline", vehiculoCodigo: "COD921521", vendedorId: "usr_martin", precio: 16900000, gastos: 0, saldoPendiente: 0, diasEnStock: 54, fecha: "2026-08-19" },
  { id: "op_08", kind: "venta", vehiculoTitulo: "MERCEDES BENZ GLC 43", vehiculoCodigo: "COD921263", vendedorId: "usr_juan", precio: 38950000, gastos: 0, saldoPendiente: 0, diasEnStock: 73, fecha: "2026-08-15" },
  { id: "op_09", kind: "venta", vehiculoTitulo: "KIA Sonet", vehiculoCodigo: "COD921671", vendedorId: "usr_juan", precio: 12450000, gastos: 0, saldoPendiente: 0, diasEnStock: 46, fecha: "2026-08-15" },
  { id: "op_10", kind: "venta", vehiculoTitulo: "Subaru XV", vehiculoCodigo: "COD922069", vendedorId: "usr_juan", precio: 18900000, gastos: 0, saldoPendiente: 0, diasEnStock: 2, fecha: "2026-08-13" },
  { id: "op_11", kind: "venta", vehiculoTitulo: "VOLVO XC40", vehiculoCodigo: "COD921455", vendedorId: "usr_martin", precio: 26500000, gastos: 0, saldoPendiente: 0, diasEnStock: 91, fecha: "2026-08-11" },
  { id: "op_12", kind: "venta", vehiculoTitulo: "Porsche 911 5.0 GT Cabrio", vehiculoCodigo: "COD922017", vendedorId: "usr_juan", precio: 47900000, gastos: 0, saldoPendiente: 0, diasEnStock: 1, fecha: "2026-08-05" },
  { id: "op_13", kind: "venta", vehiculoTitulo: "CHEVROLET Captiva Premier", vehiculoCodigo: "COD920832", vendedorId: "usr_juan", precio: 14200000, gastos: 0, saldoPendiente: 0, diasEnStock: 81, fecha: "2026-08-01" },
  { id: "op_14", kind: "venta", vehiculoTitulo: "CHEVROLET Captiva Premier", vehiculoCodigo: "COD920832", vendedorId: "usr_martin", precio: 14200000, gastos: 0, saldoPendiente: 0, diasEnStock: 81, fecha: "2026-08-01" },
];

export const campaigns: Campaign[] = [
  { id: "cmp_01", nombre: "CTWA · Peugeot 5008 Blue HDI 130 1.5 Año 2023, PE…", estado: "activa", canal: "WhatsApp", vehiculos: 7, regiones: ["Metropolitana", "O'Higgins"], presupuestoDiario: 6000, gasto: 30126, impresiones: 10476, alcance: 5637, clics: 358, ctr: 3.42, convWhatsapp: 38 },
  { id: "cmp_02", nombre: "CTWA · RAM 700 1.3 SLT 4X2 CAB. SIM. MT 2P 2025, …", estado: "activa", canal: "WhatsApp", vehiculos: 6, regiones: ["Vitacura", "Las Condes", "+3"], presupuestoDiario: 6000, gasto: 31767, impresiones: 11463, alcance: 5296, clics: 256, ctr: 2.23, convWhatsapp: 5 },
  { id: "cmp_03", nombre: "CTWA · Maserati Grecale GT Mild-Hybrid 4x4 año 202…", estado: "activa", canal: "WhatsApp", vehiculos: 10, regiones: ["Vitacura", "Las Condes", "+2"], presupuestoDiario: 8000, gasto: 41809, impresiones: 8614, alcance: 4232, clics: 318, ctr: 3.69, convWhatsapp: 7 },
];

export const integrations: Integration[] = [
  { id: "int_meta", grupo: "comunicacion", nombre: "Meta Business", descripcion: "Messenger, Instagram y Lead Ads", estado: "conectado", detalle: "Marketcar · Messenger · Instagram" },
  { id: "int_wa", grupo: "comunicacion", nombre: "WhatsApp", descripcion: "Atiende a tus clientes por WhatsApp con tu propio número", estado: "conectado", detalle: "+56 9 •••• ••••" },
  { id: "int_claude", grupo: "asistente", nombre: "Claude", descripcion: "Pregúntale a tus datos en lenguaje natural", estado: "incluido" },
  { id: "int_ml", grupo: "marketplaces", nombre: "MercadoLibre", descripcion: "Tus vehículos se publican en la cuenta de la plataforma", estado: "incluido" },
  { id: "int_ml_own", grupo: "marketplaces", nombre: "MercadoLibre cuenta propia", descripcion: "Publica con tu propia cuenta, en paralelo", estado: "no_conectado" },
  { id: "int_yapo", grupo: "marketplaces", nombre: "Yapo.cl", descripcion: "Marketplace de vehículos de Yapo", estado: "no_conectado" },
  { id: "int_ca", grupo: "marketplaces", nombre: "Chile Autos", descripcion: "Publica tu inventario y recibe leads automáticamente", estado: "no_conectado" },
  { id: "int_zernio", grupo: "social", nombre: "Zernio", descripcion: "Conecta Facebook e Instagram para publicar y hacer campañas", estado: "no_conectado" },
];

/** Métricas del mes que en el producto real son agregaciones (ver docs, sección 4). */
export const metricas = {
  leadsTotales: 640,
  leadsSinAsignar: 50,
  diasStockPromedio: 77,
  vendidos30d: 13,
  metaMensual: 12,
  ventasMes: 0,
  rapidezMedianaSeg: 7,
  notasConSaldo: { cantidad: 34, total: 147950000 },
  leadsHotSinAtender: 390,
  autosSinMovimiento: 21,
  conversacionesIaUsadas: 914,
};

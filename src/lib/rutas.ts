/**
 * Qué caminos son del panel y cuáles del catálogo público.
 *
 * Vive suelto, sin importar nada, porque lo consumen dos mundos que no pueden
 * compartir código pesado: `data/catalogo.ts` (Node, con `pg`) y `proxy.ts`,
 * que corre antes de renderizar y no puede arrastrar el cliente de Postgres.
 *
 * Es una sola lista para un solo hecho: `/{slug}` es el catálogo de una
 * automotora, así que ninguna automotora puede llamarse como una sección del
 * panel — y el proxy tiene que saber exactamente cuáles pedir sesión.
 */
export const RUTAS_DEL_PANEL = [
  "dashboard",
  "vehiculos",
  "leads",
  "embudo",
  "clientes",
  "campanas",
  "equipo",
  "sucursales",
  "estudio",
  "integraciones",
  "mi-plan",
  "rendimiento",
  "recordatorios",
  "consultar-patente",
  "control-de-ventas",
  "mi-sitio-web",
  "asistente-ia",
  "automatizacion",
  "asignacion-de-leads",
] as const;

/**
 * Además del panel, hay nombres que una automotora tampoco puede tomar porque
 * chocarían con rutas de infraestructura.
 */
export const SLUGS_RESERVADOS = new Set<string>([
  ...RUTAS_DEL_PANEL,
  "api",
  "login",
  "admin",
  "_next",
]);

/** ¿Este camino pertenece al panel y por lo tanto exige sesión? */
export function esRutaDelPanel(pathname: string) {
  const primero = pathname.split("/")[1] ?? "";
  return (RUTAS_DEL_PANEL as readonly string[]).includes(primero);
}

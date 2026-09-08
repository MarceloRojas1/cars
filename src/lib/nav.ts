import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, Car, ScanSearch, Receipt, Contact, Users, Filter, Bell,
  Megaphone, BarChart3, Sparkles, CreditCard, Building2, UserCog,
  Globe, Bot, Workflow, Share2, Plug,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aún no construida: la ruta existe pero muestra el estado "pendiente". */
  pendiente?: boolean;
};

export type NavGroup = { label?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    label: "Gestión",
    items: [
      { href: "/vehiculos", label: "Vehículos", icon: Car },
      { href: "/consultar-patente", label: "Consultar patente", icon: ScanSearch },
      { href: "/control-de-ventas", label: "Control de Ventas", icon: Receipt },
      { href: "/clientes", label: "Clientes", icon: Contact },
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/embudo", label: "Embudo", icon: Filter },
      { href: "/recordatorios", label: "Recordatorios", icon: Bell, pendiente: true },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/campanas", label: "Campañas", icon: Megaphone },
      { href: "/rendimiento", label: "Rendimiento", icon: BarChart3, pendiente: true },
      { href: "/estudio", label: "Estudio IA", icon: Sparkles },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/mi-plan", label: "Mi Plan", icon: CreditCard },
      { href: "/sucursales", label: "Sucursales", icon: Building2 },
      { href: "/equipo", label: "Equipo", icon: UserCog },
      { href: "/mi-sitio-web", label: "Mi sitio web", icon: Globe, pendiente: true },
      { href: "/asistente-ia", label: "Asistente IA", icon: Bot, pendiente: true },
      { href: "/automatizacion", label: "Automatización", icon: Workflow },
      { href: "/asignacion-de-leads", label: "Asignación de leads", icon: Share2, pendiente: true },
      { href: "/integraciones", label: "Integraciones", icon: Plug },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);

/**
 * Reparto para la barra superior.
 *
 * Diecinueve destinos no caben en una fila, y ponerlos todos tampoco ayudaría:
 * el trabajo del día ocurre en seis. El resto se ordena por para qué se entra —
 * consultar algo puntual, o configurar la cuenta— y vive en dos menús. Las URL
 * no cambian; esto solo decide qué se ve sin abrir nada.
 */
const buscar = (href: string) => ALL_NAV_ITEMS.find((i) => i.href === href)!;

/** El trabajo de todos los días. */
export const NAV_PRINCIPAL: NavItem[] = [
  "/dashboard", "/vehiculos", "/leads", "/embudo", "/control-de-ventas", "/estudio",
].map(buscar);

/** Se entra a buscar algo concreto y se sale. */
export const NAV_HERRAMIENTAS: NavItem[] = [
  "/consultar-patente", "/clientes", "/recordatorios", "/campanas", "/rendimiento",
].map(buscar);

/** Se toca una vez y no se vuelve en semanas. */
export const NAV_CUENTA: NavItem[] = [
  "/mi-plan", "/sucursales", "/equipo", "/mi-sitio-web",
  "/asistente-ia", "/automatizacion", "/asignacion-de-leads", "/integraciones",
].map(buscar);

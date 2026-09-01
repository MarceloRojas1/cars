/**
 * Capa de acceso a datos.
 *
 * Hoy devuelve los datos semilla de seed.ts. Todas las funciones son async a
 * propósito: cuando conectemos Supabase, cada cuerpo se reemplaza por su query
 * y ninguna pantalla cambia.
 *
 *   export async function getVehicles() {
 *     const supabase = await createClient();
 *     const { data } = await supabase.from("vehicle").select("*").order("publicado_at");
 *     return data ?? [];
 *   }
 */
import * as seed from "./seed";
import type { Lead, Stage, Vehicle } from "@/lib/types";

export async function getOrganization() {
  return seed.organization;
}
export async function getBranches() {
  return seed.branches;
}
export async function getUsers() {
  return seed.users;
}
export async function getCurrentUser() {
  return seed.users[0];
}
export async function getVehicles() {
  return seed.vehicles;
}
export async function getStages() {
  return [...seed.stages].sort((a, b) => a.orden - b.orden);
}
export async function getLeads() {
  return seed.leads;
}
export async function getClients() {
  return seed.clients;
}
export async function getOperations() {
  return seed.operations;
}
export async function getCampaigns() {
  return seed.campaigns;
}
export async function getIntegrations() {
  return seed.integrations;
}
export async function getMetricas() {
  return seed.metricas;
}

/* --- derivados: en producción son vistas agregadas, no columnas --- */

export function vehiculoDe(vehicles: Vehicle[], id?: string) {
  return id ? vehicles.find((v) => v.id === id) : undefined;
}

export function agruparPorEtapa(leads: Lead[], stages: Stage[]) {
  return stages.map((stage) => ({
    stage,
    leads: leads.filter((l) => l.stageId === stage.id),
  }));
}

export async function getResumenDashboard() {
  const [vehicles, leads, operations, metricas] = await Promise.all([
    getVehicles(), getLeads(), getOperations(), getMetricas(),
  ]);

  const disponibles = vehicles.filter((v) => v.estado === "disponible");
  const enSalon = disponibles.filter((v) => v.publicadoHaceDias > 30);
  const criticos = disponibles.filter((v) => v.publicadoHaceDias > 60);
  const incompletas = disponibles.filter((v) => v.completitudPct < 100);

  return {
    stockDisponible: disponibles.length,
    ventasMes: metricas.ventasMes,
    leadsMes: 0,
    utilidadMes: operations.reduce((acc, o) => acc + (o.precio - o.gastos) * 0, 0),
    hotSinAtender: metricas.leadsHotSinAtender,
    sinMovimiento: metricas.autosSinMovimiento,
    notasConSaldo: metricas.notasConSaldo,
    enSalon,
    criticos: criticos.length,
    incompletas: incompletas.length,
    leadsPerdidosViejos: leads.filter((l) => l.perdido).length,
    publicados: disponibles.length,
  };
}

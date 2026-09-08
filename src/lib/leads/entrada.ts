import { consultar, enTransaccion } from "@/lib/db";
import { orgActual } from "@/lib/auth/sesion";
import { elegirVendedor } from "./routing";

/**
 * Punto de entrada único para leads que llegan de afuera.
 *
 * WhatsApp, Meta, Zernio, MercadoLibre y ChileAutos mandan payloads distintos,
 * pero el resultado es siempre el mismo: un lead en la etapa de entrada. Cada
 * canal traduce su payload a `LeadEntrante` y llama acá; toda la lógica de
 * deduplicación, asignación y bitácora vive en un solo lugar.
 */
export type LeadEntrante = {
  /** Canal de origen: whatsapp, meta_ads, instagram, mercadolibre, … */
  source: string;
  /**
   * Id del evento en el canal. ES LA CLAVE DE IDEMPOTENCIA: WhatsApp y Meta
   * reentregan el mismo evento y sin esto se crearían leads duplicados.
   */
  externalId?: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  /** Código del vehículo consultado, si el canal lo informa. */
  vehiculoCodigo?: string;
  tipo?: "venta" | "consigna_compra";
  /** Payload original, para depurar cuando un canal cambie su formato. */
  payload?: unknown;
};

export type ResultadoEntrada =
  | { estado: "creado"; leadId: string; vendedorId?: string }
  | { estado: "duplicado"; leadId: string }
  | { estado: "rechazado"; motivo: string };

export async function registrarLeadEntrante(
  entrada: LeadEntrante,
): Promise<ResultadoEntrada> {
  if (!entrada.telefono && !entrada.email && !entrada.externalId) {
    return { estado: "rechazado", motivo: "Sin teléfono, correo ni id de origen." };
  }

  // 1. Idempotencia: si ya se procesó este evento, no se crea otro lead.
  if (entrada.externalId) {
    const previos = await consultar<{ id: string }>(
      (await orgActual()),
      `select id from lead
        where organization_id = $1 and source = $2 and external_id = $3`,
      [(await orgActual()), entrada.source, entrada.externalId],
    );
    if (previos[0]) return { estado: "duplicado", leadId: previos[0].id };
  }

  // 2. Etapa de entrada del embudo de esta organización.
  const etapas = await consultar<{ id: string; responsable: string }>(
    (await orgActual()),
    `select id, responsable from stage
      where organization_id = $1 and kind = 'entry' order by orden limit 1`,
    [(await orgActual())],
  );
  if (!etapas[0]) return { estado: "rechazado", motivo: "El embudo no tiene etapa de entrada." };
  const etapa = etapas[0];

  // 3. Vehículo consultado, si viene identificado.
  let vehicleId: string | undefined;
  let branchId: string | undefined;
  if (entrada.vehiculoCodigo) {
    const v = await consultar<{ id: string; branch_id: string | null }>(
      (await orgActual()),
      `select id, branch_id from vehicle where organization_id = $1 and codigo = $2`,
      [(await orgActual()), entrada.vehiculoCodigo],
    );
    vehicleId = v[0]?.id;
    branchId = v[0]?.branch_id ?? undefined;
  }

  /*
   * 4. Asignación.
   *    Si la etapa de entrada la conduce el bot, el lead NO se asigna todavía:
   *    el vendedor entra en el traspaso. Asignar antes ensuciaría la métrica de
   *    rapidez de contacto, que mide desde que el humano se hace cargo.
   */
  const vendedorId =
    etapa.responsable === "humano"
      ? await elegirVendedor({ source: entrada.source, tipo: entrada.tipo, branchId })
      : undefined;

  return enTransaccion((await orgActual()), async (cliente) => {
    const { rows } = await cliente.query<{ id: string }>(
      `insert into lead (organization_id, stage_id, vehicle_id, vendedor_id,
         nombre, telefono, email, source, tipo, temperatura, external_id, canal_payload)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'warm',$10,$11)
       returning id`,
      [
        (await orgActual()), etapa.id, vehicleId ?? null, vendedorId ?? null,
        entrada.nombre ?? null, entrada.telefono ?? null, entrada.email ?? null,
        entrada.source, entrada.tipo ?? null, entrada.externalId ?? null,
        entrada.payload ? JSON.stringify(entrada.payload) : null,
      ],
    );
    const leadId = rows[0].id;

    await cliente.query(
      `insert into lead_activity (lead_id, tipo, to_stage_id, payload)
       values ($1, 'ingreso', $2, $3)`,
      [leadId, etapa.id, JSON.stringify({ source: entrada.source })],
    );

    return { estado: "creado" as const, leadId, vendedorId };
  });
}

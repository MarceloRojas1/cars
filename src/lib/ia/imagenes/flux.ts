import type { PedidoImagen, ProveedorImagen, ResultadoImagen } from "./tipos";

/**
 * FLUX — Black Forest Labs. https://docs.bfl.ml
 *
 *   POST https://api.bfl.ai/v1/flux-2-pro-preview   cabecera `x-key`
 *   → { id, polling_url }
 *   GET  polling_url  hasta status "Ready" → result.sample es una URL firmada
 *
 * La API es asíncrona: devuelve un identificador y hay que consultar el
 * resultado. La URL del resultado EXPIRA, así que se descarga de inmediato y se
 * guarda en nuestro almacenamiento; nunca se referencia directo desde la app.
 *
 * FLUX no admite prompts negativos — su propia documentación desaconseja la
 * negación. Lo que no se quiere en la imagen se resuelve describiendo en
 * positivo lo que sí se quiere.
 */
const BASE = process.env.BFL_BASE_URL ?? "https://api.bfl.ai";
const ENDPOINT = process.env.BFL_MODELO ?? "flux-2-pro-preview";
const ESPERA_MAX_MS = 120_000;

type RespuestaPedido = { id?: string; polling_url?: string; detail?: unknown };
type RespuestaSondeo = {
  status: "Ready" | "Pending" | "Request Moderated" | "Content Moderated" | "Error" | "Failed" | string;
  result?: { sample?: string };
  details?: unknown;
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const proveedorFlux: ProveedorImagen = {
  id: "flux",
  nombre: "FLUX (Black Forest Labs)",
  modelo: ENDPOINT,
  envClave: "BFL_API_KEY",
  reproducible: true,

  async generar(pedido: PedidoImagen, apiKey: string): Promise<ResultadoImagen> {
    const cabeceras = {
      accept: "application/json",
      "Content-Type": "application/json",
      "x-key": apiKey,
    };

    let pedidoCreado: RespuestaPedido;
    try {
      const res = await fetch(`${BASE}/v1/${ENDPOINT}`, {
        method: "POST",
        headers: cabeceras,
        body: JSON.stringify({
          prompt: pedido.prompt,
          width: pedido.ancho,
          height: pedido.alto,
          ...(pedido.semilla !== undefined ? { seed: pedido.semilla } : {}),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, mensaje: "FLUX rechazó la clave de API." };
      }
      if (res.status === 402) {
        return { ok: false, mensaje: "La cuenta de FLUX no tiene créditos." };
      }
      if (res.status === 429) {
        return { ok: false, mensaje: "Demasiadas solicitudes seguidas a FLUX." };
      }
      pedidoCreado = await res.json();
      if (!res.ok || !pedidoCreado.polling_url) {
        return { ok: false, mensaje: `FLUX respondió ${res.status}: ${JSON.stringify(pedidoCreado.detail ?? pedidoCreado)}` };
      }
    } catch {
      return { ok: false, mensaje: "No se pudo contactar a FLUX." };
    }

    // Sondeo hasta que esté lista
    const limite = Date.now() + ESPERA_MAX_MS;
    let muestra: string | undefined;
    while (Date.now() < limite) {
      await dormir(1200);
      let estado: RespuestaSondeo;
      try {
        const res = await fetch(
          `${pedidoCreado.polling_url}${pedidoCreado.polling_url!.includes("?") ? "&" : "?"}id=${pedidoCreado.id}`,
          { headers: { accept: "application/json", "x-key": apiKey }, signal: AbortSignal.timeout(20_000) },
        );
        estado = await res.json();
      } catch {
        continue; // un fallo puntual de red no debe abortar la generación
      }

      if (estado.status === "Ready") {
        muestra = estado.result?.sample;
        break;
      }
      if (estado.status !== "Pending") {
        // Incluye los estados de moderación, que conviene distinguir de un error.
        return {
          ok: false,
          mensaje: estado.status.includes("Moderated")
            ? `FLUX moderó la solicitud (${estado.status}). Reformula el prompt.`
            : `FLUX falló: ${estado.status}`,
        };
      }
    }

    if (!muestra) return { ok: false, mensaje: "FLUX no entregó la imagen a tiempo." };

    // La URL del resultado expira: se descarga ahora y se guarda como nuestra.
    try {
      const img = await fetch(muestra, { signal: AbortSignal.timeout(60_000) });
      if (!img.ok) return { ok: false, mensaje: "No se pudo descargar la imagen generada." };
      return {
        ok: true,
        datos: Buffer.from(await img.arrayBuffer()),
        tipo: img.headers.get("content-type") ?? "image/png",
        modelo: ENDPOINT,
        semilla: pedido.semilla,
      };
    } catch {
      return { ok: false, mensaje: "La descarga de la imagen generada falló." };
    }
  },
};

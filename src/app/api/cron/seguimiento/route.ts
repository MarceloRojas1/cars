import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { seguimientoDeTodas } from "@/lib/leads/seguimiento";

/**
 * El reloj del bot: una vez al día revisa quién dejó de contestar.
 *
 * Lo llama el cron de Vercel (ver `vercel.json`). No hay sesión ni persona
 * detrás, así que la organización NO sale de una cookie: esto recorre todas las
 * automotoras y fija la de cada una con `comoOrganizacion()`, igual que el
 * webhook de WhatsApp.
 *
 * `maxDuration` alto porque manda mensajes de a uno: con varias automotoras y
 * muchos leads dormidos, esto no termina en los 10 s por defecto.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Quién puede dispararlo.
 *
 * Esta ruta no es del panel, así que `proxy.ts` la deja pasar — igual que
 * `/api/fotos`, que ya se había quedado abierta una vez. Y no puede pedir
 * sesión, porque quien llama es la infraestructura de Vercel.
 *
 * Vercel manda `Authorization: Bearer $CRON_SECRET` en cada ejecución si esa
 * variable existe. Sin ella configurada, en producción se rechaza todo: es
 * preferible que el seguimiento no corra a que cualquiera en internet pueda
 * gatillar mensajes de WhatsApp a los clientes de una automotora.
 */
function autorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return process.env.NODE_ENV !== "production";

  const recibido = request.headers.get("authorization") ?? "";
  const esperado = `Bearer ${secreto}`;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const inicio = Date.now();
  try {
    const resultados = await seguimientoDeTodas();
    const total = resultados.reduce(
      (a, r) => ({
        revisados: a.revisados + r.revisados,
        contactados: a.contactados + r.contactados,
        fallidos: a.fallidos + r.fallidos,
      }),
      { revisados: 0, contactados: 0, fallidos: 0 },
    );

    // Al registro, que es donde se mira cuando alguien pregunta por qué el bot
    // le escribió a un cliente.
    console.info("[cron/seguimiento]", JSON.stringify({ ...total, ms: Date.now() - inicio }));

    return NextResponse.json({ ok: true, ...total, organizaciones: resultados });
  } catch (e) {
    console.error("[cron/seguimiento] falló", e);
    return NextResponse.json({ error: "Falló el seguimiento." }, { status: 500 });
  }
}

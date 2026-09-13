import { consultar, enTransaccion, dbConfigurada } from "@/lib/db";
import { comoOrganizacion } from "@/lib/auth/sesion";
import { getAssistantConfig, getOrganization, moverLead, registrarMensajeWhatsapp } from "@/lib/data";
import { enviarTextoWhatsapp } from "@/lib/whatsapp/cliente";

/**
 * El bot reintenta una vez con quien dejó de contestar.
 *
 * Es el caso más común y el que el bot no podía ver: la gente rara vez dice
 * "no me interesa", simplemente deja de responder. Ese lead se quedaba en
 * "Nuevo" pareciendo vivo, y el embudo se iba llenando de conversaciones
 * muertas que nadie distingue de las reales.
 *
 * No se puede detectar dentro de una conversación —el disparador es que NO
 * llegue un mensaje— así que esto lo llama un trabajo periódico.
 *
 * UNA sola vez por lead, y eso es lo importante: `lead.seguimiento_at` marca
 * que ya se hizo. Sin esa marca, esto le escribiría cada día al mismo silencio,
 * que es la forma más rápida de que a una automotora la bloqueen en WhatsApp.
 */

export type ResultadoSeguimiento = {
  organizacion: string;
  revisados: number;
  contactados: number;
  fallidos: number;
};

type LeadDormido = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  vehiculo: string | null;
};

/**
 * El mensaje del reintento.
 *
 * Plantilla y no el modelo: es un empujón de una línea, y hacer una llamada de
 * IA por cada lead dormido cuesta dinero y latencia para redactar siempre lo
 * mismo. Cuando la persona conteste, ahí sí vuelve a entrar el modelo con todo
 * el historial — la etapa de seguimiento lleva `responsable = ia`.
 */
function mensajeDeSeguimiento(lead: LeadDormido, automotora: string, agente: string) {
  const nombre = lead.nombre?.trim().split(/\s+/)[0];
  const saludo = nombre ? `Hola ${nombre}` : "Hola";
  const auto = lead.vehiculo ? ` por el ${lead.vehiculo}` : "";
  return (
    `${saludo}, soy ${agente} de ${automotora}. Te escribí hace unos días${auto} ` +
    "y quedamos ahí. ¿Sigues buscando? Si ya resolviste, avísame y no te molesto más."
  );
}

/**
 * Corre el seguimiento de UNA automotora. La organización se fija con
 * `comoOrganizacion()` porque acá no hay sesión: quien llama es un cron.
 */
export async function seguimientoDeOrganizacion(
  orgId: string,
): Promise<ResultadoSeguimiento> {
  return comoOrganizacion(orgId, async () => {
    const [config, organizacion] = await Promise.all([getAssistantConfig(), getOrganization()]);
    const dias = config.diasSinRespuesta;

    // 0 lo desactiva: una automotora puede no querer que el bot insista.
    if (!dias || dias <= 0) {
      return { organizacion: organizacion.nombre, revisados: 0, contactados: 0, fallidos: 0 };
    }

    const destino = await consultar<{ id: string; nombre: string }>(
      orgId,
      `select id, nombre from stage where organization_id = $1 and es_seguimiento limit 1`,
      [orgId],
    );
    // Sin etapa de seguimiento no se mueve nada: ver 0019_seguimiento.sql.
    if (!destino[0]) {
      return { organizacion: organizacion.nombre, revisados: 0, contactados: 0, fallidos: 0 };
    }

    /*
     * Quién está dormido.
     *
     * · En una etapa que conduce el bot: si ya lo tomó una persona, el silencio
     *   es problema de esa persona, no del bot.
     * · El último mensaje ENTRANTE es viejo. Se mira el entrante y no el
     *   último a secas: el saliente es el del propio bot, y contarlo haría que
     *   el reloj se reiniciara con su propia respuesta.
     * · Que haya habido alguna vez un mensaje entrante — si nunca escribió, no
     *   es un silencio, es un lead que entró por otro canal.
     * · Sin seguimiento previo, y no perdido.
     */
    const dormidos = await consultar<LeadDormido>(
      orgId,
      `select l.id, l.nombre, l.telefono, v.titulo as vehiculo
         from lead l
         join stage s on s.id = l.stage_id
         left join vehicle v on v.id = l.vehicle_id
        where l.organization_id = $1
          and s.responsable = 'ia'
          and not s.es_seguimiento
          and l.seguimiento_at is null
          and not l.perdido
          and l.telefono is not null
          and (
            select max(a.created_at) from lead_activity a
             where a.lead_id = l.id and a.tipo = 'mensaje'
               and a.payload->>'direccion' = 'entrante'
          ) < now() - make_interval(days => $2)
        limit 200`,
      [orgId, dias],
    );

    let contactados = 0;
    let fallidos = 0;

    for (const lead of dormidos) {
      const texto = mensajeDeSeguimiento(lead, organizacion.nombre, config.nombreAgente || "el asistente");
      const envio = await enviarTextoWhatsapp(lead.telefono!, texto);

      if (!envio.ok) {
        /*
         * No se marca `seguimiento_at` si el envío falló: mañana se reintenta.
         * Tampoco se mueve de etapa — mover a "Sin Respuesta" a alguien a quien
         * no se le pudo escribir diría algo falso sobre él.
         */
        console.error("[seguimiento] no se pudo escribir al lead", lead.id, envio.mensaje);
        fallidos++;
        continue;
      }

      await registrarMensajeWhatsapp(lead.id, {
        direccion: "saliente", cuerpo: texto, externalId: envio.id,
      });
      await moverLead(lead.id, destino[0].id);
      await enTransaccion(orgId, async (cliente) => {
        await cliente.query(
          `update lead set seguimiento_at = now() where id = $1 and organization_id = $2`,
          [lead.id, orgId],
        );
      });
      contactados++;
    }

    return { organizacion: organizacion.nombre, revisados: dormidos.length, contactados, fallidos };
  });
}

/**
 * Todas las automotoras. `organization` no lleva RLS —es la raíz del árbol—
 * así que se puede listar sin declarar ninguna; de ahí en adelante cada una se
 * procesa con la suya fijada.
 */
export async function seguimientoDeTodas(): Promise<ResultadoSeguimiento[]> {
  if (!dbConfigurada()) return [];

  const orgs = await consultar<{ id: string }>(
    "00000000-0000-0000-0000-000000000000",
    "select id from organization order by created_at",
  );

  const resultados: ResultadoSeguimiento[] = [];
  for (const { id } of orgs) {
    try {
      resultados.push(await seguimientoDeOrganizacion(id));
    } catch (e) {
      // Una automotora que falla no puede dejar sin seguimiento a las demás.
      console.error("[seguimiento] falló la organización", id, e);
    }
  }
  return resultados;
}

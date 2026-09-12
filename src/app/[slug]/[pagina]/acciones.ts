"use server";

import { z } from "zod";
import { comoOrganizacion } from "@/lib/auth/sesion";
import { getAutomotoraPorSlug } from "@/lib/data/catalogo";
import { registrarLeadEntrante } from "@/lib/leads/entrada";
import { registrarMensajeWhatsapp } from "@/lib/data";
import { mensajeParaElUsuario } from "@/lib/errores";

export type EstadoFormulario = { ok: boolean; mensaje: string };

/**
 * Los formularios del sitio público entran al EMBUDO, no a un correo.
 *
 * Es la diferencia entre un sitio que informa y uno que capta: alguien que pide
 * cotización por su auto es un lead de compra, y tiene que aparecer en la misma
 * pantalla donde el equipo trabaja el resto. Un correo lo lee alguien cuando se
 * acuerda.
 *
 * Acá no hay sesión —quien escribe es un visitante— así que la organización sale
 * del slug de la URL y se fija con `comoOrganizacion()`, igual que en el webhook
 * de WhatsApp.
 */
const esquema = z.object({
  slug: z.string().min(1),
  tipo: z.enum(["cotizar", "consignar", "financiar", "contacto"]),
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  telefono: z.string().trim().min(8, "Escribe un teléfono de contacto.").max(20),
  email: z.string().trim().email("Revisa el correo.").max(120).optional().or(z.literal("")),
  mensaje: z.string().trim().max(600).optional(),
  vehiculo: z.string().trim().max(120).optional(),
});

const TITULO: Record<string, string> = {
  cotizar: "Quiere cotizar su auto",
  consignar: "Quiere consignar su auto",
  financiar: "Consulta por financiamiento",
  contacto: "Escribió desde el sitio",
};

export async function enviarFormularioAction(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const datos = esquema.safeParse(Object.fromEntries(formData.entries()));
  if (!datos.success) {
    const primero = Object.values(z.flattenError(datos.error).fieldErrors)[0]?.[0];
    return { ok: false, mensaje: primero ?? "Revisa los datos." };
  }

  const automotora = await getAutomotoraPorSlug(datos.data.slug);
  if (!automotora) return { ok: false, mensaje: "No encontramos la automotora." };

  try {
    await comoOrganizacion(automotora.id, async () => {
      const resultado = await registrarLeadEntrante({
        source: "landing_ads",
        nombre: datos.data.nombre,
        telefono: datos.data.telefono,
        email: datos.data.email || undefined,
        /*
         * El payload guarda de qué formulario vino y qué escribió. El vendedor
         * que reciba el lead ve la consulta concreta, no un contacto suelto.
         */
        payload: {
          formulario: datos.data.tipo,
          titulo: TITULO[datos.data.tipo],
          vehiculo: datos.data.vehiculo,
          mensaje: datos.data.mensaje,
        },
      });

      /*
       * El detalle de la consulta se guarda además como mensaje del lead.
       * Sin esto queda solo dentro de `canal_payload`, que ninguna pantalla
       * muestra: el vendedor recibía un contacto pelado sin saber qué pidió.
       */
      if ("leadId" in resultado && resultado.leadId) {
        const lineas = [
          TITULO[datos.data.tipo],
          datos.data.vehiculo ? `Vehículo: ${datos.data.vehiculo}` : null,
          datos.data.mensaje,
          datos.data.email ? `Correo: ${datos.data.email}` : null,
        ].filter(Boolean);
        await registrarMensajeWhatsapp(resultado.leadId, {
          direccion: "entrante",
          cuerpo: lineas.join("\n"),
        });
      }
    });
  } catch (e) {
    return { ok: false, mensaje: mensajeParaElUsuario(e, "No pudimos enviar tu mensaje. Inténtalo de nuevo.") };
  }

  return { ok: true, mensaje: "¡Listo! Te contactamos a la brevedad." };
}

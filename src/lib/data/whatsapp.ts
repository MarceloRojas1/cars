import { consultar, dbConfigurada } from "@/lib/db";

/** Organización nula: `organization` no lleva RLS, así que el valor no filtra nada. */
const SIN_ORGANIZACION = "00000000-0000-0000-0000-000000000000";

/**
 * De qué automotora es un mensaje entrante de WhatsApp.
 *
 * Del número que lo RECIBIÓ (`phone_number_id`), que es lo único del evento que
 * identifica a la automotora: el webhook no tiene sesión —quien llama es Meta—
 * y el remitente es un comprador cualquiera.
 *
 * Devuelve null cuando no se puede saber, y entonces el mensaje se descarta con
 * un aviso en el registro. Adivinar sería peor: atribuir la conversación a la
 * automotora equivocada le entrega un lead ajeno.
 */
export async function organizacionDelNumero(
  phoneNumberId: string | undefined,
): Promise<string | null> {
  if (!dbConfigurada()) return null;

  if (phoneNumberId) {
    const filas = await consultar<{ id: string }>(
      SIN_ORGANIZACION,
      "select id from organization where whatsapp_phone_number_id = $1",
      [phoneNumberId],
    );
    if (filas[0]) return filas[0].id;
  }

  /*
   * Respaldo mientras haya UNA sola automotora: si no hay ambigüedad posible,
   * el mensaje es suyo. Desaparece solo al dar de alta la segunda, y ahí el
   * número queda obligatorio — que es lo correcto, porque con dos automotoras
   * adivinar significa entregarle a una los leads de la otra.
   */
  const todas = await consultar<{ id: string }>(
    SIN_ORGANIZACION,
    "select id from organization limit 2",
  );
  return todas.length === 1 ? todas[0].id : null;
}

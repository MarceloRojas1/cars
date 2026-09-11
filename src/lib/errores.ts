/**
 * Qué se le muestra a una persona cuando algo falla.
 *
 * Los errores de Postgres no se enseñan. Uno real que llegó a pantalla:
 *
 *   insert or update on table "vehicle" violates foreign key constraint
 *   "vehicle_branch_id_fkey"
 *
 * No le sirve a nadie —quien lo lee no sabe qué es una clave foránea— y de paso
 * regala el nombre de las tablas, de las columnas y de las restricciones, que es
 * justo el mapa que alguien necesitaría para buscar un hueco.
 *
 * El detalle real va al registro del servidor, donde sí lo podemos leer.
 */

/** Errores que SÍ escribimos nosotros para que la persona los lea. */
const ES_NUESTRO = [
  /^[A-ZÁÉÍÓÚÑ¿"]/u,           // empieza como una frase en español
];

/** Marcas inconfundibles de un error de motor, librería o red. */
const ES_TECNICO = [
  /violates .* constraint/i,
  /duplicate key value/i,
  /invalid input syntax/i,
  /relation ".*" does not exist/i,
  /column ".*" does not exist/i,
  /permission denied/i,
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|self-signed/i,
  /at [A-Za-z.]+ \(/,          // trazas de pila
];

export function mensajeParaElUsuario(e: unknown, porDefecto: string): string {
  const crudo = e instanceof Error ? e.message : "";
  if (!crudo) return porDefecto;

  // Al registro va siempre el error completo, pase lo que pase.
  console.error("[error]", crudo);

  if (ES_TECNICO.some((p) => p.test(crudo))) return porDefecto;
  if (!ES_NUESTRO.some((p) => p.test(crudo))) return porDefecto;
  // Un mensaje larguísimo casi nunca lo escribimos nosotros.
  return crudo.length <= 200 ? crudo : porDefecto;
}

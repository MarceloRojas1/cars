/**
 * Las credenciales PÚBLICAS de Supabase: las que viajan al navegador.
 *
 * Vive suelto y sin importar nada, como `rutas.ts`, porque lo consume también
 * `proxy.ts`, que corre antes de renderizar y no puede arrastrar dependencias.
 *
 * DOS NOMBRES PARA LA CLAVE, y son la misma cosa con distinta generación:
 *
 *   · `NEXT_PUBLIC_SUPABASE_ANON_KEY`        → la legada, un JWT (`eyJ…`)
 *   · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → la nueva, `sb_publishable_…`
 *
 * Supabase ya solo ofrece la segunda en su panel y dejó la primera en una
 * pestaña de legado. Se aceptan las dos: quien copie el bloque que Supabase
 * entrega hoy no tiene por qué saber que este proyecto nació con el nombre
 * viejo, y descubrirlo cuesta un login que rebota para siempre sin decir por
 * qué.
 *
 * Las dos referencias están escritas COMPLETAS a propósito. Next reemplaza
 * `process.env.NEXT_PUBLIC_*` por su valor al compilar, mirando el texto del
 * código: una búsqueda dinámica sobre `process.env` no se sustituye y llegaría
 * vacía al navegador.
 */
export function clavePublica(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    undefined
  );
}

export function urlPublica(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

/** ¿Se puede autenticar? Si no, el panel no debe servirse en producción. */
export const hayAuthConfigurada = () => Boolean(urlPublica() && clavePublica());

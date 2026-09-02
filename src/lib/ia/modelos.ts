/**
 * Catálogo de modelos ofrecidos en la interfaz.
 *
 * Vive aparte de `claude.ts` porque ese módulo importa el SDK y toca la base:
 * es solo de servidor, y el diálogo de configuración corre en el navegador.
 */
export const MODELO_POR_DEFECTO = "claude-opus-5";

export const MODELOS_DISPONIBLES = [
  { id: "claude-opus-5", nombre: "Claude Opus 5", nota: "el más capaz, recomendado" },
  { id: "claude-sonnet-5", nombre: "Claude Sonnet 5", nota: "más barato" },
  { id: "claude-haiku-4-5", nombre: "Claude Haiku 4.5", nota: "el más rápido y económico" },
] as const;

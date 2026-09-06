import { proveedorFlux } from "./flux";
import { proveedorGemini } from "./gemini";
import type { ProveedorImagen } from "./tipos";

/**
 * Qué proveedor de imágenes está puesto.
 *
 * Vive aparte de `index.ts` porque ese toca la base y el descifrado, y los
 * scripts de línea de comandos no pueden arrastrar eso. Acá solo se elige.
 */
export const PROVEEDORES: Record<string, ProveedorImagen> = {
  gemini: proveedorGemini,
  flux: proveedorFlux,
};

/**
 * Gemini por defecto: entrega la imagen en una sola llamada y sale más barato.
 * FLUX queda disponible con PROVEEDOR_IMAGEN=flux, que es para lo que existe
 * esta interfaz — el resto de la app no sabe cuál de los dos está puesto.
 */
export function proveedorImagenActivo(): ProveedorImagen {
  const elegido = process.env.PROVEEDOR_IMAGEN;
  return (elegido && PROVEEDORES[elegido]) || proveedorGemini;
}

import { consultar, dbConfigurada } from "@/lib/db";
import { descifrar } from "@/lib/cripto";
import { proveedorImagenActivo } from "./registro";

export type { PedidoImagen, ProveedorImagen, ResultadoImagen } from "./tipos";
export { proveedorFlux } from "./flux";
export { proveedorGemini } from "./gemini";
export { PROVEEDORES, proveedorImagenActivo } from "./registro";

/**
 * Resuelve con qué clave se genera — el modelo mixto acordado.
 *
 * Si la automotora conectó su propia cuenta, paga ella. Si no, se usa la clave
 * de la plataforma, que es la que costea la biblioteca compartida. Devuelve
 * también quién paga, para poder registrarlo y limitarlo.
 */
export async function claveDeImagenes(
  orgId: string,
  proveedor = proveedorImagenActivo(),
): Promise<{ apiKey: string; paga: "automotora" | "plataforma" } | null> {
  const filas = dbConfigurada()
    ? await consultar<{ credenciales: { apiKey?: string } | null }>(
        orgId,
        `select credenciales from integration
          where organization_id = $1 and proveedor = $2 and estado = 'conectado'`,
        [orgId, proveedor.id],
      )
    : [];
  const propia = filas[0]?.credenciales?.apiKey;
  if (propia) return { apiKey: descifrar(propia), paga: "automotora" };

  const plataforma = process.env[proveedor.envClave];
  return plataforma ? { apiKey: plataforma, paga: "plataforma" } : null;
}

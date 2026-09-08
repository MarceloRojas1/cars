import type { Automotora, VehiculoPublico } from "@/lib/data/catalogo";

/**
 * El enlace que cierra el círculo con el bot.
 *
 * El mensaje precargado lleva el código del vehículo, que es exactamente lo que
 * `identificarVehiculo()` busca primero cuando entra el mensaje por el webhook.
 * Así el bot sabe de qué auto se habla desde la primera línea, sin preguntar y
 * sin adivinar. Si se cambia el formato del texto, hay que revisar la regex
 * `CODIGO` de `leads/canales/identificar-vehiculo.ts`.
 */
export function enlaceWhatsapp(
  automotora: Automotora,
  vehiculo?: Pick<VehiculoPublico, "codigo" | "titulo">,
): string | null {
  if (!automotora.whatsapp) return null;
  const texto = vehiculo
    ? `Hola ${automotora.nombre}, vi el ${vehiculo.titulo} (${vehiculo.codigo}) en su catálogo y quiero consultar el precio.`
    : `Hola ${automotora.nombre}, vi su catálogo y quiero hacer una consulta.`;
  return `https://wa.me/${automotora.whatsapp}?text=${encodeURIComponent(texto)}`;
}

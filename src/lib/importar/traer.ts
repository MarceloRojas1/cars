import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Pedir una URL que escribió el usuario, sin abrirle la puerta a la red interna.
 *
 * Esto es SSRF y es el riesgo real de la función: alguien pega
 * `http://169.254.169.254/latest/meta-data/` —el servicio de metadatos de la
 * nube— y el servidor, que sí puede alcanzarlo, le devuelve credenciales de la
 * infraestructura. Lo mismo con `http://localhost:5432` o una IP de la red
 * privada: desde fuera no se alcanzan, desde nuestro servidor sí.
 *
 * Tres defensas:
 *  · Solo http y https. Nada de `file:`, `gopher:`, `data:`.
 *  · La IP a la que resuelve el nombre tiene que ser pública.
 *  · Las redirecciones se siguen A MANO, revisando cada salto: si no, basta un
 *    dominio público que redirija a 127.0.0.1 para saltarse todo lo anterior.
 */

/** Rangos que no se pueden alcanzar desde afuera, y por eso no se permiten. */
function esPrivada(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
    // IPv4 disfrazada de IPv6: ::ffff:127.0.0.1
    const m = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return m ? esPrivada(m[1]) : false;
  }

  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||          // enlace local: metadatos de la nube
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224                              // multicast y reservados
  );
}

export class UrlNoPermitida extends Error {}

async function validarDestino(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlNoPermitida("Solo se pueden leer direcciones http o https.");
  }
  const { address } = await lookup(url.hostname).catch(() => {
    throw new UrlNoPermitida(`No se pudo resolver ${url.hostname}.`);
  });
  if (esPrivada(address)) {
    throw new UrlNoPermitida("Esa dirección apunta a una red interna.");
  }
}

const MAX_SALTOS = 4;
const MAX_BYTES = 12 * 1024 * 1024;   // el catálogo de Marketcar pesa ~1,8 MB

/** Pide una página siguiendo redirecciones, validando cada salto. */
export async function traerPagina(
  inicial: string,
  { timeoutMs = 20_000 }: { timeoutMs?: number } = {},
): Promise<{ url: string; html: string }> {
  let url = new URL(inicial);

  for (let salto = 0; salto <= MAX_SALTOS; salto++) {
    await validarDestino(url);

    const corte = AbortSignal.timeout(timeoutMs);
    const res = await fetch(url, {
      redirect: "manual",
      signal: corte,
      headers: {
        // Decimos quiénes somos: si a alguien le molesta el tráfico, sabe a
        // quién escribirle en vez de bloquear a ciegas.
        "user-agent": "Velie/1.0 (importador de catálogo; +https://velie.cl)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get("location");
      if (!destino) throw new UrlNoPermitida("La página redirige a ninguna parte.");
      url = new URL(destino, url);
      continue;
    }
    if (!res.ok) {
      throw new UrlNoPermitida(`La página respondió ${res.status}.`);
    }

    const tipo = res.headers.get("content-type") ?? "";
    if (!tipo.includes("html")) {
      throw new UrlNoPermitida("Esa dirección no devuelve una página web.");
    }

    /*
     * Se lee con tope. Sin esto, una dirección que devuelva un flujo infinito
     * —o un archivo de varios giga— deja la función corriendo hasta que se
     * agota la memoria.
     */
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      throw new UrlNoPermitida("Esa página es demasiado grande para leerla.");
    }
    return { url: url.toString(), html: new TextDecoder().decode(buffer) };
  }

  throw new UrlNoPermitida("La página redirige demasiadas veces.");
}

/** Baja una imagen, con las mismas defensas y un tope propio. */
export async function traerImagen(
  urlImagen: string,
  { maxBytes = 15 * 1024 * 1024, timeoutMs = 25_000 } = {},
): Promise<{ datos: Buffer; tipo: string }> {
  const url = new URL(urlImagen);
  await validarDestino(url);

  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "Velie/1.0 (importador de catálogo; +https://velie.cl)" },
  });
  if (!res.ok) throw new Error(`La foto respondió ${res.status}.`);

  const tipo = res.headers.get("content-type") ?? "image/jpeg";
  if (!tipo.startsWith("image/")) throw new Error("Esa dirección no es una imagen.");

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > maxBytes) throw new Error("La foto es demasiado grande.");
  return { datos: Buffer.from(buffer), tipo };
}

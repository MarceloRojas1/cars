import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de credenciales de terceros.
 *
 * Cada automotora guarda SU propia clave de API. Guardarlas en texto plano
 * significaría que cualquiera con acceso de lectura a la base —un respaldo
 * filtrado, un volcado de depuración, un vendedor con permisos de más— se lleva
 * las claves de todos los clientes. Se cifran con AES-256-GCM, que además
 * autentica: si alguien altera el dato guardado, el descifrado falla en vez de
 * devolver basura.
 *
 * La clave maestra vive en APP_ENCRYPTION_KEY, fuera de la base. Quien tenga
 * solo la base no puede leer nada.
 */
const ALGORITMO = "aes-256-gcm";

function claveMaestra(): Buffer {
  const cruda = process.env.APP_ENCRYPTION_KEY;
  if (!cruda) {
    throw new Error(
      "Falta APP_ENCRYPTION_KEY. Sin ella no se pueden guardar credenciales cifradas.",
    );
  }
  const clave = Buffer.from(cruda, "base64");
  if (clave.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY debe ser de 32 bytes en base64.");
  }
  return clave;
}

export function hayClaveMaestra() {
  try {
    claveMaestra();
    return true;
  } catch {
    return false;
  }
}

/** Devuelve "v1.iv.tag.datos", todo en base64url. El prefijo permite rotar. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv(ALGORITMO, claveMaestra(), iv);
  const datos = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cifrador.getAuthTag().toString("base64url"),
    datos.toString("base64url"),
  ].join(".");
}

export function descifrar(guardado: string): string {
  const [version, iv, tag, datos] = guardado.split(".");
  if (version !== "v1" || !iv || !tag || !datos) {
    throw new Error("Credencial guardada con un formato desconocido.");
  }
  const descifrador = createDecipheriv(
    ALGORITMO,
    claveMaestra(),
    Buffer.from(iv, "base64url"),
  );
  descifrador.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    descifrador.update(Buffer.from(datos, "base64url")),
    descifrador.final(),
  ]).toString("utf8");
}

/** Lo único que puede viajar al navegador: los últimos 4 caracteres. */
export function enmascarar(clave: string) {
  return clave.length <= 8 ? "••••" : `${clave.slice(0, 7)}…${clave.slice(-4)}`;
}

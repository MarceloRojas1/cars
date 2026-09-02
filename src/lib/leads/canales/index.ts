import type { LeadEntrante } from "../entrada";

/**
 * Adaptadores de canal.
 *
 * Cada canal traduce SU payload al formato interno. Nada más: la deduplicación,
 * la asignación y la bitácora ocurren en `registrarLeadEntrante`, igual para
 * todos. Conectar un canal nuevo es escribir una función de traducción y
 * verificar su firma — no tocar el embudo.
 *
 * NINGUNO está conectado todavía: faltan las credenciales y la verificación de
 * firma de cada proveedor. Las formas de payload están tomadas de la
 * documentación pública y hay que confirmarlas con eventos reales.
 */
export type Adaptador = {
  id: string;
  nombre: string;
  /** Cómo se verifica que el evento viene de quien dice. Sin esto no se expone. */
  verificacion: "firma_hmac" | "token_verify" | "ninguna";
  traducir(payload: unknown): LeadEntrante | null;
};

const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** WhatsApp Cloud API — mensaje entrante. Incluye los leads de anuncios CTWA. */
export const whatsapp: Adaptador = {
  id: "whatsapp",
  nombre: "WhatsApp",
  verificacion: "firma_hmac",
  traducir(payload) {
    const entry = obj(obj(payload).entry);
    const cambios = obj(obj(obj(entry)[0]).changes);
    const valor = obj(obj(obj(cambios)[0]).value);
    const mensaje = obj(obj(valor.messages)[0]);
    const contacto = obj(obj(valor.contacts)[0]);
    const telefono = str(mensaje.from) ?? str(contacto.wa_id);
    if (!telefono) return null;

    // Si el chat nació de un anuncio, Meta adjunta el referral: eso distingue
    // un lead de campaña de uno que escribió por su cuenta.
    const referral = obj(mensaje.referral);
    return {
      source: referral.source_id ? "meta_ads" : "whatsapp",
      externalId: str(mensaje.id),
      telefono,
      nombre: str(obj(contacto.profile).name),
      payload,
    };
  },
};

/** Meta Lead Ads — formulario nativo de Facebook/Instagram. */
export const meta: Adaptador = {
  id: "meta",
  nombre: "Meta Lead Ads",
  verificacion: "firma_hmac",
  traducir(payload) {
    const valor = obj(obj(obj(obj(obj(payload).entry)[0]).changes)[0]).value ?? {};
    const v = obj(valor);
    const campos = Array.isArray(v.field_data) ? v.field_data : [];
    const buscar = (nombre: string) => {
      const c = obj(campos.find((x) => obj(x).name === nombre));
      return str(obj(c.values)[0]);
    };
    const leadgenId = str(v.leadgen_id);
    if (!leadgenId) return null;
    return {
      source: "meta_ads",
      externalId: leadgenId,
      nombre: buscar("full_name") ?? buscar("nombre"),
      telefono: buscar("phone_number") ?? buscar("telefono"),
      email: buscar("email"),
      payload,
    };
  },
};

/** Zernio — publicaciones y campañas en redes. Formato por confirmar. */
export const zernio: Adaptador = {
  id: "zernio",
  nombre: "Zernio",
  verificacion: "firma_hmac",
  traducir(payload) {
    const p = obj(payload);
    const telefono = str(p.phone) ?? str(p.telefono);
    if (!telefono && !str(p.email)) return null;
    return {
      source: "social",
      externalId: str(p.id) ?? str(p.event_id),
      nombre: str(p.name) ?? str(p.nombre),
      telefono,
      email: str(p.email),
      vehiculoCodigo: str(p.listing_id) ?? str(p.codigo),
      payload,
    };
  },
};

/** Formulario del sitio público propio. Sin firma: es nuestro. */
export const web: Adaptador = {
  id: "web",
  nombre: "Sitio web",
  verificacion: "ninguna",
  traducir(payload) {
    const p = obj(payload);
    const telefono = str(p.telefono);
    if (!telefono && !str(p.email)) return null;
    return {
      source: "web_dealer",
      nombre: str(p.nombre),
      telefono,
      email: str(p.email),
      vehiculoCodigo: str(p.codigo),
      tipo: p.tipo === "consigna_compra" ? "consigna_compra" : "venta",
      payload,
    };
  },
};

export const ADAPTADORES: Record<string, Adaptador> = {
  whatsapp, meta, zernio, web,
};

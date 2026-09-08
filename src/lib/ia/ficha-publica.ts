import type { Vehicle } from "@/lib/types";

/**
 * Lo único del vehículo que el bot puede ver.
 *
 * Es una lista de permitidos, no de prohibidos. La diferencia importa: con una
 * lista de prohibidos, cada campo nuevo de la ficha queda expuesto por omisión
 * y nadie se entera hasta que el bot se lo cuenta a un cliente. Acá, un campo
 * que no esté acá abajo no llega al modelo, aunque exista en la base.
 *
 * El asistente recibe este tipo y no `Vehicle`, así que el compilador lo obliga.
 */
export type FichaPublica = {
  codigo: string;
  titulo: string;
  anio: number;
  precio: number;
  km: number;
  combustible: string;
  estado: string;
  transmision?: string;
  carroceria?: string;
  puertas?: number;
  cilindrada?: string;
  colorExterior?: string;
  colorInterior?: string;
  cantidadDuenos?: number;
  equipamiento?: string;
  descripcion?: string;
  comuna?: string;
  permisoCirculacionVence?: string;
  revisionTecnicaVence?: string;
  pieFinanciamiento?: number;
};

/*
 * QUÉ QUEDA FUERA, Y POR QUÉ. Si algún día uno de estos tiene que entrar, que
 * sea una decisión con su motivo, no un descuido.
 *
 *   publicadoHaceDias   Cuánto lleva el auto en el salón. Decirle a un cliente
 *                       que lleva noventa días parado regala la negociación.
 *   completitudPct      Métrica interna de calidad de la publicación.
 *   vendedorId          A quién le toca. El cliente no elige vendedor.
 *   branchId            Se expone la comuna, que es lo que necesita saber;
 *                       el identificador interno no.
 *   vin, numeroMotor    Identificadores para trámites. No tienen ningún uso en
 *                       una conversación de venta y se prestan para fraude.
 *   patente             Permite consultas de terceros sobre el vehículo. Si se
 *                       decide publicarla, que sea explícito.
 *   tags                Etiquetas internas del equipo.
 *   canales             Dónde está publicado. Información de la automotora.
 *   archivado           Estado interno del inventario.
 *   fotos               El bot manda texto. Enviar imágenes es otro tipo de
 *                       mensaje y otra decisión.
 */
export function fichaParaElBot(v: Vehicle): FichaPublica {
  return {
    codigo: v.codigo,
    titulo: v.titulo,
    anio: v.anio,
    precio: v.precio,
    km: v.km,
    combustible: v.combustible,
    estado: v.estado,
    transmision: v.transmision,
    carroceria: v.carroceria,
    puertas: v.puertas,
    cilindrada: v.cilindrada,
    colorExterior: v.colorExterior,
    colorInterior: v.colorInterior,
    cantidadDuenos: v.cantidadDuenos,
    equipamiento: v.equipamiento,
    descripcion: v.descripcion,
    comuna: v.comuna,
    permisoCirculacionVence: v.permisoCirculacionVence,
    revisionTecnicaVence: v.revisionTecnicaVence,
    pieFinanciamiento: v.pieFinanciamiento,
  };
}

/** La ficha en texto, como la lee el modelo. Omite lo que no esté cargado. */
export function fichaEnTexto(f: FichaPublica): string {
  const clp = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  const lineas: [string, string | number | undefined][] = [
    ["Publicación", f.codigo],
    ["Vehículo", f.titulo],
    ["Año", f.anio],
    ["Precio", clp(f.precio)],
    ["Kilómetros", f.km.toLocaleString("es-CL")],
    ["Combustible", f.combustible],
    ["Transmisión", f.transmision],
    ["Carrocería", f.carroceria],
    ["Puertas", f.puertas],
    ["Cilindrada", f.cilindrada],
    ["Color exterior", f.colorExterior],
    ["Color interior", f.colorInterior],
    ["Dueños anteriores", f.cantidadDuenos],
    ["Permiso de circulación vence", f.permisoCirculacionVence],
    ["Revisión técnica vence", f.revisionTecnicaVence],
    ["Pie sugerido", f.pieFinanciamiento ? clp(f.pieFinanciamiento) : undefined],
    ["Dónde verlo", f.comuna],
    ["Estado", f.estado],
    ["Equipamiento", f.equipamiento],
    ["Descripción", f.descripcion],
  ];

  return lineas
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

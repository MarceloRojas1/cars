import { clp } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

/**
 * Modelo de una pieza del Estudio.
 *
 * Lo único generado es el fondo. El recorte del vehículo sale de su propia foto
 * y todo lo demás —qué dice, dónde, con qué fuente y color— lo decide quien
 * arma la pieza. Este módulo define la posición de cada cosa y NADA la dibuja:
 * la vista previa y la exportación piden acá la geometría, así que no pueden
 * quedar desalineadas.
 *
 * Todas las medidas son proporciones (0-1) del lienzo, no píxeles. Así la misma
 * pieza se ve igual en la vista previa de 400px de ancho y en el archivo final
 * de 1536, y sigue sirviendo si mañana cambia el formato.
 */

/** El lienzo tiene la proporción con la que se generan los fondos. */
export const ANCHO = 864;
export const ALTO = 1536;

export type Fuente = "serif" | "sans" | "mono";
export type Alineacion = "izquierda" | "centro" | "derecha";

export type ElementoTexto = {
  tipo: "texto";
  id: string;
  etiqueta: string;
  texto: string;
  /** Ancla horizontal según `alineacion`; `y` es el borde superior. */
  x: number;
  y: number;
  /** Alto de la letra como fracción del alto del lienzo. */
  tamano: number;
  fuente: Fuente;
  peso: number;
  color: string;
  alineacion: Alineacion;
  /** Sombra suave: sin ella un texto claro desaparece sobre mármol o nieve. */
  sombra: boolean;
};

export type ElementoAuto = {
  tipo: "auto";
  id: "auto";
  etiqueta: string;
  url: string;
  /** `x` es el centro del vehículo; `y`, la línea donde apoyan las ruedas. */
  x: number;
  y: number;
  /** Ancho del vehículo como fracción del ancho del lienzo. */
  ancho: number;
  sombra: number;
  reflejo: number;
};

export type Elemento = ElementoTexto | ElementoAuto;

export type Creativo = {
  fondoUrl: string | null;
  /**
   * Fondo y vehículo ya integrados por la IA, si se pidió.
   *
   * Reemplaza al par fondo+auto al dibujar: el vehículo viene incrustado con su
   * sombra y su reflejo. Los textos NO entran acá y se siguen dibujando encima
   * en local — mandárselos al modelo los deforma, y además tienen que poder
   * seguir editándose después.
   *
   * Se descarta en cuanto cambia el fondo o algo del vehículo: la imagen
   * integrada dejaría de corresponder al montaje.
   */
  armonizadoUrl?: string | null;
  elementos: Elemento[];
};

export const FUENTES: { id: Fuente; nombre: string; clase: string }[] = [
  { id: "serif", nombre: "Serif — títulos y cifras", clase: "font-[family-name:var(--font-serif)]" },
  { id: "sans", nombre: "Sans — interfaz", clase: "font-[family-name:var(--font-sans)]" },
  { id: "mono", nombre: "Mono — cifras y patentes", clase: "font-[family-name:var(--font-mono)]" },
];

/** Paleta de la marca. Monocroma: el color no decora, distingue. */
export const COLORES = [
  { id: "hueso", valor: "#F2F0EC", nombre: "Hueso" },
  { id: "blanco", valor: "#FFFFFF", nombre: "Blanco" },
  { id: "carbon", valor: "#14161A", nombre: "Carbón" },
  { id: "ok", valor: "#7FA37F", nombre: "Verde" },
  { id: "warn", valor: "#C9A227", nombre: "Ámbar" },
  { id: "crit", valor: "#B4544A", nombre: "Rojo" },
];

/**
 * Disposición inicial a partir del vehículo guardado.
 *
 * Es tentativa a propósito: deja todo puesto en un lugar razonable para que
 * quien arma la pieza mueva, no escriba. Los textos salen de la ficha —marca,
 * modelo, año, kilómetros, precio— y no se tipean de nuevo, que es donde se
 * cuelan los errores de precio.
 */
export function creativoInicial(
  vehiculo: Vehicle,
  fondoUrl: string | null,
  recorteUrl: string | null,
  automotora?: string,
): Creativo {
  const texto = (
    id: string, etiqueta: string, texto: string, y: number, tamano: number,
    fuente: Fuente, peso: number, color = "#FFFFFF",
  ): ElementoTexto => ({
    tipo: "texto", id, etiqueta, texto, x: 0.5, y, tamano, fuente, peso,
    color, alineacion: "centro", sombra: true,
  });

  const detalle = [
    vehiculo.km ? `${vehiculo.km.toLocaleString("es-CL")} km` : null,
    vehiculo.combustible,
    vehiculo.transmision,
  ].filter(Boolean).join("  ·  ");

  const auto: ElementoAuto = {
    tipo: "auto", id: "auto", etiqueta: "Vehículo",
    url: recorteUrl ?? "", x: 0.5, y: 0.66, ancho: 0.88,
    sombra: 0.55, reflejo: 0.25,
  };

  const textos: ElementoTexto[] = [
      texto("titulo", "Título", `${vehiculo.marca} ${vehiculo.modelo ?? ""}`.trim(), 0.72, 0.038, "sans", 600),
      texto("anio", "Año", String(vehiculo.anio), 0.695, 0.020, "mono", 500, "#F2F0EC"),
      texto("precio", "Precio", clp(vehiculo.precio), 0.775, 0.062, "serif", 500),
      texto("detalle", "Detalle", detalle, 0.845, 0.019, "mono", 400, "#F2F0EC"),
      texto("automotora", "Automotora", automotora ?? "", 0.93, 0.017, "sans", 500, "#F2F0EC"),
  ];

  // Un texto vacío no se agrega: la ficha puede no tener transmisión o el
  // vehículo no tener modelo, y una capa en blanco solo estorba en el editor.
  return { fondoUrl, elementos: [auto, ...textos.filter((t) => t.texto.length > 0)] };
}

/* --- de proporciones a píxeles, para un lienzo de cualquier tamaño --- */

/** `x` es el centro del vehículo y `y` la línea donde apoyan las ruedas. */
export function geometriaAuto(el: ElementoAuto, ancho: number, alto: number) {
  return { x: el.x * ancho, piso: el.y * alto, ancho: el.ancho * ancho };
}

export function geometriaTexto(el: ElementoTexto, ancho: number, alto: number) {
  return { x: el.x * ancho, y: el.y * alto, tamano: el.tamano * alto };
}

/**
 * Cambia el vehículo de una pieza CONSERVANDO cómo quedó armada.
 *
 * Es lo que permite probar varios autos sobre el mismo diseño: se reemplaza el
 * recorte y el contenido de los textos que salen de la ficha —precio, título,
 * año, detalle— y se respeta todo lo que se movió a mano: posición, fuente,
 * tamaño, color y alineación. Rehacer la disposición en cada cambio obligaría a
 * armar la pieza de nuevo para cada auto, que es justo lo que se quiere evitar.
 */
export function cambiarVehiculo(
  creativo: Creativo,
  vehiculo: Vehicle,
  recorteUrl: string | null,
  automotora?: string,
): Creativo {
  const nuevo = creativoInicial(vehiculo, creativo.fondoUrl, recorteUrl, automotora);

  const actualizados = creativo.elementos.map((el) => {
    const equivalente = nuevo.elementos.find((n) => n.id === el.id);
    if (!equivalente) return el;
    if (el.tipo === "auto" && equivalente.tipo === "auto") return { ...el, url: equivalente.url };
    if (el.tipo === "texto" && equivalente.tipo === "texto") return { ...el, texto: equivalente.texto };
    return el;
  });

  // El auto nuevo puede traer datos que el anterior no tenía (por ejemplo
  // transmisión): esas capas se agregan en vez de perderse.
  const presentes = new Set(actualizados.map((e) => e.id));
  const faltantes = nuevo.elementos.filter((n) => !presentes.has(n.id));

  return { fondoUrl: creativo.fondoUrl, elementos: [...actualizados, ...faltantes] };
}

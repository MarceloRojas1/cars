import { geometriaAuto, geometriaTexto, type Creativo, type ElementoAuto, type ElementoTexto, type Fuente } from "@/lib/creativos/plantilla";

/**
 * Dibuja una pieza sobre un canvas.
 *
 * Es la ÚNICA función que dibuja: la vista previa del editor y el archivo que se
 * descarga llaman a esta misma con distinto tamaño de lienzo. Por eso lo que se
 * ve arrastrando es exactamente lo que se baja, y no una aproximación.
 *
 * Devuelve la caja de cada elemento para que el editor sepa qué se tocó.
 */

export type Caja = { id: string; x: number; y: number; ancho: number; alto: number };
export type Familias = Record<Fuente, string>;

const cache = new Map<string, HTMLImageElement>();

export function imagenCargada(url: string) {
  return cache.get(url);
}

export function cargarImagen(url: string): Promise<HTMLImageElement> {
  const guardada = cache.get(url);
  if (guardada) return Promise.resolve(guardada);
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { cache.set(url, img); resolver(img); };
    img.onerror = () => rechazar(new Error(`No se pudo cargar ${url}`));
    img.src = url;
  });
}

/** Lienzo auxiliar del tamaño pedido. */
function auxiliar(ancho: number, alto: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(ancho));
  c.height = Math.max(1, Math.round(alto));
  return { canvas: c, ctx: c.getContext("2d")! };
}

/**
 * Dónde toca el suelo el vehículo, columna por columna.
 *
 * Devuelve, para cada columna, la altura del píxel opaco más bajo como fracción
 * (0-1) del alto del recorte, o null si esa columna está vacía. Es lo que
 * permite que la sombra siga las ruedas: en una foto de tres cuartos la rueda
 * delantera toca el piso bastante más abajo que la trasera, así que una sola
 * mancha bajo el borde de la imagen queda despegada del auto.
 *
 * Se calcula una vez por recorte y se guarda: recorrer los píxeles en cada
 * repintado haría inusable el arrastre.
 */
const contornos = new Map<string, (number | null)[]>();
const COLUMNAS = 400;

/**
 * Sombra y reflejo se arman columna por columna, así que cuestan caro y no
 * cambian mientras se arrastra: solo se mueve el resultado. Se guardan por
 * recorte, tamaño e intensidad, y se descartan las más viejas para que mover un
 * deslizador no llene la memoria de variantes intermedias.
 */
const capas = new Map<string, HTMLCanvasElement>();
const MAX_CAPAS = 24;

function capaCacheada(clave: string, crear: () => HTMLCanvasElement) {
  const guardada = capas.get(clave);
  if (guardada) return guardada;
  const nueva = crear();
  capas.set(clave, nueva);
  if (capas.size > MAX_CAPAS) capas.delete(capas.keys().next().value!);
  return nueva;
}

function contornoInferior(img: HTMLImageElement): (number | null)[] {
  const guardado = contornos.get(img.src);
  if (guardado) return guardado;

  const alto = Math.max(1, Math.round(COLUMNAS * (img.naturalHeight / img.naturalWidth)));
  const { ctx } = auxiliar(COLUMNAS, alto);
  ctx.drawImage(img, 0, 0, COLUMNAS, alto);
  const { data } = ctx.getImageData(0, 0, COLUMNAS, alto);

  const contorno: (number | null)[] = [];
  for (let x = 0; x < COLUMNAS; x++) {
    let encontrado: number | null = null;
    for (let y = alto - 1; y >= 0; y--) {
      if (data[(y * COLUMNAS + x) * 4 + 3] > 24) { encontrado = y / alto; break; }
    }
    contorno.push(encontrado);
  }
  contornos.set(img.src, contorno);
  return contorno;
}

/**
 * Sombra de contacto: una mancha por columna, apoyada en el contorno inferior.
 *
 * La unión de todas dibuja la línea donde el auto pisa —incluidas las dos
 * ruedas a distinta altura— en vez de un óvalo bajo la imagen. Se difumina
 * después, no antes, para que las manchas se fundan en una sola sombra.
 */
function dibujarSombra(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  x: number, piso: number, ancho: number, alto: number, intensidad: number,
) {
  const clave = `sombra|${img.src}|${Math.round(ancho)}|${intensidad.toFixed(2)}`;
  const contorno = contornoInferior(img);
  const grosor = Math.max(4, alto * (0.035 + 0.05 * intensidad));
  const desenfoque = Math.max(3, grosor * 0.45);
  const margen = Math.ceil(desenfoque * 2);

  const suave = capaCacheada(clave, () => {
  const { canvas, ctx: aux } = auxiliar(ancho + margen * 2, alto + margen * 2);
  const anchoColumna = ancho / contorno.length;

  // Negro sólido: la intensidad se aplica recién al dibujar la capa. Si se
  // aplicara acá, el desenfoque se comería el control y subirlo casi no
  // cambiaría nada.
  aux.fillStyle = "rgba(0,0,0,1)";
  contorno.forEach((fraccion, i) => {
    if (fraccion === null) return;
    aux.beginPath();
    aux.ellipse(
      margen + (i + 0.5) * anchoColumna,
      margen + fraccion * alto,
      anchoColumna * 1.6,
      grosor / 2,
      0, 0, Math.PI * 2,
    );
    aux.fill();
  });

  const { canvas: borroso, ctx: ctxSuave } = auxiliar(canvas.width, canvas.height);
  ctxSuave.filter = `blur(${desenfoque}px)`;
  ctxSuave.drawImage(canvas, 0, 0);
  return borroso;
  });

  ctx.save();
  ctx.globalAlpha = Math.min(1, intensidad);
  ctx.drawImage(suave, x - margen, piso - alto - margen);
  ctx.restore();
}

/**
 * Reflejo en el piso, espejado columna por columna.
 *
 * No se puede espejar la imagen entera sobre un solo eje: eso supone que todo
 * el vehículo apoya a la misma altura, y en una foto de tres cuartos la rueda
 * trasera toca el piso mucho más arriba que la delantera. Espejando sobre el
 * borde de la imagen, solo la rueda más cercana queda pegada a su reflejo y el
 * resto flota.
 *
 * Cada columna se refleja sobre SU propio punto de apoyo —el mismo contorno que
 * usa la sombra—, así que todas las ruedas nacen tocando su reflejo. El
 * desvanecido también se aplica por columna, medido desde ese punto: uno global
 * apagaría antes lo que nace más arriba.
 */
function dibujarReflejo(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  x: number, piso: number, ancho: number, alto: number, intensidad: number,
) {
  const clave = `reflejo|${img.src}|${Math.round(ancho)}|${intensidad.toFixed(2)}`;
  const contorno = contornoInferior(img);
  const largo = alto * (0.35 + intensidad * 0.45);
  const arriba = piso - alto;

  const suave = capaCacheada(clave, () => {
  const { canvas, ctx: aux } = auxiliar(ancho, alto + largo);
  const anchoColumna = ancho / contorno.length;

  contorno.forEach((fraccion, i) => {
    if (fraccion === null) return;
    const eje = fraccion * alto;
    const izquierda = i * anchoColumna;

    aux.save();
    // Solo lo que cae bajo el punto de apoyo de ESTA columna.
    aux.beginPath();
    aux.rect(izquierda, eje, anchoColumna + 1, canvas.height - eje);
    aux.clip();

    // y' = 2·eje - y deja la imagen espejada respecto de ese apoyo.
    aux.translate(0, 2 * eje);
    aux.scale(1, -1);
    aux.drawImage(img, 0, 0, ancho, alto);
    aux.setTransform(1, 0, 0, 1, 0, 0);

    // Se borra hacia abajo desde el apoyo; el recorte deja intacto el resto.
    const apagado = aux.createLinearGradient(0, eje, 0, eje + largo);
    apagado.addColorStop(0, "rgba(0,0,0,0)");
    apagado.addColorStop(1, "rgba(0,0,0,1)");
    aux.globalCompositeOperation = "destination-out";
    aux.fillStyle = apagado;
    aux.fillRect(izquierda, eje, anchoColumna + 1, canvas.height - eje);
    aux.restore();
  });

  const { canvas: borroso, ctx: ctxSuave } = auxiliar(canvas.width, canvas.height);
  ctxSuave.filter = "blur(2px)";
  ctxSuave.drawImage(canvas, 0, 0);
  return borroso;
  });

  ctx.save();
  ctx.globalAlpha = Math.min(1, intensidad);
  ctx.drawImage(suave, x, arriba);
  ctx.restore();
}

function dibujarAuto(
  ctx: CanvasRenderingContext2D, el: ElementoAuto, W: number, H: number,
): Caja | null {
  const img = el.url ? imagenCargada(el.url) : undefined;
  if (!img) return null;

  const { x: centro, piso, ancho } = geometriaAuto(el, W, H);
  const alto = ancho * (img.naturalHeight / img.naturalWidth);
  const x = centro - ancho / 2;

  if (el.reflejo > 0) dibujarReflejo(ctx, img, x, piso, ancho, alto, el.reflejo);
  if (el.sombra > 0) dibujarSombra(ctx, img, x, piso, ancho, alto, el.sombra);
  ctx.drawImage(img, x, piso - alto, ancho, alto);

  return { id: el.id, x, y: piso - alto, ancho, alto };
}

function dibujarTexto(
  ctx: CanvasRenderingContext2D, el: ElementoTexto, W: number, H: number, familias: Familias,
): Caja {
  const g = geometriaTexto(el, W, H);
  const tamano = g.tamano;
  ctx.font = `${el.peso} ${tamano}px ${familias[el.fuente]}`;
  ctx.textBaseline = "top";
  ctx.textAlign = el.alineacion === "izquierda" ? "left" : el.alineacion === "derecha" ? "right" : "center";
  ctx.fillStyle = el.color;

  if (el.sombra) {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = tamano * 0.35;
    ctx.shadowOffsetY = tamano * 0.04;
  }
  ctx.fillText(el.texto, g.x, g.y);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const ancho = ctx.measureText(el.texto).width;
  const izquierda = el.alineacion === "izquierda" ? g.x : el.alineacion === "derecha" ? g.x - ancho : g.x - ancho / 2;
  return { id: el.id, x: izquierda, y: g.y, ancho, alto: tamano * 1.25 };
}

export function dibujar(
  ctx: CanvasRenderingContext2D,
  creativo: Creativo,
  W: number,
  H: number,
  familias: Familias,
): Caja[] {
  ctx.clearRect(0, 0, W, H);

  // La versión armonizada trae el vehículo incrustado con su sombra y su
  // reflejo, así que hace de fondo y la capa del auto no se dibuja.
  const fondoUrl = creativo.armonizadoUrl ?? creativo.fondoUrl;
  const fondo = fondoUrl ? imagenCargada(fondoUrl) : undefined;
  if (fondo) {
    // "cover": el fondo llena el lienzo aunque su proporción no sea exacta.
    const escala = Math.max(W / fondo.naturalWidth, H / fondo.naturalHeight);
    const w = fondo.naturalWidth * escala;
    const h = fondo.naturalHeight * escala;
    ctx.drawImage(fondo, (W - w) / 2, (H - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#1a1c20";
    ctx.fillRect(0, 0, W, H);
  }

  const cajas: Caja[] = [];
  for (const el of creativo.elementos) {
    if (el.tipo === "auto" && creativo.armonizadoUrl) continue;
    const caja = el.tipo === "auto"
      ? dibujarAuto(ctx, el, W, H)
      : dibujarTexto(ctx, el, W, H, familias);
    if (caja) cajas.push(caja);
  }
  return cajas;
}

/** Familias reales que usa el navegador, para que el canvas dibuje con las mismas. */
export function familiasDelDocumento(nodo: HTMLElement): Familias {
  const leer = (variable: string) =>
    getComputedStyle(nodo).getPropertyValue(variable).trim() || "sans-serif";
  return {
    serif: `${leer("--font-serif")}, Georgia, serif`,
    sans: `${leer("--font-sans")}, system-ui, sans-serif`,
    mono: `${leer("--font-mono")}, ui-monospace, monospace`,
  };
}

import { inflateRawSync } from "node:zlib";

/**
 * Lector de .xlsx mínimo, sin dependencias — la mitad inversa de
 * `lib/exportar/xlsx.ts`.
 *
 * Lee lo que una planilla de inventario tiene: texto y números en una hoja.
 * NO interpreta fechas, fórmulas ni formatos — una celda con fórmula devuelve
 * su último valor calculado, que es lo que Excel deja guardado, y eso alcanza.
 */

/* ── ZIP ──────────────────────────────────────────────────────────────── */

/**
 * Saca los archivos del zip usando el DIRECTORIO CENTRAL, no recorriendo las
 * cabeceras locales de principio a fin. El directorio es la fuente de verdad
 * del formato: las cabeceras locales pueden traer el tamaño en cero cuando el
 * archivo se escribió en streaming, y ahí un recorrido secuencial se pierde.
 */
function leerZip(datos: Buffer): Map<string, Buffer> {
  // El registro de fin está al final, pero puede traer un comentario detrás,
  // así que se busca su firma desde atrás.
  let fin = -1;
  for (let i = datos.length - 22; i >= 0 && i > datos.length - 22 - 65536; i--) {
    if (datos.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("El archivo no es un .xlsx válido (no parece un zip).");

  const cantidad = datos.readUInt16LE(fin + 10);
  let p = datos.readUInt32LE(fin + 16);
  const archivos = new Map<string, Buffer>();

  for (let i = 0; i < cantidad; i++) {
    if (datos.readUInt32LE(p) !== 0x02014b50) break;

    const metodo = datos.readUInt16LE(p + 10);
    const comprimido = datos.readUInt32LE(p + 20);
    const largoNombre = datos.readUInt16LE(p + 28);
    const largoExtra = datos.readUInt16LE(p + 30);
    const largoComentario = datos.readUInt16LE(p + 32);
    const inicioLocal = datos.readUInt32LE(p + 42);
    const nombre = datos.toString("utf8", p + 46, p + 46 + largoNombre);

    // En la cabecera local, el campo extra puede tener otro largo que en el
    // directorio: hay que leerlo de ahí para saber dónde empiezan los datos.
    const extraLocal = datos.readUInt16LE(inicioLocal + 28);
    const nombreLocal = datos.readUInt16LE(inicioLocal + 26);
    const inicioDatos = inicioLocal + 30 + nombreLocal + extraLocal;
    const crudo = datos.subarray(inicioDatos, inicioDatos + comprimido);

    archivos.set(nombre, metodo === 0 ? Buffer.from(crudo) : inflateRawSync(crudo));
    p += 46 + largoNombre + largoExtra + largoComentario;
  }

  return archivos;
}

/* ── Hoja ─────────────────────────────────────────────────────────────── */

const desescapar = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
   .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
   .replace(/&amp;/g, "&");   // al final: si no, se desescapan dos veces

/** Todo el texto de los `<t>` de un fragmento, concatenado. */
function textoDe(xml: string): string {
  const partes = [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
  return desescapar(partes.join(""));
}

/** "BC12" → 54. */
function indiceDeColumna(ref: string): number {
  const letras = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Las filas de la primera hoja, como texto. Los números llegan tal como los
 * guardó Excel ("47450000"), y quien llama decide cómo interpretarlos: acá no
 * se sabe si una columna es un precio o un año.
 */
export function leerXlsx(datos: Buffer): string[][] {
  const archivos = leerZip(datos);

  const hojaNombre =
    [...archivos.keys()].find((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  if (!hojaNombre) throw new Error("La planilla no tiene ninguna hoja.");

  /*
   * Las cadenas compartidas: Excel guarda cada texto UNA vez en esta tabla y
   * las celdas la referencian por índice (`t="s"`). Es lo que hace tu planilla.
   * `crearXlsx()` no la usa —escribe los textos en línea— y por eso el lector
   * tiene que entender las dos formas.
   */
  const compartidas: string[] = [];
  const ss = archivos.get("xl/sharedStrings.xml");
  if (ss) {
    for (const m of ss.toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      compartidas.push(textoDe(m[1]));
    }
  }

  const xml = archivos.get(hojaNombre)!.toString("utf8");
  const filas: string[][] = [];

  for (const mFila of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const celdas: string[] = [];

    for (const mc of mFila[1].matchAll(/<c\s([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
      const atributos = mc[1];
      const cuerpo = mc[3] ?? "";
      const ref = atributos.match(/r="([A-Z]+\d+)"/)?.[1];
      const tipo = atributos.match(/t="([^"]+)"/)?.[1];

      let valor: string;
      if (tipo === "s") {
        const i = Number(cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "-1");
        valor = compartidas[i] ?? "";
      } else if (tipo === "inlineStr") {
        valor = textoDe(cuerpo);
      } else {
        valor = desescapar(cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
      }

      /*
       * La posición sale de la referencia (`D4`), no del orden: una fila con
       * huecos omite las celdas vacías, y leerlas en orden correría todo hacia
       * la izquierda — el año terminaría en la columna del modelo.
       */
      const i = ref ? indiceDeColumna(ref) : celdas.length;
      while (celdas.length < i) celdas.push("");
      celdas[i] = valor;
    }

    filas.push(celdas);
  }

  return filas;
}

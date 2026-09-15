import { deflateRawSync } from "node:zlib";

/**
 * Un escritor de .xlsx mínimo, sin dependencias.
 *
 * Un xlsx es un ZIP con unos pocos XML adentro. Escribirlo a mano son ~120
 * líneas; la alternativa era `exceljs` (más de un mega para una sola pantalla)
 * o `xlsx`, cuyo paquete en npm quedó congelado cuando el proyecto se mudó a
 * su propio CDN. Para lo que hacemos —una tabla de texto y números, sin
 * fórmulas, ni formatos, ni gráficos— no se justifica ninguna de las dos.
 *
 * Qué NO hace, y está bien que no lo haga: estilos, anchos de columna, varias
 * hojas, fechas. Si algún día hiciera falta algo de eso, ahí sí conviene la
 * librería.
 */

/* ── ZIP ──────────────────────────────────────────────────────────────── */

/** Tabla de CRC-32, que es lo que el formato ZIP usa para verificar cada archivo. */
const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(datos: Buffer): number {
  let c = -1;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

type Entrada = { nombre: string; contenido: Buffer };

/**
 * Arma el ZIP: cada archivo con su cabecera local, después el directorio
 * central, y al final el registro que dice dónde empieza ese directorio. Es
 * todo lo que exige el formato para un zip sin carpetas ni cifrado.
 *
 * Se comprime con deflate crudo (método 8), que es lo que espera cualquier
 * lector de xlsx — Excel, LibreOffice y Google Sheets abren esto igual.
 */
function crearZip(entradas: Entrada[]): Buffer {
  const locales: Buffer[] = [];
  const central: Buffer[] = [];
  let desplazamiento = 0;

  for (const { nombre, contenido } of entradas) {
    const nombreBuf = Buffer.from(nombre, "utf8");
    const comprimido = deflateRawSync(contenido);
    const crc = crc32(contenido);

    const cabecera = Buffer.alloc(30);
    cabecera.writeUInt32LE(0x04034b50, 0);       // firma de cabecera local
    cabecera.writeUInt16LE(20, 4);               // versión mínima
    cabecera.writeUInt16LE(0, 6);                // sin banderas
    cabecera.writeUInt16LE(8, 8);                // método: deflate
    cabecera.writeUInt16LE(0, 10);               // hora (no la guardamos)
    cabecera.writeUInt16LE(0x21, 12);            // fecha mínima válida
    cabecera.writeUInt32LE(crc, 14);
    cabecera.writeUInt32LE(comprimido.length, 18);
    cabecera.writeUInt32LE(contenido.length, 22);
    cabecera.writeUInt16LE(nombreBuf.length, 26);
    cabecera.writeUInt16LE(0, 28);               // sin campo extra
    locales.push(cabecera, nombreBuf, comprimido);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);            // firma del directorio central
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(comprimido.length, 20);
    dir.writeUInt32LE(contenido.length, 24);
    dir.writeUInt16LE(nombreBuf.length, 28);
    dir.writeUInt32LE(desplazamiento, 42);       // dónde está su cabecera local
    central.push(dir, nombreBuf);

    desplazamiento += cabecera.length + nombreBuf.length + comprimido.length;
  }

  const cuerpo = Buffer.concat(locales);
  const directorio = Buffer.concat(central);

  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);              // fin del directorio central
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(cuerpo.length, 16);

  return Buffer.concat([cuerpo, directorio, fin]);
}

/* ── Hoja ─────────────────────────────────────────────────────────────── */

export type Celda = string | number | null | undefined;

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 0 → A, 25 → Z, 26 → AA. */
function columna(i: number): string {
  let s = "";
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) {
    s = String.fromCharCode(65 + (n % 26)) + s;
  }
  return s;
}

/**
 * Los textos van EN LÍNEA (`inlineStr`) y no en la tabla de cadenas
 * compartidas. Excel acepta las dos formas; con esta se ahorra un archivo
 * entero y toda la contabilidad de índices, a cambio de repetir las cadenas
 * que se repiten. Para una planilla de decenas de filas eso no se nota.
 */
function celdaXml(valor: Celda, ref: string): string {
  if (valor === null || valor === undefined || valor === "") return "";
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapar(String(valor))}</t></is></c>`;
}

const ARCHIVOS_FIJOS: Entrada[] = [
  {
    nombre: "[Content_Types].xml",
    contenido: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      "</Types>",
    ),
  },
  {
    nombre: "_rels/.rels",
    contenido: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      "</Relationships>",
    ),
  },
  {
    nombre: "xl/_rels/workbook.xml.rels",
    contenido: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      "</Relationships>",
    ),
  },
];

/** Genera el .xlsx completo. La primera fila es la de encabezados. */
export function crearXlsx(filas: Celda[][], nombreHoja = "Hoja1"): Buffer {
  const xmlFilas = filas
    .map((fila, i) => {
      const celdas = fila.map((v, j) => celdaXml(v, `${columna(j)}${i + 1}`)).join("");
      return `<row r="${i + 1}">${celdas}</row>`;
    })
    .join("");

  const ancho = Math.max(1, ...filas.map((f) => f.length));
  const dimension = `A1:${columna(ancho - 1)}${Math.max(1, filas.length)}`;

  const hoja =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="${dimension}"/>` +
    `<sheetData>${xmlFilas}</sheetData>` +
    "</worksheet>";

  const libro =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapar(nombreHoja)}" sheetId="1" r:id="rId1"/></sheets>` +
    "</workbook>";

  return crearZip([
    ...ARCHIVOS_FIJOS,
    { nombre: "xl/workbook.xml", contenido: Buffer.from(libro, "utf8") },
    { nombre: "xl/worksheets/sheet1.xml", contenido: Buffer.from(hoja, "utf8") },
  ]);
}

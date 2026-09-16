/**
 * Lo interno no sale.
 *
 * Hay datos de la ficha que no pueden llegar ni al comprador ni al modelo que
 * le contesta por WhatsApp. El más claro es `adquisicion`: decirle a alguien
 * que el auto está consignado le regala la negociación, porque sabe que el
 * precio no lo decide quien se lo está vendiendo.
 *
 * `FichaPublica` es una lista de permitidos y el compilador la hace cumplir,
 * pero eso protege contra un descuido de tipos, no contra que alguien agregue
 * el campo a la lista sin pensarlo. Esto lo prueba sobre el valor real.
 *
 *   npm run test:internos
 */
import assert from "node:assert/strict";
import test from "node:test";

import { fichaParaElBot, fichaEnTexto } from "../src/lib/ia/ficha-publica";
import type { Vehicle } from "../src/lib/types";

/** Un vehículo con todo lo sensible puesto, para que se note si se escapa. */
const VEHICULO: Vehicle = {
  id: "veh_1",
  codigo: "COD922145",
  titulo: "BMW X3 xDrive30i M Sport 2022",
  marca: "BMW",
  modelo: "X3",
  anio: 2022,
  precio: 43_900_000,
  km: 32_100,
  combustible: "Bencina",
  branchId: "suc_001",
  estado: "disponible",
  completitudPct: 89,
  publicadoHaceDias: 97,
  canales: ["mercadolibre"],
  tags: [],
  adquisicion: "consignacion",
  precioCompra: 38_000_000,
  comisionCompra: 200_000,
  publicacionMin: 43_000_000,
  publicacionMax: 45_000_000,
  comisionConsignacion: 1_500_000,
  libreAPago: 42_400_000,
  vendedorId: "usr_juan",
};

test("el asistente no recibe cómo se adquirió el auto", () => {
  const ficha = fichaParaElBot(VEHICULO);

  for (const campo of [
    "adquisicion", "precioCompra", "comisionCompra",
    "publicacionMin", "publicacionMax", "comisionConsignacion", "libreAPago",
  ]) {
    assert.ok(
      !(campo in (ficha as Record<string, unknown>)),
      `\`${campo}\` llegó a la ficha del bot: es interno y le regala la negociación al comprador.`,
    );
  }

  /*
   * Y los MONTOS, que es lo peor que podría escaparse: que el modelo sepa en
   * cuánto se compró el auto que está vendiendo. Se buscan los números tal
   * cual, por si alguno llegara dentro de un texto libre.
   */
  const crudo = JSON.stringify(ficha);
  for (const monto of ["38000000", "42400000", "1500000"]) {
    assert.ok(!crudo.includes(monto), `El monto interno ${monto} llegó a la ficha del bot.`);
  }

  /*
   * Y el texto, que es lo que de verdad viaja al modelo. Se revisa aparte
   * porque `fichaEnTexto` podría serializar el objeto completo por descuido.
   */
  const texto = fichaEnTexto(ficha).toLowerCase();
  for (const palabra of ["consigna", "parte de pago", "adquisici"]) {
    assert.ok(
      !texto.includes(palabra),
      `El texto que recibe el modelo menciona "${palabra}".`,
    );
  }
});

test("el asistente tampoco recibe los datos que delatan la urgencia de venta", () => {
  const ficha = fichaParaElBot(VEHICULO) as Record<string, unknown>;

  // Cuánto lleva parado y quién lo atiende: lo primero regala la negociación,
  // lo segundo no es del comprador.
  for (const campo of ["publicadoHaceDias", "completitudPct", "vendedorId", "branchId"]) {
    assert.ok(!(campo in ficha), `\`${campo}\` llegó a la ficha del bot.`);
  }
});

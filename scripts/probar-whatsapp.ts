/**
 * Envía un mensaje de prueba por WhatsApp con el cliente real del proyecto.
 *   npm run whatsapp:probar -- +56912345678
 *
 * Sirve para verificar el token y el número antes de tener el webhook: enviar
 * y recibir son dos mitades independientes, y esta se puede probar sola.
 *
 * Ojo: el número de prueba de Meta solo puede escribirle a los destinatarios
 * que estén registrados en la app. A cualquier otro, la API responde error.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { enviarTextoWhatsapp } from "../src/lib/whatsapp/cliente";

async function main() {
  const destino = process.argv[2];
  if (!destino?.startsWith("+")) {
    console.error("✗ Falta el número, con código de país:");
    console.error("    npm run whatsapp:probar -- +56912345678");
    process.exit(1);
  }
  if (!process.env.WHATSAPP_TOKEN) {
    console.error("✗ Falta WHATSAPP_TOKEN en .env.local");
    process.exit(1);
  }

  const texto = `Prueba de Velie · ${new Date().toLocaleString("es-CL")}`;
  console.log(`enviando a ${destino}…`);
  const r = await enviarTextoWhatsapp(destino, texto);

  if (!r.ok) {
    console.error("✗", r.mensaje);
    console.error("\n  Si dice que el destinatario no es válido: agrégalo como número");
    console.error("  de prueba en el panel de Meta, en la sección de la API de WhatsApp.");
    process.exit(1);
  }
  console.log(`✓ enviado · id ${r.id}`);
  console.log("  Revisa tu WhatsApp: debería llegar en segundos.");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });

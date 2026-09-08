/**
 * Proxy de un solo propósito: dejar entrar el webhook y nada más.
 *
 *   node scripts/proxy-webhook.mjs        (escucha en 3999 → 3000)
 *
 * Existe porque para probar WhatsApp hay que exponer el servidor a internet, y
 * la aplicación TODAVÍA NO TIENE LOGIN: exponer el puerto 3000 entero dejaría
 * el inventario, los leads y los teléfonos de los clientes a la vista de
 * cualquiera que conozca la URL del túnel.
 *
 * Solo pasa /api/webhooks/*. Todo lo demás recibe 404, igual que si no
 * existiera.
 *
 * Es andamiaje: en producción la aplicación tiene su propia URL pública y esto
 * se descarta. No forma parte del despliegue.
 */
import { createServer, request as pedir } from "node:http";

const PUERTO = Number(process.env.PROXY_PUERTO ?? 3999);
const DESTINO = Number(process.env.PROXY_DESTINO ?? 3000);
const PERMITIDO = /^\/api\/webhooks\//;

const servidor = createServer((req, res) => {
  const ruta = req.url ?? "/";

  if (!PERMITIDO.test(ruta.split("?")[0])) {
    console.log(`  ✗ ${req.method} ${ruta.slice(0, 60)} — bloqueado`);
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found\n");
    return;
  }

  const salida = pedir(
    { host: "127.0.0.1", port: DESTINO, path: ruta, method: req.method, headers: req.headers },
    (respuesta) => {
      console.log(`  ✓ ${req.method} ${ruta.slice(0, 60)} → ${respuesta.statusCode}`);
      res.writeHead(respuesta.statusCode ?? 502, respuesta.headers);
      respuesta.pipe(res);
    },
  );
  salida.on("error", (e) => {
    console.error("  ! no se pudo alcanzar la aplicación:", e.message);
    res.writeHead(502).end("Bad gateway\n");
  });
  req.pipe(salida);
});

servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log(`proxy escuchando en http://127.0.0.1:${PUERTO}`);
  console.log(`  deja pasar : /api/webhooks/*  → localhost:${DESTINO}`);
  console.log("  bloquea    : todo lo demás (404)");
});

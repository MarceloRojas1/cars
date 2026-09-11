import type { NextConfig } from "next";

/**
 * `standalone` empaqueta solo lo necesario para correr y baja la imagen de
 * ~1GB a ~200MB — pero es para la imagen de Docker. Vercel arma sus propias
 * funciones y con `standalone` la salida no le sirve, así que se activa solo
 * cuando construimos el contenedor (`DOCKER_BUILD=1` en el Dockerfile).
 */
const enDocker = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  ...(enDocker ? { output: "standalone" as const } : {}),

  /**
   * Cabeceras de seguridad. Vercel ya pone HSTS; estas cuatro no las pone nadie.
   *
   * Se aplican a TODO, incluido el catálogo público, porque el riesgo no es solo
   * para quien inicia sesión: una ficha de auto metida en un iframe ajeno sirve
   * igual para engañar a un comprador.
   */
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        // Nadie mete la aplicación en un iframe: evita el robo de clics, donde
        // se superpone algo invisible sobre un botón real.
        { key: "X-Frame-Options", value: "DENY" },
        // El navegador respeta el tipo que declaramos y no adivina. Sin esto,
        // un archivo subido podría interpretarse como algo ejecutable.
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Al salir hacia otro sitio se manda el dominio, nunca la ruta: una URL
        // como /vehiculos/COD922145/editar no viaja a terceros.
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // No usamos cámara, micrófono ni ubicación: se apagan explícitamente.
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      ],
    }];
  },

  images: {
    /*
     * Las fotos viven en Vercel Blob, que sirve desde un subdominio propio por
     * tienda (`<id>.public.blob.vercel-storage.com`). Sin esto, next/image se
     * niega a optimizar una URL externa.
     */
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;

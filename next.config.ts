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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Empaqueta solo lo necesario para correr: la imagen de producción baja de ~1GB a ~200MB. */
  output: "standalone",
};

export default nextConfig;

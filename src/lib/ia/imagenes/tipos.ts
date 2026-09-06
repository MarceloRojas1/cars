/** Contrato que cumple cualquier proveedor de generación de imágenes. */

/** Una imagen que se le entrega al modelo como material, no como referencia de estilo. */
export type ImagenEntrada = { datos: Buffer; tipo: string };

export type PedidoImagen = {
  prompt: string;
  /**
   * Imágenes de partida. Con al menos una, el modelo edita en vez de generar:
   * es la diferencia entre "inventa un auto" y "integra ESTE auto", que para
   * publicar el vehículo de un cliente no es un matiz.
   */
  imagenes?: ImagenEntrada[];
  ancho: number;
  alto: number;
  /**
   * Fija la semilla para reproducir un fondo idéntico. No todos los proveedores
   * la admiten: los que no, la ignoran y se declaran `reproducible: false`.
   */
  semilla?: number;
};

export type ResultadoImagen =
  | { ok: true; datos: Buffer; tipo: string; modelo: string; semilla?: number }
  | { ok: false; mensaje: string };

export type ProveedorImagen = {
  id: string;
  nombre: string;
  modelo: string;
  /** Variable de entorno donde vive la clave de la plataforma. */
  envClave: string;
  /** ¿La misma semilla devuelve la misma imagen? Decide si un fondo se puede repetir. */
  reproducible: boolean;
  /** Costo aproximado por imagen, para mostrarlo antes de generar. */
  costoUsd?: number;
  generar(pedido: PedidoImagen, apiKey: string): Promise<ResultadoImagen>;
};

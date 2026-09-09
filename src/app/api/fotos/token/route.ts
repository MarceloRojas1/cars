import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { sesionActual, enDesarrolloSinLogin } from "@/lib/auth/sesion";
import { blobConfigurado, TIPOS_ACEPTADOS } from "@/lib/storage";

/**
 * Entrega el permiso para que el NAVEGADOR suba la foto directo a Blob.
 *
 * ¿Por qué no seguir subiéndolas por `/api/fotos`? Porque ahí el archivo viaja
 * dentro de la petición a una función de Vercel, y esas tienen un tope de
 * cuerpo de ~4,5 MB. Con ese camino, quitar el límite del código no sirve de
 * nada: la foto se rechaza antes de llegar a nuestro código, con un 413 que no
 * explica nada. Una foto de celular moderno pasa ese tope sin esfuerzo.
 *
 * Subiendo desde el navegador, el archivo no toca nuestra función: va del
 * teléfono a Blob. Este endpoint solo firma un permiso corto.
 *
 * POR ESO EXIGE SESIÓN: el permiso da escritura sobre la tienda, y una tienda
 * abierta la llena cualquiera y la paga la automotora.
 */
export async function POST(request: Request) {
  if (!blobConfigurado()) {
    return NextResponse.json(
      { error: "Sin almacenamiento de objetos: se sube por el servidor." },
      { status: 501 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const respuesta = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const sesion = await sesionActual();
        if (!sesion && !enDesarrolloSinLogin()) {
          throw new Error("Hay que iniciar sesión para subir fotos.");
        }
        return {
          // Sin `maximumSizeInBytes`: el tamaño lo limita Blob, no nosotros.
          allowedContentTypes: TIPOS_ACEPTADOS,
          addRandomSuffix: true,
        };
      },
      // Nada que hacer al terminar: la URL la guarda el formulario al publicar.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(respuesta);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo autorizar la subida." },
      { status: 400 },
    );
  }
}

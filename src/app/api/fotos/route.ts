import { NextResponse } from "next/server";
import { guardarImagen, MAX_FOTOS } from "@/lib/storage";
import { sesionActual, enDesarrolloSinLogin } from "@/lib/auth/sesion";
import { mensajeParaElUsuario } from "@/lib/errores";

/**
 * Las fotos se suben aquí y no dentro del Server Action a propósito: las
 * acciones tienen un límite de 1 MB de cuerpo, y 50 fotos no caben ni cerca.
 * El formulario envía después solo las URL resultantes.
 */
export async function POST(request: Request) {
  /*
   * EXIGE SESIÓN, y no por costumbre.
   *
   * Esta ruta no es del panel, así que `proxy.ts` la deja pasar: la lista de
   * caminos protegidos son secciones de la aplicación, no `/api`. Sin este
   * chequeo cualquiera en internet podía subir archivos a la tienda de la
   * automotora — llenarla, gastar su cuota y alojar lo que quisiera en un
   * almacenamiento que ella paga. Comprobado contra producción antes de
   * cerrarlo: una petición sin credenciales devolvía 200 y la URL del archivo.
   *
   * El endpoint hermano `/api/fotos/token` ya lo exigía; este se había quedado
   * atrás.
   */
  const sesion = await sesionActual();
  if (!sesion && !enDesarrolloSinLogin()) {
    return NextResponse.json(
      { error: "Hay que iniciar sesión para subir fotos." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const archivos = formData.getAll("fotos").filter((f): f is File => f instanceof File);

  if (archivos.length === 0) {
    return NextResponse.json({ error: "No llegó ninguna foto." }, { status: 400 });
  }
  if (archivos.length > MAX_FOTOS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_FOTOS} fotos por vehículo.` },
      { status: 400 },
    );
  }

  try {
    const subidas = await Promise.all(archivos.map(guardarImagen));
    return NextResponse.json({ fotos: subidas });
  } catch (e) {
    return NextResponse.json(
      { error: mensajeParaElUsuario(e, "No se pudo subir la imagen.") },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { guardarImagen, MAX_FOTOS } from "@/lib/storage";
import { mensajeParaElUsuario } from "@/lib/errores";

/**
 * Las fotos se suben aquí y no dentro del Server Action a propósito: las
 * acciones tienen un límite de 1 MB de cuerpo, y 50 fotos no caben ni cerca.
 * El formulario envía después solo las URL resultantes.
 */
export async function POST(request: Request) {
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

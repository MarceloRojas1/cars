"""
Recorta el vehículo de una foto y devuelve un PNG con transparencia.

    python3 scripts/recortar.py entrada.jpg salida.png [modelo]

Lo invoca src/lib/ia/imagenes/recorte.ts. Es un proceso aparte y no un servicio
porque el modelo (~176 MB) se carga una vez por llamada y el recorte tarda
segundos: meterlo en el servidor de Next bloquearía el evento de respuesta.

Requiere `pip install rembg` y descarga el modelo la primera vez.
"""
import io
import sys

from PIL import Image
from rembg import remove, new_session

def main() -> int:
    if len(sys.argv) < 3:
        print("uso: recortar.py entrada salida [modelo]", file=sys.stderr)
        return 2

    entrada, salida = sys.argv[1], sys.argv[2]
    modelo = sys.argv[3] if len(sys.argv) > 3 else "u2net"

    with open(entrada, "rb") as f:
        datos = f.read()

    # post_process_mask limpia los bordes: sin esto quedan halos del fondo
    # original alrededor de las ruedas y los espejos.
    recorte = remove(datos, session=new_session(modelo), post_process_mask=True)

    # Se recorta al vehículo. El PNG que devuelve rembg conserva el tamaño de la
    # foto original, con el auto flotando entre márgenes transparentes; quien lo
    # monta después apoya el BORDE DE LA IMAGEN en el suelo, así que ese margen
    # deja al auto levitando y al reflejo despegado. Acá el borde inferior de la
    # imagen pasa a ser la rueda más baja.
    imagen = Image.open(io.BytesIO(recorte))
    caja = imagen.getbbox()  # None solo si quedó completamente transparente
    if caja:
        imagen = imagen.crop(caja)

    imagen.save(salida, "PNG")
    print(f"{imagen.width}x{imagen.height}")
    return 0

if __name__ == "__main__":
    sys.exit(main())

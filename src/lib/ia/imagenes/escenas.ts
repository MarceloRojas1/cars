/**
 * Catálogo de escenas de la biblioteca compartida de fondos.
 *
 * Vive en código y no en la base, por la misma razón que el catálogo de
 * integraciones: agregar una escena no debe obligar a insertar filas. La tabla
 * `showroom` guarda los fondos generados por cada automotora; estos ocho son
 * los que costea la plataforma y ve todo el mundo.
 *
 * El archivo generado se llama como el id (`marmol.png`) y lo produce
 * `npm run showrooms`. Mientras no exista, la escena aparece sin generar.
 */

/**
 * Formato vertical 9:16, cercano al ~3:5 del producto original.
 *
 * Es exactamente 9:16 y no 3:5 porque Gemini no recibe píxeles: elige de una
 * lista fija de proporciones. Pidiendo una que está en esa lista, la imagen sale
 * con la forma que espera la pantalla y la línea de piso cae donde corresponde.
 * Los dos lados son múltiplos de 32, que es lo que además exige FLUX.
 */
export const ANCHO = 864;
export const ALTO = 1536;

/**
 * Encuadre común a todas las escenas.
 *
 * Es la parte que hace utilizable un fondo, y sale de mirar los del producto
 * original: cámara casi apoyada en el suelo, fuga de un punto centrada, y el
 * piso ocupando la mitad inferior **vacío y con textura nítida**. Un fondo con
 * el horizonte a media altura se ve lindo y no sirve: el auto no se apoya en
 * ninguna parte.
 *
 * El color cálido va al fondo y el primer plano queda neutro, para que el
 * vehículo no compita con el suelo.
 */
export const CAMARA =
  "one point perspective with the vanishing point centered, camera 40cm above the ground, " +
  "empty foreground surface filling the lower sixty percent with sharp visible texture, " +
  "deserted, no people, 24mm lens, deep depth of field, photorealistic backplate photography";

export type Escena = {
  id: string;
  nombre: string;
  /** Solo el lugar. El encuadre lo agrega `promptDe`, nunca se escribe a mano. */
  escena: string;
  /** Dónde queda el piso, 0-1 desde arriba. Anotada a mano: ver decisiones.md. */
  lineaPiso: number;
};

/** Descripción del lugar + encuadre = el prompt que se le manda al proveedor. */
export const promptDe = (escena: Escena | string) =>
  `${typeof escena === "string" ? escena : escena.escena}, ${CAMARA}`;

export const ESCENAS: Escena[] = [
  /* --- casas y accesos: es la mitad del catálogo del producto original --- */
  { id: "casa-adoquin", nombre: "Adoquín de noche", lineaPiso: 0.68,
    escena:
      "Large cobblestone driveway in front of a modern dark timber and stone house at night, warm interior light spilling from tall windows, landscape uplighting in the garden, wet stones reflecting the light, deep blue night sky" },
  { id: "casa-porton", nombre: "Portón de madera", lineaPiso: 0.70,
    escena:
      "Wide brushed concrete driveway leading to a modern house with a large wooden garage door, dry ornamental grasses and pampas on both sides, soft overcast afternoon light, calm and expensive" },
  { id: "casa-deck", nombre: "Deck al atardecer", lineaPiso: 0.66,
    escena:
      "Wide timber deck of a modern hillside house at sunset, potted plants and garden lights along both edges, andes mountains and pink orange sky in the distance, warm glow on the wood grain" },
  { id: "casa-manana", nombre: "Casa de mañana", lineaPiso: 0.70,
    escena:
      "Paved stone driveway of a two storey modern house with wood and dark cladding, double garage, green trees and blue sky with soft clouds, clear morning light, crisp shadows" },

  /* --- caminos --- */
  { id: "carretera", nombre: "Carretera al crepúsculo", lineaPiso: 0.62,
    escena:
      "Empty asphalt highway receding straight to the horizon, white lane markings converging, street lights along the shoulder, deep blue twilight sky, green roadside vegetation" },
  { id: "costa", nombre: "Costa", lineaPiso: 0.62,
    escena:
      "Coastal road curving along the shoreline, wet asphalt catching the light, ocean and low sun on the horizon, warm orange reflections on the water, empty road" },
  { id: "tierra", nombre: "Camino de tierra", lineaPiso: 0.64,
    escena:
      "Rocky dirt mountain road, loose gravel and stones in the foreground, andes slopes and pine trees, dramatic red and orange sunset behind the ridge, dust in the air" },
  { id: "duna", nombre: "Duna", lineaPiso: 0.62,
    escena:
      "Desert sand dunes with tire tracks and wind ripples in the foreground sand, tall dune ridge against a burning orange and pink sky, atacama, late golden hour" },
  { id: "nieve", nombre: "Nieve", lineaPiso: 0.64,
    escena:
      "Snow covered mountain road cleared of snow, packed snow banks on both sides, pine forest and white andes peaks, cold blue morning light with warm sun on the summits" },
  { id: "vinedo", nombre: "Viñedo", lineaPiso: 0.64,
    escena:
      "Gravel road between vineyard rows in the chilean central valley, green vines receding to the horizon, low hills and warm late afternoon sun, long shadows across the gravel" },
  { id: "puerto", nombre: "Puerto", lineaPiso: 0.66,
    escena:
      "Empty concrete dock at a shipping port, painted floor markings, stacked shipping containers and cranes in the background, blue hour with cold industrial lights" },

  /* --- interiores --- */
  { id: "salon-nocturno", nombre: "Salón nocturno", lineaPiso: 0.72,
    escena:
      "Modern car showroom interior at night, dark polished floor with deep mirror reflections, linear ceiling light strips, floor to ceiling glass wall showing city lights outside" },
  { id: "marmol", nombre: "Mármol", lineaPiso: 0.70,
    escena:
      "Luxury showroom atrium with vast polished white marble floor with gold veining, mirror reflections, glass walls, warm accent lighting, two levels" },
  { id: "concreto", nombre: "Concreto pulido", lineaPiso: 0.72,
    escena:
      "Minimal industrial showroom with vast polished concrete floor, floor to ceiling glass, soft diffused daylight, deep reflections" },
  { id: "hangar", nombre: "Hangar", lineaPiso: 0.70,
    escena:
      "Empty steel and glass industrial hangar, smooth grey epoxy floor, exposed roof trusses, daylight flooding in through the glass facade, cool clean light" },
  { id: "estudio", nombre: "Estudio", lineaPiso: 0.74,
    escena:
      "Seamless photography studio cyclorama, neutral grey gradient backdrop, glossy floor with soft reflection, softbox lighting" },
];

export const escenaPorId = (id: string) => ESCENAS.find((e) => e.id === id);

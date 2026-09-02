/**
 * Vocabularios del formulario de publicación.
 *
 * Marcas y carrocerías son listas cerradas y estables. Los modelos NO: cambian
 * cada año y mantenerlos a mano envejece mal, así que esta lista es solo una
 * semilla para que el desplegable no arranque vacío — el resto se autocompleta
 * con lo que ya tengas cargado en el inventario (ver getModelosDe).
 */

export const MARCAS_PREMIUM = [
  "Alfa Romeo", "Audi", "BMW", "Cadillac", "Ferrari", "Jaguar", "Land Rover",
  "Lexus", "Lamborghini", "Maserati", "Mercedes Benz", "MINI", "Porsche",
  "Tesla", "Volvo",
] as const;

export const MARCAS_MASIVAS = [
  "BYD", "Changan", "Chery", "Chevrolet", "Citroën", "Dodge", "Fiat", "Ford",
  "Great Wall", "Haval", "Honda", "Hyundai", "JAC", "Jeep", "Kia", "Mazda",
  "MG", "Mitsubishi", "Nissan", "Opel", "Peugeot", "RAM", "Renault", "Subaru",
  "Suzuki", "Toyota", "Volkswagen",
] as const;

export const MARCAS = [...MARCAS_PREMIUM, ...MARCAS_MASIVAS].sort((a, b) =>
  a.localeCompare(b, "es"),
);

/** Semilla de modelos: los más vendidos en Chile por marca. Se amplía sola. */
export const MODELOS_SEMILLA: Record<string, string[]> = {
  "Audi": ["A1", "A3", "A4", "A5", "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron"],
  "BMW": ["Serie 1", "Serie 2", "Serie 3", "Serie 4", "Serie 5", "X1", "X3", "X5", "X6"],
  "Chevrolet": ["Sail", "Onix", "Groove", "Tracker", "Captiva", "Equinox", "Silverado", "Colorado"],
  "Ford": ["Fiesta", "Focus", "EcoSport", "Escape", "Explorer", "Ranger", "F-150", "Territory"],
  "Hyundai": ["Accent", "Elantra", "Creta", "Tucson", "Santa Fe", "Kona", "Venue"],
  "Jeep": ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Gladiator"],
  "Kia": ["Morning", "Rio", "Cerato", "Seltos", "Sportage", "Sorento", "Sonet", "Carnival"],
  "Mazda": ["Mazda 2", "Mazda 3", "CX-3", "CX-30", "CX-5", "CX-9", "BT-50"],
  "Mercedes Benz": ["Clase A", "Clase C", "Clase E", "GLA", "GLB", "GLC", "GLE", "Sprinter"],
  "Mitsubishi": ["L200", "Montero", "Outlander", "ASX", "Eclipse Cross"],
  "Nissan": ["March", "Versa", "Sentra", "Kicks", "Qashqai", "X-Trail", "Pathfinder", "Navara"],
  "Peugeot": ["208", "2008", "3008", "5008", "Partner", "Landtrek"],
  "RAM": ["700", "1000", "1500", "2500", "Rampage"],
  "Renault": ["Kwid", "Sandero", "Logan", "Duster", "Captur", "Koleos", "Oroch"],
  "Subaru": ["Impreza", "XV", "Forester", "Outback", "Ascent", "WRX"],
  "Suzuki": ["Alto", "Swift", "Baleno", "Vitara", "S-Cross", "Jimny"],
  "Toyota": ["Yaris", "Corolla", "C-HR", "RAV4", "Hilux", "Land Cruiser", "Rush", "Prius"],
  "Volkswagen": ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Taos", "Tiguan", "Amarok"],
  "Volvo": ["XC40", "XC60", "XC90", "S60", "V60"],
};

export const COMBUSTIBLES = [
  "Bencina", "Diésel", "Híbrido", "Híbrido enchufable", "Eléctrico", "Gas (GLP/GNV)",
] as const;

export const TRANSMISIONES = ["Manual", "Automática", "CVT", "Semiautomática"] as const;

export const CARROCERIAS = [
  "Sedán", "Hatchback", "SUV", "Camioneta", "Station Wagon", "Coupé",
  "Convertible", "Van", "Furgón", "Minibús",
] as const;

export const PUERTAS = [2, 3, 4, 5] as const;

export const COLORES_EXTERIOR = [
  "Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul", "Verde", "Café",
  "Beige", "Amarillo", "Naranjo", "Burdeo",
] as const;

export const COLORES_INTERIOR = ["Negro", "Beige", "Gris", "Café", "Rojo", "Blanco"] as const;

/**
 * Vocabulario cerrado a propósito: con tags libres terminas con "familiar",
 * "Familiar" y "fam." y no puedes filtrar por nada. Se puede agregar uno propio,
 * pero el costo de inventarlo queda a la vista.
 */
export const TAGS = [
  "Familiar", "Económico", "Primer auto", "4x4", "City car", "Deportivo",
  "Trabajo", "Premium", "Bajo kilometraje", "Full equipo", "Único dueño",
] as const;

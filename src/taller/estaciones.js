// Distribución del taller 3D: fuente única de posiciones, colores y rutas.
// Ver docs/TALLER_3D.md. 1 unidad ≈ 1 metro; Y hacia arriba; la plataforma está en el origen.

export const CUARTO = { ancho: 26, fondo: 22, alto: 8, xMin: -13, xMax: 13, zMin: -11, zMax: 11 };

export const PLATAFORMA = {
  pos: [0, 0, 0],
  radio: 4.6,
  radios: [4.6, 4.2, 3.6], // tres escalones concéntricos
  alturas: [0.18, 0.34, 0.5],
  cuna: { radio: 0.5, alto: 0.5, radioGarras: 1.15, altoGarras: 1.7 }, // la tobera de la nave baja hasta y ≈ 1,04
  alturaNave: 2.3, // centro de la nave sobre el piso
  escalaNave: 1,
};

export const BRAZO = {
  pos: [-5.6, 0, 1.4],
  alturaHombro: 1.5,
  largos: [3.6, 3.3], // brazo superior y antebrazo
  alcance: 6.9,
};

export const BANDEJA = {
  pos: [-5.4, 0, 4.2],
  tam: [1.6, 0.9, 1.6],
  agarre: [-5.4, 1.25, 4.2], // dónde aparece la pieza y la toma el brazo
};

export const PEDESTAL = { pos: [8.4, 0, 4.6], radio: 1.5, alto: 0.4, alturaCohete: 3.2 };

// Distancia de la máquina a la que se para el operador (sobre el frente de la máquina).
const DISTANCIA_OPERADOR = 2.1;
const FRENTE_IZQ = Math.PI / 2; // máquinas de la pared izquierda miran a +X
const FRENTE_FONDO = 0; // máquinas de la pared del fondo miran a +Z

export const ESTACIONES = [
  { id: 'cohete', n: 1, titulo: 'Cohete y motor', corto: 'Cohete', color: '#ff8a4c', icono: 'cohete', pared: 'izquierda', pos: [-12.2, 0, 6.5], rotY: FRENTE_IZQ },
  { id: 'propulsion', n: 2, titulo: 'Combustible', corto: 'Combustible', color: '#ffd166', icono: 'tanque', pared: 'izquierda', pos: [-12.2, 0, 1.5], rotY: FRENTE_IZQ },
  { id: 'energia', n: 3, titulo: 'Energía', corto: 'Energía', color: '#5cc8ff', icono: 'rayo', pared: 'izquierda', pos: [-12.2, 0, -3.5], rotY: FRENTE_IZQ },
  { id: 'antena', n: 4, titulo: 'Antena', corto: 'Antena', color: '#9be9ee', icono: 'antena', pared: 'fondo', pos: [-6.5, 0, -10.2], rotY: FRENTE_FONDO },
  { id: 'blindaje', n: 5, titulo: 'Blindaje', corto: 'Blindaje', color: '#b8c4d0', icono: 'escudo', pared: 'fondo', pos: [-1, 0, -10.2], rotY: FRENTE_FONDO },
  { id: 'instrumentos', n: 6, titulo: 'Ciencia', corto: 'Ciencia', color: '#b794f6', icono: 'lupa', pared: 'fondo', pos: [4.5, 0, -10.2], rotY: FRENTE_FONDO },
  { id: 'estetica', n: 7, titulo: 'Estilo', corto: 'Estilo', color: '#ff7ab6', icono: 'pincel', pared: 'fondo', pos: [10, 0, -10.2], rotY: FRENTE_FONDO },
];

export const ESTACION = Object.fromEntries(ESTACIONES.map((e) => [e.id, e]));

// Punto del piso [x, z] donde se para el operador para usar la estación.
export function posicionOperador(id) {
  const e = ESTACION[id];
  return [e.pos[0] + Math.sin(e.rotY) * DISTANCIA_OPERADOR, e.pos[2] + Math.cos(e.rotY) * DISTANCIA_OPERADOR];
}

// Esquina por la que pasa el carril al cambiar de pared.
const ESQUINA = [-12.2 + DISTANCIA_OPERADOR, -10.2 + DISTANCIA_OPERADOR];

// Ruta por los carriles entre dos estaciones: lista de puntos [x, z] (incluye inicio y fin).
export function rutaEntre(desde, hasta) {
  const a = posicionOperador(desde);
  const b = posicionOperador(hasta);
  if (desde === hasta) return [a];
  return ESTACION[desde].pared === ESTACION[hasta].pared ? [a, b] : [a, ESQUINA, b];
}

// Matriz local → mundo de una estación, sin three (para quien no quiera importarlo): [x, y, z] local a mundo.
export function aMundo(id, [x, y, z]) {
  const e = ESTACION[id];
  const c = Math.cos(e.rotY), s = Math.sin(e.rotY);
  return [e.pos[0] + x * c + z * s, e.pos[1] + y, e.pos[2] - x * s + z * c];
}

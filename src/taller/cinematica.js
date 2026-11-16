import * as THREE from 'three';

// El carro se desplaza sobre dos raíles: el hombro acompaña la carga y nunca
// exige al brazo una extensión mayor a la suma de sus dos segmentos.
export function articulacion(hombro, punta, l = 3.8) {
  const h = new THREE.Vector3(...hombro), p = new THREE.Vector3(...punta);
  const d = p.clone().sub(h), distancia = d.length();
  const perpendicular = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y / Math.max(d.lengthSq(), .001)).normalize();
  return h.addScaledVector(d, .5).addScaledVector(perpendicular, Math.sqrt(Math.max(0, l * l - distancia * distancia / 4))).toArray();
}

export const DURACION_MONTAJE = 8;
export const ENTREGA = .69;
const REPOSO = [-5.4, 2.9, 3.4];
const RECOGIDA = [-5.4, 1.6, 4.2];
// Cada tramo termina con velocidad cero para sujetar o soltar sin saltos.
export function cicloMontaje(k, fin) {
  const alto = [fin[0], Math.max(4.3, fin[1] + 1.5), fin[2]];
  const claves = [[0, REPOSO], [.12, RECOGIDA], [.2, RECOGIDA], [.34, [-5.4, 4.3, 4.2]], [.53, alto], [.66, fin], [.78, fin], [.87, alto], [1, REPOSO]];
  const tramo = claves.findIndex(([t]) => t >= k);
  const i = Math.max(1, tramo < 0 ? claves.length - 1 : tramo);
  const [ta, a] = claves[i - 1], [tb, b] = claves[i];
  const t = THREE.MathUtils.smoothstep(k, ta, tb);
  const punta = a.map((v, j) => THREE.MathUtils.lerp(v, b[j], t));
  const avance = THREE.MathUtils.smoothstep(k, .34, .53) * (1 - THREE.MathUtils.smoothstep(k, .87, 1));
  const bx = THREE.MathUtils.lerp(-5.6, Math.min(5, fin[0] - 1.5), avance);
  const cerrar = THREE.MathUtils.smoothstep(k, .12, .2) * (1 - THREE.MathUtils.smoothstep(k, .69, .77));
  const etapa = k < .12 ? 'Recogiendo módulo' : k < .2 ? 'Sujetando pieza' : k < .53 ? 'Trasladando al ensamblaje' : k < .66 ? 'Alineando conectores' : k < .78 ? 'Fijando y verificando' : 'Retirando brazo';
  return { punta, bx, apertura: .37 - cerrar * .2, etapa, recogida: k >= .2, entregada: k >= ENTREGA, soldando: k >= .66 && k < .78 };
}

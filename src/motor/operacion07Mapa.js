// Etapa 07 · v2 3D: funciones PURAS que traducen el motor (`operacion07.js`) a la escena 3D. No cambian ninguna mecánica.
// Fase 1: el lienzo del boceto (900 × 520) pasa a la franja de superficie con un mapeo LINEAL y exacto: x del motor → X del mundo
// (el visor, X_VISOR, queda en X = 0) e y del motor → Z del mundo (el centro de la banda del visor, Y_MIN..Y_MAX, queda en Z = 0).
// La misma escala en los dos ejes mantiene las tolerancias del motor (±40) como un cuadro de lado 2 · 40 · K_MUNDO en el suelo.
import { CONFIG_OPERACION as C, calidadSenal } from './operacion07.js';

export const K_MUNDO = 0.04; // unidades de mundo por unidad del motor
export const Y_CENTRO = (C.Y_MIN + C.Y_MAX) / 2;
export const mundoX = x => (x - C.X_VISOR) * K_MUNDO;
export const mundoZ = y => (y - Y_CENTRO) * K_MUNDO;
export const motorX = X => X / K_MUNDO + C.X_VISOR;
export const motorY = Z => Z / K_MUNDO + Y_CENTRO;
export const mundoRadio = r => r * K_MUNDO;

// Curvatura del planeta: la superficie es plana donde se juega (Z ≥ −9; el visor va entre −8,2 y 8,2) y se curva hacia abajo
// hacia el fondo (horizonte) y, muy poco, hacia los lados (limbo curvo). Solo altura: no toca el mapeo X/Z.
export const CURVA = { kx: 0.0012, kz: 0.012, z0: -9 };
export const alturaSuelo = (x, z) => -(CURVA.kx * x * x + CURVA.kz * Math.max(0, CURVA.z0 - z) ** 2);

// ¿El objetivo está dentro de la retícula? La misma condición de `capturarF1`, pero medida en el mundo 3D (para probar que calzan).
export const dentroDeRetículaMundo = (Xobj, Zobj, Zvisor) => Math.abs(Xobj) < C.TOLERANCIA_X * K_MUNDO && Math.abs(Zobj - Zvisor) < C.TOLERANCIA_Y * K_MUNDO;

// Fase 3: dirección de la antena en el plano de la pantalla. 0° = a la izquierda, 90° = arriba, 180° = a la derecha (igual que el dibujo 2D).
export const direccionAntena = angulo => { const a = (angulo * Math.PI) / 180; return { x: -Math.cos(a), y: Math.sin(a) }; };
// Giro (rad, eje Z) del plato respecto de «arriba» para ese ángulo.
export const giroAntena = angulo => ((90 - angulo) * Math.PI) / 180;
// Calidad de la señal (0..1) de la antena apuntada a `angulo` con la Tierra en `tierra`.
export const calidadSenal01 = (angulo, tierra) => calidadSenal(angulo, tierra) / 100;

// Fase 2: mezcla de gases de la hipótesis. Devuelve los pesos (suman 1, o 0 si no hay nada) y el color RGB (0..1) promedio ponderado.
export function mezclaGases(gases, niveles) {
  const total = gases.reduce((a, _, i) => a + (niveles[i] || 0), 0);
  const pesos = gases.map((_, i) => (total > 0 ? (niveles[i] || 0) / total : 0));
  const rgb = [0.62, 0.72, 0.82]; // sin gases: bruma neutra
  if (total > 0) {
    rgb[0] = rgb[1] = rgb[2] = 0;
    gases.forEach((g, i) => { const n = parseInt(g.color.slice(1), 16); rgb[0] += pesos[i] * ((n >> 16) & 255) / 255; rgb[1] += pesos[i] * ((n >> 8) & 255) / 255; rgb[2] += pesos[i] * (n & 255) / 255; });
  }
  return { total, pesos, rgb };
}

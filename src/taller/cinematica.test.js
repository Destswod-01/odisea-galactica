import { describe, expect, it } from 'vitest';
import { articulacion, cicloMontaje, ENTREGA } from './cinematica.js';

const distancia = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
describe('Brazo de montaje sobre rieles', () => {
  it('conserva la longitud de ambos segmentos durante todo el trayecto y alcanza los extremos de la nave', () => {
    // Bus, antena, alas gigantes, magnetómetro en su extremo y sonda inferior.
    for (const fin of [[0, 2.3, 0], [0, 3.8, 0], [4.23, 2.18, 0], [8.13, 2.18, 0], [0, .65, 0]]) {
      for (let paso = 0; paso <= 40; paso++) {
        const { punta, bx } = cicloMontaje(paso / 40, fin);
        const h = [bx, 1.5, 1.4];
        const c = articulacion(h, punta);
        expect(distancia(h, punta)).toBeLessThan(7.6);
        expect(distancia(h, c)).toBeCloseTo(3.8, 6);
        expect(distancia(c, punta)).toBeCloseTo(3.8, 6);
        expect(c.every(Number.isFinite)).toBe(true);
      }
    }
  });
  it('recoge antes de entregar y vuelve exactamente al reposo sin teletransportarse', () => {
    const fin = [4.23, 2.18, 0];
    expect(cicloMontaje(.19, fin).recogida).toBe(false);
    expect(cicloMontaje(.2, fin).recogida).toBe(true);
    expect(cicloMontaje(ENTREGA - .001, fin).entregada).toBe(false);
    expect(cicloMontaje(ENTREGA, fin).punta).toEqual(fin);
    expect(cicloMontaje(ENTREGA, fin).entregada).toBe(true);
    expect(cicloMontaje(1, fin).punta).toEqual(cicloMontaje(0, fin).punta);
    expect(cicloMontaje(1, fin).bx).toBe(-5.6);
    for (const k of [.12, .2, .34, .53, .66, .78, .87]) {
      expect(distancia(cicloMontaje(k - .00001, fin).punta, cicloMontaje(k + .00001, fin).punta)).toBeLessThan(.001);
    }
  });
});

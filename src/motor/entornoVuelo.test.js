import { expect, it } from 'vitest';
import { posicionAscenso, RADIO_TIERRA_ESCENA, progresoSeparacion } from './entornoVuelo.js';
it('el ascenso se aleja de una Tierra fija, no se dirige hacia ella', () => {
  let previa = 0;
  for (let d = 0; d <= 800; d += 20) {
    const [x, y, z] = posicionAscenso(0, 0, d);
    const distancia = Math.hypot(x, y + RADIO_TIERRA_ESCENA, z);
    expect(distancia).toBeGreaterThan(previa); expect(y).toBeGreaterThan(0); previa = distancia;
  }
});
it('la separación tiene una espera inicial y termina sin exceder el recorrido', () => {
  expect(progresoSeparacion(0)).toBe(0); expect(progresoSeparacion(1)).toBe(0);
  expect(progresoSeparacion(3)).toBeGreaterThan(0); expect(progresoSeparacion(6)).toBe(1);
});

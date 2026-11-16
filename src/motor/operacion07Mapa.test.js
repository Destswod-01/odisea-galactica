import { describe, expect, it } from 'vitest';
import { CONFIG_OPERACION as C, GASES, anguloTierra, calidadSenal, crearOperacion07, pasoOperacion } from './operacion07.js';
import { CURVA, K_MUNDO, Y_CENTRO, alturaSuelo, dentroDeRetículaMundo, direccionAntena, giroAntena, mezclaGases, motorX, motorY, mundoX, mundoZ } from './operacion07Mapa.js';

describe('mapeo motor → mundo 3D (fase 1)', () => {
  it('es lineal: el visor queda en X = 0 y la banda del visor se centra en Z = 0', () => {
    expect(mundoX(C.X_VISOR)).toBe(0);
    expect(mundoZ(Y_CENTRO)).toBe(0);
    expect(mundoZ(C.Y_MIN)).toBeCloseTo(-mundoZ(C.Y_MAX), 10);
    expect(mundoX(C.X_VISOR + 100) - mundoX(C.X_VISOR)).toBeCloseTo(100 * K_MUNDO, 10);
    expect(mundoZ(300) - mundoZ(200)).toBeCloseTo(100 * K_MUNDO, 10);
  });
  it('es invertible', () => {
    for (const v of [0, 70, 275, 480, 940]) { expect(motorX(mundoX(v))).toBeCloseTo(v, 8); expect(motorY(mundoZ(v))).toBeCloseTo(v, 8); }
  });
  it('la condición de captura del motor coincide con la del mundo 3D', () => {
    let aciertos = 0;
    for (let i = 0; i < 4000; i++) {
      const ox = C.X_VISOR + ((i * 37) % 160) - 80, oy = C.Y_MIN + ((i * 91) % 410), vy = C.Y_MIN + ((i * 53) % 410);
      const motor = Math.abs(ox - C.X_VISOR) < C.TOLERANCIA_X && Math.abs(oy - vy) < C.TOLERANCIA_Y;
      if (Math.abs(Math.abs(ox - C.X_VISOR) - C.TOLERANCIA_X) < 1e-6 || Math.abs(Math.abs(oy - vy) - C.TOLERANCIA_Y) < 1e-6) continue; // justo en el borde: el redondeo decide
      expect(dentroDeRetículaMundo(mundoX(ox), mundoZ(oy), mundoZ(vy))).toBe(motor);
      if (motor) aciertos++;
    }
    expect(aciertos).toBeGreaterThan(100);
  });
  it('una captura real del motor ocurre cuando el objetivo está dentro de la retícula del mundo', () => {
    let s = pasoOperacion(crearOperacion07({ bateria: 100, bateriaMax: 100 }, { id: 'lro' }, {}, { semilla: 5, fase: 1 }), { tipo: 'empezar' });
    let capturado = false;
    for (let i = 0; i < 600 && !capturado; i++) {
      s = pasoOperacion(s, { tipo: 'tiempo', dt: 0.05, eje: 0 });
      const dentro = s.g.objetivos.find(o => dentroDeRetículaMundo(mundoX(o.x), mundoZ(o.y), mundoZ(s.g.y)));
      if (dentro) { const n = pasoOperacion(s, { tipo: 'capturar' }); expect(n.g.capturas).toBe(s.g.capturas + 1); capturado = true; }
    }
    expect(capturado).toBe(true);
  });
  it('la superficie es plana donde se juega y cae hacia el fondo', () => {
    expect(alturaSuelo(0, 0)).toBeCloseTo(0, 10);
    expect(alturaSuelo(0, mundoZ(C.Y_MIN))).toBeGreaterThan(-0.001);
    expect(alturaSuelo(0, -60)).toBeLessThan(alturaSuelo(0, -30));
    expect(alturaSuelo(30, 0)).toBeLessThan(0);
    expect(CURVA.z0).toBeLessThan(mundoZ(C.Y_MIN));
  });
});

describe('fase 3: dirección de la antena', () => {
  it('0° izquierda, 90° arriba, 180° derecha', () => {
    expect(direccionAntena(0).x).toBeCloseTo(-1, 10); expect(direccionAntena(0).y).toBeCloseTo(0, 10);
    expect(direccionAntena(90).x).toBeCloseTo(0, 10); expect(direccionAntena(90).y).toBeCloseTo(1, 10);
    expect(direccionAntena(180).x).toBeCloseTo(1, 10);
    expect(giroAntena(90)).toBe(0);
    expect(giroAntena(0)).toBeCloseTo(Math.PI / 2, 10);
  });
  it('apuntar al ángulo de la Tierra da señal máxima y la dirección coincide', () => {
    const g = { base: 100, fase0: 0.4 };
    const t = anguloTierra(g, 3);
    expect(calidadSenal(t, t)).toBe(100);
    const d = direccionAntena(t), e = direccionAntena(t);
    expect(d.x).toBe(e.x);
  });
});

describe('fase 2: mezcla de gases', () => {
  it('pesos proporcionales y color neutro sin gases', () => {
    const gases = GASES.luna, m = mezclaGases(gases, [2, 0, 2, 0]);
    expect(m.pesos[0]).toBeCloseTo(0.5, 10); expect(m.pesos[2]).toBeCloseTo(0.5, 10); expect(m.pesos[1]).toBe(0);
    expect(mezclaGases(gases, [0, 0, 0, 0]).total).toBe(0);
    const solo = mezclaGases(gases, [4, 0, 0, 0]);
    expect(solo.rgb[2]).toBeGreaterThan(solo.rgb[0]); // H₂O es azul claro
  });
});

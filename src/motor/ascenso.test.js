import { describe, expect, it } from 'vitest';
import { apoapsis, enMaxQ, pasoEstres, perdidaGuiado, perfilGiro } from './ascenso.js';
import { aplicarLanzamiento } from './mision.js';

describe('ascenso', () => {
  it('el giro empieza vertical y termina inclinado, sin retroceder', () => {
    expect(perfilGiro(0)).toBe(0);
    expect(perfilGiro(1)).toBeCloseTo(75);
    for (let p = 0; p < 1; p += 0.05) expect(perfilGiro(p + 0.05)).toBeGreaterThanOrEqual(perfilGiro(p));
  });
  it('dentro de la tolerancia no se pierde nada', () => {
    expect(perdidaGuiado(3, 5, 1)).toBe(0);
    expect(perdidaGuiado(-8, 5, 1)).toBeCloseTo(18);
  });
  it('a todo empuje en Max-Q el estrés sube; con empuje bajo, baja', () => {
    const p = 0.25;
    expect(enMaxQ(p)).toBe(true);
    let s = 0;
    for (let k = 0; k < 30; k++) s = pasoEstres(s, p, 1, 0.1);
    expect(s).toBe(1);
    for (let k = 0; k < 10; k++) s = pasoEstres(s, p, 0.6, 0.1);
    expect(s).toBeLessThan(1);
  });
  it('con el Δv objetivo la apoapsis toca el destino', () => {
    expect(apoapsis(1000, 50, 200, 1000)).toBeCloseTo(200);
    expect(apoapsis(500, 50, 200, 1000)).toBeLessThan(200);
  });
  it('la pérdida por guiado y la sobrecarga llegan a la misión', () => {
    const e0 = { dvRestante: 2000, salud: 100, decisiones: [] };
    const e = aplicarLanzamiento(e0, { etapas: [], errorApagado: 0, perdidaGuiado: 80, sobrecarga: true });
    expect(e.dvRestante).toBe(1920);
    expect(e.salud).toBe(90);
    expect(e.decisiones.some((d) => d.texto.includes('Max-Q'))).toBe(true);
  });
});

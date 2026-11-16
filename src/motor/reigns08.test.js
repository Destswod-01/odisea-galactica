import { describe, expect, it } from 'vitest';
import {
  aplicarReigns08,
  BARRAS_REIGNS,
  crearReigns08,
  opcionesFinalReigns,
  pasoReigns08,
  preverIndicadores,
} from './reigns08.js';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';

const ESTADO = { bateria: 1600, bateriaMax: 2000, dvRestante: 140, salud: 90, ciencia: 0.6, decisiones: [] };

describe('reigns08 (Decisiones de misión estilo Reigns)', () => {
  it('inicia en ficha con las 4 barras y el mazo específico de LRO o Juno', () => {
    const sLro = crearReigns08(ESTADO, lro);
    const sJuno = crearReigns08(ESTADO, juno);
    expect(sLro.fase).toBe('ficha');
    for (const k of BARRAS_REIGNS) {
      expect(sLro.barras[k]).toBeGreaterThan(0);
      expect(sLro.barras[k]).toBeLessThanOrEqual(100);
    }
    expect(sLro.mazo[0].id).toMatch(/^real_/);
    expect(sJuno.mazo.some(c => c.id === 'io')).toBe(true);
    expect(sLro.mazo.some(c => c.id === 'hielo')).toBe(true);
  });

  it('preverIndicadores distingue cambios chicos, grandes y nulos', () => {
    expect(preverIndicadores({ energia: -18, termica: 8, propelente: 0, ciencia: 20 })).toEqual({
      energia: 'grande',
      termica: 'chico',
      propelente: null,
      ciencia: 'grande',
    });
  });

  it('recorre el mazo y termina en la decisión real de fin de vida de Juno (hundir en Júpiter) con extras e idempotencia', () => {
    let s = pasoReigns08(crearReigns08(ESTADO, juno), { tipo: 'empezar' });
    // Evita fallo prematuro durante la prueba eligiendo opciones balanceadas.
    let guard = 0;
    while (s.fase !== 'final' && guard++ < 30) {
      if (s.fase === 'jugando') s = pasoReigns08(s, { tipo: 'elegir', lado: guard === 1 ? 1 : 0 });
      else if (s.fase === 'consecuencia') s = pasoReigns08(s, { tipo: 'siguiente' });
    }
    expect(s.fase).toBe('final');
    const ops = opcionesFinalReigns(s);
    expect(ops.map(o => o.id)).toEqual(['hundir', 'orbita']);

    s = pasoReigns08(s, { tipo: 'finalizar', id: 'hundir' });
    expect(s.fase).toBe('cierre');
    expect(s.desorbito).toBe(true);
    expect(s.epilogo).toBeTruthy();

    const r1 = aplicarReigns08(ESTADO, s);
    expect(r1.estado.misionExtendida).toBeTruthy();
    expect(r1.extras.desorbito).toBe(true);
    expect(r1.estado.ciencia).toBeGreaterThanOrEqual(ESTADO.ciencia);
    const r2 = aplicarReigns08(r1.estado, s);
    expect(r2.estado).toBe(r1.estado);
  });

  it('corta a final forzado si una barra crítica llega a 0', () => {
    let s = pasoReigns08(crearReigns08(ESTADO, lro), { tipo: 'empezar' });
    s = { ...s, barras: { ...s.barras, energia: 1 } };
    // Carta real de LRO op 0 tiene energia: -6 → cae a 0.
    s = pasoReigns08(s, { tipo: 'elegir', lado: 0 });
    expect(s.ultima.finAnticipado).toBe('silencio');
    s = pasoReigns08(s, { tipo: 'siguiente' });
    expect(s.fase).toBe('final');
    expect(opcionesFinalReigns(s).map(o => o.id)).toEqual(['silencio']);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { borrarIntentos, leerIntentos, MAX_INTENTOS, registrarIntento, resumenCorto, simulacionRapida } from './intentos.js';
import { disenoReal, resumenNave } from './nave.js';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';

const memoria = () => {
  const m = {};
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } };
};
const sim = (diseno) => simulacionRapida(resumenNave(diseno, piezas, cohetes, lro), lro, diseno, piezas);

describe('simulación rápida', () => {
  it('es determinista y trae 2 a 4 motivos', () => {
    const d = disenoReal(lro, piezas);
    const a = sim(d), b = sim(d);
    expect(a).toEqual(b);
    expect(a.puntaje).toBeGreaterThanOrEqual(0);
    expect(a.puntaje).toBeLessThanOrEqual(100);
    expect(a.motivos.length).toBeGreaterThanOrEqual(2);
    expect(a.motivos.length).toBeLessThanOrEqual(4);
    expect(a.requisitos.total).toBeGreaterThan(0);
  });
  it('un diseño sin instrumentos puntúa menos que el real', () => {
    const real = disenoReal(lro, piezas);
    expect(sim({ ...real, instrumentos: [] }).puntaje).toBeLessThan(sim(real).puntaje);
  });
  it('funciona sin la lista de piezas', () => {
    const d = disenoReal(lro, piezas);
    expect(() => simulacionRapida(resumenNave(d, piezas, cohetes, lro), lro, d)).not.toThrow();
  });
  it('resumenCorto redondea', () => {
    const d = disenoReal(lro, piezas);
    const r = resumenCorto(resumenNave(d, piezas, cohetes, lro), lro, d);
    for (const k of ['masa', 'costo', 'ciencia', 'datosPerdidos']) expect(Number.isInteger(r[k])).toBe(true);
  });
});

describe('historial de intentos', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoria()); });
  const guardar = (misionId, puntaje) => registrarIntento({ misionId, diseno: {}, resumenCorto: {}, puntaje, tipo: 'simulacion', fecha: puntaje });

  it('máximo 5, el más nuevo primero', () => {
    for (let i = 1; i <= 7; i++) guardar('lro', i);
    const l = leerIntentos('lro');
    expect(l.length).toBe(MAX_INTENTOS);
    expect(l[0].puntaje).toBe(7);
    expect(l[4].puntaje).toBe(3);
  });
  it('es por misión y se puede borrar', () => {
    guardar('lro', 1);
    guardar('juno', 2);
    expect(leerIntentos('lro').length).toBe(1);
    expect(leerIntentos('juno')[0].puntaje).toBe(2);
    borrarIntentos('lro');
    expect(leerIntentos('lro')).toEqual([]);
    expect(leerIntentos('juno').length).toBe(1);
  });
  it('sin almacenamiento no lanza errores', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => guardar('lro', 1)).not.toThrow();
    expect(leerIntentos('lro')).toEqual([]);
    expect(() => borrarIntentos('lro')).not.toThrow();
    vi.stubGlobal('localStorage', { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
    expect(() => guardar('lro', 1)).not.toThrow();
  });
});

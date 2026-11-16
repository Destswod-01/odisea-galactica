import { beforeEach, describe, expect, it } from 'vitest';
import { borrarPartida, CLAVE_PARTIDA, etiquetaFase, guardarPartida, leerPartida } from './partida.js';

// Almacenamiento simulado en memoria (el entorno de pruebas puede no traer localStorage).
const memoria = {};
globalThis.localStorage = {
  getItem: k => (k in memoria ? memoria[k] : null),
  setItem: (k, v) => { memoria[k] = String(v); },
  removeItem: k => { delete memoria[k]; },
};

const base = { misionId: 'lro', fase: 'leop', estado: { combustible: 5 }, diseno: { cohete: 'atlas_v_401' }, estetica: {}, extras: {}, vistos: ['a'] };

describe('partida', () => {
  beforeEach(() => { for (const k of Object.keys(memoria)) delete memoria[k]; });

  it('ida y vuelta', () => {
    guardarPartida(base);
    const p = leerPartida();
    expect(p).toMatchObject(base);
    expect(p.v).toBe(1);
    expect(typeof p.guardado).toBe('number');
  });
  it('sin nada guardado devuelve null', () => expect(leerPartida()).toBeNull());
  it('JSON corrupto devuelve null', () => {
    memoria[CLAVE_PARTIDA] = '{no es json';
    expect(leerPartida()).toBeNull();
  });
  it('versión distinta devuelve null', () => {
    memoria[CLAVE_PARTIDA] = JSON.stringify({ ...base, v: 2 });
    expect(leerPartida()).toBeNull();
  });
  it('fase inválida o menú devuelve null', () => {
    memoria[CLAVE_PARTIDA] = JSON.stringify({ ...base, v: 1, fase: 'fantasma' });
    expect(leerPartida()).toBeNull();
    memoria[CLAVE_PARTIDA] = JSON.stringify({ ...base, v: 1, fase: 'menu' });
    expect(leerPartida()).toBeNull();
  });
  it('faltan campos obligatorios devuelve null', () => {
    for (const campo of ['misionId', 'fase', 'diseno']) {
      const { [campo]: _quitado, ...resto } = base;
      memoria[CLAVE_PARTIDA] = JSON.stringify({ ...resto, v: 1 });
      expect(leerPartida()).toBeNull();
    }
  });
  it('borrar elimina el punto de control', () => {
    guardarPartida(base);
    borrarPartida();
    expect(leerPartida()).toBeNull();
  });
  it('estado null es válido (hangar)', () => {
    guardarPartida({ ...base, fase: 'hangar', estado: null });
    expect(leerPartida().estado).toBeNull();
  });
  it('etiquetaFase cubre todas las fases', () => {
    const fases = ['menu', 'briefing', 'hangar', 'lanzamiento', 'leop', 'crucero', 'llegada', 'encuentro', 'insercion', 'operacion', 'extendida', 'informe'];
    for (const f of fases) expect(etiquetaFase(f)).not.toBe('Misión');
    expect(etiquetaFase('encuentro')).toBe('Etapa 05 · Aproximación y encuentro');
    expect(etiquetaFase('insercion')).toBe('Etapa 06 · Inserción orbital');
    expect(etiquetaFase('operacion')).toBe('Etapa 07 · Operación científica');
    expect(etiquetaFase('extendida')).toBe('Etapa 08 · Misión extendida');
    expect(etiquetaFase('hangar')).toBe('Etapa 01 · Hangar');
    expect(etiquetaFase('crucero')).toBe('Etapa 04 · Red de observación');
    expect(etiquetaFase('informe')).toBe('Informe');
    expect(etiquetaFase('zzz')).toBe('Misión');
  });
});

describe('partida · dificultad', () => {
  it('guarda y recupera la dificultad', () => {
    guardarPartida({ ...base, dificultad: 'principiante' });
    expect(leerPartida().dificultad).toBe('principiante');
  });
});

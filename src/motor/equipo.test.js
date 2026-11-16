import { describe, expect, it } from 'vitest';
import { conflictos, crearEquipo, esEquipo, evaluarRoles, puntuacionEquipo, ROLES, turnoDeEstacion, votar, votoSugerido } from './equipo.js';
import { disenoReal, resumenNave } from './nave.js';
import { requisitos } from './requisitos.js';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';

const real = () => {
  const d = disenoReal(lro, piezas);
  const r = resumenNave(d, piezas, cohetes, lro);
  return { d, r, req: requisitos(lro, r, d) };
};

describe('modo equipo: roles y turnos', () => {
  it('reparte los 4 roles entre 1, 2, 3 o 4 jugadores sin que falte ninguno', () => {
    for (let n = 1; n <= 4; n++) {
      const e = crearEquipo(Array.from({ length: n }, (_, i) => `J${i + 1}`));
      expect(e.jugadores).toHaveLength(n);
      const roles = e.jugadores.flatMap((j) => j.roles).sort();
      expect(roles).toEqual(ROLES.map((r) => r.id).sort());
    }
  });

  it('ignora nombres vacíos, corta a 4 y nunca queda sin jugadores', () => {
    expect(crearEquipo(['  ', 'Ana', '', 'Beto']).jugadores.map((j) => j.nombre)).toEqual(['Ana', 'Beto']);
    expect(crearEquipo(['a', 'b', 'c', 'd', 'e']).jugadores).toHaveLength(4);
    expect(crearEquipo([]).jugadores).toHaveLength(1);
    expect(esEquipo(crearEquipo(['solo']))).toBe(false);
    expect(esEquipo(crearEquipo(['a', 'b']))).toBe(true);
  });

  it('cada estación del hangar tiene un responsable', () => {
    const e = crearEquipo(['Ana', 'Beto', 'Caro', 'Dani']);
    expect(turnoDeEstacion(e, 'instrumentos').jugador.nombre).toBe('Caro');
    expect(turnoDeEstacion(e, 'cohete').rol).toBe('direccion');
    expect(turnoDeEstacion(e, 'energia').rol).toBe('ingenieria');
    expect(turnoDeEstacion(e, 'blindaje').rol).toBe('ciencia');
    expect(turnoDeEstacion(e, 'antena').rol).toBe('recursos');
    expect(turnoDeEstacion(e, 'orbita').jugador.nombre).toBe('Ana');
    expect(turnoDeEstacion(e, 'desconocida').rol).toBe('direccion');
  });
});

describe('modo equipo: evaluación, conflictos y votación', () => {
  it('la nave real de LRO deja contentos a los 4 roles', () => {
    const { r, req } = real();
    const ev = evaluarRoles(r, req);
    for (const rol of ROLES) expect(ev[rol.id].ok, rol.id).toBe(true);
    expect(conflictos(r, ev)).toEqual([]);
  });

  it('sin instrumentos, Ciencia pide cambios y Dirección ve requisitos fallidos', () => {
    const { d } = real();
    const sin = { ...d, instrumentos: [] };
    const r = resumenNave(sin, piezas, cohetes, lro);
    const ev = evaluarRoles(r, requisitos(lro, r, sin));
    expect(ev.ciencia.ok).toBe(false);
    expect(ev.direccion.ok).toBe(false);
    expect(votoSugerido(ev, 'ciencia')).toBe('cambio');
  });

  it('si Ciencia quiere más y no queda presupuesto, aparece el conflicto Ciencia-Recursos', () => {
    const { r } = real();
    const apretado = { ...r, ciencia: { ...r.ciencia, total: 0.4 }, barras: { ...r.barras, costo: { ...r.barras.costo, valor: r.barras.costo.limite - 10 } } };
    const ids = conflictos(apretado, evaluarRoles(apretado, [])).map((c) => c.id);
    expect(ids).toContain('ciencia-presupuesto');
  });

  it('votar cuenta rondas y vetos y aprueba solo por unanimidad', () => {
    let e = crearEquipo(['a', 'b', 'c', 'd']);
    e = votar(e, { direccion: 'aprueba', ingenieria: 'cambio', ciencia: 'aprueba', recursos: 'cambio' });
    expect(e).toMatchObject({ rondas: 1, vetos: 2, aprobado: false });
    e = votar(e, { direccion: 'aprueba', ingenieria: 'aprueba', ciencia: 'aprueba', recursos: 'aprueba' });
    expect(e).toMatchObject({ rondas: 2, vetos: 2, aprobado: true });
  });
});

describe('modo equipo: puntuación', () => {
  it('nave equilibrada y acuerdo rápido = bono máximo; muchas rondas lo bajan', () => {
    const { r, req } = real();
    const rapido = votar(crearEquipo(['a', 'b', 'c', 'd']), { direccion: 'aprueba', ingenieria: 'aprueba', ciencia: 'aprueba', recursos: 'aprueba' });
    const p = puntuacionEquipo(rapido, r, req);
    expect(p.equilibrada).toBe(true);
    expect(p.bono).toBeCloseTo(0.15);
    expect(p.jugadores).toHaveLength(4);
    for (const j of p.jugadores) expect(j.puntos).toBeGreaterThan(0);
    const lento = { ...rapido, rondas: 6 };
    expect(puntuacionEquipo(lento, r, req).bono).toBeLessThan(p.bono);
  });

  it('un jugador con dos roles recibe el promedio de ambos', () => {
    const { r, req } = real();
    const e = crearEquipo(['a', 'b']);
    const p = puntuacionEquipo(e, r, req);
    const a = p.jugadores[0];
    expect(a.roles).toEqual(['direccion', 'ciencia']);
    expect(a.puntos).toBe(Math.round((p.porRol.direccion + p.porRol.ciencia) / 2));
  });
});

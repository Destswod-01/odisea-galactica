import { describe, expect, it } from 'vitest';
import { construirMazoReigns, crearReigns08, pasoReigns08 } from '../motor/reigns08.js';
import { conectadosDe, enEquipo08, equipoAcierta, ladoAplicado, requisito, resolutorId, todosVotaron, votosDeConectados } from './votos08.js';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';

const v = (...x) => Object.fromEntries(x.map((l, i) => [`j${i}`, l]));

describe('requisito de votos', () => {
  it('novato 2, intermedio 3, experto todos', () => {
    expect([2, 3, 4].map((n) => requisito('principiante', n))).toEqual([2, 2, 2]);
    expect([2, 3, 4].map((n) => requisito('intermedio', n))).toEqual([2, 3, 3]);
    expect([2, 3, 4].map((n) => requisito('experto', n))).toEqual([2, 3, 4]);
  });
  it('acotado al número de jugadores conectados', () => {
    expect(requisito('intermedio', 2)).toBe(2);
    expect(requisito('principiante', 1)).toBe(1);
    expect(requisito('experto', 0)).toBe(1);
    expect(requisito('raro', 4)).toBe(3); // nivel desconocido = conocedor
  });
});

describe('equipoAcierta', () => {
  it('novato: dos aciertos bastan (de 4)', () => {
    expect(equipoAcierta(v(1, 1, 0, 0), 1, 'principiante', 4)).toBe(true);
    expect(equipoAcierta(v(1, 0, 0, 0), 1, 'principiante', 4)).toBe(false);
  });
  it('intermedio: 3 bastan; con 2 jugadores piden 2', () => {
    expect(equipoAcierta(v(0, 0, 0, 1), 0, 'intermedio', 4)).toBe(true);
    expect(equipoAcierta(v(0, 0, 1, 1), 0, 'intermedio', 4)).toBe(false);
    expect(equipoAcierta(v(0, 0), 0, 'intermedio', 2)).toBe(true);
    expect(equipoAcierta(v(0, 1), 0, 'intermedio', 2)).toBe(false);
  });
  it('experto: todos deben acertar', () => {
    expect(equipoAcierta(v(1, 1, 1), 1, 'experto', 3)).toBe(true);
    expect(equipoAcierta(v(1, 1, 0), 1, 'experto', 3)).toBe(false);
  });
  it('quien no votó cuenta como no acierto', () => {
    expect(equipoAcierta({ a: 1 }, 1, 'experto', 3)).toBe(false);
    expect(equipoAcierta({}, 0, 'principiante', 2)).toBe(false);
  });
  it('ladoAplicado: correcta si acierta, la otra si no', () => {
    expect(ladoAplicado(true, 0)).toBe(0);
    expect(ladoAplicado(false, 0)).toBe(1);
    expect(ladoAplicado(false, 1)).toBe(0);
  });
});

describe('sala', () => {
  const sala = (conectados, hostId = 'a') => ({
    hostId,
    estado: { fase: 'hangar' },
    jugadores: [['a', 'Ana'], ['b', 'Beto'], ['c', 'Caro']].map(([id, nombre], i) => ({ id, nombre, conectado: conectados[i] })),
  });
  it('en equipo con 2+ conectados y sala empezada', () => {
    expect(enEquipo08(sala([true, true, false]))).toBe(true);
    expect(enEquipo08(sala([true, false, false]))).toBe(false);
    expect(enEquipo08({ ...sala([true, true, true]), estado: { fase: 'espera' } })).toBe(false);
    expect(enEquipo08(null)).toBe(false);
  });
  it('resolutor: el anfitrión; si cae, el primero conectado', () => {
    expect(resolutorId(sala([true, true, true]))).toBe('a');
    expect(resolutorId(sala([false, true, true]))).toBe('b');
    expect(conectadosDe(sala([true, false, true])).map((j) => j.id)).toEqual(['a', 'c']);
  });
  it('todosVotaron y votosDeConectados', () => {
    expect(todosVotaron({ a: 0, b: 1 }, ['a', 'b'])).toBe(true);
    expect(todosVotaron({ a: 0 }, ['a', 'b'])).toBe(false);
    expect(todosVotaron({}, [])).toBe(false);
    expect(votosDeConectados({ a: 0, z: 1 }, ['a', 'b'])).toEqual({ a: 0 });
  });
});

describe('cartas de la etapa 08: correcta definida', () => {
  for (const [id, m] of [['lro', lro], ['juno', juno]]) {
    it(`${id}: todas las cartas tienen correcta 0|1 y la histórica coincide con la opción real`, () => {
      const mazo = construirMazoReigns(m);
      expect(mazo.length).toBeGreaterThan(5);
      for (const c of mazo) {
        expect([0, 1]).toContain(c.correcta);
        if (c.opciones.some((o) => o.real)) expect(c.opciones[c.correcta].real).toBe(true);
      }
    });
    it(`${id}: elegir registra si acertó y el conteo del equipo`, () => {
      let s = pasoReigns08(crearReigns08(null, m), { tipo: 'empezar' });
      const c = s.mazo[0];
      s = pasoReigns08(s, { tipo: 'elegir', lado: c.correcta, equipo: { votosOk: 3, requisito: 3, votantes: 4 } });
      expect(s.ultima.acierto).toBe(true);
      expect(s.ultima.equipo.votosOk).toBe(3);
      expect(s.aciertos).toBe(1);
    });
  }
});

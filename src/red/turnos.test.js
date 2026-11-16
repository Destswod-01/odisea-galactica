import { describe, expect, it } from 'vitest';
import { aceptarInstantanea, enRedDeSala, titularDePieza } from './turnos.js';

const J = (...ids) => ids.map((id) => ({ id, nombre: id.toUpperCase(), conectado: true }));

describe('titularDePieza (turnos por pieza)', () => {
  it('con 3 jugadores las piezas rotan a, b, c, a, b, c…', () => {
    const js = J('a', 'b', 'c');
    expect(Array.from({ length: 7 }, (_, i) => titularDePieza(js, i).id)).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a']);
  });
  it('salta a los desconectados y no se rompe sin jugadores', () => {
    const js = J('a', 'b', 'c');
    js[1].conectado = false;
    expect([0, 1, 2, 3, 4].map((i) => titularDePieza(js, i).id)).toEqual(['a', 'c', 'c', 'a', 'c']);
    expect(titularDePieza([], 3)).toBeNull();
    expect(titularDePieza(null, 3)).toBeNull();
  });
  it('enRedDeSala exige sala en juego y 2 o más jugadores', () => {
    expect(enRedDeSala(null)).toBe(false);
    expect(enRedDeSala({ estado: { fase: 'espera' }, jugadores: J('a', 'b') })).toBe(false);
    expect(enRedDeSala({ estado: { fase: 'juego' }, jugadores: J('a') })).toBe(false);
    expect(enRedDeSala({ estado: { fase: 'juego' }, jugadores: J('a', 'b') })).toBe(true);
  });
});

describe('aceptarInstantanea', () => {
  const js = J('a', 'b', 'c');
  it('el espectador aplica lo que manda el titular de esa pieza, nunca hacia atrás', () => {
    const actual = { n: 1, tick: 5 };
    expect(aceptarInstantanea({ jugadores: js, miId: 'a', actual, m: { de: 'b', s: { n: 1, tick: 6 } } })).toBe(true);
    expect(aceptarInstantanea({ jugadores: js, miId: 'a', actual, m: { de: 'b', s: { n: 1, tick: 4 } } })).toBe(false);
    expect(aceptarInstantanea({ jugadores: js, miId: 'a', actual, m: { de: 'b', s: { n: 0, tick: 99 } } })).toBe(false);
  });
  it('rechaza instantáneas de quien no tiene el turno o las propias', () => {
    const actual = { n: 1, tick: 5 };
    expect(aceptarInstantanea({ jugadores: js, miId: 'a', actual, m: { de: 'c', s: { n: 1, tick: 9 } } })).toBe(false);
    expect(aceptarInstantanea({ jugadores: js, miId: 'a', actual, m: { de: 'a', s: { n: 1, tick: 9 } } })).toBe(false);
  });
  it('la entrega: el siguiente toma el control desde la última instantánea del anterior', () => {
    // b juega la pieza 1; al fijar manda n=2 (turno de c). c, que miraba en n=1, la acepta; a también.
    expect(aceptarInstantanea({ jugadores: js, miId: 'c', actual: { n: 1, tick: 20 }, m: { de: 'b', s: { n: 2, tick: 21 } } })).toBe(true);
    expect(aceptarInstantanea({ jugadores: js, miId: 'a', actual: { n: 1, tick: 20 }, m: { de: 'b', s: { n: 2, tick: 21 } } })).toBe(true);
  });
  it('el titular de su pieza ignora instantáneas de su propia pieza (no se pisa a sí mismo)', () => {
    expect(aceptarInstantanea({ jugadores: js, miId: 'c', actual: { n: 2, tick: 3 }, m: { de: 'b', s: { n: 2, tick: 99 } } })).toBe(false);
  });
});

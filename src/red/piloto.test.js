import { describe, expect, it } from 'vitest';
import { ETAPAS_ESPEJO, pilotoDeEtapa } from './piloto.js';

const J = (...ids) => ids.map((id) => ({ id, nombre: id, conectado: true }));

describe('pilotoDeEtapa', () => {
  it('con 2 jugadores se alternan', () => {
    const js = J('a', 'b');
    expect(ETAPAS_ESPEJO.map((f) => pilotoDeEtapa(js, f).id)).toEqual(['a', 'b', 'a', 'b', 'a']);
  });
  it('con 4 jugadores todos manejan al menos una etapa', () => {
    const js = J('a', 'b', 'c', 'd');
    const ids = new Set(ETAPAS_ESPEJO.map((f) => pilotoDeEtapa(js, f).id));
    expect(ids.size).toBe(4);
  });
  it('con 1 jugador maneja todas; sin jugadores o fase sin espejo, null', () => {
    expect(pilotoDeEtapa(J('a'), 'leop').id).toBe('a');
    expect(pilotoDeEtapa([], 'leop')).toBeNull();
    expect(pilotoDeEtapa(J('a', 'b'), 'operacion')).toBeNull();
    expect(pilotoDeEtapa(J('a', 'b'), 'hangar')).toBeNull();
  });
  it('si el piloto está desconectado, pasa al siguiente conectado', () => {
    const js = J('a', 'b', 'c'); js[0].conectado = false;
    expect(pilotoDeEtapa(js, 'lanzamiento').id).toBe('b');
    js[1].conectado = false; js[2].conectado = false;
    expect(pilotoDeEtapa(js, 'lanzamiento').id).toBe('a'); // nadie conectado: el que tocaba
  });
  it('es determinista: todos los clientes calculan lo mismo', () => {
    const js = J('a', 'b', 'c');
    expect(pilotoDeEtapa(js, 'crucero')).toBe(pilotoDeEtapa([...js], 'crucero'));
  });
});

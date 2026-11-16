import { describe, expect, it } from 'vitest';
import { requisitos, resumenRequisitos } from './requisitos.js';
import { disenoReal, resumenNave } from './nave.js';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';

const armar = (m, diseno) => requisitos(m, resumenNave(diseno, piezas, cohetes, m), diseno);

describe('requisitos de la misión', () => {
  for (const m of [lro, juno]) {
    it(`el diseño real de ${m.nombre} cumple masa, costo y Δv`, () => {
      const lista = armar(m, disenoReal(m, piezas));
      for (const id of ['masa', 'costo', 'dv']) expect(lista.find((r) => r.id === id).cumple, id).toBe(true);
      expect(lista.length).toBe(6 + m.objetivos.length);
      for (const r of lista) {
        expect(r.clave.startsWith('requisitos.')).toBe(true);
        expect(r.verificacion.startsWith('requisitos.')).toBe(true);
        expect(r.vars).toBeTruthy();
      }
    });
  }

  it('un diseño vacío falla varios y el conteo coincide', () => {
    const lista = armar(lro, { instrumentos: [] });
    const { cumplidos, total } = resumenRequisitos(lista);
    expect(total).toBe(lista.length);
    expect(cumplidos).toBe(lista.filter((r) => r.cumple).length);
    expect(cumplidos).toBeLessThan(total);
    expect(lista.filter((r) => r.id.startsWith('objetivo-')).every((r) => !r.cumple)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { mesesPieza, tiempoDesarrollo, BUS_MESES, PRUEBAS_MESES, FACTOR_AVANZADA } from './tiempo.js';

describe('recurso Tiempo', () => {
  it('mesesPieza usa el `meses` de la pieza o el valor por defecto de su categoría', () => {
    expect(mesesPieza({ categoria: 'antena', meses: 7 })).toBe(7);
    expect(mesesPieza({ categoria: 'antena' })).toBe(12);
    expect(mesesPieza(null)).toBe(0);
    expect(mesesPieza({ categoria: 'blindaje', masa_kg: 0 })).toBe(0);
  });
  it('los instrumentos van de 18 a 30 meses y las piezas avanzadas tardan 50 % más', () => {
    for (const i of piezas.filter((p) => p.categoria === 'instrumento')) {
      const m = mesesPieza(i);
      expect(m).toBeGreaterThanOrEqual(18);
      expect(m).toBeLessThanOrEqual(30);
    }
    expect(mesesPieza({ categoria: 'energia', avanzada: true })).toBe(Math.round(18 * FACTOR_AVANZADA));
  });
  it('el desarrollo es la cadena más larga más las pruebas, no la suma', () => {
    const t = tiempoDesarrollo([{ id: 'a', categoria: 'antena', meses: 40 }, { id: 'b', categoria: 'antena', meses: 38 }], { plazo_meses: 100 });
    expect(t.valor).toBe(40 + PRUEBAS_MESES);
    expect(t.cuello).toBe('a');
    expect(tiempoDesarrollo([], {}).valor).toBe(BUS_MESES + PRUEBAS_MESES);
  });
  it('sin plazo en la misión nunca falla', () => {
    const t = tiempoDesarrollo([{ id: 'x', categoria: 'antena', meses: 500 }], {});
    expect(t.limite).toBeNull();
    expect(t.ok).toBe(true);
  });
  it('las misiones traen plazo y el diseño real cabe dentro', () => {
    expect(lro.plazo_meses).toBe(54);
    expect(juno.plazo_meses).toBe(72);
    for (const m of [lro, juno]) {
      const b = resumenNave(disenoReal(m, piezas), piezas, cohetes, m).barras.tiempo;
      expect(b.limite).toBe(m.plazo_meses);
      expect(b.ok).toBe(true);
    }
  });
  it('una pieza avanzada alarga el desarrollo si es la más lenta', () => {
    const base = resumenNave(disenoReal(lro, piezas), piezas, cohetes, lro).barras.tiempo;
    const d = { ...disenoReal(lro, piezas), orientacion: 'orientacion_precision' };
    const r = resumenNave(d, piezas, cohetes, lro).barras.tiempo;
    expect(r.valor).toBeGreaterThanOrEqual(base.valor);
    expect(r.valor).toBe(Math.max(base.valor, 24 + PRUEBAS_MESES));
  });
});

import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import { disenoReal, resumenNave } from './nave.js';
import { estadoInicial, explicaciones } from './mision.js';
import { traducir } from '../i18n/idioma.js';

const nivel = (lista, recurso) => lista.find((x) => x.recurso === recurso)?.nivel;
const final = (resumen, mision, diseno, extra = {}) => ({ ...estadoInicial(resumen, mision, diseno), ciencia: 0.9, ...extra });

describe('explicaciones: ¿por qué salió así?', () => {
  it('un diseño con la antena chica marca mal en datos y explica el enlace', () => {
    const d = { ...disenoReal(lro, piezas), antena: 'antena_media' };
    const resumen = resumenNave(d, piezas, cohetes, lro);
    const lista = explicaciones(resumen, final(resumen, lro, d), lro);
    const datos = lista.find((x) => x.recurso === 'datos');
    expect(datos.nivel).toBe('mal');
    expect(datos.vars.pct).toBeGreaterThan(10);
    expect(traducir(datos.clave, datos.vars, null, 'es')).toContain(`perdiste ${datos.vars.pct} %`);
  });

  it('el diseño real de la NASA marca bien en masa, costo, energía, Δv y datos', () => {
    const d = disenoReal(lro, piezas);
    const resumen = resumenNave(d, piezas, cohetes, lro);
    const lista = explicaciones(resumen, final(resumen, lro, d), lro);
    for (const r of ['masa', 'energia', 'dv', 'datos', 'salud', 'ciencia']) expect(nivel(lista, r), r).toBe('bien');
    expect(lista.every((x) => x.nivel !== 'mal')).toBe(true);
  });

  it('todas las claves existen en español e inglés', () => {
    const d = disenoReal(lro, piezas);
    const resumen = resumenNave(d, piezas, cohetes, lro);
    const lista = explicaciones(resumen, final(resumen, lro, d, { salud: 10, modosSeguros: 2, ciencia: 0.2 }), lro);
    for (const x of lista) {
      expect(traducir(x.clave, x.vars, null, 'es'), x.clave).not.toBe(x.clave);
      expect(traducir(x.clave, x.vars, null, 'en'), x.clave).not.toMatch(/\{\w+\}/);
    }
    expect(nivel(lista, 'salud')).toBe('mal');
    expect(nivel(lista, 'energia')).toBe('mal');
    expect(nivel(lista, 'ciencia')).toBe('mal');
  });
});

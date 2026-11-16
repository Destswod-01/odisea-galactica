import { describe, expect, it } from 'vitest';
import { cohetesLocales, mezclarTextos, misionLocal, piezasLocales, traducir } from './idioma.js';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';

const TODOS = import.meta.glob('./*/*.js', { eager: true, import: 'default' });
const porIdioma = (idioma) => Object.fromEntries(Object.entries(TODOS).filter(([r]) => r.startsWith(`./${idioma}/`)).map(([r, d]) => [r.split('/')[2], d]));

describe('idioma: textos de la interfaz', () => {
  it('traduce, rellena variables y cae al español o a la clave', () => {
    expect(traducir('menu.iniciar', null, null, 'es')).toBe('Iniciar misión');
    expect(traducir('menu.iniciar', null, null, 'en')).toBe('Start mission');
    expect(traducir('menu.completaPara', { mision: 'LRO' }, null, 'en')).toBe('Complete LRO to unlock it.');
    expect(traducir('no.existe', null, 'porDefecto', 'en')).toBe('porDefecto');
    expect(traducir('no.existe', null, null, 'en')).toBe('no.existe');
  });

  it('cada bloque en inglés tiene las mismas claves que en español (las fase.* solo existen en inglés)', () => {
    const es = porIdioma('es'), en = porIdioma('en');
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const archivo of Object.keys(es)) {
      const ce = Object.keys(es[archivo]).sort();
      const ci = Object.keys(en[archivo]).filter((k) => !k.startsWith('fase.')).sort();
      expect({ archivo, claves: ci }).toEqual({ archivo, claves: ce });
    }
  });

  it('ninguna clave está repetida entre bloques', () => {
    for (const idioma of ['es', 'en']) {
      const vistas = new Map();
      for (const [archivo, d] of Object.entries(porIdioma(idioma))) {
        for (const k of Object.keys(d)) {
          expect(vistas.get(k), `${idioma}: «${k}» está en ${vistas.get(k)} y en ${archivo}`).toBeUndefined();
          vistas.set(k, archivo);
        }
      }
    }
  });
});

describe('idioma: datos (misiones, piezas y cohetes)', () => {
  it('mezclarTextos solo cambia textos: números, booleanos y lo que falte se quedan', () => {
    const base = { id: 'x', n: 3, ok: true, txt: 'hola', lista: [{ a: 'uno', v: 1 }, { a: 'dos', v: 2 }], sub: { b: 'b' } };
    const capa = { id: 'y', n: 'tres', ok: 'no', txt: 'hello', lista: [{ a: 'one', v: 'x' }], sub: { b: 'bee', extra: 'z' } };
    // El id también es texto: por eso las capas deben copiarlo igual (la prueba de abajo lo vigila).
    expect(mezclarTextos(base, capa)).toEqual({ id: 'y', n: 3, ok: true, txt: 'hello', lista: [{ a: 'one', v: 1 }, { a: 'dos', v: 2 }], sub: { b: 'bee' } });
  });

  it('en español los datos no cambian', () => {
    expect(misionLocal(lro, 'es')).toBe(lro);
    expect(piezasLocales(piezas, 'es')).toBe(piezas);
    expect(cohetesLocales(cohetes, 'es')).toBe(cohetes);
  });

  // Vigila las capas en inglés (tareas I2 e I3): mismos ids, tipos y números que el original.
  const textosQueNoSeTraducen = ['id', 'tipo', 'categoria', 'requiere', 'habilita', 'visual', 'real', 'objetivo', 'instrumento', 'minijuego', 'icono', 'cohete', 'piezas', 'mision', 'nombre_real'];
  const revisar = (orig, trad, ruta = '') => {
    if (Array.isArray(orig)) { expect(trad.length, `${ruta}: largo del arreglo`).toBe(orig.length); orig.forEach((o, i) => revisar(o, trad[i], `${ruta}[${i}]`)); return; }
    if (orig && typeof orig === 'object') { for (const k of Object.keys(orig)) revisar(orig[k], trad[k], `${ruta}.${k}`); return; }
    if (typeof orig !== 'string') { expect(trad, `${ruta}: no es texto, no se cambia`).toEqual(orig); return; }
    const clave = ruta.split('.').pop().replace(/\[\d+\]$/, '');
    // Solo se protegen los valores con forma de identificador (sin espacios): `real.cohete` es un id, `por_que.cohete` es texto.
    if (textosQueNoSeTraducen.includes(clave) && !/\s/.test(orig)) expect(trad, `${ruta}: es un identificador`).toBe(orig);
  };
  for (const m of [lro, juno]) {
    it(`misión ${m.id}: la capa en inglés (si existe) conserva ids y números`, () => revisar(m, misionLocal(m, 'en'), m.id));
  }
  it('piezas y cohetes: la capa en inglés (si existe) conserva ids y números', () => {
    revisar(piezas, piezasLocales(piezas, 'en'), 'piezas');
    revisar(cohetes, cohetesLocales(cohetes, 'en'), 'cohetes');
  });
});

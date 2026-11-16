import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { misionConDificultad } from './dificultad.js';
import { consejoPieza } from './consejo.js';
import es from '../i18n/es/consejo.js';
import en from '../i18n/en/consejo.js';

const VACIO = { energia: null, antena: null, blindaje: null, propulsion: null, cohete: null, instrumentos: [] };
const ctx = (mision, diseno) => ({ mision, diseno, piezas, cohetes, resumen: resumenNave(diseno, piezas, cohetes, mision) });
const pz = (id) => piezas.find((p) => p.id === id);
const mLro = misionConDificultad(lro, 'principiante');
const mJuno = misionConDificultad(juno, 'principiante');

describe('consejo de piezas', () => {
  it('un instrumento de Juno no sirve para LRO', () => {
    const ajeno = piezas.find((p) => p.categoria === 'instrumento' && p.mision === 'juno');
    const c = consejoPieza(ajeno, ctx(mLro, VACIO));
    expect(c.estado).toBe('no_sirve');
    expect(c.clave).toBe('consejo.instrumento.ninguno');
  });

  it('un instrumento de LRO con objetivo sin cubrir es recomendado, y ya elegido deja de serlo', () => {
    const propio = piezas.find((p) => p.categoria === 'instrumento' && p.mision === 'lro' && !p.requiere);
    expect(consejoPieza(propio, ctx(mLro, VACIO)).estado).toBe('recomendada');
    expect(consejoPieza(propio, ctx(mLro, { ...VACIO, instrumentos: [propio.id] })).estado).toBe('normal');
  });

  it('un instrumento que requiere algo sin habilitar da una pista, no se apaga', () => {
    const ka = piezas.find((p) => p.categoria === 'instrumento' && p.requiere);
    const c = consejoPieza(ka, ctx(mJuno, VACIO));
    expect(c.estado).toBe('normal');
    expect(c.clave).toBe('consejo.instrumento.necesita');
    expect(c.vars.x).toBeTruthy();
  });

  it('un cohete chico para un diseño pesado no sirve y el más barato que alcanza se recomienda', () => {
    const real = disenoReal(juno, piezas);
    const c = ctx(mJuno, real);
    const chico = [...cohetes].sort((a, z) => a.capacidad_kg - z.capacidad_kg)[0];
    expect(consejoPieza(chico, c).estado).toBe('no_sirve');
    const caben = cohetes.filter((k) => k.capacidad_kg * mJuno.capacidad_mult >= c.resumen.masaTotal).sort((a, z) => a.costo_musd - z.costo_musd);
    expect(consejoPieza(caben[0], c).estado).toBe('recomendada');
    if (caben[1]) expect(consejoPieza(caben[1], c).estado).toBe('normal');
  });

  it('energía: paneles chicos no alcanzan en Júpiter; la más barata que alcanza se recomienda', () => {
    const c = ctx(mJuno, disenoReal(juno, piezas));
    expect(consejoPieza(pz('panel_chico'), c).estado).toBe('no_sirve');
    const estados = piezas.filter((p) => p.categoria === 'energia').map((p) => consejoPieza(p, c).estado);
    expect(estados.filter((e) => e === 'recomendada')).toHaveLength(1);
  });

  it('las piezas avanzadas nunca se apagan y dicen por qué', () => {
    for (const p of piezas.filter((x) => x.avanzada)) {
      const c = consejoPieza(p, ctx(mLro, VACIO));
      expect(c.estado).toBe('normal');
      expect(c.clave).toBe('consejo.avanzada');
    }
  });

  it('lo demás es normal y las claves existen en español e inglés', () => {
    expect(consejoPieza(pz('antena_media'), ctx(mLro, VACIO))).toEqual({ estado: 'normal', clave: null, vars: {} });
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(es).every((k) => k.startsWith('consejo.'))).toBe(true);
  });
});

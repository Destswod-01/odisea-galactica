import { describe, it, expect } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { crearExtendida, CONFIG_EXTENDIDA as C } from './extendida08.js';
import { orbitasDe, orbitaElegida, orbitaReal, efectosOrbita, comparacionConReal } from './orbita.js';

const con = (m, orbita) => ({ ...disenoReal(m, piezas), ...(orbita ? { orbita } : {}) });
const res = (m, orbita) => resumenNave(con(m, orbita), piezas, cohetes, m);

describe('datos de órbitas', () => {
  it.each([lro, juno])('$id tiene 3 órbitas con una sola real y multiplicadores moderados', (m) => {
    const lista = orbitasDe(m);
    expect(lista).toHaveLength(3);
    expect(lista.filter((o) => o.real)).toHaveLength(1);
    for (const o of lista) {
      for (const k of ['id', 'nombre', 'altitud', 'descripcion', 'por_que']) expect(o[k], `${o.id}.${k}`).toBeTruthy();
      for (const k of ['ciencia', 'enlace', 'radiacion']) { expect(o.efectos[k]).toBeGreaterThanOrEqual(0.6); expect(o.efectos[k]).toBeLessThanOrEqual(1.3); }
    }
  });
  it('la órbita real no cambia ningún número', () => {
    for (const m of [lro, juno]) expect(orbitaReal(m).efectos).toMatchObject({ ciencia: 1, enlace: 1, dv_extra_ms: 0, radiacion: 1 });
  });
});

describe('orbitaElegida', () => {
  it('sin orbita en el diseño o con un id inválido devuelve la real', () => {
    expect(orbitaElegida(lro, {}).id).toBe('eliptica_30x180');
    expect(orbitaElegida(lro, { orbita: 'no_existe' }).id).toBe('eliptica_30x180');
    expect(orbitaElegida(juno, null).id).toBe('polar_53d');
    expect(orbitaElegida(juno, { orbita: 'ecuatorial' }).id).toBe('ecuatorial');
  });
  it('una misión sin órbitas no cambia nada', () => {
    const sin = { ...lro, orbitas: undefined };
    expect(orbitaElegida(sin, {})).toBeNull();
    expect(efectosOrbita(sin, {}).ciencia).toBe(1);
    expect(resumenNave(con(lro), piezas, cohetes, sin).ciencia.total).toBe(res(lro).ciencia.total);
  });
});

describe('resumenNave con órbita', () => {
  it('por defecto da lo mismo que una misión sin órbitas', () => {
    for (const m of [lro, juno]) {
      const base = resumenNave(con(m), piezas, cohetes, { ...m, orbitas: undefined });
      const r = res(m);
      expect(r.ciencia.total).toBe(base.ciencia.total);
      expect(r.enlace).toBe(base.enlace);
      expect(r.barras).toEqual(base.barras);
      expect(r.orbita.real).toBe(true);
    }
  });
  it('Juno 14 días da más ciencia y pide más Δv que 53 días', () => {
    // El dise�o real ya cubre el 100 %: con pocos instrumentos se ve la diferencia.
    const parcial = (o) => resumenNave({ ...con(juno, o), instrumentos: con(juno).instrumentos.slice(0, 2) }, piezas, cohetes, juno);
    const a = parcial('polar_53d'), b = parcial('polar_14d');
    expect(b.ciencia.total).toBeGreaterThan(a.ciencia.total);
    expect(b.barras.dv.limite).toBeGreaterThan(a.barras.dv.limite);
    expect(b.orbita.id).toBe('polar_14d');
  });
  it('LRO polar 200 km da menos ciencia y pide menos Δv', () => {
    const a = res(lro), b = res(lro, 'polar_200');
    expect(b.ciencia.total).toBeLessThan(a.ciencia.total);
    expect(b.barras.dv.limite).toBeLessThan(a.barras.dv.limite);
  });
  it('el enlace se multiplica y la cobertura nunca pasa de 1', () => {
    expect(res(lro, 'polar_50').enlace).toBeCloseTo(res(lro).enlace * 1.1, 6);
    for (const o of orbitasDe(lro)) for (const x of res(lro, o.id).ciencia.porObjetivo) expect(x.cobertura).toBeLessThanOrEqual(1);
  });
});

describe('comparación con la real', () => {
  it('marca mejor y peor', () => {
    const c = comparacionConReal(juno, orbitaElegida(juno, { orbita: 'polar_14d' }));
    expect(c).toEqual({ ciencia: 1, enlace: 0, dv: -1, vida: -1, radiacion: -1 });
    expect(Object.values(comparacionConReal(juno, orbitaReal(juno))).every((v) => v === 0)).toBe(true);
  });
});

describe('misión extendida (08)', () => {
  const estado = { bateria: 2000, bateriaMax: 2000, dvRestante: 300 };
  const crear = (m, orbita) => crearExtendida(estado, m, con(m, orbita), piezas, { semilla: 3 });
  it('por defecto conserva los años y la radiación de siempre', () => {
    expect(crear(lro).tope).toBe(C.ANOS.lro);
    expect(crear(juno).tope).toBe(C.ANOS.juno);
    expect(crear(juno).radMult).toBe(1);
  });
  it('la órbita cambia los años y la radiación', () => {
    expect(crear(lro, 'polar_50').tope).toBeLessThan(C.ANOS.lro);
    expect(crear(lro, 'polar_200').tope).toBeGreaterThan(C.ANOS.lro);
    expect(crear(juno, 'polar_14d').radMult).toBeGreaterThan(1);
    expect(crear(juno, 'ecuatorial').radMult).toBeLessThan(1);
  });
});

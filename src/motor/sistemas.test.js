import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import piezasEn from '../datos/piezas.en.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { misionConDificultad } from './dificultad.js';
import { requisitos } from './requisitos.js';
import { estadoInicial } from './mision.js';
import { aplicarOperacion07 } from './operacion07.js';
import { SISTEMAS, almacenamiento, apuntado, BATERIA_REF_WH } from './sistemas.js';

const real = (m) => disenoReal(m, piezas);

describe('categorías nuevas de piezas (B3)', () => {
  it('batería, computadora y orientación tienen 2 opciones: una simple y una avanzada', () => {
    for (const cat of SISTEMAS) {
      const lista = piezas.filter((p) => p.categoria === cat);
      expect(lista, cat).toHaveLength(2);
      expect(lista.filter((p) => p.avanzada)).toHaveLength(1);
      for (const p of lista) {
        expect(p.masa_kg).toBeGreaterThan(0);
        expect(p.costo_musd).toBeGreaterThan(0);
        expect(p.meses).toBeGreaterThan(0);
        expect(p.dato.length).toBeGreaterThan(10);
        expect(piezasEn[p.id]?.nombre, p.id).toBeTruthy();
        expect(piezasEn[p.id]?.dato, p.id).toBeTruthy();
      }
      const s = lista.find((p) => !p.avanzada), a = lista.find((p) => p.avanzada);
      expect(a.meses).toBeGreaterThan(s.meses);
    }
  });
  it('cada categoría trae su número característico', () => {
    expect(piezas.filter((p) => p.categoria === 'bateria').every((p) => p.bateria_wh > 0)).toBe(true);
    expect(piezas.filter((p) => p.categoria === 'computadora').every((p) => p.almacenamiento_gbit > 0)).toBe(true);
    expect(piezas.filter((p) => p.categoria === 'orientacion').every((p) => p.precision_arcsec > 0)).toBe(true);
  });
});

describe('sistemas en el resumen de la nave', () => {
  it('un diseño anterior a B3 (sin claves de sistemas) da un resumen válido y puede lanzar', () => {
    for (const m of [lro, juno]) {
      const d = real(m);
      expect(SISTEMAS.some((c) => c in d)).toBe(false);
      const r = resumenNave(d, piezas, cohetes, m);
      expect(r.faltan).toEqual([]);
      expect(r.puedeLanzar).toBe(true);
      expect(r.sistemas.bateria.auto).toBe(true);
      expect(r.bateriaWh).toBe(m.bateria_wh);
    }
  });
  it('intermedio: con las claves en null faltan y bloquean el lanzamiento, sin romper', () => {
    const d = { ...real(lro), bateria: null, computadora: null, orientacion: null };
    const r = resumenNave(d, piezas, cohetes, lro);
    expect(r.faltan).toEqual(['bateria', 'computadora', 'orientacion']);
    expect(r.puedeLanzar).toBe(false);
    expect(r.problemas[0]).toContain('batería');
    expect(r.bateriaWh).toBe(lro.bateria_wh);
    expect(r.almacenamiento.gbit).toBe(0);
    expect(r.apuntado.bono).toBe(0);
  });
  it('principiante: se eligen solas aunque estén en null', () => {
    const m = misionConDificultad(lro, 'principiante');
    const d = { ...real(lro), bateria: null, computadora: null, orientacion: null };
    const r = resumenNave(d, piezas, cohetes, m);
    expect(r.faltan).toEqual([]);
    for (const c of SISTEMAS) {
      expect(r.sistemas[c].auto).toBe(true);
      expect(r.sistemas[c].pieza.avanzada).toBeFalsy();
    }
    expect(r.almacenamiento.gbit).toBe(32);
    const i = resumenNave(d, piezas, cohetes, misionConDificultad(lro, 'intermedio'));
    expect(i.faltan).toHaveLength(3);
  });
  it('elegir una pieza suma su masa y costo, y un id desconocido cae a la simple', () => {
    const base = resumenNave(real(lro), piezas, cohetes, lro);
    const bat = piezas.find((p) => p.id === 'bateria_avanzada');
    const r = resumenNave({ ...real(lro), bateria: 'bateria_avanzada' }, piezas, cohetes, lro);
    expect(r.masaSeca - base.masaSeca).toBeCloseTo(bat.masa_kg);
    expect(r.costo - base.costo).toBeCloseTo(bat.costo_musd);
    expect(resumenNave({ ...real(lro), bateria: 'no_existe' }, piezas, cohetes, lro).sistemas.bateria.auto).toBe(true);
  });
});

describe('efectos de cada sistema', () => {
  it('batería: el paquete elegido escala la batería de la misión y llega a la etapa 08', () => {
    const r = resumenNave({ ...real(lro), bateria: 'bateria_avanzada' }, piezas, cohetes, lro);
    expect(r.bateriaWh).toBe(Math.round(lro.bateria_wh * 3200 / BATERIA_REF_WH));
    const e = estadoInicial(r, lro, real(lro));
    expect(e.bateriaMax).toBe(r.bateriaWh);
    const s = resumenNave({ ...real(lro), bateria: 'bateria_basica' }, piezas, cohetes, lro);
    expect(s.bateriaWh).toBe(lro.bateria_wh);
  });
  it('computadora: la memoria reduce la pérdida de datos pero no cambia la barra de datos', () => {
    const a = almacenamiento({ almacenamiento_gbit: 32 }, 1000, 600);
    expect(a.perdidaSin).toBeCloseTo(0.4);
    expect(a.perdidaCon).toBeLessThan(a.perdidaSin);
    expect(a.recuperado).toBeGreaterThan(0);
    expect(almacenamiento({ almacenamiento_gbit: 0 }, 1000, 600).perdidaCon).toBeCloseTo(0.4);
    expect(almacenamiento({ almacenamiento_gbit: 32 }, 500, 600).perdidaSin).toBe(0);
    const d = real(juno);
    const x = resumenNave({ ...d, computadora: 'computadora_estandar' }, piezas, cohetes, juno);
    const y = resumenNave({ ...d, computadora: 'computadora_rad_hard' }, piezas, cohetes, juno);
    expect(y.almacenamiento.perdidaCon).toBeLessThanOrEqual(x.almacenamiento.perdidaCon);
    expect(y.barras.datos.valor).toBe(x.barras.datos.valor);
    expect(y.barras.datos.limite).toBe(x.barras.datos.limite);
  });
  it('orientación: más precisión da más bono, y el bono sube la calidad de la operación 07', () => {
    expect(apuntado({ precision_arcsec: 6 }).bono).toBeGreaterThan(apuntado({ precision_arcsec: 60 }).bono);
    expect(apuntado(null).bono).toBe(0);
    expect(apuntado({ precision_arcsec: 500 }).bono).toBe(0);
    const estado = { operacionCompletada: false, perdida: null, bateria: 100, decisiones: [] };
    const s = { fase: 'final', califs: [0.5, 0.5, 0.5], resultados: [], reintentos: 0, costoTotal: 0 };
    const sin = aplicarOperacion07(estado, s, { ciencia: { total: 0.5 } });
    const con = aplicarOperacion07(estado, s, { ciencia: { total: 0.5 }, apuntado: { bono: 0.08 } });
    expect(con.calidadOperacion).toBeGreaterThan(sin.calidadOperacion);
    expect(con.calidadOperacion).toBeLessThanOrEqual(1);
  });
});

describe('barra Tiempo y requisito', () => {
  it('resumen.barras.tiempo trae valor, límite y ok', () => {
    const b = resumenNave(real(lro), piezas, cohetes, lro).barras.tiempo;
    expect(b).toMatchObject({ limite: 54, ok: true });
    expect(b.valor).toBeGreaterThan(0);
  });
  it('el requisito de desarrollo está en la revisión y marca el incumplimiento', () => {
    const lista = requisitos(lro, resumenNave(real(lro), piezas, cohetes, lro), real(lro));
    const t = lista.find((r) => r.id === 'tiempo');
    expect(t).toMatchObject({ clave: 'requisitos.tiempo', cumple: true, limite: 54 });
    const apretada = { ...lro, plazo_meses: 20 };
    const r2 = resumenNave(real(lro), piezas, cohetes, apretada);
    expect(requisitos(apretada, r2, real(lro)).find((r) => r.id === 'tiempo').cumple).toBe(false);
    expect(r2.puedeLanzar).toBe(false);
    expect(r2.problemas.some((p) => p.includes('meses'))).toBe(true);
  });
  it('una misión sin plazo no agrega el requisito', () => {
    const sinPlazo = { ...lro, plazo_meses: undefined };
    const lista = requisitos(sinPlazo, resumenNave(real(lro), piezas, cohetes, sinPlazo), real(lro));
    expect(lista.find((r) => r.id === 'tiempo')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import juno from '../datos/misiones/juno.json';
import { deltaV, disenoReal, generacionW, resumenNave } from './nave.js';
import {
  aplicarInsercion, aplicarLanzamiento, bloqueOrbitas, estadoInicial, puntaje, tramo,
} from './mision.js';

const real = disenoReal(juno, piezas);
const con = (cambios) => ({ ...real, ...cambios });
const resumen = (d) => resumenNave(d, piezas, cohetes, juno);

describe('física básica', () => {
  it('la luz solar cae con 1/d²', () => {
    const panel = { genera_w_1ua: 1000 };
    expect(generacionW(panel, 2)).toBeCloseTo(250);
  });
  it('ecuación del cohete', () => {
    expect(deltaV(300, Math.E * 100, 100)).toBeCloseTo(300 * 9.80665);
  });
});

describe('balance: el diseño real de Juno', () => {
  const r = resumen(real);
  it('se parece a la Juno real', () => {
    expect(r.masaTotal).toBeGreaterThan(3500);
    expect(r.masaTotal).toBeLessThan(3700);
    expect(r.generacion).toBeGreaterThan(380);
    expect(r.generacion).toBeLessThan(450);
    expect(r.costo).toBe(1130);
  });
  it('puede lanzar, con margen de energía justo', () => {
    expect(r.problemas).toEqual([]);
    expect(r.puedeLanzar).toBe(true);
    expect(r.generacion - r.consumo).toBeLessThan(40);
    expect(r.ciencia.total).toBe(1);
  });
});

describe('balance: las trampas fallan por la razón correcta', () => {
  it('paneles medianos: sin energía en Júpiter', () => {
    const r = resumen(con({ energia: 'panel_mediano' }));
    expect(r.barras.energia.ok).toBe(false);
    expect(r.barras.masa.ok).toBe(true);
  });
  it('RTG: la energía alcanza (sin calefactores), pero rompe el presupuesto', () => {
    const r = resumen(con({ energia: 'rtg' }));
    expect(r.barras.energia.ok).toBe(true);
    expect(r.barras.costo.ok).toBe(false);
    // Quitando un instrumento caro vuelve a caber: un compromiso real.
    const sinParticulas = resumen(con({ energia: 'rtg', instrumentos: real.instrumentos.filter((i) => i !== 'particulas') }));
    expect(sinParticulas.puedeLanzar).toBe(true);
    expect(sinParticulas.ciencia.total).toBeLessThan(1);
  });
  it('sonda atmosférica: demasiada masa', () => {
    const r = resumen(con({ instrumentos: [...real.instrumentos, 'sonda_atmosferica'] }));
    expect(r.barras.masa.ok).toBe(false);
  });
  it('tanque chico: no alcanza el Δv', () => {
    expect(resumen(con({ propulsion: 'tanque_chico' })).barras.dv.ok).toBe(false);
  });
  it('tanque mediano: alcanza, con poco margen', () => {
    const r = resumen(con({ propulsion: 'tanque_mediano' }));
    expect(r.barras.dv.ok).toBe(true);
    expect(r.dv - juno.dv_requerida_ms).toBeLessThan(250);
  });
  it('cohete chico: no levanta la nave', () => {
    expect(resumen(con({ cohete: 'atlas_v_541' })).barras.masa.ok).toBe(false);
  });
  it('cohete pesado: se pasa del presupuesto', () => {
    expect(resumen(con({ cohete: 'pesado' })).barras.costo.ok).toBe(false);
  });
  it('gravedad sin banda Ka: avisa y pierde ciencia', () => {
    const r = resumen(con({ antena: 'antena_alta' }));
    expect(r.problemas.some((p) => p.includes('banda Ka'))).toBe(true);
    expect(r.ciencia.total).toBeLessThan(1);
  });
  it('cámara HD: satura el enlace de datos', () => {
    const r = resumen(con({ instrumentos: [...real.instrumentos, 'camara_hd'] }));
    expect(r.factorDatos).toBeLessThan(0.8);
  });
});

// Partida completa automatizada: así validamos que un buen jugador saca buena nota.
function partida(diseno, { lanzamiento, insercion, apagarEnJupiter = [] }) {
  const r = resumen(diseno);
  let e = estadoInicial(r, juno, diseno);
  e = aplicarLanzamiento(e, lanzamiento);
  for (const d of [1, 2.5, 1, 3.5]) e = tramo(e, diseno, piezas, juno, d);
  e = { ...e, encendidos: e.encendidos.filter((i) => !apagarEnJupiter.includes(i)) };
  e = tramo(e, diseno, piezas, juno, 5.2);
  const ins = aplicarInsercion(e, juno, insercion);
  e = ins.estado;
  while (!e.perdida && e.orbitas < e.orbitasMeta) e = bloqueOrbitas(e, diseno, piezas, juno).estado;
  return { e, r, ins, p: puntaje(e, r, juno, { coincidenciasReales: 2, desorbito: true }) };
}
const lanzamientoPerfecto = { etapas: [{ etapa: 'solidos', combustible: 0, tarde: 0 }, { etapa: 'primera', combustible: 0, tarde: 0 }], errorApagado: 0 };

describe('partidas completas', () => {
  it('jugador perfecto con el diseño real: Oro o mejor', () => {
    const { e, p } = partida(real, { lanzamiento: lanzamientoPerfecto, insercion: 540 });
    expect(e.perdida).toBeNull();
    expect(p.total).toBeGreaterThanOrEqual(85);
  });
  it('sin blindaje: la radiación mata la nave', () => {
    const { e } = partida(con({ blindaje: 'blindaje_ninguno' }), { lanzamiento: lanzamientoPerfecto, insercion: 540 });
    expect(e.perdida).toMatch(/radiación/);
  });
  it('frenar poco: la nave pasa de largo', () => {
    const { ins } = partida(real, { lanzamiento: lanzamientoPerfecto, insercion: 450 });
    expect(ins.resultado).toBe('escape');
  });
  it('tanque mediano + mal lanzamiento: se acaba el propelente al frenar', () => {
    const malo = { etapas: [{ etapa: 'solidos', combustible: 0.2, tarde: 0 }, { etapa: 'primera', combustible: 0.1, tarde: 2 }], errorApagado: -60 };
    const { ins, e } = partida(con({ propulsion: 'tanque_mediano' }), { lanzamiento: malo, insercion: 540 });
    expect(ins.resultado).toBe('escape');
    expect(e.perdida).toMatch(/propelente/);
  });
});

describe('puntaje sin inserción orbital (campaña: 04 red de drones → 05 encuentro)', () => {
  const r = resumenNave(disenoReal(juno, piezas), piezas, cohetes, juno);
  const base = { ...estadoInicial(r, juno, disenoReal(juno, piezas)), eficienciaLanzamiento: 1 };
  it('la precisión de la llegada sale de la foto de la etapa 05 si no hubo inserción', () => {
    const conFoto = puntaje({ ...base, puntuacionEncuentro: 800 }, r, juno);
    const sinFoto = puntaje({ ...base, puntuacionEncuentro: 0 }, r, juno);
    expect(conFoto.partes.ejecucion).toBe(Math.round(((1 + .8) / 2) * 15));
    expect(sinFoto.partes.ejecucion).toBe(Math.round((1 / 2) * 15));
  });
  it('si se jugó la inserción, manda su precisión', () => {
    expect(puntaje({ ...base, precisionInsercion: 1, puntuacionEncuentro: 0 }, r, juno).partes.ejecucion).toBe(15);
  });
});

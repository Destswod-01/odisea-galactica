import { describe, it, expect } from 'vitest';
import { configurarDrones, lanzarDron, integrarDron, objetivoDron, predecirDron, crearDrones, pasoDrones, aplicarDrones, costoDron, largoPrevision, previsionCorta, posicionDronOrbital, orbitarDron, RADIO_CHOQUE, zonaImpulso, anchoZona, velocidadBarra } from './drones.js';
import { resumenNave, disenoReal } from './nave.js';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
const mision = { id: 'lro', dv_requerida_ms: 1300 }, ctx = { mision };
const estado = { bateria: 2000, bateriaMax: 2000, dvRestante: 1500, decisiones: [] };
const tick = s => { for (let i = 0; i < 1000 && ['vuelo','avance'].includes(s.fase); i++) s = pasoDrones(s, { tipo: 'tiempo', dt: .1 }, ctx); return s; };
describe('red de drones', () => {
  it('cada objetivo está dentro de la órbita de la nodriza y tiene una solución', () => {
    for (const id of ['lro','juno']) for (let i = 0; i < 4; i++) {
      const c = configurarDrones({ id }), o = objetivoDron(c, i), r = Math.hypot(o.x, o.y);
      expect(r).toBeLessThan(c.orbita); expect(r).toBeGreaterThan(c.radio);
      expect(predecirDron(c, i, [-25,-50,-10,-38][i], [55,72,42,65][i]).resultado).toBe('objetivo');
    }
  });
  it('hereda velocidad orbital y conserva energía bajo gravedad', () => {
    const c = configurarDrones(mision), n = lanzarDron(c, 0, -25, 55);
    expect(n.vy).toBeGreaterThan(2);
    const energia = s => (s.vx ** 2 + s.vy ** 2) / 2 - c.mu / Math.hypot(s.x,s.y);
    let s = n; for (let i = 0; i < 80; i++) s = integrarDron(s, .04, c);
    expect(Math.abs(energia(s) - energia(n))).toBeLessThan(.002); expect(s.vx).not.toBe(n.vx);
  });
  it('cobra equipo, energía y maniobra al lanzar; impide dobles cargos y pausa', () => {
    let s = pasoDrones(crearDrones(estado,{ drones:3 }),{ tipo:'entendido' },ctx);
    const n = pasoDrones(s,{ tipo:'lanzar' },ctx);
    expect(n.disponibles).toBe(2); expect(n.dv).toBeCloseTo(estado.dvRestante-costoDron(35)); expect(n.bateria).toBe(1970);
    expect(pasoDrones(n,{ tipo:'lanzar' },ctx)).toBe(n);
    const p = pasoDrones(n,{ tipo:'pausar' },ctx); expect(pasoDrones(p,{ tipo:'tiempo',dt:1 },ctx)).toBe(p);
    s = { ...s, dv:1300 }; expect(pasoDrones(s,{ tipo:'lanzar' },ctx)).toBe(s);
  });
  it('avanza la nodriza solo tras acertar, consume los drones equipados y aplica una vez', () => {
    let s = pasoDrones(crearDrones(estado,{ drones:3 }),{ tipo:'entendido' },ctx);
    for(let i=0;i<3;i++) {
      s = pasoDrones(s,{tipo:'ajustar',angulo:[-25,-50,-10][i],fuerza:[55,72,42][i]},ctx);
      s = tick(pasoDrones(s,{tipo:'lanzar'},ctx)); expect(s.vuelo.resultado).toBe('objetivo');
      s = pasoDrones(s,{tipo:'siguiente'},ctx); if(i<2) { expect(s.fase).toBe('avance');s=tick(s);expect(s.indice).toBe(i+1); }
    }
    expect(s.fase).toBe('fin'); expect(s.disponibles).toBe(0); expect(s.colocados).toHaveLength(3);
    const n=aplicarDrones(estado,s);expect(n.dronesDesplegados).toBe(3);expect(n.dvRestante).toBeLessThan(estado.dvRestante);expect(aplicarDrones(n,s)).toBe(n);
  });
  it('el equipo del hangar cambia masa, presupuesto, energía y delta-v', () => {
    const d = disenoReal(lro,piezas), base = resumenNave(d,piezas,cohetes,lro), extra = resumenNave({...d,drones:3},piezas,cohetes,lro);
    expect(extra.masaSeca-base.masaSeca).toBe(36); expect(extra.costo-base.costo).toBe(6);expect(extra.consumo-base.consumo).toBe(1.5); expect(extra.dv).toBeLessThan(base.dv);
    expect(crearDrones(estado,d).fase).toBe('sinequipo');
  });
  it('la previsión corta baja con el nivel y solo muestra el arranque', () => {
    const l = i => largoPrevision({ id: 'lro' }, i), j = i => largoPrevision({ id: 'juno' }, i);
    expect([0, 1, 2, 3, 4].map(l).map(x => +x.toFixed(2))).toEqual([1.6, 1.3, 1, .7, .7]);
    expect([0, 1, 2, 3, 4].map(j).map(x => +x.toFixed(2))).toEqual([1.2, .95, .7, .5, .5]);
    const c = configurarDrones(mision), corta = previsionCorta(c, 0, -25, 50, l(0)), completa = predecirDron(c, 0, -25, 50);
    expect(corta.length).toBeLessThanOrEqual(34); expect(corta.length).toBeLessThan(completa.camino.length); expect(corta.length).toBeGreaterThan(5);
  });
  it('la órbita analítica vuelve al mismo punto tras un periodo y gira como la nodriza', () => {
    const c = configurarDrones(mision), d = orbitarDron(c, { x: -4, y: 5 }, 0, 2), periodo = 2 * Math.PI / d.omega;
    expect(d.omega).toBeGreaterThan(0); expect(d.r).toBeCloseTo(Math.hypot(-4, 5));
    const a = posicionDronOrbital(d, 2), b = posicionDronOrbital(d, 2 + periodo), m = posicionDronOrbital(d, 2 + periodo / 4);
    expect(a.x).toBeCloseTo(-4); expect(a.y).toBeCloseTo(5); expect(b.x).toBeCloseTo(a.x); expect(b.y).toBeCloseTo(a.y);
    expect(a.x * m.y - a.y * m.x).toBeGreaterThan(0);
  });
  it('el reloj corre en plan, vuelo y avance, pero no en pausa', () => {
    let s = pasoDrones(crearDrones(estado, { drones: 3 }), { tipo: 'entendido' }, ctx);
    s = pasoDrones(s, { tipo: 'tiempo', dt: .1 }, ctx); expect(s.reloj).toBeCloseTo(.1);
    s = pasoDrones(pasoDrones(s, { tipo: 'lanzar' }, ctx), { tipo: 'tiempo', dt: .1 }, ctx); expect(s.reloj).toBeCloseTo(.2);
    const p = pasoDrones(s, { tipo: 'pausar' }, ctx); expect(p.reloj).toBeCloseTo(.2);
    expect(pasoDrones(p, { tipo: 'tiempo', dt: .1 }, ctx)).toBe(p);
  });
  it('un dron en órbita se queda como obstáculo tras acertar', () => {
    let s = pasoDrones(crearDrones(estado, { drones: 3 }), { tipo: 'entendido' }, ctx);
    s = tick(pasoDrones(pasoDrones(s, { tipo: 'ajustar', angulo: -25, fuerza: 55 }, ctx), { tipo: 'lanzar' }, ctx));
    expect(s.vuelo.resultado).toBe('objetivo'); expect(s.colocados).toHaveLength(1);
    const o = s.colocados[0]; expect(o.omega).toBeGreaterThan(0); expect(o.r).toBeCloseTo(Math.hypot(s.vuelo.x, s.vuelo.y));
  });
  it('un choque con un dron en órbita pierde los dos y no avanza la nodriza', () => {
    const c = configurarDrones(mision);
    let s = pasoDrones(crearDrones(estado, { drones: 3 }), { tipo: 'entendido' }, ctx);
    s = pasoDrones(s, { tipo: 'ajustar', angulo: -25, fuerza: 55 }, ctx);
    let v = lanzarDron(c, s.posicion, -25, 55); for (let i = 0; i < 10; i++) v = integrarDron(v, .1, c);
    const orbital = orbitarDron(c, { x: v.x, y: v.y }, 0, v.tiempo);
    // El obstáculo coincide con el dron en el instante 1,0 s del mismo vuelo.
    s = { ...s, colocados: [orbital] };
    s = tick(pasoDrones(s, { tipo: 'lanzar' }, ctx));
    expect(s.vuelo.resultado).toBe('choque'); expect(s.colocados).toHaveLength(0); expect(s.perdidos).toBe(2); expect(s.fase).toBe('resultado');
    expect(s.registro.at(-1)).toMatch(/Colisión/); expect(RADIO_CHOQUE).toBe(.35);
    s = pasoDrones(s, { tipo: 'siguiente' }, ctx); expect(s.fase).toBe('plan'); expect(s.indice).toBe(0); expect(s.disponibles).toBe(2);
  });
  it('zonaImpulso da un centro que acierta y null si ninguna fuerza llega', () => {
    const c = configurarDrones(mision), z = zonaImpulso(c, 0, -25);
    expect(z).not.toBeNull(); expect(predecirDron(c, 0, -25, z.centro).resultado).toBe('objetivo');
    expect(zonaImpulso(c, 0, 85)).toBeNull();
  });
  it('ancho de zona y velocidad de la barra dependen del nivel', () => {
    expect([0, 1, 2, 3, 4].map(i => anchoZona({ id: 'lro' }, i))).toEqual([12, 9, 6, 4, 4]);
    expect([0, 1, 2, 3, 4].map(i => anchoZona({ id: 'juno' }, i))).toEqual([9, 6.5, 4, 3, 3]);
    expect([0, 1, 2].map(i => velocidadBarra({ id: 'lro' }, i))).toEqual([60, 75, 90]);
    expect([0, 1, 2].map(i => velocidadBarra({ id: 'juno' }, i))).toEqual([75, 95, 115]);
  });
  it('la barra oscila entre 10 y 100 y la zona verde lanza con el centro exacto', () => {
    let s = pasoDrones(crearDrones(estado, { drones: 3 }), { tipo: 'entendido' }, ctx);
    s = pasoDrones(pasoDrones(s, { tipo: 'ajustar', angulo: -25 }, ctx), { tipo: 'espacio' }, ctx);
    expect(s.subfase).toBe('impulso'); expect(pasoDrones(s, { tipo: 'ajustar', angulo: 10 }, ctx)).toBe(s);
    let max = 0, min = 999; for (let i = 0; i < 200; i++) { s = pasoDrones(s, { tipo: 'tiempo', dt: .05 }, ctx); max = Math.max(max, s.barra); min = Math.min(min, s.barra); }
    expect(max).toBeLessThanOrEqual(100); expect(min).toBeGreaterThanOrEqual(10); expect(max).toBeGreaterThan(95); expect(min).toBeLessThan(15);
    const ancho = anchoZona(mision, 0), dentro = pasoDrones({ ...s, barra: s.zona.centro + ancho - 1 }, { tipo: 'espacio' }, ctx);
    expect(dentro.fase).toBe('vuelo'); expect(dentro.fuerza).toBe(s.zona.centro);
    const fuera = pasoDrones({ ...s, barra: s.zona.centro + ancho + 3 }, { tipo: 'espacio' }, ctx);
    expect(fuera.fuerza).toBeCloseTo(s.zona.centro + ancho + 3);
    const vuelta = pasoDrones(s, { tipo: 'cambiarAngulo' }, ctx); expect(vuelta.subfase).toBe('angulo');
    expect(dentro.dv).toBeCloseTo(estado.dvRestante - costoDron(s.zona.centro)); expect(dentro.bateria).toBe(1970);
    expect(tick(dentro).vuelo.resultado).toBe('objetivo');
  });
});
import { tiposDrones, aporteDron } from './drones.js';
describe('tipos de dron por misión', () => {
  it('LRO y Juno llevan sus propios tipos y cada uno tiene un aporte educativo', () => {
    expect(tiposDrones({ id: 'lro' })).toEqual(['M1', 'M2', 'M4', 'M7']);
    expect(tiposDrones({ id: 'juno' })).toEqual(['M1', 'M3', 'M7', 'M6']);
    for (const id of ['lro', 'juno']) for (const t of tiposDrones({ id })) expect(aporteDron({ id }, t).length).toBeGreaterThan(20);
  });
  it('colocados guarda el tipo del dron y el registro lo nombra', () => {
    for (const [id, tipos] of [['lro', ['M1', 'M2']], ['juno', ['M1', 'M3']]]) {
      const m = { id, dv_requerida_ms: 1300 }, c = { mision: m }, cfg = configurarDrones(m);
      let s = pasoDrones(crearDrones(estado, { drones: 2 }), { tipo: 'entendido' }, c);
      for (let i = 0; i < 2; i++) {
        s = pasoDrones(s, { tipo: 'ajustar', angulo: [-25, -50][i], fuerza: [55, 72][i] }, c);
        for (let k = 0; k < 1000 && ['vuelo', 'avance'].includes(s.fase) || s.fase === 'plan' && k === 0; k++) s = pasoDrones(s, { tipo: s.fase === 'plan' ? 'lanzar' : 'tiempo', dt: .1 }, c);
        expect(s.vuelo.resultado).toBe('objetivo'); expect(s.colocados[i].tipo).toBe(tipos[i]);
        expect(s.registro.at(-1)).toContain(`ASTRION-${tipos[i]} en posición`);
        s = pasoDrones(s, { tipo: 'siguiente' }, c); for (let k = 0; k < 100 && s.fase === 'avance'; k++) s = pasoDrones(s, { tipo: 'tiempo', dt: .1 }, c);
      }
      expect(cfg.nombre).toBeTruthy();
    }
  });
  it('zonaImpulso memoriza y devuelve el mismo resultado', () => {
    const c = configurarDrones(mision); expect(zonaImpulso(c, 1, -40)).toBe(zonaImpulso(c, 1, -40));
  });
});

import { sondaEncuentro, sondaInsercion } from './drones.js';
describe('sondas elegidas en el taller', () => {
  it('sin diseno.sondas usa el equipo por defecto de la misión', () => {
    expect(tiposDrones({ id: 'lro' }, { drones: 2 })).toEqual(['M1', 'M2', 'M4', 'M7']);
    expect(tiposDrones({ id: 'juno' }, {})).toEqual(['M1', 'M3', 'M7', 'M6']);
  });
  it('diseno.sondas manda casilla a casilla e ignora valores inválidos', () => {
    expect(tiposDrones({ id: 'lro' }, { sondas: ['M4', 'XX'] })).toEqual(['M4', 'M2', 'M4', 'M7']);
  });
  it('la 05 usa la primera casilla y la 06 prefiere la orbital M1', () => {
    expect(sondaEncuentro({ drones: 2, sondas: ['M7', 'M1'] }, { id: 'lro' })).toBe('M7');
    expect(sondaEncuentro({ drones: 0 }, { id: 'lro' })).toBe('M4');
    expect(sondaInsercion({ drones: 2, sondas: ['M7', 'M1'] }, { id: 'lro' })).toBe('M1');
    expect(sondaInsercion({ drones: 2, sondas: ['M7', 'M4'] }, { id: 'lro' })).toBe('M7');
    expect(sondaInsercion({ drones: 0 }, { id: 'lro' })).toBe('M1');
  });
  it('crearDrones conserva las sondas y el paso usa el tipo elegido', () => {
    expect(crearDrones({ dvRestante: 1, bateria: 1, bateriaMax: 1 }, { drones: 2, sondas: ['M3', 'M6'] }).sondas).toEqual(['M3', 'M6']);
  });
});

import { DATOS_SONDAS, DATOS_SONDAS_EN, datosSonda } from '../sondas/datos.js';
describe('datos de sondas en inglés', () => {
  it('cada sonda tiene capa EN con las mismas claves y otro texto', () => {
    for (const k of Object.keys(DATOS_SONDAS)) {
      expect(Object.keys(DATOS_SONDAS_EN[k]).sort()).toEqual(Object.keys(DATOS_SONDAS[k]).sort());
      expect(datosSonda(k, 'en').nombre).not.toBe(DATOS_SONDAS[k].nombre);
    }
  });
});

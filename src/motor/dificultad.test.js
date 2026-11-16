import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { CONFIG_DIFICULTAD, misionConDificultad, NIVEL_POR_DEFECTO, NIVELES } from './dificultad.js';

describe('dificultad', () => {
  it('niveles y valor por defecto', () => {
    expect(NIVELES).toEqual(['principiante', 'intermedio', 'experto']);
    expect(NIVEL_POR_DEFECTO).toBe('intermedio');
    expect(Object.keys(CONFIG_DIFICULTAD)).toEqual(NIVELES);
  });

  it('no modifica la misión original', () => {
    const copia = JSON.parse(JSON.stringify(lro));
    const m = misionConDificultad(lro, 'principiante');
    expect(m).not.toBe(lro);
    expect(lro).toEqual(copia);
    expect(lro.dificultad).toBeUndefined();
  });

  it('principiante: más presupuesto y menos Δv requerida', () => {
    const m = misionConDificultad(lro, 'principiante');
    expect(m.dificultad).toBe('principiante');
    expect(m.presupuesto_musd).toBeCloseTo(lro.presupuesto_musd * 1.25);
    expect(m.dv_requerida_ms).toBeLessThan(lro.dv_requerida_ms);
    expect(m.ventana_insercion_ms).toBeGreaterThan(lro.ventana_insercion_ms);
    expect(m.capacidad_mult).toBeGreaterThan(lro.capacidad_mult);
    expect(m.bateria_wh).toBeGreaterThan(lro.bateria_wh);
  });

  it('intermedio conserva los números y agrega el nivel; nivel desconocido = intermedio', () => {
    for (const nivel of ['intermedio', 'xyz', undefined]) {
      const m = misionConDificultad(juno, nivel);
      expect(m).toEqual({ ...juno, capacidad_mult: juno.capacidad_mult ?? 1, dificultad: 'intermedio' });
    }
  });

  it('capacidad_mult ausente cuenta como 1', () => {
    expect(misionConDificultad({ ...lro, capacidad_mult: undefined }, 'principiante').capacidad_mult).toBeCloseTo(1.15);
  });

  it('el diseño real de NASA pasa en los tres niveles', () => {
    for (const mision of [lro, juno]) {
      for (const nivel of NIVELES) {
        const m = misionConDificultad(mision, nivel);
        const r = resumenNave(disenoReal(m, piezas), piezas, cohetes, m);
        expect(r.puedeLanzar, `${mision.id} ${nivel}: ${r.problemas.join(' ')}`).toBe(true);
      }
    }
  });

  it('un diseño caro falla el presupuesto en intermedio y pasa en principiante', () => {
    const diseno = disenoReal(lro, piezas);
    const caro = { ...diseno, instrumentos: [...diseno.instrumentos, 'sonda_atmosferica'] };
    const inter = misionConDificultad(lro, 'intermedio');
    const princ = misionConDificultad(lro, 'principiante');
    const a = resumenNave(caro, piezas, cohetes, inter);
    const b = resumenNave(caro, piezas, cohetes, princ);
    expect(a.barras.costo.ok).toBe(false);
    expect(a.puedeLanzar).toBe(false);
    expect(b.barras.costo.ok).toBe(true);
    expect(b.puedeLanzar).toBe(true);
  });
});

describe('dificultad: tres niveles (B11)', () => {
  it('existen novato (principiante), conocedor (intermedio) y experto', async () => {
    const { NIVELES, MINIJUEGO, ajusteMinijuego, misionConDificultad } = await import('./dificultad.js');
    expect(NIVELES).toEqual(['principiante', 'intermedio', 'experto']);
    expect(ajusteMinijuego({})).toEqual(MINIJUEGO.intermedio);
    expect(ajusteMinijuego({ dificultad: 'experto' }).tolerancia).toBeLessThan(1);
    expect(ajusteMinijuego({ dificultad: 'principiante' }).tolerancia).toBeGreaterThan(1);
    const base = { presupuesto_musd: 100, dv_requerida_ms: 1000, ventana_insercion_ms: 100, bateria_wh: 100 };
    expect(misionConDificultad(base, 'experto').presupuesto_musd).toBeLessThan(100);
    expect(misionConDificultad(base, 'zzz').dificultad).toBe('intermedio');
  });
});

describe('dificultad: minijuegos de las etapas 02–04 (B11)', () => {
  it('novato da aros más grandes, pulsos más largos y llegada más amplia; experto lo contrario', async () => {
    const { configurarAros } = await import('./aros.js');
    const { configurarLeop } = await import('./leop.js');
    const { configurarDrones } = await import('./drones.js');
    const m = (d) => ({ ...lro, dificultad: d });
    for (const [f, k] of [[configurarAros, 'radio'], [configurarLeop, 'limite'], [configurarDrones, 'tolerancia']]) {
      expect(f(m('principiante'))[k]).toBeGreaterThan(f(m('intermedio'))[k]);
      expect(f(m('experto'))[k]).toBeLessThan(f(m('intermedio'))[k]);
      expect(f(lro)[k]).toBe(f(m('intermedio'))[k]);
    }
  });
});

describe('dificultad: minijuegos de las etapas 05–08 (B11)', () => {
  const m = (d) => ({ ...lro, dificultad: d });
  const est = { bateria: 2000, bateriaMax: 2000, dronesRestantes: 2 };

  it('etapa 05 (encuentro): novato baja el umbral y el consumo; experto los sube', async () => {
    const { configurarEncuentro } = await import('./encuentro.js');
    const nov = configurarEncuentro(m('principiante'));
    const con = configurarEncuentro(m('intermedio'));
    const exp = configurarEncuentro(m('experto'));
    expect(nov.umbral).toBeLessThan(con.umbral);
    expect(nov.consumoDron).toBeLessThan(con.consumoDron);
    expect(exp.umbral).toBeGreaterThan(con.umbral);
    expect(exp.consumoDron).toBeGreaterThan(con.consumoDron);
    expect(configurarEncuentro(lro)).toEqual(con);
  });

  it('etapa 06 (inserción): novato frena los cuerpos y amplía la ventana de foto; experto lo contrario', async () => {
    const { crearInsercion } = await import('./insercion06.js');
    const nov = crearInsercion(est, m('principiante'), { semilla: 7 });
    const con = crearInsercion(est, m('intermedio'), { semilla: 7 });
    const exp = crearInsercion(est, m('experto'), { semilla: 7 });
    expect(nov.cuerpos[0].vy).toBeLessThan(con.cuerpos[0].vy);
    expect(nov.ajVentana).toBeGreaterThan(con.ajVentana);
    expect(exp.cuerpos[0].vy).toBeGreaterThan(con.cuerpos[0].vy);
    expect(exp.ajVentana).toBeLessThan(con.ajVentana);
    expect(crearInsercion(est, lro, { semilla: 7 }).cuerpos[0].vy).toBe(con.cuerpos[0].vy);
  });

  it('etapa 07 (operación): novato da más tiempo y objetivos más lentos; experto lo contrario', async () => {
    const { crearOperacion07, velocidadObjetivos } = await import('./operacion07.js');
    const nov = crearOperacion07(est, m('principiante'), { enlace: 10 }, { semilla: 5 });
    const con = crearOperacion07(est, m('intermedio'), { enlace: 10 }, { semilla: 5 });
    const exp = crearOperacion07(est, m('experto'), { enlace: 10 }, { semilla: 5 });
    expect(nov.total).toBeGreaterThan(con.total);
    expect(velocidadObjetivos(0, nov.velMult)).toBeLessThan(velocidadObjetivos(0, con.velMult));
    expect(exp.total).toBeLessThan(con.total);
    expect(velocidadObjetivos(0, exp.velMult)).toBeGreaterThan(velocidadObjetivos(0, con.velMult));
    expect(crearOperacion07(est, lro, { enlace: 10 }, { semilla: 5 }).total).toBe(con.total);
  });

  it('etapa 08 (extendida): novato alarga los años y espacia los eventos; experto lo contrario', async () => {
    const { default: piezas } = await import('../datos/piezas.json');
    const { disenoReal } = await import('./nave.js');
    const { crearExtendida } = await import('./extendida08.js');
    const dis = disenoReal(lro, piezas);
    const nov = crearExtendida(est, m('principiante'), dis, piezas, { semilla: 3 });
    const con = crearExtendida(est, m('intermedio'), dis, piezas, { semilla: 3 });
    const exp = crearExtendida(est, m('experto'), dis, piezas, { semilla: 3 });
    expect(nov.anoS).toBeGreaterThan(con.anoS);
    expect(nov.proxEvento).toBeGreaterThan(con.proxEvento);
    expect(exp.anoS).toBeLessThan(con.anoS);
    expect(exp.proxEvento).toBeLessThan(con.proxEvento);
    expect(crearExtendida(est, lro, dis, piezas, { semilla: 3 }).anoS).toBe(con.anoS);
  });
});

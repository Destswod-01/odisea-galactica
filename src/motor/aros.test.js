import { describe, expect, it } from 'vitest';
import {
  activarSeparacionEtapa,
  configurarAros,
  crearVueloAros,
  fijarEmpuje,
  pasoAros,
  resultadoAros,
} from './aros.js';
import { ajusteMinijuego } from './dificultad.js';
import { traducir } from '../i18n/idioma.js';

const cfg = configurarAros({ id: 'lro', numero: 1 });

describe('trayectoria por aros', () => {
  it('LRO pide 8/10 y Juno aumenta cantidad, velocidad y precisión', () => {
    expect(cfg.total).toBe(10);
    expect(cfg.minimo).toBe(8);
    const j = configurarAros({ id: 'juno', numero: 2 });
    expect(j.total).toBe(12);
    expect(j.minimo).toBe(10);
    expect(j.radio).toBeLessThan(cfg.radio);
    expect(j.velocidad).toBeGreaterThan(cfg.velocidad);
  });

  it('puntúa exactamente una vez al cruzar, incluso el borde', () => {
    const s = crearVueloAros(cfg);
    s.distancia = 54.8;
    s.x = cfg.radio;
    pasoAros(s, {}, 0.02, cfg);
    expect(s.puntos).toBe(100);
    pasoAros(s, {}, 0.02, cfg);
    expect(s.puntos).toBe(100);
  });

  it('pasar por fuera consume el aro y no da puntos', () => {
    const s = crearVueloAros(cfg);
    s.distancia = 54.8;
    s.x = cfg.radio + 0.01;
    pasoAros(s, {}, 0.02, cfg);
    expect(s.indice).toBe(1);
    expect(s.puntos).toBe(0);
  });

  it('7 aciertos no aprueban, 8 sí y nunca antes de terminar', () => {
    const s = crearVueloAros(cfg);
    s.aciertos = 8;
    expect(resultadoAros(s, cfg).aprobado).toBe(false);
    s.terminado = true;
    expect(resultadoAros(s, cfg)).toMatchObject({ aprobado: true, puntos: 0 });
    s.puntos = 800;
    expect(resultadoAros(s, cfg)).toMatchObject({ aprobado: true, puntos: 800 });
    s.aciertos = 7;
    expect(resultadoAros(s, cfg).aprobado).toBe(false);
  });

  it('el teclado mueve ambos ejes, soltar frena y reiniciar limpia el intento', () => {
    const s = crearVueloAros(cfg);
    for (let i = 0; i < 20; i++) pasoAros(s, { der: true, arriba: true }, 0.05, cfg);
    expect(s.x).toBeGreaterThan(3);
    expect(s.y).toBeGreaterThan(3);
    for (let i = 0; i < 20; i++) pasoAros(s, {}, 0.05, cfg);
    expect(Math.abs(s.vx)).toBeLessThan(0.01);
    expect(crearVueloAros(cfg)).toMatchObject({ puntos: 0, aciertos: 0, indice: 0, tiempo: 0 });
  });

  it('se pueden alcanzar todos los aros en ambas dificultades', () => {
    for (const id of ['lro', 'juno']) {
      const c = configurarAros({ id });
      const s = crearVueloAros(c);
      for (let i = 0; i < 4000 && !s.terminado; i++) {
        const a = s.ruta[s.indice];
        pasoAros(
          s,
          {
            der: a.x - s.x > 0.15,
            izq: a.x - s.x < -0.15,
            arriba: a.y - s.y > 0.15,
            abajo: a.y - s.y < -0.15,
          },
          0.02,
          c
        );
      }
      expect(s.terminado).toBe(true);
      expect(s.aciertos).toBe(c.total);
    }
  });

  it('calcula giro gravitatorio, Max-Q con reducción de empuje y separación de SRB, cofia y MECO', () => {
    const c = configurarAros({ id: 'juno', numero: 2 }, { solidos: 5 });
    const s = crearVueloAros(c, { realista: true, solidos: 5 });
    expect(s.solidos).toBe(5);
    expect(s.etapaActual).toBe('solidos');

    for (let i = 0; i < 5000 && !s.terminado; i++) {
      const a = s.ruta[s.indice];
      if (s.enMaxQ) fijarEmpuje(s, 0.65);
      else fijarEmpuje(s, 1);
      if (s.alertaEtapa) activarSeparacionEtapa(s);
      pasoAros(
        s,
        {
          der: a.x - s.x > 0.15,
          izq: a.x - s.x < -0.15,
          arriba: a.y - s.y > 0.15,
          abajo: a.y - s.y < -0.15,
        },
        0.02,
        c
      );
    }
    expect(s.terminado).toBe(true);
    expect(s.bonoMaxQ).toBe(true);
    expect(s.sobrecarga).toBe(false);
    expect(s.caidos).toEqual(['solidos', 'primera']);
    expect(s.etapaActual).toBe('centaur');
    expect(s.inclinacion).toBeGreaterThan(60);
    expect(s.altitudKm).toBeGreaterThan(150);
    expect(s.velocidadKmh).toBeGreaterThan(25000);
  });
});

describe('despegue: dificultad, sólidos y mensajes sin idioma', () => {
  it('la dificultad escala radio y velocidad sobre la mecánica nueva y respeta los sólidos del cohete', () => {
    const base = configurarAros({ id: 'juno', numero: 2 }, { solidos: 5 });
    for (const dificultad of ['principiante', 'intermedio', 'experto']) {
      const m = { id: 'juno', numero: 2, dificultad };
      const aj = ajusteMinijuego(m);
      const c = configurarAros(m, { solidos: 5 });
      expect(c.solidos).toBe(5);
      expect(c.total).toBe(base.total);
      expect(c.radio).toBeCloseTo(Math.max(1.65, 3 - 0.65) * aj.tolerancia, 6);
      expect(c.velocidad).toBeCloseTo(30 * aj.velocidad, 6);
    }
    expect(configurarAros({ id: 'juno', numero: 2 }).solidos).toBe(5);
    expect(configurarAros({ id: 'lro', numero: 1 }).solidos).toBe(0);
  });

  it('los mensajes del vuelo son claves y números (el espejo no depende del idioma)', () => {
    const c = configurarAros({ id: 'juno', numero: 2 }, { solidos: 5 });
    const s = crearVueloAros(c, { realista: true, solidos: 5 });
    const claves = new Set();
    for (let i = 0; i < 5000 && !s.terminado; i++) {
      const a = s.ruta[s.indice];
      fijarEmpuje(s, s.enMaxQ ? 0.65 : 1);
      if (s.alertaEtapa) {
        // las claves existen en los dos idiomas (si no, la interfaz mostraría la clave tal cual)
        for (const k of [s.alertaEtapa.tituloClave, s.alertaEtapa.accionClave]) {
          expect(traducir(k, null, '§', 'es')).not.toBe('§');
          expect(traducir(k, null, '§', 'en')).not.toBe('§');
        }
        activarSeparacionEtapa(s);
      }
      pasoAros(s, { der: a.x - s.x > 0.15, izq: a.x - s.x < -0.15, arriba: a.y - s.y > 0.15, abajo: a.y - s.y < -0.15 }, 0.02, c);
      if (s.ultimo) {
        expect(s.ultimo.texto).toBeUndefined();
        claves.add(s.ultimo.clave);
        expect(traducir(s.ultimo.clave, null, '§', 'en')).not.toBe('§');
      }
    }
    expect(claves.has('e02.Lanzamiento.stage_on_time')).toBe(true);
    expect(claves.has('e02.Lanzamiento.maxq_cleared')).toBe(true);
    expect(claves.has('e02.Lanzamiento.ring_trajectory_cleared')).toBe(true);
  });
});

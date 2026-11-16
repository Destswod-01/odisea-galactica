import { describe, expect, it } from 'vitest';
import { configurarLeop, crearLeop, pasoLeop, pulsoLeop, duracionPulso, aplicarLeop } from './leop.js';
const cfg = configurarLeop({ id: 'lro' });
const avanzar = (s, fase, c = cfg) => { for (let i = 0; i < 500 && s.fase !== fase; i++) s = pasoLeop(s, { tipo: 'tiempo', dt: .1 }, c); return s; };
const manual = () => pasoLeop(avanzar(pasoLeop(crearLeop(cfg, () => .2), { tipo: 'empezar' }, cfg), 'falloauto'), { tipo: 'manual' }, cfg);
describe('despliegue automático y recuperación LEOP', () => {
  it('aplica los umbrales y sortea una sola vez el número de etapas', () => {
    expect(cfg.falloAutomatico).toBe(.7);
    expect(configurarLeop({ id: 'juno' }).falloAutomatico).toBe(.85);
    expect(crearLeop(cfg, () => .699).falloAutomatico).toBe(true);
    expect(crearLeop(cfg, () => .7).falloAutomatico).toBe(false);
    expect(crearLeop(cfg, () => 0).rondas).toBe(2); expect(crearLeop(cfg, () => .999).rondas).toBe(4);
    const j = configurarLeop({ id: 'juno' }); expect(crearLeop(j, () => 0).rondas).toBe(3); expect(crearLeop(j, () => .999).rondas).toBe(5);
  });
  it('puede completar automáticamente sin jugar memoria y consume batería', () => {
    const s = avanzar(pasoLeop(crearLeop(cfg, () => .95), { tipo: 'empezar' }, cfg), 'exito');
    expect(s.fase).toBe('exito'); expect(s.intentos).toBe(0); expect(s.bateria).toBe(99); expect(s.activados).toEqual([0, 1, 2]);
  });
  it('la demostración bloquea respuestas y enciende el sistema correspondiente', () => {
    let s = manual(); expect(pasoLeop(s, { tipo: 'pulsar', sistema: 0 }, cfg)).toBe(s);
    s = { ...s, tiempo: .6 }; expect(pulsoLeop(s, cfg)).toBe(0); expect(pulsoLeop({ ...s, tiempo: 1.7 }, cfg)).toBe(1);
  });
  it('un fallo conserva etapa, sorteo y gasto; reintentar cuesta energía otra vez', () => {
    const s = avanzar(manual(), 'entrada'); const mal = pasoLeop(s, { tipo: 'pulsar', sistema: 2 }, cfg);
    expect(mal.fase).toBe('perdida'); expect(avanzar(s, 'perdida').motivo).toBe('tiempo');
    const retry = pasoLeop(mal, { tipo: 'manual' }, cfg);
    expect(retry.bateria).toBe(s.bateria - 2); expect(retry.rondas).toBe(s.rondas); expect(retry.ronda).toBe(s.ronda); expect(retry.secuencia).toEqual(s.secuencia);
  });
  it('confirma progresivamente, espera a que se lea el diálogo y aumenta la dificultad', () => {
    let s = manual();
    for (let r = 0; r < s.rondas; r++) {
      s = avanzar(s, 'entrada'); expect(s.ronda).toBe(r);
      for (const sistema of s.secuencia.slice(0, r + 3)) s = pasoLeop(s, { tipo: 'pulsar', sistema }, cfg);
      if (r < s.rondas - 1) { expect(s.fase).toBe('confirmada'); expect(pasoLeop(s, { tipo: 'tiempo', dt: 10 }, cfg)).toBe(s); s = pasoLeop(s, { tipo: 'manual' }, cfg); }
    }
    expect(s.fase).toBe('exito'); expect(s.bateria).toBe(95); expect(duracionPulso(cfg, 3)).toBeLessThan(duracionPulso(cfg, 0));
  });
  it('bloquea comandos sin batería, pausa y aplica el gasto una sola vez', () => {
    const pobre = { ...manual(), fase: 'perdida', bateria: 1 };
    expect(pasoLeop(pobre, { tipo: 'manual' }, cfg).fase).toBe('sinenergia');
    const s = avanzar(manual(), 'entrada'), pausa = pasoLeop(s, { tipo: 'pausar' }, cfg);
    expect(pasoLeop(pausa, { tipo: 'tiempo', dt: .2 }, cfg)).toBe(pausa);
    expect(pasoLeop(pausa, { tipo: 'reanudar' }, cfg).restante).toBe(s.restante);
    const e = { decisiones: [], bateria: 100, dvRestante: 500 }, ganado = { ...s, fase: 'exito' };
    const n = aplicarLeop(e, ganado); expect(n.bateria).toBe(97); expect(n.dvRestante).toBe(500); expect(aplicarLeop(n, ganado)).toBe(n);
  });
});

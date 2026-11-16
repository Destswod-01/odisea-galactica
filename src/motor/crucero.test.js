import { describe, expect, it } from 'vitest';
import { PLANETAS_HONDA, crearHonda, pasoHonda, preverHonda } from './honda.js';
import { crearCapitan, pasoCapitan, balanceCapitan, aplicarCapitan } from './crucero.js';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { estadoInicial, dvParaInsercion } from './mision.js';
function contexto(mision) { const diseno = disenoReal(mision, piezas); return { ctx: { mision, diseno, piezas }, e: estadoInicial(resumenNave(diseno, piezas, cohetes, mision), mision, diseno) }; }
describe('honda gravitatoria', () => {
  it('distingue un encuentro útil, un paso lejano y una colisión', () => {
    for (const id of ['venus', 'tierra', 'jupiter']) {
      const p = PLANETAS_HONDA[id];
      expect(preverHonda(p, 2, 100).resultado).toBe('exito');
      expect(preverHonda(p, -18, 100).resultado).toBe('lejos');
      expect(preverHonda(p, 20, 100).resultado).toBe('impacto');
      expect(preverHonda(p, 6, 100).resultado).toBe('exito');
    }
  });
  it('conserva energía relativa y mide la ganancia solar al salir, no en el periapsis', () => {
    const p = PLANETAS_HONDA.tierra, inicio = crearHonda(p, 2, 100);
    const energia = s => (s.vx ** 2 + s.vy ** 2) / 2 - p.mu / Math.hypot(s.x, s.y);
    let s = inicio;
    for (let i = 0; i < 1200 && !s.resultado; i++) s = pasoHonda(s, .02, p);
    expect(Math.abs(energia(s) - energia(inicio))).toBeLessThan(.005);
    expect(s.ganancia).toBeGreaterThan(.8);
    const inmovil = preverHonda({ ...p, velocidad: 0 }, 2, 100);
    expect(Math.abs(inmovil.ganancia)).toBeLessThan(.01);
  });
  it('la transferencia lunar termina en aproximación, antes del sobrevuelo', () => {
    const s = preverHonda(PLANETAS_HONDA.luna, 2, 100);
    expect(s.resultado).toBe('exito'); expect(s.x * s.vx + s.y * s.vy).toBeLessThan(0); expect(s.ganancia).toBe(0);
  });
});
describe('capitán de crucero', () => {
  it('hibernar ahorra energía y bloquea TCM; sin margen tampoco permite gastar', () => {
    const { ctx, e } = contexto(juno); let s = crearCapitan(e, juno, () => .3);
    expect(balanceCapitan({ ...s, modo: 'hibernacion' }, ctx)).toBeGreaterThan(balanceCapitan(s, ctx));
    s = pasoCapitan(s, { tipo: 'iniciar' }, ctx);
    const dormido = { ...s, modo: 'hibernacion' };
    expect(pasoCapitan(dormido, { tipo: 'tcm', sentido: 1 }, ctx)).toBe(dormido);
    const agotado = { ...s, nave: { ...s.nave, dvRestante: juno.dv_requerida_ms } };
    expect(pasoCapitan(agotado, { tipo: 'tcm', sentido: 1 }, ctx)).toBe(agotado);
    const corregido = pasoCapitan(s, { tipo: 'tcm', sentido: 1 }, ctx);
    expect(corregido.nave.dvRestante).toBeCloseTo(s.nave.dvRestante - 12); expect(corregido.vuelo.vy).toBeGreaterThan(s.vuelo.vy);
  });
  it('completa ambos cruceros, resuelve tres eventos y aplica el resultado una sola vez', () => {
    for (const mision of [lro, juno]) {
      const { ctx, e } = contexto(mision); let s = pasoCapitan(crearCapitan(e, mision, () => .3), { tipo: 'iniciar' }, ctx);
      for (let i = 0; i < 3000 && s.fase !== 'fin' && s.fase !== 'fallo'; i++) {
        if (s.fase === 'evento') {
          const op = { tormenta: 'proteger', desvio: 'medir', termico: 'dormir' }[s.evento];
          s = pasoCapitan(s, { tipo: 'resolver', opcion: op }, ctx);
          expect(pasoCapitan(s, { tipo: 'resolver', opcion: op }, ctx)).toBe(s);
        } else if (s.fase === 'maniobra') s = pasoCapitan(s, { tipo: 'seguir' }, ctx);
        else s = pasoCapitan(s, { tipo: 'tiempo', dt: .1 }, ctx);
      }
      expect(s.fase).toBe('fin'); expect(s.resueltos).toHaveLength(3);
      expect(s.nave.dvRestante).toBe(e.dvRestante);
      const n = aplicarCapitan(e, s); expect(n.cruceroCompletado).toBe(true); expect(aplicarCapitan(n, s)).toBe(n);
      expect(dvParaInsercion(n, mision)).toBeCloseTo(dvParaInsercion(e, mision));
    }
  });
  it('pausa el mundo ante eventos y el entrenamiento nunca modifica la campaña', () => {
    const { ctx, e } = contexto(juno); const s = crearCapitan(e, juno, () => .1, 'venus');
    const ev = { ...s, fase: 'evento', evento: 'tormenta' };
    expect(pasoCapitan(ev, { tipo: 'tiempo', dt: .1 }, ctx)).toBe(ev);
    const pausa = pasoCapitan(pasoCapitan(s, { tipo: 'iniciar' }, ctx), { tipo: 'pausar' }, ctx);
    expect(pasoCapitan(pausa, { tipo: 'tiempo', dt: .1 }, ctx)).toBe(pausa);
    expect(aplicarCapitan(e, { ...s, fase: 'fin' })).toBe(e);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ESPERA_TIERRA_MS, PROGRESO_INICIAL, cobrarActividadTierra, esperaTierra, guardarProgreso, leerProgreso, reiniciarCampana } from './progreso.js';
import { NIVELES_PILOTAJE } from '../motor/pilotajeTierra.js';
import { PREGUNTAS_ENTREVISTA } from '../motor/entrevista.js';

const rondaPerfecta = () => ({ tipo: 'entrevista', respuestas: PREGUNTAS_ENTREVISTA.slice(0, 8).map(p => ({ preguntaId: p.id, opcion: p.correcta })) });
const desbloqueado = () => ({ ...PROGRESO_INICIAL, completadas: ['lro'], fondos: 260, pagos: { lro: 260 }, premios: { lro: 'jiram' } });
function almacenamiento() {
  const memoria = new Map();
  vi.stubGlobal('localStorage', { getItem: k => memoria.get(k) ?? null, setItem: (k,v) => memoria.set(k,v), removeItem: k => memoria.delete(k) });
}
afterEach(() => vi.unstubAllGlobals());

it('se desbloquea al completar LRO; el dinero extra no cambia los premios de campaña', () => {
  expect(cobrarActividadTierra(PROGRESO_INICIAL, rondaPerfecta(), 'ronda-1')).toBe(PROGRESO_INICIAL);
  const antes = desbloqueado(); const despues = cobrarActividadTierra(antes, rondaPerfecta(), 'ronda-1');
  expect(despues.fondos).toBe(340);
  for (const clave of ['pagos', 'premios', 'medallas', 'completadas', 'desbloqueados', 'premiosVistos']) expect(despues[clave]).toBe(antes[clave]);
  expect(antes.fondos).toBe(260);
});
it('el cobro se recuerda al recargar; repetir la misma ronda no paga dos veces', () => {
  almacenamiento();
  guardarProgreso(cobrarActividadTierra(desbloqueado(), rondaPerfecta(), 'ronda-1'));
  const cargado = leerProgreso();
  expect(cobrarActividadTierra(cargado, rondaPerfecta(), 'ronda-1')).toBe(cargado);
  const nueva = cobrarActividadTierra(cargado, rondaPerfecta(), 'ronda-2');
  expect(nueva.fondos).toBe(420);
  expect(Object.keys(nueva.pagosTierra)).toHaveLength(2);
});
it('una mala entrevista no descuenta de los fondos de la campaña y queda cobrada', () => {
  const ronda = rondaPerfecta(); ronda.respuestas = ronda.respuestas.map(r => ({ ...r, opcion: (r.opcion + 1) % 3 }));
  const p = cobrarActividadTierra(desbloqueado(), ronda, 'sin-aciertos');
  expect(p.fondos).toBe(260); expect(p.pagosTierra['sin-aciertos'].pago).toBe(0);
  expect(cobrarActividadTierra(p, rondaPerfecta(), 'sin-aciertos')).toBe(p);
});
it('descarta cobros sin identificador, rondas incompletas, tipo desconocido y fondos inválidos', () => {
  const p = desbloqueado();
  for (const id of [null, '', '   ', 'x'.repeat(129)]) expect(cobrarActividadTierra(p, rondaPerfecta(), id)).toBe(p);
  for (const resultado of [null, {}, { tipo:'otro' }, { tipo:'entrevista', respuestas:[] }]) expect(cobrarActividadTierra(p, resultado, 'ronda')).toBe(p);
  const roto = { ...p, fondos: NaN }; expect(cobrarActividadTierra(roto, rondaPerfecta(), 'ronda')).toBe(roto);
});
it('reiniciar borra también los pagos extra y vuelve a bloquear las actividades', () => {
  almacenamiento(); guardarProgreso(cobrarActividadTierra(desbloqueado(), rondaPerfecta(), 'ronda-1'));
  expect(reiniciarCampana()).toBe(true);
  const reiniciado = leerProgreso(); expect(reiniciado.pagosTierra).toEqual({}); expect(reiniciado.fondos).toBe(0);
  expect(cobrarActividadTierra(reiniciado, rondaPerfecta(), 'ronda-1')).toBe(reiniciado);
});

it('suma pilotaje según dificultad y aciertos, sin confiar en cantidades del resultado', () => {
  for (const [dificultad, cfg] of Object.entries(NIVELES_PILOTAJE)) {
    const p = desbloqueado();
    const resultado = { tipo: 'pilotaje', dificultad, total: cfg.total, aciertos: cfg.total, pago: 9999 };
    const cobrado = cobrarActividadTierra(p, resultado, dificultad);
    expect(cobrado.fondos).toBe(p.fondos + cfg.premio);
    expect(cobrarActividadTierra(cobrado, resultado, dificultad)).toBe(cobrado);
  }
  for (const datos of [{ dificultad: 'imposible', total: 12, aciertos: 12 }, { dificultad: 'novato', total: 12, aciertos: 500 }, { dificultad: 'novato', total: 12, aciertos: NaN }]) {
    expect(cobrarActividadTierra(desbloqueado(), { tipo: 'pilotaje', ...datos }, 'invalida').fondos).toBe(260);
  }
});

describe('espera de 1 hora en Tierra', () => {
  it('tras hacer las 2 actividades se bloquean 1 hora; una sola no bloquea', () => {
    const base = { ...PROGRESO_INICIAL, completadas: ['lro'], fondos: 0 };
    const t0 = 1_000_000;
    const entrevista = rondaPerfecta();
    const nivel = Object.keys(NIVELES_PILOTAJE)[0];
    let p = cobrarActividadTierra(base, entrevista, 'a', t0);
    expect(esperaTierra(p, t0)).toBe(0);
    p = cobrarActividadTierra(p, { tipo: 'pilotaje', dificultad: nivel, aciertos: 0, total: NIVELES_PILOTAJE[nivel].total }, 'b', t0 + 1000);
    expect(esperaTierra(p, t0 + 1000)).toBe(ESPERA_TIERRA_MS);
    expect(cobrarActividadTierra(p, entrevista, 'c', t0 + 2000)).toBe(p);
    const despues = t0 + 1000 + ESPERA_TIERRA_MS;
    expect(esperaTierra(p, despues)).toBe(0);
    const q = cobrarActividadTierra(p, entrevista, 'd', despues);
    expect(q.tierraCiclo).toEqual({ entrevista: despues });
  });
});

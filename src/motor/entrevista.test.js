import { describe, expect, it } from 'vitest';
import { calcularPagoEntrevista, PREGUNTAS_ENTREVISTA, seleccionarPreguntas } from './entrevista.js';
import es from '../i18n/es/entrevista.js';
import en from '../i18n/en/entrevista.js';
const respuestas = PREGUNTAS_ENTREVISTA.slice(0, 8).map(p => ({ preguntaId: p.id, opcion: p.correcta }));
describe('entrevista en la Tierra', () => {
  it('paga hasta 80 M y descuenta 5 M por error, sin saldo negativo', () => {
    expect(calcularPagoEntrevista(respuestas)).toBe(80);
    const fallo = { ...respuestas[0], opcion: (respuestas[0].opcion + 1) % 3 };
    expect(calcularPagoEntrevista([fallo, ...respuestas.slice(1)])).toBe(65);
    expect(calcularPagoEntrevista(respuestas.map(r => ({ ...r, opcion: (r.opcion + 1) % 3 })))).toBe(0);
  });
  it('no paga entradas manipuladas ni preguntas duplicadas', () => {
    for (const r of [null, {}, [...respuestas, respuestas[0]], [respuestas[0], respuestas[0]], [{preguntaId:'inventada',opcion:0}], [{...respuestas[0],opcion:NaN}], [{...respuestas[0],opcion:3}], [{...respuestas[0],opcion:'0'}]]) expect(calcularPagoEntrevista(r)).toBe(0);
  });
  it('elige ocho preguntas únicas y no modifica el banco', () => {
    const ids = PREGUNTAS_ENTREVISTA.map(p => p.id);
    for (const azar of [() => 0, () => .5, () => .999, () => NaN]) {
      const ronda = seleccionarPreguntas(azar);
      expect(ronda).toHaveLength(8); expect(new Set(ronda.map(p => p.id)).size).toBe(8);
    }
    expect(PREGUNTAS_ENTREVISTA.map(p => p.id)).toEqual(ids);
  });
  it('cada pregunta tiene explicación y opciones en los dos idiomas', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const p of PREGUNTAS_ENTREVISTA) for (const dic of [es, en]) {
      expect(dic[`entrevista.${p.id}.pregunta`]).toBeTruthy();
      expect(dic[`entrevista.${p.id}.explicacion`]).toBeTruthy();
      for (let i = 0; i < p.opciones; i++) expect(dic[`entrevista.${p.id}.opcion.${i}`]).toBeTruthy();
    }
  });
});

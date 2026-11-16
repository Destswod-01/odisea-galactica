import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import { resumenNave } from './nave.js';
import { aplicarInsercion, bloqueOrbitas, estadoInicial } from './mision.js';
import { eficienciaFrenado, radioApoapsisCaptura } from './llegada.js';

const kit = { cohete: 'atlas_v_401', propulsion: 'tanque_chico', energia: 'panel_chico', antena: 'antena_alta', blindaje: 'blindaje_ninguno', instrumentos: ['lroc', 'lend'] };
const base = () => estadoInicial(resumenNave(kit, piezas, cohetes, lro), lro, kit);

describe('frenado (efecto Oberth)', () => {
  it('rinde 100 % en el periapsis y menos lejos de él', () => {
    expect(eficienciaFrenado(0)).toBe(1);
    expect(eficienciaFrenado(0.5)).toBeLessThan(0.8);
    expect(eficienciaFrenado(-0.5)).toBe(eficienciaFrenado(0.5));
  });
  it('frenar lejos gasta igual pero puede no capturar', () => {
    const e = base();
    const lejos = aplicarInsercion(e, lro, lro.dv_insercion_ms, 0.6);
    const cerca = aplicarInsercion(e, lro, lro.dv_insercion_ms, 1);
    expect(lejos.estado.dvRestante).toBe(cerca.estado.dvRestante);
    expect(lejos.resultado).toBe('escape');
    expect(cerca.resultado).toBe('captura');
  });
  it('la órbita predicha se cierra al frenar más', () => {
    expect(radioApoapsisCaptura(0.5)).toBe(Infinity);
    expect(radioApoapsisCaptura(1)).toBeGreaterThan(radioApoapsisCaptura(1.1));
  });
});

describe('pasadas científicas', () => {
  it('sin aciertos no hay ciencia; con todos, igual que el modo automático perfecto', () => {
    const e = base();
    const cero = bloqueOrbitas(e, kit, piezas, lro, { superficie: 0, agua: 0, radiacion: 0 });
    const todo = bloqueOrbitas(e, kit, piezas, lro, { superficie: 1, agua: 1, radiacion: 1 });
    const auto = bloqueOrbitas(e, kit, piezas, lro);
    expect(cero.ganancia).toBe(0);
    expect(todo.ganancia).toBeCloseTo(auto.ganancia, 5);
  });
});

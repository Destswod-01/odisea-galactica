import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { recursosHangar, resumenDestinos, limitesNodriza, requisitosDestino, TOPE_DRONES_DISENO } from './recursos.js';
import { EQUIPO_DRON } from './drones.js';

const preparar = (mision, drones = 2) => {
  const diseno = { ...disenoReal(mision, piezas), drones };
  return { diseno, resumen: resumenNave(diseno, piezas, cohetes, mision) };
};

describe('panel de recursos del hangar (rama metrics, adaptado a la nave del jugador)', () => {
  it('las cinco barras salen del resumen de la nave sin recalcular nada', () => {
    const { diseno, resumen } = preparar(lro);
    const r = recursosHangar({ resumen, mision: lro, diseno, progreso: { fondos: 120 } });
    expect(r.filas.map(f => f.id)).toEqual(['costo', 'masa', 'energia', 'dv', 'datos']);
    const masa = r.filas.find(f => f.id === 'masa');
    expect(masa.usado).toBe(resumen.barras.masa.valor);
    expect(masa.disponible).toBe(resumen.barras.masa.limite);
    expect(r.fondos).toBe(120);
  });
  it('la bahía usa el tope y los pesos del juego, no los de una nodriza ASTRION', () => {
    const { diseno, resumen } = preparar(lro, 3);
    const r = recursosHangar({ resumen, mision: lro, diseno, progreso: null });
    expect(r.drones).toMatchObject({ usados: 3, maximo: TOPE_DRONES_DISENO, masa_kg: 3 * EQUIPO_DRON.masa_kg, ok: true });
    expect(r.fondos).toBeNull();
  });
  it('la referencia real del destino compara la nave del jugador con los mínimos del archivo de métricas', () => {
    for (const mision of [lro, juno]) {
      const { diseno, resumen } = preparar(mision);
      const req = requisitosDestino(mision.id), r = recursosHangar({ resumen, mision, diseno });
      const pot = r.referencia.find(x => x.id === 'potencia'), dv = r.referencia.find(x => x.id === 'dv');
      expect(pot.requerido).toBe(req.potencia_w);
      expect(pot.ok).toBe(resumen.barras.energia.valor >= req.potencia_w);
      expect(dv.requerido).toBe(req.dv_total_ms);
      // El Δv total de referencia coincide con el que exige el juego.
      expect(req.dv_total_ms).toBe(mision.dv_requerida_ms);
    }
  });
  it('el garage nodriza conserva los límites ASTRION y un renglón por destino', () => {
    const x = limitesNodriza('astrion_x');
    expect(x.slots).toBeGreaterThan(0);
    expect(x.maxDrones).toBeLessThanOrEqual(TOPE_DRONES_DISENO);
    expect(resumenDestinos('astrion_s').map(d => d.id)).toEqual(['luna', 'marte', 'jupiter']);
    expect(resumenDestinos('astrion_s').find(d => d.id === 'jupiter').veredicto).toBe('no_viable');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import lro from '../datos/misiones/lro.json';
import { PREMIOS_LRO, PROGRESO_INICIAL, cobrar, leerProgreso, guardarProgreso } from '../estado/progreso.js';
import { readFileSync } from 'node:fs';
afterEach(() => vi.unstubAllGlobals());
it('cada resultado del sorteo desbloquea exactamente una pieza', () => {
  PREMIOS_LRO.forEach((id, i) => {
    const r = cobrar(PROGRESO_INICIAL, lro, 'Bronce', () => (i + .5) / PREMIOS_LRO.length);
    expect(r.premio).toBe(id);
    // El premio al azar + los sistemas de Juno que habilita completar LRO (DESBLOQUEOS_JUNO).
    expect(r.progreso.desbloqueados).toEqual(expect.arrayContaining([...PROGRESO_INICIAL.desbloqueados, id, ...DESBLOQUEOS_JUNO]));
    expect(r.progreso.fondos).toBe(260);
    expect(readFileSync(new URL(`../../public/img/premios/${id}.svg`, import.meta.url),'utf8')).toContain('<svg');
  });
});
it('excluye piezas ya compradas', () => {
 const p = { ...PROGRESO_INICIAL, desbloqueados:[...PROGRESO_INICIAL.desbloqueados, PREMIOS_LRO[0]] };
 expect(cobrar(p,lro,'Plata',()=>0).premio).toBe(PREMIOS_LRO[1]);
});
it('sin candidatos paga el dinero sin duplicar piezas',()=>{
 const p={...PROGRESO_INICIAL,desbloqueados:[...PROGRESO_INICIAL.desbloqueados,...PREMIOS_LRO]};
 const r=cobrar(p,lro,'Oro');
 expect(r.premio).toBeNull(); expect(r.progreso.fondos).toBe(340);
 expect(r.progreso.desbloqueados).toEqual(p.desbloqueados);
});
it('fallar no sortea ni paga',()=>{
 const azar=vi.fn(); const r=cobrar(PROGRESO_INICIAL,lro,'Sin medalla',azar);
 expect(azar).not.toHaveBeenCalled(); expect(r.premio).toBeNull(); expect(r.pago).toBe(0);
});
it('recargar conserva el premio pendiente y no vuelve a sortear',()=>{
 let guardado;
 vi.stubGlobal('localStorage',{setItem:(_,v)=>{guardado=v;},getItem:()=>guardado});
 const a=cobrar(PROGRESO_INICIAL,lro,'Bronce',()=>.3); guardarProgreso(a.progreso);
 const azar=vi.fn(); const b=cobrar(leerProgreso(),lro,'Bronce',azar);
 expect(azar).not.toHaveBeenCalled(); expect(b.premio).toBe(a.premio); expect(b.pago).toBe(0);
 const visto={...b.progreso,premiosVistos:{lro:true}}; guardarProgreso(visto);
 const c=cobrar(leerProgreso(),lro,'Oro',azar);
 expect(c.premio).toBeNull(); expect(c.pago).toBe(80); expect(azar).not.toHaveBeenCalled();
});
it('partidas anteriores que ya completaron LRO conservan compras y reciben los sistemas de Juno',()=>{
 const viejo={...PROGRESO_INICIAL,completadas:['lro'],pagos:{lro:120}};
 vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(viejo)});
 expect(leerProgreso().desbloqueados).toEqual([...viejo.desbloqueados, ...DESBLOQUEOS_JUNO]);
 expect(cobrar(leerProgreso(),lro,'Bronce',()=>0).premio).toBeNull();
});
it('pago considerable pero menor al coste restante del kit, incluso con el mejor premio',()=>{
 expect(Object.values(lro.recompensa)).toEqual([260,300,340,360]);
 for(const monto of Object.values(lro.recompensa)) expect(monto+150).toBeLessThan(520);
});

import piezasJ from '../datos/piezas.json';
import cohetesJ from '../datos/cohetes.json';
import junoJ from '../datos/misiones/juno.json';
import { DESBLOQUEOS_JUNO, estaDesbloqueado, comprar as comprarJ } from '../estado/progreso.js';
import { resumenNave } from './nave.js';
import { requisitos } from './requisitos.js';
import { misionConDificultad, NIVELES } from './dificultad.js';

// Kit mínimo de Juno (validado por Codex en c264994): tras LRO debe poder armarse con lo desbloqueado + el premio en dinero.
const KIT = { cohete: 'atlas_v_551', propulsion: 'tanque_mediano', energia: 'panel_gigante', antena: 'antena_alta', blindaje: 'boveda_titanio',
  instrumentos: ['mwr', 'mag', 'jiram', 'particulas'], bateria: 'bateria_basica', computadora: 'computadora_estandar', orientacion: 'orientacion_basica', drones: 4 };
describe('campaña: después de LRO se puede jugar Juno', () => {
  for (const nivel of NIVELES) it(`el kit es viable en ${nivel}`, () => {
    const m = misionConDificultad(junoJ, nivel), r = resumenNave(KIT, piezasJ, cohetesJ, m);
    expect(r.problemas).toEqual([]);
    expect(requisitos(m, r).filter(x => !x.cumple)).toEqual([]);
  });
  it('con Bronce y cualquier premio, el kit queda desbloqueado o al alcance del premio', () => {
    PREMIOS_LRO.forEach((_, i) => {
      let p = cobrar(PROGRESO_INICIAL, lro, 'Bronce', () => (i + .5) / PREMIOS_LRO.length).progreso;
      for (const id of DESBLOQUEOS_JUNO) expect(p.desbloqueados).toContain(id);
      const todos = [...piezasJ, ...cohetesJ];
      for (const id of [KIT.cohete, KIT.propulsion, KIT.energia, KIT.antena, KIT.blindaje, ...KIT.instrumentos, KIT.bateria, KIT.computadora, KIT.orientacion]) {
        const pieza = todos.find(x => x.id === id);
        if (!estaDesbloqueado(p, pieza)) p = comprarJ(p, pieza);
        expect(estaDesbloqueado(p, pieza)).toBe(true);
      }
    });
  });
});

import { afterEach, expect, it, vi } from 'vitest';
import { cobrar, guardarProgreso, leerProgreso, PROGRESO_INICIAL, reiniciarCampana } from './progreso.js';
import { guardarPartida, leerPartida } from './partida.js';
import lro from '../datos/misiones/lro.json';
afterEach(() => vi.unstubAllGlobals());
it('borra campaña, checkpoint e historial y permite ganar de nuevo el primer premio', () => {
 const memoria = new Map();
 vi.stubGlobal('localStorage', {getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v),removeItem:k=>memoria.delete(k)});
 const ganada=cobrar(PROGRESO_INICIAL,lro,'Oro',()=>0).progreso;
 guardarProgreso({...ganada,premiosVistos:{lro:true}});
 guardarPartida({misionId:'juno',fase:'hangar',diseno:{cohete:'atlas_v_551'}});
 for(const k of ['orbita2-intentos','orbita2-clasificacion','odisea-sin-consejos']) memoria.set(k,'datos');
 for(const [k,v] of [['odisea-nombre','Ana'],['orbita2-idioma','en'],['vdl-silencio','1'],['otra-app','conservar']]) memoria.set(k,v);
 expect(reiniciarCampana()).toBe(true);
 expect(leerProgreso()).toEqual(PROGRESO_INICIAL);
 expect(leerPartida()).toBeNull();
 expect([...memoria.keys()]).toEqual(['odisea-nombre','orbita2-idioma','vdl-silencio','otra-app']);
 const nueva=cobrar(leerProgreso(),lro,'Bronce',()=>.5);
 expect(nueva.pago).toBe(260); expect(nueva.premio).toBeTruthy();
});
it('informa un fallo de almacenamiento para no recargar fingiendo éxito',()=>{
 vi.stubGlobal('localStorage',{removeItem:()=>{throw new Error('bloqueado');}});
 expect(reiniciarCampana()).toBe(false);
});

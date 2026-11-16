import { describe, expect, it } from 'vitest';
import { calcularPagoPilotaje, crearPilotaje, NIVELES_PILOTAJE, pasoPilotaje } from './pilotajeTierra.js';
describe('pilotaje terrestre', () => {
  it('cada dificultad paga su máximo y una fracción por los aciertos reales', () => {
    for (const [dificultad, cfg] of Object.entries(NIVELES_PILOTAJE)) {
      expect(calcularPagoPilotaje({tipo:'pilotaje', dificultad, total:cfg.total, aciertos:cfg.total})).toBe(cfg.premio);
      expect(calcularPagoPilotaje({tipo:'pilotaje', dificultad, total:cfg.total, aciertos:cfg.total/2})).toBe(Math.floor(cfg.premio/2));
      expect(calcularPagoPilotaje({tipo:'pilotaje', dificultad, total:cfg.total, aciertos:0})).toBe(0);
    }
  });
  it('rechaza totales manipulados, resultados inválidos y dificultades inexistentes', () => {
    const valido={tipo:'pilotaje', dificultad:'novato', total:12, aciertos:6};
    for(const cambio of [{total:1},{aciertos:13},{aciertos:-1},{aciertos:1.5},{aciertos:NaN},{dificultad:'experto'},{dificultad:'__proto__',total:undefined},{tipo:'otro'}]) expect(calcularPagoPilotaje({...valido,...cambio})).toBe(0);
    expect(calcularPagoPilotaje(null)).toBe(0);
  });
  it('ofrece curvas dentro del espacio alcanzable y más velocidad con menos tolerancia', () => {
    const niveles=Object.entries(NIVELES_PILOTAJE);
    for(const [dificultad,cfg] of niveles){
      const s=crearPilotaje(dificultad);
      expect(s.ruta).toHaveLength(cfg.total);
      expect(s.ruta.slice(0,2).every(a=>a.x===0&&a.y===0)).toBe(true);
      expect(s.ruta.slice(2).some(a=>a.x>5)).toBe(true);
      expect(s.ruta.slice(2).some(a=>a.x<-5)).toBe(true);
      for(let i=1;i<s.ruta.length;i++) {
        const a=s.ruta[i-1],b=s.ruta[i];
        expect(Math.abs(b.x)).toBeLessThan(12); expect(Math.abs(b.y)).toBeLessThan(7);
        expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(cfg.lateral*cfg.separacion/cfg.velocidad);
      }
    }
    expect(niveles[2][1].velocidad).toBeGreaterThan(niveles[0][1].velocidad);
    expect(niveles[2][1].radio).toBeLessThan(niveles[0][1].radio);
  });
  it('reutiliza cruce de aros, termina el circuito y no vuelve a contar aros', () => {
    for(const [dificultad,cfg] of Object.entries(NIVELES_PILOTAJE)) {
      const s=crearPilotaje(dificultad);
      for(let frame=0;frame<4000&&!s.terminado;frame++) pasoPilotaje(s,{},.05,dificultad);
      expect(s.terminado).toBe(true); expect(s.indice).toBe(cfg.total); expect(s.aciertos).toBeGreaterThanOrEqual(2);
      const aciertos=s.aciertos; pasoPilotaje(s,{der:true},.05,dificultad); expect(s.aciertos).toBe(aciertos);
    }
  });
});

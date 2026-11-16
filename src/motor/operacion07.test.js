import { describe, it, expect } from 'vitest';
import { CONFIG_OPERACION as C, GASES, OBJETIVOS_MAPA, DATOS_OPERACION, absorcion, ajusteEspectral, generarMuestras, escalaEnlace, anguloTierra, calidadSenal, tasaTransmision, velocidadObjetivos, calificacionF1, calificacionF2, calificacionF3, calidadOperacion, crearOperacion07, pasoOperacion, aplicarOperacion07 } from './operacion07.js';

const LRO = { id: 'lro', destino: { id: 'luna' } }, JUNO = { id: 'juno', destino: { id: 'jupiter' } };
const estado = { bateria: 2000, bateriaMax: 2000, ciencia: 0, perdida: null, decisiones: [] };
const resumen = { enlace: 4000, ciencia: { total: 0.8 } };
const crear = (f = 1, semilla = 5, m = LRO, r = resumen) => crearOperacion07(estado, m, r, { semilla, fase: f });
const jugar = (f = 1, semilla = 5, m = LRO, r = resumen) => pasoOperacion(crear(f, semilla, m, r), { tipo: 'empezar' });
const tick = (s, dt = 1 / 30, eje = 0) => pasoOperacion(s, { tipo: 'tiempo', dt, eje });
const correr = (s, seg, eje = 0, dt = 1 / 30) => { for (let t = 0; t < seg && s.fase === 'jugando'; t += dt) s = tick(s, dt, eje); return s; };
// Pone un objetivo justo dentro de la retícula.
const conObjetivo = (s, extra = {}) => ({ ...s, g: { ...s.g, objetivos: [...s.g.objetivos, { id: 900 + s.g.objetivos.length, x: C.X_VISOR, y: s.g.y, r: 36, usado: false, nombre: 'Prueba', ...extra }] } });
const capturar = s => pasoOperacion(conObjetivo(s), { tipo: 'capturar' });
// Solución exacta de la muestra actual de la fase 2.
const resolver = s => { for (let i = 0; i < 4; i++) s = pasoOperacion(s, { tipo: 'nivel', i, d: s.g.objetivos[s.g.muestra][i] }); return pasoOperacion(s, { tipo: 'comprobar' }); };
// Gira la antena hasta quedar sobre la Tierra (el ángulo coincide con el de la Tierra en este instante).
const alinear = s => ({ ...s, g: { ...s.g, angulo: anguloTierra(s.g, s.g.t) } });

describe('creación y datos', () => {
  it('empieza en la ficha de la fase pedida y se puede saltar a otra', () => {
    expect(crear().fase).toBe('ficha');
    expect(crear().f).toBe(1);
    expect(crear(3).f).toBe(3);
    expect(crear(9).f).toBe(3);
    expect(crear(1, 5, JUNO).destino).toBe('jupiter');
  });
  it('tiempos 55/60/40, 8 capturas, +15 %, 3 muestras al 86 %', () => {
    expect(C.TIEMPO).toEqual([55, 60, 40]);
    expect(C.CAPTURAS_META).toBe(8);
    expect(C.VEL_FACTOR).toBe(1.15);
    expect(C.MUESTRAS).toBe(3);
    expect(C.COINCIDENCIA_MIN).toBe(86);
    expect(C.COSTO_REINTENTO).toBe(0.02);
    expect(crear(2).t).toBe(60);
  });
  it('cada destino trae sus objetivos, gases y datos reales', () => {
    expect(GASES.luna.map(g => g.id)).toEqual(['H2O', 'CO', 'NH3', 'CH4']);
    expect(GASES.jupiter.map(g => g.id)).toEqual(['NH3', 'H2O', 'CH4', 'PH3']);
    expect(OBJETIVOS_MAPA.jupiter.some(n => /Gran Mancha Roja/.test(n))).toBe(true);
    expect(OBJETIVOS_MAPA.luna.some(n => /Apolo/.test(n))).toBe(true);
    expect(DATOS_OPERACION.luna.f1.real).toMatch(/LROC/);
    expect(DATOS_OPERACION.jupiter.f1.real).toMatch(/JunoCam/);
    expect(DATOS_OPERACION.luna.f2.real).toMatch(/LCROSS/);
    expect(DATOS_OPERACION.jupiter.f2.real).toMatch(/amoníaco/);
    expect(DATOS_OPERACION.luna.retardo).toMatch(/1,3 s/);
    expect(DATOS_OPERACION.jupiter.retardo).toMatch(/45 minutos/);
    expect(DATOS_OPERACION.jupiter.f3.real).toMatch(/Goldstone, Madrid y Canberra/);
  });
  it('el retardo de la señal: 1,3 s a la Luna y 33–53 min a Júpiter', () => {
    expect(crear(3).retardoS).toBe(1.3);
    for (let sem = 1; sem < 30; sem++) { const r = crear(3, sem, JUNO).retardoS; expect(r).toBeGreaterThanOrEqual(33 * 60); expect(r).toBeLessThanOrEqual(53 * 60); }
  });
});

describe('fase 1 · cartografía', () => {
  it('captura un objetivo dentro de la retícula y suma puntos', () => {
    const s = capturar(jugar());
    expect(s.g.capturas).toBe(1);
    expect(s.puntos).toBe(C.PTS_CAPTURA);
    expect(s.g.destello).toBeGreaterThan(0);
  });
  it('un disparo fuera de la retícula es un error y resta puntaje', () => {
    let s = capturar(jugar());
    const fuera = { ...s, g: { ...s.g, objetivos: [{ id: 1, x: C.X_VISOR, y: s.g.y + C.TOLERANCIA_Y + 20, r: 36, usado: false, nombre: 'Lejos' }] } };
    const n = pasoOperacion(fuera, { tipo: 'capturar' });
    expect(n.g.capturas).toBe(1);
    expect(n.g.vacios).toBe(1);
    expect(n.puntos).toBe(C.PTS_CAPTURA - C.PTS_VACIO);
    const lejosX = pasoOperacion({ ...s, g: { ...s.g, objetivos: [{ id: 1, x: C.X_VISOR + C.TOLERANCIA_X + 10, y: s.g.y, r: 36, usado: false, nombre: 'Lejos' }] } }, { tipo: 'capturar' });
    expect(lejosX.g.vacios).toBe(1);
  });
  it('el puntaje nunca baja de cero', () => {
    const s = pasoOperacion(jugar(), { tipo: 'capturar' });
    expect(s.puntos).toBe(0);
    expect(s.g.vacios).toBe(1);
  });
  it('cada captura sube la velocidad un 15 %', () => {
    expect(velocidadObjetivos(0)).toBe(C.VEL_OBJETIVOS);
    expect(velocidadObjetivos(1) / velocidadObjetivos(0)).toBeCloseTo(1.15, 10);
    expect(velocidadObjetivos(3) / velocidadObjetivos(2)).toBeCloseTo(1.15, 10);
    // Y se nota en el movimiento: un objetivo recorre más en el mismo tiempo con 1 captura que con 0.
    const base = conObjetivo(jugar(), { x: 700 });
    const rapido = { ...base, g: { ...base.g, capturas: 1 } };
    const a = tick(base, 0.05), b = tick(rapido, 0.05);
    const recorrido = n => 700 - n.g.objetivos.find(o => o.id === 900).x;
    expect(recorrido(b) / recorrido(a)).toBeCloseTo(1.15, 6);
  });
  it('8 capturas completan la fase con su calificación', () => {
    let s = jugar();
    for (let i = 0; i < 8; i++) s = capturar(s);
    expect(s.fase).toBe('resultado');
    expect(s.califs[0]).toBeGreaterThan(0.7);
    expect(s.califs[0]).toBeLessThanOrEqual(1);
    expect(s.resultados[0].real).toMatch(/LROC/);
  });
  it('7 capturas no bastan', () => {
    let s = jugar();
    for (let i = 0; i < 7; i++) s = capturar(s);
    expect(s.fase).toBe('jugando');
  });
  it('los objetivos aparecen solos, avanzan a la izquierda y no pasan de 8 en juego', () => {
    let s = jugar();
    s = correr(s, 6);
    expect(s.g.objetivos.length).toBeGreaterThan(0);
    expect(s.g.objetivos.every(o => o.nombre && o.y >= C.Y_MIN && o.y <= C.Y_MAX)).toBe(true);
    const x0 = s.g.objetivos[0].x, id = s.g.objetivos[0].id;
    s = tick(s, 0.05);
    expect(s.g.objetivos.find(o => o.id === id).x).toBeLessThan(x0);
  });
  it('el visor se mueve en vertical y se queda dentro del marco', () => {
    let s = correr(jugar(), 5, -1);
    expect(s.g.y).toBe(C.Y_MIN);
    s = correr(s, 6, 1);
    expect(s.g.y).toBe(C.Y_MAX);
  });
  it('el tiempo agotado falla la fase y no cuenta como completada', () => {
    let s = jugar();
    s = correr(s, 60);
    expect(s.fase).toBe('fallo');
    expect(s.t).toBe(0);
    expect(s.califs[0]).toBeNull();
  });
  it('la calificación sube con el tiempo sobrante y baja con los disparos al vacío', () => {
    expect(calificacionF1(8, 55, 0)).toBe(1);
    expect(calificacionF1(8, 10, 0)).toBeLessThan(calificacionF1(8, 40, 0));
    expect(calificacionF1(8, 30, 5)).toBeLessThan(calificacionF1(8, 30, 0));
    expect(calificacionF1(4, 30, 0)).toBeLessThan(calificacionF1(8, 30, 0));
    expect(calificacionF1(8, 0, 99)).toBe(0);
  });
});

describe('fase 2 · análisis espectral', () => {
  it('la coincidencia es 100 con la mezcla correcta y baja con la incorrecta', () => {
    for (const destino of ['luna', 'jupiter']) {
      const gases = GASES[destino];
      for (const m of generarMuestras(destino, 3)) {
        expect(ajusteEspectral(gases, m, m)).toBe(100);
        expect(ajusteEspectral(gases, m, [0, 0, 0, 0])).toBeLessThan(C.COINCIDENCIA_MIN);
        for (let i = 0; i < 4; i++) {
          const mal = m.map((v, k) => (k === i ? (v >= C.NIVEL_MAX ? v - 1 : v + 1) : v));
          expect(ajusteEspectral(gases, m, mal)).toBeLessThan(C.COINCIDENCIA_MIN);
        }
      }
    }
  });
  it('cada gas tiene una firma distinta (la curva cambia al subir su nivel)', () => {
    for (const destino of ['luna', 'jupiter']) {
      for (let i = 0; i < 4; i++) {
        const v = [0, 0, 0, 0]; v[i] = 4;
        expect(ajusteEspectral(GASES[destino], v, [0, 0, 0, 0])).toBeLessThan(C.COINCIDENCIA_MIN);
      }
      expect(absorcion(GASES[destino], 0.5, [0, 0, 0, 0])).toBe(0);
    }
  });
  it('las 3 muestras tienen solución con niveles de 0 a 4 y son distintas', () => {
    for (const destino of ['luna', 'jupiter']) for (let sem = 1; sem <= 15; sem++) {
      const ms = generarMuestras(destino, sem);
      expect(ms.length).toBe(3);
      expect(new Set(ms.map(m => m.join())).size).toBe(3);
      for (const m of ms) { expect(m.every(v => Number.isInteger(v) && v >= 0 && v <= 4)).toBe(true); expect(m.filter(v => v > 0).length).toBeGreaterThanOrEqual(2); }
    }
  });
  it('resolver las 3 muestras con su solución completa la fase', () => {
    for (const m of [LRO, JUNO]) {
      let s = jugar(2, 9, m);
      for (let k = 0; k < 3; k++) { expect(s.fase).toBe('jugando'); s = resolver(s); }
      expect(s.fase).toBe('resultado');
      expect(s.califs[1]).toBe(1);
      expect(s.puntos).toBeGreaterThan(250);
    }
  });
  it('con el teclado: A/D eligen el gas y W/S cambian la cantidad (0–4)', () => {
    let s = jugar(2);
    s = pasoOperacion(s, { tipo: 'gas', d: 1 });
    expect(s.g.sel).toBe(1);
    s = pasoOperacion(s, { tipo: 'gas', d: -1 }); s = pasoOperacion(s, { tipo: 'gas', d: -1 });
    expect(s.g.sel).toBe(3);
    for (let i = 0; i < 7; i++) s = pasoOperacion(s, { tipo: 'nivel', d: 1 });
    expect(s.g.niveles[3]).toBe(4);
    for (let i = 0; i < 9; i++) s = pasoOperacion(s, { tipo: 'nivel', d: -1 });
    expect(s.g.niveles[3]).toBe(0);
  });
  it('ENTER fallido penaliza puntaje y calificación, y no avanza la muestra', () => {
    let s = resolver(jugar(2));
    const puntos = s.puntos;
    s = pasoOperacion(s, { tipo: 'comprobar' });
    expect(s.g.muestra).toBe(1);
    expect(s.g.fallos).toBe(1);
    expect(s.puntos).toBe(puntos - C.PTS_FALLO_ESPECTRO);
    expect(s.g.coincidencia).toBeLessThan(86);
    expect(calificacionF2([100, 100, 100], 2)).toBeCloseTo(1 - 2 * C.F2_PENAL_FALLO, 5);
    expect(calificacionF2([90, 90, 90], 0)).toBe(0.9);
  });
  it('el tiempo agotado falla la fase', () => {
    const s = correr(jugar(2), 65);
    expect(s.fase).toBe('fallo');
  });
});

describe('fase 3 · transmisión', () => {
  it('la calidad de señal es máxima en el ángulo de la Tierra y cae al alejarse', () => {
    expect(calidadSenal(90, 90)).toBe(100);
    expect(calidadSenal(100, 90)).toBeLessThan(100);
    expect(calidadSenal(130, 90)).toBeLessThan(calidadSenal(100, 90));
    expect(calidadSenal(170, 90)).toBeLessThan(5);
    const s = jugar(3);
    expect(calidadSenal(anguloTierra(s.g, 0), anguloTierra(s.g, 0))).toBe(100);
  });
  it('no inicia la transmisión con señal baja, y sí con señal alta', () => {
    let s = jugar(3);
    s = { ...s, g: { ...s.g, angulo: s.g.base > 90 ? 0 : 180 } };
    s = pasoOperacion(s, { tipo: 'transmitir' });
    expect(s.g.tx).toBe(false);
    expect(s.mensaje).toMatch(/débil/);
    s = pasoOperacion(alinear(s), { tipo: 'transmitir' });
    expect(s.g.tx).toBe(true);
    s = pasoOperacion(s, { tipo: 'transmitir' });
    expect(s.g.tx).toBe(false);
  });
  it('transmitiendo con buena señal, el avance sube y llega al 100 %', () => {
    let s = pasoOperacion(alinear(jugar(3)), { tipo: 'transmitir' });
    for (let i = 0; i < 40 * 30 && s.fase === 'jugando'; i++) s = tick(alinear(s), 1 / 30);
    expect(s.fase).toBe('resultado');
    expect(s.califs[2]).toBeGreaterThan(0.7);
  });
  it('el avance retrocede si la señal cae durante la transmisión', () => {
    let s = pasoOperacion(alinear(jugar(3)), { tipo: 'transmitir' });
    for (let i = 0; i < 60; i++) s = tick(alinear(s), 1 / 30);
    const antes = s.g.avance;
    expect(antes).toBeGreaterThan(0);
    s = { ...s, g: { ...s.g, angulo: s.g.angulo > 90 ? s.g.angulo - 80 : s.g.angulo + 80 } };
    s = tick(s, 0.1);
    expect(s.g.avance).toBeLessThan(antes);
    expect(s.g.cortes).toBe(1);
    s = tick({ ...s, g: { ...s.g, angulo: s.g.angulo } }, 0.1);
    expect(s.g.cortes).toBe(1); // el mismo corte no se cuenta dos veces
  });
  it('sin transmitir el avance no se mueve', () => {
    const s = tick(alinear(jugar(3)), 0.1);
    expect(s.g.avance).toBe(0);
  });
  it('la antena del hangar cambia la velocidad dentro de los límites', () => {
    const t = (enlace, m = LRO) => tasaTransmision(crear(3, 5, m, { enlace, ciencia: { total: 1 } }));
    expect(t(1100)).toBeLessThan(t(4000));
    expect(t(4000)).toBeLessThan(t(16200));
    expect(escalaEnlace(1, 'luna')).toBe(C.ESCALA_MIN);
    expect(escalaEnlace(1e9, 'luna')).toBe(C.ESCALA_MAX);
    expect(escalaEnlace(0, 'luna')).toBe(C.ESCALA_MIN);
    expect(escalaEnlace(4000, 'luna')).toBeCloseTo(1, 10);
    expect(escalaEnlace(40, 'jupiter')).toBeGreaterThanOrEqual(C.ESCALA_MIN);
    expect(escalaEnlace(600, 'jupiter')).toBeLessThanOrEqual(C.ESCALA_MAX);
    expect(escalaEnlace(600, 'jupiter')).toBeGreaterThan(escalaEnlace(40, 'jupiter'));
    expect(t(200, JUNO)).toBeLessThan(t(4000)); // a igual escala (1), la base de Júpiter es menor
  });
  it('con una antena mejor se llega antes', () => {
    const tiempo = enlace => { let s = pasoOperacion(alinear(jugar(3, 5, LRO, { enlace, ciencia: { total: 1 } })), { tipo: 'transmitir' }); let n = 0; while (s.fase === 'jugando' && n++ < 4000) s = tick(alinear(s), 1 / 30); return s.fase === 'resultado' ? s.t : 0; };
    expect(tiempo(16200)).toBeGreaterThan(tiempo(4000));
  });
  it('la Tierra se mueve despacio y su ángulo depende de la semilla', () => {
    const s = jugar(3);
    const a0 = anguloTierra(s.g, 0), a1 = anguloTierra(s.g, 4);
    expect(a1).not.toBe(a0);
    for (let t = 0; t < 60; t += 0.5) { const a = anguloTierra(s.g, t); expect(a).toBeGreaterThanOrEqual(10); expect(a).toBeLessThanOrEqual(170); }
    // movimiento lento: a lo más unos pocos grados por segundo
    expect(Math.abs(anguloTierra(s.g, 1) - anguloTierra(s.g, 0))).toBeLessThan(15);
    expect(jugar(3, 1).g.base).not.toBe(jugar(3, 2).g.base);
    // y durante el juego el ángulo avanza con el tiempo
    const n = correr(s, 4);
    expect(anguloTierra(n.g, n.g.t)).not.toBe(anguloTierra(s.g, 0));
  });
  it('A/D giran la antena entre 0 y 180°', () => {
    let s = correr(jugar(3), 4, -1);
    expect(s.g.angulo).toBe(0);
    s = correr(s, 4, 1);
    expect(s.g.angulo).toBe(180);
  });
  it('sin tiempo la fase falla', () => {
    const s = correr(jugar(3), 45);
    expect(s.fase).toBe('fallo');
  });
  it('calificación: más tiempo sobrante mejor, cada corte resta', () => {
    expect(calificacionF3(40, 0)).toBe(1);
    expect(calificacionF3(5, 0)).toBeLessThan(calificacionF3(20, 0));
    expect(calificacionF3(20, 3)).toBeLessThan(calificacionF3(20, 0));
  });
});

describe('pausa, flujo y reintento', () => {
  it('la pausa detiene el tiempo y reanuda donde estaba', () => {
    let s = tick(jugar(), 0.05);
    const t = s.t;
    s = pasoOperacion(s, { tipo: 'pausar' });
    expect(s.fase).toBe('pausa');
    expect(tick(s, 0.05).t).toBe(t);
    expect(pasoOperacion(s, { tipo: 'capturar' })).toBe(s);
    s = pasoOperacion(s, { tipo: 'reanudar' });
    expect(s.fase).toBe('jugando');
  });
  it('las acciones de otra fase no hacen nada', () => {
    const s = jugar(1);
    expect(pasoOperacion(s, { tipo: 'comprobar' })).toBe(s);
    expect(pasoOperacion(s, { tipo: 'transmitir' })).toBe(s);
    expect(pasoOperacion(jugar(2), { tipo: 'capturar' }).g.vacios).toBeUndefined();
  });
  it('de la tarjeta de resultado se pasa a la siguiente fase y, al final, al cierre', () => {
    let s = jugar(1);
    for (let i = 0; i < 8; i++) s = capturar(s);
    s = pasoOperacion(s, { tipo: 'siguiente' });
    expect(s.f).toBe(2);
    expect(s.fase).toBe('ficha');
    expect(s.califs[0]).not.toBeNull();
    let f3 = { ...s, f: 3, fase: 'resultado' };
    f3 = pasoOperacion(f3, { tipo: 'siguiente' });
    expect(f3.fase).toBe('final');
  });
  it('reintentar cuesta el 2 % de la batería y vuelve a la misma fase sin ficha', () => {
    let s = correr(jugar(1), 60);
    expect(s.fase).toBe('fallo');
    s = pasoOperacion(s, { tipo: 'reintentar' });
    expect(s.fase).toBe('jugando');
    expect(s.f).toBe(1);
    expect(s.t).toBe(55);
    expect(s.reintentos).toBe(1);
    expect(s.costoTotal).toBeCloseTo(40, 10);
    expect(s.bateriaNave).toBeCloseTo(1960, 10);
    s = correr(s, 60);
    s = pasoOperacion(s, { tipo: 'reintentar' });
    expect(s.reintentos).toBe(2);
    expect(s.costoTotal).toBeCloseTo(80, 10);
  });
  it('fuera de un fallo no se puede reintentar (no se cobra gratis ni se regala)', () => {
    const s = jugar();
    expect(pasoOperacion(s, { tipo: 'reintentar' })).toBe(s);
  });
  it('los reintentos son ilimitados', () => {
    let s = jugar(3);
    for (let i = 0; i < 6; i++) { s = correr(s, 45); expect(s.fase).toBe('fallo'); s = pasoOperacion(s, { tipo: 'reintentar' }); }
    expect(s.reintentos).toBe(6);
    expect(s.bateriaNave).toBeGreaterThan(0);
  });
});

// Una operación terminada con las tres calificaciones dadas.
const final = (califs, reintentos = 0) => ({ ...crear(1), fase: 'final', califs, reintentos, costoTotal: reintentos * 40, resultados: califs.map((c, i) => ({ calif: c, texto: `Texto ${i + 1}.`, real: 'Dato real.' })) });

describe('resultado para la campaña', () => {
  it('calidad = 0,35·f1 + 0,35·f2 + 0,30·f3', () => {
    expect(calidadOperacion([1, 1, 1])).toBe(1);
    expect(calidadOperacion([0, 0, 0])).toBe(0);
    expect(calidadOperacion([1, 0, 0])).toBeCloseTo(0.35, 10);
    expect(calidadOperacion([0.8, 0.6, 0.5])).toBeCloseTo(0.28 + 0.21 + 0.15, 10);
  });
  it('ciencia = ciencia posible × (0,4 + 0,6 × calidad)', () => {
    const e = aplicarOperacion07(estado, final([0.8, 0.6, 0.5]), { ciencia: { total: 0.9 } });
    expect(e.ciencia).toBeCloseTo(0.9 * (0.4 + 0.6 * 0.64), 10);
    expect(e.calidadOperacion).toBeCloseTo(0.64, 10);
    expect(e.operacionCompletada).toBe(true);
    // jugar mal sigue dando el 40 % de la ciencia posible
    expect(aplicarOperacion07(estado, final([0, 0, 0]), { ciencia: { total: 0.5 } }).ciencia).toBeCloseTo(0.2, 10);
  });
  it('la ciencia se recorta a 1', () => {
    expect(aplicarOperacion07(estado, final([1, 1, 1]), { ciencia: { total: 1.7 } }).ciencia).toBe(1);
    expect(aplicarOperacion07(estado, final([1, 1, 1]), { ciencia: { total: 1 } }).ciencia).toBe(1);
  });
  it('agrega una decisión por fase con su calificación y el dato real, y descuenta la batería de los reintentos', () => {
    const e = aplicarOperacion07(estado, final([0.9, 0.7, 0.5], 2), resumen);
    const ds = e.decisiones.slice(estado.decisiones.length);
    expect(ds.length).toBe(4); // 3 fases + el aviso de reintentos
    expect(ds[0].texto).toMatch(/fase 1 \(Cartografía orbital\): 90 %/);
    expect(ds[1].texto).toMatch(/70 %/);
    expect(ds[2].texto).toMatch(/Dato real/);
    expect(ds[3].texto).toMatch(/2 reintentos/);
    expect(e.bateria).toBe(2000 - 80);
    expect(aplicarOperacion07(estado, final([1, 1, 1]), resumen).decisiones.length).toBe(3);
  });
  it('es idempotente: una segunda llamada no cambia nada', () => {
    const e1 = aplicarOperacion07(estado, final([0.9, 0.9, 0.9], 1), resumen);
    const e2 = aplicarOperacion07(e1, final([0.2, 0.2, 0.2], 5), resumen);
    expect(e2).toBe(e1);
    expect(e2.decisiones.length).toBe(e1.decisiones.length);
  });
  it('no corre si la misión ya estaba perdida', () => {
    const perdido = { ...estado, perdida: 'La electrónica no resistió.' };
    expect(aplicarOperacion07(perdido, final([1, 1, 1]), resumen)).toBe(perdido);
  });
  it('no aplica una operación sin terminar y no inventa pérdidas', () => {
    expect(aplicarOperacion07(estado, jugar(), resumen)).toBe(estado);
    expect(aplicarOperacion07(estado, final([1, 1, 1]), resumen).perdida).toBeNull();
  });
  it('la batería nunca baja de cero', () => {
    expect(aplicarOperacion07({ ...estado, bateria: 10 }, final([1, 1, 1], 1), resumen).bateria).toBe(0);
  });
});

describe('determinismo con semilla', () => {
  it('misma semilla y mismas acciones, misma partida', () => {
    const corrida = sem => { let s = jugar(1, sem); for (let i = 0; i < 90; i++) s = tick(s, 1 / 30, i % 2 ? 1 : -1); return s; };
    expect(corrida(11)).toEqual(corrida(11));
    expect(corrida(11).g.objetivos).not.toEqual(corrida(12).g.objetivos);
    expect(generarMuestras('luna', 4)).toEqual(generarMuestras('luna', 4));
    expect(generarMuestras('luna', 4)).not.toEqual(generarMuestras('luna', 5));
    expect(jugar(3, 8).g).toEqual(jugar(3, 8).g);
  });
});

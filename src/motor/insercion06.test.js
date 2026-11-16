import { describe, it, expect } from 'vitest';
import { CONFIG_INSERCION as C, ESCENARIOS_LLEGADA, CATALOGO_CUERPOS, RAROS_CUERPOS, progresion, existeRuta, generarCuerpos, crearInsercion, pasoInsercion, aplicarInsercion06, precisionInsercion, puedeCerrar, cuerposPorSuperar, posicionCuerpo, temaMision, calidadFoto, puntosFoto, comboTras, puntosMaximos, estrellasMision, compararRecord, estrellasPromedio } from './insercion06.js';

const LRO = { id: 'lro' }, JUNO = { id: 'juno' };
const estado = { bateria: 2000, bateriaMax: 2000, decisiones: [] };
// Partida lista para jugar (cinemática, ficha y tarjeta del tema saltadas).
const jugar = (m = LRO, semilla = 5) => [{ tipo: 'cinematica_saltar' }, { tipo: 'empezar' }, { tipo: 'empezar' }].reduce(pasoInsercion, crearInsercion(estado, m, { semilla }));
// Salta la tarjeta del tema si la hay.
const sinTarjeta = s => (s.fase === 'tema' ? pasoInsercion(s, { tipo: 'empezar' }) : s);
const avanzar = (s, seg, eje = 0, dt = 1 / 30) => { for (let t = 0; t < seg && s.fase === 'jugando'; t += dt) s = pasoInsercion(s, { tipo: 'tiempo', dt, eje }); return s; };
// Avanza hasta el instante t (o hasta que cambie la fase).
const hasta = (s, t, eje = 0) => { while (s.fase === 'jugando' && s.t < t - 1e-9) s = pasoInsercion(s, { tipo: 'tiempo', dt: Math.min(1 / 30, t - s.t), eje }); return s; };
// Un cuerpo «de prueba» que cruza la línea de la sonda en tc, en la posición xc, cayendo en vertical.
const cuerpo = (extra = {}) => ({ id: 0, tipo: 'eyeccion', nombre: 'fragmento de eyección', clase: 'Roca de eyección', color: '#999', radio: .7, rcol: .6, tc: 3, xc: 0, vx: 0, vy: 4, rot0: [0, 0, 0], w: [1, 1, 1], forma: 1, foto: false, pasado: false, ...extra });

describe('escenarios y catálogo', () => {
  it('las dos misiones son inserciones orbitales', () => {
    expect(ESCENARIOS_LLEGADA).toEqual({ lro: 'insercion', juno: 'insercion' });
    expect(crearInsercion(estado, LRO).escenario).toBe('insercion');
  });
  it('Júpiter usa Metis y Adrastea como variante de juego', () => {
    expect(CATALOGO_CUERPOS.jupiter.some(c => /Metis/.test(c.nombre) && /variante de juego/.test(c.nombre))).toBe(true);
    expect(CATALOGO_CUERPOS.jupiter.some(c => /Adrastea/.test(c.nombre))).toBe(true);
    expect(CATALOGO_CUERPOS.luna.some(c => /eyección/.test(c.nombre))).toBe(true);
    expect(CATALOGO_CUERPOS.luna.some(c => /meteoroide/.test(c.nombre))).toBe(true);
  });
  it('los cuerpos salen del catálogo de su destino', () => {
    const luna = generarCuerpos('luna', 1, 3).map(c => c.tipo), jup = generarCuerpos('jupiter', 1, 3).map(c => c.tipo);
    expect(luna.every(t => CATALOGO_CUERPOS.luna.some(c => c.tipo === t))).toBe(true);
    expect(jup.every(t => CATALOGO_CUERPOS.jupiter.some(c => c.tipo === t))).toBe(true);
  });
});

describe('generación de cuerpos', () => {
  it('de 4 a 6 cuerpos en cualquier misión', () => {
    for (let n = 1; n <= 15; n++) for (const d of ['luna', 'jupiter']) {
      const k = generarCuerpos(d, n, n * 3).length;
      expect(k).toBeGreaterThanOrEqual(4); expect(k).toBeLessThanOrEqual(6);
    }
  });
  it('es determinista con la semilla', () => {
    expect(generarCuerpos('luna', 2, 42)).toEqual(generarCuerpos('luna', 2, 42));
    expect(generarCuerpos('luna', 2, 42)).not.toEqual(generarCuerpos('luna', 2, 43));
    expect(crearInsercion(estado, JUNO, { semilla: 9 }).cuerpos).toEqual(crearInsercion(estado, JUNO, { semilla: 9 }).cuerpos);
  });
  it('las diagonales no son verticales y son distintas entre sí; cada cuerpo gira por su cuenta', () => {
    for (let sem = 1; sem <= 12; sem++) for (const n of [1, 3, 6]) {
      const cs = generarCuerpos('luna', n, sem), vx = cs.map(c => c.vx);
      for (const v of vx) expect(Math.abs(v)).toBeGreaterThanOrEqual(C.VX_MIN - 1e-9);
      for (let i = 0; i < vx.length; i++) for (let j = i + 1; j < vx.length; j++) expect(Math.abs(vx[i] - vx[j])).toBeGreaterThan(.04);
      for (const c of cs) expect(c.w.every(w => Math.abs(w) > .5)).toBe(true);
      expect(new Set(cs.map(c => c.w.join())).size).toBe(cs.length);
    }
  });
  it('las ventanas de foto no se pisan: los cruces van separados más que la ventana', () => {
    for (let n = 1; n <= 12; n++) {
      const tc = generarCuerpos('jupiter', n, 77).map(c => c.tc);
      for (let i = 1; i < tc.length; i++) expect(tc[i] - tc[i - 1]).toBeGreaterThan(temaMision(n, 'jupiter').ventana + .3);
    }
  });
});

describe('progresión', () => {
  it('sube con las misiones y respeta los topes', () => {
    const p1 = progresion(1), p3 = progresion(3), p9 = progresion(9), p40 = progresion(40);
    expect(p3.vy).toBeGreaterThan(p1.vy); expect(p3.vxMax).toBeGreaterThan(p1.vxMax); expect(p3.gap).toBeLessThan(p1.gap); expect(p3.cuerpos).toBeGreaterThanOrEqual(p1.cuerpos);
    expect(p9.vy).toBeGreaterThan(p3.vy);
    expect(p40.vy).toBe(C.VY_MAX); expect(p40.vxMax).toBe(C.VX_MAX); expect(p40.gap).toBe(C.GAP_MIN); expect(p40.cuerpos).toBe(C.CUERPOS_MAX);
    expect(p1.cuerpos).toBe(C.CUERPOS_MIN);
  });
  it('los cuerpos generados no superan los topes de velocidad', () => {
    for (const c of generarCuerpos('luna', 60, 4)) { expect(c.vy).toBeLessThanOrEqual(C.VY_MAX * 1.12 * C.BOLIDO_VEL * C.RASANTE_VEL + 1e-9); expect(Math.abs(c.vx)).toBeLessThanOrEqual(C.VX_MAX + 1e-9); }
  });
});

describe('jugabilidad garantizada', () => {
  it('siempre existe una ruta de esquive (varias semillas, misiones y destinos)', () => {
    let revisadas = 0;
    for (const d of ['luna', 'jupiter']) for (let sem = 1; sem <= 25; sem++) for (const n of [1, 2, 3, 5, 8, 14, 30]) {
      expect(existeRuta(generarCuerpos(d, n, sem * 13 + n))).toBe(true); revisadas++;
    }
    expect(revisadas).toBe(2 * 25 * 7);
  });
  it('existeRuta detecta una situación imposible: una pared de cuerpos que cruzan juntos', () => {
    const pared = [-4, -2, 0, 2, 4].map((xc, i) => cuerpo({ id: i, xc, tc: 3, rcol: 1.3 }));
    expect(existeRuta(pared)).toBe(false);
    expect(existeRuta([cuerpo({ xc: 0 })])).toBe(true);
  });
});

describe('minisonda y límites laterales', () => {
  it('se mueve según el eje y se detiene en los límites', () => {
    let s = jugar(); s = { ...s, cuerpos: [] };
    s = avanzar(s, .2, 1); expect(Math.abs(s.x - C.VEL_X * .2)).toBeLessThan(.3);
    s = avanzar(s, 3, 1); expect(s.x).toBe(C.XMAX);
    s = avanzar(s, 5, -1); expect(s.x).toBe(-C.XMAX);
  });
  it('el eje se acota a −1..1', () => {
    let s = { ...jugar(), cuerpos: [] };
    s = avanzar(s, .1, 9); expect(s.x).toBeLessThanOrEqual(C.VEL_X * .11);
  });
});

describe('colisión', () => {
  it('choca cuando la esfera del cuerpo toca la de la sonda y avisa con el nombre', () => {
    let s = { ...jugar(), x: 0, cuerpos: [cuerpo({ xc: .3, tc: 2 })] };
    s = avanzar(s, 5);
    expect(s.fase).toBe('fallo'); expect(s.motivo.tipo).toBe('choque'); expect(s.motivo.texto).toMatch(/Misión 1 fallida: la minisonda chocó con un fragmento de eyección/); expect(s.fallos).toBe(1);
  });
  it('no choca si pasa por fuera de los radios sumados', () => {
    let s = { ...jugar(), x: 0, cuerpos: [cuerpo({ xc: C.RADIO_SONDA + .6 + .3, tc: 2 })] };
    s = hasta(s, 2.5);
    expect(s.fase).toBe('jugando');
  });
  it('el choque es por esferas aunque el tiempo llegue en un solo trozo grande', () => {
    let s = { ...jugar(), x: 0, cuerpos: [cuerpo({ xc: 0, tc: 1, vy: 4.8 })] };
    s = pasoInsercion(s, { tipo: 'tiempo', dt: .1, eje: 0 }); // 0,1 s se parten en pasos de 1/60
    for (let i = 0; i < 12 && s.fase === 'jugando'; i++) s = pasoInsercion(s, { tipo: 'tiempo', dt: .1, eje: 0 });
    expect(s.fase).toBe('fallo');
  });
});

describe('ventana de foto', () => {
  const base = () => ({ ...jugar(), x: 4, cuerpos: [cuerpo({ xc: -3, tc: 2 }), cuerpo({ id: 1, xc: -3, tc: 6 })] });
  it('se abre cuando el cuerpo pasa por debajo de la sonda y dura 1,1 s', () => {
    expect(C.VENTANA_FOTO_S).toBe(1.1);
    let s = hasta(base(), 1.9); expect(s.ventana).toBeNull();
    s = hasta(s, 2.05); expect(s.ventana).toMatchObject({ idx: 0 }); expect(s.ventana.restante).toBeGreaterThan(1); expect(s.ventana.restante).toBeLessThanOrEqual(1.1);
  });
  it('dentro de la ventana la foto se registra con su ficha', () => {
    let s = hasta(base(), 2.5);
    s = pasoInsercion(s, { tipo: 'foto' });
    expect(s.fase).toBe('jugando'); expect(s.fotos).toHaveLength(1); expect(s.fotosMision).toBe(1); expect(s.ventana).toBeNull();
    expect(s.fotos[0]).toMatchObject({ n: 1, mision: 1, nombre: 'fragmento de eyección', clase: 'Roca de eyección', color: '#999' });
    expect(cuerposPorSuperar(s)).toBe(1);
  });
  it('fuera de tiempo la misión falla', () => {
    let s = hasta(base(), 2 + 1.1 + .1);
    expect(s.fase).toBe('fallo'); expect(s.motivo.tipo).toBe('foto'); expect(s.motivo.texto).toMatch(/Misión 1 fallida/); expect(s.fallos).toBe(1);
  });
  it('en el último instante todavía cuenta', () => {
    let s = hasta(base(), 2 + 1.05);
    expect(s.fase).toBe('jugando'); s = pasoInsercion(s, { tipo: 'foto' }); expect(s.fotos).toHaveLength(1);
  });
  it('ESPACIO sin ventana no hace nada malo, solo avisa «sin objetivo»', () => {
    let s = hasta(base(), 1);
    const n = pasoInsercion(s, { tipo: 'foto' });
    expect(n.fase).toBe('jugando'); expect(n.fotos).toHaveLength(0); expect(n.sinObjetivo).toBe(s.sinObjetivo + 1);
  });
  it('la pausa congela la ventana', () => {
    let s = hasta(base(), 2.5);
    const r0 = s.ventana.restante;
    s = pasoInsercion(s, { tipo: 'pausar' }); expect(s.fase).toBe('pausa');
    s = pasoInsercion(s, { tipo: 'tiempo', dt: .1, eje: 0 }); s = pasoInsercion(s, { tipo: 'foto' });
    expect(s.ventana.restante).toBe(r0); expect(s.fotos).toHaveLength(0);
    s = pasoInsercion(s, { tipo: 'reanudar' }); expect(s.fase).toBe('jugando');
  });
});

describe('ESPACIO solo en flanco de bajada', () => {
  it('mantener presionado no saca varias fotos', () => {
    // Dos cuerpos con ventanas seguidas: con la tecla mantenida solo se toma la primera foto.
    let s = { ...jugar(), x: 4, cuerpos: [cuerpo({ xc: -3, tc: 2 }), cuerpo({ id: 1, xc: -3, tc: 3.6 })] };
    s = hasta(s, 2.2);
    s = pasoInsercion(s, { tipo: 'foto', abajo: true });
    expect(s.fotos).toHaveLength(1);
    s = hasta(s, 3.9);
    expect(s.ventana).not.toBeNull();
    for (let i = 0; i < 5; i++) s = pasoInsercion(s, { tipo: 'foto', abajo: true }); // tecla repetida por el teclado
    expect(s.fotos).toHaveLength(1);
    s = pasoInsercion(s, { tipo: 'foto', abajo: false });
    s = pasoInsercion(s, { tipo: 'foto', abajo: true });
    expect(s.fotos).toHaveLength(2);
  });
  it('soltar y volver a pulsar sí cuenta como una pulsación nueva', () => {
    let s = { ...jugar(), x: 4, cuerpos: [cuerpo({ xc: -3, tc: 2 })] };
    s = hasta(s, 2.3);
    s = pasoInsercion(s, { tipo: 'foto', abajo: true }); s = pasoInsercion(s, { tipo: 'foto', abajo: true });
    expect(s.fotos).toHaveLength(1); expect(s.sinObjetivo).toBe(0);
  });
});

describe('fases, éxito de misión y reintento', () => {
  it('cinemática (se puede saltar) → ficha → jugando', () => {
    let s = crearInsercion(estado, LRO, { semilla: 1 });
    expect(s.fase).toBe('cinematica');
    for (let i = 0; i < 70; i++) s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 });
    expect(s.fase).toBe('ficha');
    expect(pasoInsercion(crearInsercion(estado, LRO), { tipo: 'cinematica_saltar' }).fase).toBe('ficha');
    expect(sinTarjeta(pasoInsercion(s, { tipo: 'empezar' })).fase).toBe('jugando');
  });
  it('misión cumplida: sube el contador y la siguiente empieza sola a los 3 s (con su tarjeta de tema) sin volver a la nodriza', () => {
    let s = { ...jugar(), x: 4, cuerpos: [cuerpo({ xc: -3, tc: 1.5 })] };
    s = hasta(s, 2); s = pasoInsercion(s, { tipo: 'foto' });
    expect(s.fase).toBe('exito_mision'); expect(s.cumplidas).toBe(1); expect(s.fotos).toHaveLength(1);
    const x = s.x;
    for (let i = 0; i < 28; i++) s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 });
    expect(s.fase).toBe('exito_mision');
    for (let i = 0; i < 4; i++) s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 });
    expect(s.fase).toBe('tema'); expect(s.tema.id).toBe('noche');
    for (let i = 0; i < 21; i++) s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 });
    expect(s.fase).toBe('jugando'); expect(s.numero).toBe(2); expect(s.fotos).toHaveLength(1); expect(s.fotosMision).toBe(0); expect(s.x).toBe(x);
    expect(s.cuerpos.length).toBeGreaterThanOrEqual(4);
  });
  it('reintento: misma misión, −1 % de la batería de la nave por cada uno', () => {
    let s = { ...jugar(), x: 0, cuerpos: [cuerpo({ xc: 0, tc: 2 })] };
    s = avanzar(s, 5); expect(s.fase).toBe('fallo');
    const r = pasoInsercion(s, { tipo: 'reintentar' });
    expect(r.fase).toBe('jugando'); expect(r.numero).toBe(1); expect(r.intento).toBe(2); expect(r.t).toBe(0);
    expect(r.bateriaNave).toBeCloseTo(2000 - 20, 6);
    expect(r.cuerpos.length).toBeGreaterThanOrEqual(4); expect(r.cuerpos.every(c => !c.foto && !c.pasado)).toBe(true);
    expect(pasoInsercion(r, { tipo: 'reintentar' })).toBe(r); // solo se reintenta desde un fallo
    let r2 = { ...r, cuerpos: [cuerpo({ xc: 0, tc: 2 })], x: 0 }; r2 = avanzar(r2, 5);
    expect(pasoInsercion(r2, { tipo: 'reintentar' }).bateriaNave).toBeCloseTo(2000 - 40, 6);
  });
  it('el reintento no baja de 0 de batería', () => {
    let s = { ...jugar(), bateriaNave: 5, cuerpos: [cuerpo({ tc: 2 })] };
    s = avanzar(s, 5);
    expect(pasoInsercion(s, { tipo: 'reintentar' }).bateriaNave).toBe(0);
  });
});

describe('cierre de la etapa y aplicarInsercion06', () => {
  // Cumple una misión con un cuerpo de prueba y deja que empiece la siguiente.
  const cumplir = s => {
    s = { ...s, x: 4, cuerpos: [cuerpo({ xc: -3, tc: s.t + 1 })] };
    s = hasta(s, s.t + 1.3); s = pasoInsercion(s, { tipo: 'foto', abajo: true }); s = pasoInsercion(s, { tipo: 'foto', abajo: false });
    return s;
  };
  const dejarPasar = s => { for (let i = 0; i < 40 && s.fase === 'exito_mision'; i++) s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 }); return sinTarjeta(s); };
  it('hacen falta 3 misiones cumplidas para cerrar', () => {
    expect(C.MISIONES_PARA_CERRAR).toBe(3);
    let s = jugar();
    expect(puedeCerrar(s)).toBe(false);
    expect(pasoInsercion(s, { tipo: 'continuar' })).toBe(s);
    s = dejarPasar(cumplir(s)); s = dejarPasar(cumplir(s));
    expect(s.cumplidas).toBe(2); expect(pasoInsercion(s, { tipo: 'continuar' }).fase).toBe('jugando');
    s = cumplir(s); expect(s.cumplidas).toBe(3); expect(puedeCerrar(s)).toBe(true);
    s = dejarPasar(s); expect(s.fase).toBe('exito_mision'); // la etapa son 3 misiones: ya no arranca una 4.ª
    expect(pasoInsercion(s, { tipo: 'siguiente' })).toBe(s);
    expect(pasoInsercion(s, { tipo: 'continuar' }).fase).toBe('cerrable');
  });
  it('aplica la precisión (1 − 0,12 por fallo, mínimo 0,3), las fotos y es idempotente', () => {
    expect(precisionInsercion(0)).toBe(1); expect(precisionInsercion(2)).toBeCloseTo(.76, 6); expect(precisionInsercion(20)).toBe(.3);
    let s = jugar();
    s = { ...s, cuerpos: [cuerpo({ xc: 0, tc: 1 })] }; s = avanzar(s, 3); s = pasoInsercion(s, { tipo: 'reintentar' });
    s = dejarPasar(cumplir(s)); s = dejarPasar(cumplir(s)); s = cumplir(s);
    s = pasoInsercion(dejarPasar(s), { tipo: 'continuar' });
    expect(s.fase).toBe('cerrable'); expect(s.fallos).toBe(1);
    const e = aplicarInsercion06({ ...estado, decisiones: [] }, s);
    expect(e.insercionCompletada).toBe(true); expect(e.precisionInsercion).toBeCloseTo(.88, 6); expect(e.fotosOrbitales).toBe(3);
    expect(e.bateria).toBeCloseTo(1980, 6);
    expect(e.decisiones).toHaveLength(1); expect(e.decisiones[0].texto).toMatch(/23 de junio de 2009/);
    expect(aplicarInsercion06(e, s)).toBe(e);
    expect(aplicarInsercion06(aplicarInsercion06(e, s), s).decisiones).toHaveLength(1);
  });
  it('Juno cita el dato real de 2016 y no aplica nada antes de cerrar', () => {
    const s = jugar(JUNO);
    expect(aplicarInsercion06(estado, s)).toBe(estado);
    const cerrable = { ...s, fase: 'cerrable', cumplidas: 3, fotos: [] };
    expect(aplicarInsercion06({ ...estado, decisiones: [] }, cerrable).decisiones[0].texto).toMatch(/4 de julio de 2016.*35 minutos/);
  });
  it('sin 3D se omite: etapa completada sin precisión ni bonificación', () => {
    const s = pasoInsercion(crearInsercion(estado, LRO), { tipo: 'saltar', motivo: 'Sin WebGL.' });
    expect(s.fase).toBe('omitida');
    const e = aplicarInsercion06({ ...estado, decisiones: [], precisionInsercion: null }, s);
    expect(e.insercionCompletada).toBe(true); expect(e.precisionInsercion).toBeNull(); expect(e.fotosOrbitales).toBe(0);
    expect(aplicarInsercion06(e, s)).toBe(e);
  });
});

// ======================= v2 «más entretenido» =======================
// Escenario común: la sonda en x = 4 y los cuerpos a la izquierda (xc = −3), así que no chocan; cruzan en los instantes `tcs`.
const escenario = (tcs, extra = () => ({})) => ({ ...jugar(), x: 4, cuerpos: tcs.map((tc, i) => cuerpo({ id: i, xc: -3, tc, ...extra(i) })) });
// Dispara `d` segundos después de que el cuerpo cruza (con un solo pulso: baja y sube la tecla).
const disparar = (s, tc, d) => { s = hasta(s, tc + d); s = pasoInsercion(s, { tipo: 'foto', abajo: true }); return pasoInsercion(s, { tipo: 'foto', abajo: false }); };

describe('v2 · calidad de la foto según el momento', () => {
  it('PERFECTA el primer 35 %, BUENA hasta el 75 % y JUSTA el resto', () => {
    expect(C.CALIDADES.map(q => [q.id, q.hasta, q.pts])).toEqual([['PERFECTA', .35, 300], ['BUENA', .75, 200], ['JUSTA', 1, 100]]);
    expect(calidadFoto(0)).toBe('PERFECTA'); expect(calidadFoto(.35)).toBe('PERFECTA'); expect(calidadFoto(.36)).toBe('BUENA');
    expect(calidadFoto(.75)).toBe('BUENA'); expect(calidadFoto(.76)).toBe('JUSTA'); expect(calidadFoto(1)).toBe('JUSTA');
  });
  it('en el juego, disparar pronto, a media ventana o al final da 300, 200 y 100 puntos', () => {
    for (const [d, calidad, pts] of [[.2, 'PERFECTA', 300], [.6, 'BUENA', 200], [1.0, 'JUSTA', 100]]) {
      const s = disparar(escenario([2]), 2, d);
      expect(s.ultimaFoto).toMatchObject({ calidad, pts, mult: 1 }); expect(s.puntos).toBe(pts);
    }
  });
  it('las fotos fuera de la ventana no puntúan', () => {
    const s = pasoInsercion(hasta(escenario([2]), 1), { tipo: 'foto', abajo: true });
    expect(s.puntos).toBe(0); expect(s.fotos).toHaveLength(0);
  });
});

describe('v2 · combo', () => {
  it('sube con cada PERFECTA o BUENA seguida, tiene tope ×3 y una JUSTA lo reinicia', () => {
    expect(C.COMBO_MAX).toBe(3);
    let s = escenario([2, 4, 6, 8, 10]); const ptsFoto = [], combos = [];
    for (const [i, tc] of [2, 4, 6, 8].entries()) { s = disparar(s, tc, i === 1 ? .6 : .2); ptsFoto.push(s.ultimaFoto.pts); combos.push(s.combo); }
    expect(ptsFoto).toEqual([300, 400, 900, 900]); // PERFECTA ×1, BUENA ×2, PERFECTA ×3 y PERFECTA ×3 (tope)
    expect(combos).toEqual([2, 3, 3, 3]); expect(s.mejorCombo).toBe(3);
    s = disparar(s, 10, 1.0); // JUSTA: puntúa a ×1 y regresa el combo a ×1
    expect(s.ultimaFoto).toMatchObject({ calidad: 'JUSTA', pts: 100, mult: 1 });
    expect(s.combo).toBe(1); expect(s.mejorCombo).toBe(3);
  });
  it('funciones puras: puntos y combo', () => {
    expect(puntosFoto('PERFECTA', 2, false, null)).toEqual({ mult: 2, pts: 600 });
    expect(puntosFoto('PERFECTA', 9, false, null).mult).toBe(3);
    expect(puntosFoto('JUSTA', 3, false, null)).toEqual({ mult: 1, pts: 100 });
    expect([comboTras('BUENA', 1), comboTras('PERFECTA', 3), comboTras('JUSTA', 3)]).toEqual([2, 3, 1]);
  });
  it('cada misión empieza con el combo en ×1', () => {
    let s = disparar(escenario([1.5]), 1.5, .2);
    expect(s.fase).toBe('exito_mision'); s = pasoInsercion(s, { tipo: 'siguiente' });
    expect(s.fase).toBe('tema'); expect(s.combo).toBe(1); expect(s.puntos).toBe(0); expect(s.puntosTotal).toBe(300);
  });
});

describe('v2 · «¡Por poco!»', () => {
  const cerca = extra => ({ ...jugar(), x: 0, cuerpos: [cuerpo({ xc: 1.35, tc: 2, ...extra })] }); // radios sumados 1,15; pasa a 1,35 (< 1,15 + 0,45)
  it('da +150 una sola vez por cuerpo y avisa con un evento', () => {
    expect(C.POR_POCO_PTS).toBe(150); expect(C.POR_POCO_MARGEN).toBe(.45);
    let s = hasta(cerca(), 2.7);
    expect(s.fase).toBe('jugando'); expect(s.porPoco).toBe(1); expect(s.puntos).toBe(150);
    expect(s.eventos.filter(e => e.tipo === 'poco')).toHaveLength(1);
    s = hasta({ ...s, ventana: { ...s.ventana, restante: 9, total: 9 } }, 3.4);
    expect(s.porPoco).toBe(1); expect(s.puntos).toBe(150);
  });
  it('si el cuerpo es el último y se fotografía enseguida, también cuenta', () => {
    const s = disparar(cerca(), 2, .1);
    expect(s.fase).toBe('exito_mision'); expect(s.porPoco).toBe(1); expect(s.resumen.puntos).toBe(450); expect(s.resumen.porPoco).toBe(1);
  });
  it('no se da si pasa lejos', () => {
    const s = hasta({ ...cerca(), cuerpos: [cuerpo({ xc: 2.0, tc: 2 })] }, 2.9);
    expect(s.porPoco).toBe(0); expect(s.puntos).toBe(0);
  });
  it('nunca con choque: el cuerpo que choca no da el bono y se pierden los puntos de la misión', () => {
    let s = { ...jugar(), x: 0, cuerpos: [cuerpo({ id: 0, xc: 1.35, tc: 2 }), cuerpo({ id: 1, xc: 0, tc: 5 })] };
    s = disparar(s, 2, .3); // PERFECTA = 300
    s = avanzar(s, 6);
    expect(s.fase).toBe('fallo'); expect(s.motivo.tipo).toBe('choque');
    expect(s.cuerpos[1].poco).toBeFalsy(); expect(s.porPoco).toBe(1);
    expect(s.perdidos).toBe(450); expect(s.puntos).toBe(0); expect(s.puntosTotal).toBe(0);
  });
});

describe('v2 · tipos de cuerpo', () => {
  const todas = f => { for (const d of ['luna', 'jupiter']) for (let n = 1; n <= 12; n++) for (let sem = 1; sem <= 8; sem++) f(generarCuerpos(d, n, sem * 31 + n), d, n, sem); };
  it('de 4 a 6 cuerpos por misión y los tipos de cada misión', () => {
    todas((cs, d, n) => {
      expect(cs.length).toBeGreaterThanOrEqual(4); expect(cs.length).toBeLessThanOrEqual(6);
      const v = t => cs.filter(c => c.variante === t).length;
      expect(v('bolido')).toBe(1);
      if (n === 1) { expect(v('gigante') + v('oscilante') + v('raro')).toBe(0); expect(v('comun')).toBe(cs.length - 1); }
      else { expect(v('gigante')).toBe(1); expect(v('oscilante')).toBeGreaterThanOrEqual(1); expect(v('raro')).toBeLessThanOrEqual(1); }
    });
  });
  it('el raro aparece desde la misión 2 (nunca en la 1) en cerca del 60 % de los casos y trae un dato real', () => {
    let con = 0, total = 0;
    for (let sem = 1; sem <= 100; sem++) {
      expect(generarCuerpos('luna', 1, sem).some(c => c.variante === 'raro')).toBe(false);
      const raro = generarCuerpos('luna', 2, sem).find(c => c.variante === 'raro'); total++;
      if (raro) { con++; expect(RAROS_CUERPOS.luna.some(r => r.tipo === raro.tipo)).toBe(true); expect(raro.dato.length).toBeGreaterThan(20); expect(raro.brillo).toMatch(/^#/); }
    }
    expect(con / total).toBeGreaterThan(.45); expect(con / total).toBeLessThan(.75);
    expect(RAROS_CUERPOS.jupiter.every(r => r.dato && /variante de juego/.test(r.nombre))).toBe(true);
  });
  it('bólido más chico y rápido, gigante más grande y lento, raro vale ×2', () => {
    todas((cs, d, n) => {
      const tema = temaMision(n, d), base = progresion(n).vy * tema.vel;
      for (const c of cs) {
        if (c.variante === 'bolido') { expect(c.radio).toBeLessThanOrEqual(C.RADIO_MAX * C.BOLIDO_RADIO + 1e-9); expect(c.vy).toBeGreaterThanOrEqual(base * .88 * C.BOLIDO_VEL - 1e-9); }
        if (c.variante === 'gigante') { expect(c.radio).toBeGreaterThanOrEqual(C.RADIO_MIN * C.GIGANTE_RADIO - 1e-9); expect(c.vy).toBeLessThanOrEqual(base * 1.12 * C.GIGANTE_VEL + 1e-9); }
      }
    });
    expect(puntosFoto('PERFECTA', 1, true, null).pts).toBe(600);
    const s = disparar(escenario([2], () => ({ variante: 'raro', dato: 'dato de prueba' })), 2, .2);
    expect(s.ultimaFoto).toMatchObject({ pts: 600, raro: true, dato: 'dato de prueba' });
  });
  it('el oscilante es predecible: amplitud ≤ 0,8, periodo ≥ 1,6 s y misma posición siempre', () => {
    let vistos = 0;
    todas(cs => {
      for (const c of cs.filter(k => k.variante === 'oscilante')) {
        vistos++;
        expect(c.osc.amp).toBeLessThanOrEqual(.8 + 1e-9); expect(c.osc.amp).toBeGreaterThan(0); expect(c.osc.periodo).toBeGreaterThanOrEqual(1.6 - 1e-9);
        for (const t of [0, 1.3, c.tc - .4, c.tc, c.tc + 2.2]) {
          const p = posicionCuerpo(c, t), lineal = c.xc + c.vx * (t - c.tc);
          expect(Math.abs(p.x - lineal)).toBeLessThanOrEqual(c.osc.amp + 1e-9);
          expect(posicionCuerpo(c, t)).toEqual(p);
          expect(posicionCuerpo(c, t + c.osc.periodo).x - p.x).toBeCloseTo(c.vx * c.osc.periodo, 9); // un periodo después: solo avanza la recta
        }
      }
    });
    expect(vistos).toBeGreaterThan(50);
  });
  it('la colisión sigue la posición real del oscilante (y sin vaivén no choca)', () => {
    const osc = { amp: .8, periodo: 2, fase: -Math.PI / 2 }; // en el cruce el cuerpo está 0,8 a la izquierda
    const conVaiven = { ...jugar(), x: -1.6, cuerpos: [cuerpo({ xc: 0, tc: 2, osc })] }, sin = { ...conVaiven, cuerpos: [cuerpo({ xc: 0, tc: 2 })] };
    expect(posicionCuerpo(conVaiven.cuerpos[0], 2).x).toBeCloseTo(-.8, 9);
    expect(avanzar(conVaiven, 4).fase).toBe('fallo');
    expect(hasta(sin, 3).fase).toBe('jugando');
  });
});

describe('v2 · garantía de ruta con las trayectorias reales', () => {
  it('existeRuta usa la posición real: el vaivén del oscilante abre un hueco que la recta tapaba', () => {
    // Un cuerpo ancho a cada lado deja un hueco central (±1,77). Un cuerpo recto en x = −0,2 lo tapa por completo…
    const lados = [cuerpo({ id: 0, xc: -4.4, tc: 3, rcol: 1.9 }), cuerpo({ id: 1, xc: 4.4, tc: 3, rcol: 1.9 })], ancho = { id: 2, xc: -.2, tc: 3, rcol: 1.3 };
    expect(existeRuta(lados)).toBe(true);
    expect(existeRuta([...lados, cuerpo(ancho)])).toBe(false);
    // …pero el mismo cuerpo con vaivén está desplazado justo al cruzar (x = 0,6) y deja una rendija por la que sí se pasa.
    expect(existeRuta([...lados, cuerpo({ ...ancho, osc: { amp: .8, periodo: 2, fase: Math.PI / 2 } })])).toBe(true);
  });
  it('un vaivén que abre el hueco en otro momento no da una ruta falsa: se usa la posición real en cada instante', () => {
    const osc = { amp: .8, periodo: 2, fase: 0 };
    const c = cuerpo({ id: 0, xc: 0, tc: 3, rcol: 4.4, osc }); // cubre casi todo el ancho en el cruce
    expect(existeRuta([c])).toBe(false);
    expect(existeRuta([{ ...c, rcol: .6 }])).toBe(true);
  });
  it('barrido de semillas × misiones 1–8: ningún caso imposible, con todos los tipos y temas', () => {
    let n = 0;
    for (const d of ['luna', 'jupiter']) for (let sem = 1; sem <= 30; sem++) for (let m = 1; m <= 8; m++) {
      const cs = generarCuerpos(d, m, sem * 17 + m);
      expect(existeRuta(cs)).toBe(true); n++;
      expect(cs.some(c => c.variante === 'oscilante')).toBe(m >= 2);
    }
    expect(n).toBe(2 * 30 * 8);
  });
});

describe('v2 · temas por misión', () => {
  it('M1 primer paso (sin evento), M2 noche, M3 enjambre', () => {
    expect(temaMision(1, 'luna')).toMatchObject({ id: 'primer_paso', nombre: 'Primer paso orbital', ventana: 1.1, puntos: 1, luz: 'dia', estatica: false });
    expect(temaMision(2, 'luna')).toMatchObject({ id: 'noche', nombre: 'Noche orbital', luz: 'noche' });
    expect(temaMision(2, 'luna').texto).toMatch(/48 minutos/);
    expect(temaMision(3, 'luna')).toMatchObject({ id: 'enjambre', nombre: 'Enjambre', ventana: 1.3, gap: .75 });
    expect(temaMision(3, 'luna').texto).toMatch(/escombros de un impacto/); expect(temaMision(3, 'jupiter').texto).toMatch(/anillo principal/);
  });
  it('M3: la ventana de foto dura 1,3 s y los cuerpos llegan más seguidos', () => {
    let s = { ...jugar(), numero: 3, tema: temaMision(3, 'luna'), x: 4, cuerpos: [cuerpo({ xc: -3, tc: 2 })] };
    s = hasta(s, 2.05); expect(s.ventana.total).toBe(1.3); expect(s.ventana.restante).toBeGreaterThan(1.1); expect(s.ventana.restante).toBeLessThanOrEqual(1.3);
    s = hasta(s, 2 + 1.25); expect(s.fase).toBe('jugando'); // todavía cuenta (con 1,1 s ya habría fallado)
    expect(hasta(s, 2 + 1.4).fase).toBe('fallo');
    const g2 = [], g3 = [];
    for (let sem = 1; sem <= 20; sem++) for (const [m, acc] of [[2, g2], [3, g3]]) { const tc = generarCuerpos('luna', m, sem).map(c => c.tc); acc.push((tc[tc.length - 1] - tc[0]) / (tc.length - 1)); }
    const media = a => a.reduce((x, y) => x + y, 0) / a.length;
    expect(media(g3)).toBeLessThan(media(g2) * .9);
  });
  it('M4+ rotan tormenta solar → paso rasante → noche; Júpiter usa «Cinturón de radiación»', () => {
    expect([4, 5, 6, 7, 8, 9].map(n => temaMision(n, 'luna').id)).toEqual(['tormenta', 'rasante', 'noche', 'tormenta', 'rasante', 'noche']);
    expect([4, 7].map(n => temaMision(n, 'jupiter').nombre)).toEqual(['Cinturón de radiación', 'Cinturón de radiación']);
    expect(temaMision(4, 'luna').nombre).toBe('Tormenta solar');
    expect(temaMision(4, 'jupiter').texto).toMatch(/cinturones de radiación más intensos/);
  });
  it('tormenta: ventana de 0,85 s, estática y puntos ×1,5', () => {
    for (const d of ['luna', 'jupiter']) expect(temaMision(4, d)).toMatchObject({ ventana: .85, puntos: 1.5, estatica: true });
    let s = { ...jugar(), numero: 4, tema: temaMision(4, 'luna'), x: 4, cuerpos: [cuerpo({ xc: -3, tc: 2 }), cuerpo({ id: 1, xc: -3, tc: 4 })] };
    s = hasta(s, 2.05); expect(s.ventana.total).toBe(.85);
    s = disparar(s, 2, .1); expect(s.ultimaFoto).toMatchObject({ calidad: 'PERFECTA', pts: 450 }); // 300 × 1,5
    expect(hasta(s, 4 + .95).fase).toBe('fallo'); // 0,85 s y no más
  });
  it('paso rasante: planeta más grande y cuerpos más rápidos; las ventanas nunca se pisan', () => {
    expect(temaMision(5, 'luna')).toMatchObject({ id: 'rasante', planeta: C.RASANTE_PLANETA, vel: C.RASANTE_VEL });
    expect(C.RASANTE_PLANETA).toBeGreaterThan(1);
    for (let n = 1; n <= 12; n++) for (const d of ['luna', 'jupiter']) {
      const tc = generarCuerpos(d, n, 11).map(c => c.tc);
      for (let i = 1; i < tc.length; i++) expect(tc[i] - tc[i - 1]).toBeGreaterThan(temaMision(n, d).ventana + .3);
    }
  });
});

describe('v2 · estrellas y cierre de misión', () => {
  it('3 estrellas con ≥ 80 % de los puntos máximos, 2 con ≥ 50 %, 1 el resto', () => {
    expect([estrellasMision(800, 1000), estrellasMision(1000, 1000), estrellasMision(799, 1000), estrellasMision(500, 1000), estrellasMision(499, 1000), estrellasMision(0, 1000), estrellasMision(5, 0)]).toEqual([3, 3, 2, 2, 1, 1, 1]);
  });
  it('el máximo cuenta el combo más rápido, los raros ×2 y el factor del tema', () => {
    const cs = [cuerpo({ id: 0, tc: 1 }), cuerpo({ id: 1, tc: 3 }), cuerpo({ id: 2, tc: 5, variante: 'raro' }), cuerpo({ id: 3, tc: 7 })];
    expect(puntosMaximos(cs, null)).toBe(300 + 600 + 900 * 2 + 900);
    expect(puntosMaximos(cs, temaMision(4, 'luna'))).toBe(450 + 900 + 1350 * 2 + 1350);
  });
  it('la tarjeta de resultado trae puntos, estrellas, mejor combo, fotos y el dato del raro', () => {
    let s = escenario([2, 4], i => (i === 1 ? { variante: 'raro', dato: 'Dato real de prueba.', nombre: 'bloque raro' } : {}));
    s = disparar(s, 2, .2); s = disparar(s, 4, .2);
    expect(s.fase).toBe('exito_mision');
    expect(s.resumen).toMatchObject({ numero: 1, puntos: 300 + 600 * 2, maximo: 300 + 600 * 2, estrellas: 3, mejorCombo: 2, porPoco: 0 });
    expect(s.resumen.fotos.map(f => f.calidad)).toEqual(['PERFECTA', 'PERFECTA']); expect(s.resumen.raro.dato).toBe('Dato real de prueba.');
    expect(s.estrellasHist).toEqual([3]); expect(s.puntosTotal).toBe(1500);
  });
  it('pocas estrellas con fotos JUSTAS; un fallo no deja estrellas ni suma al total', () => {
    const s = disparar(escenario([2]), 2, 1.0);
    expect(s.resumen.puntos).toBe(100); expect(s.resumen.estrellas).toBe(1);
    const f = avanzar({ ...jugar(), x: 0, cuerpos: [cuerpo({ tc: 2 })] }, 5);
    expect(f.fase).toBe('fallo'); expect(f.estrellasHist).toEqual([]); expect(f.puntosTotal).toBe(0); expect(f.resumen).toBeNull();
  });
  it('«Siguiente misión» adelanta el inicio y la tarjeta del tema dura 2 s', () => {
    let s = disparar(escenario([1.5]), 1.5, .2);
    expect(pasoInsercion(s, { tipo: 'siguiente' }).fase).toBe('tema');
    expect(pasoInsercion(jugar(), { tipo: 'siguiente' }).fase).toBe('jugando'); // solo desde el resultado
    s = pasoInsercion(s, { tipo: 'siguiente' });
    expect(C.TEMA_DURACION_S).toBe(2);
    for (let i = 0; i < 19; i++) s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 });
    expect(s.fase).toBe('tema'); expect(s.t).toBe(0);
    s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 }); s = pasoInsercion(s, { tipo: 'tiempo', dt: .1 });
    expect(s.fase).toBe('jugando');
  });
});

describe('v2 · récord', () => {
  it('compara sin localStorage: sube el récord y avisa solo si había uno anterior que se superó', () => {
    expect(C.CLAVE_RECORD).toBe('vdl-orbita2-insercion-record');
    expect(compararRecord(1200, 1000)).toEqual({ record: 1200, nuevo: true });
    expect(compararRecord(900, 1000)).toEqual({ record: 1000, nuevo: false });
    expect(compararRecord(1000, 1000)).toEqual({ record: 1000, nuevo: false });
    expect(compararRecord(500, 0)).toEqual({ record: 500, nuevo: false }); // primera partida: no hay nada que superar
    for (const raro of [null, undefined, NaN, 'x', -3]) expect(compararRecord(700, raro)).toEqual({ record: 700, nuevo: false });
  });
});

describe('v2 · precisión con estrellas e idempotencia', () => {
  it('precisión = máx(0,3; 1 − 0,12·fallos) × (0,85 + 0,05·estrellas), recortada a 1', () => {
    expect(precisionInsercion(0, 3)).toBe(1); expect(precisionInsercion(0, 2)).toBeCloseTo(.95, 9); expect(precisionInsercion(0, 1)).toBeCloseTo(.9, 9);
    expect(precisionInsercion(2, 2)).toBeCloseTo(.76 * .95, 9); expect(precisionInsercion(30, 1)).toBeCloseTo(.3 * .9, 9);
    expect(precisionInsercion(0, 5)).toBe(1); // nunca pasa de 1
  });
  const cerrable = (hist, fallos = 0) => ({ ...jugar(), fase: 'cerrable', cumplidas: 3, fallos, estrellasHist: hist, puntosTotal: 2345, fotos: [], bateriaNave: 1900 });
  it('aplicarInsercion06 suma puntos, estrellas promedio y la fórmula nueva', () => {
    const e = aplicarInsercion06({ ...estado, decisiones: [] }, cerrable([3, 2, 1], 1));
    expect(e).toMatchObject({ insercionCompletada: true, puntosInsercion: 2345, estrellasInsercion: 2, bateria: 1900 });
    expect(e.precisionInsercion).toBeCloseTo(.88 * .95, 9);
    expect(e.decisiones[0].texto).toMatch(/2345 puntos/);
    expect(estrellasPromedio({ estrellasHist: [3, 3, 2] })).toBeCloseTo(8 / 3, 9);
    expect(aplicarInsercion06({ ...estado, decisiones: [] }, cerrable([3, 3, 3])).precisionInsercion).toBe(1);
  });
  it('es idempotente (también con los campos nuevos) y la omisión deja puntos y estrellas en 0', () => {
    const e = aplicarInsercion06({ ...estado, decisiones: [] }, cerrable([3, 3, 2]));
    expect(aplicarInsercion06(e, cerrable([1, 1, 1], 5))).toBe(e);
    expect(aplicarInsercion06(aplicarInsercion06(e, cerrable([3])), cerrable([3])).decisiones).toHaveLength(1);
    const o = aplicarInsercion06({ ...estado, decisiones: [] }, pasoInsercion(crearInsercion(estado, LRO), { tipo: 'saltar', motivo: 'x' }));
    expect(o).toMatchObject({ puntosInsercion: 0, estrellasInsercion: 0 }); expect(aplicarInsercion06(o, cerrable([3]))).toBe(o);
  });
  it('el flujo completo de 3 misiones guarda puntos y estrellas del juego real', () => {
    let s = jugar();
    for (let m = 0; m < 3; m++) {
      s = { ...s, x: 4, cuerpos: [cuerpo({ xc: -3, tc: s.t + 1 })] };
      s = disparar(s, s.t + 1, .2);
      s = m < 2 ? sinTarjeta(pasoInsercion(s, { tipo: 'siguiente' })) : s;
    }
    s = pasoInsercion(s, { tipo: 'continuar' });
    expect(s.fase).toBe('cerrable'); expect(s.puntosTotal).toBe(900); expect(s.estrellasHist).toEqual([3, 3, 3]);
    const e = aplicarInsercion06({ ...estado, decisiones: [] }, s);
    expect(e).toMatchObject({ puntosInsercion: 900, estrellasInsercion: 3, precisionInsercion: 1 });
  });
});

describe('sonda de la inserción', () => {
  it('el estado de la 06 lleva el tipo elegido', async () => {
    const { crearInsercion: crear } = await import('./insercion06.js');
    const m = (await import('../datos/misiones/lro.json')).default;
    expect(crear({}, m, { semilla: 1, diseno: { drones: 2, sondas: ['M7', 'M4'] } }).sonda).toBe('M7');
    expect(crear({}, m, { semilla: 1 }).sonda).toBe('M1');
  });
});

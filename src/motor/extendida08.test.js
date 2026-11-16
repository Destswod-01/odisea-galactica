import { describe, it, expect } from 'vitest';
import piezas from '../datos/piezas.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal } from './nave.js';
import { CONFIG_EXTENDIDA as C, EPILOGOS, FINALES, aplicarExtendida08, balanceExt, construirMazo, crearExtendida, epilogoDe, generacionExt, pasoExtendida, temperaturaOk } from './extendida08.js';

const estado = { bateria: 2000, bateriaMax: 2000, dvRestante: 300, ciencia: 0.4, salud: 100, decisiones: [] };
const nueva = (m = lro, semilla = 3, dis = disenoReal(m, piezas)) => crearExtendida(estado, m, dis, piezas, { semilla });
const jugar = (m, semilla, dis) => pasoExtendida(nueva(m, semilla, dis), { tipo: 'empezar' });
const avanzar = (s, seg, dt = 0.1) => { for (let t = 0; t < seg && s.fase === 'jugando'; t += dt) s = pasoExtendida(s, { tipo: 'tiempo', dt }); return s; };
// Quita los eventos aleatorios y las cartas para probar una sola cosa.
const quieto = s => ({ ...s, proxEvento: 1e9, mazo: [], cartaIdx: 0 });
const conRtg = m => ({ ...disenoReal(m, piezas), energia: 'rtg' });
const cartaAbierta = (s, i) => ({ ...s, mazo: construirMazo(lro), cartaIdx: i, fase: 'carta', carta: { idx: i, final: false, elegida: null, resultado: null } });

describe('energía', () => {
  it('la generación solar baja cada año', () => {
    const s = jugar(juno), g0 = generacionExt(s);
    const g1 = generacionExt({ ...s, desgaste: 1 }), g3 = generacionExt({ ...s, desgaste: 3 });
    expect(g1).toBeLessThan(g0); expect(g3).toBeLessThan(g1);
    expect(g1 / g0).toBeCloseTo(1 - C.DEGRADACION_PANEL, 5);
  });
  it('el RTG pierde potencia con los años pero no depende de la orientación ni del eclipse', () => {
    const s = jugar(juno, 1, conRtg(juno));
    expect(s.rtg).toBe(true);
    const sol = generacionExt(s), ciencia = generacionExt({ ...s, orientacion: 'ciencia' }), eclipse = generacionExt({ ...s, eclipse: 3 });
    expect(ciencia).toBe(sol); expect(eclipse).toBe(sol);
    expect(generacionExt({ ...s, desgaste: 2 })).toBeLessThan(sol);
  });
  it('la orientación «Ciencia» genera menos con paneles y da más datos', () => {
    const s = jugar(lro), c = pasoExtendida(s, { tipo: 'orientacion' });
    expect(c.orientacion).toBe('ciencia'); expect(generacionExt(c)).toBeLessThan(generacionExt(s));
    const d1 = avanzar(quieto(s), 5).datos, d2 = avanzar(quieto(c), 5).datos;
    expect(d2).toBeGreaterThan(d1);
  });
  it('durante un eclipse la generación solar es 0 y la batería baja', () => {
    const s = { ...quieto(jugar(lro)), eclipse: 4 };
    expect(generacionExt(s)).toBe(0); expect(balanceExt(s)).toBeLessThan(0);
    const n = avanzar(s, 2); expect(n.bateria).toBeLessThan(s.bateria);
  });
  it('con la batería en 0 entra en modo seguro, apaga todo y pierde datos del tramo', () => {
    let s = { ...quieto(jugar(lro)), eclipse: 5, bateria: 1, datos: 50, datosTramo: 30 };
    s = avanzar(s, 3);
    expect(s.modosSeguros).toBe(1); expect(s.tSeguro).toBeGreaterThan(0); expect(s.encendidos).toEqual([]);
    expect(s.datos).toBeLessThan(50);
    const antes = s.datos; expect(pasoExtendida(s, { tipo: 'tiempo', dt: 0.1 }).datos).toBe(antes);
    expect(pasoExtendida(s, { tipo: 'calentadores' }).calentadores).toBe(false);
  });
  it('los interruptores de instrumentos cambian el consumo', () => {
    const s = jugar(lro), id = s.instrumentos[0].id, apagado = pasoExtendida(s, { tipo: 'instrumento', id });
    expect(apagado.encendidos).not.toContain(id); expect(balanceExt(apagado)).toBeGreaterThan(balanceExt(s));
  });
});

describe('temperatura', () => {
  it('fuera de rango durante la tolerancia daña la salud', () => {
    const s = { ...quieto(jugar(juno)), temperatura: -30, eclipse: 20 };
    expect(temperaturaOk(s)).toBe(false);
    const n = avanzar(s, C.TEMP_TOLERANCIA_S + 1);
    expect(n.salud).toBeLessThan(s.salud - C.TEMP_DANO + 0.5);
  });
  it('los calentadores suben la temperatura objetivo y gastan watts', () => {
    const s = quieto(jugar(juno)), h = pasoExtendida(s, { tipo: 'calentadores' });
    expect(avanzar(h, 20).temperatura).toBeGreaterThan(avanzar(s, 20).temperatura);
    expect(balanceExt(h)).toBeLessThan(balanceExt(s));
  });
});

describe('órbita y radiación', () => {
  it('la órbita lunar se degrada y corregirla gasta combustible', () => {
    const s = quieto(jugar(lro)), n = avanzar(s, 10);
    expect(n.altitud).toBeLessThan(s.altitud);
    const c = pasoExtendida(n, { tipo: 'corregir' });
    expect(c.altitud).toBeGreaterThan(n.altitud); expect(c.combustible).toBe(n.combustible - C.CORRECCION_DV);
    expect(pasoExtendida({ ...n, combustible: 0 }, { tipo: 'corregir' }).altitud).toBe(n.altitud);
  });
  it('altitud 0 termina la misión extendida y deja solo el final forzado', () => {
    const s = avanzar({ ...quieto(jugar(lro)), altitud: 0.5 }, 3);
    expect(s.fase).toBe('carta'); expect(s.carta.final).toBe(true); expect(s.opcionesFinal).toEqual(['choque']);
    const f = pasoExtendida(s, { tipo: 'elegir', i: 0 });
    expect(f.fase).toBe('cierre'); expect(f.final).toBe('choque');
  });
  it('en Júpiter la órbita es estable y no hay corrección', () => {
    const s = jugar(juno); expect(s.altitud).toBeNull(); expect(pasoExtendida(s, { tipo: 'corregir' })).toBe(s);
  });
  it('el blindaje reduce la radiación', () => {
    const con = quieto(jugar(juno)), sin = quieto(jugar(juno, 3, { ...disenoReal(juno, piezas), blindaje: 'blindaje_ninguno' }));
    expect(con.blindaje).toBeGreaterThan(sin.blindaje);
    const pierde = s => 100 - avanzar({ ...s, calentadores: true }, 20).salud;
    expect(pierde(con)).toBeLessThan(pierde(sin));
  });
  it('salud 0 termina con el final «silencio»', () => {
    const s = avanzar({ ...quieto(jugar(juno)), salud: 0.01 }, 2);
    expect(s.opcionesFinal).toEqual(['silencio']);
  });
});

describe('cartas', () => {
  it('el mazo empieza con la decisión real del JSON y su opción real cuenta', () => {
    for (const m of [lro, juno]) {
      const mazo = construirMazo(m), ev = m.eventos.find(e => e.tipo === 'decision_final');
      expect(mazo[0].titulo).toBe(ev.titulo); expect(mazo[0].opciones.some(o => o.real)).toBe(true); expect(mazo.length).toBeGreaterThanOrEqual(4);
    }
    const i = construirMazo(lro)[0].opciones.findIndex(o => o.real);
    let s = cartaAbierta(jugar(lro), 0);
    s = pasoExtendida(s, { tipo: 'elegir', i });
    expect(s.coincidenciasReales).toBe(1); expect(s.carta.resultado.real).toBe(true);
    s = pasoExtendida(s, { tipo: 'continuar' }); expect(s.fase).toBe('jugando'); expect(s.cartaIdx).toBe(1);
  });
  it('aparece una carta por año y congela el tiempo', () => {
    let s = { ...quieto(jugar(lro)), mazo: construirMazo(lro) };
    s = avanzar(s, C.CARTA_EN_S + 1);
    expect(s.fase).toBe('carta'); const t = s.t;
    expect(pasoExtendida(s, { tipo: 'tiempo', dt: 1 }).t).toBe(t);
  });
  it('los efectos de una opción cambian los medidores', () => {
    const base = cartaAbierta(jugar(lro), construirMazo(lro).findIndex(c => c.id === 'bajar'));
    const n = pasoExtendida(base, { tipo: 'elegir', i: 0 });
    expect(n.altitud).toBeLessThan(base.altitud); expect(n.combustible).toBeLessThan(base.combustible); expect(n.multDatos).toBeGreaterThan(1);
  });
  it('extender sube el tope con límite; no extender lo adelanta', () => {
    const base = { ...cartaAbierta(jugar(lro), construirMazo(lro).findIndex(c => c.id === 'extender')), ano: 2 };
    expect(pasoExtendida(base, { tipo: 'elegir', i: 0 }).tope).toBe(C.ANOS.lro + C.EXTENDER_ANOS);
    expect(pasoExtendida({ ...base, tope: C.ANOS_MAX.lro }, { tipo: 'elegir', i: 0 }).tope).toBe(C.ANOS_MAX.lro);
    expect(pasoExtendida(base, { tipo: 'elegir', i: 1 }).tope).toBe(2);
  });
  it('apagar un instrumento viejo lo retira y no se puede volver a encender', () => {
    const base = cartaAbierta(jugar(lro), construirMazo(lro).findIndex(c => c.id === 'viejo'));
    let n = pasoExtendida(base, { tipo: 'elegir', i: 0 }); expect(n.retirados.length).toBe(1);
    n = pasoExtendida(n, { tipo: 'continuar' });
    expect(pasoExtendida(n, { tipo: 'instrumento', id: n.retirados[0] }).encendidos).not.toContain(n.retirados[0]);
  });
});

describe('«los últimos datos» y el final', () => {
  it('en los últimos segundos los datos valen doble y la batería cae más rápido', () => {
    const s = quieto(jugar(lro)), u = { ...s, t: s.tFin - C.ULTIMOS_S + 1 }, normal = { ...s, t: 1 };
    const dat = x => pasoExtendida(x, { tipo: 'tiempo', dt: 0.1 }).datos - x.datos;
    expect(dat(u) / dat(normal)).toBeCloseTo(C.ULTIMOS_DATOS, 5);
    expect(balanceExt(u)).toBeLessThan(balanceExt(normal));
  });
  it('al llegar al tope de años aparece la disposición final con dos opciones', () => {
    const s = avanzar(quieto({ ...jugar(juno), t: C.ANOS.juno * C.ANO_S - 1, ano: C.ANOS.juno, cartaAno: 99 }), 2);
    expect(s.fase).toBe('carta'); expect(s.carta.final).toBe(true); expect(s.opcionesFinal).toEqual(['hundir', 'orbita']);
  });
  it('hundir a Juno marca desorbito y el cierre lo devuelve en extras', () => {
    let s = avanzar(quieto({ ...jugar(juno), t: C.ANOS.juno * C.ANO_S - 1, ano: C.ANOS.juno, cartaAno: 99 }), 2);
    s = pasoExtendida(s, { tipo: 'elegir', i: 0 });
    expect(s.fase).toBe('cierre'); expect(s.final).toBe('hundir'); expect(s.banderas.desorbito).toBe(true);
    expect(aplicarExtendida08(estado, s).extras.desorbito).toBe(true);
  });
  it('hay al menos 4 epílogos por misión y dependen de las banderas', () => {
    expect(Object.keys(EPILOGOS.lro).length).toBeGreaterThanOrEqual(4); expect(Object.keys(EPILOGOS.juno).length).toBeGreaterThanOrEqual(4);
    const s = jugar(juno);
    expect(epilogoDe({ ...s, salud: 90, modosSeguros: 0 }, 'hundir').id).toBe('hundir_alta');
    expect(epilogoDe({ ...s, salud: 20, modosSeguros: 3 }, 'hundir').id).toBe('hundir_baja');
    expect(epilogoDe({ ...s, salud: 90 }, 'orbita').id).toBe('orbita_alta');
    expect(epilogoDe({ ...s, salud: 20 }, 'orbita').id).toBe('orbita_baja');
    expect(epilogoDe({ ...s, salud: 0 }, 'silencio').id).toBe('silencio');
    expect(epilogoDe(s, 'hundir').detalle).toMatch(/protección planetaria/);
    for (const f of [FINALES.luna.impacto, FINALES.luna.orbita, FINALES.jupiter.hundir, FINALES.jupiter.orbita]) expect(f.vidaReal.length).toBeGreaterThan(10);
  });
});

describe('determinismo y topes', () => {
  it('misma semilla = misma partida; otra semilla cambia los eventos', () => {
    const corre = sem => avanzar({ ...jugar(juno, sem), mazo: [] }, 60);
    const a = corre(5), b = corre(5), c = corre(99);
    expect(a.datos).toBe(b.datos); expect(a.evSeq).toBe(b.evSeq); expect(a.eventos).toEqual(b.eventos);
    expect(a.eventos.length).toBeGreaterThan(0);
    expect(c.eventos).not.toEqual(a.eventos);
  });
  it('los eventos salen cada 8 a 15 s', () => {
    const s = nueva(juno, 11); expect(s.proxEvento).toBeGreaterThanOrEqual(C.EVENTO_MIN_S); expect(s.proxEvento).toBeLessThanOrEqual(C.EVENTO_MAX_S);
  });
  it('tope de años: 6 en la Luna, 5 en Júpiter, y nunca se pasa del máximo', () => {
    expect(nueva(lro).tope).toBe(6); expect(nueva(juno).tope).toBe(5);
    const n = avanzar({ ...quieto(jugar(lro)), cartaAno: 99, altitud: 1e6 }, 400);
    expect(n.ano).toBeLessThanOrEqual(C.ANOS_MAX.lro); expect(n.fase).toBe('carta'); expect(n.carta.final).toBe(true);
  });
});

describe('aplicarExtendida08', () => {
  const cerrada = () => {
    const s = { ...quieto(jugar(lro)), fase: 'carta', carta: { idx: -1, final: true, elegida: null, resultado: null }, opcionesFinal: ['impacto', 'orbita'], datos: 1e6, datosRef: 100, coincidenciasReales: 1 };
    return pasoExtendida(s, { tipo: 'elegir', i: 1 });
  };
  it('suma ciencia con tope, guarda el resultado y la bitácora', () => {
    const s = cerrada(), { estado: n, extras } = aplicarExtendida08(estado, s);
    expect(n.ciencia).toBeCloseTo(0.4 + C.CIENCIA_MAX, 5);
    expect(n.misionExtendida).toMatchObject({ final: 'orbita', anos: s.ano });
    expect(n.decisiones.length).toBeGreaterThan(estado.decisiones.length); expect(extras).toEqual({ coincidenciasReales: 1, desorbito: false });
    expect(n.perdida).toBeUndefined();
    expect(aplicarExtendida08({ ...estado, ciencia: 0.95 }, s).estado.ciencia).toBe(1);
  });
  it('con pocos datos suma proporcionalmente', () => {
    const s = { ...cerrada(), datos: 50, datosRef: 100 };
    expect(aplicarExtendida08(estado, s).estado.ciencia).toBeCloseTo(0.4 + C.CIENCIA_MAX * 0.5, 5);
  });
  it('es idempotente: la segunda vez no cambia nada ni repite extras', () => {
    const s = cerrada(), a = aplicarExtendida08(estado, s), b = aplicarExtendida08(a.estado, s);
    expect(b.estado).toBe(a.estado); expect(b.extras).toEqual({ coincidenciasReales: 0, desorbito: false });
  });
  it('no hace nada si la etapa no terminó', () => {
    const s = jugar(lro); expect(aplicarExtendida08(estado, s).estado).toBe(estado);
  });
});

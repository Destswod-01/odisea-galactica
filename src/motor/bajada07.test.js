import { describe, expect, it } from 'vitest';
import {
  aplicarBajada07,
  cabe,
  calidadBajada07,
  celdasPieza,
  COLUMNAS,
  crearBajada07,
  crearTableroVacio,
  filaDeCaida,
  FILAS,
  intervaloCaida,
  PASADAS_DSN,
  pasoBajada,
  ROTACIONES,
  TIPOS,
} from './bajada07.js';

const MISION_LRO = { id: 'lro', destino: { id: 'luna' }, dificultad: 'intermedio', bateria_wh: 2000 };
const RESUMEN = { ciencia: { total: 0.9 }, enlace: 4000, apuntado: { bono: 0 } };
const ESTADO = { bateria: 1800, bateriaMax: 2000, ciencia: 0, decisiones: [] };
const nuevo = (semilla = 42, mision = MISION_LRO) => crearBajada07(ESTADO, mision, {}, [], RESUMEN, { semilla });
const jugando = (semilla) => pasoBajada(nuevo(semilla), { tipo: 'empezar' });
const llena = { color: '#fff', tipo: 'I' };
const conPieza = (tipo, extra = {}) => ({ ...jugando(), pieza: { tipo, rot: 0, f: 0, c: 3, ...extra } });
const vacio = (t) => t.every((f) => f.every((c) => c === null));

describe('bajada07 (Tetris · Red de Espacio Profundo)', () => {
  it('inicia en ficha con tablero 10×20 vacío, pieza, siguiente y pasada Goldstone', () => {
    const s = nuevo(7);
    expect(s.fase).toBe('ficha');
    expect(s.tablero).toHaveLength(FILAS);
    expect(s.tablero[0]).toHaveLength(COLUMNAS);
    expect(FILAS).toBe(20);
    expect(COLUMNAS).toBe(10);
    expect(TIPOS.includes(s.pieza.tipo) && TIPOS.includes(s.siguiente)).toBe(true);
    expect(s.n).toBe(0);
    expect(PASADAS_DSN[s.pasada].id).toBe('goldstone');
  });

  it('cada tetrominó tiene 4 celdas distintas en sus 4 rotaciones; la O no cambia y la I sí', () => {
    for (const k of TIPOS) for (const r of ROTACIONES[k]) expect(new Set(r.map(String)).size).toBe(4);
    const firma = (r) => r.map(String).sort().join('|');
    expect(new Set(ROTACIONES.O.map(firma)).size).toBe(1);
    expect(firma(ROTACIONES.I[1])).not.toBe(firma(ROTACIONES.I[0]));
    expect(firma(ROTACIONES.I[2])).not.toBe(firma(ROTACIONES.I[1]));
  });

  it('la bolsa reparte los 7 tetrominós en cada 7 piezas y es determinista por semilla', () => {
    const secuencia = (semilla, n) => {
      let s = jugando(semilla);
      const tipos = [s.pieza.tipo];
      for (let i = 1; i < n; i++) {
        s = pasoBajada({ ...s, tablero: crearTableroVacio() }, { tipo: 'dura' }); // sin acumular: solo medimos la bolsa
        tipos.push(s.pieza.tipo);
      }
      return tipos;
    };
    const a = secuencia(5, 14);
    expect(new Set(a.slice(0, 7)).size).toBe(7);
    expect(new Set(a.slice(7, 14)).size).toBe(7);
    expect(secuencia(5, 14)).toEqual(a);
    expect(secuencia(6, 14)).not.toEqual(a);
  });

  it('la pieza siguiente anunciada es la que sale después', () => {
    let s = jugando(11);
    for (let i = 0; i < 9; i++) {
      const anunciada = s.siguiente;
      s = pasoBajada({ ...s, tablero: crearTableroVacio() }, { tipo: 'dura' });
      expect(s.pieza.tipo).toBe(anunciada);
    }
  });

  it('mueve a los lados sin salirse del tablero ni atravesar celdas llenas', () => {
    let s = conPieza('O', { c: 0 });
    expect(pasoBajada(s, { tipo: 'izq' })).toBe(s);
    s = pasoBajada(s, { tipo: 'der' });
    expect(s.pieza.c).toBe(1);
    const t = crearTableroVacio();
    t[0][3] = llena; t[1][3] = llena;
    s = { ...conPieza('O', { c: 1 }), tablero: t };
    expect(pasoBajada(s, { tipo: 'der' })).toBe(s);
    s = conPieza('O', { c: COLUMNAS - 2 });
    expect(pasoBajada(s, { tipo: 'der' })).toBe(s);
  });

  it('rota con patada de pared: una I vertical pegada al borde sigue girando', () => {
    let s = conPieza('I', { rot: 1, c: -2, f: 5 });
    expect(cabe(s.tablero, s.pieza)).toBe(true); // la columna de la I vertical queda en c = 0
    s = pasoBajada(s, { tipo: 'rotar' });
    expect(s.pieza.rot).toBe(2);
    expect(cabe(s.tablero, s.pieza)).toBe(true);
    const atras = pasoBajada(conPieza('T'), { tipo: 'rotar', dir: -1 });
    expect(atras.pieza.rot).toBe(-1);
    expect(celdasPieza(atras.pieza)).toHaveLength(4);
  });

  it('no rota si no hay lugar ni siquiera con patada', () => {
    const t = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(llena));
    for (const [f, c] of ROTACIONES.T[0]) t[5 + f][3 + c] = null;
    const s = { ...conPieza('T', { f: 5 }), tablero: t };
    expect(pasoBajada(s, { tipo: 'rotar' })).toBe(s);
  });

  it('la gravedad baja de a una fila; al tocar fondo se apoya y a la siguiente se fija', () => {
    const s0 = conPieza('O', { f: FILAS - 3 });
    const s1 = pasoBajada(s0, { tipo: 'gravedad' });
    expect(s1.pieza.f).toBe(FILAS - 2);
    expect(s1.apoyada).toBe(false);
    const s2 = pasoBajada(s1, { tipo: 'gravedad' });
    expect(s2.apoyada).toBe(true);
    expect(s2.n).toBe(0);
    const s3 = pasoBajada(s2, { tipo: 'gravedad' });
    expect(s3.n).toBe(1);
    expect(s3.tablero[FILAS - 1][4]).toBeTruthy();
  });

  it('estando apoyada, mover de lado a un hueco vuelve a dejarla caer', () => {
    const t = crearTableroVacio();
    t[FILAS - 1][5] = llena; t[FILAS - 1][6] = llena;
    let s = { ...conPieza('O', { f: FILAS - 3, c: 4 }), tablero: t };
    s = pasoBajada(s, { tipo: 'gravedad' }); // se apoya sobre las celdas llenas
    expect(s.apoyada).toBe(true);
    s = pasoBajada(s, { tipo: 'izq' }); // hueco debajo en las columnas 3 y 4
    expect(s.apoyada).toBe(false);
  });

  it('la caída dura fija abajo de inmediato y la sombra coincide con el destino', () => {
    const s = conPieza('I');
    expect(filaDeCaida(s.tablero, s.pieza)).toBe(FILAS - 2); // la I horizontal ocupa la fila 1 de su caja
    const d = pasoBajada(s, { tipo: 'dura' });
    expect(d.n).toBe(1);
    expect(d.tablero[FILAS - 1].filter(Boolean)).toHaveLength(4);
  });

  it('limpia 1 línea (la pila de arriba cae) y 4 a la vez valen más que 4 sueltas', () => {
    const t = crearTableroVacio();
    for (let c = 0; c < COLUMNAS; c++) if (c < 3 || c > 6) t[FILAS - 1][c] = llena;
    t[FILAS - 2][0] = llena;
    const s1 = pasoBajada({ ...conPieza('I'), tablero: t }, { tipo: 'dura' });
    expect(s1.lineasPasada).toBe(1);
    expect(s1.tablero[FILAS - 1][0]).toBeTruthy(); // la celda suelta bajó una fila
    expect(s1.tablero[FILAS - 2].some(Boolean)).toBe(false);
    expect(s1.ultimaJugada.lineas).toBe(1);

    const t4 = crearTableroVacio();
    for (let i = 0; i < 4; i++) for (let c = 0; c < COLUMNAS - 1; c++) t4[FILAS - 1 - i][c] = llena;
    const s4 = pasoBajada({ ...conPieza('I', { rot: 1, c: 7 }), tablero: t4 }, { tipo: 'dura' });
    expect(s4.lineasPasada).toBe(4);
    expect(s4.mbitPasada).toBeGreaterThan(s1.mbitPasada * 4);
    expect(vacio(s4.tablero)).toBe(true);
  });

  it('la pasada se cierra al llegar a la meta de líneas', () => {
    const t = crearTableroVacio();
    for (let c = 0; c < COLUMNAS; c++) if (c < 3 || c > 6) t[FILAS - 1][c] = llena;
    const base = conPieza('I');
    const s = pasoBajada({ ...base, tablero: t, lineasPasada: base.lineasMeta - 1 }, { tipo: 'dura' });
    expect(s.fase).toBe('pasada_ok');
    expect(s.resultadosPasadas).toHaveLength(1);
    expect(s.resultadosPasadas[0].calif).toBe(1);
    expect(pasoBajada(s, { tipo: 'izq' })).toBe(s); // ya no se mueve nada
  });

  it('termina la pasada con desborde si la pieza nueva no cabe', () => {
    const t = crearTableroVacio();
    for (let f = 2; f < FILAS; f++) for (let c = 0; c < COLUMNAS; c++) t[f][c] = c === 9 ? null : llena;
    t[0][4] = llena; t[1][4] = llena; // estorba justo donde aparece la pieza que sigue
    const s = { ...conPieza('O', { f: 0, c: 8 }), tablero: t, siguiente: 'O' };
    const r = pasoBajada(s, { tipo: 'dura' });
    expect(r.fase).toBe('desbordada');
    expect(r.resultadosPasadas.at(-1).desbordada).toBe(true);
    expect(r.resultadosPasadas.at(-1).calif).toBeLessThan(1);
    expect(r.mbitPerdidos).toBeGreaterThan(0);
  });

  it('la velocidad sube con el nivel y respeta la dificultad', () => {
    const base = nuevo(1);
    expect(intervaloCaida({ ...base, lineasTotal: 12, pasada: 1 })).toBeLessThan(intervaloCaida(base));
    const facil = intervaloCaida(nuevo(1, { ...MISION_LRO, dificultad: 'principiante' }));
    const experto = intervaloCaida(nuevo(1, { ...MISION_LRO, dificultad: 'experto' }));
    expect(facil).toBeGreaterThan(intervaloCaida(base));
    expect(experto).toBeLessThan(intervaloCaida(base));
    expect(intervaloCaida({ ...base, lineasTotal: 999, pasada: 2 })).toBeGreaterThanOrEqual(80);
  });

  it('el índice de pieza n sube con cada pieza fijada (base de los turnos)', () => {
    let s = jugando(3);
    const ns = [s.n];
    for (let i = 0; i < 4; i++) { s = pasoBajada({ ...s, tablero: crearTableroVacio() }, { tipo: 'dura' }); ns.push(s.n); }
    expect(ns).toEqual([0, 1, 2, 3, 4]);
  });

  it('avanza las 3 pasadas hasta final y aplica resultados a la campaña de forma idempotente', () => {
    let s = jugando(9);
    for (let p = 0; p < PASADAS_DSN.length; p++) {
      expect(s.pasada).toBe(p);
      const t = crearTableroVacio();
      for (let c = 0; c < COLUMNAS; c++) if (c < 3 || c > 6) t[FILAS - 1][c] = llena;
      s = pasoBajada({ ...s, tablero: t, lineasPasada: s.lineasMeta - 1, pieza: { tipo: 'I', rot: 0, f: 0, c: 3 } }, { tipo: 'dura' });
      expect(s.fase).toBe('pasada_ok');
      const nAntes = s.n;
      s = pasoBajada(s, { tipo: 'siguiente_pasada' });
      if (p < PASADAS_DSN.length - 1) {
        expect(s.fase).toBe('jugando');
        expect(s.n).toBe(nAntes); // la pieza siguiente conserva el turno ya contado
        expect(vacio(s.tablero)).toBe(true);
        expect(s.lineasPasada).toBe(0);
      }
    }
    expect(s.fase).toBe('final');
    expect(calidadBajada07(s)).toBe(1);
    const e1 = aplicarBajada07(ESTADO, s, RESUMEN);
    expect(e1.operacionCompletada).toBe(true);
    expect(e1.ciencia).toBeCloseTo(0.9, 5);
    expect(e1.bateria).toBe(1800);
    expect(e1.decisiones).toHaveLength(3);
    expect(aplicarBajada07(e1, s, RESUMEN)).toBe(e1);
  });

  it('cada pasada desbordada cuesta batería y baja la calidad', () => {
    const s = { ...jugando(9), fase: 'final', pasada: 2, resultadosPasadas: [
      { id: 'a', nombre: 'A', enviada: 100, meta: 7, lineas: 2, desbordada: true, perdida: 50, calif: 0.25 },
      { id: 'b', nombre: 'B', enviada: 500, meta: 7, lineas: 7, desbordada: false, perdida: 0, calif: 1 },
      { id: 'c', nombre: 'C', enviada: 500, meta: 7, lineas: 7, desbordada: false, perdida: 0, calif: 1 },
    ] };
    const e = aplicarBajada07(ESTADO, s, RESUMEN);
    expect(e.calidadOperacion).toBeLessThan(1);
    expect(e.bateria).toBe(1800 - 60);
  });

  it('el estado es serializable (instantáneas en red) y nada se mueve en la ficha', () => {
    const s = nuevo(2);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(pasoBajada(s, { tipo: 'izq' })).toBe(s);
    expect(pasoBajada(s, { tipo: 'dura' })).toBe(s);
  });
});

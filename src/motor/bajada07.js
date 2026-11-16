// Etapa 07 «Bajada de datos» — TETRIS completo (tablero 10×20, 7 tetrominós con bolsa) y 3 pasadas de la Red de Espacio Profundo.
// Cada línea completa = un paquete de datos que baja a la Tierra. Motor puro (sin React), determinista a partir de una semilla.
// En equipo, la pieza número `n` la maneja el jugador `n mod jugadores` (ver red/turnos.js); el motor solo cuenta `n`.
import { t } from '../i18n/idioma.js';
import { ajusteMinijuego } from './dificultad.js';

export const COLUMNAS = 10;
export const FILAS = 20;

export const PASADAS_DSN = [
  { id: 'goldstone', nombre: 'Goldstone', pais: 'EE. UU.', antena: 'DSS-14 · 70 m' },
  { id: 'madrid', nombre: 'Madrid', pais: 'España', antena: 'DSS-63 · 70 m' },
  { id: 'canberra', nombre: 'Canberra', pais: 'Australia', antena: 'DSS-43 · 70 m' },
];

// Celdas [fila, col] de cada tetrominó en su caja (rotación 0). Caja: 4 para la I, 2 para la O y 3 para las demás.
export const TETROMINOS = {
  I: { caja: 4, color: '#4ee3d1', celdas: [[1, 0], [1, 1], [1, 2], [1, 3]] },
  O: { caja: 2, color: '#ffd166', celdas: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  T: { caja: 3, color: '#b894ff', celdas: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  S: { caja: 3, color: '#7af29f', celdas: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  Z: { caja: 3, color: '#ff7b7b', celdas: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  J: { caja: 3, color: '#67b7ff', celdas: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  L: { caja: 3, color: '#ff9671', celdas: [[0, 2], [1, 0], [1, 1], [1, 2]] },
};
export const TIPOS = Object.keys(TETROMINOS);

// Giro horario dentro de la caja: (f, c) → (c, caja-1-f).
const girar = (celdas, caja) => celdas.map(([f, c]) => [c, caja - 1 - f]);
export const ROTACIONES = Object.fromEntries(TIPOS.map((k) => {
  const { celdas, caja } = TETROMINOS[k];
  const r = [celdas];
  for (let i = 1; i < 4; i++) r.push(girar(r[i - 1], caja));
  return [k, r];
}));

// Paquetes (múltiplos de «una línea») por 0, 1, 2, 3 y 4 líneas a la vez: más líneas juntas = más datos.
export const FACTOR_LINEAS = [0, 1, 2.5, 4, 6];
// Intentos de «patada» al girar junto a una pared o una pila: [Δfila, Δcol].
const PATADAS = [[0, 0], [0, -1], [0, 1], [0, -2], [0, 2], [-1, 0]];

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

function siguienteAzar(rs) {
  const n = (rs * 1664525 + 1013904223) >>> 0;
  return [n / 4294967296, n];
}

export function crearTableroVacio() {
  return Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
}

/** Celdas absolutas [fila, col] de una pieza {tipo, rot, f, c}. */
export function celdasPieza(p) {
  return ROTACIONES[p.tipo][((p.rot % 4) + 4) % 4].map(([df, dc]) => [p.f + df, p.c + dc]);
}

/** ¿Cabe la pieza en el tablero (dentro de los límites y sin pisar nada)? */
export function cabe(tablero, p) {
  for (const [f, c] of celdasPieza(p)) {
    if (f < 0 || f >= FILAS || c < 0 || c >= COLUMNAS) return false;
    if (tablero[f][c] !== null) return false;
  }
  return true;
}

/** Fila donde quedaría la pieza con caída dura (la «sombra»). */
export function filaDeCaida(tablero, p) {
  let f = p.f;
  while (cabe(tablero, { ...p, f: f + 1 })) f += 1;
  return f;
}

// Bolsa de 7: cada tetrominó sale una vez por bolsa, en orden barajado con la semilla.
function bolsaNueva(rs) {
  const a = [...TIPOS];
  for (let i = a.length - 1; i > 0; i--) {
    let r;
    [r, rs] = siguienteAzar(rs);
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return { bolsa: a, rs };
}

function rellenarBolsa(bolsa, rs) {
  let b = bolsa;
  while (b.length < 2) { const nb = bolsaNueva(rs); b = [...b, ...nb.bolsa]; rs = nb.rs; }
  return { bolsa: b, rs };
}

const piezaNueva = (tipo) => ({ tipo, rot: 0, f: tipo === 'I' ? -1 : 0, c: tipo === 'O' ? 4 : 3 });

/** Intervalo de caída (ms) según el nivel (líneas bajadas + pasada) y la dificultad de la misión. */
export function intervaloCaida(s) {
  const nivel = Math.floor((s.lineasTotal || 0) / 3) + (s.pasada || 0);
  const base = Math.max(110, 760 - nivel * 55);
  return Math.round(base / (s.velocidad || 1));
}

export function escalaEnlaceBajada(resumen, mision) {
  const destino = mision?.destino?.id === 'jupiter' || mision?.id === 'juno' ? 'jupiter' : 'luna';
  const ref = destino === 'jupiter' ? 200 : 4000;
  const enlace = resumen?.enlace || ref;
  const pasos = Math.log2(Math.max(0.25, enlace / ref));
  return acotar(1 + pasos * 0.15, 0.8, 1.35);
}

// Líneas que hay que bajar en cada pasada.
const LINEAS_META = { principiante: 5, intermedio: 7, experto: 9 };

// `diseno` y `piezas` se conservan por compatibilidad con la pantalla (la versión Tetris ya no reparte instrumentos).
// eslint-disable-next-line no-unused-vars
export function crearBajada07(estado, mision, diseno, piezas = [], resumen = null, { semilla } = {}) {
  const sem = semilla ?? Math.floor(Math.random() * 2 ** 31);
  const aj = ajusteMinijuego(mision);
  const dificultad = mision?.dificultad || 'intermedio';
  const destino = mision?.destino?.id === 'jupiter' || mision?.id === 'juno' ? 'jupiter' : 'luna';
  const escala = escalaEnlaceBajada(resumen, mision);
  const mbitPorCelda = Math.round(12 * escala);
  const mbitLinea = Math.round(80 * escala);
  const lineasMeta = LINEAS_META[dificultad] ?? LINEAS_META.intermedio;
  const rs0 = (sem * 7919 + (destino === 'jupiter' ? 2027 : 1969)) >>> 0;
  const { bolsa, rs } = rellenarBolsa([], rs0);

  return {
    fase: 'ficha', // 'ficha' | 'jugando' | 'pasada_ok' | 'desbordada' | 'final'
    destino,
    misionId: mision?.id || (destino === 'jupiter' ? 'juno' : 'lro'),
    dificultad,
    velocidad: aj.velocidad,
    semilla: sem,
    rs,
    bolsa: bolsa.slice(2),
    tablero: crearTableroVacio(),
    pieza: piezaNueva(bolsa[0]),
    siguiente: bolsa[1],
    n: 0, // índice de la pieza en juego (de quién es el turno lo decide red/turnos.js)
    tick: 0, // sube con cada cambio: ordena las instantáneas en línea
    apoyada: false, // la pieza tocó fondo: la próxima caída que no pueda avanzar la fija
    pasada: 0, // 0 = Goldstone, 1 = Madrid, 2 = Canberra
    mbitPorCelda,
    mbitLinea,
    lineasMeta,
    metaPasada: lineasMeta * mbitLinea, // Mbit «de meta» (informativo)
    mbitPasada: 0,
    mbitTotal: 0,
    mbitPerdidos: 0,
    lineasPasada: 0,
    lineasTotal: 0,
    racha: 0,
    mejorCombo: 0,
    purgasUsadas: 0, // sin «comprimir caché» en la versión Tetris; queda en 0 por el contrato con la campaña
    bateriaMax: estado?.bateriaMax || mision?.bateria_wh || 2000,
    bateria: estado?.bateria ?? mision?.bateria_wh ?? 2000,
    resultadosPasadas: [], // [{ id, nombre, enviada, meta, lineas, desbordada, perdida, calif }]
    ultimaJugada: null, // { lineas, mbit, seq }
  };
}

const ocupadas = (tablero) => tablero.reduce((a, fila) => a + fila.filter(Boolean).length, 0);

function finalizarPasada(n, desbordada) {
  const perdida = desbordada ? ocupadas(n.tablero) * n.mbitPorCelda : 0;
  const fraccion = n.lineasMeta > 0 ? Math.min(1, n.lineasPasada / n.lineasMeta) : 1;
  // Si la memoria se desborda antes de la meta, conserva hasta 85 % según cuánto alcanzó a bajar.
  const calif = desbordada ? Math.min(0.85, fraccion * 0.9) : 1;
  const estacion = PASADAS_DSN[n.pasada] || PASADAS_DSN[0];
  return {
    ...n,
    pieza: null,
    apoyada: false,
    n: n.n + 1, // el turno de la pieza siguiente (quien la maneja pulsa «continuar»)
    fase: desbordada ? 'desbordada' : 'pasada_ok',
    mbitPerdidos: n.mbitPerdidos + perdida,
    resultadosPasadas: [...n.resultadosPasadas, {
      id: estacion.id, nombre: estacion.nombre, enviada: n.mbitPasada, meta: n.lineasMeta, lineas: n.lineasPasada, desbordada, perdida, calif,
    }],
  };
}

// Saca la pieza anunciada y anuncia la siguiente. Devuelve null si la nueva no cabe (desborde).
function aparecer(s, tablero) {
  const { bolsa, rs } = rellenarBolsa(s.bolsa, s.rs);
  const pieza = piezaNueva(s.siguiente);
  const sig = { ...s, tablero, rs, bolsa: bolsa.slice(1), siguiente: bolsa[0], pieza, apoyada: false, n: s.n + 1 };
  return cabe(tablero, pieza) ? sig : null;
}

// Fija la pieza en juego, limpia líneas, puntúa y saca la siguiente (o cierra la pasada).
function fijar(s, extraMbit = 0) {
  const tablero = s.tablero.map((f) => [...f]);
  const tipo = s.pieza.tipo;
  for (const [f, c] of celdasPieza(s.pieza)) if (f >= 0) tablero[f][c] = { color: TETROMINOS[tipo].color, tipo };
  const llenas = [];
  for (let f = 0; f < FILAS; f++) if (tablero[f].every(Boolean)) llenas.push(f);
  let t2 = tablero;
  if (llenas.length) {
    t2 = tablero.filter((_, f) => !llenas.includes(f));
    while (t2.length < FILAS) t2.unshift(Array(COLUMNAS).fill(null));
  }
  const k = llenas.length;
  const mbitGanados = Math.round(s.mbitLinea * FACTOR_LINEAS[k] + extraMbit);
  const n0 = {
    ...s,
    tablero: t2,
    mbitPasada: s.mbitPasada + mbitGanados,
    mbitTotal: s.mbitTotal + mbitGanados,
    lineasPasada: s.lineasPasada + k,
    lineasTotal: s.lineasTotal + k,
    racha: k > 0 ? s.racha + 1 : 0,
    mejorCombo: Math.max(s.mejorCombo, k),
    ultimaJugada: k > 0 ? { lineas: k, mbit: mbitGanados, seq: (s.ultimaJugada?.seq || 0) + 1 } : s.ultimaJugada,
    tick: s.tick + 1,
  };
  if (n0.lineasPasada >= n0.lineasMeta) return finalizarPasada(n0, false);
  return aparecer(n0, t2) ?? finalizarPasada(n0, true);
}

const probar = (s, df, dc, rot = 0) => {
  const p = { ...s.pieza, f: s.pieza.f + df, c: s.pieza.c + dc, rot: s.pieza.rot + rot };
  return cabe(s.tablero, p) ? p : null;
};

// Tras mover o girar: si la pieza puede volver a bajar, deja de estar «apoyada».
const reubicar = (s, pieza) => ({ ...s, pieza, tick: s.tick + 1, apoyada: s.apoyada && !cabe(s.tablero, { ...pieza, f: pieza.f + 1 }) });

export function pasoBajada(s, accion) {
  if (!s || !accion) return s;
  const jugando = s.fase === 'jugando' && !!s.pieza;
  switch (accion.tipo) {
    case 'empezar':
      return s.fase === 'ficha' ? { ...s, fase: 'jugando', tick: s.tick + 1 } : s;

    case 'izq':
    case 'der': {
      if (!jugando) return s;
      const p = probar(s, 0, accion.tipo === 'izq' ? -1 : 1);
      return p ? reubicar(s, p) : s;
    }

    case 'rotar': {
      if (!jugando) return s;
      const dir = accion.dir === -1 ? -1 : 1;
      for (const [df, dc] of PATADAS) {
        const p = probar(s, df, dc, dir);
        if (p) return reubicar(s, p);
      }
      return s;
    }

    // Caída suave: baja una fila; si ya no puede, la pieza se apoya y a la segunda pulsación se fija.
    case 'suave':
    case 'gravedad': {
      if (!jugando) return s;
      const p = probar(s, 1, 0);
      if (p) return { ...s, pieza: p, apoyada: false, tick: s.tick + 1 };
      return s.apoyada ? fijar(s) : { ...s, apoyada: true, tick: s.tick + 1 };
    }

    case 'dura': {
      if (!jugando) return s;
      const f = filaDeCaida(s.tablero, s.pieza);
      return fijar({ ...s, pieza: { ...s.pieza, f } }, (f - s.pieza.f) * 0.5);
    }

    case 'siguiente_pasada': {
      if (s.fase !== 'pasada_ok' && s.fase !== 'desbordada') return s;
      if (s.pasada >= PASADAS_DSN.length - 1) return { ...s, fase: 'final', tick: s.tick + 1 };
      // Tablero limpio; la bolsa sigue y sale la pieza ya anunciada (el índice `n` no cambia: ya se contó al cerrar la pasada).
      const nuevo = aparecer({ ...s, n: s.n - 1 }, crearTableroVacio());
      return {
        ...nuevo,
        fase: 'jugando',
        pasada: s.pasada + 1,
        mbitPasada: 0,
        lineasPasada: 0,
        racha: 0,
        ultimaJugada: null,
        tick: s.tick + 1,
      };
    }

    default:
      return s;
  }
}

export function calidadBajada07(s) {
  if (!s?.resultadosPasadas?.length) return 0;
  const suma = s.resultadosPasadas.reduce((a, r) => a + r.calif, 0);
  return Math.round(acotar(suma / PASADAS_DSN.length, 0, 1) * 100) / 100;
}

// Vuelca el resultado de la etapa 07 en el estado global de la misión (mismo contrato que antes: ciencia, batería y bitácora).
export function aplicarBajada07(estado, s, resumen) {
  if (!estado || estado.operacionCompletada || estado.perdida) return estado;
  if (!s || s.fase !== 'final') return estado;
  const base = calidadBajada07(s);
  const calidad = Math.min(1, base + (resumen?.apuntado?.bono || 0));
  const posible = resumen?.ciencia?.total ?? 0;
  const ciencia = Math.min(1, posible * (0.4 + 0.6 * calidad));
  // Cada pasada con la memoria desbordada gasta batería extra reenviando (3 % de la batería máxima).
  const desbordes = s.resultadosPasadas.filter((r) => r.desbordada).length;
  const costoBateria = (s.purgasUsadas + desbordes) * Math.round((s.bateriaMax || estado.bateriaMax || 2000) * 0.03);
  const decisiones = s.resultadosPasadas.map((r) => ({
    tipo: r.desbordada ? 'info' : 'bien',
    texto: r.desbordada
      ? t('e07.bajada.logDesborde', { estacion: r.nombre, enviada: r.enviada, lineas: r.lineas, meta: r.meta, perdida: r.perdida })
      : t('e07.bajada.logOk', { estacion: r.nombre, enviada: r.enviada, lineas: r.lineas }),
  }));
  return {
    ...estado,
    ciencia,
    operacionCompletada: true,
    calidadOperacion: calidad,
    bateria: Math.max(0, estado.bateria - costoBateria),
    decisiones: [...estado.decisiones, ...decisiones],
  };
}

// Etapa 07 «Operación científica — Rescate orbital de datos» (ver docs/OPERACION_07.md).
// Motor puro (sin React): tres fases seguidas a partir del boceto «Orbital Rescue» del jugador.
//   1 · Cartografía orbital (visor científico) · 2 · Análisis espectral (dos curvas) · 3 · Transmisión a la Tierra (antena y medidor).
// Cada fase pasa por: ficha → jugando (o pausa) → resultado, o → fallo (sin tiempo; reintentar cuesta batería).
// Las coordenadas de la fase 1 son las del boceto (lienzo de 900 × 520): el visor está fijo en X_VISOR y los objetivos pasan de derecha a izquierda.
// Todo es determinista: la misma semilla y las mismas acciones dan la misma partida.

import { t } from '../i18n/idioma.js';
import { ajusteMinijuego } from './dificultad.js';

export const CONFIG_OPERACION = {
  // Tiempos de cada fase (s)
  TIEMPO: [55, 60, 40],
  PASO_MAX_S: 0.1, // un paso de tiempo nunca avanza más que esto
  // --- Fase 1 · Cartografía
  ANCHO: 900, ALTO: 520, X_VISOR: 450, Y_MIN: 70, Y_MAX: 480, VEL_VISOR: 220,
  CAPTURAS_META: 8, VEL_OBJETIVOS: 180, VEL_FACTOR: 1.15, // cada captura sube la velocidad un 15 %
  SEPARACION_S: 1.1, RADIO_MIN: 32, RADIO_MAX: 42, TOLERANCIA_X: 40, TOLERANCIA_Y: 40, DESTELLO_S: 0.18,
  PTS_CAPTURA: 100, PTS_VACIO: 30,
  F1_BASE: 0.75, F1_TIEMPO: 0.25, F1_PENAL_VACIO: 0.03, // calificación = capturas/8 · (base + bono por tiempo sobrante) − penalización por disparos al vacío
  // --- Fase 2 · Análisis espectral
  MUESTRAS: 3, COINCIDENCIA_MIN: 86, NIVEL_MAX: 4, AJUSTE_FACTOR: 20, PUNTOS_CURVA: 150,
  PTS_FALLO_ESPECTRO: 10, F2_PENAL_FALLO: 0.03,
  // --- Fase 3 · Transmisión
  ANGULO_MIN: 0, ANGULO_MAX: 180, ANGULO_INICIAL: 30, VEL_ANGULO: 110,
  SENAL_ANCHO: 18, SENAL_INICIO: 78, SENAL_MANTENER: 74, RETROCESO: 25, // %/s que retrocede el avance si la señal cae
  TIERRA_BASE_MIN: 45, TIERRA_BASE_MAX: 135, TIERRA_AMP: 25, TIERRA_PERIODO_S: 16, // la Tierra se mueve despacio: base ± amplitud
  PTS_TX: 200,
  // Velocidad de envío (% por segundo con señal perfecta) por destino y escala por la antena del hangar (`resumen.enlace`, Mbit/día).
  TASA_TX: { luna: 6, jupiter: 4.6 },
  ENLACE_REF: { luna: 4000, jupiter: 200 }, // el enlace de referencia da escala 1; cada duplicación suma ESCALA_PASO
  ESCALA_PASO: 0.25, ESCALA_MIN: 0.75, ESCALA_MAX: 1.5,
  F3_BASE: 0.7, F3_TIEMPO: 0.3, F3_PENAL_CORTE: 0.05,
  // --- Resultado de la campaña
  PESOS: [0.35, 0.35, 0.3],
  CIENCIA_MIN: 0.4, CIENCIA_CALIDAD: 0.6, // ciencia = ciencia posible · (0,4 + 0,6 · calidad)
  COSTO_REINTENTO: 0.02, // fracción de la batería de la nave por cada reintento de fase
};
const C = CONFIG_OPERACION;

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const redondear = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const coma = n => String(n).replace('.', ',');

// ---------- Azar con semilla ----------
function azar(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Valor 0..1 que depende solo de (semilla, k): permite sacar el objetivo número k sin guardar el generador.
const hash = (semilla, k) => azar((semilla * 2654435761 + k * 40503 + 12345) | 0)();

// ---------- Datos por destino ----------
export const NOMBRES_FASE = ['Cartografía orbital', 'Análisis espectral', 'Transmisión a la Tierra'];

// Objetivos de la cartografía (fase 1).
export const OBJETIVOS_MAPA = {
  luna: ['Polo sur (Shackleton)', 'Fosa de Mare Tranquillitatis', 'Sitio Apolo 11', 'Cráter Tycho', 'Sitio Apolo 17', 'Cráter Copérnico', 'Polo norte', 'Cráter Cabeus'],
  jupiter: ['Gran Mancha Roja', 'Ciclón del polo norte', 'Ciclón del polo sur', 'Óvalo BA', 'Vórtice de la banda ecuatorial', 'Tormenta de la banda templada', 'Ciclón polar secundario', 'Óvalo blanco'],
};

// Gases de la fase 2. Las firmas (posición 0..1 de los picos) son DE JUEGO, no un espectro real.
export const GASES = {
  luna: [
    { id: 'H2O', nombre: 'H₂O', color: '#71d1ff', picos: [0.16, 0.43, 0.84] },
    { id: 'CO', nombre: 'CO', color: '#ffb56a', picos: [0.28, 0.72] },
    { id: 'NH3', nombre: 'NH₃', color: '#d5a2ff', picos: [0.56, 0.88] },
    { id: 'CH4', nombre: 'CH₄', color: '#88efab', picos: [0.36, 0.64] },
  ],
  jupiter: [
    { id: 'NH3', nombre: 'NH₃', color: '#d5a2ff', picos: [0.2, 0.5, 0.8] },
    { id: 'H2O', nombre: 'H₂O', color: '#71d1ff', picos: [0.12, 0.46, 0.9] },
    { id: 'CH4', nombre: 'CH₄', color: '#88efab', picos: [0.3, 0.68] },
    { id: 'PH3', nombre: 'PH₃', color: '#ffb56a', picos: [0.38, 0.74] },
  ],
};

// Textos de la etapa y su dato real por destino.
export const DATOS_OPERACION = {
  luna: {
    cuerpo: 'la Luna', nave: 'LRO', retardo: 'La señal tarda 1,3 s en llegar a la Tierra.',
    f1: { titulo: 'Cartografía de la Luna', objetivos: 'cráteres y zonas de interés (polos, fosas y sitios Apolo)', real: 'LRO cartografió toda la Luna con su cámara LROC.' },
    f2: { titulo: 'Gases de la pluma de LCROSS', objetivos: 'H₂O, CO, NH₃ y CH₄: los gases de la pluma del impacto LCROSS en el cráter Cabeus (2009)', real: 'LCROSS confirmó agua en una zona de sombra permanente, y LRO observó la pluma.', mision: 'agua' },
    f3: { titulo: 'Enlace con la Tierra', real: 'Las tres antenas de 70 m de la Red de Espacio Profundo de la NASA (Goldstone, Madrid y Canberra) reciben estos datos.' },
  },
  jupiter: {
    cuerpo: 'Júpiter', nave: 'Juno', retardo: 'La señal tarda unos 45 minutos en llegar (entre 33 y 53 según la posición).',
    f1: { titulo: 'Cartografía de Júpiter', objetivos: 'tormentas y vórtices, como la Gran Mancha Roja', real: 'JunoCam fotografió los ciclones de los polos de Júpiter.' },
    f2: { titulo: 'Gases de la atmósfera de Júpiter', objetivos: 'NH₃, H₂O, CH₄ y PH₃, gases de su atmósfera', real: 'El radiómetro de microondas de Juno midió el amoníaco y el agua bajo las nubes.', mision: 'atmósfera' },
    f3: { titulo: 'Enlace con la Tierra', real: 'Las tres antenas de 70 m de la Red de Espacio Profundo de la NASA (Goldstone, Madrid y Canberra) reciben estos datos.' },
  },
};

const destinoDe = mision => (mision?.destino?.id === 'jupiter' || mision?.id === 'juno' ? 'jupiter' : 'luna');

// ---------- Fase 1 · helpers ----------
// Velocidad de los objetivos con `capturas` hechas (+15 % por captura).
export const velocidadObjetivos = (capturas, velMult = 1) => C.VEL_OBJETIVOS * velMult * C.VEL_FACTOR ** capturas;

// ---------- Fase 2 · espectro ----------
// Absorción total en la posición x (0..1) con los niveles (0..4) de cada gas: la suma de picos gaussianos del boceto.
export function absorcion(gases, x, niveles) {
  let suma = 0;
  gases.forEach((g, i) => {
    const w = 0.02 + (i % 2) * 0.006;
    for (const p of g.picos) suma += ((niveles[i] || 0) / C.NIVEL_MAX) * 0.36 * Math.exp(-(((x - p) / w) ** 2));
  });
  return Math.min(0.92, suma);
}
// Puntos de la curva (para dibujarla): n+1 valores 0..1.
export const curvaEspectral = (gases, niveles, n = C.PUNTOS_CURVA) => Array.from({ length: n + 1 }, (_, i) => absorcion(gases, i / n, niveles));
// Coincidencia (0..100) entre la hipótesis y la medición.
export function ajusteEspectral(gases, objetivo, niveles) {
  let err = 0;
  for (let i = 0; i <= C.PUNTOS_CURVA; i++) { const x = i / C.PUNTOS_CURVA; err += Math.abs(absorcion(gases, x, objetivo) - absorcion(gases, x, niveles)); }
  return Math.round(Math.max(0, 100 - err * C.AJUSTE_FACTOR));
}
// Las 3 muestras de una semilla: cada una mezcla 2 o 3 gases con niveles de 1 a 4; todas distintas.
export function generarMuestras(destino, semilla) {
  const n = GASES[destino].length, rnd = azar((semilla * 7919 + (destino === 'jupiter' ? 2027 : 1969)) | 0), muestras = [];
  while (muestras.length < C.MUESTRAS) {
    const activos = 2 + Math.floor(rnd() * 2), v = new Array(n).fill(0);
    const orden = [...v.keys()].sort(() => rnd() - 0.5);
    for (let k = 0; k < activos; k++) v[orden[k]] = 1 + Math.floor(rnd() * C.NIVEL_MAX);
    if (!muestras.some(m => m.join() === v.join())) muestras.push(v);
  }
  return muestras;
}

// ---------- Fase 3 · señal ----------
// Escala de la velocidad de envío según la antena del hangar (`resumen.enlace`, Mbit/día), recortada a un rango jugable.
export function escalaEnlace(enlace, destino) {
  if (!(enlace > 0)) return C.ESCALA_MIN;
  return acotar(1 + C.ESCALA_PASO * Math.log2(enlace / C.ENLACE_REF[destino]), C.ESCALA_MIN, C.ESCALA_MAX);
}
// Ángulo de la Tierra `t` segundos después de empezar (se mueve despacio alrededor de su base).
export const anguloTierra = (g, t) => acotar(g.base + C.TIERRA_AMP * Math.sin((2 * Math.PI * t) / C.TIERRA_PERIODO_S + g.fase0), 10, 170);
// Calidad de la señal (0..100): máxima justo en el ángulo de la Tierra.
export const calidadSenal = (angulo, tierra) => Math.round(100 * Math.exp(-(((angulo - tierra) / C.SENAL_ANCHO) ** 2)));
export const tasaTransmision = s => C.TASA_TX[s.destino] * s.escalaEnlace; // % por segundo con señal perfecta

// ---------- Creación ----------
function datosFase(s, f) {
  const sem = (s.semilla * 31 + f * 977 + s.reintentosFase * 131) | 0, rnd = azar(sem);
  if (f === 1) return { y: C.ALTO / 2, capturas: 0, vacios: 0, spawnT: 0, k: 0, objetivos: [], destello: 0, ultimo: null, semilla: sem };
  if (f === 2) return { muestra: 0, sel: 0, niveles: [0, 0, 0, 0], objetivos: generarMuestras(s.destino, sem), coincidencia: null, fallos: 0, ajustes: [] };
  return { angulo: C.ANGULO_INICIAL, base: C.TIERRA_BASE_MIN + rnd() * (C.TIERRA_BASE_MAX - C.TIERRA_BASE_MIN), fase0: rnd() * Math.PI * 2, t: 0, tx: false, avance: 0, cortes: 0, enCorte: false, ola: 0 };
}
const mensajeInicial = f => t(`e07.mensajeInicial.${f}`);

function nuevaFase(s, f, fase = 'ficha') {
  const tiempo = Math.round(C.TIEMPO[f - 1] * (s.tiempoMult ?? 1));
  const base = { ...s, f, fase, faseAntes: null, g: null, t: tiempo, total: tiempo, puntos: 0, mensaje: mensajeInicial(f), motivo: null };
  return { ...base, g: datosFase(base, f) };
}

// La dificultad (B11) ajusta el tiempo de las fases y la velocidad de los objetivos en la fase 1.
// opciones: { semilla, fase (1..3) }. `estado` aporta la batería de la nave; `resumen` la antena (`enlace`).
export function crearOperacion07(estado, mision, resumen, { semilla, fase } = {}) {
  const destino = destinoDe(mision), sem = semilla ?? Math.floor(Math.random() * 2 ** 31), aj = ajusteMinijuego(mision);
  const r = azar((sem * 13 + 7) | 0);
  const s = {
    fase: 'ficha', f: 1, destino, misionId: mision?.id === 'juno' ? 'juno' : 'lro', semilla: sem,
    tiempoMult: aj.tiempo, velMult: aj.velocidad,
    reintentosFase: 0, reintentos: 0, bateriaNave: estado?.bateria ?? 0, bateriaNaveMax: estado?.bateriaMax ?? 0, costoTotal: 0,
    enlace: resumen?.enlace ?? 0, escalaEnlace: escalaEnlace(resumen?.enlace ?? 0, destino),
    retardoS: destino === 'luna' ? 1.3 : Math.round(33 * 60 + r() * 20 * 60), // Júpiter: entre 33 y 53 min según la posición
    califs: [null, null, null], resultados: [null, null, null], puntosTotal: 0, registro: [],
  };
  return nuevaFase(s, acotar(Math.round(fase) || 1, 1, 3));
}

// ---------- Calificaciones (0..1) ----------
export const calificacionF1 = (capturas, restante, vacios, total = C.TIEMPO[0]) => redondear(acotar(Math.min(1, capturas / C.CAPTURAS_META) * (C.F1_BASE + C.F1_TIEMPO * (restante / total)) - C.F1_PENAL_VACIO * vacios, 0, 1), 3);
export const calificacionF2 = (ajustes, fallos) => redondear(acotar(ajustes.reduce((a, b) => a + b, 0) / Math.max(1, ajustes.length) / 100 - C.F2_PENAL_FALLO * fallos, 0, 1), 3);
export const calificacionF3 = (restante, cortes, total = C.TIEMPO[2]) => redondear(acotar(C.F3_BASE + C.F3_TIEMPO * (restante / total) - C.F3_PENAL_CORTE * cortes, 0, 1), 3);
export const calidadOperacion = califs => redondear(califs.reduce((a, c, i) => a + (c ?? 0) * C.PESOS[i], 0), 3);

function completar(s) {
  const { f, g } = s, real = DATOS_OPERACION[s.destino][`f${f}`];
  let calif, texto;
  if (f === 1) {
    calif = calificacionF1(g.capturas, s.t, g.vacios, s.total);
    const dispTxt = g.vacios === 1 ? t('e07.f1.disparoSingular') : t('e07.f1.disparoPlural');
    texto = t('e07.f1.resTexto', { capturas: g.capturas, total: C.CAPTURAS_META, vacios: g.vacios, disparos: dispTxt });
  } else if (f === 2) {
    calif = calificacionF2(g.ajustes, g.fallos);
    const media = Math.round(g.ajustes.reduce((a, b) => a + b, 0) / Math.max(1, g.ajustes.length));
    const compTxt = g.fallos === 1 ? t('e07.f2.compSingular') : t('e07.f2.compPlural');
    texto = t('e07.f2.resTexto', { media, fallos: g.fallos, comprobaciones: compTxt });
  } else {
    calif = calificacionF3(s.t, g.cortes, s.total);
    const cortTxt = g.cortes === 1 ? t('e07.f3.corteSingular') : t('e07.f3.cortePlural');
    texto = t('e07.f3.resTexto', { tiempo: coma(redondear(s.t, 1)), cortes: g.cortes, cortesTxt: cortTxt });
  }
  const realTitulo = t(`e07.datos.${s.destino}.f${f}.titulo`, null, real.titulo);
  const realTexto = t(`e07.datos.${s.destino}.f${f}.real`, null, real.real);
  const califs = s.califs.map((c, i) => (i === f - 1 ? calif : c));
  const resultados = s.resultados.map((r, i) => (i === f - 1 ? { calif, texto, real: realTexto, titulo: realTitulo } : r));
  return { ...s, fase: 'resultado', califs, resultados, puntosTotal: s.puntosTotal + s.puntos, mensaje: t('e07.faseCompletada') };
}
const fallar = (s, texto) => ({ ...s, fase: 'fallo', t: 0, motivo: texto, mensaje: texto });

// ---------- Paso de la fase 1 ----------
function avanzarF1(s, dt, eje) {
  const g = s.g, vel = velocidadObjetivos(g.capturas, s.velMult ?? 1);
  const y = acotar(g.y + eje * C.VEL_VISOR * dt, C.Y_MIN, C.Y_MAX);
  let objetivos = g.objetivos.map(o => ({ ...o, x: o.x - vel * dt })).filter(o => !o.usado && o.x > -o.r - 30);
  let spawnT = g.spawnT + dt, k = g.k;
  const vivos = objetivos.filter(o => o.x > -70).length;
  if (spawnT >= C.SEPARACION_S && g.capturas + vivos < C.CAPTURAS_META) {
    const lista = OBJETIVOS_MAPA[s.destino];
    const nombre = t(`e07.obj.${s.destino}.${k % lista.length}`, null, lista[k % lista.length]);
    objetivos = [...objetivos, { id: k, x: C.ANCHO + 40, y: C.Y_MIN + hash(g.semilla, k * 2) * (C.Y_MAX - C.Y_MIN), r: C.RADIO_MIN + hash(g.semilla, k * 2 + 1) * (C.RADIO_MAX - C.RADIO_MIN), usado: false, nombre }];
    spawnT = 0; k += 1;
  }
  const tReloj = s.t - dt;
  const n = { ...s, t: Math.max(0, tReloj), g: { ...g, y, objetivos, spawnT, k, destello: Math.max(0, g.destello - dt) } };
  return tReloj <= 0 ? fallar(n, t('e07.f1.falloTiempo')) : n;
}

function capturarF1(s) {
  const g = s.g, blanco = g.objetivos.filter(o => !o.usado && Math.abs(o.x - C.X_VISOR) < C.TOLERANCIA_X && Math.abs(o.y - g.y) < C.TOLERANCIA_Y)
    .sort((a, b) => Math.abs(a.x - C.X_VISOR) - Math.abs(b.x - C.X_VISOR))[0];
  if (!blanco) return { ...s, puntos: Math.max(0, s.puntos - C.PTS_VACIO), mensaje: t('e07.f1.vacio'), g: { ...g, vacios: g.vacios + 1, ultimo: { tipo: 'vacio' } } };
  const capturas = g.capturas + 1;
  const n = { ...s, puntos: s.puntos + C.PTS_CAPTURA, mensaje: t('e07.f1.captura', { nombre: blanco.nombre }), g: { ...g, capturas, destello: C.DESTELLO_S, ultimo: { tipo: 'captura', nombre: blanco.nombre }, objetivos: g.objetivos.map(o => (o.id === blanco.id ? { ...o, usado: true } : o)) } };
  return capturas >= C.CAPTURAS_META ? completar(n) : n;
}

// ---------- Paso de la fase 2 ----------
function comprobarF2(s) {
  const g = s.g, gases = GASES[s.destino], fit = ajusteEspectral(gases, g.objetivos[g.muestra], g.niveles);
  if (fit < C.COINCIDENCIA_MIN) return { ...s, puntos: Math.max(0, s.puntos - C.PTS_FALLO_ESPECTRO), mensaje: t('e07.f2.ajusteInsuficiente', { fit }), g: { ...g, coincidencia: fit, fallos: g.fallos + 1 } };
  const ajustes = [...g.ajustes, fit], puntos = s.puntos + fit;
  if (g.muestra + 1 >= C.MUESTRAS) return completar({ ...s, puntos, mensaje: t('e07.f2.muestraResueltaFinal', { fit }), g: { ...g, coincidencia: fit, ajustes } });
  return { ...s, puntos, mensaje: t('e07.f2.muestraResueltaSiguiente', { fit, n: g.muestra + 2 }), g: { ...g, muestra: g.muestra + 1, niveles: [0, 0, 0, 0], sel: 0, coincidencia: fit, ajustes } };
}

// ---------- Paso de la fase 3 ----------
function avanzarF3(s, dt, eje) {
  const g = s.g, tG = g.t + dt, angulo = acotar(g.angulo + eje * C.VEL_ANGULO * dt, C.ANGULO_MIN, C.ANGULO_MAX);
  const q = calidadSenal(angulo, anguloTierra(g, tG));
  let { avance, cortes, enCorte } = g, puntos = s.puntos, mensaje = s.mensaje;
  if (g.tx) {
    if (q >= C.SENAL_MANTENER) { avance = Math.min(100, avance + dt * tasaTransmision(s) * (q / 100)); enCorte = false; }
    else { avance = Math.max(0, avance - dt * C.RETROCESO); if (!enCorte) { cortes += 1; enCorte = true; mensaje = t('e07.f3.senalCayo'); } }
  } else enCorte = false;
  const restante = Math.max(0, s.t - dt);
  const n = { ...s, t: restante, puntos, mensaje, g: { ...g, angulo, t: tG, avance, cortes, enCorte, ola: g.ola + dt * 3.5 } };
  if (avance >= 100) return completar({ ...n, puntos: puntos + C.PTS_TX, mensaje: t('e07.f3.exito'), g: { ...n.g, tx: false } });
  return s.t - dt <= 0 ? fallar(n, t('e07.f3.falloTiempo')) : n;
}

function transmitirF3(s) {
  const g = s.g, q = calidadSenal(g.angulo, anguloTierra(g, g.t));
  if (g.tx) return { ...s, mensaje: t('e07.f3.pausa'), g: { ...g, tx: false } };
  if (q < C.SENAL_INICIO) return { ...s, mensaje: t('e07.f3.mensajeDebil') };
  return { ...s, mensaje: t('e07.f3.iniciada'), g: { ...g, tx: true } };
}

// ---------- Paso general ----------
// Acciones: empezar · tiempo{dt,eje} · pausar · reanudar · reintentar · siguiente · cerrar
//   fase 1: capturar   fase 2: gas{d|i} · nivel{d|i} · comprobar   fase 3: transmitir
export function pasoOperacion(s, a) {
  switch (a.tipo) {
    case 'empezar': return s.fase === 'ficha' ? { ...s, fase: 'jugando' } : s;
    case 'pausar': return s.fase === 'jugando' ? { ...s, fase: 'pausa', faseAntes: 'jugando' } : s;
    case 'reanudar': return s.fase === 'pausa' ? { ...s, fase: s.faseAntes || 'jugando', faseAntes: null } : s;
    case 'tiempo': {
      if (s.fase !== 'jugando') return s;
      const dt = acotar(a.dt || 0, 0, C.PASO_MAX_S), eje = acotar(a.eje || 0, -1, 1);
      if (!(dt > 0)) return s;
      if (s.f === 1) return avanzarF1(s, dt, eje);
      if (s.f === 3) return avanzarF3(s, dt, eje);
      const tReloj = s.t - dt; // fase 2: solo corre el reloj
      return tReloj <= 0 ? fallar({ ...s, t: 0 }, t('e07.f2.falloTiempo')) : { ...s, t: tReloj };
    }
    case 'capturar': return s.fase === 'jugando' && s.f === 1 ? capturarF1(s) : s;
    case 'gas': {
      if (s.fase !== 'jugando' || s.f !== 2) return s;
      const n = GASES[s.destino].length, sel = a.i != null ? acotar(a.i, 0, n - 1) : (s.g.sel + (a.d || 0) + n) % n;
      return { ...s, g: { ...s.g, sel } };
    }
    case 'nivel': {
      if (s.fase !== 'jugando' || s.f !== 2) return s;
      const i = a.i != null ? acotar(a.i, 0, 3) : s.g.sel, niveles = s.g.niveles.map((v, k) => (k === i ? acotar(v + (a.d || 0), 0, C.NIVEL_MAX) : v));
      return { ...s, g: { ...s.g, sel: i, niveles } };
    }
    case 'comprobar': return s.fase === 'jugando' && s.f === 2 ? comprobarF2(s) : s;
    case 'transmitir': return s.fase === 'jugando' && s.f === 3 ? transmitirF3(s) : s;
    case 'reintentar': {
      if (s.fase !== 'fallo') return s;
      const costo = s.bateriaNaveMax * C.COSTO_REINTENTO;
      const n = nuevaFase({ ...s, reintentosFase: s.reintentosFase + 1 }, s.f, 'jugando');
      return { ...n, reintentos: s.reintentos + 1, costoTotal: s.costoTotal + costo, bateriaNave: Math.max(0, s.bateriaNave - costo), registro: [...s.registro, t('e07.registroReintento', { f: s.f })] };
    }
    case 'siguiente': {
      if (s.fase !== 'resultado') return s;
      return s.f >= 3 ? { ...s, fase: 'final' } : nuevaFase({ ...s, reintentosFase: 0 }, s.f + 1);
    }
    case 'cerrar': return s.fase === 'resultado' && s.f >= 3 ? { ...s, fase: 'final' } : s;
    default: return s;
  }
}

// ---------- Resultado para la campaña ----------
// Vuelca la operación en el estado de la misión. Idempotente (una segunda llamada no cambia nada) y no corre si la misión ya está perdida.
export function aplicarOperacion07(estado, s, resumen) {
  if (!estado || estado.operacionCompletada || estado.perdida) return estado;
  if (s.fase !== 'final') return estado;
  // B3: el control de orientación elegido suma un bono pequeño a la calidad (sin él, 0: todo igual que antes).
  const calidad = Math.min(1, calidadOperacion(s.califs) + (resumen?.apuntado?.bono || 0)), posible = resumen?.ciencia?.total ?? 0;
  const ciencia = Math.min(1, posible * (C.CIENCIA_MIN + C.CIENCIA_CALIDAD * calidad));
  const decisiones = s.resultados.map((r, i) => ({
    tipo: r.calif >= 0.6 ? 'bien' : 'info',
    texto: t('e07.decisionFase', {
      n: i + 1,
      nombre: t(`e07.fase${i + 1}.nombre`, null, NOMBRES_FASE[i]),
      pct: Math.round(r.calif * 100),
      texto: r.texto,
      real: r.real,
    }),
  }));
  if (s.reintentos > 0) {
    const reintTxt = s.reintentos === 1 ? t('e07.reintentoSingular') : t('e07.reintentoPlural');
    decisiones.push({
      tipo: 'info',
      texto: t('e07.decisionReintentos', {
        reintentos: s.reintentos,
        reintentosTxt: reintTxt,
        pct: s.reintentos * 2,
      }),
    });
  }
  return {
    ...estado, ciencia, operacionCompletada: true, calidadOperacion: calidad,
    bateria: Math.max(0, estado.bateria - s.costoTotal), decisiones: [...estado.decisiones, ...decisiones],
  };
}

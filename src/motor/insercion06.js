// Etapa 06 «Inserción orbital — Minisonda: Exploración Orbital» (ver docs/INSERCION_06.md).
// Motor puro (sin React ni three). La nodriza ya está en órbita y suelta una minisonda que solo se desplaza de lado (eje X)
// mientras caen cuerpos rocosos en diagonal. Hay que esquivarlos y fotografiar cada uno cuando pasa por debajo.
// Ejes del minijuego (en «unidades de escena»): x lateral (−XMAX..XMAX), y vertical con 0 = la línea de la minisonda y + hacia ARRIBA.
// Cada cuerpo sigue una recta: pos(t) = (xc + vx·(t − tc), −vy·(t − tc)); tc es el instante en que cruza la línea de la sonda (y = 0).
// v2 «más entretenido»: puntos con calidad y combo, cuerpos con personalidad (el oscilante suma un vaivén senoidal a x), un tema por misión,
// estrellas al cerrar cada misión y eventos para los textos flotantes de la escena. Todo sigue siendo puro y determinista.

import { t as tr } from '../i18n/idioma.js';
import { sondaInsercion } from './drones.js';
import { ajusteMinijuego } from './dificultad.js';

export const CONFIG_INSERCION = {
  XMAX: 5, // límite lateral de la minisonda (±)
  VEL_X: 7, // velocidad lateral con el mando al máximo (u/s)
  RADIO_SONDA: 0.55, // radio de colisión de la minisonda
  RADIO_MIN: 0.55, RADIO_MAX: 0.95, // radio visual de los cuerpos; el de colisión es el 85 % (la roca no es una esfera perfecta)
  FACTOR_COLISION: 0.85,
  Y_APARICION: 10.4, // altura a la que aparecen los cuerpos
  CUERPOS_MIN: 4, CUERPOS_MAX: 6,
  VENTANA_FOTO_S: 1.1, // tiempo para disparar desde que el cuerpo pasa por debajo de la sonda (el tema de la misión puede cambiarlo)
  ESPERA_SIGUIENTE_S: 3, // la tarjeta de resultado se queda tanto y la siguiente misión empieza sola (o con «Siguiente misión»)
  TEMA_DURACION_S: 2, // tarjeta de presentación del tema antes de cada misión nueva
  DURACION_CINEMATICA_S: 6,
  MISIONES_PARA_CERRAR: 3,
  COSTO_REINTENTO: 0.01, // fracción de la batería de la nave por cada reintento
  PRECISION_MIN: 0.3, PRECISION_POR_FALLO: 0.12,
  PASO_MAX_S: 1 / 60, // el motor avanza en pasos de este tamaño como máximo (así no se atraviesan cuerpos)
  // Progresión por misión (sube de forma gradual y con tope).
  VY_BASE: 3.45, VY_PASO: 0.35, VY_MAX: 5.5, // velocidad de caída (+15 %: más ágil)
  VX_BASE: 0.9, VX_PASO: 0.2, VX_MAX: 2.4, // componente horizontal (la diagonal) máxima
  VX_MIN: 0.45, // ningún cuerpo cae vertical
  GAP_BASE: 3.0, GAP_PASO: 0.2, GAP_MIN: 1.45, // segundos entre cruces consecutivos (> VENTANA_FOTO_S: las ventanas no se pisan)
  // Comprobación de «hay ruta de esquive»: se exige poder esquivar yendo al 75 % de la velocidad real y con un margen extra.
  RUTA_FACTOR_VEL: 0.75, RUTA_MARGEN: 0.18, RUTA_DT: 1 / 30,
  // --- v2 · Puntos y calidad: `hasta` es la fracción de la ventana ya gastada al disparar (mientras más pronto, mejor detalle).
  CALIDADES: [{ id: 'PERFECTA', hasta: 0.35, pts: 300 }, { id: 'BUENA', hasta: 0.75, pts: 200 }, { id: 'JUSTA', hasta: 1, pts: 100 }],
  COMBO_MAX: 3, // multiplicador máximo (×1 → ×2 → ×3)
  POR_POCO_MARGEN: 0.45, POR_POCO_PTS: 150, // pasar a menos de (radios + margen) sin chocar
  // --- v2 · Tipos de cuerpo
  BOLIDO_VEL: 1.45, BOLIDO_RADIO: 0.72, GIGANTE_RADIO: 1.6, GIGANTE_VEL: 0.8,
  OSC_AMP_MIN: 0.3, OSC_AMP_MAX: 0.8, OSC_PERIODO_MIN: 1.6, OSC_PERIODO_MAX: 2.8, // vaivén suave y predecible
  RARO_PROB: 0.6, RARO_FACTOR: 2, // desde la misión 2: 60 % de que haya un cuerpo raro; su foto vale ×2
  // --- v2 · Temas de misión
  ENJAMBRE_GAP: 0.75, ENJAMBRE_VENTANA: 1.3, // intervalo −25 % y ventana más larga
  TORMENTA_VENTANA: 0.85, TORMENTA_PUNTOS: 1.5,
  RASANTE_VEL: 1.25, RASANTE_PLANETA: 1.35, // cuerpos más rápidos y planeta más grande y cercano
  MARGEN_GAP_VENTANA: 0.35, // los cruces siempre van separados más que la ventana del tema (las ventanas no se pisan)
  // --- v2 · Estrellas, récord y precisión
  ESTRELLAS_3: 0.8, ESTRELLAS_2: 0.5, // fracción de los puntos máximos posibles
  PRECISION_ESTRELLAS_BASE: 0.85, PRECISION_POR_ESTRELLA: 0.05,
  ESTRELLAS_SIN_DATO: 1, // promedio que se usa si no hay misiones cumplidas con estrellas registradas
  EVENTOS_MAX: 8, // cuántos eventos recientes se guardan para la escena
  CLAVE_RECORD: 'vdl-orbita2-insercion-record'
};
const C = CONFIG_INSERCION;

// Escenario de llegada por misión. Hoy las dos fueron inserciones orbitales reales; MAVEN, DART u OSIRIS-REx podrán usar `sobrevuelo` o `descenso`.
export const ESCENARIOS_LLEGADA = { lro: 'insercion', juno: 'insercion' };

// Datos reales que cuenta IO en la cinemática y en el informe.
export const DATOS_LLEGADA = {
  lro: {
    destino: 'luna', cuerpo: 'la Luna', nave: 'LRO', fecha: '23 de junio de 2009',
    demora: 'La luz tarda 1,3 s en ir de la Luna a la Tierra, pero la maniobra se programa mucho antes.',
    maniobra: 'LRO entró en órbita lunar el 23 de junio de 2009 con un encendido de frenado programado de antemano.'
  },
  juno: {
    destino: 'jupiter', cuerpo: 'Júpiter', nave: 'Juno', fecha: '4 de julio de 2016',
    demora: 'Durante la inserción de Juno la señal tardaba unos 48 minutos en llegar a la Tierra: nadie podía manejarla desde aquí.',
    maniobra: 'Juno entró en órbita de Júpiter el 4 de julio de 2016 con un encendido de unos 35 minutos.'
  }
};

// Datos de llegada con los textos en el idioma actual (la constante de arriba queda como referencia en español).
export const datosLlegada = id => {
  const k = DATOS_LLEGADA[id] ? id : 'lro', b = DATOS_LLEGADA[k];
  return { ...b, cuerpo: tr(`e06.llegada.${k}.cuerpo`), fecha: tr(`e06.llegada.${k}.fecha`), demora: tr(`e06.llegada.${k}.demora`), maniobra: tr(`e06.llegada.${k}.maniobra`) };
};
// Textos de un cuerpo (nombre, clase y, si es raro, dato) por su tipo; las constantes del catálogo no cambian.
export const textoCuerpo = (c, campo) => tr(`e06.cuerpo.${c.tipo}.${campo}`, undefined, c[campo]);

// Catálogo de cuerpos por destino. Júpiter: fragmentos de las lunas internas Metis y Adrastea (que alimentan los anillos), como «variante de juego».
export const CATALOGO_CUERPOS = {
  luna: [
    { tipo: 'eyeccion', nombre: 'fragmento de eyección', clase: 'Roca de eyección', color: '#9a958c' },
    { tipo: 'brecha', nombre: 'fragmento de brecha de impacto', clase: 'Brecha de impacto', color: '#847c72' },
    { tipo: 'meteoroide', nombre: 'meteoroide', clase: 'Meteoroide rocoso', color: '#6f6a64' },
    { tipo: 'hierro', nombre: 'meteoroide metálico', clase: 'Meteoroide de hierro', color: '#8f929b' }
  ],
  jupiter: [
    { tipo: 'metis', nombre: 'fragmento de Metis (variante de juego)', clase: 'Fragmento de Metis', color: '#8a6e57' },
    { tipo: 'adrastea', nombre: 'fragmento de Adrastea (variante de juego)', clase: 'Fragmento de Adrastea', color: '#78604f' },
    { tipo: 'anillo', nombre: 'bloque de anillo (variante de juego)', clase: 'Bloque de anillo', color: '#9b7d62' }
  ]
};

// Cuerpos raros (brillan, su foto vale ×2 y traen un dato real breve). `brillo` es el color de su resplandor en la escena.
export const RAROS_CUERPOS = {
  luna: [
    { tipo: 'hielo', nombre: 'fragmento con hielo de agua', clase: 'Roca con hielo de agua', color: '#bfe8ff', brillo: '#6fd6ff', dato: 'En 2009 la misión LCROSS confirmó agua en el cráter Cabeus, uno de los que no reciben luz del Sol cerca del polo sur lunar.' },
    { tipo: 'hierro_niquel', nombre: 'meteoroide de hierro-níquel', clase: 'Meteoroide metálico raro', color: '#c7ccd6', brillo: '#9db4ff', dato: 'Muchos meteoritos metálicos son trozos del núcleo de asteroides que se rompieron: hierro con níquel.' }
  ],
  jupiter: [
    { tipo: 'polvo_anillo', nombre: 'bloque brillante de anillo (variante de juego)', clase: 'Bloque de anillo brillante', color: '#e8d2ae', brillo: '#ffd9a0', dato: 'La sonda Voyager 1 descubrió los anillos de Júpiter en 1979: son tenues y de polvo fino.' },
    { tipo: 'metis_raro', nombre: 'fragmento reluciente de Metis (variante de juego)', clase: 'Fragmento de Metis reluciente', color: '#d9b896', brillo: '#ffc890', dato: 'Metis y Adrastea orbitan dentro de los anillos de Júpiter: los impactos en ellas lanzan el polvo que los forma.' }
  ]
};

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
function azar(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const destinoDe = mision => (mision?.id === 'juno' ? 'jupiter' : 'luna');

// ---------- Temas por misión ----------
// M1 sin evento; M2 noche orbital; M3 enjambre; de la M4 en adelante rotan tormenta solar (cinturón de radiación en Júpiter), paso rasante y noche orbital.
// Campos: ventana (s de foto), gap (factor del intervalo), puntos (factor), vel (factor de caída), luz ('dia' | 'noche'), estatica (ruido en pantalla), planeta (escala del planeta).
const ROTACION_TEMAS = ['tormenta', 'rasante', 'noche'];
export function temaMision(numero, destino) {
  const j = destino === 'jupiter', n = Math.max(1, Math.floor(numero || 1));
  const base = { ventana: C.VENTANA_FOTO_S, gap: 1, puntos: 1, vel: 1, luz: 'dia', estatica: false, planeta: 1 };
  const id = n === 1 ? 'primer_paso' : n === 2 ? 'noche' : n === 3 ? 'enjambre' : ROTACION_TEMAS[(n - 4) % ROTACION_TEMAS.length];
  switch (id) {
    case 'primer_paso': return { ...base, id, nombre: tr('e06.tema.primer_paso.nombre'), texto: tr('e06.tema.primer_paso.texto') };
    case 'noche': return { ...base, id, nombre: tr('e06.tema.noche.nombre'), luz: 'noche', texto: tr('e06.tema.noche.texto') };
    case 'enjambre': return { ...base, id, nombre: tr('e06.tema.enjambre.nombre'), gap: C.ENJAMBRE_GAP, ventana: C.ENJAMBRE_VENTANA, texto: tr('e06.tema.enjambre.texto', { v: String(C.ENJAMBRE_VENTANA).replace('.', ','), lugar: j ? tr('e06.tema.enjambre.jupiter') : tr('e06.tema.enjambre.luna') }) };
    case 'tormenta': return j
      ? { ...base, id: 'radiacion', nombre: tr('e06.tema.radiacion.nombre'), ventana: C.TORMENTA_VENTANA, puntos: C.TORMENTA_PUNTOS, estatica: true, texto: tr('e06.tema.radiacion.texto') }
      : { ...base, id, nombre: tr('e06.tema.tormenta.nombre'), ventana: C.TORMENTA_VENTANA, puntos: C.TORMENTA_PUNTOS, estatica: true, texto: tr('e06.tema.tormenta.texto') };
    default: return { ...base, id: 'rasante', nombre: tr('e06.tema.rasante.nombre'), vel: C.RASANTE_VEL, planeta: C.RASANTE_PLANETA, texto: tr('e06.tema.rasante.texto') };
  }
}

// ---------- Progresión ----------
// Por misión (1, 2, 3…): más cuerpos (de 4 a 6), caen más rápido, con más diagonal y más seguidos; todo con tope.
export function progresion(numero) {
  const k = Math.max(0, numero - 1);
  return {
    cuerpos: Math.min(C.CUERPOS_MAX, C.CUERPOS_MIN + Math.floor(k / 2)),
    vy: Math.min(C.VY_MAX, C.VY_BASE + C.VY_PASO * k),
    vxMax: Math.min(C.VX_MAX, C.VX_BASE + C.VX_PASO * k),
    gap: Math.max(C.GAP_MIN, C.GAP_BASE - C.GAP_PASO * k)
  };
}

// ---------- Cuerpos ----------
// Posición de un cuerpo en el instante t (x lateral, y vertical con 0 = línea de la sonda). El aro de foto, la colisión y `existeRuta` usan ESTA función.
// El oscilante (`c.osc = { amp, periodo, fase }`) suma un vaivén senoidal a x: sigue siendo una función exacta del tiempo (predecible).
export const posicionCuerpo = (c, t) => {
  const d = t - c.tc, o = c.osc;
  return { x: c.xc + c.vx * d + (o ? o.amp * Math.sin((2 * Math.PI * d) / o.periodo + o.fase) : 0), y: -c.vy * d };
};
// Ángulos de rotación propia (3D) en el instante t.
export const rotacionCuerpo = (c, t) => [c.rot0[0] + c.w[0] * t, c.rot0[1] + c.w[1] * t, c.rot0[2] + c.w[2] * t];

// Reparte las variantes entre los `n` cuerpos: 1 bólido siempre; desde la M2 un gigante, un oscilante (2 desde la M4) y, con 60 %, un raro.
function repartirVariantes(rnd, n, numero) {
  const v = Array(n).fill('comun'), orden = [...Array(n).keys()].sort(() => rnd() - 0.5);
  let k = 0;
  v[orden[k++]] = 'bolido';
  const hayRaro = rnd() < C.RARO_PROB; // siempre se sortea (el flujo del azar no depende de la misión)
  if (numero >= 2) {
    v[orden[k++]] = 'gigante'; v[orden[k++]] = 'oscilante';
    if (numero >= 4 && k < n) v[orden[k++]] = 'oscilante';
    if (hayRaro && k < n) v[orden[k++]] = 'raro';
  }
  return v;
}

// Genera los cuerpos de una misión. `seguro`: disposición de reserva (cuerpos lejos del centro y alejándose de él).
function candidatos(rnd, prog, destino, seguro, tema, numero, vel = 1, ventana = 1) {
  const cat = CATALOGO_CUERPOS[destino], raros = RAROS_CUERPOS[destino], n = prog.cuerpos;
  const variantes = repartirVariantes(rnd, n, numero);
  // Diagonales: lados repartidos casi a la mitad y, dentro de cada lado, tramos distintos de |vx| (así nunca se repiten).
  const lados = Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1)).sort(() => rnd() - 0.5);
  const xc = Array.from({ length: n }, () => (seguro ? 0 : (rnd() * 2 - 1) * C.XMAX));
  if (seguro) for (let i = 0; i < n; i++) { xc[i] = (i % 2 ? 1 : -1) * (3 + rnd() * 0.4); lados[i] = Math.sign(xc[i]); }
  const vx = new Array(n);
  for (const lado of [-1, 1]) {
    const idx = [...Array(n).keys()].filter(i => lados[i] === lado).sort(() => rnd() - 0.5), m = idx.length, tramo = (prog.vxMax - C.VX_MIN) / Math.max(1, m);
    idx.forEach((i, j) => { vx[i] = lado * (C.VX_MIN + (j + 0.5 + (rnd() - 0.5) * 0.4) * tramo); });
  }
  const gapMin = Math.max(C.GAP_MIN, tema.ventana * ventana + C.MARGEN_GAP_VENTANA); // las ventanas de foto nunca se pisan
  const cuerpos = [];
  let tc = 0;
  for (let i = 0; i < n; i++) {
    const variante = variantes[i], esRaro = variante === 'raro';
    const tipo = esRaro ? raros[Math.floor(rnd() * raros.length)] : cat[Math.floor(rnd() * cat.length)];
    const factorVy = variante === 'bolido' ? C.BOLIDO_VEL : variante === 'gigante' ? C.GIGANTE_VEL : 1;
    const factorR = variante === 'bolido' ? C.BOLIDO_RADIO : variante === 'gigante' ? C.GIGANTE_RADIO : 1;
    const vy = prog.vy * tema.vel * vel * factorVy * (0.88 + rnd() * 0.24), radio = (C.RADIO_MIN + rnd() * (C.RADIO_MAX - C.RADIO_MIN)) * factorR;
    tc = i === 0 ? C.Y_APARICION / vy + 0.5 : tc + Math.max(gapMin, prog.gap * tema.gap * (0.9 + rnd() * 0.4));
    const osc = variante === 'oscilante'
      ? { amp: seguro ? C.OSC_AMP_MIN * 0.8 : C.OSC_AMP_MIN + rnd() * (C.OSC_AMP_MAX - C.OSC_AMP_MIN), periodo: C.OSC_PERIODO_MIN + rnd() * (C.OSC_PERIODO_MAX - C.OSC_PERIODO_MIN), fase: rnd() * 6.28 }
      : null;
    cuerpos.push({
      id: i, ...tipo, variante, radio, rcol: radio * C.FACTOR_COLISION, tc, xc: xc[i], vx: vx[i], vy, ...(osc ? { osc } : {}),
      rot0: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], w: [0, 0, 0].map(() => (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 1.6)),
      forma: Math.floor(rnd() * 1000), foto: false, pasado: false, cerca: Infinity, poco: false, revisado: false
    });
  }
  return cuerpos;
}

// ¿Hay una ruta de esquive? Búsqueda por tiempos y posiciones sobre las trayectorias REALES (`posicionCuerpo`, con el vaivén del oscilante y los
// radios de bólidos y gigantes); la sonda va al 75 % de su velocidad y con margen extra en los radios.
// Devuelve true si, empezando en x = 0, existe una forma de llegar al final sin tocar ningún cuerpo.
export function existeRuta(cuerpos) {
  const dt = C.RUTA_DT, celda = C.VEL_X * C.RUTA_FACTOR_VEL * dt, K = Math.floor((2 * C.XMAX) / celda), cero = Math.round(C.XMAX / celda);
  let vivo = new Uint8Array(K + 1); vivo[cero] = 1;
  const fin = Math.max(...cuerpos.map(c => c.tc)) + 1.5;
  for (let j = 0; j * dt <= fin; j++) {
    const t = j * dt, sig = new Uint8Array(K + 1);
    for (let k = 0; k <= K; k++) if (vivo[k] || vivo[k - 1] || vivo[k + 1]) sig[k] = 1;
    for (const c of cuerpos) {
      const p = posicionCuerpo(c, t), lim = C.RADIO_SONDA + c.rcol + C.RUTA_MARGEN;
      if (Math.abs(p.y) > lim) continue;
      const dx = Math.sqrt(lim * lim - p.y * p.y);
      for (let k = 0; k <= K; k++) if (Math.abs(-C.XMAX + k * celda - p.x) < dx) sig[k] = 0;
    }
    vivo = sig;
    if (!vivo.some(Boolean)) return false;
  }
  return true;
}

// Cuerpos de la misión `numero` (misma semilla y número = mismos cuerpos). Siempre hay ruta de esquive: se reintenta con otro azar y, como
// último recurso, se usa la disposición segura (también comprobada).
export function generarCuerpos(destino, numero, semilla, { vel = 1, ventana = 1 } = {}) {
  const prog = progresion(numero), tema = temaMision(numero, destino), rnd = azar((semilla * 7919 + numero * 104729 + (destino === 'jupiter' ? 2027 : 1969)) | 0);
  for (let intento = 0; intento < 60; intento++) {
    const cuerpos = candidatos(rnd, prog, destino, false, tema, numero, vel, ventana);
    if (existeRuta(cuerpos)) return cuerpos;
  }
  return candidatos(rnd, prog, destino, true, tema, numero, vel, ventana);
}

// ---------- Puntos, calidad, estrellas y récord (todo puro) ----------
// Calidad según la fracción de la ventana que ya se gastó al disparar (0 = justo al abrirse, 1 = al cerrarse).
export function calidadFoto(fraccionGastada) {
  const f = acotar(fraccionGastada, 0, 1);
  return (C.CALIDADES.find(q => f <= q.hasta) || C.CALIDADES[C.CALIDADES.length - 1]).id;
}
export const puntosBase = calidad => (C.CALIDADES.find(q => q.id === calidad) || C.CALIDADES[C.CALIDADES.length - 1]).pts;
// Puntos de una foto: base × combo × (raro ×2) × factor del tema. Una JUSTA puntúa a ×1 (y deja el combo en ×1).
export function puntosFoto(calidad, combo, raro, tema) {
  const mult = calidad === 'JUSTA' ? 1 : acotar(combo, 1, C.COMBO_MAX);
  return { mult, pts: Math.round(puntosBase(calidad) * mult * (raro ? C.RARO_FACTOR : 1) * (tema?.puntos ?? 1)) };
}
// Combo que queda tras una foto: PERFECTA o BUENA lo suben (con tope); una JUSTA lo regresa a ×1.
export const comboTras = (calidad, combo) => (calidad === 'JUSTA' ? 1 : Math.min(C.COMBO_MAX, combo + 1));
// Máximo de puntos posible en una misión: todas PERFECTAS con el combo en su tope más rápido (sin contar los «¡Por poco!»).
export function puntosMaximos(cuerpos, tema) {
  const orden = [...cuerpos].sort((a, b) => a.tc - b.tc);
  return orden.reduce((suma, c, i) => suma + puntosFoto('PERFECTA', i + 1, c.variante === 'raro', tema).pts, 0);
}
// Estrellas (1 a 3) por puntos sobre el máximo posible.
export function estrellasMision(puntos, maximo) {
  const f = maximo > 0 ? puntos / maximo : 0;
  return f >= C.ESTRELLAS_3 ? 3 : f >= C.ESTRELLAS_2 ? 2 : 1;
}
// Récord de la etapa: compara sin tocar localStorage. `nuevo` solo si había un récord previo y se le ganó.
export function compararRecord(puntos, previo) {
  const p = Number.isFinite(previo) && previo > 0 ? previo : 0;
  return { record: Math.max(p, puntos), nuevo: p > 0 && puntos > p };
}

// ---------- Estado ----------
// opciones: { semilla }. Fases: cinematica, ficha, tema, jugando (con `ventana` abierta o no), pausa, fallo, exito_mision, cerrable, omitida.
// La dificultad (B11) ajusta la velocidad de caída y el margen de la ventana fotográfica.
export function crearInsercion(estado, mision, { semilla, diseno } = {}) {
  const destino = destinoDe(mision), sem = semilla ?? Math.floor(Math.random() * 2 ** 31), aj = ajusteMinijuego(mision);
  return {
    fase: 'cinematica', faseAntes: null, sonda: sondaInsercion(diseno, mision), misionId: mision?.id === 'juno' ? 'juno' : 'lro', destino, semilla: sem, escenario: ESCENARIOS_LLEGADA[mision?.id] || 'insercion',
    ajVel: aj.velocidad, ajVentana: aj.tolerancia,
    tCin: 0, numero: 1, intento: 1, t: 0, x: 0, eje: 0, cuerpos: generarCuerpos(destino, 1, sem, { vel: aj.velocidad, ventana: aj.tolerancia }), ventana: null, espacioAbajo: false, sinObjetivo: 0,
    fotos: [], fotosMision: 0, cumplidas: 0, fallos: 0, motivo: null, tEspera: 0, ultimaFoto: null,
    tema: temaMision(1, destino), tTema: 0,
    puntos: 0, puntosTotal: 0, combo: 1, mejorCombo: 1, porPoco: 0, perdidos: 0, estrellasHist: [], resumen: null, eventos: [], evSeq: 0,
    bateriaNave: estado?.bateria ?? 0, bateriaNaveMax: estado?.bateriaMax ?? 0, registro: []
  };
}

// Precisión de la inserción: lo de los fallos (mínimo 0,3) por un factor que sube con las estrellas promedio; recortada a 1.
// Sin dato de estrellas se asume el mejor caso (3), así que no castiga a quien llama solo con los fallos.
export const precisionInsercion = (fallos, estrellasProm = 3) =>
  Math.min(1, Math.max(C.PRECISION_MIN, 1 - C.PRECISION_POR_FALLO * fallos) * (C.PRECISION_ESTRELLAS_BASE + C.PRECISION_POR_ESTRELLA * estrellasProm));
export const estrellasPromedio = s => (s.estrellasHist?.length ? s.estrellasHist.reduce((a, b) => a + b, 0) / s.estrellasHist.length : C.ESTRELLAS_SIN_DATO);
export const puedeCerrar = s => s.cumplidas >= C.MISIONES_PARA_CERRAR;
// Cuántos cuerpos faltan por superar (esquivar y fotografiar) en la misión actual.
export const cuerposPorSuperar = s => s.cuerpos.filter(c => !c.foto).length;

// Agrega un evento para la escena (texto flotante); los ids crecen siempre (también entre misiones).
const evento = (s, e) => ({ eventos: [...(s.eventos || []), { id: (s.evSeq || 0) + 1, ...e }].slice(-C.EVENTOS_MAX), evSeq: (s.evSeq || 0) + 1 });
// Un fallo (choque o foto perdida) cuesta los puntos de la misión en curso; los de misiones cumplidas se conservan.
const falla = (s, motivo, texto) => ({ ...s, fase: 'fallo', ventana: null, motivo: { tipo: motivo, texto: tr('e06.falla', { n: s.numero, texto }) }, fallos: s.fallos + 1, perdidos: s.puntos, puntos: 0, combo: 1 });
const nuevaMision = (s, numero, intento, conTarjeta = false) => ({
  ...s, fase: conTarjeta ? 'tema' : 'jugando', tTema: 0, numero, intento, t: 0, eje: 0, tema: temaMision(numero, s.destino), cuerpos: generarCuerpos(s.destino, numero, s.semilla, { vel: s.ajVel ?? 1, ventana: s.ajVentana ?? 1 }), ventana: null,
  fotosMision: 0, motivo: null, tEspera: 0, espacioAbajo: false, puntos: 0, combo: 1, mejorCombo: 1, porPoco: 0, perdidos: 0, resumen: null
});

// ¿El cuerpo pasó cerca (a menos de radios + margen) sin chocar y aún no se le dio el «¡Por poco!»?
const pasoCerca = c => !c.revisado && (c.cerca ?? Infinity) < C.RADIO_SONDA + c.rcol + C.POR_POCO_MARGEN;

// Avance de la partida: un trozo de `dt` segundos con la sonda moviéndose al `eje` (−1..1).
function avanzar(s, dt, eje) {
  const pasos = Math.max(1, Math.ceil(dt / C.PASO_MAX_S)), h = dt / pasos, e = acotar(eje || 0, -1, 1), ventanaS = (s.tema?.ventana ?? C.VENTANA_FOTO_S) * (s.ajVentana ?? 1);
  let x = s.x, t = s.t, ventana = s.ventana, puntos = s.puntos, porPoco = s.porPoco, avisos = { eventos: s.eventos, evSeq: s.evSeq };
  const cuerpos = s.cuerpos.map(c => ({ ...c }));
  for (let i = 0; i < pasos; i++) {
    x = acotar(x + e * C.VEL_X * h, -C.XMAX, C.XMAX); t += h;
    if (ventana) {
      ventana = { ...ventana, restante: ventana.restante - h };
      if (ventana.restante <= 0) {
        const c = cuerpos[ventana.idx];
        return falla({ ...s, x, t, eje: e, cuerpos, puntos }, 'foto', tr('e06.falla.foto', { cuerpo: textoCuerpo(c, 'nombre') }));
      }
    }
    for (const c of cuerpos) {
      const p = posicionCuerpo(c, t), d = Math.hypot(p.x - x, p.y), contacto = C.RADIO_SONDA + c.rcol;
      if (d < contacto) return falla({ ...s, x, t, eje: e, cuerpos, puntos }, 'choque', tr('e06.falla.choque', { cuerpo: textoCuerpo(c, 'nombre') }));
      if (d < (c.cerca ?? Infinity)) c.cerca = d;
      if (!c.pasado && p.y <= 0) { c.pasado = true; ventana = { idx: c.id, restante: ventanaS, total: ventanaS }; }
      // «¡Por poco!»: el cuerpo ya quedó atrás (no puede volver a acercarse) y en algún momento pasó a menos de (radios + margen).
      if (!c.revisado && c.pasado && p.y < -(contacto + C.POR_POCO_MARGEN)) {
        if (pasoCerca(c)) { c.poco = true; puntos += C.POR_POCO_PTS; porPoco += 1; avisos = evento(avisos, { tipo: 'poco', texto: tr('e06.por_poco', { pts: C.POR_POCO_PTS }), x, y: 0, pts: C.POR_POCO_PTS }); }
        c.revisado = true;
      }
    }
  }
  return { ...s, x, t, eje: e, cuerpos, ventana, puntos, porPoco, ...avisos };
}

function tomarFoto(s) {
  if (!s.ventana) return { ...s, sinObjetivo: s.sinObjetivo + 1 };
  const c = s.cuerpos[s.ventana.idx], total = s.ventana.total ?? C.VENTANA_FOTO_S, calidad = calidadFoto(1 - s.ventana.restante / total);
  const raro = c.variante === 'raro', { mult, pts } = puntosFoto(calidad, s.combo, raro, s.tema), combo = comboTras(calidad, s.combo);
  let cuerpos = s.cuerpos.map(k => (k.id === c.id ? { ...k, foto: true } : k));
  const ficha = { n: s.fotos.length + 1, mision: s.numero, intento: s.intento, nombre: textoCuerpo(c, 'nombre'), clase: textoCuerpo(c, 'clase'), color: c.color, calidad, pts, mult, raro, dato: raro ? (c.dato ? textoCuerpo(c, 'dato') : null) : null };
  const texto = `${tr(`e06.calidad.${calidad}`)}${mult > 1 ? ` ×${mult}` : ''} +${pts}${raro ? tr('e06.raro_sufijo') : ''}`;
  let n = { ...s, ventana: null, fotos: [...s.fotos, ficha], fotosMision: s.fotosMision + 1, ultimaFoto: ficha, puntos: s.puntos + pts, combo, mejorCombo: Math.max(s.mejorCombo, mult), ...evento(s, { tipo: 'foto', texto, x: s.x, y: 0, calidad, pts, mult, raro, combo }) };
  if (cuerpos.every(k => k.foto)) {
    // Al cerrar la misión se cuentan también los «¡Por poco!» pendientes (cuerpos que aún no habían quedado atrás).
    for (const k of cuerpos) if (pasoCerca(k)) n = { ...n, puntos: n.puntos + C.POR_POCO_PTS, porPoco: n.porPoco + 1, ...evento(n, { tipo: 'poco', texto: tr('e06.por_poco', { pts: C.POR_POCO_PTS }), x: s.x, y: 0, pts: C.POR_POCO_PTS }) };
    cuerpos = cuerpos.map(k => (pasoCerca(k) ? { ...k, poco: true, revisado: true } : k));
    const maximo = puntosMaximos(cuerpos, s.tema), estrellas = estrellasMision(n.puntos, maximo), fichas = n.fotos.filter(f => f.mision === s.numero && f.intento === s.intento);
    const resumen = { numero: s.numero, puntos: n.puntos, maximo, estrellas, mejorCombo: n.mejorCombo, porPoco: n.porPoco, fotos: fichas, raro: fichas.find(f => f.dato) || null };
    return { ...n, cuerpos, fase: 'exito_mision', cumplidas: s.cumplidas + 1, tEspera: 0, puntosTotal: s.puntosTotal + n.puntos, estrellasHist: [...s.estrellasHist, estrellas], resumen,
      registro: [...s.registro, tr('e06.reg.cumplida', { n: s.numero, fotos: n.fotosMision, puntos: n.puntos, estrellas, e: estrellas === 1 ? tr('e06.estrella') : tr('e06.estrellas') })] };
  }
  return { ...n, cuerpos };
}

// Acciones: cinematica_saltar, empezar, siguiente, tiempo {dt, eje}, foto {abajo}, reintentar, continuar, pausar, reanudar, saltar.
// `foto` cuenta solo en el flanco de bajada: con `abajo: true` repetido (tecla mantenida) no vuelve a disparar hasta un `abajo: false`.
export function pasoInsercion(s, a) {
  switch (a.tipo) {
    case 'cinematica_saltar': return s.fase === 'cinematica' ? { ...s, fase: 'ficha' } : s;
    case 'empezar': return s.fase === 'ficha' ? { ...s, fase: 'tema', tTema: 0 } : s.fase === 'tema' ? { ...s, fase: 'jugando' } : s;
    case 'siguiente': return s.fase === 'exito_mision' && !puedeCerrar(s) ? nuevaMision(s, s.numero + 1, 1, true) : s;
    case 'saltar': return ['cinematica', 'ficha'].includes(s.fase) ? { ...s, fase: 'omitida', motivo: { tipo: 'omitida', texto: a.motivo || tr('e06.omitida') } } : s;
    case 'pausar': return s.fase === 'jugando' ? { ...s, fase: 'pausa', faseAntes: 'jugando', espacioAbajo: false, eje: 0 } : s;
    case 'reanudar': return s.fase === 'pausa' ? { ...s, fase: s.faseAntes || 'jugando', faseAntes: null, espacioAbajo: false } : s;
    case 'foto': {
      if (a.abajo === false) return s.espacioAbajo ? { ...s, espacioAbajo: false } : s;
      if (s.espacioAbajo) return s; // tecla mantenida: no repite
      if (s.fase !== 'jugando') return s;
      return { ...tomarFoto(s), espacioAbajo: true };
    }
    case 'tiempo': {
      const dt = acotar(a.dt || 0, 0, 0.1);
      if (s.fase === 'cinematica') { const tCin = s.tCin + dt; return tCin >= C.DURACION_CINEMATICA_S ? { ...s, tCin, fase: 'ficha' } : { ...s, tCin }; }
      if (s.fase === 'tema') { const tTema = s.tTema + dt; return tTema >= C.TEMA_DURACION_S ? { ...s, tTema, fase: 'jugando' } : { ...s, tTema }; }
      if (s.fase === 'jugando') return dt > 0 ? avanzar(s, dt, a.eje) : s;
      if (s.fase === 'exito_mision') {
        const tEspera = s.tEspera + dt;
        // Tras la 3.ª misión cumplida la etapa termina: se queda en la tarjeta con «Continuar a la 07».
        if (puedeCerrar(s)) return { ...s, tEspera: Math.min(tEspera, C.ESPERA_SIGUIENTE_S) };
        return tEspera >= C.ESPERA_SIGUIENTE_S ? nuevaMision(s, s.numero + 1, 1, true) : { ...s, tEspera };
      }
      return s;
    }
    case 'reintentar': {
      if (s.fase !== 'fallo') return s;
      const costo = s.bateriaNaveMax * C.COSTO_REINTENTO;
      return { ...nuevaMision(s, s.numero, s.intento + 1), x: 0, bateriaNave: Math.max(0, s.bateriaNave - costo), registro: [...s.registro, tr('e06.reg.reintento', { n: s.numero })] };
    }
    case 'continuar':
      return puedeCerrar(s) && ['tema', 'jugando', 'pausa', 'exito_mision', 'fallo'].includes(s.fase) ? { ...s, fase: 'cerrable', ventana: null } : s;
    default: return s;
  }
}

// Vuelca el resultado en el estado de la misión (idempotente: una segunda llamada no cambia nada).
export function aplicarInsercion06(e, s) {
  if (e.insercionCompletada) return e;
  const real = datosLlegada(s.misionId);
  if (s.fase === 'cerrable') {
    const estrellas = estrellasPromedio(s), precision = precisionInsercion(s.fallos, estrellas), puntos = s.puntosTotal ?? 0;
    const texto = tr('e06.informe', { cuerpo: real.cuerpo, maniobra: real.maniobra, cumplidas: s.cumplidas, fotos: s.fotos.length, puntos, estrellas: estrellas.toFixed(1).replace('.', ','), fallos: s.fallos, veces: s.fallos === 1 ? tr('e06.vez') : tr('e06.veces') });
    return { ...e, bateria: s.bateriaNave, insercionCompletada: true, precisionInsercion: precision, fotosOrbitales: s.fotos.length, puntosInsercion: puntos, estrellasInsercion: Math.round(estrellas * 100) / 100, decisiones: [...e.decisiones, { tipo: s.fallos ? 'info' : 'bien', texto }] };
  }
  if (s.fase === 'omitida') return { ...e, insercionCompletada: true, fotosOrbitales: 0, puntosInsercion: 0, estrellasInsercion: 0, decisiones: [...e.decisiones, { tipo: 'info', texto: tr('e06.informe_omitida', { motivo: s.motivo?.texto || tr('e06.sin3d') }) }] };
  return e;
}

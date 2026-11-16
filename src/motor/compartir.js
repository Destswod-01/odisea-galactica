// Motor de compartir diseño y tabla de clasificación local (B8). Funciones puras y almacenamiento local seguro.
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';

const MISIONES = { lro, juno };
const IDS_COHETES = new Set(cohetes.map((c) => c.id));
const IDS_PIEZAS_POR_CAT = piezas.reduce((acc, p) => {
  if (!acc[p.categoria]) acc[p.categoria] = new Set();
  acc[p.categoria].add(p.id);
  return acc;
}, {});

const INSTRUMENTOS_INFO = piezas.reduce((acc, p) => {
  if (p.categoria === 'instrumento') {
    acc[p.id] = p.mision || null;
  }
  return acc;
}, {});

const ORBITAS_POR_MISION = {
  lro: new Set((lro.orbitas || []).map((o) => o.id)),
  juno: new Set((juno.orbitas || []).map((o) => o.id)),
};

export const CLAVE_CLASIFICACION = 'orbita2-clasificacion';
export const MAX_CLASIFICACION = 10;

/** Codifica una cadena a base64url (- en vez de +, _ en vez de /, sin padding =). */
function aBase64Url(cadena) {
  let b64 = '';
  const buf = typeof globalThis !== 'undefined' ? globalThis.Buffer : undefined;
  if (buf) {
    b64 = buf.from(cadena, 'utf8').toString('base64');
  } else {
    const bytes = new TextEncoder().encode(cadena);
    let binario = '';
    for (let i = 0; i < bytes.length; i++) {
      binario += String.fromCharCode(bytes[i]);
    }
    b64 = btoa(binario);
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decodifica una cadena base64url. Devuelve null si viene dañada. */
function deBase64Url(b64url) {
  if (typeof b64url !== 'string') return null;
  const limpio = b64url.trim();
  if (!limpio || !/^[A-Za-z0-9_-]+$/.test(limpio)) return null;

  let b64 = limpio.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }

  try {
    const buf = typeof globalThis !== 'undefined' ? globalThis.Buffer : undefined;
    if (buf) {
      return buf.from(b64, 'base64').toString('utf8');
    }
    const binario = atob(b64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) {
      bytes[i] = binario.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Valida una pieza individual por categoría. null/undefined se consideran válidos (pieza aún no elegida). */
const validarPieza = (cat, valor) => {
  if (valor === null || valor === undefined) return true;
  return typeof valor === 'string' && IDS_PIEZAS_POR_CAT[cat]?.has(valor);
};

/**
 * Codifica el diseño y la misión en un token corto base64url.
 * Valida previamente las piezas para asegurar que la entrada no esté corrupta.
 */
export function codificarDiseno(misionId, diseno) {
  if (!misionId || typeof misionId !== 'string' || !MISIONES[misionId]) return null;
  if (!diseno || typeof diseno !== 'object') return null;

  if (!validarPieza('energia', diseno.energia)) return null;
  if (!validarPieza('antena', diseno.antena)) return null;
  if (!validarPieza('blindaje', diseno.blindaje)) return null;
  if (!validarPieza('propulsion', diseno.propulsion)) return null;
  if (!validarPieza('bateria', diseno.bateria)) return null;
  if (!validarPieza('computadora', diseno.computadora)) return null;
  if (!validarPieza('orientacion', diseno.orientacion)) return null;

  if (diseno.cohete !== null && diseno.cohete !== undefined) {
    if (typeof diseno.cohete !== 'string' || !IDS_COHETES.has(diseno.cohete)) return null;
  }

  let instrumentos = [];
  if (diseno.instrumentos !== null && diseno.instrumentos !== undefined) {
    if (!Array.isArray(diseno.instrumentos)) return null;
    const vistos = new Set();
    for (const id of diseno.instrumentos) {
      if (typeof id !== 'string' || !INSTRUMENTOS_INFO[id]) return null;
      if (INSTRUMENTOS_INFO[id] && INSTRUMENTOS_INFO[id] !== misionId) return null;
      if (vistos.has(id)) return null;
      vistos.add(id);
    }
    instrumentos = [...diseno.instrumentos];
  }

  if (diseno.orbita !== null && diseno.orbita !== undefined) {
    if (typeof diseno.orbita !== 'string' || !ORBITAS_POR_MISION[misionId]?.has(diseno.orbita)) return null;
  }

  if (diseno.drones !== null && diseno.drones !== undefined) {
    if (typeof diseno.drones === 'number') {
      if (!Number.isInteger(diseno.drones) || diseno.drones < 0 || diseno.drones > 4) return null;
    } else if (Array.isArray(diseno.drones)) {
      if (diseno.drones.length > 4) return null;
    } else {
      return null;
    }
  }

  const payload = {
    v: 1,
    m: misionId,
    en: diseno.energia ?? null,
    an: diseno.antena ?? null,
    bl: diseno.blindaje ?? null,
    pr: diseno.propulsion ?? null,
    co: diseno.cohete ?? null,
    ins: instrumentos,
    ba: diseno.bateria ?? null,
    cp: diseno.computadora ?? null,
    or: diseno.orientacion ?? null,
  };
  if (diseno.orbita) payload.ob = diseno.orbita;
  if (diseno.drones !== undefined && diseno.drones !== null) payload.dr = diseno.drones;

  try {
    return aBase64Url(JSON.stringify(payload));
  } catch {
    return null;
  }
}

/**
 * Decodifica un token base64url a { misionId, diseno }.
 * Devuelve null si el token viene corrupto, con tipos inválidos o con piezas desconocidas.
 */
export function decodificarDiseno(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return null;

  const jsonStr = deBase64Url(texto);
  if (!jsonStr) return null;

  let datos;
  try {
    datos = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  if (!datos || typeof datos !== 'object') return null;

  let misionId = null;
  let rawDiseno = {};

  if (Array.isArray(datos)) {
    if (datos.length < 2) return null;
    if (typeof datos[0] === 'string' && MISIONES[datos[0]]) {
      misionId = datos[0];
      rawDiseno = {
        energia: datos[1], antena: datos[2], blindaje: datos[3], propulsion: datos[4],
        cohete: datos[5], instrumentos: datos[6], bateria: datos[7], computadora: datos[8],
        orientacion: datos[9], orbita: datos[10], drones: datos[11],
      };
    } else if (typeof datos[1] === 'string' && MISIONES[datos[1]]) {
      misionId = datos[1];
      rawDiseno = {
        energia: datos[2], antena: datos[3], blindaje: datos[4], propulsion: datos[5],
        cohete: datos[6], instrumentos: datos[7], bateria: datos[8], computadora: datos[9],
        orientacion: datos[10], orbita: datos[11], drones: datos[12],
      };
    } else {
      return null;
    }
  } else {
    misionId = datos.m || datos.misionId || datos.mision;
    if (datos.d && typeof datos.d === 'object') {
      rawDiseno = datos.d;
    } else {
      rawDiseno = datos;
    }
  }

  if (typeof misionId !== 'string' || !MISIONES[misionId]) return null;

  const getField = (minKey, fullKey) => {
    if (rawDiseno[minKey] !== undefined) return rawDiseno[minKey];
    if (rawDiseno[fullKey] !== undefined) return rawDiseno[fullKey];
    if (datos[minKey] !== undefined) return datos[minKey];
    if (datos[fullKey] !== undefined) return datos[fullKey];
    return null;
  };

  const energia = getField('en', 'energia');
  const antena = getField('an', 'antena');
  const blindaje = getField('bl', 'blindaje');
  const propulsion = getField('pr', 'propulsion');
  const cohete = getField('co', 'cohete');
  const bateria = getField('ba', 'bateria');
  const computadora = getField('cp', 'computadora');
  const orientacion = getField('or', 'orientacion');
  const orbita = getField('ob', 'orbita');
  const drones = getField('dr', 'drones');
  const rawIns = getField('ins', 'instrumentos');

  if (!validarPieza('energia', energia)) return null;
  if (!validarPieza('antena', antena)) return null;
  if (!validarPieza('blindaje', blindaje)) return null;
  if (!validarPieza('propulsion', propulsion)) return null;
  if (!validarPieza('bateria', bateria)) return null;
  if (!validarPieza('computadora', computadora)) return null;
  if (!validarPieza('orientacion', orientacion)) return null;

  if (cohete !== null && cohete !== undefined) {
    if (typeof cohete !== 'string' || !IDS_COHETES.has(cohete)) return null;
  }

  let instrumentos = [];
  if (rawIns !== null && rawIns !== undefined) {
    if (!Array.isArray(rawIns)) return null;
    const vistos = new Set();
    for (const id of rawIns) {
      if (typeof id !== 'string' || !INSTRUMENTOS_INFO[id]) return null;
      if (INSTRUMENTOS_INFO[id] && INSTRUMENTOS_INFO[id] !== misionId) return null;
      if (vistos.has(id)) return null;
      vistos.add(id);
    }
    instrumentos = [...rawIns];
  }

  if (orbita !== null && orbita !== undefined) {
    if (typeof orbita !== 'string' || !ORBITAS_POR_MISION[misionId]?.has(orbita)) return null;
  }

  if (drones !== null && drones !== undefined) {
    if (typeof drones === 'number') {
      if (!Number.isInteger(drones) || drones < 0 || drones > 4) return null;
    } else if (Array.isArray(drones)) {
      if (drones.length > 4) return null;
    } else {
      return null;
    }
  }

  const diseno = {
    energia: energia ?? null,
    antena: antena ?? null,
    blindaje: blindaje ?? null,
    propulsion: propulsion ?? null,
    cohete: cohete ?? null,
    instrumentos,
    bateria: bateria ?? null,
    computadora: computadora ?? null,
    orientacion: orientacion ?? null,
  };
  if (orbita !== null && orbita !== undefined) diseno.orbita = orbita;
  if (drones !== null && drones !== undefined) diseno.drones = drones;

  return { misionId, diseno };
}

// ---------- Clasificación local ----------

function leerTodo() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return {};
    const raw = localStorage.getItem(CLAVE_CLASIFICACION);
    if (!raw) return {};
    const datos = JSON.parse(raw);
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  } catch {
    return {};
  }
}

function escribirTodo(todo) {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return;
    localStorage.setItem(CLAVE_CLASIFICACION, JSON.stringify(todo));
  } catch {
    /* sin almacenamiento */
  }
}

/** Devuelve los 10 mejores puntajes para la misión dada, ordenados desc por puntaje. */
export function leerClasificacion(misionId) {
  if (!misionId || typeof misionId !== 'string') return [];
  const todo = leerTodo();
  const lista = todo[misionId];
  if (!Array.isArray(lista)) return [];
  return [...lista]
    .filter((e) => e && typeof e === 'object' && typeof e.puntaje === 'number')
    .sort((a, b) => b.puntaje - a.puntaje || (b.fecha || 0) - (a.fecha || 0))
    .slice(0, MAX_CLASIFICACION);
}

/**
 * Registra un resultado en la tabla de clasificación local.
 * Sanitiza y recorta el nombre a máx. 18 caracteres (o 'Comandante' si viene vacío).
 * Mantiene como máximo los 10 mejores puntajes por misión.
 */
export function registrarResultado({ misionId, puntaje, nombre, fecha = Date.now() }) {
  if (!misionId || typeof misionId !== 'string') return [];

  const nombreLimpio = (typeof nombre === 'string' && nombre.trim().length > 0)
    ? nombre.trim().slice(0, 18)
    : 'Comandante';

  const puntajeNum = Math.round(Number(puntaje) || 0);
  const fechaNum = Number(fecha) || Date.now();

  const entrada = {
    nombre: nombreLimpio,
    puntaje: puntajeNum,
    fecha: fechaNum,
    misionId,
  };

  const todo = leerTodo();
  const previa = Array.isArray(todo[misionId]) ? todo[misionId] : [];
  const nuevaLista = [...previa, entrada]
    .filter((e) => e && typeof e === 'object' && typeof e.puntaje === 'number')
    .sort((a, b) => b.puntaje - a.puntaje || (b.fecha || 0) - (a.fecha || 0))
    .slice(0, MAX_CLASIFICACION);

  todo[misionId] = nuevaLista;
  escribirTodo(todo);

  return nuevaLista;
}

/** Limpia la clasificación de una misión (o de todas si misionId es falsy). */
export function borrarClasificacion(misionId) {
  if (!misionId) {
    escribirTodo({});
    return;
  }
  const todo = leerTodo();
  delete todo[misionId];
  escribirTodo(todo);
}

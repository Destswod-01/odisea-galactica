// Cliente de salas (modo equipo en red). Habla con servidor/sala.mjs por WebSocket.
//
// Un solo almacén para toda la app (como el idioma): useSala() devuelve
//   { estado: 'libre'|'conectando'|'en_sala'|'error', sala, miId, error }
// y las acciones crear(nombre), unirse(codigo, nombre), enviar(mensaje), salir().
// Si se recarga la página, se reconecta solo a la misma sala (sessionStorage).
import { useSyncExternalStore } from 'react';

const CLAVE = 'odisea-sala';
let ws = null;
let actual = { estado: 'libre', sala: null, miId: null, error: null };
let intentos = 0;
let reintento = null;
let pendiente = null; // mensaje a enviar en cuanto abra la conexión
const oyentes = new Set();
const oyentesEspejo = new Set(); // instantáneas del piloto (ver espejo.js)
const oyentesVoto08 = new Set(); // votos de la etapa 08 en equipo (ver votos08.js)

const fijar = (cambios) => { actual = { ...actual, ...cambios }; oyentes.forEach((f) => f()); };

export function urlSala() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/orbita-2/sala`;
}

const guardar = (v) => { try { if (v) sessionStorage.setItem(CLAVE, JSON.stringify(v)); else sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };
const leer = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch { return null; } };

function abrir(primerMensaje) {
  clearTimeout(reintento);
  pendiente = primerMensaje;
  if (ws && ws.readyState <= 1) { if (ws.readyState === 1) { ws.send(JSON.stringify(pendiente)); pendiente = null; } return; }
  fijar({ estado: actual.sala ? actual.estado : 'conectando', error: null });
  try { ws = new WebSocket(urlSala()); } catch { fijar({ estado: 'error', error: 'sin_conexion' }); return; }
  const conexion = ws;
  ws.onopen = () => { if (ws !== conexion) return; intentos = 0; if (pendiente) { ws.send(JSON.stringify(pendiente)); pendiente = null; } };
  ws.onmessage = (e) => {
    if (ws !== conexion) return;
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.t === 'hola') { guardar({ codigo: m.codigo, id: m.id }); fijar({ miId: m.id }); }
    else if (m.t === 'espejo') oyentesEspejo.forEach((f) => f(m));
    else if (m.t === 'voto08') oyentesVoto08.forEach((f) => f(m));
    else if (m.t === 'sala') fijar({ estado: 'en_sala', sala: m.sala, error: null });
    else if (m.t === 'cerrada') { salirSala(); fijar({ error: 'sala_cerrada' }); }
    else if (m.t === 'error') {
      if (m.motivo === 'no_existe' && leer()) { salirSala(); fijar({ error: 'sala_cerrada' }); return; }
      fijar({ estado: actual.sala ? 'en_sala' : 'error', error: m.motivo });
    }
  };
  ws.onclose = () => {
    if (ws !== conexion) return;
    ws = null;
    const s = leer();
    if (s && actual.estado !== 'libre') {
      // Se cayó la conexión: reintenta con espera creciente (máx. 10 s) y conserva la sala en pantalla.
      intentos += 1;
      fijar({ error: 'reconectando' });
      reintento = setTimeout(() => abrir({ t: 'reconectar', codigo: s.codigo, id: s.id }), Math.min(10000, 500 * 2 ** intentos));
    } else if (actual.estado === 'conectando') fijar({ estado: 'error', error: 'sin_conexion' });
  };
  ws.onerror = () => {};
}

export const crearSala = (nombre) => abrir({ t: 'crear', nombre });
export const unirseSala = (codigo, nombre) => abrir({ t: 'unirse', codigo: String(codigo).toUpperCase().replace(/[^A-Z0-9]/g, ''), nombre });
export function enviar(mensaje) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(mensaje));
}
export function salirSala() {
  enviar({ t: 'salir' });
  guardar(null);
  clearTimeout(reintento);
  const anterior = ws;
  ws = null;
  pendiente = null;
  try { anterior?.close(); } catch { /* ya cerrada */ }
  fijar({ estado: 'libre', sala: null, miId: null, error: null });
}

// Al cargar la página: si había una sala abierta (recarga accidental), vuelve a entrar.
export function reanudarSala() {
  const s = leer();
  if (s && actual.estado === 'libre') { fijar({ estado: 'conectando', miId: s.id }); abrir({ t: 'reconectar', codigo: s.codigo, id: s.id }); }
}

const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
const foto = () => actual;

/** Suscribe a las instantáneas {t:'espejo', de, fase, s} que retransmite el servidor. Devuelve la función para cancelar. */
export function alEspejo(f) { oyentesEspejo.add(f); return () => oyentesEspejo.delete(f); }

/** Suscribe a los {t:'voto08', de, carta, opcion|avanzar} de la etapa 08. Devuelve la función para cancelar. */
export function alVoto08(f) { oyentesVoto08.add(f); return () => oyentesVoto08.delete(f); }

export function useSala() {
  return useSyncExternalStore(suscribir, foto, foto);
}

// ---------- Utilidades puras (con pruebas) ----------

// Qué rol controla cada parte de la nave (igual que las estaciones del modo equipo).
const ROL_DE_CLAVE = {
  cohete: 'direccion', orbita: 'direccion',
  propulsion: 'ingenieria', energia: 'ingenieria', bateria: 'ingenieria', computadora: 'ingenieria', orientacion: 'ingenieria',
  instrumentos: 'ciencia', blindaje: 'ciencia',
  antena: 'recursos', drones: 'ciencia', sondas: 'ciencia', // la bahía de drones vive en la estación Ciencia
};
export const rolDeClave = (clave) => ROL_DE_CLAVE[clave] ?? 'direccion';

/** Claves de la nave que cambiaron entre dos diseños. */
export function cambiosDiseno(antes = {}, despues = {}) {
  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);
  const out = {};
  for (const k of claves) if (JSON.stringify(antes[k] ?? null) !== JSON.stringify(despues[k] ?? null)) out[k] = despues[k] ?? null;
  return out;
}

/** Claves de `cambios` que este jugador NO puede tocar con sus roles. */
export const clavesAjenas = (cambios, misRoles = []) => Object.keys(cambios).filter((k) => !misRoles.includes(rolDeClave(k)));

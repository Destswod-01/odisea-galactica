// Punto de control de la partida en curso: la foto del juego al ENTRAR a cada fase.
// Sirve para no perder la misión si se recarga la página. Si no hay almacenamiento, el juego funciona igual.

export const CLAVE_PARTIDA = 'vdl-orbita2-partida';
const VERSION = 1;

const ETIQUETAS = {
  menu: 'Menú',
  briefing: 'Briefing',
  hangar: 'Etapa 01 · Hangar',
  lanzamiento: 'Etapa 02 · Lanzamiento',
  leop: 'Etapa 03 · Despliegue y enlace',
  crucero: 'Etapa 04 · Red de observación',
  llegada: 'Inserción orbital', // fuera de la campaña; se conserva por partidas guardadas antiguas
  encuentro: 'Etapa 05 · Aproximación y encuentro',
  insercion: 'Etapa 06 · Inserción orbital',
  operacion: 'Etapa 07 · Operación científica',
  extendida: 'Etapa 08 · Misión extendida',
  informe: 'Informe',
};
// El menú nunca se guarda: no es una fase de juego.
const FASES_VALIDAS = Object.keys(ETIQUETAS).filter(f => f !== 'menu');

export const etiquetaFase = fase => ETIQUETAS[fase] || 'Misión';

export function guardarPartida(p) {
  try { localStorage.setItem(CLAVE_PARTIDA, JSON.stringify({ ...p, v: VERSION, guardado: Date.now() })); } catch { /* sin almacenamiento */ }
}

export function leerPartida() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PARTIDA));
    if (!p || typeof p !== 'object' || p.v !== VERSION) return null;
    if (!p.misionId || !p.fase || !p.diseno || !FASES_VALIDAS.includes(p.fase)) return null;
    return p;
  } catch {
    return null;
  }
}

export function borrarPartida() {
  try { localStorage.removeItem(CLAVE_PARTIDA); } catch { /* sin almacenamiento */ }
}

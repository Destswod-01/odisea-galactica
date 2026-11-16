// Lógica pura de la guía de misión (Dra. Itzel Ramos e IO): roles, dificultad y preferencia de ocultar.
import { turnoDeEstacion } from './equipo.js';

export const CLAVE_SIN_CONSEJOS = 'odisea-sin-consejos';
export const EVENTO_CONSEJOS = 'odisea-consejos-cambio';

const ESTACION_POR_FASE = {
  briefing: 'orbita',
  hangar: 'cohete',
  revision: 'orbita',
  lanzamiento: 'cohete',
  separacion: 'cohete',
  leop: 'sistemas',
  crucero: 'instrumentos',
  llegada: 'orbita',
  encuentro: 'instrumentos',
  insercion: 'orbita',
  operacion: 'instrumentos',
  operacion_clasica: 'instrumentos',
  extendida: 'sistemas',
  informe: 'instrumentos',
};

// Cada página del tutorial del hangar asociada a los roles responsables, para priorizar en red los de cada jugador.
export const PAGINAS_HANGAR = [
  // Con el reparto equitativo: cohete = dirección; combustible = ingeniería y blindaje = ciencia; energía y sistemas = ingeniería.
  { num: 1, roles: ['direccion'] },
  { num: 2, roles: ['ingenieria', 'ciencia'] },
  { num: 3, roles: ['ingenieria'] },
  { num: 4, roles: ['ciencia', 'recursos'] },
  { num: 5, roles: ['direccion', 'recursos'] },
  { num: 6, roles: ['direccion', 'ingenieria', 'ciencia', 'recursos'] },
];

export const GUIAS = {
  hangar: { paginas: 6, estacion: 'cohete', entradaModal: true },
  lanzamiento: { paginas: 2, estacion: 'cohete', entradaModal: false },
  separacion: { paginas: 1, estacion: 'cohete', entradaModal: true },
  leop: { paginas: 1, estacion: 'sistemas', entradaModal: true },
  crucero: { paginas: 1, estacion: 'instrumentos', entradaModal: true },
  llegada: { paginas: 1, estacion: 'orbita', entradaModal: true },
  encuentro: { paginas: 1, estacion: 'instrumentos', entradaModal: true },
  insercion: { paginas: 1, estacion: 'orbita', entradaModal: true },
  operacion: { paginas: 1, estacion: 'instrumentos', entradaModal: true },
  operacion_clasica: { paginas: 1, estacion: 'instrumentos', entradaModal: true },
  extendida: { paginas: 1, estacion: 'sistemas', entradaModal: true },
};

export function leerSinConsejos() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(CLAVE_SIN_CONSEJOS) === '1';
  } catch {
    return false;
  }
}

export function guardarSinConsejos(ocultar) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (ocultar) localStorage.setItem(CLAVE_SIN_CONSEJOS, '1');
      else localStorage.removeItem(CLAVE_SIN_CONSEJOS);
    }
  } catch {
    /* sin almacenamiento */
  }
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(EVENTO_CONSEJOS, { detail: !!ocultar }));
  }
}

export function esModoProbar(search = typeof window !== 'undefined' ? window.location.search : '') {
  try {
    return new URLSearchParams(search).has('probar');
  } catch {
    return false;
  }
}

/**
 * Ordena las páginas de una fase para mostrar primero los consejos del rol del jugador en modo en línea.
 */
export function paginasDeFase(fase, misRoles = [], dificultad = 'intermedio') {
  const total = GUIAS[fase]?.paginas ?? 1;
  const base = fase === 'hangar'
    ? PAGINAS_HANGAR
    : Array.from({ length: total }, (_, idx) => ({ num: idx + 1, roles: [] }));

  let ordenadas = base;
  if (Array.isArray(misRoles) && misRoles.length > 0 && base.length > 1) {
    const mias = base.filter((p) => p.roles.some((r) => misRoles.includes(r)));
    const otras = base.filter((p) => !p.roles.some((r) => misRoles.includes(r)));
    ordenadas = [...mias, ...otras];
  }
  // Experto: solo el consejo de entrada de cada etapa.
  if (dificultad === 'experto') return ordenadas.slice(0, 1);
  return ordenadas;
}

/**
 * Resuelve a quién le habla la directora en una fase y si corresponde a los roles locales en red.
 */
export function destinatarioFase(fase, equipo, misRoles = [], nombreFallback = 'Piloto', piloto = null, soyPiloto = false) {
  // En línea con espejo, quien dirige la fase es el piloto de la etapa (el mismo que anuncia el aviso «Está manejando…»).
  if (piloto) {
    return { nombre: piloto.nombre, rol: piloto.roles?.[0] ?? null, esMio: soyPiloto, enEquipo: true, rolLocal: soyPiloto ? null : (misRoles?.[0] ?? null), nombreLocal: null };
  }
  const estacion = GUIAS[fase]?.estacion ?? ESTACION_POR_FASE[fase] ?? 'cohete';
  const tieneEquipo = !!equipo?.jugadores?.length;
  const turno = tieneEquipo ? turnoDeEstacion(equipo, estacion) : null;
  if (!turno) {
    return { nombre: nombreFallback, rol: null, esMio: true, enEquipo: false };
  }
  const esMio = !misRoles?.length || misRoles.includes(turno.rol);
  // Si en línea este dispositivo no tiene ese rol, aun así sabemos quién es dueño de la fase y qué rol local priorizar.
  const rolLocal = !esMio && misRoles?.length ? misRoles[0] : null;
  const jugadorLocal = rolLocal ? equipo.jugadores.find((j) => j.roles.includes(rolLocal)) : null;
  return {
    nombre: turno.jugador.nombre,
    rol: turno.rol,
    esMio,
    enEquipo: true,
    rolLocal,
    nombreLocal: jugadorLocal?.nombre ?? null,
  };
}

/**
 * Reglas de frecuencia y pistas de los consejos según dificultad.
 */
export function configConsejosDificultad(dificultad = 'intermedio') {
  if (dificultad === 'principiante') {
    return { soloEntrada: false, mostrarPista: true, ioModo: 'seguido', ioIntervaloMs: 12000 };
  }
  if (dificultad === 'experto') {
    return { soloEntrada: true, mostrarPista: false, ioModo: 'ninguno', ioIntervaloMs: 0 };
  }
  return { soloEntrada: false, mostrarPista: false, ioModo: 'normal', ioIntervaloMs: 0 };
}

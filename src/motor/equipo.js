// Modo equipo (B4): de 1 a 4 jugadores en el mismo dispositivo, cada uno con un rol de una misión real.
// Motor puro: asigna roles, dice de quién es el turno en cada estación del hangar, evalúa la nave
// desde la mirada de cada rol (para la votación antes de lanzar), detecta conflictos entre prioridades
// y calcula la puntuación por rol y el bono de coordinación del informe.
// Los textos se devuelven como claves de i18n (prefijo equipo.) con sus variables.

export const MAX_JUGADORES = 4;

// Roles inspirados en los equipos del Mission Design Lab de NASA Goddard.
export const ROLES = [
  // Reparto equitativo (2–3 estaciones por rol): la dirección elige cohete y órbita; ciencia protege sus
  // instrumentos con el blindaje y carga la bahía de drones (está en su estación); recursos se encarga de la antena y el estilo.
  { id: 'direccion', icono: '🧭', estaciones: ['cohete', 'orbita'] },
  { id: 'ingenieria', icono: '🔧', estaciones: ['propulsion', 'energia', 'sistemas'] },
  { id: 'ciencia', icono: '🔬', estaciones: ['instrumentos', 'blindaje', 'drones'] },
  { id: 'recursos', icono: '📡', estaciones: ['antena', 'estetica'] },
];
const ROL = Object.fromEntries(ROLES.map((r) => [r.id, r]));

// Con menos de 4 jugadores, alguien junta dos roles (siempre en este orden).
const REPARTO = {
  1: [['direccion', 'ingenieria', 'ciencia', 'recursos']],
  2: [['direccion', 'ciencia'], ['ingenieria', 'recursos']],
  3: [['direccion', 'recursos'], ['ingenieria'], ['ciencia']],
  4: [['direccion'], ['ingenieria'], ['ciencia'], ['recursos']],
};

/** Crea el equipo a partir de los nombres (1 a 4; los vacíos se ignoran). */
export function crearEquipo(nombres = []) {
  const limpios = nombres.map((n) => String(n ?? '').trim()).filter(Boolean).slice(0, MAX_JUGADORES);
  const lista = limpios.length ? limpios : ['Jugador 1'];
  const reparto = REPARTO[lista.length];
  return {
    jugadores: lista.map((nombre, i) => ({ id: `j${i + 1}`, nombre, roles: reparto[i] })),
    rondas: 0,
    vetos: 0,
    aprobado: false,
  };
}

export const esEquipo = (equipo) => !!equipo && equipo.jugadores.length > 1;

export const rolDeEstacion = (estacionId) => ROLES.find((r) => r.estaciones.includes(estacionId))?.id ?? 'direccion';

/** Jugador y rol a cargo de una estación del hangar. */
export function turnoDeEstacion(equipo, estacionId) {
  const rol = rolDeEstacion(estacionId);
  const jugador = equipo.jugadores.find((j) => j.roles.includes(rol)) ?? equipo.jugadores[0];
  return { jugador, rol, icono: ROL[rol].icono };
}

const pct = (x) => Math.round(x * 100);

/**
 * Cómo ve la nave cada rol. Devuelve por rol { ok, clave, vars }:
 * - Dirección: que se cumplan los requisitos de la revisión de diseño.
 * - Ingeniería: margen de masa ≥ 5 %, energía y Δv suficientes.
 * - Ciencia: cobertura científica ≥ 70 %.
 * - Recursos y comunicaciones: dentro del presupuesto y la antena baja todos los datos.
 */
export function evaluarRoles(resumen, requisitos = []) {
  const b = resumen.barras;
  const margenMasa = b.masa.limite > 0 ? (b.masa.limite - b.masa.valor) / b.masa.limite : -1;
  const ciencia = resumen.ciencia?.total ?? 0;
  const fallan = requisitos.filter((r) => !r.cumple).length;
  const margenCosto = b.costo.limite > 0 ? (b.costo.limite - b.costo.valor) / b.costo.limite : -1;

  const ingenieria = !b.masa.ok ? { ok: false, clave: 'equipo.eval.ingenieria.masa', vars: { valor: Math.round(b.masa.valor), limite: Math.round(b.masa.limite) } }
    : margenMasa < 0.05 ? { ok: false, clave: 'equipo.eval.ingenieria.margen', vars: { margen: pct(margenMasa) } }
    : !b.energia.ok ? { ok: false, clave: 'equipo.eval.ingenieria.energia', vars: {} }
    : !b.dv.ok ? { ok: false, clave: 'equipo.eval.ingenieria.dv', vars: {} }
    : { ok: true, clave: 'equipo.eval.ingenieria.ok', vars: { margen: pct(margenMasa) } };

  const cienciaEval = ciencia >= 0.7
    ? { ok: true, clave: 'equipo.eval.ciencia.ok', vars: { ciencia: pct(ciencia) } }
    : { ok: false, clave: 'equipo.eval.ciencia.poca', vars: { ciencia: pct(ciencia) } };

  const recursos = !b.costo.ok ? { ok: false, clave: 'equipo.eval.recursos.costo', vars: { exceso: Math.round(b.costo.valor - b.costo.limite) } }
    : !b.datos.ok ? { ok: false, clave: 'equipo.eval.recursos.datos', vars: { perdidos: pct(1 - b.datos.limite / Math.max(1, b.datos.valor)) } }
    : { ok: true, clave: 'equipo.eval.recursos.ok', vars: { margen: pct(margenCosto) } };

  const direccion = fallan === 0
    ? { ok: true, clave: 'equipo.eval.direccion.ok', vars: { total: requisitos.length } }
    : { ok: false, clave: 'equipo.eval.direccion.requisitos', vars: { fallan, total: requisitos.length } };

  return { direccion, ingenieria, ciencia: cienciaEval, recursos };
}

/**
 * Conflictos típicos entre prioridades (para negociar). Cada conflicto: { id, roles: [a, b], clave, vars }.
 * Solo aparecen cuando de verdad chocan: uno pide algo que el otro no puede dar.
 */
export function conflictos(resumen, evaluacion) {
  const b = resumen.barras;
  const lista = [];
  const holguraCosto = b.costo.limite - b.costo.valor;
  const holguraMasa = b.masa.limite - b.masa.valor;
  if (!evaluacion.ciencia.ok && holguraCosto < 60) {
    lista.push({ id: 'ciencia-presupuesto', roles: ['ciencia', 'recursos'], clave: 'equipo.conflicto.cienciaPresupuesto', vars: { holgura: Math.round(holguraCosto) } });
  }
  if (!evaluacion.ciencia.ok && holguraMasa < 80) {
    lista.push({ id: 'ciencia-masa', roles: ['ciencia', 'ingenieria'], clave: 'equipo.conflicto.cienciaMasa', vars: { holgura: Math.round(holguraMasa) } });
  }
  if (!b.datos.ok) {
    lista.push({ id: 'datos-antena', roles: ['ciencia', 'recursos'], clave: 'equipo.conflicto.datosAntena', vars: {} });
  }
  if (!evaluacion.ingenieria.ok && evaluacion.ciencia.ok && (resumen.ciencia?.total ?? 0) > 0.9) {
    lista.push({ id: 'masa-instrumentos', roles: ['ingenieria', 'ciencia'], clave: 'equipo.conflicto.masaInstrumentos', vars: {} });
  }
  return lista;
}

/**
 * Registra una ronda de votación: votos = { [rol]: 'aprueba' | 'cambio' }.
 * Si todos aprueban, el equipo queda aprobado. Cada «cambio» cuenta como veto.
 */
export function votar(equipo, votos) {
  const vetos = ROLES.filter((r) => votos[r.id] === 'cambio').length;
  return { ...equipo, rondas: equipo.rondas + 1, vetos: equipo.vetos + vetos, aprobado: vetos === 0 };
}

/** Voto sugerido para un rol según su evaluación (los jugadores pueden cambiarlo). */
export const votoSugerido = (evaluacion, rol) => (evaluacion[rol]?.ok ? 'aprueba' : 'cambio');

/**
 * Puntuación del equipo para el informe.
 * - Cada rol: 0–100 según su área (requisitos, márgenes, ciencia lograda, presupuesto y datos).
 * - Bono de coordinación (0–15 %): nave equilibrada (todas las áreas bien) y pocas rondas de votación.
 */
export function puntuacionEquipo(equipo, resumen, requisitos = [], cienciaFinal = null) {
  const ev = evaluarRoles(resumen, requisitos);
  const b = resumen.barras;
  const cumplidos = requisitos.length ? requisitos.filter((r) => r.cumple).length / requisitos.length : 1;
  const ciencia = cienciaFinal ?? resumen.ciencia?.total ?? 0;
  const acotar = (x) => Math.max(0, Math.min(100, Math.round(x)));
  const porRol = {
    direccion: acotar(cumplidos * 100),
    ingenieria: acotar((b.masa.ok ? 40 : 0) + (b.energia.ok ? 30 : 0) + (b.dv.ok ? 30 : 0)),
    ciencia: acotar(ciencia * 100),
    recursos: acotar((b.costo.ok ? 60 : Math.max(0, 60 - (b.costo.valor - b.costo.limite) / 5)) + (b.datos.ok ? 40 : 40 * Math.min(1, b.datos.limite / Math.max(1, b.datos.valor)))),
  };
  const equilibrada = Object.values(ev).every((e) => e.ok);
  const rondasExtra = Math.max(0, equipo.rondas - 2);
  const bono = Math.max(0, (equilibrada ? 0.1 : 0.03) + (equipo.rondas <= 2 ? 0.05 : 0) - rondasExtra * 0.02);
  const jugadores = equipo.jugadores.map((j) => ({
    ...j,
    puntos: acotar(j.roles.reduce((s, r) => s + porRol[r], 0) / j.roles.length),
  }));
  return { porRol, jugadores, equilibrada, rondas: equipo.rondas, vetos: equipo.vetos, bono: Math.round(bono * 100) / 100 };
}

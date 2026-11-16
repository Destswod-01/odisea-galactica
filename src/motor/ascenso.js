// Física simplificada del ascenso y de la órbita de transferencia (funciones puras, con pruebas).

// Giro gravitatorio: el cohete sube vertical al principio y luego se va inclinando
// para ganar velocidad horizontal. p = progreso del ascenso (0..1); devuelve grados desde la vertical.
export function perfilGiro(p) {
  const x = Math.max(0, Math.min(1, (p - 0.1) / 0.9));
  const suave = x * x * (3 - 2 * x);
  return 75 * suave;
}

// Max-Q: tramo de máxima presión aerodinámica (en progreso del ascenso).
export const MAX_Q = [0.18, 0.38];
export const enMaxQ = (p) => p >= MAX_Q[0] && p <= MAX_Q[1];

// Pérdida de Δv por salirse de la trayectoria: solo cuenta lo que exceda la tolerancia.
export const K_GUIADO = 6; // m/s por grado de error por segundo
export function perdidaGuiado(errorGrados, tolerancia, dt) {
  return Math.max(0, Math.abs(errorGrados) - tolerancia) * K_GUIADO * dt;
}

// Estrés estructural: sube si vas a todo empuje dentro de Max-Q y baja fuera de él.
export function pasoEstres(estres, p, empuje, dt) {
  const sube = enMaxQ(p) && empuje > 0.8;
  return Math.max(0, Math.min(1, estres + (sube ? 0.45 : -0.3) * dt));
}

// Bajar el empuje fuera de Max-Q te hace más lento: pierdes un poco.
export function perdidaEmpuje(p, empuje, dt) {
  return enMaxQ(p) ? 0 : (1 - empuje) * 20 * dt;
}

// Órbita de transferencia: cuanto más Δv aplicas, más lejos queda el punto más alto (apoapsis).
// Normalizado: con dvObjetivo exacto, la apoapsis toca la órbita del destino.
export function apoapsis(dv, r0, rDestino, dvObjetivo) {
  const f = Math.max(0, dv / dvObjetivo);
  return r0 + (rDestino - r0) * f * f;
}

// Física simplificada de la llegada (funciones puras, con pruebas).

// Efecto Oberth: frenar justo en el periapsis (el punto más cercano, donde vas más rápido) rinde más.
// s = posición relativa al periapsis (−1 = muy antes, 0 = en el periapsis, 1 = muy después).
export function eficienciaFrenado(s) {
  return Math.max(0.3, 1 - Math.abs(s));
}

// Tamaño de la órbita predicha según cuánto frenaste. f = frenado efectivo / frenado necesario.
// Por debajo de la ventana no hay captura (Infinity = trayectoria abierta, escapas).
// Con f = 1 la apoapsis queda exactamente en el objetivo (1, normalizado); más frenado = órbita más chica.
export function radioApoapsisCaptura(f, ventana = 0.1) {
  if (f < 1 - ventana) return Infinity;
  return Math.exp(3 * (1 - f));
}

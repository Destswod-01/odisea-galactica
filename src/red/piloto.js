// Quién maneja cada etapa en el modo en red: un solo «piloto» por etapa, por rotación entre los jugadores
// de la sala (orden de entrada). Los demás miran en vivo (ver espejo.js). Lógica pura, probada en piloto.test.js.

// Etapas con piloto + espectadores (en el orden de la campaña). La operación (07) y la extendida (08) quedan con todos jugando.
export const ETAPAS_ESPEJO = ['lanzamiento', 'leop', 'crucero', 'encuentro', 'insercion'];

/** Jugador que maneja la etapa `fase`, o null si esa fase no tiene espejo. Rota por orden de entrada
 *  (etapa i → jugador i mod n); si le toca a alguien desconectado, pasa al siguiente conectado. */
export function pilotoDeEtapa(jugadores, fase) {
  const i = ETAPAS_ESPEJO.indexOf(fase);
  if (i < 0 || !Array.isArray(jugadores) || jugadores.length === 0) return null;
  const n = jugadores.length;
  for (let k = 0; k < n; k++) {
    const j = jugadores[(i + k) % n];
    if (j && j.conectado !== false) return j;
  }
  return jugadores[i % n];
}

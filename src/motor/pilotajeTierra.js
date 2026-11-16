// Circuitos atmosféricos: se reutilizan el movimiento y cruce de aros de la etapa 02.
import { crearVueloAros, pasoAros } from './aros.js';
export const NIVELES_PILOTAJE = {
  novato: { total: 12, radio: 2.4, velocidad: 26, separacion: 55, lateral: 11, nivel: 1, premio: 40, amplitud: 7 },
  intermedio: { total: 14, radio: 1.9, velocidad: 32, separacion: 50, lateral: 13, nivel: 2, premio: 75, amplitud: 8 },
  veterano: { total: 16, radio: 1.45, velocidad: 38, separacion: 46, lateral: 15, nivel: 3, premio: 120, amplitud: 8.5 },
};
export function crearPilotaje(dificultad = 'novato') {
  const cfg = NIVELES_PILOTAJE[dificultad] ?? NIVELES_PILOTAJE.novato;
  const s = crearVueloAros(cfg);
  s.ruta = s.ruta.map((aro, i) => ({ ...aro,
    x: i < 2 ? 0 : Math.sin((i - 1) * 1.12) * cfg.amplitud,
    y: i < 2 ? 0 : Math.sin((i - 1) * 1.37) * (3 + cfg.nivel * .4),
  }));
  return s;
}
export const pasoPilotaje = (s, entrada, delta, dificultad) => pasoAros(s, entrada, delta, NIVELES_PILOTAJE[dificultad] ?? NIVELES_PILOTAJE.novato);
export function calcularPagoPilotaje(resultado) {
  const cfg = resultado && Object.hasOwn(NIVELES_PILOTAJE, resultado.dificultad) ? NIVELES_PILOTAJE[resultado.dificultad] : null;
  if (!cfg || resultado.tipo !== 'pilotaje' || resultado.total !== cfg.total || !Number.isInteger(resultado.aciertos) || resultado.aciertos < 0 || resultado.aciertos > cfg.total) return 0;
  return Math.floor(cfg.premio * resultado.aciertos / cfg.total);
}

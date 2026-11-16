// Ayudas de Principiante para las listas de piezas (tarea B2b).
import { consejoPieza } from '../motor/consejo.js';

// Devuelve null fuera de Principiante, así Intermedio queda exactamente como antes.
export function consejoDe(pieza, ctx) {
  return ctx?.mision?.dificultad === 'principiante' ? consejoPieza(pieza, ctx) : null;
}
export const claseConsejo = (c) => (c?.estado === 'no_sirve' ? 'consejo-no-sirve' : c?.estado === 'recomendada' ? 'consejo-recomendada' : '');

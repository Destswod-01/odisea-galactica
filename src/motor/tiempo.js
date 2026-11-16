// Recurso Tiempo (tarea B3): meses de desarrollo de cada pieza contra el plazo de la misión (`plazo_meses`).
// Idea de CubeSat 101: cada fase tiene su tiempo y las piezas avanzadas tardan más en diseñarse y probarse.
// Funciones puras.

// Meses por defecto según la categoría, para las piezas que no traen su propio `meses`.
const BASE_MESES = { energia: 18, antena: 12, blindaje: 8, propulsion: 14, bateria: 10, computadora: 12, orientacion: 12 };
export const BASE_INSTRUMENTO = 18, MAX_INSTRUMENTO = 30; // los instrumentos van de 18 a 30 meses según su costo
export const FACTOR_AVANZADA = 1.5; // una pieza avanzada tarda 50 % más
export const BUS_MESES = 30; // la plataforma (estructura y subsistemas básicos) si la misión no dice otra cosa
export const PRUEBAS_MESES = 12; // integración y pruebas finales, después de la pieza más lenta

// Meses de desarrollo de una pieza: su `meses` si lo trae; si no, el valor por defecto de su categoría.
export function mesesPieza(pieza) {
  if (!pieza) return 0;
  if (Number.isFinite(pieza.meses)) return pieza.meses;
  if (pieza.categoria === 'blindaje' && !pieza.masa_kg) return 0; // «sin blindaje» no se desarrolla
  const base = pieza.categoria === 'instrumento'
    ? BASE_INSTRUMENTO + Math.min(MAX_INSTRUMENTO - BASE_INSTRUMENTO, Math.round((pieza.costo_musd || 0) / 5))
    : (BASE_MESES[pieza.categoria] ?? 12);
  return Math.round(base * (pieza.avanzada ? FACTOR_AVANZADA : 1));
}

// Tiempo de desarrollo del diseño = la CADENA MÁS LARGA, no la suma: las piezas se construyen en paralelo, así que
// manda la más lenta (o la plataforma, si tarda más) y después se suman la integración y las pruebas.
// Devuelve { valor, limite, ok, cuello } con `limite` null si la misión no trae plazo (entonces siempre ok).
export function tiempoDesarrollo(piezasDelDiseno, mision) {
  const bus = mision?.bus_meses ?? BUS_MESES;
  let cuello = null, mayor = bus;
  for (const p of piezasDelDiseno) {
    const m = mesesPieza(p);
    if (m > mayor) { mayor = m; cuello = p.id; }
  }
  const valor = mayor + PRUEBAS_MESES;
  const limite = Number.isFinite(mision?.plazo_meses) ? mision.plazo_meses : null;
  return { valor, limite, ok: limite === null || valor <= limite, cuello };
}

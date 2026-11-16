// Sistemas de la nave (tarea B3): batería, computadora de vuelo y control de orientación. Funciones puras.
// Diseño: `diseno.bateria`, `diseno.computadora` y `diseno.orientacion` guardan el id de la pieza.
//   - clave ausente (undefined) = diseño anterior a B3 (partida o checkpoint viejo): usa la pieza simple, sin costo extra;
//   - null = el jugador aún no la elige: en intermedio cuenta como pendiente en `faltan`;
//   - en principiante se eligen solas (pieza simple, sin costo extra: ya viene en la plataforma).
// Las piezas que el jugador SÍ elige suman su masa, costo, potencia y meses.

export const SISTEMAS = ['bateria', 'computadora', 'orientacion'];
export const BATERIA_REF_WH = 2000; // el paquete simple equivale a la batería base de la misión; el avanzado la escala
export const DIAS_BUFER = 30; // días de operación intensa que la computadora puede cubrir con su memoria
export const BONO_APUNTADO_MAX = 0.08; // bono máximo a la calidad de la operación científica (etapa 07)
const ARCSEC_SIN_BONO = 120; // a 120 segundos de arco o peor, no hay bono

const simple = (piezas, cat) => piezas.find((p) => p.categoria === cat && !p.avanzada) || piezas.find((p) => p.categoria === cat) || null;

// { bateria: { pieza, auto, falta }, ... } con la pieza efectiva de cada sistema.
export function resolverSistemas(diseno, piezas, mision) {
  const principiante = mision?.dificultad === 'principiante';
  const salida = {};
  for (const cat of SISTEMAS) {
    const id = diseno?.[cat];
    const elegida = id ? piezas.find((p) => p.id === id && p.categoria === cat) : null;
    if (elegida) { salida[cat] = { pieza: elegida, auto: false, falta: false }; continue; }
    const automatica = principiante || id === undefined || !!id; // un id desconocido también cae a la pieza simple
    salida[cat] = automatica ? { pieza: simple(piezas, cat), auto: true, falta: false } : { pieza: null, auto: false, falta: true };
  }
  return salida;
}

// Piezas que el jugador eligió de verdad (las que cobran masa, costo, potencia y meses).
export const sistemasElegidos = (sistemas) => SISTEMAS.map((c) => sistemas[c]).filter((s) => s.pieza && !s.auto).map((s) => s.pieza);

// Batería (Wh) para la misión: el paquete simple deja la base de la misión; el avanzado la multiplica.
export function bateriaWh(sistema, mision) {
  const base = mision?.bateria_wh;
  if (!sistema?.pieza?.bateria_wh || sistema.auto || !base) return base ?? null;
  return Math.round(base * (sistema.pieza.bateria_wh / BATERIA_REF_WH));
}

// Datos que se pierden si el enlace no alcanza, con y sin la memoria de la computadora.
// La memoria guarda el déficit de DIAS_BUFER días; lo que no cabe se pierde.
export function almacenamiento(computadora, datosGenerados, enlace) {
  const gbit = computadora?.almacenamiento_gbit || 0;
  const deficit = Math.max(0, datosGenerados - enlace); // Mbit/día que no salen por la antena
  const capacidad = gbit * 1000; // Mbit
  const guardado = Math.min(capacidad, deficit * DIAS_BUFER);
  const perdidaSin = datosGenerados > 0 ? deficit / datosGenerados : 0;
  const perdidaCon = datosGenerados > 0 ? Math.max(0, deficit * DIAS_BUFER - guardado) / DIAS_BUFER / datosGenerados : 0;
  return { gbit, deficit, perdidaSin, perdidaCon, recuperado: perdidaSin - perdidaCon };
}

// Apuntado: la precisión en segundos de arco y el bono a la calidad de la foto (0..BONO_APUNTADO_MAX).
export function apuntado(orientacion) {
  const arcsec = orientacion?.precision_arcsec ?? null;
  const bono = arcsec === null ? 0 : BONO_APUNTADO_MAX * Math.max(0, 1 - arcsec / ARCSEC_SIN_BONO);
  return { arcsec, bono: Math.round(bono * 1000) / 1000 };
}

// ¿Ya quedó resuelta esta parte del hangar? En principiante siempre; en intermedio, cuando el jugador eligió las tres.
export const sistemasListos = (resumen, mision) => SISTEMAS.every((c) => !resumen.sistemas[c].falta && (mision?.dificultad === 'principiante' || !resumen.sistemas[c].auto));

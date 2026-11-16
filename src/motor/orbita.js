// Motor de la elección de órbita (tarea B1). Funciones puras.
// Cada misión trae `orbitas: [{ id, real, nombre, altitud, descripcion, por_que, efectos }]`.
// efectos: { ciencia, enlace, dv_extra_ms, vida_anos, radiacion }. La órbita `real` es la de la NASA y es la
// que se usa si el diseño no trae `orbita` (partidas y checkpoints viejos funcionan igual que antes).

// Sin órbitas en la misión (o sin efectos): no cambia nada.
export const EFECTOS_NEUTROS = { ciencia: 1, enlace: 1, dv_extra_ms: 0, vida_anos: null, radiacion: 1 };

export const orbitasDe = (mision) => (Array.isArray(mision?.orbitas) ? mision.orbitas : []);

export const orbitaReal = (mision) => {
  const lista = orbitasDe(mision);
  return lista.find((o) => o.real) || lista[0] || null;
};

// La órbita que eligió el diseño; si no hay o el id no existe, la real.
export function orbitaElegida(mision, diseno) {
  const lista = orbitasDe(mision);
  return lista.find((o) => o.id === diseno?.orbita) || orbitaReal(mision);
}

// Efectos de la órbita elegida, siempre completos.
export function efectosOrbita(mision, diseno) {
  return { ...EFECTOS_NEUTROS, ...(orbitaElegida(mision, diseno)?.efectos || {}) };
}

// Aplica el efecto de la órbita sobre los presupuestos que calcula resumenNave.
export function aplicarOrbita(mision, diseno, { dvRequerida, enlace, ciencia }) {
  const orbita = orbitaElegida(mision, diseno);
  const ef = { ...EFECTOS_NEUTROS, ...(orbita?.efectos || {}) };
  const cobertura = (c) => (ef.ciencia === 1 ? c : Math.min(1, c * ef.ciencia));
  const porObjetivo = ciencia.porObjetivo.map((o) => (ef.ciencia === 1 ? o : { ...o, cobertura: cobertura(o.cobertura) }));
  const total = ef.ciencia === 1 ? ciencia.total : porObjetivo.reduce((s, o) => s + o.peso * o.cobertura, 0);
  return {
    orbita,
    dvRequerida: dvRequerida + ef.dv_extra_ms,
    enlace: enlace * ef.enlace,
    ciencia: ef.ciencia === 1 ? ciencia : { ...ciencia, porObjetivo, total },
  };
}

// Compara cada efecto con el de la órbita real: 1 = mejor, -1 = peor, 0 = igual.
// Para Δv extra y radiación «menos es mejor».
export function comparacionConReal(mision, orbita) {
  const real = { ...EFECTOS_NEUTROS, ...(orbitaReal(mision)?.efectos || {}) };
  const ef = { ...EFECTOS_NEUTROS, ...(orbita?.efectos || {}) };
  const signo = (a, b, menosEsMejor = false) => (Math.abs(a - b) < 1e-9 ? 0 : (a > b) !== menosEsMejor ? 1 : -1);
  return {
    ciencia: signo(ef.ciencia, real.ciencia),
    enlace: signo(ef.enlace, real.enlace),
    dv: signo(ef.dv_extra_ms, real.dv_extra_ms, true),
    vida: signo(ef.vida_anos ?? 0, real.vida_anos ?? 0),
    radiacion: signo(ef.radiacion, real.radiacion, true),
  };
}

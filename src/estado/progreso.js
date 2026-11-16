import { calcularPagoEntrevista, TOTAL_ENTREVISTA } from '../motor/entrevista.js';
import { calcularPagoPilotaje } from '../motor/pilotajeTierra.js';

// Progreso del jugador entre misiones: fondos de la agencia, piezas desbloqueadas y misiones completadas.
// Se guarda en el navegador; si no hay almacenamiento, el juego funciona igual (sin recordar).

// Al empezar hay 2 opciones por categoría. LRO entrega fondos y una pieza aleatoria; las demás mejoras se compran.
export const DESBLOQUEADO_INICIAL = [
  'atlas_v_401', 'atlas_v_541',
  'tanque_chico', 'tanque_mediano',
  'panel_chico', 'panel_mediano',
  'antena_media', 'antena_alta',
  'blindaje_ninguno', 'blindaje_aluminio',
  'lroc', 'lend', // kit inicial de la misión 1 (LRO)
  'mwr', 'mag', // kit inicial de la misión 2 (Juno)
  'bateria_basica', 'computadora_estandar', 'orientacion_basica', // sistemas simples (B3); los avanzados se compran
];

// Premio único de LRO: una mejora útil para Juno que aún no poseas.
export const PREMIOS_LRO = ['atlas_v_551', 'panel_gigante', 'boveda_titanio', 'jiram', 'particulas'];
// Completar LRO habilita los sistemas que Juno no puede pagar con un solo premio (cohete, paneles y bóveda: 410 M).
// Los instrumentos que falten (JIRAM 50 M, partículas 60 M) se compran con el premio. Sin esto, la campaña se atoraba en Juno.
export const DESBLOQUEOS_JUNO = ['atlas_v_551', 'panel_gigante', 'boveda_titanio'];
const conJuno = (lista) => [...lista, ...DESBLOQUEOS_JUNO.filter(id => !lista.includes(id))];

const CLAVE = 'vdl-orbita2-progreso';
export const PROGRESO_INICIAL = { fondos: 0, desbloqueados: DESBLOQUEADO_INICIAL, completadas: [], pagos: {}, medallas: {}, premios: {}, premiosVistos: {}, pagosTierra: {} };
export const ORDEN_MEDALLAS = ['Bronce', 'Plata', 'Oro', 'Nivel JPL'];

export function leerProgreso() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE));
    if (!p) return PROGRESO_INICIAL;
    const leido = { ...PROGRESO_INICIAL, ...p };
    // Migra partidas guardadas que ya completaron LRO antes de este ajuste.
    return leido.completadas?.includes('lro') ? { ...leido, desbloqueados: conJuno(leido.desbloqueados) } : leido;
  } catch {
    return PROGRESO_INICIAL;
  }
}

export function guardarProgreso(p) {
  try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
  return p;
}

export const estaDesbloqueado = (p, pieza) => !pieza.precio || p.desbloqueados.includes(pieza.id);

export function comprar(p, pieza) {
  if (estaDesbloqueado(p, pieza) || p.fondos < pieza.precio) return p;
  return { ...p, fondos: p.fondos - pieza.precio, desbloqueados: [...p.desbloqueados, pieza.id] };
}

// La agencia paga según la medalla. Si repites una misión, solo cobras la diferencia si mejoras.
export function cobrar(p, mision, medalla, azar = Math.random) {
  const monto = mision.recompensa?.[medalla] || 0;
  const previo = p.pagos[mision.id] || 0;
  const pago = Math.max(0, monto - previo);
  const candidatos = PREMIOS_LRO.filter(id => !p.desbloqueados.includes(id));
  const sortear = monto > 0 && mision.id === 'lro' && !p.completadas.includes('lro') && !Object.hasOwn(p.premios ?? {}, 'lro');
  const nuevoPremio = sortear && candidatos.length ? candidatos[Math.min(candidatos.length - 1, Math.max(0, Math.floor(azar() * candidatos.length)))] : null;
  const premios = sortear ? { ...p.premios, lro: nuevoPremio } : (p.premios ?? {});
  return {
    progreso: {
      ...p,
      fondos: p.fondos + pago,
      premios,
      desbloqueados: ((lista) => (monto > 0 && mision.id === 'lro' ? conJuno(lista) : lista))(nuevoPremio ? [...p.desbloqueados, nuevoPremio] : p.desbloqueados),
      pagos: { ...p.pagos, [mision.id]: Math.max(previo, monto) },
      medallas: { ...p.medallas, [mision.id]: ORDEN_MEDALLAS.indexOf(medalla) > ORDEN_MEDALLAS.indexOf(p.medallas?.[mision.id]) ? medalla : p.medallas?.[mision.id] },
      completadas: monto > 0 && !p.completadas.includes(mision.id) ? [...p.completadas, mision.id] : p.completadas,
    },
    premio: monto > 0 && !p.premiosVistos?.[mision.id] ? premios[mision.id] ?? null : null,
    pago,
    monto,
  };
}

// Solo datos de campaña de este navegador; conserva nombre, idioma y sonido.
export function reiniciarCampana() {
  try {
    for (const clave of [CLAVE, 'vdl-orbita2-partida', 'orbita2-intentos', 'orbita2-clasificacion', 'odisea-sin-consejos']) localStorage.removeItem(clave);
    return true;
  } catch {
    return false;
  }
}


// Cada ronda de Tierra tiene su propio identificador. Repetir el botón o recuperar
// el mismo resultado no vuelve a pagar; una ronda nueva sí puede ganar dinero.
// Espera: cuando ya se hicieron las 2 actividades (entrevista y pilotaje), hay que esperar 1 hora para volver a jugarlas.
export const ESPERA_TIERRA_MS = 60 * 60 * 1000;
export function esperaTierra(p, ahora = Date.now()) {
  const c = p?.tierraCiclo ?? {};
  if (!c.entrevista || !c.pilotaje) return 0;
  return Math.max(0, Math.max(c.entrevista, c.pilotaje) + ESPERA_TIERRA_MS - ahora);
}
export function cobrarActividadTierra(p, resultado, idPartida, ahora = Date.now()) {
  if (esperaTierra(p, ahora) > 0) return p;
  if (!p?.completadas?.includes('lro') || typeof idPartida !== 'string') return p;
  const id = idPartida.trim();
  if (!id || id.length > 128 || Object.hasOwn(p.pagosTierra ?? {}, id)) return p;
  if (!resultado || !Number.isFinite(p.fondos) || p.fondos < 0) return p;
  let pago;
  if (resultado.tipo === 'entrevista') {
    if (!Array.isArray(resultado.respuestas) || resultado.respuestas.length !== TOTAL_ENTREVISTA) return p;
    pago = calcularPagoEntrevista(resultado.respuestas);
  } else if (resultado.tipo === 'pilotaje') {
    pago = calcularPagoPilotaje(resultado);
  } else return p;
  if (!Number.isFinite(pago) || pago < 0 || !Number.isFinite(p.fondos + pago)) return p;
  // Ciclo de la espera: si el anterior ya venció, empieza uno nuevo con esta actividad.
  const previo = p.tierraCiclo ?? {};
  const ciclo = previo.entrevista && previo.pilotaje ? {} : previo;
  return {
    ...p,
    fondos: p.fondos + pago,
    pagosTierra: { ...p.pagosTierra, [id]: { tipo: resultado.tipo, pago } },
    tierraCiclo: { ...ciclo, [resultado.tipo]: ahora },
  };
}

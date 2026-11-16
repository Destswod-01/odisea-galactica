// Intentos de diseño (tarea B5): simulación rápida sin minijuegos e historial de los últimos intentos por misión.
// Motor puro: la única parte con efectos es el historial, que usa localStorage con try/catch.
import { requisitos, resumenRequisitos } from './requisitos.js';
import { piezasDelDiseno } from './nave.js';
import { efectosOrbita } from './orbita.js';

export const CLAVE_INTENTOS = 'orbita2-intentos';
export const MAX_INTENTOS = 5;
const EJECUCION_PROMEDIO = 0.6; // supuesto: ejecución media en los minijuegos (sobre 15 puntos)

const redondear = (x, d = 0) => { const k = 10 ** d; return Math.round((Number(x) || 0) * k) / k; };

/** Estimación rápida y determinista del resultado, sin jugar los minijuegos. `piezas` (opcional) afina el blindaje. */
export function simulacionRapida(resumen, mision, diseno, piezas = null) {
  const lista = requisitos(mision, resumen, diseno);
  const reqs = resumenRequisitos(lista);

  // Salud: la radiación de toda la fase científica contra el blindaje elegido.
  let blindaje = 0;
  if (piezas) blindaje = piezasDelDiseno(diseno, piezas).unicas.find((p) => p.categoria === 'blindaje')?.blindaje || 0;
  const radiacion = efectosOrbita(mision, diseno).radiacion;
  const dosisTotal = (mision.destino?.dosis_base_orbita || 0) * (1 - blindaje) * (mision.orbitas_meta || 0) * radiacion;
  const salud = Math.max(0, Math.min(100, 100 - dosisTotal));
  const saludMedia = (100 + salud) / 2 / 100;

  const factorDatos = resumen.factorDatos ?? 1;
  const ciencia = Math.max(0, Math.min(1, (resumen.ciencia?.total || 0) * factorDatos * (salud < 30 ? 0.5 : 1) * saludMedia));
  const margen = (mision.presupuesto_musd - resumen.costo) / mision.presupuesto_musd;

  // Mismos pesos que puntaje(): ciencia 50, presupuesto 15, salud 15, ejecución 15, reales 5 (sin coincidencias).
  const pCiencia = ciencia * 50;
  const pPresupuesto = Math.max(0, Math.min(15, (margen / 0.05) * 15));
  const pSalud = (salud / 100) * 15;
  const pEjecucion = EJECUCION_PROMEDIO * 15;
  const puntaje = Math.round(pCiencia + pPresupuesto + pSalud + pEjecucion);

  const motivos = [];
  if (ciencia >= 0.8) motivos.push({ clave: 'intentos.motivo.cienciaAlta', vars: { n: redondear(ciencia * 100) } });
  else if (ciencia < 0.5) motivos.push({ clave: 'intentos.motivo.cienciaBaja', vars: { n: redondear(ciencia * 100) } });
  if (factorDatos < 0.9) motivos.push({ clave: 'intentos.motivo.datos', vars: { n: redondear((1 - factorDatos) * 100) } });
  if (salud < 60) motivos.push({ clave: 'intentos.motivo.saludBaja', vars: { n: redondear(salud) } });
  else motivos.push({ clave: 'intentos.motivo.saludBien', vars: { n: redondear(salud) } });
  if (margen < 0) motivos.push({ clave: 'intentos.motivo.presupuestoExcedido', vars: { n: redondear(-margen * 100) } });
  else if (margen >= 0.05) motivos.push({ clave: 'intentos.motivo.presupuestoHolgado', vars: { n: redondear(margen * 100) } });
  if (reqs.cumplidos < reqs.total) motivos.push({ clave: 'intentos.motivo.requisitos', vars: { n: reqs.total - reqs.cumplidos } });
  if (motivos.length < 2) motivos.push({ clave: 'intentos.motivo.requisitosOk', vars: { n: reqs.total } });

  return {
    ciencia, presupuesto: { margen, costo: resumen.costo, limite: mision.presupuesto_musd },
    salud, requisitos: reqs, puntaje, motivos: motivos.slice(0, 4),
  };
}

/** Resumen corto que se guarda en el historial. */
export function resumenCorto(resumen, mision, diseno, cienciaFrac = null) {
  const perdidos = resumen.almacenamiento ? resumen.almacenamiento.perdidaCon : Math.max(0, 1 - (resumen.factorDatos ?? 1));
  return {
    masa: redondear(resumen.masaTotal), costo: redondear(resumen.costo),
    ciencia: redondear((cienciaFrac ?? resumen.ciencia?.total ?? 0) * 100),
    datosPerdidos: redondear(perdidos * 100),
    orbita: resumen.orbita?.nombre || diseno?.orbita || null,
    dificultad: mision?.dificultad || null,
  };
}

// ---------- Historial ----------
function leerTodo() {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE_INTENTOS));
    return x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  } catch { return {}; }
}
const escribirTodo = (todo) => { try { localStorage.setItem(CLAVE_INTENTOS, JSON.stringify(todo)); } catch { /* sin almacenamiento */ } };

export function leerIntentos(misionId) {
  const l = leerTodo()[misionId];
  return Array.isArray(l) ? l : [];
}

/** Guarda un intento (el más nuevo primero, máximo 5 por misión) y devuelve la lista. */
export function registrarIntento({ misionId, diseno, resumenCorto: rc, puntaje, tipo = 'simulacion', fecha = Date.now() }) {
  const todo = leerTodo();
  const lista = [{ misionId, diseno, resumenCorto: rc, puntaje, tipo, fecha }, ...(Array.isArray(todo[misionId]) ? todo[misionId] : [])].slice(0, MAX_INTENTOS);
  escribirTodo({ ...todo, [misionId]: lista });
  return lista;
}

export function borrarIntentos(misionId) {
  const { [misionId]: _quitado, ...resto } = leerTodo();
  escribirTodo(resto);
}

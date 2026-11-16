import { t } from '../i18n/idioma.js';
import { balanceW } from './mision.js';
import { PLANETAS_HONDA, crearHonda, pasoHonda } from './honda.js';

export const COSTO_TCM = 12;
export const EVENTOS_CRUCERO = {
  tormenta: { titulo: 'Tormenta solar', texto: 'El detector registra un aumento de partículas. Protege los sistemas o acepta el riesgo.', opciones: [
    { id: 'proteger', titulo: 'Refugiar la electrónica', detalle: '−8 % batería · activa hibernación', bateria: -.08, modo: 'hibernacion' },
    { id: 'seguir', titulo: 'Mantener la actividad', detalle: '−9 de salud · no consume batería adicional', salud: -9 },
  ] },
  desvio: { titulo: 'Pequeño desvío de rumbo', texto: 'La navegación detecta una incertidumbre. Puedes afinar la trayectoria o recopilar más datos antes de actuar.', opciones: [
    { id: 'corregir', titulo: 'Ejecutar TCM preventiva', detalle: '−18 m/s de margen extra', combustible: 18 },
    { id: 'medir', titulo: 'Medir y recalcular', detalle: '−7 % batería · conserva propelente', bateria: -.07 },
    { id: 'ignorar', titulo: 'Conservar ambos recursos', detalle: 'El desvío permanece: puede exigir corrección posterior', desvio: .3 },
  ] },
  termico: { titulo: 'Temperatura fuera de objetivo', texto: 'La nave necesita equilibrar su consumo. La hibernación reduce la actividad científica y limita las correcciones manuales.', opciones: [
    { id: 'dormir', titulo: 'Hibernar sistemas no esenciales', detalle: 'Ahorra energía · despierta para usar TCM', modo: 'hibernacion' },
    { id: 'regular', titulo: 'Regular sin hibernar', detalle: '−6 % batería · mantiene controles activos', bateria: -.06 },
  ] },
};
export function margenCrucero(s, mision) { return Math.max(0, s.nave.dvRestante - mision.dv_requerida_ms); }
export function opcionCapitanDisponible(s, op, mision) {
  return (op.combustible || 0) <= margenCrucero(s, mision) && s.nave.bateria + (op.bateria || 0) * s.nave.bateriaMax > 0;
}
export function crearCapitan(estado, mision, azar = Math.random, planetaLibre = null) {
  const eventos = Object.keys(EVENTOS_CRUCERO);
  for (let i = eventos.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor(azar() * (i + 1))); [eventos[i], eventos[j]] = [eventos[j], eventos[i]]; }
  return { fase: 'plan', modo: 'activo', angulo: 2, potencia: 100,
    planeta: planetaLibre || (mision.id === 'juno' ? 'tierra' : 'luna'), practica: !!planetaLibre,
    nave: { ...estado, decisiones: [...estado.decisiones] }, vuelo: null, eventos,
    resueltos: [], evento: null, regreso: null, faseAntes: null, progreso: 0, puntos: 0, tcm: 0, desvioPendiente: 0, registro: [], compensado: false };
}
export function balanceCapitan(s, ctx) {
  const d = s.fase === 'travesia' || s.regreso === 'travesia' ? 1 + s.progreso * (ctx.mision.destino.distancia_ua - 1) : 1;
  const e = s.modo === 'hibernacion' ? { ...s.nave, encendidos: [] } : s.nave;
  return balanceW(e, ctx.diseno, ctx.piezas, ctx.mision, d) + (s.modo === 'hibernacion' ? ctx.mision.bus.consumo_w * .25 : 0);
}
const registrar = (s, texto) => ({ ...s, registro: [...s.registro, texto] });
function energia(s, dt, ctx) {
  const bateria = Math.min(s.nave.bateriaMax, s.nave.bateria + balanceCapitan(s, ctx) * dt * .08);
  if (bateria > 0) return { ...s, nave: { ...s.nave, bateria } };
  return { ...registrar(s, t('e04.crucero.battery_depleted_automatic_safe_mode_5')), modo: 'hibernacion',
    nave: { ...s.nave, bateria: s.nave.bateriaMax * .25, salud: Math.max(0, s.nave.salud - 5), modosSeguros: s.nave.modosSeguros + 1 } };
}
export function pasoCapitan(s, a, ctx) {
  if (a.tipo === 'ajustar' && s.fase === 'plan') return { ...s, angulo: Math.max(-18, Math.min(20, a.angulo ?? s.angulo)), potencia: Math.max(75, Math.min(125, a.potencia ?? s.potencia)) };
  if (a.tipo === 'modo' && ['plan', 'vuelo', 'travesia', 'maniobra'].includes(s.fase)) return { ...s, modo: a.modo === 'hibernacion' ? 'hibernacion' : 'activo' };
  if (a.tipo === 'iniciar' && s.fase === 'plan') return { ...s, fase: 'vuelo', vuelo: crearHonda(PLANETAS_HONDA[s.planeta], s.angulo, s.potencia) };
  if (a.tipo === 'pausar' && ['vuelo', 'travesia'].includes(s.fase)) return { ...s, faseAntes: s.fase, fase: 'pausa' };
  if (a.tipo === 'reanudar' && s.fase === 'pausa') return { ...s, fase: s.faseAntes, faseAntes: null };
  if (a.tipo === 'tcm' && s.fase === 'vuelo' && s.modo === 'activo' && margenCrucero(s, ctx.mision) >= COSTO_TCM) {
    return { ...registrar(s, t('e04.crucero.tcm_m_s_extra_margin', { v0: a.sentido > 0 ? '↑' : '↓', v1: COSTO_TCM })), tcm: s.tcm + 1,
      vuelo: { ...s.vuelo, vy: s.vuelo.vy + (a.sentido > 0 ? .32 : -.32) }, nave: { ...s.nave, dvRestante: s.nave.dvRestante - COSTO_TCM } };
  }
  if (a.tipo === 'resolver' && s.fase === 'evento') {
    const op = EVENTOS_CRUCERO[s.evento]?.opciones.find(o => o.id === a.opcion);
    if (!op || !opcionCapitanDisponible(s, op, ctx.mision)) return s;
    const extra = op.desvio || 0;
    const nave = { ...s.nave, dvRestante: s.nave.dvRestante - (op.combustible || 0),
      bateria: Math.min(s.nave.bateriaMax, s.nave.bateria + (op.bateria || 0) * s.nave.bateriaMax), salud: Math.max(0, s.nave.salud + (op.salud || 0)) };
    return { ...registrar(s, `${t(`e04.evento.${s.evento}.titulo`)}: ${t(`e04.evento.${s.evento}.${op.id}.titulo`)}.`), nave, fase: s.regreso,
      modo: op.modo || s.modo, resueltos: [...s.resueltos, s.evento], evento: null,
      vuelo: s.regreso === 'vuelo' && extra ? { ...s.vuelo, vy: s.vuelo.vy + extra } : s.vuelo,
      desvioPendiente: s.regreso === 'travesia' ? s.desvioPendiente + extra : s.desvioPendiente };
  }
  if (a.tipo === 'seguir' && s.fase === 'maniobra') {
    const costo = s.vuelo.resultado === 'exito' ? 0 : 60;
    if (costo > margenCrucero(s, ctx.mision)) return s;
    return { ...registrar(s, costo ? t('e04.crucero.the_engine_compensated_for_the_distant') : t('e04.crucero.encounter_trajectory_confirmed')),
      fase: s.practica ? 'fin' : 'travesia', compensado: costo > 0, nave: { ...s.nave, dvRestante: s.nave.dvRestante - costo } };
  }
  if (a.tipo !== 'tiempo' || !['vuelo', 'travesia'].includes(s.fase)) return s;
  const dt = Math.max(0, Math.min(.2, a.dt));
  let n = energia(s, dt, ctx);
  if (n.nave.salud <= 0) return { ...n, fase: 'fallo' };
  if (s.fase === 'vuelo') {
    const vuelo = pasoHonda(s.vuelo, dt * .65, PLANETAS_HONDA[s.planeta]); n = { ...n, vuelo };
    if (vuelo.resultado) return { ...n, fase: vuelo.resultado === 'impacto' ? 'fallo' : 'maniobra', puntos: vuelo.resultado === 'exito' ? 1000 : 200 };
    if (!s.practica) for (let i = 0; i < 2; i++) if (vuelo.tiempo >= [1.4, 3.1][i] && !s.resueltos.includes(s.eventos[i])) return { ...n, fase: 'evento', regreso: 'vuelo', evento: s.eventos[i] };
    return n;
  }
  const progreso = Math.min(1, s.progreso + dt / 12 * (s.modo === 'hibernacion' ? 1.35 : 1)); n = { ...n, progreso };
  if (progreso >= .4 && !s.resueltos.includes(s.eventos[2])) return { ...n, fase: 'evento', regreso: 'travesia', evento: s.eventos[2] };
  if (progreso >= 1) {
    const costo = s.desvioPendiente ? 30 : 0;
    if (costo > margenCrucero(n, ctx.mision)) return { ...registrar(n, t('e04.crucero.the_pending_deviation_requires_more_maneuvering')), fase: 'fallo' };
    return { ...registrar(n, costo ? t('e04.crucero.late_course_correction_30_m_s') : t('e04.crucero.cruise_completed_without_late_corrections')),
      fase: 'fin', puntos: n.puntos + Math.round(n.nave.salud * 5), nave: { ...n.nave, dvRestante: n.nave.dvRestante - costo } };
  }
  return n;
}
export function aplicarCapitan(estado, s) {
  if (s.fase !== 'fin' || s.practica || estado.cruceroCompletado) return estado;
  return { ...s.nave, cruceroCompletado: true, puntuacionCrucero: s.puntos,
    decisiones: [...s.nave.decisiones, ...s.registro.map(texto => ({ texto, tipo: 'info' }))] };
}

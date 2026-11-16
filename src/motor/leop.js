import { t } from '../i18n/idioma.js';
export const SISTEMAS_LEOP = [
  { id: 'paneles', nombre: 'Desplegar paneles', corto: 'Paneles', color: '#8bf4dd', simbolo: '▦', detalle: 'Abre las alas solares para producir electricidad.' },
  { id: 'antena', nombre: 'Orientar antena', corto: 'Antena', color: '#ffcb79', simbolo: '◉', detalle: 'Apunta el enlace de radio hacia la Tierra.' },
  { id: 'estrellas', nombre: 'Encender rastreadores', corto: 'Rastreadores', color: '#bba9ff', simbolo: '✦', detalle: 'Reconoce estrellas para calcular la orientación de la sonda.' },
];
import { ajusteMinijuego } from './dificultad.js';
// La dificultad (B11) alarga o acorta los pulsos de la secuencia y el tiempo para responder.
export function configurarLeop(mision) {
  const avanzada = mision.id === 'juno';
  const { tiempo } = ajusteMinijuego(mision);
  return { rondas: avanzada ? 5 : 4, minimoRondas: avanzada ? 3 : 2, falloAutomatico: avanzada ? .85 : .7, pulso: (avanzada ? .72 : .9) * tiempo, minimoPulso: .36 * tiempo, limite: (avanzada ? 4.5 : 5.5) * tiempo };
}
export const duracionPulso = (cfg, ronda) => Math.max(cfg.minimoPulso, cfg.pulso - ronda * .12);
export const limiteRespuesta = (cfg, ronda) => Math.max(2.5, cfg.limite - ronda * .45);
export function crearLeop(cfg, azar = Math.random, recursos = {}) {
  const falloAutomatico = azar() < cfg.falloAutomatico;
  const rondas = cfg.minimoRondas + Math.min(cfg.rondas - cfg.minimoRondas, Math.floor(azar() * (cfg.rondas - cfg.minimoRondas + 1)));
  const secuencia = [0, 1, 2];
  for (let i = 0; i < cfg.rondas - 1; i++) secuencia.push(Math.min(2, Math.max(0, Math.floor(azar() * 3))));
  return { fase: 'listo', ronda: 0, rondas, falloAutomatico, bateria: recursos.bateria ?? 100, bateriaMax: recursos.bateriaMax ?? 100, gastado: 0, intentos: 0, indice: 0, tiempo: 0, restante: 0, secuencia,
    activados: [], puntos: 0, ultimo: null, motivo: null, faseAntes: null };
}
export function pulsoLeop(s, cfg) {
  if (s.fase !== 'muestra') return null;
  const dur = duracionPulso(cfg, s.ronda), tramo = dur + .25;
  const i = Math.floor(Math.max(0, s.tiempo - .5) / tramo);
  return s.tiempo >= .5 && i < s.ronda + 3 && (s.tiempo - .5) % tramo < dur ? s.secuencia[i] : null;
}
export function pasoLeop(s, accion, cfg) {
  const cobrar = (n, porcentaje) => { const costo = n.bateriaMax * porcentaje; return n.bateria < costo ? { ...n, fase: 'sinenergia' } : { ...n, bateria: n.bateria - costo, gastado: n.gastado + costo }; };
  if (accion.tipo === 'empezar') return s.fase === 'listo' ? cobrar({ ...s, fase: 'automatico', tiempo: 0 }, .01) : s;
  if (accion.tipo === 'manual' && ['falloauto', 'perdida', 'confirmada'].includes(s.fase)) return cobrar({ ...s, ronda: s.ronda + (s.fase === 'confirmada' ? 1 : 0), fase: 'muestra', indice: 0, tiempo: 0, ultimo: null, intentos: s.intentos + 1 }, .02);
  if (accion.tipo === 'pausar') return ['automatico', 'muestra', 'entrada'].includes(s.fase) ? { ...s, faseAntes: s.fase, fase: 'pausa' } : s;
  if (accion.tipo === 'reanudar') return s.fase === 'pausa' ? { ...s, fase: s.faseAntes, faseAntes: null } : s;
  if (accion.tipo === 'pulsar') {
    if (s.fase !== 'entrada') return s;
    if (accion.sistema !== s.secuencia[s.indice]) return { ...s, fase: 'perdida', motivo: 'orden', ultimo: accion.sistema };
    const indice = s.indice + 1, completa = indice === s.ronda + 3;
    return { ...s, indice, puntos: s.puntos + 100, ultimo: accion.sistema,
      activados: [...new Set([...s.activados, accion.sistema])], restante: limiteRespuesta(cfg, s.ronda),
      fase: completa ? s.ronda === s.rondas - 1 ? 'exito' : 'confirmada' : 'entrada', tiempo: 0 };
  }
  if (accion.tipo !== 'tiempo' || !['automatico', 'muestra', 'entrada'].includes(s.fase)) return s;
  const dt = Math.max(0, Math.min(.25, accion.dt)), tiempo = s.tiempo + dt;
  if (s.fase === 'automatico') return { ...s, tiempo, activados: tiempo < 3 ? [] : s.falloAutomatico ? [0] : [0, 1, 2], fase: tiempo >= 4 ? s.falloAutomatico ? 'falloauto' : 'exito' : 'automatico' };
  if (s.fase === 'entrada') {
    const restante = Math.max(0, s.restante - dt);
    return { ...s, tiempo, restante, ...(restante === 0 ? { fase: 'perdida', motivo: 'tiempo' } : {}) };
  }
  const duracion = .5 + (s.ronda + 3) * (duracionPulso(cfg, s.ronda) + .25) + .3;
  if (s.fase === 'muestra' && tiempo >= duracion) return { ...s, fase: 'entrada', indice: 0, tiempo: 0, restante: limiteRespuesta(cfg, s.ronda), ultimo: null };
  return { ...s, tiempo };
}
export function aplicarLeop(estado, partida) {
  if (partida.fase !== 'exito' || estado.leopCompletado) return estado;
  return { ...estado, bateria: Math.max(0, estado.bateria - (partida.gastado || 0)), leopCompletado: true, contactoTierra: true, puntuacionLeop: partida.puntos,
    decisiones: [...estado.decisiones, { tipo: 'bien', texto: t('e03.leop.leop_completed_attempts_wh_used', { v0: partida.falloAutomatico ? t('e03.leop.through_manual_recovery') : t('e03.leop.automatically'), v1: partida.intentos || 0, v2: Math.round(partida.gastado || 0) }) }] };
}

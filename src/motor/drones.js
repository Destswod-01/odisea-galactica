import { t } from '../i18n/idioma.js';
import { ajusteMinijuego } from './dificultad.js';
// Variante educativa: LRO y Juno reales no desplegaron estos drones.
export const cantidadDrones = diseno => Math.max(0, Math.min(4, Math.floor(Number(diseno.drones) || 0)));
// Familia ASTRION-M: el dron de índice i es tipos[i]. LRO (Luna) y Juno (Júpiter) llevan equipos distintos.
export const TIPOS_DRONES = { lro: ['M1', 'M2', 'M4', 'M7'], juno: ['M1', 'M3', 'M7', 'M6'] };
const SONDAS_VALIDAS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];
// Con `diseno`, las casillas elegidas en el taller de sondas (diseno.sondas) mandan; las demás usan el equipo por defecto de la misión.
export const tiposDrones = (mision, diseno) => {
  const base = TIPOS_DRONES[mision?.id === 'juno' ? 'juno' : 'lro'], el = diseno?.sondas;
  return Array.isArray(el) ? base.map((t, i) => SONDAS_VALIDAS.includes(el[i]) ? el[i] : t) : base;
};
// Sonda de la etapa 05: la de la primera casilla de la bahía (M4 si no hay drones a bordo).
export const sondaEncuentro = (diseno, mision) => cantidadDrones(diseno || {}) > 0 ? tiposDrones(mision, diseno)[0] : 'M4';
// Sonda de la etapa 06 (inserción en órbita): la orbital M1 si va en la bahía; si no, la primera casilla (M1 sin drones).
export const sondaInsercion = (diseno, mision) => { const n = cantidadDrones(diseno || {}), l = tiposDrones(mision, diseno).slice(0, n); return l.includes('M1') ? 'M1' : l[0] || 'M1'; };
// Qué aporta cada tipo en cada destino (texto educativo; no cambia la física del juego).
export const APORTE_DRON = {
  lro: {
    M1: 'Orbita la Luna y mapea la superficie con sus sensores, como un pequeño observatorio.',
    M2: 'Se posa en el suelo lunar para analizar el regolito y las rocas de cerca.',
    M4: 'Da saltos cortos en baja gravedad: la Luna deja explorar cráteres sin rodar ni hundirse.',
    M7: 'Relé: enlaza a los demás drones con la nodriza para que los datos lleguen a casa.'
  },
  juno: {
    M1: 'Orbita Júpiter y mide su campo magnético y la radiación que lo rodea.',
    M3: 'Desciende bajo un paracaídas y mide temperatura y presión de la atmósfera al caer.',
    M7: 'Relé: enlaza a los demás drones con la nodriza a través de la radiación de Júpiter.',
    M6: 'Perfora y toma muestras bajo la superficie de una luna helada del sistema joviano.'
  }
};
export const aporteDron = (mision, tipo) => t(`e04.aporte.${mision?.id === 'juno' ? 'juno' : 'lro'}.${tipo}`, null, APORTE_DRON[mision?.id === 'juno' ? 'juno' : 'lro'][tipo] || '');
export const EQUIPO_DRON = { masa_kg: 12, costo_musd: 2, potencia_w: .5 };
// La dificultad (B11) agranda o achica el radio de llegada al objetivo.
export function configurarDrones(mision) { return { radio: mision.id === 'juno' ? 3.8 : 3.1, mu: mision.id === 'juno' ? 110 : 80, orbita: 10, tolerancia: (mision.id === 'juno' ? .55 : .8) * ajusteMinijuego(mision).tolerancia, textura: mision.id === 'juno' ? 'jupiter' : 'moon', nombre: mision.id === 'juno' ? t('e04.drones.jupiter') : t('e04.drones.moon') }; }
const girar = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
export function lanzarDron(cfg, posicion, angulo, fuerza) {
  const a = angulo * Math.PI / 180, impulso = fuerza / 100 * 2;
  const p = girar(cfg.orbita, 0, posicion), v = girar(-Math.cos(a) * impulso, Math.sqrt(cfg.mu / cfg.orbita) + Math.sin(a) * impulso, posicion);
  return { ...p, vx: v.x, vy: v.y, tiempo: 0, camino: [[p.x, p.y]], resultado: null };
}
export const RADIO_CHOQUE = .35, FUERZA_MIN = 10, FUERZA_MAX = 100, FUERZA_REFERENCIA = 50;
// Dron insertado en órbita circular, mismo sentido de giro que la nodriza (antihorario): v = √(mu/r), ω = √(mu/r³).
export const orbitarDron = (cfg, dron, indice, reloj) => { const r = Math.hypot(dron.x, dron.y); return { indice, x: dron.x, y: dron.y, r, angulo0: Math.atan2(dron.y, dron.x), t0: reloj, omega: Math.sqrt(cfg.mu / r ** 3) }; };
export function posicionDronOrbital(d, tiempo) { const a = d.angulo0 + d.omega * (tiempo - d.t0); return { x: d.r * Math.cos(a), y: d.r * Math.sin(a) }; }
// obstaculos: drones en órbita; reloj0: reloj de juego en el instante de la liberación (el choque se mide en el mismo instante).
export function integrarDron(s, dt, cfg, objetivo = null, obstaculos = [], reloj0 = 0) {
  if (s.resultado) return s;
  const n = { ...s, camino: [...s.camino] }, pasos = Math.max(1, Math.ceil(dt / .008)), h = dt / pasos;
  for (let i = 0; i < pasos; i++) {
    const r = Math.hypot(n.x, n.y), ax = -cfg.mu * n.x / r ** 3, ay = -cfg.mu * n.y / r ** 3;
    n.x += n.vx * h + ax * h * h / 2; n.y += n.vy * h + ay * h * h / 2;
    const r2 = Math.hypot(n.x, n.y);
    n.vx += (ax - cfg.mu * n.x / r2 ** 3) * h / 2; n.vy += (ay - cfg.mu * n.y / r2 ** 3) * h / 2; n.tiempo += h;
    const choque = obstaculos.find(o => { const p = posicionDronOrbital(o, reloj0 + n.tiempo); return Math.hypot(n.x - p.x, n.y - p.y) <= RADIO_CHOQUE; });
    if (r2 <= cfg.radio + .12) n.resultado = 'impacto';
    else if (choque) { n.resultado = 'choque'; n.choqueCon = choque.indice; }
    else if (objetivo && Math.hypot(n.x - objetivo.x, n.y - objetivo.y) <= cfg.tolerancia) n.resultado = 'objetivo';
    else if (r2 > 19 || n.tiempo >= 13) n.resultado = 'fuera';
    if (n.resultado) break;
  }
  n.camino.push([n.x, n.y]); return n;
}
export function objetivoDron(cfg, indice) {
  let n = lanzarDron(cfg, Math.PI + indice * .85, [-25, -50, -10, -38][indice % 4], [55, 72, 42, 65][indice % 4]);
  for (let t = 0; t < 60; t++) n = integrarDron(n, .05, cfg);
  return { x: n.x, y: n.y };
}
export function predecirDron(cfg, indice, angulo, fuerza) {
  const objetivo = objetivoDron(cfg, indice); let n = lanzarDron(cfg, Math.PI + indice * .85, angulo, fuerza);
  for (let i = 0; i < 270 && !n.resultado; i++) n = integrarDron(n, .05, cfg, objetivo);
  return n;
}
// Tramo inicial visible de la trayectoria: baja con el nivel para que haya que imaginar el resto.
export const largoPrevision = (mision, indice) => mision.id === 'juno' ? Math.max(.5, 1.2 - .25 * indice) : Math.max(.7, 1.6 - .3 * indice);
export function previsionCorta(cfg, indice, angulo, fuerza, segundos) {
  let n = lanzarDron(cfg, Math.PI + indice * .85, angulo, fuerza);
  for (let t = 0; t < segundos - 1e-9 && !n.resultado; t += .05) n = integrarDron(n, Math.min(.05, segundos - t), cfg);
  return n.camino;
}
// Rango de fuerza (10–100, paso 1) que toca el aro con ese ángulo, sin obstáculos: el tramo contiguo más cercano al centro de la barra.
const cacheZona = new Map();
export function zonaImpulso(cfg, indice, angulo) {
  // Memoria pequeña por (destino, índice, ángulo): la búsqueda cuesta ~40 ms y se repite al arrastrar.
  const clave = `${cfg.textura}|${indice}|${angulo}`;
  if (cacheZona.has(clave)) return cacheZona.get(clave);
  const zona = calcularZona(cfg, indice, angulo);
  if (cacheZona.size >= 400) cacheZona.clear();
  cacheZona.set(clave, zona); return zona;
}
function calcularZona(cfg, indice, angulo) {
  let mejor = null, ini = null;
  for (let f = FUERZA_MIN; f <= FUERZA_MAX + 1; f++) {
    const ok = f <= FUERZA_MAX && predecirDron(cfg, indice, angulo, f).resultado === 'objetivo';
    if (ok && ini === null) ini = f;
    if (!ok && ini !== null) { const centro = Math.floor((ini + f - 1) / 2); if (!mejor || Math.abs(centro - 55) < Math.abs(mejor.centro - 55)) mejor = { centro, mitad: (f - 1 - ini) / 2 }; ini = null; }
  }
  return mejor;
}
// Zona verde MOSTRADA y velocidad de la barra: dependen del nivel, no de la física real.
export const anchoZona = (mision, indice) => mision.id === 'juno' ? Math.max(3, 9 - 2.5 * indice) : Math.max(4, 12 - 3 * indice);
export const velocidadBarra = (mision, indice) => mision.id === 'juno' ? 75 + 20 * indice : 60 + 15 * indice;
export const fuerzaDetenida = (s, mision) => s.zona && Math.abs(s.barra - s.zona.centro) <= anchoZona(mision, s.indice) ? s.zona.centro : s.barra;
export const costoDron = fuerza => 8 + fuerza * .12;
export const margenDrones = (s, m) => Math.max(0, s.dv - m.dv_requerida_ms);
export function crearDrones(estado, diseno) {
  const total = cantidadDrones(diseno);
  return { fase: total ? 'guia' : 'sinequipo', total, sondas: Array.isArray(diseno?.sondas) ? [...diseno.sondas] : null, disponibles: total, indice: 0, colocados: [], perdidos: 0, angulo: 0, fuerza: 35, dv: estado.dvRestante, bateria: estado.bateria, bateriaMax: estado.bateriaMax, vuelo: null, posicion: Math.PI, movimiento: 0, faseAntes: null, registro: [], reloj: 0, subfase: 'angulo', barra: FUERZA_MIN, sentidoBarra: 1, zona: null, choque: null };
}
export function pasoDrones(s, a, ctx) {
  const cfg = configurarDrones(ctx.mision);
  if (a.tipo === 'entendido' && s.fase === 'guia') return { ...s, fase: 'plan' };
  if (a.tipo === 'ajustar' && s.fase === 'plan' && s.subfase === 'angulo') return { ...s, angulo: Math.max(-85, Math.min(85, a.angulo ?? s.angulo)), fuerza: Math.max(FUERZA_MIN, Math.min(FUERZA_MAX, a.fuerza ?? s.fuerza)) };
  // Espacio: fija el ángulo y, en la segunda pulsación, libera. Una sola acción por pulsación.
  if (a.tipo === 'espacio' && s.fase === 'plan') return pasoDrones(s, { tipo: s.subfase === 'impulso' ? 'lanzar' : 'fijarAngulo' }, ctx);
  if (a.tipo === 'fijarAngulo' && s.fase === 'plan' && s.subfase === 'angulo' && s.disponibles > 0) {
    const zona = zonaImpulso(cfg, s.indice, s.angulo);
    return zona ? { ...s, subfase: 'impulso', zona, barra: FUERZA_MIN, sentidoBarra: 1 } : s;
  }
  if (a.tipo === 'cambiarAngulo' && s.fase === 'plan' && s.subfase === 'impulso') return { ...s, subfase: 'angulo', zona: null };
  if (a.tipo === 'lanzar' && s.fase === 'plan' && s.disponibles > 0) {
    // Con la barra en marcha, la fuerza es donde se detuvo (o el centro exacto si cayó en la zona verde).
    const fuerza = s.subfase === 'impulso' ? fuerzaDetenida(s, ctx.mision) : s.fuerza;
    const costo = costoDron(fuerza), energia = s.bateriaMax * .015;
    if (margenDrones(s, ctx.mision) < costo || s.bateria < energia) return s;
    return { ...s, fase: 'vuelo', subfase: 'angulo', zona: null, fuerza, disponibles: s.disponibles - 1, dv: s.dv - costo, bateria: s.bateria - energia, vuelo: { ...lanzarDron(cfg, s.posicion, s.angulo, fuerza), reloj0: s.reloj }, registro: [...s.registro, t('e04.drones.deployment_m_s_and_wh', { v0: costo.toFixed(1), v1: Math.round(energia) })] };
  }
  if (a.tipo === 'pausar' && ['vuelo', 'avance'].includes(s.fase)) return { ...s, faseAntes: s.fase, fase: 'pausa' };
  if (a.tipo === 'reanudar' && s.fase === 'pausa') return { ...s, fase: s.faseAntes, faseAntes: null };
  if (a.tipo === 'siguiente' && s.fase === 'resultado') {
    if (!s.disponibles) return { ...s, fase: 'fin' };
    return s.vuelo.resultado === 'objetivo' ? { ...s, fase: 'avance', movimiento: 0 } : { ...s, fase: 'plan', vuelo: null, choque: null, subfase: 'angulo' };
  }
  if (a.tipo === 'terminar' && ['plan', 'sinequipo'].includes(s.fase)) return { ...s, fase: 'fin' };
  if (a.tipo !== 'tiempo' || !['vuelo', 'avance', 'plan'].includes(s.fase)) return s;
  const dt = Math.max(0, Math.min(.1, a.dt)), reloj = s.reloj + dt;
  if (s.fase === 'plan') {
    if (s.subfase !== 'impulso') return { ...s, reloj };
    // La barra rebota entre 10 y 100.
    let barra = s.barra + s.sentidoBarra * velocidadBarra(ctx.mision, s.indice) * dt, sentidoBarra = s.sentidoBarra;
    if (barra > FUERZA_MAX) { barra = 2 * FUERZA_MAX - barra; sentidoBarra = -1; }
    if (barra < FUERZA_MIN) { barra = 2 * FUERZA_MIN - barra; sentidoBarra = 1; }
    return { ...s, reloj, barra, sentidoBarra };
  }
  if (s.fase === 'avance') {
    const movimiento = Math.min(1, s.movimiento + dt / 1.6), posicion = Math.PI + (s.indice + movimiento) * .85;
    return { ...s, reloj, movimiento, posicion, ...(movimiento === 1 ? { fase: 'plan', indice: s.indice + 1, angulo: 0, fuerza: 35, vuelo: null, subfase: 'angulo' } : {}) };
  }
  const vuelo = integrarDron(s.vuelo, dt, cfg, objetivoDron(cfg, s.indice), s.colocados, s.vuelo.reloj0);
  if (!vuelo.resultado) return { ...s, vuelo, reloj };
  const tipo = tiposDrones(ctx.mision, { sondas: s.sondas })[s.indice] || 'M1', instante = vuelo.reloj0 + vuelo.tiempo, base = { ...s, vuelo, reloj: instante, fase: 'resultado' };
  if (vuelo.resultado === 'objetivo') return { ...base, colocados: [...s.colocados, { ...orbitarDron(cfg, vuelo, s.indice, instante), tipo }], registro: [...s.registro, t('e04.drones.drone_astrion_in_position_observation_point', { v0: s.indice + 1, v1: tipo })] };
  if (vuelo.resultado === 'choque') {
    const otro = s.colocados.find(c => c.indice === vuelo.choqueCon);
    return { ...base, colocados: s.colocados.filter(c => c !== otro), perdidos: s.perdidos + 2, choque: { x: vuelo.x, y: vuelo.y, con: vuelo.choqueCon, n: (s.choque?.n || 0) + 1 }, registro: [...s.registro, t('e04.drones.collision_drone_astrion_hit_drone_in', { v0: s.indice + 1, v1: tipo, v2: vuelo.choqueCon + 1, v3: otro?.tipo ? ` (ASTRION-${otro.tipo})` : '' })] };
  }
  return { ...base, perdidos: s.perdidos + 1, registro: [...s.registro, t('e04.drones.drone_astrion_lost_spent_fuel_cannot', { v0: s.indice + 1, v1: tipo })] };
}
export function aplicarDrones(e, s) {
  if (s.fase !== 'fin' || e.dronesCompletados) return e;
  return { ...e, bateria: s.bateria, dvRestante: s.dv, dronesCompletados: true, dronesDesplegados: s.colocados.length, dronesPerdidos: s.perdidos, dronesRestantes: s.disponibles, puntuacionCrucero: s.colocados.length * 1000,
    decisiones: [...e.decisiones, ...s.registro.map(texto => ({ tipo: 'info', texto })), { tipo: 'info', texto: t('e04.drones.experimental_network_drones_in_position_lost', { v0: s.colocados.length, v1: s.total, v2: s.perdidos, v3: s.disponibles }) }] };
}

// Recursos del hangar: cuánto se gasta, cuánto se tiene y qué límites marca el archivo de métricas.
// Solo LEE datos: no cambia el diseño ni el balance del juego. Funciones puras.
import metricas from '../datos/metrics/metricas_exploracion.json';
import catalogoNodrizas from '../datos/nodrizas.json';
import { cantidadDrones, EQUIPO_DRON } from './drones.js';
import { t } from '../i18n/idioma.js';

// Misión del juego → destino del archivo de métricas.
export const DESTINO_DE_MISION = { lro: 'luna', juno: 'jupiter' };
export const TOPE_DRONES_DISENO = 4; // el mismo tope que cantidadDrones() en drones.js
export const SLOTS_POR_DRON = 1; // ASTRION-M ocupa 1 slot de la bahía (dron_orbital_micro, rover y helicóptero: slots 1)
export const NODRIZA_POR_DEFECTO = 'astrion_x';

export const listaNodrizas = () => catalogoNodrizas.modelos.map(m => ({ id: m.id, codigo: m.codigo, nombre: m.nombre }));

// Límites de una nodriza: bahía, potencia, Δv y veredicto por destino.
export function limitesNodriza(id) {
  const modelo = catalogoNodrizas.modelos.find(m => m.id === id) || catalogoNodrizas.modelos[0];
  const nave = metricas.naves.find(n => n.id === modelo.id) || null;
  const slots = modelo.metricas.bahia_slots;
  return {
    id: modelo.id, codigo: modelo.codigo, nombre: modelo.nombre,
    slots,
    maxDrones: Math.min(TOPE_DRONES_DISENO, Math.floor(slots / SLOTS_POR_DRON)),
    potencia_w: modelo.metricas.potencia_w,
    delta_v_ms: modelo.metricas.delta_v_ms,
    blindaje_rad: modelo.metricas.blindaje_rad,
    enlace_gbps: modelo.metricas.enlace_gbps,
    cargaUtilKg: nave?.carga_util_kg ?? null,
    viabilidad: nave?.viabilidad ?? {},
    potenciaRealista: nave?.energia_realista?.potencia_w ?? null,
  };
}

export const requisitosDestino = misionId =>
  metricas.destinos.find(d => d.id === DESTINO_DE_MISION[misionId])?.requisitos_minimos_nave || null;

const fraccion = (usado, disponible) => (disponible > 0 ? usado / disponible : usado > 0 ? 1 : 0);

// Filas del panel de recursos del hangar. `resumen` viene de resumenNave() (no se recalcula nada).
// Adaptado al juego (14 nov): la nave es la que arma el jugador, no una nodriza ASTRION. La bahía usa el tope y los
// pesos del propio juego (cantidadDrones / EQUIPO_DRON) y los requisitos del destino del archivo de métricas son una
// REFERENCIA REAL contra el diseño del jugador: informan, no bloquean el lanzamiento (el balance lo decide nave.js).
export function recursosHangar({ resumen, mision, diseno, progreso }) {
  const b = resumen.barras;
  const fila = (id, nombre, unidad, detalle, usado, disponible, ok, soloAviso = false) =>
    ({ id, nombre, unidad, detalle, usado, disponible, ok, soloAviso, fraccion: fraccion(usado, disponible) });
  const filas = [
    fila('costo', t('recursos.fila.costo'), 'M USD', t('recursos.fila.costo.detalle'), b.costo.valor, b.costo.limite, b.costo.ok),
    fila('masa', t('recursos.fila.masa'), 'kg', t('recursos.fila.masa.detalle'), b.masa.valor, b.masa.limite, b.masa.ok),
    fila('energia', t('recursos.fila.energia'), 'W', t('recursos.fila.energia.detalle'), b.energia.limite, b.energia.valor, b.energia.ok),
    fila('dv', t('recursos.fila.dv'), 'm/s', t('recursos.fila.dv.detalle'), b.dv.limite, b.dv.valor, b.dv.ok),
    fila('datos', t('recursos.fila.datos'), t('hangar.unidad.mbitDia'), t('recursos.fila.datos.detalle'), b.datos.valor, b.datos.limite, b.datos.ok, true),
  ];

  const n = cantidadDrones(diseno);
  const drones = {
    usados: n,
    maximo: TOPE_DRONES_DISENO,
    masa_kg: n * EQUIPO_DRON.masa_kg,
    costo_musd: n * EQUIPO_DRON.costo_musd,
    potencia_w: n * EQUIPO_DRON.potencia_w,
    ok: n <= TOPE_DRONES_DISENO,
  };

  // Referencia real del destino contra la nave del jugador (solo las magnitudes que el diseño sí calcula).
  const req = requisitosDestino(mision.id);
  const referencia = req ? [
    { id: 'potencia', nombre: t('recursos.ref.potencia'), unidad: 'W', requerido: req.potencia_w, tienes: b.energia.valor, ok: b.energia.valor >= req.potencia_w },
    { id: 'dv', nombre: t('recursos.ref.dv'), unidad: 'm/s', requerido: req.dv_total_ms, tienes: b.dv.valor, ok: b.dv.valor >= req.dv_total_ms },
  ] : [];

  // B3: recurso Tiempo (meses de desarrollo contra el plazo). Va aparte de `filas`: se muestra aunque las barras estén ocultas.
  const tiempo = b.tiempo && b.tiempo.limite != null
    ? { id: 'tiempo', nombre: t('sistemas.tiempo.nombre'), unidad: t('sistemas.tiempo.unidad'), detalle: t('sistemas.tiempo.detalle'), usado: b.tiempo.valor, disponible: b.tiempo.limite, ok: b.tiempo.ok, cuello: b.tiempo.cuello }
    : null;

  return {
    filas,
    tiempo,
    fondos: progreso?.fondos ?? null,
    drones,
    referencia,
    destino: metricas.destinos.find(d => d.id === DESTINO_DE_MISION[mision.id])?.nombre || null,
    base: req?.base || null,
  };
}

// Un renglón por destino del archivo de métricas: veredicto de la nodriza y potencia real contra la mínima.
const CLAVE_POTENCIA = { luna: 'luna_dia', marte: 'marte', jupiter: 'jupiter' };
export function resumenDestinos(nodrizaId) {
  const nodriza = limitesNodriza(nodrizaId);
  return metricas.destinos.map(d => {
    const real = nodriza.potenciaRealista?.[CLAVE_POTENCIA[d.id]];
    const requerida = d.requisitos_minimos_nave.potencia_w;
    return {
      id: d.id, nombre: d.nombre,
      veredicto: nodriza.viabilidad[d.id]?.veredicto || null,
      motivos: nodriza.viabilidad[d.id]?.motivos || [],
      potencia_w: typeof real === 'number' ? real : null,
      requerida_w: requerida,
      ok: typeof real === 'number' ? real >= requerida : null,
    };
  });
}
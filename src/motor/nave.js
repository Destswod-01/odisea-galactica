import { cantidadDrones, EQUIPO_DRON } from './drones.js';
import { t } from '../i18n/idioma.js';
import { aplicarOrbita } from './orbita.js';
import { resolverSistemas, sistemasElegidos, bateriaWh, almacenamiento, apuntado, SISTEMAS } from './sistemas.js';
import { tiempoDesarrollo } from './tiempo.js';
// Motor de la nave: calcula los 5 presupuestos del hangar a partir de un diseño.
// Funciones puras: misma entrada → misma salida. La interfaz nunca calcula nada.

export const G0 = 9.80665; // gravedad estándar (m/s²) de la ecuación del cohete

// Diseño = { energia, antena, blindaje, propulsion, cohete, instrumentos: [ids] }
export function piezasDelDiseno(diseno, piezas) {
  const porId = (id) => piezas.find((p) => p.id === id);
  const unicas = [diseno.energia, diseno.antena, diseno.blindaje, diseno.propulsion].map(porId).filter(Boolean);
  const instrumentos = (diseno.instrumentos || []).map(porId).filter(Boolean);
  return { unicas, instrumentos, todas: [...unicas, ...instrumentos] };
}

// Energía generada a una distancia d (UA). Solar: cae con 1/d². RTG: fija.
export function generacionW(energia, d, degradacion = 1) {
  if (!energia) return 0;
  if (energia.genera_w_fijo) return energia.genera_w_fijo;
  return (energia.genera_w_1ua / (d * d)) * degradacion;
}

// Calefactores: más lejos del Sol = más frío. Con RTG no hacen falta (su calor residual basta).
export function calefactoresW(d, mision, energia) {
  if (energia?.sin_calefactores) return 0;
  const { desde_ua, w_por_ua } = mision.calefactores;
  return d <= desde_ua ? 0 : w_por_ua * (d - desde_ua);
}

// Consumo con un conjunto de instrumentos encendidos (por defecto, todos).
export function consumoW(diseno, piezas, mision, d, encendidos = null) {
  const { instrumentos, unicas } = piezasDelDiseno(diseno, piezas);
  const energia = unicas.find((p) => p.categoria === 'energia');
  const antena = unicas.find((p) => p.categoria === 'antena');
  const activos = encendidos ? instrumentos.filter((i) => encendidos.includes(i.id)) : instrumentos;
  return (
    mision.bus.consumo_w + cantidadDrones(diseno) * EQUIPO_DRON.potencia_w +
    activos.reduce((s, i) => s + (i.potencia_w || 0), 0) +
    calefactoresW(d, mision, energia) +
    (antena?.potencia_w || 0) +
    sistemasElegidos(resolverSistemas(diseno, piezas, mision)).reduce((s, p) => s + (p.potencia_w || 0), 0)
  );
}

// Enlace de datos: también cae con 1/d².
export function enlaceMbitDia(antena, d) {
  return antena ? antena.enlace_mbit_dia_1ua / (d * d) : 0;
}

// Ecuación del cohete de Tsiolkovsky: Δv = Isp · g0 · ln(m_húmeda / m_seca)
export function deltaV(isp, masaHumeda, masaSeca) {
  if (masaSeca <= 0 || masaHumeda <= masaSeca) return 0;
  return isp * G0 * Math.log(masaHumeda / masaSeca);
}

// Ciencia: cobertura de cada objetivo según los instrumentos (0..1 ponderado).
export function coberturaCiencia(instrumentos, mision, habilitado = new Set()) {
  const porObjetivo = mision.objetivos.map((o) => {
    const aporte = instrumentos
      .filter((i) => !i.requiere || habilitado.has(i.requiere))
      .reduce((s, i) => s + (i.ciencia?.[o.id] || 0), 0);
    return { ...o, aporte, cobertura: Math.min(1, aporte / o.requerido) };
  });
  const total = porObjetivo.reduce((s, o) => s + o.peso * o.cobertura, 0);
  return { porObjetivo, total };
}

// Resumen completo para el hangar: las barras y la validación.
export function resumenNave(diseno, piezas, cohetes, mision) {
  const { unicas, instrumentos, todas } = piezasDelDiseno(diseno, piezas);
  const energia = unicas.find((p) => p.categoria === 'energia');
  const antena = unicas.find((p) => p.categoria === 'antena');
  const tanque = unicas.find((p) => p.categoria === 'propulsion');
  const cohete = cohetes.find((c) => c.id === diseno.cohete);
  const d = mision.destino.distancia_ua;

  // Batería, computadora y orientación (B3): solo cobran lo que el jugador elige; lo automático ya viene en la plataforma.
  const sistemas = resolverSistemas(diseno, piezas, mision);
  const extras = sistemasElegidos(sistemas);
  const masaSeca = mision.bus.masa_kg + todas.reduce((s, p) => s + p.masa_kg, 0) + extras.reduce((s, p) => s + p.masa_kg, 0) + cantidadDrones(diseno) * EQUIPO_DRON.masa_kg;
  const propelente = tanque?.propelente_kg || 0;
  const masaTotal = masaSeca + propelente;
  const costo =
    mision.bus.costo_musd + mision.operaciones_musd + todas.reduce((s, p) => s + p.costo_musd, 0) + extras.reduce((s, p) => s + p.costo_musd, 0) + (cohete?.costo_musd || 0) + cantidadDrones(diseno) * EQUIPO_DRON.costo_musd;

  const generacion = generacionW(energia, d, mision.degradacion_paneles);
  const consumo = consumoW(diseno, piezas, mision, d);
  const datosGenerados = instrumentos.reduce((s, i) => s + (i.datos_mbit_dia || 0), 0);
  const dv = deltaV(mision.isp_nave_s, masaTotal, masaSeca);

  const habilitado = new Set(todas.map((p) => p.habilita).filter(Boolean));
  // La órbita elegida mueve la ciencia, el enlace y el Δv que hace falta (sin órbita en el diseño = la real, sin cambios).
  const orb = aplicarOrbita(mision, diseno, { dvRequerida: mision.dv_requerida_ms, enlace: enlaceMbitDia(antena, d), ciencia: coberturaCiencia(instrumentos, mision, habilitado) });
  const ciencia = orb.ciencia, enlace = orb.enlace;
  const factorDatos = datosGenerados === 0 ? 1 : Math.min(1, enlace / datosGenerados);
  const sinHabilitar = instrumentos.filter((i) => i.requiere && !habilitado.has(i.requiere));

  // La capacidad depende del destino: a la Luna se lleva más masa que a Júpiter.
  const capacidad = (cohete?.capacidad_kg || 0) * (mision.capacidad_mult || 1);
  const barras = {
    masa: { valor: masaTotal, limite: capacidad, ok: !!cohete && masaTotal <= capacidad },
    costo: { valor: costo, limite: mision.presupuesto_musd, ok: costo <= mision.presupuesto_musd },
    energia: { valor: generacion, limite: consumo, ok: !!energia && generacion >= consumo },
    dv: { valor: dv, limite: orb.dvRequerida, ok: dv >= orb.dvRequerida },
    // Datos solo advierte (no bloquea el lanzamiento): amarillo si generas más de lo que puedes transmitir.
    datos: { valor: datosGenerados, limite: enlace, ok: datosGenerados <= enlace, soloAviso: true },
    // Tiempo: meses de desarrollo (la cadena más larga, ver tiempo.js) contra el plazo de la misión.
    tiempo: tiempoDesarrollo([...todas, ...extras], mision),
  };

  const faltan = ['energia', 'antena', 'blindaje', 'propulsion'].filter((c) => !diseno[c]);
  for (const c of SISTEMAS) if (sistemas[c].falta) faltan.push(c); // solo en intermedio con diseño nuevo
  if (!diseno.cohete) faltan.push('cohete');
  if (instrumentos.length === 0) faltan.push('instrumentos');

  const problemas = [];
  if (faltan.length) problemas.push(t('hangar.problema.falta', { lista: faltan.map((c) => t(SISTEMAS.includes(c) ? `sistemas.falta.${c}` : `hangar.falta.${c}`)).join(', ') }));
  if (cohete && !barras.masa.ok) problemas.push(t('hangar.problema.masa', { masa: Math.round(masaTotal), cohete: cohete.nombre, cap: Math.round(capacidad), destino: mision.destino.nombre }));
  if (!barras.costo.ok) problemas.push(t('hangar.problema.costo', { n: Math.round(costo - mision.presupuesto_musd) }));
  if (energia && !barras.energia.ok) problemas.push(t('hangar.problema.energia', { destino: mision.destino.nombre, gen: Math.round(generacion), cons: Math.round(consumo) }));
  if (tanque && !barras.dv.ok) problemas.push(t('hangar.problema.dv', { dv: Math.round(dv), req: orb.dvRequerida }));
  if (!barras.tiempo.ok) problemas.push(t('sistemas.problema.tiempo', { n: barras.tiempo.valor, plazo: barras.tiempo.limite }));
  for (const i of sinHabilitar) problemas.push(t('hangar.problema.ka', { nombre: i.nombre }));

  return {
    masaSeca, propelente, masaTotal, costo, generacion, consumo,
    datosGenerados, enlace, factorDatos, dv, ciencia, barras, problemas, orbita: orb.orbita,
    // B3: sistemas efectivos, batería (Wh) para la misión, datos perdidos con/sin memoria y precisión de apuntado.
    sistemas, faltan, bateriaWh: bateriaWh(sistemas.bateria, mision),
    almacenamiento: almacenamiento(sistemas.computadora.pieza, datosGenerados, enlace),
    apuntado: apuntado(sistemas.orientacion.pieza),
    puedeLanzar: faltan.length === 0 && ['masa', 'costo', 'energia', 'dv', 'tiempo'].every((k) => barras[k].ok),
  };
}

// El diseño real de la misión, para comparar en el informe.
export function disenoReal(mision, piezas) {
  const ids = mision.real.piezas;
  const de = (cat) => ids.find((id) => piezas.find((p) => p.id === id)?.categoria === cat);
  return {
    energia: de('energia'), antena: de('antena'), blindaje: de('blindaje'), propulsion: de('propulsion'),
    cohete: mision.real.cohete,
    instrumentos: ids.filter((id) => piezas.find((p) => p.id === id)?.categoria === 'instrumento'),
  };
}

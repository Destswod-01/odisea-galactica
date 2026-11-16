// Motor de la misión: lanzamiento, crucero, inserción, operación y puntaje.
// Todo es puro: recibe el estado y devuelve uno nuevo. El azar entra por parámetro (`azar`).

import { t } from '../i18n/idioma.js';
import { orbitaReal } from './orbita.js';
import { coberturaCiencia, consumoW, generacionW, piezasDelDiseno } from './nave.js';

const HORAS_POR_TRAMO = 8; // horas que dura un déficit antes de que el control reaccione

// ---------- Estado inicial ----------
export function estadoInicial(resumen, mision, diseno) {
  return {
    // B3: la batería que el jugador eligió (Wh); sin elegir, la base de la misión.
    bateria: resumen.bateriaWh ?? mision.bateria_wh,
    bateriaMax: resumen.bateriaWh ?? mision.bateria_wh,
    salud: 100,
    // Δv que le queda a la nave para todo lo que no es el lanzamiento.
    dvRestante: resumen.dv,
    encendidos: [...diseno.instrumentos],
    modosSeguros: 0,
    orbitas: 0,
    orbitasMeta: mision.orbitas_meta,
    ciencia: 0, // 0..1 de la ciencia posible
    multDosis: 1,
    eficienciaLanzamiento: null,
    precisionInsercion: null,
    perdida: null, // motivo si la misión se pierde
    decisiones: [], // bitácora para el informe de causa → efecto
  };
}

const anotar = (e, texto, tipo = 'info') => ({ ...e, decisiones: [...e.decisiones, { texto, tipo }] });

// ---------- Lanzamiento (minijuego de etapas) ----------
// Cada etapa se suelta con una fracción de combustible restante (0..1) y unos segundos de retraso.
export const DV_ETAPA = { solidos: 600, primera: 1200 };
export const PERDIDA_POR_SEGUNDO = 25;

export function perdidaEtapa(etapa, combustibleRestante, segundosTarde) {
  return combustibleRestante * DV_ETAPA[etapa] + segundosTarde * PERDIDA_POR_SEGUNDO;
}

// Apagado de la etapa superior: error en m/s respecto a la velocidad objetivo.
// Quedarse corto lo paga la nave completo; pasarse obliga a corregir (mitad del error).
export function perdidaApagado(errorMs) {
  return errorMs < 0 ? -errorMs : errorMs * 0.5;
}

// resultados = { etapas: [{ etapa, combustible, tarde }], errorApagado, perdidaGuiado?, sobrecarga? }
export function aplicarLanzamiento(e, resultados) {
  const porEtapas = resultados.etapas.reduce((s, r) => s + perdidaEtapa(r.etapa, r.combustible, r.tarde), 0);
  const guiado = resultados.perdidaGuiado || 0;
  const total = porEtapas + guiado + perdidaApagado(resultados.errorApagado);
  const eficiencia = Math.max(0, 1 - total / 1000);
  let n = { ...e, dvRestante: e.dvRestante - total, eficienciaLanzamiento: eficiencia };
  if (guiado >= 20) n = anotar(n, t('informe.mision.guiado', { n: Math.round(guiado) }), 'mal');
  if (resultados.sobrecarga) {
    n = anotar({ ...n, salud: n.salud - 10 }, t('informe.mision.sobrecarga'), 'mal');
  }
  n = anotar(n, total < 20
    ? t('informe.mision.lanzOk')
    : t('informe.mision.lanzCosto', { n: Math.round(total) }), total < 20 ? 'bien' : 'mal');
  return n;
}

// ---------- Energía durante el crucero ----------
export function balanceW(e, diseno, piezas, mision, d) {
  const { unicas } = piezasDelDiseno(diseno, piezas);
  const energia = unicas.find((p) => p.categoria === 'energia');
  return generacionW(energia, d, mision.degradacion_paneles) - consumoW(diseno, piezas, mision, d, e.encendidos);
}

// Avanza un tramo del viaje a la distancia d: la batería sube o baja según el balance.
export function tramo(e, diseno, piezas, mision, d) {
  const balance = balanceW(e, diseno, piezas, mision, d);
  let bateria = Math.min(e.bateriaMax, e.bateria + balance * HORAS_POR_TRAMO);
  let n = { ...e, bateria };
  if (bateria <= 0) {
    n = { ...n, bateria: e.bateriaMax * 0.3, salud: n.salud - 5, modosSeguros: n.modosSeguros + 1, encendidos: [] };
    n = anotar(n, t('informe.mision.bateria', { d, balance: Math.round(balance) }), 'mal');
  }
  return n;
}

export function alternarInstrumento(e, id) {
  const encendidos = e.encendidos.includes(id) ? e.encendidos.filter((x) => x !== id) : [...e.encendidos, id];
  return { ...e, encendidos };
}

// ---------- Efectos de eventos ----------
export function aplicarEfectos(e, efectos = {}, texto, tipo) {
  let n = { ...e };
  if (efectos.bateria_wh) n.bateria = Math.max(0, Math.min(n.bateriaMax, n.bateria + efectos.bateria_wh));
  if (efectos.salud) n.salud = n.salud + efectos.salud;
  if (efectos.dv_ms) n.dvRestante = n.dvRestante + efectos.dv_ms;
  if (efectos.modo_seguro) n.modosSeguros = n.modosSeguros + efectos.modo_seguro;
  if (efectos.orbitas_extra) n.orbitasMeta = n.orbitasMeta + efectos.orbitas_extra;
  if (n.salud <= 0) n = { ...n, salud: 0, perdida: t('informe.mision.electronica') };
  return texto ? anotar(n, texto, tipo) : n;
}

// Maniobra de espacio profundo: el error se paga en propelente.
export function aplicarDsm(e, aplicadoMs, evento) {
  const error = Math.abs(aplicadoMs - evento.objetivo_ms);
  const extra = error <= evento.tolerancia_ms ? 0 : (error - evento.tolerancia_ms) * 1.5;
  return anotar({ ...e, dvRestante: e.dvRestante - extra },
    extra === 0 ? evento.resultado_ok : t('informe.mision.dsmMal', { texto: evento.resultado_mal, n: Math.round(extra) }), extra === 0 ? 'bien' : 'mal');
}

// ---------- Inserción orbital ----------
// Antes de llegar se gastaron (Δv requerida − Δv de inserción) en correcciones del viaje.
export function dvParaInsercion(e, mision) {
  return e.dvRestante - (mision.dv_requerida_ms - mision.dv_insercion_ms);
}

// eficiencia (0..1): frenar lejos del periapsis rinde menos (efecto Oberth). Se gasta `real`,
// pero lo que cuenta para la captura es `real × eficiencia`.
export function aplicarInsercion(e, mision, dvAplicada, eficiencia = 1) {
  const disponible = Math.max(0, dvParaInsercion(e, mision));
  const gastado = Math.min(dvAplicada, disponible);
  const real = gastado * eficiencia;
  const req = mision.dv_insercion_ms;
  const win = mision.ventana_insercion_ms;
  let n = { ...e, dvRestante: e.dvRestante - gastado };
  if (eficiencia < 0.9 && gastado > 0) n = anotar(n, t('informe.mision.oberth', { n: Math.round(eficiencia * 100) }), 'mal');
  let resultado;
  if (real < req - win) {
    resultado = 'escape';
    n = { ...n, perdida: gastado < dvAplicada ? t('informe.mision.sinPropelente') : t('informe.mision.insuficiente', { destino: mision.destino.nombre }) };
    n = anotar(n, n.perdida, 'mal');
  } else if (real > req + win) {
    resultado = 'baja';
    n = anotar({ ...n, multDosis: 1.3 }, t('informe.mision.baja'), 'mal');
  } else {
    resultado = 'captura';
    n = anotar(n, t('informe.mision.captura', { real: Math.round(real), req }), 'bien');
  }
  const precision = resultado === 'escape' ? 0 : Math.max(0, 1 - Math.abs(real - req) / (win * 3));
  return { estado: { ...n, precisionInsercion: precision }, resultado };
}

// ---------- Operación científica ----------
// aciertos (opcional): { objetivo: 0..1 } fracción de observaciones logradas Y enviadas a la Tierra en las
// pasadas científicas. Si viene, reemplaza al factor de datos (el envío ya se simuló en el minijuego).
export function bloqueOrbitas(e, diseno, piezas, mision, aciertos = null) {
  const { unicas, instrumentos } = piezasDelDiseno(diseno, piezas);
  const blindaje = unicas.find((p) => p.categoria === 'blindaje')?.blindaje || 0;
  const n0 = Math.min(mision.orbitas_por_bloque, e.orbitasMeta - e.orbitas);
  const dosis = mision.destino.dosis_base_orbita * (1 - blindaje) * e.multDosis * n0;
  const saludAntes = e.salud;
  const salud = saludAntes - dosis;

  const habilitado = new Set(unicas.map((p) => p.habilita).filter(Boolean));
  const activos = instrumentos.filter((i) => e.encendidos.includes(i.id));
  const cob = coberturaCiencia(activos, mision, habilitado);
  const datos = activos.reduce((s, i) => s + (i.datos_mbit_dia || 0), 0);
  const antena = unicas.find((p) => p.categoria === 'antena');
  const enlace = antena ? antena.enlace_mbit_dia_1ua / mision.destino.distancia_ua ** 2 : 0;
  const factorDatos = datos === 0 ? 1 : Math.min(1, enlace / datos);
  const saludMedia = Math.max(0, (saludAntes + Math.max(0, salud)) / 2) / 100;
  // Con salud < 30 los instrumentos fallan seguido: rinden la mitad.
  const penalFallas = salud < 30 ? 0.5 : 1;
  const rendimiento = aciertos
    ? cob.porObjetivo.reduce((s, o) => s + o.peso * o.cobertura * Math.min(1, aciertos[o.id] || 0), 0)
    : cob.total * factorDatos;
  const ganancia = rendimiento * saludMedia * penalFallas * (n0 / mision.orbitas_meta);

  let n = { ...e, salud: Math.max(0, salud), orbitas: e.orbitas + n0, ciencia: e.ciencia + ganancia };
  if (salud <= 0) n = anotar({ ...n, perdida: t('informe.mision.radiacion') }, t('informe.mision.radiacion'), 'mal');
  return { estado: n, dosis, ganancia };
}

// ---------- Puntaje ----------
export function puntaje(e, resumen, mision, opciones = {}) {
  const ciencia = Math.min(1, e.ciencia) * 50;
  const margen = (mision.presupuesto_musd - resumen.costo) / mision.presupuesto_musd;
  const presupuesto = Math.max(0, Math.min(15, (margen / 0.05) * 15));
  const salud = Math.max(0, (e.salud / 100) * 15 - 5 * e.modosSeguros);
  // Precisión de la llegada: la inserción orbital si se jugó; si no, la foto de la etapa 05 (puntuacionEncuentro = total × 10).
  const llegada = e.precisionInsercion ?? (e.puntuacionEncuentro != null ? Math.min(1, e.puntuacionEncuentro / 1000) : 0);
  const ejecucion = (((e.eficienciaLanzamiento ?? 0) + llegada) / 2) * 15;
  const reales = Math.min(5, (opciones.coincidenciasReales || 0) * 2 + (opciones.desorbito ? 1 : 0));
  const total = Math.round(ciencia + presupuesto + salud + ejecucion + reales);
  const medalla = total >= 95 ? 'Nivel JPL' : total >= 85 ? 'Oro' : total >= 70 ? 'Plata' : total >= 50 ? 'Bronce' : 'Sin medalla';
  return {
    total, medalla,
    partes: {
      ciencia: Math.round(ciencia), presupuesto: Math.round(presupuesto), salud: Math.round(salud),
      ejecucion: Math.round(ejecucion), reales: Math.round(reales),
    },
  };
}

// ---------- ¿Por qué salió así? (B6) ----------
// Un renglón por recurso con causa y efecto. Solo lee el resumen de la nave y el estado final; no inventa campos.
// → [{ recurso, nivel: 'bien'|'aviso'|'mal', clave, vars }]; el texto vive en porque.<clave> (src/i18n).
export function explicaciones(resumen, estado, mision) {
  const out = [];
  const poner = (recurso, nivel, vars = {}, variante = nivel) => out.push({ recurso, nivel, clave: `porque.${recurso}.${variante}`, vars });
  const b = resumen.barras || {};

  if (b.masa) {
    const uso = b.masa.limite > 0 ? b.masa.valor / b.masa.limite : Infinity;
    poner('masa', !b.masa.ok ? 'mal' : uso > 0.9 ? 'aviso' : 'bien',
      { masa: Math.round(b.masa.valor), cap: Math.round(b.masa.limite), pct: Math.round(uso * 100) });
  }
  if (b.costo) {
    const margen = (b.costo.limite - b.costo.valor) / b.costo.limite;
    poner('costo', !b.costo.ok ? 'mal' : margen < 0.05 ? 'aviso' : 'bien',
      { costo: Math.round(b.costo.valor), presupuesto: b.costo.limite, sobra: Math.round(b.costo.limite - b.costo.valor), n: Math.round(b.costo.valor - b.costo.limite) });
  }
  if (b.energia) {
    const vars = { gen: Math.round(b.energia.valor), cons: Math.round(b.energia.limite), destino: mision.destino.nombre, n: estado.modosSeguros || 0 };
    if (!b.energia.ok) poner('energia', 'mal', vars);
    else if (estado.modosSeguros > 0) poner('energia', 'mal', vars, 'modo');
    else poner('energia', b.energia.valor < b.energia.limite * 1.1 ? 'aviso' : 'bien', vars);
  }
  if (b.dv) {
    poner('dv', !b.dv.ok ? 'mal' : b.dv.valor < b.dv.limite * 1.05 ? 'aviso' : 'bien',
      { dv: Math.round(b.dv.valor), req: Math.round(b.dv.limite) });
  }
  if (b.datos) {
    const gen = b.datos.valor, enlace = b.datos.limite;
    const pct = gen > 0 ? Math.max(0, Math.round((1 - enlace / gen) * 100)) : 0;
    const vars = { enlace: Math.round(enlace * 10) / 10, datos: Math.round(gen * 10) / 10, pct };
    if (b.datos.ok) poner('datos', 'bien', vars);
    else poner('datos', pct <= 10 ? 'aviso' : 'mal', vars);
  }
  const alm = resumen.almacenamiento;
  if (alm && alm.deficit > 0) {
    const sin = Math.round(alm.perdidaSin * 100), con = Math.round(alm.perdidaCon * 100);
    poner('almacenamiento', alm.gbit > 0 && con <= 5 ? 'bien' : 'aviso', { sin, con, gbit: alm.gbit }, alm.gbit > 0 ? (con <= 5 ? 'bien' : 'aviso') : 'sin');
  }
  const salud = Math.round(estado.salud ?? 0);
  poner('salud', salud >= 70 ? 'bien' : salud >= 30 ? 'aviso' : 'mal', { salud, n: estado.modosSeguros || 0 });
  if (b.tiempo && b.tiempo.limite != null) {
    poner('tiempo', b.tiempo.ok ? 'bien' : 'mal', { meses: b.tiempo.valor, plazo: b.tiempo.limite });
  }
  if (resumen.orbita?.nombre) {
    const real = orbitaReal(mision);
    poner('orbita', !real || resumen.orbita.id === real.id ? 'bien' : 'aviso', { orbita: resumen.orbita.nombre });
  }
  const ciencia = Math.round(Math.min(1, estado.ciencia ?? 0) * 100);
  poner('ciencia', ciencia >= 80 ? 'bien' : ciencia >= 50 ? 'aviso' : 'mal', { pct: ciencia });
  return out;
}

// Etapa 08 «Decisiones de misión» — estilo Reigns (4 barras: energía, térmica, propelente, ciencia + cartas izquierda/derecha y disposición final real).
// Motor puro (sin React) y determinista. Reutiliza los textos reales de e08.carta.*, e08.final.* y e08.epilogo.*.
import { t } from '../i18n/idioma.js';
import { EPILOGOS, FINALES } from './extendida08.js';

export const BARRAS_REIGNS = ['energia', 'termica', 'propelente', 'ciencia'];

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const destinoDe = m => (m?.destino?.id === 'jupiter' || m?.id === 'juno' ? 'jupiter' : 'luna');

// Convierte la decisión histórica del JSON de la misión en la carta 0 del mazo.
function cartaRealReigns(mision, destino) {
  const ev = (mision?.eventos || []).find(e => e.tipo === 'decision_final');
  if (!ev) return null;
  return {
    id: `real_${ev.id}`,
    icono: '🛰️',
    // La correcta de la carta histórica es la opción que eligió la NASA (real: true).
    correcta: Math.max(0, ev.opciones.slice(0, 2).findIndex(o => o.real)),
    etiqueta: 'e08.reigns.cat.historica',
    titulo: ev.titulo,
    texto: ev.texto,
    opciones: ev.opciones.slice(0, 2).map(o => {
      if (o.real) {
        return {
          texto: o.texto,
          consecuencia: o.resultado || o.resultado_ok || '',
          vidaReal: o.resultado || '',
          real: true,
          deltas: { energia: 4, termica: 4, propelente: 6, ciencia: 10 },
        };
      }
      return {
        texto: o.texto,
        consecuencia: o.resultado_ok || o.resultado_mal || '',
        vidaReal: 'La NASA eligió otra opción para proteger la nave a largo plazo.',
        real: false,
        deltas: destino === 'luna'
          ? { energia: -6, termica: -4, propelente: -22, ciencia: 18 }
          : { energia: -10, termica: -16, propelente: -14, ciencia: 18 },
      };
    }),
  };
}

const CARTAS_EVENTO = {
  eclipse: {
    id: 'eclipse', icono: '🌑', clave: 'e08.reigns.carta.eclipse',
    // correcta: 0 · En un eclipse largo los controladores sacrifican ciencia para mantener baterías y calefactores de supervivencia.
    correcta: 0,
    deltas: [
      { energia: 14, termica: -16, propelente: 0, ciencia: -8 },
      { energia: -20, termica: 12, propelente: 0, ciencia: 10 },
    ],
  },
  tormenta: {
    id: 'tormenta', icono: '☀️', clave: 'e08.reigns.carta.tormenta',
    // correcta: 0 · Ante una tormenta solar se pone la nave en modo seguro y se protege la electrónica, aunque se pierda ciencia.
    correcta: 0,
    deltas: [
      { energia: 8, termica: 12, propelente: -6, ciencia: -10 },
      { energia: -12, termica: -20, propelente: 0, ciencia: 18 },
    ],
  },
  micro: {
    id: 'micro', icono: '🪨', clave: 'e08.reigns.carta.micro',
    // correcta: 1 · El propelente es finito y no se recarga: tras una perturbación pequeña se recupera el apuntado con ruedas de reacción y paciencia.
    correcta: 1,
    deltas: [
      { energia: 0, termica: 8, propelente: -18, ciencia: 6 },
      { energia: -14, termica: -12, propelente: 4, ciencia: -4 },
    ],
  },
  presupuesto: {
    id: 'presupuesto', icono: '🏛️', clave: 'e08.reigns.carta.presupuesto',
    // correcta: 0 · Las operaciones de más riesgo solo se aprueban si la nave está sana: primero se cuida el activo, después se pide más ciencia (juicio debatible).
    correcta: 0,
    deltas: [
      { energia: 10, termica: 10, propelente: 6, ciencia: -10 },
      { energia: -12, termica: -10, propelente: -8, ciencia: 18 },
    ],
  },
  viejo: {
    id: 'viejo', icono: '📻', clave: 'e08.carta.viejo',
    // correcta: 0 · Apagar instrumentos veteranos para estirar la energía es práctica común (Voyager).
    correcta: 0,
    deltas: [
      { energia: 18, termica: 8, propelente: 0, ciencia: -8 },
      { energia: -16, termica: -6, propelente: 0, ciencia: 12 },
    ],
  },
  hielo: {
    id: 'hielo', icono: '🧊', clave: 'e08.carta.hielo',
    // correcta: 0 · LRO y LCROSS apuntaron a los cráteres en sombra permanente y encontraron agua helada: vale el gasto de energía.
    correcta: 0,
    deltas: [
      { energia: -16, termica: -8, propelente: -6, ciencia: 20 },
      { energia: 8, termica: 6, propelente: 4, ciencia: 4 },
    ],
  },
  bajar: {
    id: 'bajar', icono: '📷', clave: 'e08.carta.bajar',
    // correcta: 0 · LRO bajó a una órbita elíptica más cercana al suelo para ver más detalle, con una órbita estable que cuesta poco combustible.
    correcta: 0,
    deltas: [
      { energia: -6, termica: -6, propelente: -20, ciencia: 20 },
      { energia: 6, termica: 6, propelente: 10, ciencia: -4 },
    ],
  },
  io: {
    id: 'io', icono: '🌋', clave: 'e08.carta.io',
    // correcta: 0 · Juno se acercó a Ío en 2023 y 2024 con un plan de radiación calculado: el riesgo estaba medido.
    correcta: 0,
    deltas: [
      { energia: -8, termica: -20, propelente: -8, ciencia: 22 },
      { energia: 8, termica: 12, propelente: 6, ciencia: -4 },
    ],
  },
  extender: {
    id: 'extender', icono: '📅', clave: 'e08.carta.extender',
    // correcta: 0 · NASA prorroga las misiones mientras la nave siga sana y produzca ciencia.
    correcta: 0,
    deltas: [
      { energia: -10, termica: -12, propelente: -10, ciencia: 16 },
      { energia: 12, termica: 12, propelente: 8, ciencia: -6 },
    ],
  },
};

export function construirMazoReigns(mision) {
  const destino = destinoDe(mision);
  const real = cartaRealReigns(mision, destino);
  const ids = destino === 'luna'
    ? ['eclipse', 'hielo', 'micro', 'viejo', 'bajar', 'tormenta', 'presupuesto']
    : ['tormenta', 'io', 'micro', 'viejo', 'eclipse', 'presupuesto', 'extender'];
  const cartas = ids.map(id => {
    const base = CARTAS_EVENTO[id];
    const esNueva = base.clave.startsWith('e08.reigns.');
    return {
      id: base.id,
      icono: base.icono,
      correcta: base.correcta,
      etiqueta: esNueva ? 'e08.reigns.cat.anomalia' : 'e08.reigns.cat.operacion',
      titulo: t(`${base.clave}.titulo`),
      texto: t(`${base.clave}.texto`),
      opciones: [0, 1].map(idx => ({
        texto: t(`${base.clave}.op.${idx}.texto`),
        consecuencia: t(`${base.clave}.op.${idx}.consecuencia`),
        vidaReal: t(`${base.clave}.op.${idx}.vidaReal`),
        deltas: base.deltas[idx],
        real: false,
      })),
    };
  });
  return [...(real ? [real] : []), ...cartas];
}

// Magnitud visual sin revelar el número exacto (como Reigns: pequeño ● vs grande ◆).
export function magnitudIndicador(valor) {
  const a = Math.abs(valor || 0);
  if (a === 0) return null;
  return a >= 15 ? 'grande' : 'chico';
}

export function preverIndicadores(deltas = {}) {
  return Object.fromEntries(BARRAS_REIGNS.map(k => [k, magnitudIndicador(deltas[k])]));
}

function textoFinal(destino, id) {
  const orig = FINALES[destino]?.[id] || {};
  return {
    id,
    texto: t(`e08.final.${id}.texto`, null, orig.texto),
    titulo: t(`e08.final.${id}.titulo`, null, orig.titulo || orig.texto),
    consecuencia: t(`e08.final.${id}.consecuencia`, null, orig.consecuencia),
    vidaReal: t(`e08.final.${id}.vidaReal`, null, orig.vidaReal),
    protege: !!orig.protege,
    desorbito: !!orig.desorbito,
    forzado: !!orig.forzado,
  };
}

export function crearReigns08(estado, mision) {
  const destino = destinoDe(mision);
  const misionId = mision?.id === 'juno' ? 'juno' : 'lro';
  const dificultad = mision?.dificultad || 'intermedio';
  const bMax = estado?.bateriaMax || mision?.bateria_wh || 2000;
  const energia = Math.round(acotar(((estado?.bateria ?? bMax * 0.75) / bMax) * 80 + 10, 40, 88));
  const propelente = Math.round(acotar(((estado?.dvRestante ?? 120) / 220) * 50 + 35, 38, 88));
  const termica = Math.round(acotar((estado?.salud ?? 85) * 0.8 + 8, 42, 88));
  const ciencia = Math.round(acotar((estado?.ciencia ?? 0.45) * 70 + 15, 25, 80));
  const mazo = construirMazoReigns(mision);

  return {
    fase: 'ficha', // 'ficha' | 'jugando' | 'consecuencia' | 'final' | 'cierre'
    destino,
    misionId,
    dificultad,
    ano: 1,
    mazo,
    indice: 0,
    barras: { energia, termica, propelente, ciencia },
    barrasInicio: { energia, termica, propelente, ciencia },
    coincidenciasReales: 0,
    aciertos: 0,
    decisionesTomadas: 0,
    ultima: null, // { lado, opcion, deltas, finAnticipado }
    finalElegido: null,
    desorbito: false,
    epilogo: null,
    registro: [],
  };
}

function escalarDeltas(deltas, dificultad) {
  const factorNeg = dificultad === 'principiante' ? 0.8 : dificultad === 'experto' ? 1.25 : 1;
  const factorPos = dificultad === 'principiante' ? 1.15 : dificultad === 'experto' ? 0.9 : 1;
  const out = {};
  for (const k of BARRAS_REIGNS) {
    const v = deltas?.[k] || 0;
    out[k] = v === 0 ? 0 : Math.round(v * (v < 0 ? factorNeg : factorPos));
  }
  return out;
}

function falloCritico(barras, destino) {
  if (barras.energia <= 0) return 'silencio';
  if (barras.termica <= 0) return 'silencio';
  if (barras.propelente <= 0) return destino === 'luna' ? 'choque' : 'silencio';
  return null;
}

function construirEpilogo(n, finalObj) {
  const claveForzada = finalObj.id === 'choque' || finalObj.id === 'silencio';
  const alta = n.barras.ciencia >= 55 && n.barras.energia > 0 && n.barras.termica > 0;
  const clave = claveForzada
    ? finalObj.id
    : `${finalObj.id === 'impacto' ? 'impacto' : finalObj.id === 'hundir' ? 'hundir' : 'orbita'}_${alta ? 'alta' : 'baja'}`;
  const fallback = EPILOGOS[n.misionId]?.[clave] || EPILOGOS[n.misionId]?.[Object.keys(EPILOGOS[n.misionId])[0]] || {};
  const aniosTxt = n.ano === 1 ? t('e08.epilogo.ano', { n: n.ano }) : t('e08.epilogo.anos', { n: n.ano });
  const prot = finalObj.protege ? t('e08.epilogo.protege') : (n.destino === 'jupiter' ? t('e08.epilogo.noProtege') : '');
  const detalle = `${aniosTxt} · ${Math.round(n.barras.ciencia)}% ${t('e08.reigns.barra.ciencia')}.${prot ? ` ${prot}` : ''}`;
  return {
    id: clave,
    titulo: t(`e08.epilogo.${n.misionId}.${clave}.titulo`, null, fallback.titulo),
    texto: t(`e08.epilogo.${n.misionId}.${clave}.texto`, null, fallback.texto),
    detalle,
  };
}

export function opcionesFinalReigns(s) {
  if (!s) return [];
  const critico = falloCritico(s.barras, s.destino);
  if (critico) return [textoFinal(s.destino, critico)];
  return s.destino === 'luna'
    ? [textoFinal('luna', 'impacto'), textoFinal('luna', 'orbita')]
    : [textoFinal('jupiter', 'hundir'), textoFinal('jupiter', 'orbita')];
}

export function pasoReigns08(s, accion) {
  if (!s || !accion) return s;
  switch (accion.tipo) {
    case 'empezar':
      return s.fase === 'ficha' ? { ...s, fase: 'jugando' } : s;

    case 'elegir': {
      if (s.fase !== 'jugando') return s;
      const carta = s.mazo[s.indice];
      if (!carta) return { ...s, fase: 'final' };
      const lado = accion.lado === 1 ? 1 : 0;
      const op = carta.opciones[lado] || carta.opciones[0];
      const deltas = escalarDeltas(op.deltas, s.dificultad);
      const barras = {};
      for (const k of BARRAS_REIGNS) barras[k] = acotar((s.barras[k] || 0) + deltas[k], 0, 100);
      const critico = falloCritico(barras, s.destino);
      const registro = [...s.registro, { texto: `${carta.titulo} → ${op.texto}: ${op.consecuencia}`, tipo: critico ? 'mal' : op.real ? 'bien' : 'info' }];
      return {
        ...s,
        fase: 'consecuencia',
        barras,
        coincidenciasReales: s.coincidenciasReales + (op.real ? 1 : 0),
        aciertos: (s.aciertos || 0) + (lado === carta.correcta ? 1 : 0),
        decisionesTomadas: s.decisionesTomadas + 1,
        // acierto: la opción aplicada es la correcta. `equipo` (solo en línea): { votosOk, requisito, votantes } para mostrarlo.
        ultima: { lado, carta, opcion: op, deltas, finAnticipado: critico, acierto: lado === carta.correcta, equipo: accion.equipo || null },
        registro,
      };
    }

    case 'siguiente': {
      if (s.fase !== 'consecuencia') return s;
      if (s.ultima?.finAnticipado || s.indice + 1 >= s.mazo.length) {
        return { ...s, fase: 'final', ultima: null };
      }
      return {
        ...s,
        fase: 'jugando',
        indice: s.indice + 1,
        ano: s.ano + 1,
        ultima: null,
      };
    }

    case 'finalizar': {
      if (s.fase !== 'final') return s;
      const opciones = opcionesFinalReigns(s);
      const elegida = opciones.find(o => o.id === accion.id) || opciones[accion.lado === 1 ? Math.min(1, opciones.length - 1) : 0];
      if (!elegida) return s;
      const epilogo = construirEpilogo(s, elegida);
      const registro = [...s.registro, { texto: `${elegida.titulo}. ${elegida.consecuencia}`, tipo: elegida.protege ? 'bien' : 'info' }];
      return {
        ...s,
        fase: 'cierre',
        finalElegido: elegida,
        desorbito: !!elegida.desorbito,
        epilogo,
        registro,
      };
    }

    default:
      return s;
  }
}

// Vuelca el resultado de la etapa 08 en el estado de la campaña (mismo contrato que aplicarExtendida08).
export function aplicarReigns08(estado, s) {
  const nada = { coincidenciasReales: 0, desorbito: false };
  if (!estado || estado.misionExtendida || !s || s.fase !== 'cierre') return { estado, extras: nada };
  const gananciaCiencia = acotar((s.barras.ciencia - 25) / 75, 0, 1) * 0.25;
  const ciencia = Math.min(1, (estado.ciencia || 0) + gananciaCiencia);
  const bMax = estado.bateriaMax || 2000;
  const bateria = Math.round(bMax * acotar(s.barras.energia / 100, 0.05, 1));
  const salud = Math.round(acotar((estado.salud ?? 80) * 0.5 + s.barras.termica * 0.5, 5, 100));
  const dvDelta = Math.max(0, s.barrasInicio.propelente - s.barras.propelente) * 1.5;
  return {
    estado: {
      ...estado,
      ciencia,
      bateria,
      salud,
      dvRestante: Math.max(0, (estado.dvRestante ?? 0) - dvDelta),
      misionExtendida: {
        anos: s.ano,
        datos: Math.round(s.barras.ciencia * 10),
        final: s.finalElegido?.id || null,
        epilogo: s.epilogo?.id || null,
      },
      decisiones: [...(estado.decisiones || []), ...s.registro],
    },
    extras: {
      coincidenciasReales: s.coincidenciasReales,
      desorbito: !!s.desorbito,
    },
  };
}

// Consejo de piezas para Principiante (tarea B2b), al estilo del juego del telescopio de NASA:
// las piezas que no sirven para la misión salen en gris con su motivo y las que mejor encajan, recomendadas.
// Función pura. La interfaz solo la consulta cuando mision.dificultad === 'principiante'.
// Devuelve { estado: 'recomendada' | 'normal' | 'no_sirve', clave, vars } con claves de i18n (prefijo «consejo.»).
import { resumenNave } from './nave.js';

const COBERTURA_MINIMA = 0.6; // por debajo de esto el objetivo sigue «sin cubrir»
const normal = (clave = null, vars = {}) => ({ estado: 'normal', clave, vars });

function consejoInstrumento(p, { mision, diseno, piezas, resumen }) {
  const cubre = mision.objetivos.filter((o) => (p.ciencia?.[o.id] || 0) > 0);
  if (cubre.length === 0) return { estado: 'no_sirve', clave: 'consejo.instrumento.ninguno', vars: {} };
  // Necesita algo que el diseño todavía no habilita: es una pista, no un bloqueo.
  if (p.requiere) {
    const habilitadas = new Set([...Object.values(diseno || {}).flat()].map((id) => piezas.find((x) => x.id === id)?.habilita).filter(Boolean));
    if (!habilitadas.has(p.requiere)) {
      const necesaria = piezas.find((x) => x.habilita === p.requiere);
      return normal('consejo.instrumento.necesita', { x: necesaria?.nombre || p.requiere });
    }
  }
  if ((diseno?.instrumentos || []).includes(p.id)) return normal();
  const sinCubrir = (resumen?.ciencia?.porObjetivo || []).filter((o) => o.cobertura < COBERTURA_MINIMA && (p.ciencia?.[o.id] || 0) > 0);
  if (sinCubrir.length) return { estado: 'recomendada', clave: 'consejo.instrumento.cubre', vars: { objetivo: sinCubrir[0].corto || sinCubrir[0].nombre } };
  return normal();
}

function consejoCohete(p, { mision, cohetes, resumen }) {
  const mult = mision.capacidad_mult || 1;
  const masa = resumen?.masaTotal || 0;
  const cap = (c) => c.capacidad_kg * mult;
  if (cap(p) < masa) return { estado: 'no_sirve', clave: 'consejo.cohete.chico', vars: { cap: Math.round(cap(p)), masa: Math.round(masa) } };
  const mejor = [...cohetes].filter((c) => cap(c) >= masa).sort((a, z) => a.costo_musd - z.costo_musd)[0];
  if (mejor?.id === p.id) return { estado: 'recomendada', clave: 'consejo.cohete.justo', vars: { masa: Math.round(masa) } };
  return normal();
}

function consejoEnergia(p, { mision, diseno, piezas, cohetes }) {
  const con = (pieza) => resumenNave({ ...diseno, energia: pieza.id }, piezas, cohetes, mision);
  const r = con(p);
  if (r.generacion < r.consumo) {
    return { estado: 'no_sirve', clave: 'consejo.energia.corta', vars: { gen: Math.round(r.generacion), cons: Math.round(r.consumo), destino: mision.destino.nombre } };
  }
  const mejor = piezas.filter((x) => x.categoria === 'energia').filter((x) => { const q = con(x); return q.generacion >= q.consumo; })
    .sort((a, z) => a.costo_musd - z.costo_musd)[0];
  if (mejor?.id === p.id) return { estado: 'recomendada', clave: 'consejo.energia.justa', vars: { destino: mision.destino.nombre } };
  return normal();
}

export function consejoPieza(pieza, ctx) {
  if (!pieza) return normal();
  if (pieza.avanzada) return normal('consejo.avanzada');
  if (pieza.categoria === 'instrumento') return consejoInstrumento(pieza, ctx);
  if (ctx.cohetes?.some((c) => c.id === pieza.id) && pieza.capacidad_kg) return consejoCohete(pieza, ctx);
  if (pieza.categoria === 'energia') return consejoEnergia(pieza, ctx);
  return normal();
}

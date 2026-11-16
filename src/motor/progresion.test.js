import { describe, expect, it } from 'vitest';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';
import { disenoReal, resumenNave } from './nave.js';
import { aplicarInsercion, aplicarLanzamiento, bloqueOrbitas, estadoInicial, puntaje, tramo } from './mision.js';
import { cobrar, comprar, DESBLOQUEADO_INICIAL, estaDesbloqueado, PROGRESO_INICIAL } from '../estado/progreso.js';

const perfecto = (solidos) => ({
  etapas: [...(solidos ? [{ etapa: 'solidos', combustible: 0, tarde: 0 }] : []), { etapa: 'primera', combustible: 0, tarde: 0 }],
  errorApagado: 0,
});
function jugar(diseno, mision) {
  const r = resumenNave(diseno, piezas, cohetes, mision);
  const cohete = cohetes.find((c) => c.id === diseno.cohete);
  let e = aplicarLanzamiento(estadoInicial(r, mision, diseno), perfecto(cohete.solidos));
  e = tramo(e, diseno, piezas, mision, mision.destino.distancia_ua);
  e = aplicarInsercion(e, mision, mision.dv_insercion_ms).estado;
  while (!e.perdida && e.orbitas < e.orbitasMeta) e = bloqueOrbitas(e, diseno, piezas, mision).estado;
  return { r, e, p: puntaje(e, r, mision, { coincidenciasReales: 1, desorbito: true }) };
}

const kitLro = { cohete: 'atlas_v_401', propulsion: 'tanque_chico', energia: 'panel_chico', antena: 'antena_alta', blindaje: 'blindaje_ninguno', instrumentos: ['lroc', 'lend'] };

describe('progresión: 2 opciones por categoría al empezar', () => {
  it('hay exactamente 2 desbloqueadas por categoría de equipo', () => {
    for (const cat of ['energia', 'antena', 'blindaje', 'propulsion']) {
      expect(piezas.filter((p) => p.categoria === cat && estaDesbloqueado(PROGRESO_INICIAL, p))).toHaveLength(2);
    }
    expect(cohetes.filter((c) => estaDesbloqueado(PROGRESO_INICIAL, c))).toHaveLength(2);
  });
  it('todo lo inicial existe en el catálogo', () => {
    const ids = new Set([...piezas, ...cohetes].map((p) => p.id));
    DESBLOQUEADO_INICIAL.forEach((id) => expect(ids.has(id)).toBe(true));
  });
  it('lo bloqueado tiene precio', () => {
    [...piezas, ...cohetes].filter((p) => !DESBLOQUEADO_INICIAL.includes(p.id)).forEach((p) => expect(p.precio).toBeGreaterThan(0));
  });
});

describe('misión 1 (tutorial LRO)', () => {
  it('con el kit inicial se puede lanzar y ganar medalla', () => {
    const { r, e, p } = jugar(kitLro, lro);
    expect(r.problemas).toEqual([]);
    expect(e.perdida).toBeNull();
    expect(p.total).toBeGreaterThanOrEqual(50);
  });
  it('la cámara LROC satura una antena chica (lección de comunicaciones)', () => {
    expect(resumenNave({ ...kitLro, antena: 'antena_media' }, piezas, cohetes, lro).factorDatos).toBeLessThan(0.5);
  });
  it('el diseño real de LRO es viable', () => {
    expect(resumenNave(disenoReal(lro, piezas), piezas, cohetes, lro).puedeLanzar).toBe(true);
  });
});

describe('misión 2 (Juno) exige mejorar el equipo', () => {
  const base = { cohete: 'atlas_v_541', propulsion: 'tanque_mediano', antena: 'antena_alta', blindaje: 'blindaje_aluminio', instrumentos: ['mwr', 'mag'] };
  it('con solo lo inicial no alcanza la energía', () => {
    expect(resumenNave({ ...base, energia: 'panel_mediano' }, piezas, cohetes, juno).barras.energia.ok).toBe(false);
  });
  it('comprando las alas gigantes con el pago del tutorial (Plata), Juno es posible', () => {
    const { progreso } = cobrar(PROGRESO_INICIAL, lro, 'Plata');
    const gigante = piezas.find((p) => p.id === 'panel_gigante');
    const p2 = comprar(progreso, gigante);
    expect(estaDesbloqueado(p2, gigante)).toBe(true);
    const { r, e } = jugar({ ...base, energia: 'panel_gigante' }, juno);
    expect(r.puedeLanzar).toBe(true);
    expect(e.perdida).toBeNull();
  });
  it('repetir una misión solo paga la diferencia si mejoras', () => {
    const a = cobrar(PROGRESO_INICIAL, lro, 'Plata');
    const b = cobrar(a.progreso, lro, 'Plata');
    const c = cobrar(b.progreso, lro, 'Oro');
    expect(b.pago).toBe(0);
    expect(c.pago).toBe(lro.recompensa.Oro - lro.recompensa.Plata);
  });
});

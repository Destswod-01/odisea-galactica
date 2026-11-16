// Etapa 08 «Decisiones de misión» en equipo: reglas de votación (puras, con pruebas) y el hook que las conecta a la sala.
//
// Regla pedida por el dueño: cada jugador vota izquierda/derecha; el equipo acierta si los votos por la opción CORRECTA
// llegan al requisito del nivel — Novato 2, Conocedor 3, Experto todos — acotado al número de jugadores conectados.
// El resolutor (anfitrión; si se cae, el primer jugador conectado) cuenta, aplica la opción y difunde el estado
// con el espejo {t:'espejo', fase:'extendida08', s}. Los votos viajan con {t:'voto08', carta, opcion|avanzar} a toda la sala.
import { useCallback, useEffect, useRef, useState } from 'react';
import { alEspejo, alVoto08, enviar, useSala } from './cliente.js';
import { nivelValido } from '../motor/dificultad.js';
import { pasoReigns08 } from '../motor/reigns08.js';

export const FASE_ESPEJO_08 = 'extendida08';
export const TIEMPO_VOTO_MS = 20000;
const BASE_REQUISITO = { principiante: 2, intermedio: 3, experto: Infinity };

/** Votos por la opción correcta que se necesitan: Novato 2, Conocedor 3, Experto todos; nunca más que los jugadores. */
export function requisito(dificultad, nJugadores) {
  const n = Math.max(1, Math.floor(nJugadores) || 1);
  return Math.min(n, BASE_REQUISITO[nivelValido(dificultad)]);
}

export const votosCorrectos = (votos, correcta) => Object.values(votos || {}).filter((v) => v === correcta).length;

/** ¿Acierta el equipo? `votos` = { idJugador: 0|1 } de los jugadores conectados. */
export function equipoAcierta(votos, correcta, dificultad, nJugadores) {
  return votosCorrectos(votos, correcta) >= requisito(dificultad, nJugadores);
}

/** Opción que se aplica: la correcta si el equipo acierta; la otra si no. */
export const ladoAplicado = (acierta, correcta) => (acierta ? correcta : 1 - correcta);

/** Solo cuentan los votos de jugadores conectados. */
export function votosDeConectados(votos, ids) {
  const out = {};
  for (const id of ids) if (votos?.[id] === 0 || votos?.[id] === 1) out[id] = votos[id];
  return out;
}

export const todosVotaron = (votos, ids) => ids.length > 0 && ids.every((id) => votos?.[id] === 0 || votos?.[id] === 1);

export const conectadosDe = (sala) => (sala?.jugadores || []).filter((j) => j.conectado);

/** ¿Se juega en equipo? Sala ya empezada y al menos 2 jugadores conectados. */
export const enEquipo08 = (sala) => !!sala?.estado && sala.estado.fase !== 'espera' && conectadosDe(sala).length >= 2;

/** Quien cuenta los votos y difunde: el anfitrión si está conectado; si no, el primer jugador conectado. */
export function resolutorId(sala) {
  const c = conectadosDe(sala);
  return (c.find((j) => j.id === sala?.hostId) || c[0])?.id ?? null;
}

export function useVotos08({ s, setS }) {
  const red = useSala();
  const sala = red.sala;
  const miId = red.miId;
  const activo = enEquipo08(sala);
  const resolutor = activo ? resolutorId(sala) : null;
  const soyResolutor = activo && resolutor === miId;
  const dificultad = nivelValido(sala?.estado?.dificultad ?? s.dificultad);

  const votosRef = useRef({ indice: -1, v: {} });
  const [, tic] = useState(0);
  const sRef = useRef(s); sRef.current = s;
  const salaRef = useRef(sala); salaRef.current = sala;
  const miIdRef = useRef(miId); miIdRef.current = miId;
  const [segundos, setSegundos] = useState(Math.round(TIEMPO_VOTO_MS / 1000));

  const registrar = useCallback((indice, id, lado) => {
    if (votosRef.current.indice !== indice) votosRef.current = { indice, v: {} };
    if (votosRef.current.v[id] !== undefined) return;
    votosRef.current = { indice, v: { ...votosRef.current.v, [id]: lado } };
    tic((x) => x + 1);
  }, []);

  const votosAhora = votosRef.current.indice === s.indice ? votosRef.current.v : {};

  // Resolutor: cuenta, aplica la opción (el cambio de `s` se difunde solo).
  const resolver = useCallback(() => {
    const cur = sRef.current;
    if (cur.fase !== 'jugando') return;
    const carta = cur.mazo[cur.indice];
    const ids = conectadosDe(salaRef.current).map((j) => j.id);
    const v = votosDeConectados(votosRef.current.indice === cur.indice ? votosRef.current.v : {}, ids);
    const req = requisito(dificultad, ids.length);
    const ok = votosCorrectos(v, carta.correcta);
    const lado = ladoAplicado(ok >= req, carta.correcta);
    const indice = cur.indice;
    setS((prev) => (prev.fase === 'jugando' && prev.indice === indice
      ? pasoReigns08(prev, { tipo: 'elegir', lado, equipo: { votosOk: ok, requisito: req, votantes: ids.length } })
      : prev));
  }, [dificultad, setS]);
  const resolverRef = useRef(resolver); resolverRef.current = resolver;

  // Mensajes de la sala: todos registran votos; el resolutor además avanza y cierra la disposición final.
  useEffect(() => {
    if (!activo) return undefined;
    return alVoto08((m) => {
      const cur = sRef.current;
      const yoResuelvo = resolutorId(salaRef.current) === miIdRef.current;
      if (m.carta === 'final') {
        if (yoResuelvo && cur.fase === 'final') setS((p) => pasoReigns08(p, { tipo: 'finalizar', lado: m.opcion === 1 ? 1 : 0 }));
      } else if (m.avanzar) {
        if (!yoResuelvo) return;
        if (cur.fase === 'ficha') setS((p) => pasoReigns08(p, { tipo: 'empezar' }));
        else if (cur.fase === 'consecuencia' && m.carta === cur.indice) setS((p) => pasoReigns08(p, { tipo: 'siguiente' }));
      } else if (m.opcion === 0 || m.opcion === 1) registrar(m.carta, m.de, m.opcion);
    });
  }, [activo, registrar, setS]);

  // Invitados: aplican el estado que difunde el resolutor; al llegar o reconectar piden el último.
  useEffect(() => {
    if (!activo || soyResolutor) return undefined;
    const quitar = alEspejo((m) => {
      if (m.fase !== FASE_ESPEJO_08 || !m.s || m.de !== resolutorId(salaRef.current)) return;
      setS(m.s);
    });
    enviar({ t: 'espejo_pedir' });
    return quitar;
  }, [activo, soyResolutor, setS]);

  // Resolutor: difunde cada estado nuevo.
  useEffect(() => {
    if (activo && soyResolutor) enviar({ t: 'espejo', fase: FASE_ESPEJO_08, s });
  }, [activo, soyResolutor, s]);

  // Cierra la carta cuando votaron todos los conectados…
  const ids = conectadosDe(sala).map((j) => j.id);
  const completos = activo && s.fase === 'jugando' && todosVotaron(votosAhora, ids);
  useEffect(() => {
    if (soyResolutor && completos) resolverRef.current();
  }, [soyResolutor, completos]);

  // …o cuando se acaba el tiempo (la cuenta regresiva se ve en todos; solo el resolutor cierra).
  useEffect(() => {
    if (!activo || s.fase !== 'jugando') return undefined;
    const fin = Date.now() + TIEMPO_VOTO_MS;
    setSegundos(Math.round(TIEMPO_VOTO_MS / 1000));
    const rel = setInterval(() => setSegundos(Math.max(0, Math.ceil((fin - Date.now()) / 1000))), 500);
    const tope = setTimeout(() => { if (resolutorId(salaRef.current) === miIdRef.current) resolverRef.current(); }, TIEMPO_VOTO_MS);
    return () => { clearInterval(rel); clearTimeout(tope); };
  }, [activo, s.fase, s.indice]);

  const votar = useCallback((lado) => {
    const cur = sRef.current;
    if (cur.fase !== 'jugando') return;
    if (votosRef.current.indice === cur.indice && votosRef.current.v[miIdRef.current] !== undefined) return;
    registrar(cur.indice, miIdRef.current, lado);
    enviar({ t: 'voto08', carta: cur.indice, opcion: lado });
  }, [registrar]);

  const avanzar = useCallback(() => {
    const cur = sRef.current;
    if (resolutorId(salaRef.current) === miIdRef.current) {
      if (cur.fase === 'ficha') setS((p) => pasoReigns08(p, { tipo: 'empezar' }));
      else if (cur.fase === 'consecuencia') setS((p) => pasoReigns08(p, { tipo: 'siguiente' }));
    } else enviar({ t: 'voto08', carta: cur.indice, avanzar: true });
  }, [setS]);

  const finalizar = useCallback((idx) => {
    if (resolutorId(salaRef.current) === miIdRef.current) setS((p) => pasoReigns08(p, { tipo: 'finalizar', lado: idx === 1 ? 1 : 0 }));
    else enviar({ t: 'voto08', carta: 'final', opcion: idx === 1 ? 1 : 0 });
  }, [setS]);

  const jugadores = conectadosDe(sala).map((j) => ({
    id: j.id, nombre: j.nombre, yo: j.id === miId, votado: votosAhora[j.id] !== undefined,
  }));
  return {
    activo, soyResolutor, dificultad, jugadores, segundos,
    requisito: requisito(dificultad, ids.length), n: ids.length,
    miVoto: votosAhora[miId], votar, avanzar, finalizar,
  };
}

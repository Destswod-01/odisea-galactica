// Turnos por pieza en línea (etapa 07, Tetris): la pieza número `n` la maneja `jugadores[n % total]` (orden de la sala),
// saltando a los desconectados. El jugador en turno simula y manda instantáneas {t:'espejo', fase, s} (~10 Hz); los demás las
// aplican y NO simulan. Cuando la pieza se fija, `s.n` sube: el que acaba de jugar manda esa última instantánea de inmediato
// y el siguiente toma el control desde ella.
//
//   const { enRed, titular, soyTitular, espectadorRef } = useTurnos({ fase: 'operacion', s, setS, sRef });
//
// Fuera de red (modo Solo o sala en espera) `enRed` es false y `soyTitular` true: todas las piezas son tuyas.
// Reutiliza el mensaje `espejo` ya existente (cliente.js / servidor/sala.mjs); no cambia el protocolo.
import { useEffect, useRef } from 'react';
import { alEspejo, enviar, useSala } from './cliente.js';

/** Jugador al que le toca la pieza `n` (pura): jugadores[n % total], o el siguiente conectado si ese está caído. */
export function titularDePieza(jugadores, n) {
  if (!Array.isArray(jugadores) || jugadores.length === 0) return null;
  const total = jugadores.length;
  const base = ((n % total) + total) % total;
  for (let k = 0; k < total; k++) {
    const j = jugadores[(base + k) % total];
    if (j && j.conectado !== false) return j;
  }
  return jugadores[base];
}

/** ¿Hay partida en red? (misma regla que el espejo: sala en juego y al menos 2 jugadores). */
export const enRedDeSala = (sala) => !!sala?.estado && sala.estado.fase !== 'espera' && (sala.jugadores?.length ?? 0) >= 2;

/**
 * ¿Aplico la instantánea `m` (de `m.de`) sobre mi estado `actual`? (pura)
 * - la instantánea debe venir de quien tenía su pieza o de quien acababa de entregar la anterior;
 * - nunca retrocede (n y tick no bajan);
 * - quien tiene el turno de su pieza actual solo acepta instantáneas de una pieza posterior (la entrega).
 */
export function aceptarInstantanea({ jugadores, miId, actual, m }) {
  if (!m?.s || typeof m.s.n !== 'number' || m.de === miId) return false;
  const quien = titularDePieza(jugadores, m.s.n)?.id;
  const previo = m.s.n > 0 ? titularDePieza(jugadores, m.s.n - 1)?.id : null;
  if (m.de !== quien && m.de !== previo) return false;
  const an = actual?.n ?? -1;
  if (m.s.n < an) return false;
  const soyTitular = titularDePieza(jugadores, an)?.id === miId;
  if (soyTitular) return m.s.n > an;
  return m.s.n > an || (m.s.tick ?? 0) >= (actual?.tick ?? 0);
}

export function useTurnos({ fase, s, setS, sRef = null, cada = 100 }) {
  const red = useSala();
  const enRed = enRedDeSala(red.sala);
  const jugadores = red.sala?.jugadores ?? [];
  const titular = enRed ? titularDePieza(jugadores, s?.n ?? 0) : null;
  const soyTitular = !enRed || titular?.id === red.miId;
  const espectadorRef = useRef(false);
  espectadorRef.current = enRed && !soyTitular; // lo leen los bucles y teclas de la pantalla sin reiniciarse
  const ultima = useRef(s), ultimoEnvio = useRef(0), temporizador = useRef(null);
  const comoTitular = useRef(-1); // última pieza para la que mandé instantánea siendo titular
  const entregado = useRef(-1); // pieza para la que ya mandé la entrega
  const vivo = useRef({ jugadores, miId: red.miId, s });
  ultima.current = s;
  vivo.current = { jugadores, miId: red.miId, s };

  // Mandar: titular con throttle; al entregar el turno, la última instantánea sale de inmediato.
  useEffect(() => {
    if (!enRed) return;
    const mandar = () => { temporizador.current = null; ultimoEnvio.current = Date.now(); enviar({ t: 'espejo', fase, s: ultima.current }); };
    if (soyTitular) {
      comoTitular.current = s.n;
      const falta = cada - (Date.now() - ultimoEnvio.current);
      if (falta <= 0) mandar();
      else if (!temporizador.current) temporizador.current = setTimeout(mandar, falta);
    } else if (comoTitular.current >= 0 && comoTitular.current === s.n - 1 && entregado.current !== s.n) {
      entregado.current = s.n;
      clearTimeout(temporizador.current);
      mandar();
    }
  }, [s, enRed, soyTitular, fase, cada]);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Recibir: aplica las instantáneas válidas y pide la última guardada (por si llegué tarde).
  useEffect(() => {
    if (!enRed) return undefined;
    const quitar = alEspejo((m) => {
      if (m.fase !== fase) return;
      const v = vivo.current;
      if (!aceptarInstantanea({ jugadores: v.jugadores, miId: v.miId, actual: v.s, m })) return;
      if (sRef) sRef.current = m.s;
      setS(m.s);
    });
    enviar({ t: 'espejo_pedir' });
    return quitar;
  }, [enRed, fase]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enRed, titular, soyTitular, espectadorRef, jugadores, miId: red.miId };
}

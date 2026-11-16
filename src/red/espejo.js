// Espejo en línea: en cada etapa solo maneja el «piloto» y los demás ven su partida EN VIVO, sin poder tocar nada.
//
//   const { espectador, espectadorRef } = useEspejo({ fase: 'leop', s: juego, setS: setJuego });
//
// - El piloto manda su estado `s` (instantáneas JSON) al servidor, con throttle (~10 Hz).
// - El espectador reemplaza su `s` (y `sRef.current`, si la pantalla lo usa) por cada instantánea y debe NO simular:
//   cada pantalla ignora sus bucles de tiempo y sus acciones mientras `espectadorRef.current` sea true.
// - Fuera de red (modo Solo, o sala en espera) el hook no hace nada: `espectador` y `soyPiloto` son false.
// Lo que hace cada pantalla con el espejo está en docs/entrega/estado/ESPEJO.md.
import { useEffect, useRef } from 'react';
import { alEspejo, enviar, useSala } from './cliente.js';
import { pilotoDeEtapa } from './piloto.js';

/** ¿Esta fase se juega con piloto y espectadores en la sala dada? (pura, para pruebas y para App) */
export function espejoDeSala(sala, miId, fase) {
  const enRed = !!sala?.estado && sala.estado.fase !== 'espera' && (sala.jugadores?.length ?? 0) >= 2;
  const piloto = enRed ? pilotoDeEtapa(sala.jugadores, fase) : null;
  return { activo: !!piloto, piloto, soyPiloto: !!piloto && piloto.id === miId, espectador: !!piloto && piloto.id !== miId };
}

export function useEspejo({ fase, s, setS, sRef = null, cada = 100 }) {
  const red = useSala();
  const e = espejoDeSala(red.sala, red.miId, fase);
  const espectadorRef = useRef(false);
  espectadorRef.current = e.espectador; // lo leen los bucles de cada pantalla sin reiniciarse
  const ultima = useRef(s), ultimoEnvio = useRef(0), temporizador = useRef(null);
  ultima.current = s;
  const pilotoId = e.piloto?.id ?? null;

  // Piloto: manda la instantánea cuando `s` cambia, como mucho cada `cada` ms (la última siempre sale).
  useEffect(() => {
    if (!e.soyPiloto) return;
    const mandar = () => { temporizador.current = null; ultimoEnvio.current = Date.now(); enviar({ t: 'espejo', fase, s: ultima.current }); };
    const falta = cada - (Date.now() - ultimoEnvio.current);
    if (falta <= 0) mandar();
    else if (!temporizador.current) temporizador.current = setTimeout(mandar, falta);
  }, [s, e.soyPiloto, fase, cada]);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Espectador: aplica las instantáneas de SU piloto para ESTA fase y pide la última guardada (por si llegó tarde).
  useEffect(() => {
    if (!e.espectador) return undefined;
    const quitar = alEspejo((m) => {
      if (m.fase !== fase || m.de !== pilotoId || !m.s) return;
      if (sRef) sRef.current = m.s;
      setS(m.s);
    });
    enviar({ t: 'espejo_pedir' });
    return quitar;
  }, [e.espectador, fase, pilotoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...e, espectadorRef };
}

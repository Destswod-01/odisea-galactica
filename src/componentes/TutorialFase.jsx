import { useEffect, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import {
  EVENTO_CONSEJOS,
  GUIAS,
  configConsejosDificultad,
  destinatarioFase,
  esModoProbar,
  guardarSinConsejos,
  leerSinConsejos,
  paginasDeFase,
} from '../motor/tutorial.js';
import './tutorial-fase.css';
import { useSala } from '../red/cliente.js';
import { espejoDeSala } from '../red/espejo.js';

export function useSinConsejos() {
  const [oculto, setOculto] = useState(() => leerSinConsejos());
  useEffect(() => {
    const alCambiar = (e) => setOculto(typeof e.detail === 'boolean' ? e.detail : leerSinConsejos());
    window.addEventListener(EVENTO_CONSEJOS, alCambiar);
    return () => window.removeEventListener(EVENTO_CONSEJOS, alCambiar);
  }, []);
  return [oculto, (v) => guardarSinConsejos(v)];
}

export function TutorialFase({
  fase,
  equipo,
  misRoles = [],
  dificultad = 'intermedio',
  datos,
  alSeguir,
  deshabilitado,
  children,
}) {
  const t = useT();
  const sala = useSala(), esp = espejoDeSala(sala.sala, sala.miId, fase);
  const [indice, setIndice] = useState(0);
  const [, setSinConsejos] = useSinConsejos();
  const paginas = paginasDeFase(fase, misRoles, dificultad);
  const cfgDif = configConsejosDificultad(dificultad);
  const total = paginas.length + 1;
  const responde = indice >= paginas.length;
  const info = destinatarioFase(fase, equipo, misRoles, t('tutorial.jugador'), esp.piloto, esp.soyPiloto);
  const hablante = responde ? info.nombre : 'Dra. Itzel Ramos';
  const prefijo = `tutorial.${fase}`;
  const paginaActual = paginas[indice]?.num ?? 1;
  const textoBase = t(`${prefijo}.${responde ? 'respuesta' : paginaActual}`, {
    ...datos,
    nombre: info.nombre,
  });
  const saludo = !responde && info.enEquipo && info.rol
    ? t('tutorial.saludoEquipo', { nombre: info.nombre, rol: t(`equipo.rol.${info.rol}`) })
    : '';
  const pista = !responde && cfgDif.mostrarPista ? t(`${prefijo}.pista`, datos, '') : '';

  const noMostrarMas = () => {
    setSinConsejos(true);
    alSeguir?.();
  };

  return (
    <section className="tutorial-fase" aria-label={t(`${prefijo}.titulo`)}>
      <div className="panel briefing">
        <div className="directora-retrato">
          {responde ? (
            <div className="tutorial-jugador" aria-hidden="true">{Array.from(info.nombre)[0]?.toLocaleUpperCase()}</div>
          ) : <img src="./img/directora.webp" alt="" />}
          <div className="directora-placa">
            <strong>{hablante}</strong>
            <span>{responde ? (info.rol ? t(`equipo.rol.${info.rol}`) : t('tutorial.jugador')) : t('briefing.directora')}</span>
          </div>
        </div>
        <div>
          <h3>{t(`${prefijo}.titulo`)} · {indice + 1}/{total}</h3>
          <div className="burbuja" aria-live="polite">
            <span className="tutorial-solo-lectura">{hablante}: </span>
            {saludo}{textoBase}
          </div>
          {!responde && !info.esMio && info.rolLocal && (
            <p className="tutorial-rol-red">
              {t('tutorial.tuRolAviso', { rol: t(`equipo.rol.${info.rolLocal}`), dueno: info.nombre })}
            </p>
          )}
          {pista && (
            <div className="tutorial-pista">
              <strong>{t('tutorial.pistaEtiqueta')}:</strong> {pista}
            </div>
          )}
          {responde && children}
          <div className="acciones tutorial-acciones">
            {indice > 0 && <button type="button" onClick={() => setIndice(indice - 1)}>{t('briefing.anterior')}</button>}
            {responde ? (
              <button type="button" className="primario" disabled={deshabilitado} onClick={alSeguir}>
                {t(deshabilitado ? 'tutorial.preparando' : `${prefijo}.accion`)}
              </button>
            ) : (
              <button type="button" className="primario" onClick={() => setIndice(indice + 1)}>{t('briefing.siguiente')}</button>
            )}
            <button type="button" className="tutorial-ocultar" onClick={noMostrarMas}>
              {t('tutorial.noMostrar')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EntradaTutorial({
  fase,
  equipo,
  misRoles = [],
  dificultad = 'intermedio',
  clase,
  children,
  omitir = false,
}) {
  const [confirmada, setConfirmada] = useState(false);
  const [sinConsejos] = useSinConsejos();
  if (omitir || confirmada || sinConsejos || esModoProbar() || !GUIAS[fase] || !GUIAS[fase].entradaModal) {
    return children;
  }
  const tutorial = (
    <TutorialFase
      fase={fase}
      equipo={equipo}
      misRoles={misRoles}
      dificultad={dificultad}
      alSeguir={() => setConfirmada(true)}
    />
  );
  return clase ? <div className={clase}>{tutorial}</div> : tutorial;
}

/**
 * Aviso corto de IO en una esquina durante la partida, adaptable a dificultad y roles en línea.
 */
export function GuiaIO({ fase, equipo, misRoles = [], dificultad = 'intermedio' }) {
  const t = useT();
  const sala = useSala(), esp = espejoDeSala(sala.sala, sala.miId, fase);
  const [sinConsejos, setSinConsejos] = useSinConsejos();
  const [abierto, setAbierto] = useState(true);
  const [paso, setPaso] = useState(0);

  const cfgDif = configConsejosDificultad(dificultad);
  const clave1 = `tutorial.${fase}.io1`;
  const clave2 = `tutorial.${fase}.io2`;
  const msg1 = t(clave1, null, '');
  const msg2 = cfgDif.ioModo === 'seguido' ? t(clave2, null, '') : '';
  const mensajes = [msg1, msg2].filter(Boolean);

  useEffect(() => {
    setPaso(0);
    setAbierto(true);
  }, [fase]);

  useEffect(() => {
    if (!abierto || cfgDif.ioIntervaloMs <= 0 || mensajes.length < 2) return;
    const id = setInterval(() => setPaso((p) => (p + 1) % mensajes.length), cfgDif.ioIntervaloMs);
    return () => clearInterval(id);
  }, [abierto, cfgDif.ioIntervaloMs, mensajes.length]);

  // Experto: solo el consejo de entrada de cada etapa (sin avisos de IO durante el juego).
  if (sinConsejos || esModoProbar() || cfgDif.ioModo === 'ninguno' || fase === 'menu' || fase === 'hangar' || !mensajes.length) {
    return null;
  }

  const info = destinatarioFase(fase, equipo, misRoles, t('tutorial.jugador'), esp.piloto, esp.soyPiloto);
  const textoActual = mensajes[paso % mensajes.length];

  return (
    <aside className={`guia-io ${abierto ? 'abierta' : 'cerrada'}`} aria-label={t('tutorial.ioNombre')}>
      {!abierto ? (
        <button type="button" className="guia-io-chip" aria-label={t('tutorial.abrirIO')} onClick={() => setAbierto(true)}>
          <span className="t-bot-visor" aria-hidden="true"><i /><i /></span>
          <span>IO</span>
        </button>
      ) : (
        <div className="guia-io-caja" role="status">
          <div className="guia-io-cabecera">
            <span className="t-bot-visor" aria-hidden="true"><i /><i /></span>
            <strong>{t('tutorial.ioNombre')}</strong>
            {info.enEquipo && info.rol && (
              <span className="guia-io-rol">{info.nombre} · {t(`equipo.rol.${info.rol}`)}</span>
            )}
            <button type="button" className="guia-io-cerrar" aria-label={t('tutorial.cerrarIO')} onClick={() => setAbierto(false)}>×</button>
          </div>
          <p>{textoActual}</p>
          {!info.esMio && info.rolLocal && (
            <p className="guia-io-rol-propio">
              {t('tutorial.tuRolAviso', { rol: t(`equipo.rol.${info.rolLocal}`), dueno: info.nombre })}
            </p>
          )}
          <div className="guia-io-pie">
            {mensajes.length > 1 && (
              <button type="button" className="guia-io-link" onClick={() => setPaso((p) => (p + 1) % mensajes.length)}>
                {t('tutorial.siguientePista')}
              </button>
            )}
            <button type="button" className="guia-io-link" onClick={() => setSinConsejos(true)}>
              {t('tutorial.noMostrar')}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * Franja compacta no bloqueante con la Dra. Itzel Ramos para Revisión de diseño e Informe.
 */
export function BannerDirectora({
  fase,
  equipo,
  misRoles = [],
  dificultad = 'intermedio',
  perdida = false,
}) {
  const t = useT();
  const sala = useSala(), esp = espejoDeSala(sala.sala, sala.miId, fase);
  const [sinConsejos, setSinConsejos] = useSinConsejos();
  const [cerrado, setCerrado] = useState(false);

  if (sinConsejos || esModoProbar() || cerrado) return null;
  const info = destinatarioFase(fase, equipo, misRoles, t('tutorial.jugador'), esp.piloto, esp.soyPiloto);
  const cfgDif = configConsejosDificultad(dificultad);
  const clave = fase === 'informe' ? (perdida ? 'tutorial.informe.perdida' : 'tutorial.informe.exito') : `tutorial.${fase}.1`;
  const saludo = info.enEquipo && info.rol
    ? t('tutorial.saludoEquipo', { nombre: info.nombre, rol: t(`equipo.rol.${info.rol}`) })
    : '';
  const texto = t(clave, { nombre: info.nombre });
  const pista = cfgDif.mostrarPista ? t(`tutorial.${fase}.pista`, null, '') : '';

  return (
    <aside className="banner-directora" aria-label="Dra. Itzel Ramos">
      <img src="./img/directora.webp" alt="" />
      <div className="banner-directora-cuerpo">
        <div className="banner-directora-top">
          <strong>Dra. Itzel Ramos · {t(`tutorial.${fase}.titulo`)}</strong>
          <button type="button" className="banner-directora-link" onClick={() => setSinConsejos(true)}>
            {t('tutorial.noMostrar')}
          </button>
          <button type="button" className="banner-directora-x" aria-label={t('tutorial.cerrarIO')} onClick={() => setCerrado(true)}>×</button>
        </div>
        <p>{saludo}{texto}</p>
        {pista && <p className="banner-directora-pista"><strong>{t('tutorial.pistaEtiqueta')}:</strong> {pista}</p>}
      </div>
    </aside>
  );
}

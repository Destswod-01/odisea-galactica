import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import VistaSonda from './VistaSonda.jsx';
import { PASOS_DESPLIEGUE_SONDA } from '../motor/entornoVuelo.js';
import { sonidos } from '../sonido.js';

// `espectador`: en red, quien no es piloto solo ve la secuencia (no la maneja, no suma, no termina);
// `espejo` trae el paso del piloto y `alCambiar` lo publica (lo recoge Lanzamiento para la instantánea).
export default function Separacion({ mision, diseno, estetica, alTerminar, alSumarPuntos, espectador = false, espejo = null, alCambiar }) {
  const t = useT();
  const reloj = useRef(0);
  const terminado = useRef(false);
  const callback = useRef(alTerminar);
  const sumar = useRef(alSumarPuntos);
  const [listo, setListo] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [pasoIndice, setPasoIndice] = useState(0);
  const [enCinematica, setEnCinematica] = useState(false);
  const [progresoPaso, setProgresoPaso] = useState(0);

  const esRtg = diseno?.energia === 'rtg';
  const totalPasos = PASOS_DESPLIEGUE_SONDA.length;
  const completado = pasoIndice >= totalPasos;
  const pasoActual = PASOS_DESPLIEGUE_SONDA[Math.min(pasoIndice, totalPasos - 1)];
  const destinoNombre = mision?.destino?.nombre || t('e02.Despegue.sep.destino');
  const txt = (campo, rtg = false) => (rtg && esRtg ? t(`e02.Despegue.paso.${pasoActual.id}.${campo}Rtg`, null, '') : '') || t(`e02.Despegue.paso.${pasoActual.id}.${campo}`);

  useEffect(() => {
    if (espectador || !alCambiar) return;
    alCambiar({ pasoIndice, enCinematica, progresoPaso });
  }, [espectador, alCambiar, pasoIndice, enCinematica, progresoPaso]);
  useEffect(() => {
    if (!espectador || !espejo) return;
    setPasoIndice(espejo.pasoIndice ?? 0);
    setEnCinematica(!!espejo.enCinematica);
    setProgresoPaso(espejo.progresoPaso ?? 0);
  }, [espectador, espejo]);

  const alListo = useCallback(() => setListo(true), []);

  useEffect(() => {
    callback.current = alTerminar;
    sumar.current = alSumarPuntos;
  }, [alTerminar, alSumarPuntos]);

  const terminar = useCallback(() => {
    if (!terminado.current) {
      terminado.current = true;
      callback.current();
    }
  }, []);

  const iniciarCinematicaPaso = useCallback(() => {
    if (espectador || completado || enCinematica) return;
    sonidos.elegir();
    setProgresoPaso(0);
    setEnCinematica(true);
  }, [espectador, completado, enCinematica]);

  // Avanza la cinemática de cada paso (0% -> 100%) acercando la cámara y mostrando el diagnóstico
  useEffect(() => {
    if (!enCinematica || espectador) return;
    let anterior = performance.now();
    let frame;
    let acumulado = 0;
    let sonoExito = false;
    const duracion = pasoIndice === totalPasos - 1 ? 3.4 : 2.9;

    const tick = ahora => {
      const dt = Math.min(0.05, (ahora - anterior) / 1000);
      anterior = ahora;
      acumulado += dt;
      const p = Math.min(1, acumulado / duracion);
      setProgresoPaso(p);

      if (p >= 0.86 && !sonoExito) {
        sonoExito = true;
        sonidos.exito();
      }

      if (p >= 1) {
        setEnCinematica(false);
        setProgresoPaso(0);
        sumar.current?.(50);
        setPasoIndice(prev => prev + 1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enCinematica, espectador, pasoIndice, totalPasos]);

  // Al completar los 5 pasos, la sonda sale disparada hacia su planeta destino durante 2.4 s
  useEffect(() => {
    if (!completado || espectador) return;
    const timer = setTimeout(() => {
      terminar();
    }, 2400);
    return () => clearTimeout(timer);
  }, [completado, espectador, terminar]);

  useEffect(() => {
    if (!listo) return;
    let anterior = performance.now();
    let frame;
    let hud = 0;
    const tick = ahora => {
      if (!document.hidden) reloj.current += Math.min(0.05, (ahora - anterior) / 1000);
      anterior = ahora;
      if (ahora - hud > 80) {
        setSegundos(reloj.current);
        hud = ahora;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [listo]);

  useEffect(() => {
    if (espectador) return undefined;
    const alTecla = e => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!completado && !enCinematica) iniciarCinematicaPaso();
        else if (completado) terminar();
      }
    };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [espectador, iniciarCinematicaPaso, completado, enCinematica, terminar]);

  // Un sistema se activa en cuanto empieza la cinemática de su paso (o si ya pasó ese paso)
  const activoOCompletado = indice => pasoIndice > indice || (pasoIndice === indice && enCinematica);

  const cofiaAbierta = activoOCompletado(0);
  const combustibleSeparado = activoOCompletado(1);
  const panelesActivos = activoOCompletado(2);
  const antenaActiva = activoOCompletado(3);
  const propulsoresActivos = activoOCompletado(4);

  const activadosVista = [
    ...(panelesActivos ? [0] : []),
    ...(antenaActiva ? [1] : []),
    ...(propulsoresActivos ? [2] : []),
  ];

  // Foco de la cámara cinemática: se acerca a la pieza solo cuando se está ejecutando el paso
  const focoCamara = completado
    ? 'salida'
    : enCinematica
    ? pasoActual.id
    : 'general';

  const porcentaje = Math.round(progresoPaso * 100);
  const msgIniciando = txt('msgIniciando', true);
  const msgDetectando = txt('msgDetectando', true);

  const textoDiagnostico =
    progresoPaso < 0.44
      ? msgIniciando
      : progresoPaso < 0.86
      ? msgDetectando
      : txt('msgListo');

  const tituloMostrado = txt('titulo', true);
  const instruccionMostrada = txt('instruccion', true);
  const botonMostrado = txt('boton', true);

  return (
    <div
      className="separacion"
      data-segundos={segundos}
      data-paso={pasoIndice}
      data-cinematica={enCinematica ? pasoActual.id : 'idle'}
    >
      <VistaSonda
        {...{
          mision,
          diseno,
          estetica,
          reloj,
          segundos,
          alListo,
          cofiaAbierta,
          combustibleSeparado,
          propulsoresActivos,
          instrumentosActivos: antenaActiva,
          focoCamara,
          progresoPaso: enCinematica ? progresoPaso : 0,
        }}
        activados={activadosVista}
        separacion
      />

      {/* Panel lateral izquierdo con telemetría en vivo y progreso 0% -> 100% de cada paso */}
      <aside
        className="separacion-lateral"
        role="region"
        aria-label={t('e02.Despegue.sep.aria')}
      >
        <div className="separacion-progreso-pasos" aria-hidden="true">
          {PASOS_DESPLIEGUE_SONDA.map((p, i) => (
            <span
              key={p.id}
              className={
                i < pasoIndice ? 'hecho' : i === pasoIndice ? 'actual' : 'pendiente'
              }
            >
              {i < pasoIndice ? '✓' : i + 1}
            </span>
          ))}
        </div>

        <span className="separacion-etiqueta-paso">
          {completado
            ? t('e02.Despegue.sep.inyeccion', { v0: destinoNombre.toUpperCase() })
            : t('e02.Despegue.sep.paso', { v0: pasoIndice + 1, v1: totalPasos })}
        </span>

        <h2>
          {completado
            ? t('e02.Despegue.sep.sale', { v0: destinoNombre })
            : tituloMostrado}
        </h2>

        <p>
          {completado
            ? t('e02.Despegue.sep.sale_texto', { v0: destinoNombre })
            : instruccionMostrada}
        </p>

        {enCinematica && (
          <div className={`separacion-diagnostico ${progresoPaso >= 0.86 ? 'completo' : ''}`} role="status">
            <div className="separacion-diagnostico-cabecera">
              <span>{textoDiagnostico}</span>
              <strong>{porcentaje}%</strong>
            </div>
            <div className="separacion-barra-progreso">
              <i style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        )}

        {!completado && !enCinematica && (
          <button
            type="button"
            disabled={espectador}
            className="primario separacion-btn-paso"
            onClick={iniciarCinematicaPaso}
          >
            <span aria-hidden="true">{pasoActual.icono}</span>
            <span>{botonMostrado}</span>
            <kbd>{t('e02.Despegue.sep.espacio')}</kbd>
          </button>
        )}

        {completado && (
          <button
            type="button"
            className="primario separacion-btn-paso"
            disabled={espectador}
            onClick={terminar}
          >
            <span>{t('e02.Despegue.sep.continuar', { v0: destinoNombre })}</span>
          </button>
        )}

        <ul className="separacion-bitacora">
          {PASOS_DESPLIEGUE_SONDA.map((p, i) => (
            <li
              key={p.id}
              className={
                i < pasoIndice
                  ? 'ok'
                  : i === pasoIndice && enCinematica
                  ? 'diagnosticando'
                  : i === pasoIndice
                  ? 'activo'
                  : ''
              }
            >
              <b>{i < pasoIndice ? '100%' : i === pasoIndice && enCinematica ? `${porcentaje}%` : '·'}</b>
              <span>{t(`e02.Despegue.paso.${p.id}.corto`)}</span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="separacion-pie">
        <span>{t('e02.Separacion.next_03_startup_leop')}</span>
        <button type="button" disabled={espectador} onClick={terminar}>
          {t('e02.Separacion.skip_animation')}
        </button>
      </div>
    </div>
  );
}

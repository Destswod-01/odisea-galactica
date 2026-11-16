import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  activarSeparacionEtapa,
  configurarAros,
  crearVueloAros,
  fijarEmpuje,
  pasoAros,
  resultadoAros,
} from '../motor/aros.js';
import { aplicarLanzamiento } from '../motor/mision.js';
import { soportaWebGL } from '../tres/webgl.js';
import ArosRespaldo from '../componentes/ArosRespaldo.jsx';
import { sonidos } from '../sonido.js';
import { EntradaTutorial, TutorialFase, useSinConsejos } from '../componentes/TutorialFase.jsx';
import { esModoProbar } from '../motor/tutorial.js';
import { idiomaActual, useT } from '../i18n/idioma.js';
import Separacion from '../componentes/Separacion.jsx';
import { useEspejo } from '../red/espejo.js';
import './lanzamiento-aros.css';

const Aros3D = lazy(() => import('../tres/Aros3D.jsx'));

class VisorSeguro extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <ArosRespaldo {...this.props.datos} /> : this.props.children;
  }
}

const vaciar = () => ({
  izq: false,
  der: false,
  arriba: false,
  abajo: false,
  bajarEmpuje: false,
  subirEmpuje: false,
  separar: false,
});

const TECLAS = {
  KeyW: 'arriba',
  ArrowUp: 'arriba',
  KeyS: 'abajo',
  ArrowDown: 'abajo',
  KeyA: 'izq',
  ArrowLeft: 'izq',
  KeyD: 'der',
  ArrowRight: 'der',
  KeyQ: 'bajarEmpuje',
  ShiftLeft: 'bajarEmpuje',
  KeyE: 'subirEmpuje',
  ControlLeft: 'subirEmpuje',
};

const MODOS_CAMARA = [
  { id: 'tercera', etiqueta: 'e02.Despegue.cam.tercera' },
  { id: 'lateral', etiqueta: 'e02.Despegue.cam.lateral' },
  { id: 'primera', etiqueta: 'e02.Despegue.cam.primera' },
];

// Mensaje del último aro / hito: el motor guarda solo claves y números (así el espejo no depende del idioma).
function textoUltimo(u, t) {
  if (!u.clave) return u.ok ? t('e02.Lanzamiento.100_ring_cleared') : t('e02.Lanzamiento.ring_missed_aim_for_the_next');
  return t(u.clave, { v0: u.accionClave ? t(u.accionClave) : u.v0, v1: u.v0 });
}

export default function Lanzamiento({ mision, cohetes, diseno, estetica, setEstado, alTerminar, equipo, misRoles = [], dificultad = 'intermedio' }) {
  const t = useT();
  const [sinConsejos] = useSinConsejos();
  const mostrarTutorial = !(sinConsejos || esModoProbar());
  const cohete = cohetes.find(c => c.id === diseno.cohete);
  const cfg = useMemo(() => configurarAros(mision, cohete), [mision, cohete]);
  const simulacion = useRef(
    crearVueloAros(cfg, { realista: true, solidos: cohete?.solidos ?? 0 })
  );
  const entrada = useRef(vaciar());
  const teclas = useRef(new Set());
  const dedos = useRef(new Map());
  const aplicado = useRef(false);
  const antesPausa = useRef('vuelo');

  const [fase, setFase] = useState('listo');
  const [cuenta, setCuenta] = useState(5);
  const [listo, setListo] = useState(false);
  const [camaraModo, setCamaraModo] = useState('tercera');
  const [puntosDespliegue, setPuntosDespliegue] = useState(0);
  const [vista, setVista] = useState(() => ({ ...simulacion.current }));
  const [sepEstado, setSepEstado] = useState(null);

  // Espejo en red: el espectador recibe la instantánea completa (fase, cuenta, estado del vuelo con etapa, empuje,
  // Max-Q, etc., puntos del despliegue y paso de la separación) y no simula nada.
  const espejoEstado = useMemo(
    () => ({ fase, cuenta, vista, puntosDespliegue, sep: sepEstado }),
    [fase, cuenta, vista, puntosDespliegue, sepEstado]
  );
  const aplicarEspejo = useCallback(e => {
    if (!e?.vista) return;
    simulacion.current = e.vista;
    setFase(e.fase);
    setCuenta(e.cuenta);
    setVista(e.vista);
    setPuntosDespliegue(e.puntosDespliegue ?? 0);
    setSepEstado(e.sep ?? null);
  }, []);
  const { espectador, espectadorRef } = useEspejo({ fase: 'lanzamiento', s: espejoEstado, setS: aplicarEspejo });

  const alListo = useCallback(() => setListo(true), []);
  const limpiar = useCallback(() => {
    entrada.current = vaciar();
    teclas.current.clear();
    dedos.current.clear();
  }, []);

  const actualizarEntrada = useCallback(() => {
    const e = vaciar();
    for (const code of teclas.current) if (TECLAS[code]) e[TECLAS[code]] = true;
    for (const dir of dedos.current.values()) e[dir] = true;
    entrada.current = e;
  }, []);

  const alternarCamara = useCallback(() => {
    setCamaraModo(actual => {
      const idx = MODOS_CAMARA.findIndex(m => m.id === actual);
      return MODOS_CAMARA[(idx + 1) % MODOS_CAMARA.length].id;
    });
  }, []);

  const ejecutarSeparacionManual = useCallback(() => {
    if (espectadorRef.current) return;
    if (activarSeparacionEtapa(simulacion.current)) {
      sonidos.exito();
      setVista({ ...simulacion.current });
    }
  }, [espectadorRef]);

  const cambiarEmpujeDirecto = useCallback(valor => {
    if (espectadorRef.current) return;
    fijarEmpuje(simulacion.current, valor);
    setVista({ ...simulacion.current });
  }, [espectadorRef]);

  const pausar = useCallback(() => {
    if (espectadorRef.current) return;
    limpiar();
    if (fase === 'vuelo' || fase === 'cuenta') {
      antesPausa.current = fase;
      setFase('pausa');
    }
  }, [fase, limpiar, espectadorRef]);

  useEffect(() => {
    if (espectador) return undefined;
    const bajar = e => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (fase === 'vuelo' || fase === 'cuenta') {
          e.preventDefault();
          pausar();
        }
        return;
      }
      if (e.code === 'KeyC' && (fase === 'vuelo' || fase === 'cuenta')) {
        e.preventDefault();
        alternarCamara();
        return;
      }
      if (e.code === 'Space' && fase === 'vuelo') {
        e.preventDefault();
        ejecutarSeparacionManual();
        return;
      }
      if (fase !== 'vuelo' || !TECLAS[e.code]) return;
      e.preventDefault();
      teclas.current.add(e.code);
      actualizarEntrada();
    };
    const subir = e => {
      teclas.current.delete(e.code);
      actualizarEntrada();
    };
    const ocultar = () => {
      if (document.hidden) pausar();
    };
    window.addEventListener('keydown', bajar);
    window.addEventListener('keyup', subir);
    window.addEventListener('blur', pausar);
    document.addEventListener('visibilitychange', ocultar);
    return () => {
      window.removeEventListener('keydown', bajar);
      window.removeEventListener('keyup', subir);
      window.removeEventListener('blur', pausar);
      document.removeEventListener('visibilitychange', ocultar);
    };
  }, [fase, espectador, pausar, actualizarEntrada, alternarCamara, ejecutarSeparacionManual]);

  useEffect(() => {
    if (fase !== 'cuenta' || espectador) return;
    sonidos.elegir();
    const timer = setTimeout(() => {
      if (cuenta <= 1) {
        limpiar();
        setFase('vuelo');
      } else setCuenta(c => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [fase, cuenta, espectador, limpiar]);

  useEffect(() => {
    if (fase !== 'vuelo' || espectador) return;
    let ultimo = performance.now();
    let hud = 0;
    let frame;
    let enMaxQPrevio = false;
    let alertaPrevia = null;

    const tick = ahora => {
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      const anterior = simulacion.current.indice;
      const s = pasoAros(simulacion.current, entrada.current, dt, cfg);

      if (s.indice !== anterior) {
        if (s.ultimo?.ok) sonidos.elegir();
        else sonidos.fallo();
      }
      if (s.enMaxQ && !enMaxQPrevio) sonidos.alerta();
      enMaxQPrevio = s.enMaxQ;

      if (s.alertaEtapa?.id && s.alertaEtapa.id !== alertaPrevia) sonidos.alerta();
      alertaPrevia = s.alertaEtapa?.id || null;

      if (ahora - hud > 75 || s.terminado) {
        setVista({ ...s });
        hud = ahora;
      }
      if (s.terminado) {
        limpiar();
        setFase(resultadoAros(s, cfg).aprobado ? 'separacion' : 'resultado');
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fase, espectador, cfg, limpiar]);

  const iniciar = () => {
    if (espectadorRef.current) return;
    limpiar();
    aplicado.current = false;
    setPuntosDespliegue(0);
    simulacion.current = crearVueloAros(cfg, {
      realista: true,
      solidos: cohete?.solidos ?? 0,
    });
    setVista({ ...simulacion.current });
    setCuenta(5);
    setFase('cuenta');
  };

  const resultado = resultadoAros(vista, cfg);
  const puntosTotales = resultado.puntos + puntosDespliegue;

  const continuar = () => {
    if (!resultado.aprobado || aplicado.current) return;
    aplicado.current = true;
    setEstado(e => ({
      ...aplicarLanzamiento(e, {
        etapas: resultado.etapas || [],
        errorApagado: 0,
        perdidaGuiado: resultado.fallos * 12,
        sobrecarga: resultado.sobrecarga,
      }),
      coheteSeparado: true,
      puntuacionLanzamiento: puntosTotales,
      arosLanzamiento: { aciertos: resultado.aciertos, total: cfg.total },
    }));
    alTerminar();
  };

  const objetivo = vista.ruta[vista.indice];
  const dx = objetivo ? objetivo.x - vista.x : 0;
  const dy = objetivo ? objetivo.y - vista.y : 0;
  const feedback = vista.ultimo && vista.tiempo - vista.ultimo.tiempo < 1.5;
  const datos = {
    simulacion,
    cfg,
    diseno,
    estetica,
    camaraModo,
    enCuenta: fase === 'cuenta',
    cuenta,
    alListo,
  };
  const soltarDedo = e => {
    dedos.current.delete(e.pointerId);
    actualizarEntrada();
  };

  const nombreEtapa =
    vista.etapaActual === 'solidos'
      ? t('e02.Despegue.etapa.solidos', { v0: vista.solidos })
      : vista.etapaActual === 'centaur'
      ? t('e02.Despegue.etapa.centaur')
      : t('e02.Despegue.etapa.principal');

  const camaraActual = MODOS_CAMARA.find(m => m.id === camaraModo) || MODOS_CAMARA[0];

  return (
    <section
      className={`aros-juego aros-${fase} aros-cam-${camaraModo}`}
      aria-label={t('e02.Despegue.aria')}
      data-fase={fase}
      data-camara={camaraModo}
      data-x={vista.x}
      data-y={vista.y}
      data-objetivo-x={objetivo?.x}
      data-objetivo-y={objetivo?.y}
      data-aciertos={vista.aciertos}
      data-pasados={vista.indice}
    >
      {fase !== 'separacion' && (
        <div className="aros-escena">
          <VisorSeguro datos={datos}>
            <Suspense fallback={<div className="aros-cargando">{t('e02.Despegue.preparando_rampa')}</div>}>
              {soportaWebGL() ? <Aros3D {...datos} /> : <ArosRespaldo {...datos} />}
            </Suspense>
          </VisorSeguro>
        </div>
      )}

      {fase === 'separacion' && (
        <EntradaTutorial fase="separacion" equipo={equipo} misRoles={misRoles} dificultad={dificultad} clase="aros-overlay tutorial-overlay">
          <Separacion
            {...{ mision, diseno, estetica, espectador }}
            espejo={sepEstado}
            alCambiar={setSepEstado}
            alSumarPuntos={pts => setPuntosDespliegue(p => p + pts)}
            alTerminar={() => setFase('resultado')}
          />
        </EntradaTutorial>
      )}

      {camaraModo === 'primera' && fase !== 'separacion' && (
        <svg className="aros-cabina" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="borde-cabina" x2="0" y2="1">
              <stop stopColor="#152d40" />
              <stop offset="1" stopColor="#040b12" />
            </linearGradient>
          </defs>
          <path
            d="M0 0H1200V700H0ZM75 42L32 470 210 650H990L1168 470 1125 42Z"
            fill="url(#borde-cabina)"
            fillRule="evenodd"
          />
          <path
            d="M75 42L32 470 210 650H990L1168 470 1125 42Z"
            fill="none"
            stroke="#52768a"
            strokeWidth="2"
          />
          <path d="M0 550L205 700M1200 550L995 700" stroke="#81d6e4" opacity=".6" strokeWidth="3" />
        </svg>
      )}

      <header className="aros-hud">
        <div>
          <span>{t('e02.Despegue.hud')}</span>
          <strong>
            {mision.nombre} <small>· {cohete?.nombre} ({cohete?.solidos || 0} SRB)</small>
          </strong>
        </div>
        <button
          type="button"
          className="aros-btn-camara"
          onClick={alternarCamara}
          disabled={!['vuelo', 'cuenta', 'listo'].includes(fase)}
          title={t('e02.Despegue.cam_titulo')}
        >
          🎥 {t(camaraActual.etiqueta)}
        </button>
        <div className="aros-puntos">
          <strong>{(vista.puntos + puntosDespliegue).toString().padStart(4, '0')}</strong>
          <span>{t('e02.Lanzamiento.points')}</span>
        </div>
        <button
          onClick={pausar}
          disabled={!['vuelo', 'cuenta'].includes(fase)}
          aria-label={t('e02.Lanzamiento.pause_flight')}
        >
          Ⅱ
        </button>
      </header>

      <div className="aros-mira" aria-hidden="true">
        <i />
        <b />
      </div>

      {fase === 'vuelo' && (
        <>
          <div className="aros-orientacion">
            <span>
              {t('e02.Lanzamiento.ring')}{Math.min(cfg.total, vista.indice + 1)} / {cfg.total} · {nombreEtapa}
            </span>
            <strong>
              {Math.hypot(dx, dy) <= cfg.radio
                ? t('e02.Lanzamiento.aligned')
                : `${dy > 0.6 ? '↑' : dy < -0.6 ? '↓' : ''}${dx > 0.6 ? ' →' : dx < -0.6 ? ' ←' : ''}`}
            </strong>
            <small>
              {t('e02.Despegue.altitud')}<b>{(vista.altitudKm || 0).toFixed(1)} km</b>{t('e02.Despegue.vel')}
              <b>{(vista.velocidadKmh || 0).toLocaleString(idiomaActual() === 'en' ? 'en-US' : 'es-MX')} km/h</b>{t('e02.Despegue.giro')}
              <b>{Math.round(vista.inclinacion || 0)}°</b>
            </small>
            <small>
              {vista.altitudKm < 18
                ? t('e02.Despegue.capa.1')
                : vista.altitudKm < 105
                ? t('e02.Despegue.capa.2')
                : t('e02.Despegue.capa.3')}
            </small>
          </div>

          {/* Alerta interactiva de Max-Q */}
          {vista.enMaxQ && (
            <div
              className={`aros-alerta-maxq ${(vista.estres || 0) > 0.6 ? 'peligro' : ''}`}
              role="alert"
            >
              <div>
                <span>{t('e02.Despegue.maxq.alerta')}</span>
                <strong>
                  {vista.empuje <= 0.78
                    ? t('e02.Despegue.maxq.bien')
                    : t('e02.Despegue.maxq.mal')}
                </strong>
              </div>
              <div className="aros-barra-estres" title={t('e02.Despegue.maxq.estres')}>
                <i style={{ width: `${Math.round((vista.estres || 0) * 100)}%` }} />
              </div>
              {vista.empuje > 0.75 && (
                <button
                  type="button"
                  className="aros-btn-accion-rapida"
                  onClick={() => cambiarEmpujeDirecto(0.65)}
                >
                  {t('e02.Despegue.maxq.reducir')}
                </button>
              )}
            </div>
          )}

          {/* Botón de separación de etapas en el momento justo (SRBs, Cofia, MECO) */}
          {vista.alertaEtapa && (
            <div className="aros-alerta-etapa" role="alert">
              <div>
                <span>{t('e02.Despegue.etapa.alerta', { v0: t(vista.alertaEtapa.tituloClave) })}</span>
                <strong>{t('e02.Despegue.etapa.ahora')}</strong>
              </div>
              <button
                type="button"
                className="primario aros-btn-separar"
                onClick={ejecutarSeparacionManual}
              >
                {t('e02.Despegue.etapa.boton', { v0: t(vista.alertaEtapa.accionClave) })}
              </button>
            </div>
          )}

          {/* Control de empuje (Throttle) */}
          <div className="aros-empuje-panel" role="group" aria-label={t('e02.Despegue.empuje.grupo')}>
            <div className="aros-empuje-cabecera">
              <span>{t('e02.Despegue.empuje.titulo')}</span>
              <strong>{Math.round((vista.empuje ?? 1) * 100)}%</strong>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={Math.round((vista.empuje ?? 1) * 100)}
              onChange={e => cambiarEmpujeDirecto(Number(e.target.value) / 100)}
              aria-label={t('e02.Despegue.empuje.porcentaje')}
            />
            <div className="aros-empuje-botones">
              <button type="button" onClick={() => cambiarEmpujeDirecto(0.65)}>
                {t('e02.Despegue.empuje.maxq')}
              </button>
              <button type="button" onClick={() => cambiarEmpujeDirecto(1)}>
                {t('e02.Despegue.empuje.nominal')}
              </button>
            </div>
          </div>

          {feedback && (
            <div
              key={vista.ultimo.numero}
              className={`aros-feedback ${vista.ultimo.ok ? 'acierto' : 'fallo'}`}
              role="status"
            >
              {textoUltimo(vista.ultimo, t)}
            </div>
          )}
        </>
      )}

      <footer className="aros-telemetria">
        <div>
          <span>{t('e02.Lanzamiento.hits')}</span>
          <strong>
            {vista.aciertos}
            <small> / {cfg.minimo}{t('e02.Lanzamiento.required')}</small>
          </strong>
        </div>
        <div
          className="aros-secuencia"
          aria-label={t('e02.Lanzamiento.of_rings_passed', { v0: vista.indice, v1: cfg.total })}
        >
          {vista.ruta.map((a, i) => (
            <i
              key={i}
              className={
                a.resultado === true
                  ? 'ok'
                  : a.resultado === false
                  ? 'mal'
                  : i === vista.indice
                  ? 'actual'
                  : ''
              }
            />
          ))}
        </div>
        <div>
          <span>{t('e02.Despegue.controles')}</span>
          <strong>
            WASD <small>{t('e02.Despegue.controles_teclas')}</small>
          </strong>
        </div>
      </footer>

      {fase === 'vuelo' && (
        <div className="aros-pad" role="group" aria-label={t('e02.Lanzamiento.touch_controls')}>
          {[
            ['arriba', '↑', t('e02.Lanzamiento.up')],
            ['izq', '←', t('e02.Lanzamiento.left')],
            ['abajo', '↓', t('e02.Lanzamiento.down')],
            ['der', '→', t('e02.Lanzamiento.right')],
          ].map(([dir, simbolo, nombre]) => (
            <button
              key={dir}
              className={`aros-dir-${dir}`}
              aria-label={nombre}
              onPointerDown={e => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                dedos.current.set(e.pointerId, dir);
                actualizarEntrada();
              }}
              onPointerUp={soltarDedo}
              onPointerCancel={soltarDedo}
              onLostPointerCapture={soltarDedo}
            >
              {simbolo}
            </button>
          ))}
        </div>
      )}

      {fase === 'listo' && (mostrarTutorial ? (
        <div className="aros-overlay tutorial-overlay">
          <TutorialFase
            fase="lanzamiento"
            equipo={equipo}
            misRoles={misRoles}
            dificultad={dificultad}
            datos={{ minimo: cfg.minimo, total: cfg.total }}
            deshabilitado={!listo}
            alSeguir={iniciar}
          >
            <details>
              <summary>{t('tutorial.lanzamiento.ventana')}</summary>
              <p>{t('tutorial.lanzamiento.ventanaTexto')}</p>
              <a
                href="https://science.nasa.gov/learn/basics-of-space-flight/chapter14-1/"
                target="_blank"
                rel="noreferrer"
              >
                {t('e02.Lanzamiento.reference_nasa_launch')}
              </a>
            </details>
          </TutorialFase>
        </div>
      ) : (
        <div className="aros-overlay">
          <article className="aros-tarjeta">
            <span className="aros-etiqueta">{t('e02.Despegue.listo.etiqueta')}</span>
            <h1>
              {t('e02.Despegue.listo.h1a')}
              <br />
              <em>{t('e02.Despegue.listo.h1b')}</em>
            </h1>
            <p>
              {t('e02.Despegue.listo.i1')}<b>{cohete?.nombre}</b>{t('e02.Despegue.listo.i2')}<b>Max-Q</b>
              {t('e02.Despegue.listo.i3')}
              {cohete?.solidos ? t('e02.Despegue.listo.i4', { v0: cohete.solidos }) : ''}
              {t('e02.Despegue.listo.i5')}
            </p>
            <div className="aros-reglas">
              <div>
                <strong>{cfg.total}</strong>
                <span>{t('e02.Despegue.listo.aros')}</span>
              </div>
              <div>
                <strong>Max-Q</strong>
                <span>{t('e02.Despegue.listo.bajar')}</span>
              </div>
              <div>
                <strong>
                  {cfg.minimo}/{cfg.total}
                </strong>
                <span>{t('e02.Despegue.listo.orbita')}</span>
              </div>
            </div>
            <p className="aros-ayuda">{t('e02.Despegue.listo.ayuda')}</p>
            <button className="primario" disabled={!listo || espectador} onClick={iniciar}>
              {listo ? t('e02.Lanzamiento.start_launch') : t('e02.Lanzamiento.preparing_viewer')}
            </button>
            <details>
              <summary>{t('e02.Despegue.listo.como')}</summary>
              <p>
                {t('e02.Despegue.listo.como_a')}<b>{t('e02.Despegue.listo.como_b')}</b>
                {t('e02.Despegue.listo.como_c')}<b>Max-Q</b>{t('e02.Despegue.listo.como_d')}
              </p>
              <a
                href="https://science.nasa.gov/learn/basics-of-space-flight/chapter14-1/"
                target="_blank"
                rel="noreferrer"
              >
                {t('e02.Lanzamiento.reference_nasa_launch')}
              </a>
            </details>
          </article>
        </div>
      ))}

      {fase === 'cuenta' && (
        <div className={`aros-contador-overlay ${cuenta <= 3 ? 'final' : ''}`} role="status">
          <div className="aros-cuenta-panel">
            <span>{t(`e02.Despegue.cuenta.${Math.max(1, Math.min(4, cuenta))}`)}</span>
            <strong key={cuenta}>{cuenta}</strong>
          </div>
        </div>
      )}

      {fase === 'pausa' && (
        <div className="aros-overlay">
          <article className="aros-tarjeta corta">
            <span className="aros-etiqueta">{t('e02.Lanzamiento.flight_paused')}</span>
            <h1>
              {t('e02.Lanzamiento.you_are')}
              <br />
              {t('e02.Lanzamiento.in_control')}
            </h1>
            <p>{t('e02.Despegue.pausa.texto')}</p>
            <button
              className="primario"
              disabled={espectador}
              onClick={() => {
                limpiar();
                setFase(antesPausa.current);
              }}
            >
              {t('e02.Lanzamiento.resume_flight')}
            </button>
            <button disabled={espectador} onClick={iniciar}>{t('e02.Lanzamiento.restart_attempt')}</button>
          </article>
        </div>
      )}

      {fase === 'resultado' && (
        <div className="aros-overlay">
          <article className={`aros-tarjeta corta ${resultado.aprobado ? 'victoria' : ''}`}>
            <span className="aros-etiqueta">
              {resultado.aprobado ? t('e02.Despegue.res.orbita') : t('e02.Lanzamiento.attempt_finished')}
            </span>
            <h1>{resultado.aprobado ? t('e02.Lanzamiento.probe_released') : t('e02.Lanzamiento.try_again')}</h1>
            <div className="aros-marcadorresultado">
              <strong>{puntosTotales}</strong>
              <span>
                {t('e02.Lanzamiento.points_55')}{resultado.aciertos}{t('e02.Lanzamiento.of')}{cfg.total}{t('e02.Lanzamiento.rings_57')}
                {resultado.bonoMaxQ ? t('e02.Despegue.res.bono') : ''}
              </span>
            </div>
            <p>
              {resultado.aprobado
                ? t('e02.Despegue.res.ok', {
                    v0: resultado.fallos
                      ? t('e02.Despegue.res.desvios', { v0: resultado.fallos * 12 })
                      : t('e02.Lanzamiento.perfect_guidance_you_keep_all_your'),
                    v1: resultado.sobrecarga ? t('e02.Despegue.res.sobrecarga') : '',
                  })
                : t('e02.Despegue.res.mal', { v0: cfg.minimo })}
            </p>
            {resultado.aprobado && (
              <button className="primario" onClick={continuar}>
                {t('e02.Lanzamiento.start_leop')}
              </button>
            )}
            <button className={resultado.aprobado ? '' : 'primario'} disabled={espectador} onClick={iniciar}>
              {resultado.aprobado ? t('e02.Lanzamiento.improve_score') : t('e02.Lanzamiento.retry_launch')}
            </button>
          </article>
        </div>
      )}
    </section>
  );
}

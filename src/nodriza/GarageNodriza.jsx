// Garage y Visualizador 3D independiente de la Nave Nodriza ASTRION-X.
// Diseñado aparte en su propio worktree para integrarse limpiamente al sistema ÓRBITA 2.0.
// Incluye los 3 modelos de nodrizas (ASTRION-X, ASTRION-V, ASTRION-S) y todas las especificaciones del póster,
// dejando fuera los mini-drones (que desarrolla otro integrante del equipo).
import { Component, lazy, Suspense, useState } from 'react';
import catalogoNodrizas from '../datos/nodrizas.json';
import { soportaWebGL } from '../tres/webgl.js';
import EscenaGarageNodriza from './EscenaGarageNodriza.jsx';
import { PanelRecursosNodriza } from '../componentes/PanelRecursos.jsx';
import './garage-nodriza.css';

const SimuladorMisionNodriza = lazy(() => import('../paisajes/SimuladorMisionNodriza.jsx'));

const ACABADOS = [
  { id: 'estandar', nombre: 'Estándar ASTRION', casco: null, acento: null },
  { id: 'artemis', nombre: 'Blanco Criogénico', casco: '#f8fafc', acento: '#00f0ff' },
  { id: 'mli_oro', nombre: 'Blindaje Térmico Oro', casco: '#e2c792', acento: '#38bdf8' },
  { id: 'titanio', nombre: 'Titanio Profundo', casco: '#94a3b8', acento: '#60a5fa' },
];

class RespaldoWebGL extends Component {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    if (this.state.fallo) {
      return this.props.respaldo;
    }
    return this.props.children;
  }
}

// Insignia original del programa ASTRION (no usar logos de agencias reales: las reglas de Space Apps lo prohíben).
function LogoAstrionSVG({ className = 'nx-insignia-svg' }) {
  // Octágono de 8 lados como el casco de la nodriza, con 4 alas en X y el núcleo al centro.
  const octagono = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${60 + Math.cos(a) * 15},${50 + Math.sin(a) * 15}`;
  }).join(' ');
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true">
      <defs>
        <radialGradient id="astrionFondo" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#123b5c" />
          <stop offset="65%" stopColor="#0a2238" />
          <stop offset="100%" stopColor="#050f1c" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="50" r="42" fill="url(#astrionFondo)" stroke="#38bdf8" strokeWidth="1.4" strokeOpacity="0.6" />
      {/* Estrellas */}
      <circle cx="36" cy="24" r="1.1" fill="#fff" />
      <circle cx="84" cy="26" r="1.2" fill="#fff" />
      <circle cx="30" cy="70" r="1" fill="#fff" />
      <circle cx="88" cy="72" r="1.1" fill="#fff" />
      {/* Órbita de trayectoria */}
      <ellipse cx="60" cy="50" rx="44" ry="13" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeOpacity="0.85" transform="rotate(-18 60 50)" />
      {/* Alas solares en X */}
      {[45, 135, 225, 315].map((g) => (
        <rect key={g} x="70" y="46.5" width="20" height="7" rx="1" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="0.8" transform={`rotate(${g} 60 50)`} />
      ))}
      {/* Casco octagonal y núcleo */}
      <polygon points={octagono} fill="#e6edf5" stroke="#38bdf8" strokeWidth="1.2" />
      <circle cx="60" cy="50" r="5.5" fill="#38bdf8" />
      <text x="60" y="88" textAnchor="middle" fill="#e6edf5" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize="9" letterSpacing="2.5">
        ASTRION
      </text>
    </svg>
  );
}

function IconoCicloSVG({ id }) {
  switch (id) {
    case 'lanzamiento':
      return (
        <svg viewBox="0 0 36 36" className="nx-ciclo-svg" aria-hidden="true">
          <path
            d="M22 6c4 0 8 4 8 8-4 6-10 11-16 14l-4-4c3-6 8-12 12-18zM10 24l-4 6 6-4M19 13a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'navegacion':
      return (
        <svg viewBox="0 0 36 36" className="nx-ciclo-svg" aria-hidden="true">
          <circle cx="18" cy="18" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <ellipse
            cx="18"
            cy="18"
            rx="14"
            ry="6"
            transform="rotate(-25 18 18)"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="29" cy="13" r="2" fill="currentColor" />
        </svg>
      );
    case 'exploracion':
      return (
        <svg viewBox="0 0 36 36" className="nx-ciclo-svg" aria-hidden="true">
          <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M22 22l8 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case 'despliegue':
      return (
        <svg viewBox="0 0 36 36" className="nx-ciclo-svg" aria-hidden="true">
          <path
            d="M8 16a10 10 0 0120 0H8zM10 16l8 11 8-11M18 16v11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="29" r="2.2" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 36 36" className="nx-ciclo-svg" aria-hidden="true">
          <path
            d="M12 28l6-14 6 14M14 23h8M18 11a2 2 0 100-4 2 2 0 000 4zM10 14a10 10 0 0116 0M7 10a15 15 0 0122 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

function Esquema2DRespaldo({ modelo, colorAcento, bahiaAbierta, desplegado }) {
  return (
    <div className="nx-respaldo-2d" role="img" aria-label={`Esquema técnico de ${modelo.nombre}`}>
      <svg viewBox="0 0 600 340">
        <defs>
          <radialGradient id="nxGlow2D" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colorAcento} stopOpacity="0.28" />
            <stop offset="100%" stopColor="#040b18" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="170" r="150" fill="url(#nxGlow2D)" />
        {/* Alas solares */}
        {desplegado > 0.3 && (
          <>
            <rect x="45" y="65" width="145" height="62" rx="4" fill="#102a56" stroke={colorAcento} strokeWidth="2" />
            <rect x="410" y="65" width="145" height="62" rx="4" fill="#102a56" stroke={colorAcento} strokeWidth="2" />
            <rect x="45" y="210" width="145" height="62" rx="4" fill="#102a56" stroke={colorAcento} strokeWidth="2" />
            <rect x="410" y="210" width="145" height="62" rx="4" fill="#102a56" stroke={colorAcento} strokeWidth="2" />
          </>
        )}
        {/* Casco central octogonal */}
        <polygon
          points="240,95 360,95 405,140 405,205 360,250 240,250 195,205 195,140"
          fill="#1e293b"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        {/* Núcleo IA */}
        <circle cx="300" cy="155" r="38" fill="#0f172a" stroke={colorAcento} strokeWidth="2.5" />
        {/* Antena */}
        <path d="M265,72 Q300,98 335,72" fill="none" stroke="#f8fafc" strokeWidth="3" />
        <line x1="300" y1="85" x2="300" y2="55" stroke={colorAcento} strokeWidth="2.5" />
        {/* Bahía frontal */}
        <rect
          x="252"
          y="196"
          width="96"
          height="42"
          rx="4"
          fill={bahiaAbierta ? '#022c43' : '#334155'}
          stroke={colorAcento}
          strokeWidth="2"
        />
        <text x="300" y="221" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontFamily="monospace">
          {bahiaAbierta ? 'BAHÍA ABIERTA' : 'BAHÍA CERRADA'}
        </text>
      </svg>
    </div>
  );
}

export default function GarageNodriza({ alVolver, alConfirmarNodriza }) {
  const {
    programa,
    modelos,
    tecnologias_clave: tecnologias,
    sistemas_principales: sistemas,
    puntos_inspeccion: puntosInspeccion,
    ciclo_mision: cicloMision,
    ventajas_clave: ventajas,
  } = catalogoNodrizas;

  const [modeloId, setModeloId] = useState(modelos[0].id);
  const [acabadoId, setAcabadoId] = useState('estandar');
  const [entorno, setEntorno] = useState('orbita'); // 'orbita' (como el póster) | 'garage' (hangar industrial)
  const [focoActual, setFocoActual] = useState('general');
  const [pasoCiclo, setPasoCiclo] = useState(4); // Paso 4 (Despliegue) por defecto como en el póster

  // Estados interactivos de la nave nodriza en el garage
  const [desplegado, setDesplegado] = useState(1);
  const [bahiaAbierta, setBahiaAbierta] = useState(true);
  const [propulsionActiva, setPropulsionActiva] = useState(true);
  const [escanerActivo, setEscanerActivo] = useState(true);
  const [laserActivo, setLaserActivo] = useState(false);
  const [girar, setGirar] = useState(false);
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(true);
  const [modoPaisajes, setModoPaisajes] = useState(null); // null | 'despegue' | 'crucero' | 'orbita' | 'despliegue' | 'superficie'

  const modelo = modelos.find((m) => m.id === modeloId) || modelos[0];
  const acabado = ACABADOS.find((a) => a.id === acabadoId) || ACABADOS[0];
  const colorCasco = acabado.casco || modelo.casco;
  const colorAcento = acabado.acento || modelo.acento;
  const puntoFoco = puntosInspeccion.find((p) => p.id === focoActual) || puntosInspeccion[0];
  const espec = modelo.especificaciones;

  if (modoPaisajes) {
    return (
      <Suspense fallback={<div className="panel">Cargando Paisajes Espaciales y Terrenos 3D NASA…</div>}>
        <SimuladorMisionNodriza
          modeloInicialId={modelo.id}
          faseInicial={modoPaisajes}
          alVolverGarage={() => setModoPaisajes(null)}
        />
      </Suspense>
    );
  }

  const aplicarPasoCiclo = (item) => {
    setPasoCiclo(item.paso);
    const st = item.estadoSimulado;
    if (!st) return;
    setDesplegado(st.desplegado);
    setBahiaAbierta(st.bahiaAbierta);
    setPropulsionActiva(st.propulsionActiva);
    setEscanerActivo(st.escanerActivo);
    setLaserActivo(st.laserActivo);
    if (item.id === 'despliegue') setFocoActual('bahia');
    else if (item.id === 'transmision') setFocoActual('antena');
    else if (item.id === 'exploracion') setFocoActual('nucleo');
    else setFocoActual('general');
  };

  return (
    <section className="nx-garage" aria-label="Garage de la Nave Nodriza ASTRION-X">
      {/* ───────────── FONDO ESCENA 3D INTERACTIVA ───────────── */}
      <div className="nx-lienzo-3d">
        {soportaWebGL() ? (
          <RespaldoWebGL
            respaldo={
              <Esquema2DRespaldo
                modelo={modelo}
                colorAcento={colorAcento}
                bahiaAbierta={bahiaAbierta}
                desplegado={desplegado}
              />
            }
          >
            <EscenaGarageNodriza
              modelo={modelo}
              colorCasco={colorCasco}
              colorAcento={colorAcento}
              entorno={entorno}
              desplegado={desplegado}
              bahiaAbierta={bahiaAbierta}
              propulsionActiva={propulsionActiva}
              escanerActivo={escanerActivo}
              laserActivo={laserActivo}
              girar={girar}
              mostrarEtiquetas={mostrarEtiquetas}
              focoActual={focoActual}
              puntosInspeccion={puntosInspeccion}
              alSeleccionarFoco={setFocoActual}
            />
          </RespaldoWebGL>
        ) : (
          <Esquema2DRespaldo
            modelo={modelo}
            colorAcento={colorAcento}
            bahiaAbierta={bahiaAbierta}
            desplegado={desplegado}
          />
        )}
      </div>

      {/* ───────────── CABECERA SUPERIOR (ESTILO PÓSTER ASTRION-X) ───────────── */}
      <header className="nx-cabecera">
        <div className="nx-identidad">
          <LogoAstrionSVG />
          <div className="nx-titulos">
            <div className="nx-titulo-Principal">
              <h1>{modelo.codigo}</h1>
              <span className="nx-badge-worktree">GARAGE NODRIZA · 3 MODELOS</span>
            </div>
            <p className="nx-subtitulo">{programa.subtitulo}</p>
            <p className="nx-pilares">{programa.pilares.join('  •  ')}</p>
          </div>
        </div>

        {/* Selector de los 3 Modelos de Naves Nodrizas */}
        <nav className="nx-selector-modelos" aria-label="Modelos de nave nodriza">
          {modelos.map((m, idx) => {
            const activo = m.id === modelo.id;
            return (
              <button
                key={m.id}
                type="button"
                className={`nx-boton-modelo ${activo ? 'activo' : ''}`}
                style={{ '--nx-color-modelo': m.acento }}
                onClick={() => {
                  setModeloId(m.id);
                  setFocoActual('general');
                }}
                aria-pressed={activo}
              >
                <span className="nx-modelo-indice">0{idx + 1}</span>
                <div>
                  <strong>{m.codigo}</strong>
                  <small>{m.nombre.split('·')[1]?.trim() || m.rol}</small>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="nx-cabecera-derecha">
          <button
            type="button"
            className="primario nx-btn-paisajes"
            onClick={() => setModoPaisajes('despegue')}
          >
            🚀 Simular Misión y Paisajes 3D ↗
          </button>
          {alVolver && (
            <button type="button" className="nx-btn-volver" onClick={alVolver}>
              ← Volver al sistema
            </button>
          )}
        </div>
      </header>

      {/* ───────────── CUERPO PRINCIPAL: HUD IZQUIERDO · VISOR CENTRAL · HUD DERECHO ───────────── */}
      <div className="nx-cuerpo-hud">
        {/* COLUMNA IZQUIERDA: ESPECIFICACIONES PRINCIPALES + TECNOLOGÍAS CLAVE */}
        <aside className="nx-columna nx-columna-izq">
          <section className="nx-panel" aria-label="Especificaciones principales">
            <h2 className="nx-panel-titulo">ESPECIFICACIONES PRINCIPALES</h2>
            <dl className="nx-lista-espec">
              <div>
                <dt>Diámetro (con paneles):</dt>
                <dd>{espec.diametro}</dd>
              </div>
              <div>
                <dt>Altura:</dt>
                <dd>{espec.altura}</dd>
              </div>
              <div>
                <dt>Masa total:</dt>
                <dd>{espec.masa_total}</dd>
              </div>
              <div>
                <dt>Carga útil (sondas):</dt>
                <dd>{espec.carga_util}</dd>
              </div>
              <div>
                <dt>Autonomía:</dt>
                <dd>{espec.autonomia}</dd>
              </div>
              <div>
                <dt>Propulsión:</dt>
                <dd>{espec.propulsion}</dd>
              </div>
              <div>
                <dt>Energía:</dt>
                <dd>{espec.energia}</dd>
              </div>
              <div>
                <dt>Alcance:</dt>
                <dd>{espec.alcance}</dd>
              </div>
            </dl>

            {/* Barras comparativas de rendimiento del modelo actual */}
            <div className="nx-barras-rendimiento">
              <div className="nx-barra-item">
                <span>Potencia Híbrida</span>
                <strong>{modelo.metricas.potencia_w.toLocaleString('es-MX')} W</strong>
                <div className="nx-barra-riel">
                  <div
                    className="nx-barra-relleno"
                    style={{ width: `${Math.min(100, (modelo.metricas.potencia_w / 9000) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="nx-barra-item">
                <span>Impulso Δv</span>
                <strong>{modelo.metricas.delta_v_ms.toLocaleString('es-MX')} m/s</strong>
                <div className="nx-barra-riel">
                  <div
                    className="nx-barra-relleno"
                    style={{ width: `${Math.min(100, (modelo.metricas.delta_v_ms / 12000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <PanelRecursosNodriza modeloId={modeloId} />

          <section className="nx-panel" aria-label="Tecnologías clave">
            <h2 className="nx-panel-titulo">TECNOLOGÍAS CLAVE</h2>
            <ul className="nx-lista-iconos">
              {tecnologias.map((t) => (
                <li key={t.id} title={t.detalle}>
                  <span className="nx-icono-circulo" aria-hidden="true">
                    {t.icono}
                  </span>
                  <div>
                    <strong>{t.titulo}</strong>
                    <small>{t.subtitulo}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* ZONA CENTRAL: CONTROLES DEL GARAGE, CÁMARAS Y DIAGNÓSTICO DE PIEZA */}
        <main className="nx-zona-central">
          {/* Selector rápido de puntos de inspección 3D */}
          <div className="nx-barra-camaras" role="toolbar" aria-label="Puntos de cámara de la nodriza">
            {puntosInspeccion.map((p) => (
              <button
                key={p.id}
                type="button"
                className={focoActual === p.id ? 'activo' : ''}
                onClick={() => setFocoActual(p.id)}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          {/* Barra inferior compacta con diagnóstico del foco y accionadores mecánicos */}
          <div className="nx-dock-inferior">
            <div className="nx-ficha-compacta">
              <span className="nx-eyebrow">{modelo.codigo} · {puntoFoco.etiqueta}</span>
              <p>{puntoFoco.descripcion}</p>
            </div>

            <div className="nx-controles-mecanicos" role="group" aria-label="Accionadores del garage">
              <button
                type="button"
                className={entorno === 'garage' ? 'activo' : ''}
                onClick={() => setEntorno((e) => (e === 'orbita' ? 'garage' : 'orbita'))}
              >
                {entorno === 'orbita' ? '🌍 Órbita Póster' : '🏢 Garage Hangar'}
              </button>
              <button
                type="button"
                className={bahiaAbierta ? 'activo' : ''}
                onClick={() => setBahiaAbierta((b) => !b)}
              >
                {bahiaAbierta ? '🔓 Bahía Abierta' : '🔒 Bahía Cerrada'}
              </button>
              <button
                type="button"
                className={desplegado > 0.5 ? 'activo' : ''}
                onClick={() => setDesplegado((d) => (d > 0.5 ? 0.05 : 1))}
              >
                {desplegado > 0.5 ? '☀️ Alas Desplegadas' : '📦 Alas Plegadas'}
              </button>
              <button
                type="button"
                className={propulsionActiva ? 'activo' : ''}
                onClick={() => setPropulsionActiva((p) => !p)}
              >
                {propulsionActiva ? '🔥 Iónicos ON' : '⏸️ Iónicos OFF'}
              </button>
              <button
                type="button"
                className={mostrarEtiquetas ? 'activo' : ''}
                onClick={() => setMostrarEtiquetas((v) => !v)}
              >
                {mostrarEtiquetas ? '🏷️ Etiquetas 3D' : '🏷️ Sin Etiquetas'}
              </button>
              <button
                type="button"
                className={girar ? 'activo' : ''}
                onClick={() => setGirar((g) => !g)}
              >
                {girar ? '🔄 Giro ON' : '🔄 Giro OFF'}
              </button>
            </div>
          </div>
        </main>

        {/* COLUMNA DERECHA: SISTEMAS PRINCIPALES + ESTADO MODULAR DE LA NODRIZA */}
        <aside className="nx-columna nx-columna-der">
          <section className="nx-panel" aria-label="Sistemas principales">
            <h2 className="nx-panel-titulo">SISTEMAS PRINCIPALES</h2>
            <ul className="nx-lista-iconos nx-lista-sistemas">
              {sistemas.map((s) => {
                const seleccionado = focoActual === s.foco;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`nx-sistema-btn ${seleccionado ? 'activo' : ''}`}
                      onClick={() => {
                        setFocoActual(s.foco);
                        if (s.foco === 'bahia') setBahiaAbierta(true);
                        if (s.foco === 'paneles') setDesplegado(1);
                      }}
                    >
                      <span className="nx-icono-circulo" aria-hidden="true">
                        {s.icono}
                      </span>
                      <div>
                        <strong>{s.titulo}</strong>
                        <small>{s.subtitulo}</small>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="nx-panel nx-panel-ficha-modelo" aria-label="Perfil del modelo seleccionado">
            <h2 className="nx-panel-titulo">PERFIL · {modelo.codigo}</h2>
            <p className="nx-rol-modelo">{modelo.rol}</p>
            <p className="nx-resumen-modelo">{modelo.resumen}</p>
            <div className="nx-acabados">
              <span className="nx-eyebrow">ACABADO DE CASCO</span>
              <div className="nx-acabados-lista">
                {ACABADOS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={acabadoId === a.id ? 'activo' : ''}
                    onClick={() => setAcabadoId(a.id)}
                  >
                    {a.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div className="nx-puerto-bahia">
              <div>
                <span className="nx-eyebrow">BAHÍA MODULAR</span>
                <strong>{modelo.metricas.bahia_slots} Rieles · {espec.carga_util}</strong>
              </div>
              <span className="nx-estado-puerto">LISTO INTEGRACIÓN</span>
            </div>
            <button
              type="button"
              className="primario nx-btn-confirmar"
              onClick={() => setModoPaisajes('superficie')}
            >
              🪐 Explorar Terrenos 3D (Luna/Marte) ↗
            </button>
            {alConfirmarNodriza && (
              <button
                type="button"
                className="primario nx-btn-confirmar"
                onClick={() => alConfirmarNodriza(modelo)}
              >
                Seleccionar {modelo.codigo} ↗
              </button>
            )}
          </section>
        </aside>
      </div>

      {/* ───────────── FRANJA INFERIOR: CICLO DE MISIÓN · VENTAJAS CLAVE · PROYECTO ASTRION-X ───────────── */}
      <footer className="nx-pie-hud">
        {/* CICLO DE MISIÓN INTERACTIVO (1 a 5 igual al póster) */}
        <section className="nx-panel nx-panel-ciclo" aria-label="Ciclo de misión">
          <h2 className="nx-panel-titulo">CICLO DE MISIÓN</h2>
          <div className="nx-pasos-ciclo">
            {cicloMision.map((item, idx) => {
              const activo = pasoCiclo === item.paso;
              return (
                <div key={item.id} className="nx-paso-contenedor">
                  <button
                    type="button"
                    className={`nx-paso-btn ${activo ? 'activo' : ''}`}
                    onClick={() => aplicarPasoCiclo(item)}
                    title={item.descripcion}
                  >
                    <IconoCicloSVG id={item.id} />
                    <span>{item.nombre}</span>
                  </button>
                  {idx < cicloMision.length - 1 && (
                    <span className="nx-flecha-ciclo" aria-hidden="true">
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* VENTAJAS CLAVE */}
        <section className="nx-panel nx-panel-ventajas" aria-label="Ventajas clave">
          <h2 className="nx-panel-titulo">VENTAJAS CLAVE</h2>
          <ul className="nx-lista-ventajas">
            {ventajas.map((v) => (
              <li key={v}>
                <span className="nx-check" aria-hidden="true">
                  ✔
                </span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* SELLO PROYECTO ASTRION-X */}
        <section className="nx-panel nx-panel-sello" aria-label="Sello del proyecto">
          <LogoAstrionSVG className="nx-insignia-svg nx-insignia-sello" />
          <div>
            <strong>{programa.pie_proyecto}</strong>
            <p>{programa.pie_descripcion}</p>
          </div>
        </section>
      </footer>
    </section>
  );
}

export function Demo() {
  return <GarageNodriza />;
}

// Simulador 3D de Secuencia de Misión, Paisajes Espaciales y Campos de Terreno de la NASA.
// Conecta la Nave Nodriza (ASTRION-X / V / S) desde el despegue en la Tierra, el viaje por
// el espacio profundo y el estacionamiento en órbita hasta el descenso a tierra firme (Luna, Marte, Europa, Ío, etc.).
import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, Stars } from '@react-three/drei';
import catalogoNodrizas from '../datos/nodrizas.json';
import datosPaisajes from '../datos/paisajesNasa.json';
import Nodriza3D from '../nodriza/Nodriza3D.jsx';
import PlanetaNasaHD from './PlanetasNasaHD.jsx';
import DespegueAtmosferico3D from './DespegueAtmosferico3D.jsx';
import CruceroEspacial3D from './CruceroEspacial3D.jsx';
import CampoTerreno3D from './CampoTerreno3D.jsx';
import './paisajes.css';

const SUB_ESCENAS_DESPEGUE = [
  {
    id: 'ignicion_plataforma',
    nombre: 'Ignición y Vapor en Plataforma',
    detalle: 'Motores principales a máxima potencia, columna de fuego hiperbrillante y nubes de vapor en Cabo Cañaveral.',
  },
  {
    id: 'mar_nubes',
    nombre: 'Ascenso sobre Mar de Nubes',
    detalle: 'El cohete atraviesa la capa de cúmulos troposféricos iluminados por el amanecer solar.',
  },
  {
    id: 'arco_orbital',
    nombre: 'Arco Orbital LEO y Cofia',
    detalle: 'Salida sobre el horizonte azul de la Tierra y apertura de las valvas de la cofia liberando la nodriza.',
  },
];

/* ───────────── Escena 3D de Estacionamiento Orbital y Despliegue (Fases 3 y 4) ───────────── */
function EscenaOrbitaYDespliegue({
  planeta,
  modeloNodriza,
  modoDespliegue = false,
  vistaGloboCompleto = false,
}) {
  return (
    <group>
      <Stars radius={95} depth={50} count={2200} factor={2.4} fade speed={0.2} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[10, 12, 8]} intensity={3.6} color="#fff7ed" castShadow />
      <directionalLight position={[-8, -6, -5]} intensity={1.8} color={planeta.color_atmosfera} />

      {vistaGloboCompleto ? (
        /* Vista de Globo Planetario HD completo (Fila 1 de la referencia) + Nodriza en órbita */
        <>
          <PlanetaNasaHD id={planeta.id} radio={2.85} position={[-1.4, 0.1, -1.2]} />
          <group position={[3.1, 0.65, 2.2]} rotation={[0.22, -0.65, -0.12]} scale={0.44}>
            <Nodriza3D
              modelo={modeloNodriza.id}
              configuracion3D={modeloNodriza.configuracion_3d}
              colorCasco={modeloNodriza.casco}
              colorAcento={modeloNodriza.acento}
              desplegado={1}
              bahiaAbierta={modoDespliegue}
              propulsionActiva
              escanerActivo
              laserActivo={modoDespliegue}
            />
          </group>
        </>
      ) : (
        /* Vista de Horizonte Orbital Cercano (Fila 2 de la referencia) con la Nodriza estacionada */
        <>
          <PlanetaNasaHD id={planeta.id} radio={19.5} position={[0, -21.6, -4.5]} />
          <group
            position={[0, 0.25, 0.8]}
            rotation={[modoDespliegue ? 0.24 : 0.08, -0.35, 0]}
            scale={0.78}
          >
            <Nodriza3D
              modelo={modeloNodriza.id}
              configuracion3D={modeloNodriza.configuracion_3d}
              colorCasco={modeloNodriza.casco}
              colorAcento={modeloNodriza.acento}
              desplegado={1}
              bahiaAbierta={modoDespliegue}
              propulsionActiva
              escanerActivo
              laserActivo={modoDespliegue}
            />
          </group>
        </>
      )}
    </group>
  );
}

function EncuadreCamara({ faseActiva }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (faseActiva === 'superficie') {
      camera.position.set(0, 2.6, 11.4);
    } else if (faseActiva === 'despegue') {
      camera.position.set(0, 1.4, 12.2);
    } else {
      camera.position.set(0, 3.2, 11.8);
    }
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [faseActiva, camera, controls]);
  return null;
}

export default function SimuladorMisionNodriza({
  modeloInicialId = 'astrion_x',
  faseInicial = 'orbita',
  alVolverGarage,
}) {
  const { modelos } = catalogoNodrizas;
  const {
    fases_secuencia: fasesSecuencia,
    planetas_orbitales: planetasOrbitales,
    campos_terreno: camposTerreno,
    escenarios_crucero: escenariosCrucero,
  } = datosPaisajes;

  const [modeloId, setModeloId] = useState(modeloInicialId);
  const [faseActiva, setFaseActiva] = useState(faseInicial);
  const [subDespegue, setSubDespegue] = useState('ignicion_plataforma');
  const [cruceroId, setCruceroId] = useState('via_lactea_nebulosa');
  const [planetaId, setPlanetaId] = useState('marte');
  const [vistaGlobo, setVistaGlobo] = useState(false);
  const [terrenoId, setTerrenoId] = useState('terreno_marte');

  const modelo = modelos.find((m) => m.id === modeloId) || modelos[0];
  const faseInfo = fasesSecuencia.find((f) => f.id === faseActiva) || fasesSecuencia[0];
  const planetaActual = planetasOrbitales.find((p) => p.id === planetaId) || planetasOrbitales[0];
  const terrenoActual = camposTerreno.find((t) => t.id === terrenoId) || camposTerreno[0];
  const cruceroActual = escenariosCrucero.find((c) => c.id === cruceroId) || escenariosCrucero[0];
  const despegueActual = SUB_ESCENAS_DESPEGUE.find((s) => s.id === subDespegue) || SUB_ESCENAS_DESPEGUE[0];

  const seleccionarPlaneta = (p) => {
    setPlanetaId(p.id);
    if (p.terreno_asociado) {
      setTerrenoId(p.terreno_asociado);
    }
  };

  return (
    <section className="ps-simulador" aria-label="Simulador de Misión y Paisajes Espaciales NASA">
      {/* ───────────── LIENZO 3D A PANTALLA COMPLETA ───────────── */}
      <div className="ps-lienzo-3d">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 3.2, 11.8], fov: 40, near: 0.1, far: 180 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color
            attach="background"
            args={[faseActiva === 'superficie' ? terrenoActual.color_cielo : '#030814']}
          />
          <Suspense fallback={null}>
            <Environment resolution={128} frames={1}>
              <Lightformer
                form="rect"
                intensity={2.4}
                color="#e0f2fe"
                position={[0, 12, 4]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[20, 20, 1]}
              />
            </Environment>

            {faseActiva === 'despegue' && (
              <DespegueAtmosferico3D subEscena={subDespegue} modeloNodriza={modelo} />
            )}

            {faseActiva === 'crucero' && (
              <CruceroEspacial3D escenarioId={cruceroId} modeloNodriza={modelo} />
            )}

            {(faseActiva === 'orbita' || faseActiva === 'despliegue') && (
              <EscenaOrbitaYDespliegue
                planeta={planetaActual}
                modeloNodriza={modelo}
                modoDespliegue={faseActiva === 'despliegue'}
                vistaGloboCompleto={vistaGlobo}
              />
            )}

            {faseActiva === 'superficie' && (
              <CampoTerreno3D bioma={terrenoActual} modeloNodriza={modelo} />
            )}
          </Suspense>

          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.07}
            minDistance={3.2}
            maxDistance={26}
            maxPolarAngle={faseActiva === 'superficie' ? Math.PI * 0.49 : Math.PI * 0.85}
          />
          <EncuadreCamara faseActiva={faseActiva} />
        </Canvas>
      </div>

      {/* ───────────── CABECERA DE NAVEGACIÓN DE FASES (1 A 5) ───────────── */}
      <header className="ps-cabecera">
        <div className="ps-marca">
          {alVolverGarage && (
            <button type="button" className="ps-btn-garage" onClick={alVolverGarage}>
              ← Garage Nodriza
            </button>
          )}
          <div>
            <span className="ps-eyebrow">SECUENCIA DE MISIÓN Y ENTORNOS NASA</span>
            <h1>{modelo.codigo} · {faseInfo.titulo}</h1>
          </div>
        </div>

        {/* Pestañas de las 5 Fases del Viaje */}
        <nav className="ps-fases-nav" aria-label="Fases de la misión">
          {fasesSecuencia.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ps-fase-tab ${faseActiva === f.id ? 'activa' : ''}`}
              onClick={() => setFaseActiva(f.id)}
            >
              <strong>{f.titulo}</strong>
              <small>{f.subtitulo}</small>
            </button>
          ))}
        </nav>

        {/* Selector rápido del modelo de nodriza */}
        <div className="ps-selector-nodriza" role="group" aria-label="Cambiar modelo de nodriza">
          {modelos.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === modelo.id ? 'activo' : ''}
              onClick={() => setModeloId(m.id)}
            >
              {m.codigo}
            </button>
          ))}
        </div>
      </header>

      {/* ───────────── PANEL LATERAL IZQUIERDO: SELECTOR DE PAISAJES / BIOMAS ───────────── */}
      <div className="ps-cuerpo">
        <aside className="ps-panel-selector">
          {faseActiva === 'despegue' && (
            <>
              <h2>ETAPAS DEL ASCENSO TERRESTRE</h2>
              <div className="ps-lista-tarjetas">
                {SUB_ESCENAS_DESPEGUE.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`ps-tarjeta ${subDespegue === s.id ? 'activa' : ''}`}
                    onClick={() => setSubDespegue(s.id)}
                  >
                    <strong>{s.nombre}</strong>
                    <small>{s.detalle}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {faseActiva === 'crucero' && (
            <>
              <h2>ESCENARIOS DE ESPACIO PROFUNDO (6)</h2>
              <div className="ps-lista-tarjetas">
                {escenariosCrucero.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`ps-tarjeta ${cruceroId === c.id ? 'activa' : ''}`}
                    onClick={() => setCruceroId(c.id)}
                  >
                    <strong>{c.nombre}</strong>
                    <small>{c.subtitulo}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {(faseActiva === 'orbita' || faseActiva === 'despliegue') && (
            <>
              <div className="ps-titulo-con-switch">
                <h2>CUERPOS CELESTES EN ÓRBITA (6)</h2>
                <button
                  type="button"
                  className="ps-switch-vista"
                  onClick={() => setVistaGlobo((v) => !v)}
                >
                  {vistaGlobo ? '🔭 Vista: Globo Completo' : '🛰️ Vista: Horizonte Rasante'}
                </button>
              </div>
              <div className="ps-lista-tarjetas">
                {planetasOrbitales.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`ps-tarjeta ${planetaId === p.id ? 'activa' : ''}`}
                    onClick={() => seleccionarPlaneta(p)}
                  >
                    <strong>{p.nombre}</strong>
                    <small>{p.subtitulo}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {faseActiva === 'superficie' && (
            <>
              <h2>CAMPOS DE TERRENO 3D · TIERRA FIRME (6)</h2>
              <div className="ps-lista-tarjetas">
                {camposTerreno.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`ps-tarjeta ${terrenoId === t.id ? 'activa' : ''}`}
                    onClick={() => setTerrenoId(t.id)}
                  >
                    <strong>{t.nombre}</strong>
                    <small>{t.subtitulo}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* ───────────── PANEL DERECHO: TELEMETRÍA CIENTÍFICA Y ACCIÓN DE FASE ───────────── */}
        <aside className="ps-panel-telemetria">
          <h2>TELEMETRÍA DE ENTORNO NASA</h2>

          {faseActiva === 'despegue' && (
            <div className="ps-ficha-datos">
              <h3>{despegueActual.nombre}</h3>
              <p>{despegueActual.detalle}</p>
              <dl>
                <div><dt>Vehículo:</dt><dd>Lanzador Pesado + {modelo.codigo}</dd></div>
                <div><dt>Carga en cofia:</dt><dd>{modelo.especificaciones.masa_total}</dd></div>
                <div><dt>Estado nodriza:</dt><dd>{subDespegue === 'arco_orbital' ? 'Desplegando en LEO' : 'Plegada en cofia'}</dd></div>
              </dl>
              <button
                type="button"
                className="primario ps-btn-siguiente"
                onClick={() => setFaseActiva('crucero')}
              >
                Iniciar Crucero Interplanetario →
              </button>
            </div>
          )}

          {faseActiva === 'crucero' && (
            <div className="ps-ficha-datos">
              <h3>{cruceroActual.nombre}</h3>
              <p>{cruceroActual.descripcion}</p>
              <dl>
                <div><dt>Propulsión activa:</dt><dd>{modelo.especificaciones.propulsion}</dd></div>
                <div><dt>Impulso Δv:</dt><dd>{modelo.metricas.delta_v_ms.toLocaleString('es-MX')} m/s</dd></div>
                <div><dt>Navegación:</dt><dd>Autónoma ASTRION-CORE</dd></div>
              </dl>
              <button
                type="button"
                className="primario ps-btn-siguiente"
                onClick={() => setFaseActiva('orbita')}
              >
                Estacionar en Órbita Planetaria →
              </button>
            </div>
          )}

          {(faseActiva === 'orbita' || faseActiva === 'despliegue') && (
            <div className="ps-ficha-datos">
              <h3>{planetaActual.nombre}</h3>
              <p>{planetaActual.descripcion}</p>
              <dl>
                <div><dt>Fuente NASA:</dt><dd>{planetaActual.fuente_nasa}</dd></div>
                <div><dt>Gravedad:</dt><dd>{planetaActual.gravedad}</dd></div>
                <div><dt>Temperatura:</dt><dd>{planetaActual.temperatura}</dd></div>
                <div><dt>Atmósfera:</dt><dd>{planetaActual.atmosfera}</dd></div>
                <div>
                  <dt>Bahía de Drones:</dt>
                  <dd>{faseActiva === 'despliegue' ? 'ABIERTA · HAZ GUÍA ACTIVO' : 'CERRADA · EN ESCANEO'}</dd>
                </div>
              </dl>
              {faseActiva === 'orbita' ? (
                <button
                  type="button"
                  className="primario ps-btn-siguiente"
                  onClick={() => setFaseActiva('despliegue')}
                >
                  Abrir Bahía de Despliegue →
                </button>
              ) : (
                <button
                  type="button"
                  className="primario ps-btn-siguiente"
                  onClick={() => {
                    if (planetaActual.terreno_asociado) {
                      setTerrenoId(planetaActual.terreno_asociado);
                    }
                    setFaseActiva('superficie');
                  }}
                >
                  Descender a Tierra Firme (Terreno 3D) →
                </button>
              )}
            </div>
          )}

          {faseActiva === 'superficie' && (
            <div className="ps-ficha-datos">
              <h3>{terrenoActual.nombre}</h3>
              <p>{terrenoActual.descripcion}</p>
              <dl>
                <div><dt>Gravedad local:</dt><dd>{terrenoActual.gravedad}</dd></div>
                <div><dt>Condición visual:</dt><dd>{terrenoActual.visibilidad}</dd></div>
                <div><dt>Nodriza en cielo:</dt><dd>{modelo.codigo} en enlace orbital</dd></div>
                <div><dt>Puerto de aterrizaje:</dt><dd>Activo para sondas ASTRION-M</dd></div>
              </dl>
              <button
                type="button"
                className="primario ps-btn-siguiente"
                onClick={() => setFaseActiva('orbita')}
              >
                ← Subir a Vista Orbital
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

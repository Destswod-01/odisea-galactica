import { useT } from '../i18n/idioma.js';
// Cabina en 3D (primera persona, dentro de la bóveda). Solo dibuja: la lógica del minijuego
// vive en componentes/Cabina.jsx y llega por props.
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Sparkles, Stars } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Jupiter3D, Tierra3D } from './PlanetasHD.jsx';
import Estudio from './Estudio.jsx';

const VENTANA = { x: 0, y: 1.4, r: 1.8 };

// Pared frontal con un hueco redondo de verdad (forma extruida con agujero).
function ParedConVentana() {
  // Pared = 4 placas alrededor de un hueco cuadrado + un aro que tapa las esquinas: hueco redondo robusto.
  const { x, y, r } = VENTANA;
  const placas = [
    [x - 3.75 - r / 2, 0.5, 7.5 - r, 7],          // izquierda
    [x + 3.75 + r / 2, 0.5, 7.5 - r, 7],          // derecha
    [x, (y + r + 4) / 2, 2 * r, 4 - (y + r)],     // arriba
    [x, (y - r - 3) / 2, 2 * r, y - r + 3],       // abajo
  ];
  const material = <meshStandardMaterial color="#182936" metalness={0.7} roughness={0.35} />;
  return (
    <group position={[0, 0, -3]}>
      {[-1, 1].map(s => <group key={s} position={[s * 3.4, 1.1, .4]}><mesh><boxGeometry args={[1.4, 2.4, .08]} /><meshStandardMaterial color="#071620" metalness={.65} roughness={.2} /></mesh>{Array.from({length:8},(_,i)=><mesh key={i} position={[0, .8-i*.22, .06]}><boxGeometry args={[i%3===0 ? .9 : .55, .018, .015]} /><meshBasicMaterial color={i%3===0 ? '#8fb6c6' : '#33596e'} /></mesh>)}</group>)}
      {placas.map(([px, py, w, h], k) => (
        <mesh key={k} position={[px, py, 0.15]}><boxGeometry args={[w, h, 0.3]} />{material}</mesh>
      ))}
      <mesh position={[x, y, 0.31]}><ringGeometry args={[r, r * 1.6, 48]} />{material}</mesh>
      {/* Marco de la ventanilla con pernos */}
      <mesh position={[VENTANA.x, VENTANA.y, 0.32]}><torusGeometry args={[VENTANA.r + 0.05, 0.07, 16, 96]} /><meshStandardMaterial color="#8a9fab" metalness={0.9} roughness={0.25} /></mesh>
      {Array.from({ length: 12 }).map((_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(a) * (VENTANA.r + 0.05), VENTANA.y + Math.sin(a) * (VENTANA.r + 0.05), 0.46]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.05, 8]} /><meshStandardMaterial color="#b8c0d0" metalness={1} roughness={0.2} />
          </mesh>
        );
      })}
      {/* Vidrio con un leve reflejo */}
      <mesh position={[VENTANA.x, VENTANA.y, 0.15]}>
        <circleGeometry args={[VENTANA.r, 48]} />
        <meshPhysicalMaterial color="#9fd0ff" transparent opacity={0.06} roughness={0} metalness={0} />
      </mesh>
      {/* Placas de la pared */}
      {[-4.2, 4.2].map((x) => [0.2, 2.4].map((y) => (
        <mesh key={`${x}${y}`} position={[x, y, 0.31]}><boxGeometry args={[2.6, 1.8, 0.04]} /><meshStandardMaterial color="#36446a" metalness={0.5} roughness={0.55} /></mesh>
      )))}
    </group>
  );
}

// Lo que se ve por la ventanilla, según el minijuego.
function Vista({ modo, radiacion }) {
  const frente = useRef();
  useFrame(() => {
    if (frente.current) frente.current.scale.setScalar(1 + radiacion * 6);
  });
  return (
    <group position={[0, VENTANA.y, -14]}>
      <Stars radius={30} depth={10} count={1200} factor={2} fade />
      {modo === 'reinicio' && <Tierra3D radio={7} position={[1.5, -8.5, -6]} />}
      {modo === 'antena' && <Jupiter3D radio={4} position={[2.5, .6, -4]} />}
      {modo === 'tormenta' && (
        <group position={[-1.5, 1, -6]}>
          <mesh><sphereGeometry args={[0.5, 24, 24]} /><meshBasicMaterial color="#fff3b0" /></mesh>
          <mesh ref={frente}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#ff8a3d" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <Sparkles count={120} scale={[8, 6, 6]} size={6} speed={2.5} color="#ffd27a" />
        </group>
      )}
    </group>
  );
}

function Interruptor({ position, on, mal, activo, alPulsar, etiqueta }) {
  const palanca = useRef();
  useFrame((_, dt) => {
    if (!palanca.current) return;
    const objetivo = on ? -0.1 : 0.1;
    palanca.current.rotation.x += (objetivo - palanca.current.rotation.x) * Math.min(1, dt * 14);
  });
  const led = mal ? '#ff3355' : on ? '#3ddc97' : '#253049';
  return (
    <group position={position}
      onClick={(e) => { e.stopPropagation(); if (activo) alPulsar(); }}
      onPointerOver={() => { if (activo) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}>
      <mesh><boxGeometry args={[0.32, 0.08, 0.42]} /><meshStandardMaterial color="#0c1220" metalness={0.7} roughness={0.4} /></mesh>
      {/* Zona de clic invisible, más grande que la palanca */}
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.55, 0.6, 0.6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <group ref={palanca} position={[0, 0.05, 0]}>
        <mesh position={[0, .05, 0]}><boxGeometry args={[.25,.08,.32]} /><meshStandardMaterial color={on ? '#347c8c' : '#344957'} metalness={.6} roughness={.3} /></mesh>
        <mesh position={[0, .1, -.07]}><boxGeometry args={[.15,.01,.025]} /><meshBasicMaterial color={on ? '#9feada' : '#738796'} /></mesh>
      </group>
      <mesh position={[0, 0.06, -0.26]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color={led} emissive={led} emissiveIntensity={on || mal ? 2.5 : 0.2} />
      </mesh>
      <Html position={[0, -0.02, 0.32]} center distanceFactor={6} pointerEvents="none" style={{ pointerEvents: 'none' }}>
        <div className="etiqueta-3d" style={{ opacity: activo ? 1 : 0.45 }}>{etiqueta}</div>
      </Html>
    </group>
  );
}

function Consola({ lado, activa, titulo, children }) {
  // Escritorio inclinado hacia el jugador.
  return (
    <group position={[lado * 2.2, -0.85, -0.15]} rotation={[0.45, -lado * 0.4, 0]}>
      <mesh><boxGeometry args={[2.6, 0.12, 1.6]} /><meshStandardMaterial color="#1e2840" metalness={0.6} roughness={0.45} /></mesh>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[2.62, 0.02, 1.62]} />
        <meshStandardMaterial color={activa ? '#ff7a1a' : '#2c3550'} emissive={activa ? '#ff7a1a' : '#000'} emissiveIntensity={activa ? 0.4 : 0} transparent opacity={0.12} />
      </mesh>
      <Html position={[0, 0.1, -0.85]} center distanceFactor={6} pointerEvents="none" style={{ pointerEvents: 'none' }}>
        <div className="etiqueta-3d titulo" style={{ color: activa ? '#ffb36b' : '#6b7690' }}>{titulo}</div>
      </Html>
      <group position={[0, 0.07, 0]}>{children}</group>
    </group>
  );
}

function Perilla({ angulo, activa, alGirar }) {
  const ref = useRef();
  const arrastrando = useRef(false);
  useFrame(() => { if (ref.current) ref.current.rotation.z = -(angulo * Math.PI) / 180; });
  return (
    <group position={[0, -1.25, 0.55]} rotation={[-1.1, 0, 0]} scale={0.55}
      onPointerDown={(e) => { if (!activa) return; e.stopPropagation(); arrastrando.current = true; e.target.setPointerCapture?.(e.pointerId); }}
      onPointerUp={() => { arrastrando.current = false; }}
      onPointerMove={(e) => { if (arrastrando.current) alGirar(e.nativeEvent.movementX * 1.2 - e.nativeEvent.movementY * 0.4); }}
      onPointerOver={() => { if (activa) document.body.style.cursor = 'grab'; }}
      onPointerOut={() => { document.body.style.cursor = ''; arrastrando.current = false; }}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.42, 0.46, 0.12, 40]} /><meshStandardMaterial color="#2a3550" metalness={0.8} roughness={0.3} /></mesh>
      <group ref={ref}>
        <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.32, 0.16, 32]} /><meshStandardMaterial color="#3a4766" metalness={0.8} roughness={0.25} /></mesh>
        <mesh position={[0, 0.18, 0.2]}><boxGeometry args={[0.06, 0.2, 0.04]} /><meshStandardMaterial color={activa ? '#ff7a1a' : '#6b7690'} emissive={activa ? '#ff7a1a' : '#000'} emissiveIntensity={0.8} /></mesh>
      </group>
    </group>
  );
}

// Balizas: durante la alarma tiñen la cabina de rojo (o ámbar al buscar la señal).
function Balizas({ alarma, exito, color }) {
  const luz = useRef();
  const bulbos = useRef([]);
  useFrame(() => {
    const on = alarma ? (Math.sin(performance.now() / 160) > 0 ? 1 : 0.15) : 1;
    if (luz.current) luz.current.intensity = alarma ? on * 3 : exito ? 2 : 0;
    bulbos.current.forEach((b) => b && (b.emissiveIntensity = on * 3));
  });
  const c = alarma ? color : exito ? '#3ddc97' : '#ff3355';
  return (
    <group>
      {[-3.6, 3.6].map((x, k) => (
        <mesh key={x} position={[x, 3, -2.6]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial ref={(m) => (bulbos.current[k] = m)} color={c} emissive={c} />
        </mesh>
      ))}
      <pointLight ref={luz} position={[0, 2.6, -1]} color={c} distance={14} />
    </group>
  );
}

// La "cabeza" del jugador sigue suavemente al ratón; con la tormenta, la cabina tiembla.
function Camara({ temblor }) {
  useFrame(({ camera, pointer }) => {
    const t = temblor ? (Math.random() - 0.5) * 0.04 : 0;
    camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.05 + t;
    camera.position.y += (1.25 + pointer.y * 0.25 - camera.position.y) * 0.05 + t;
    camera.lookAt(0, 0.15, -3);
  });
  return null;
}

// Avisa cuando la escena ya dibujó varios cuadros: ahí arranca el reloj del minijuego.
function AvisarListo({ alListo }) {
  const cuadros = useRef(0);
  useFrame(() => {
    cuadros.current++;
    if (cuadros.current === 15) alListo?.();
  });
  return null;
}

export default function Cabina3D(p) {
  const t = useT();
  const { modo, sistemas, instrumentos, encendidos, apagados, error, angulo, senal, radiacion, tiempo, hecho, exito, alarma } = p;
  return (
    <div className="lienzo" style={{ height: 470 }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.25, 3.6], fov: 60 }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#02040a']} />
          <Estudio />
          <ambientLight intensity={0.55} />
          <hemisphereLight args={['#9fc4ff', '#1a1a2e', 0.6]} />
          <pointLight position={[-3, 2.5, -1.5]} intensity={6} distance={8} color="#cfe0ff" />
          <pointLight position={[3, 2.5, -1.5]} intensity={6} distance={8} color="#cfe0ff" />
          <spotLight position={[0, 3.4, 2]} angle={0.7} penumbra={0.9} intensity={10} color="#cfe0ff" />
          {/* Tiras de luz del techo */}
          {[-1.6, 1.6].map((x) => (
            <mesh key={x} position={[x, 3.5, -1]}><boxGeometry args={[0.12, 0.04, 4]} /><meshBasicMaterial color="#9fc4ff" /></mesh>
          ))}
          {/* Techo, piso y paredes laterales */}
          <mesh position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[12, 8]} /><meshStandardMaterial color="#121a2c" side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 8]} /><meshStandardMaterial color="#0d1322" /></mesh>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * 5.2, 0.8, 0]} rotation={[0, -l * Math.PI / 2.4, 0]}><planeGeometry args={[8, 6]} /><meshStandardMaterial color="#161f33" metalness={0.4} roughness={0.7} side={THREE.DoubleSide} /></mesh>
          ))}

          <ParedConVentana />
          <Vista modo={modo} radiacion={radiacion} />
          <Balizas alarma={alarma} exito={exito} color={modo === 'antena' ? '#ffc145' : '#ff3355'} />

          <Consola lado={-1} activa={modo === 'reinicio'} titulo={t('e04.Cabina3D.systems')}>
            {sistemas.map((s, k) => (
              <Interruptor key={s} position={[-0.9 + k * 0.6, 0, 0.1]} etiqueta={t(`e04.cabina.sistema.${s}`)} on={encendidos.includes(s)}
                mal={error === s} activo={modo === 'reinicio' && !hecho} alPulsar={() => p.pulsarSistema(s)} />
            ))}
          </Consola>
          <Consola lado={1} activa={modo === 'tormenta'} titulo={t('e04.Cabina3D.instruments')}>
            {instrumentos.map((ins, k) => (
              <Interruptor key={ins.id} position={[-0.8 + (k % 3) * 0.8, 0, k < 3 ? -0.3 : 0.4]} etiqueta={t(`e04.cabina.instrumento.${ins.id}`)}
                on={!apagados.includes(ins.id)} mal={error === ins.id} activo={modo === 'tormenta' && !hecho} alPulsar={() => p.pulsarInstrumento(ins)} />
            ))}
          </Consola>

          {/* Monitor central con texto real encima */}
          <group position={[0, -0.75, -0.6]} rotation={[-0.35, 0, 0]} scale={0.8}>
            <mesh><boxGeometry args={[1.9, 1.05, 0.12]} /><meshStandardMaterial color="#1b2336" metalness={0.7} roughness={0.35} /></mesh>
            <mesh position={[0, 0, 0.065]}><planeGeometry args={[1.72, 0.88]} /><meshBasicMaterial color="#031510" /></mesh>
            <pointLight position={[0, 0, 0.6]} color="#5dffb0" intensity={1.5} distance={2.5} />
            <Html position={[0, 0, 0.07]} transform distanceFactor={4.2} pointerEvents="none" style={{ pointerEvents: 'none' }}>
              <div className="monitor-3d">
                <div className="parpadea">{modo === 'reinicio' ? t('e04.Cabina3D.safe_mode') : modo === 'tormenta' ? t('e04.Cabina3D.solar_storm') : t('e04.Cabina3D.no_earth_signal')}</div>
                <div>T-{tiempo.toFixed(1)} s</div>
                {modo === 'reinicio' && sistemas.map((s) => <div key={s} style={{ opacity: encendidos.includes(s) ? 1 : 0.4 }}>{encendidos.includes(s) ? '[OK]' : '[--]'} {t(`e04.cabina.sistema.${s}`)}</div>)}
                {modo === 'tormenta' && (<><div>{t('e04.Cabina3D.radiation')}</div><div className="barra-monitor"><span style={{ width: `${radiacion * 100}%`, background: radiacion > 0.7 ? '#ff3355' : '#ffc145' }} /></div></>)}
                {modo === 'antena' && (<><div>{t('e04.Cabina3D.signal')}{Math.round(senal * 100)} %</div><div className="barras-senal">{Array.from({ length: 10 }).map((_, k) => <i key={k} style={{ height: 6 + k * 2, background: senal * 10 > k ? (senal >= 0.9 ? '#5dffb0' : '#ffc145') : '#0b2a1f' }} />)}</div></>)}
                {hecho && <div style={{ color: exito ? '#5dffb0' : '#ff3355', marginTop: 4 }}>{exito ? t('e04.Cabina3D.solved') : t('e04.Cabina3D.failed')}</div>}
              </div>
            </Html>
          </group>
          <Perilla angulo={angulo} activa={modo === 'antena' && !hecho} alGirar={p.alGirar} />

          <AvisarListo alListo={p.alListo} />
          <Camara temblor={modo === 'tormenta' && radiacion > 0.6 && !hecho} />
        </Suspense>
      </Canvas>
    </div>
  );
}

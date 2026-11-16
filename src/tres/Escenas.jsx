// Escenas 3D reutilizables: lienzo base, garage del hangar, Júpiter del menú, llegada/órbita e informe.
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, OrbitControls, Stars } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import Nave3D from './NaveEstudio.jsx';
import Estudio from './Estudio.jsx';
import { Destino3D } from './PlanetasHD.jsx';
import { soportaWebGL } from './webgl.js';

// Lienzo base: cámara, estrellas y luz del Sol. Si no hay WebGL, muestra el respaldo 2D.
export function Lienzo({ children, alto = 360, camara = [0, 3, 9], fov = 45, respaldo = null, estrellas = true, className = '' }) {
  if (!soportaWebGL()) return respaldo;
  return (
    <div className={`lienzo ${className}`} style={{ height: alto }}>
      <Canvas dpr={[1, 2]} camera={{ position: camara, fov }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          {estrellas && <Stars radius={80} depth={40} count={1100} factor={1.3} fade speed={0.15} />}
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}

// Garage del hangar: plataforma giratoria con luces de estudio. Se puede rotar con el ratón.
export function Garage({ diseno, estetica }) {
  const alas = { panel_chico: 2.2, panel_mediano: 3.6, panel_gigante: 5.2 }[diseno.energia] || 1.5;
  const distancia = 6 + alas * 1.7;
  const plataforma = Math.max(4.2, alas + 1.8);
  return (
    <Lienzo alto={490} camara={[distancia * .35, distancia * 0.55, distancia]} fov={42} estrellas={false}>
      <color attach="background" args={['#101b26']} />
      <fog attach="fog" args={['#101b26', 20, 60]} />
      <Estudio />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 8, 5]} intensity={2.2} />
      <spotLight position={[-6, 6, -4]} intensity={40} angle={0.5} penumbra={0.6} color="#4da3ff" />
      <spotLight position={[6, 3, -6]} intensity={40} angle={0.6} penumbra={0.6} color="#dcefff" />
      <Nave3D diseno={diseno} estetica={estetica} position={[0, .4, 0]} girar={false} />
      {/* Plataforma con anillo luminoso */}
      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[plataforma, plataforma + 0.2, 0.25, 64]} />
        <meshStandardMaterial color="#263540" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[0, -1.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[plataforma - 0.15, 0.015, 8, 96]} />
        <meshBasicMaterial color="#a6d6e1" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#18232d" metalness={.35} roughness={.55} /></mesh>
      {[-1, 1].map(s => <group key={s} position={[s * 9, 0, -9]}><mesh position={[0, 4, 0]}><boxGeometry args={[.3, 12, .5]} /><meshStandardMaterial color="#344550" metalness={.7} roughness={.3} /></mesh><mesh position={[-s * .18, 4, .3]}><boxGeometry args={[.04, 8, .08]} /><meshBasicMaterial color="#badbe9" /></mesh></group>)}
      <ContactShadows position={[0, -1.25, 0]} opacity={0.6} scale={12} blur={2.5} far={4} />
      <OrbitControls makeDefault enablePan={false} minDistance={5} maxDistance={30} maxPolarAngle={Math.PI / 1.9} />
      <AjusteCamara distancia={distancia} />
    </Lienzo>
  );
}

// Acerca o aleja la cámara suavemente (sin cambiar el ángulo que eligió el jugador).
// Solo actúa durante 1,5 s después de que cambia la nave, para no pelear con el zoom del jugador.
function AjusteCamara({ distancia }) {
  const previa = useRef(distancia);
  const restante = useRef(0);
  useFrame(({ camera }, dt) => {
    if (previa.current !== distancia) { previa.current = distancia; restante.current = 1.5; }
    if (restante.current <= 0) return;
    restante.current -= dt;
    const actual = camera.position.length();
    camera.position.setLength(actual + (distancia - actual) * Math.min(1, dt * 3));
  });
  return null;
}

// Júpiter del menú y el briefing.
export function JupiterMenu({ alto = 320, destino = 'jupiter' }) {
  return (
    <Lienzo alto={alto} camara={[0, 0, 4.2]} fov={40}>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-5, 1.5, 2.5]} intensity={3} />
      <Float speed={1} floatIntensity={0.4} rotationIntensity={0.1}>
        <Destino3D destino={destino} radio={1.18} />
      </Float>
    </Lienzo>
  );
}

// La nave se acerca a Júpiter; al capturar, recorre su órbita (que se dibuja).
function NaveEnOrbita({ diseno, estetica, avance, resultado, motor }) {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (resultado === 'captura' || resultado === 'baja') {
      t.current += dt * (resultado === 'baja' ? 0.5 : 0.3);
      const rx = resultado === 'baja' ? 4.2 : 6, rz = resultado === 'baja' ? 2.6 : 3.6;
      ref.current.position.set(Math.cos(t.current) * rx, 0.4, Math.sin(t.current) * rz);
    } else if (resultado === 'escape') {
      ref.current.position.x += dt * 6;
    } else {
      // Se acerca mientras frena.
      ref.current.position.set(-9 + avance * 5, 0.4, 2);
    }
  });
  return <group ref={ref} scale={0.22}><Nave3D diseno={diseno} estetica={estetica} motor={motor} girar /></group>;
}

function Orbita({ baja }) {
  const geo = useMemo(() => {
    const rx = baja ? 4.2 : 6, rz = baja ? 2.6 : 3.6;
    const pts = Array.from({ length: 129 }, (_, k) => {
      const a = (k / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * rx, 0.4, Math.sin(a) * rz);
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [baja]);
  const mat = useRef();
  const dibujado = useRef(0);
  useFrame((_, dt) => {
    dibujado.current = Math.min(129, dibujado.current + dt * 60);
    geo.setDrawRange(0, Math.floor(dibujado.current));
  });
  return <line geometry={geo}><lineBasicMaterial ref={mat} color="#7dfcc8" transparent opacity={0.8} /></line>;
}

export function EscenaJupiter({ diseno, estetica, avance = 0, resultado = null, motor = false, alto = 340, destino = 'jupiter' }) {
  return (
    <Lienzo alto={alto} camara={[0, 4, 12]} fov={45}>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-8, 3, 6]} intensity={2.8} />
      <Destino3D destino={destino} radio={2.6} position={[0, 0, 0]} />
      <NaveEnOrbita diseno={diseno} estetica={estetica} avance={avance} resultado={resultado} motor={motor} />
      {(resultado === 'captura' || resultado === 'baja') && <Orbita baja={resultado === 'baja'} />}
      <OrbitControls enablePan={false} enableZoom={false} />
    </Lienzo>
  );
}

// Dos naves lado a lado para el informe.
export function Comparacion({ diseno, estetica, real }) {
  return (
    <Lienzo alto={300} camara={[0, 4, 15]} fov={42}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 6]} intensity={2.2} />
      <Nave3D diseno={diseno} estetica={estetica} position={[-4.8, 0, 0]} scale={0.5} />
      <Nave3D diseno={real} estetica={{ casco: '#c9d3e6', detalle: '#ff7a1a' }} position={[4.8, 0, 0]} scale={0.5} />
      <OrbitControls enablePan={false} enableZoom={false} />
    </Lienzo>
  );
}

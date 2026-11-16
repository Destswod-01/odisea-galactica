// Escena 3D del Garage y Vista Orbital para la nave nodriza ASTRION-X.
// Soporta Modo Garage (Hangar de ensamblaje con plataforma y arcos de diagnóstico) y Modo Órbita (Póster sobre la Tierra).
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Nodriza3D from './Nodriza3D.jsx';
import { texturaTierra } from '../tres/texturas.js';

/* ───────────── Iluminación Cinematográfica de Estudio + Espacio ───────────── */
function IluminacionNodriza({ entorno = 'orbita', colorAcento = '#38bdf8' }) {
  return (
    <>
      <hemisphereLight
        args={[entorno === 'orbita' ? '#d8eeff' : '#c6e4ff', '#0b1828', entorno === 'orbita' ? 1.8 : 2.1]}
      />
      {/* Luz solar principal cálida-blanca como en el póster */}
      <directionalLight
        position={[9, 14, 10]}
        intensity={3.8}
        color="#fff5e4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-normalBias={0.04}
      />
      {/* Contraluz azul cian de reflejo atmosférico terrestre */}
      <directionalLight position={[-10, -6, -8]} intensity={2.4} color={colorAcento} />
      <directionalLight position={[0, -10, 6]} intensity={1.6} color="#38bdf8" />

      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={3.2}
          color="#d8f0ff"
          position={[0, 12, 2]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[22, 22, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#ffdfb3"
          position={[12, 4, 8]}
          rotation={[0, -Math.PI / 4, 0]}
          scale={[10, 8, 1]}
        />
        <Lightformer
          form="ring"
          intensity={2.5}
          color="#38bdf8"
          position={[-10, -4, -6]}
          scale={12}
        />
      </Environment>
    </>
  );
}

/* ───────────── Entorno 1: Horizonte Planetario (Estilo Póster ASTRION-X) ───────────── */
function EntornoOrbitaPlanetaria() {
  const tierraRef = useRef();
  const nubesRef = useRef();
  const texTierra = useMemo(() => texturaTierra(), []);

  const posicionesEstrellas = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const r = 45 + (i % 35);
      const theta = ((i * 7919) % 360) * (Math.PI / 180);
      const phi = (((i * 104729) % 180) - 90) * (Math.PI / 180);
      arr[i * 3] = r * Math.cos(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (tierraRef.current) tierraRef.current.rotation.y += dt * 0.015;
    if (nubesRef.current) nubesRef.current.rotation.y += dt * 0.022;
  });

  return (
    <group>
      {/* Campo de estrellas profundo */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={posicionesEstrellas.length / 3}
            array={posicionesEstrellas}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#d8ecff" size={0.18} transparent opacity={0.85} sizeAttenuation />
      </points>

      {/* Globo terrestre curvado debajo de la nodriza (igual al póster) */}
      <group position={[0, -24.5, -4]}>
        <mesh ref={tierraRef} rotation={[0.2, 0.6, -0.15]}>
          <sphereGeometry args={[21.5, 64, 48]} />
          <meshStandardMaterial
            map={texTierra}
            roughness={0.78}
            metalness={0.12}
            emissive="#0c264e"
            emissiveIntensity={0.35}
          />
        </mesh>

        {/* Resplandor atmosférico azul-dorado en el limbo terrestre */}
        <mesh ref={nubesRef}>
          <sphereGeometry args={[21.85, 64, 48]} />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[22.35, 64, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.11}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────── Entorno 2: Garage / Hangar de Ensamblaje Orbital ───────────── */
function EntornoGarageHangar({ colorAcento = '#38bdf8', escanerActivo = false }) {
  const aroRef = useRef();
  const escanerRef = useRef();

  useFrame(({ clock }, dt) => {
    if (aroRef.current) aroRef.current.rotation.y += dt * 0.18;
    if (escanerRef.current) {
      escanerRef.current.visible = escanerActivo;
      escanerRef.current.position.y = -0.8 + Math.sin(clock.elapsedTime * 1.8) * 1.6;
    }
  });

  return (
    <group position={[0, -2.55, 0]}>
      {/* Piso industrial octogonal del garage */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <cylinderGeometry args={[12.5, 13.2, 0.4, 64]} />
        <meshStandardMaterial color="#09131e" metalness={0.62} roughness={0.38} />
      </mesh>

      {/* Plataforma central escalonada */}
      {[7.4, 6.2, 5.1].map((r, i) => (
        <mesh key={r} position={[0, i * 0.14, 0]} receiveShadow>
          <cylinderGeometry args={[r, r + 0.25, 0.16, 48]} />
          <meshStandardMaterial
            color={i === 2 ? '#16283a' : '#0d1b29'}
            metalness={0.75}
            roughness={0.28}
          />
        </mesh>
      ))}

      {/* Anillos holográficos en el piso del garage */}
      <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.02, 5.12, 64]} />
        <meshBasicMaterial color={colorAcento} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.25, 7.34, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Aro rotatorio con balizas de telemetría */}
      <group ref={aroRef} position={[0, 0.4, 0]}>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
          <group key={a} rotation={[0, a, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[4.45, 0.035, 8, 48, 1.3]} />
              <meshBasicMaterial color={colorAcento} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4 Torres pórtico del garage en el arco trasero/lateral para despejar la cámara frontal */}
      {[-2.55, -1.72, 1.72, 2.55].map((ang) => (
        <group key={ang} rotation={[0, ang, 0]}>
          <group position={[10.4, 3.2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.55, 6.8, 0.75]} />
              <meshStandardMaterial color="#1b2c3d" metalness={0.7} roughness={0.32} />
            </mesh>
            <mesh position={[-0.29, 0, 0]}>
              <boxGeometry args={[0.04, 5.6, 0.12]} />
              <meshBasicMaterial color={colorAcento} />
            </mesh>
            {/* Brazo superior hacia el centro */}
            <mesh position={[-1.4, 3.1, 0]} rotation={[0, 0, 0.25]}>
              <boxGeometry args={[2.8, 0.32, 0.45]} />
              <meshStandardMaterial color="#24384d" metalness={0.75} roughness={.3} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Anillo de escaneo láser vertical */}
      <mesh ref={escanerRef} position={[0, 2.2, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[3.4, 3.52, 64]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ───────────── Etiquetas 3D con Líneas Guía (Callouts del Póster ASTRION-X) ───────────── */
function EtiquetaCallout3D({ punto, activo, alSeleccionar }) {
  const lineaObj = useMemo(() => {
    const p1 = new THREE.Vector3(...punto.posicion3D);
    const p2 = new THREE.Vector3(...punto.anclaEtiqueta);
    const codo = new THREE.Vector3(
      p1.x * 0.4 + p2.x * 0.6,
      p2.y,
      p1.z * 0.4 + p2.z * 0.6
    );
    const geo = new THREE.BufferGeometry().setFromPoints([p1, codo, p2]);
    const mat = new THREE.LineBasicMaterial({
      color: activo ? '#38bdf8' : '#e2e8f0',
      transparent: true,
      opacity: activo ? 1 : 0.78,
    });
    return new THREE.Line(geo, mat);
  }, [punto.posicion3D, punto.anclaEtiqueta, activo]);

  useEffect(() => {
    return () => {
      lineaObj.geometry.dispose();
      lineaObj.material.dispose();
    };
  }, [lineaObj]);

  return (
    <group>
      <primitive object={lineaObj} />
      {/* Punto de anclaje sobre la pieza 3D */}
      <mesh position={punto.posicion3D}>
        <sphereGeometry args={[0.075, 14, 14]} />
        <meshBasicMaterial color={activo ? '#38bdf8' : '#ffffff'} />
      </mesh>
      {/* Etiqueta flotante interactiva */}
      <Html position={punto.anclaEtiqueta} center zIndexRange={[10, 0]}>
        <button
          type="button"
          className={`nx-callout-3d ${activo ? 'activo' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            alSeleccionar(punto.id);
          }}
        >
          <span className="nx-callout-dot" />
          <span>{punto.etiqueta}</span>
        </button>
      </Html>
    </group>
  );
}

/* ───────────── Controlador Suave de Cámara + OrbitControls ───────────── */
function ControladorCamara({ focoActual, puntosInspeccion }) {
  const { camera } = useThree();
  const controlsRef = useRef();
  const animando = useRef(false);
  const metaPos = useRef(new THREE.Vector3(5.4, 4.3, 13.4));
  const metaTarget = useRef(new THREE.Vector3(0, -0.25, 0));

  useEffect(() => {
    const p = puntosInspeccion.find((x) => x.id === focoActual) || puntosInspeccion[0];
    if (!p) return;
    metaPos.current.set(...p.camara);
    metaTarget.current.set(...p.objetivo);
    animando.current = true;
  }, [focoActual, puntosInspeccion]);

  useFrame((_, dt) => {
    if (!animando.current || !controlsRef.current) return;
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 5.5);
    camera.position.lerp(metaPos.current, k);
    controlsRef.current.target.lerp(metaTarget.current, k);
    controlsRef.current.update();
    if (camera.position.distanceTo(metaPos.current) < 0.08) {
      animando.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={3.6}
      maxDistance={20}
      maxPolarAngle={Math.PI * 0.82}
      onStart={() => {
        animando.current = false;
      }}
    />
  );
}

/* ───────────── Lienzo Principal del Garage 3D ───────────── */
export default function EscenaGarageNodriza({
  modelo,
  colorCasco,
  colorAcento,
  entorno = 'orbita',
  desplegado = 1,
  bahiaAbierta = true,
  propulsionActiva = true,
  escanerActivo = false,
  laserActivo = false,
  girar = false,
  mostrarEtiquetas = true,
  focoActual = 'general',
  puntosInspeccion = [],
  alSeleccionarFoco,
}) {
  const calloutsConAncla = useMemo(
    () => puntosInspeccion.filter((p) => Array.isArray(p.anclaEtiqueta)),
    [puntosInspeccion]
  );

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5.4, 4.3, 13.4], fov: 36, near: 0.1, far: 160 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[entorno === 'orbita' ? '#040b18' : '#07111d']} />
      <fog attach="fog" args={[entorno === 'orbita' ? '#040b18' : '#07111d', 26, 75]} />

      <Suspense fallback={null}>
        <IluminacionNodriza entorno={entorno} colorAcento={colorAcento} />

        {entorno === 'orbita' ? (
          <EntornoOrbitaPlanetaria />
        ) : (
          <EntornoGarageHangar colorAcento={colorAcento} escanerActivo={escanerActivo} />
        )}

        <Nodriza3D
          modelo={modelo.id}
          configuracion3D={modelo.configuracion_3d}
          colorCasco={colorCasco}
          colorAcento={colorAcento}
          desplegado={desplegado}
          bahiaAbierta={bahiaAbierta}
          propulsionActiva={propulsionActiva}
          escanerActivo={escanerActivo}
          laserActivo={laserActivo}
          girar={girar}
        />

        {mostrarEtiquetas &&
          calloutsConAncla.map((punto) => (
            <EtiquetaCallout3D
              key={punto.id}
              punto={punto}
              activo={focoActual === punto.id}
              alSeleccionar={alSeleccionarFoco}
            />
          ))}
      </Suspense>

      <ControladorCamara focoActual={focoActual} puntosInspeccion={puntosInspeccion} />
    </Canvas>
  );
}

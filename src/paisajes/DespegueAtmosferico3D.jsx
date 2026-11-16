// Escena 3D de Despegue Realista desde la Tierra, Mar de Nubes al Amanecer y Arco Orbital LEO
// (Cubre la Fila 5 Paneles 1, 2, 3 y Fila 2 Panel 1 de la imagen de referencia).
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import Nodriza3D from '../nodriza/Nodriza3D.jsx';
import PlanetaNasaHD from './PlanetasNasaHD.jsx';

/* ───────────── Destello Solar (Lens Flare de Amanecer Orbital) ───────────── */
export function DestelloSolar3D({ posicion = [0, 3.8, -22], color = '#fff3d1', escala = 1 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = escala * (1 + Math.sin(clock.elapsedTime * 3.2) * 0.05);
    ref.current.scale.setScalar(s);
  });

  return (
    <group position={posicion} ref={ref}>
      {/* Núcleo solar hiperbrillante */}
      <mesh>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* Halo de corona cálida */}
      <mesh>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Anillo de lente (Lens Flare como en Fila 5 Panel 6) */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[3.6, 3.85, 64]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Rayos anamórficos horizontales y verticales */}
      <mesh>
        <planeGeometry args={[18, 0.28]} />
        <meshBasicMaterial
          color="#bae6fd"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[0.25, 11]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ───────────── Nubes Volumétricas de Vapor/Humo e Ignición (Fila 5 Paneles 1 y 3) ───────────── */
function MarDeNubesYConoVapor({ modo = 'ignicion' }) {
  const instRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const nubes = useMemo(() => {
    const N = 160;
    return Array.from({ length: N }, (_, i) => {
      const ang = (i * 2.39996) % (Math.PI * 2);
      const radio = modo === 'ignicion'
        ? 0.6 + ((i * 17) % 100) * 0.12
        : 2.2 + ((i * 23) % 100) * 0.26;
      const x = Math.cos(ang) * radio;
      const z = Math.sin(ang) * radio - (modo === 'ignicion' ? 0 : 4);
      const y = modo === 'ignicion'
        ? -4.2 + (i < 45 ? (i / 45) * 3.8 : Math.sin(i) * 0.8)
        : -2.8 + Math.sin(i * 0.7) * 0.65;
      const escala = modo === 'ignicion'
        ? (i < 45 ? 0.55 + (1 - i / 45) * 1.3 : 1.1 + (i % 5) * 0.45)
        : 1.6 + (i % 6) * 0.55;
      return { x, y, z, escala, fase: i * 0.37 };
    });
  }, [modo]);

  useLayoutEffect(() => {
    if (!instRef.current) return;
    nubes.forEach((n, i) => {
      dummy.position.set(n.x, n.y, n.z);
      dummy.scale.setScalar(n.escala);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    });
    instRef.current.instanceMatrix.needsUpdate = true;
  }, [nubes, dummy]);

  useFrame(({ clock }) => {
    if (!instRef.current) return;
    const t = clock.elapsedTime;
    nubes.forEach((n, i) => {
      const deriva = Math.sin(t * 0.8 + n.fase) * 0.18;
      dummy.position.set(n.x + deriva, n.y, n.z);
      dummy.scale.setScalar(n.escala * (1 + Math.sin(t * 1.4 + n.fase) * 0.06));
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    });
    instRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instRef} args={[null, null, nubes.length]} receiveShadow>
      <dodecahedronGeometry args={[1, 2]} />
      <meshStandardMaterial
        color={modo === 'ignicion' ? '#f8e6d0' : '#f1dec8'}
        emissive={modo === 'ignicion' ? '#ea580c' : '#d97706'}
        emissiveIntensity={modo === 'ignicion' ? 0.42 : 0.22}
        roughness={0.92}
      />
    </instancedMesh>
  );
}

/* ───────────── Lanzador Pesado NASA con Columna de Fuego y Separación de Cofia ───────────── */
function CoheteLanzadorPesado({ etapaAscenso, modeloNodriza }) {
  const plumaRef = useRef();
  const grupoRef = useRef();

  useFrame(({ clock }) => {
    if (plumaRef.current) {
      const f = 1 + Math.sin(clock.elapsedTime * 38) * 0.14;
      plumaRef.current.scale.set(1, f, 1);
    }
    if (grupoRef.current) {
      grupoRef.current.position.y = Math.sin(clock.elapsedTime * 2.2) * 0.08;
    }
  });

  const enOrbita = etapaAscenso === 'arco_orbital';
  const sepCofia = enOrbita ? 1.85 : 0;

  return (
    <group ref={grupoRef} rotation={[0, 0, enOrbita ? -0.35 : 0]}>
      {/* Si aún no despliega en órbita o está separando la cofia, mostramos la etapa y la columna de fuego */}
      {!enOrbita && (
        <group position={[0, -0.5, 0]}>
          {/* Núcleo central SLS / Atlas Pesado */}
          <mesh castShadow>
            <cylinderGeometry args={[0.58, 0.62, 4.4, 32]} />
            <meshStandardMaterial color="#d97724" roughness={0.42} metalness={0.35} />
          </mesh>
          {/* Etapa criogénica superior blanca */}
          <mesh position={[0, 2.8, 0]} castShadow>
            <cylinderGeometry args={[0.62, 0.58, 1.5, 32]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.32} metalness={0.4} />
          </mesh>
          {/* 2 Boosters sólidos laterales */}
          {[-0.92, 0.92].map((x) => (
            <group key={x} position={[x, -0.3, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.24, 0.26, 4.0, 24]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.38} />
              </mesh>
              <mesh position={[0, 2.3, 0]}>
                <coneGeometry args={[0.24, 0.65, 24]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
            </group>
          ))}

          {/* Columna de ignición hiperbrillante (Fila 5 Panel 3) */}
          <group ref={plumaRef} position={[0, -2.4, 0]}>
            <mesh position={[0, -2.2, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[1.15, 5.2, 28, 1, true]} />
              <meshBasicMaterial
                color="#f97316"
                transparent
                opacity={0.78}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, -1.6, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.56, 3.8, 24, 1, true]} />
              <meshBasicMaterial
                color="#fef08a"
                transparent
                opacity={0.95}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <pointLight position={[0, -1.5, 0]} color="#fb923c" intensity={18} distance={18} />
          </group>
        </group>
      )}

      {/* En arco orbital: mostramos la nave nodriza liberándose de las dos mitades de la cofia */}
      {enOrbita ? (
        <group position={[0, 0.6, 0]}>
          <group scale={0.62}>
            <Nodriza3D
              modelo={modeloNodriza.id}
              configuracion3D={modeloNodriza.configuracion_3d}
              colorCasco={modeloNodriza.casco}
              colorAcento={modeloNodriza.acento}
              desplegado={0.85}
              bahiaAbierta={false}
              propulsionActiva
              girar
            />
          </group>
          {/* Dos valvas de cofia separándose en el espacio */}
          {[-1, 1].map((s) => (
            <group
              key={s}
              position={[s * (2.6 + sepCofia), -0.4, -1.2]}
              rotation={[0, 0, s * -0.55]}
            >
              <mesh>
                <cylinderGeometry
                  args={[0.95, 0.95, 2.8, 24, 1, false, s > 0 ? 0 : Math.PI, Math.PI]}
                />
                <meshStandardMaterial color="#e2e8f0" side={THREE.DoubleSide} metalness={0.4} roughness={0.35} />
              </mesh>
            </group>
          ))}
        </group>
      ) : (
        /* Cofia cerrada durante el ascenso atmosférico */
        <group position={[0, 4.3, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.68, 0.62, 1.4, 32]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow>
            <coneGeometry args={[0.68, 1.2, 32]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ───────────── Escena Principal de Despegue y Ascenso Atmosférico ───────────── */
export default function DespegueAtmosferico3D({
  subEscena = 'ignicion_plataforma', // 'ignicion_plataforma' | 'mar_nubes' | 'arco_orbital'
  modeloNodriza,
}) {
  return (
    <group>
      <ambientLight intensity={subEscena === 'arco_orbital' ? 0.55 : 0.85} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={3.4}
        color={subEscena === 'mar_nubes' ? '#ffedd5' : '#ffffff'}
        castShadow
      />

      {subEscena === 'ignicion_plataforma' && (
        <>
          <Stars radius={85} depth={40} count={900} factor={1.8} fade />
          {/* Resplandor atmosférico de ignición nocturna/amanecer en Cabo Cañaveral */}
          <mesh position={[0, -1.5, -14]}>
            <planeGeometry args={[38, 22]} />
            <meshBasicMaterial
              color="#7c2d12"
              transparent
              opacity={0.38}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Torres pararrayos de Cabo Cañaveral y humo de ignición (Fila 5 Panel 3) */}
          {[-4.2, 4.2].map((x) => (
            <mesh key={x} position={[x, 0.5, -2.5]}>
              <cylinderGeometry args={[0.08, 0.14, 10, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.3} />
            </mesh>
          ))}
          <MarDeNubesYConoVapor modo="ignicion" />
          <DestelloSolar3D posicion={[0, -2.2, 1.2]} color="#fb923c" escala={0.85} />
        </>
      )}

      {subEscena === 'mar_nubes' && (
        <>
          {/* Amanecer dorado sobre el mar de nubes (Fila 5 Panel 1) */}
          <mesh position={[0, 1.5, -22]}>
            <planeGeometry args={[48, 26]} />
            <meshBasicMaterial
              color="#0284c7"
              transparent
              opacity={0.36}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <MarDeNubesYConoVapor modo="nubes" />
          <DestelloSolar3D posicion={[-4.5, 2.2, -16]} color="#fcd34d" escala={1.25} />
        </>
      )}

      {subEscena === 'arco_orbital' && (
        <>
          {/* Arco orbital terrestre azul brillante y estrellas (Fila 5 Panel 2 y Fila 2 Panel 1) */}
          <Stars radius={85} depth={45} count={1600} factor={2.2} fade />
          <Suspense fallback={null}>
            <PlanetaNasaHD id="tierra" radio={22} position={[0, -24.2, -5]} />
          </Suspense>
          <DestelloSolar3D posicion={[-6.8, 1.2, -16]} color="#bae6fd" escala={1.15} />
        </>
      )}

      <CoheteLanzadorPesado etapaAscenso={subEscena} modeloNodriza={modeloNodriza} />
    </group>
  );
}

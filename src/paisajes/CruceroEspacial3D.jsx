// Escena 3D de Crucero Interplanetario, Nebulosas, Cinturón de Asteroides, Anillos a Contraluz,
// Tormentas de Plasma y Vórtices Relativistas (Filas 3, 4 y 5 de la imagen de referencia).
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import Nodriza3D from '../nodriza/Nodriza3D.jsx';
import { Asteroide3D, texturaAsteroideRoca } from './PlanetasNasaHD.jsx';
import { DestelloSolar3D } from './DespegueAtmosferico3D.jsx';

/* ───────────── Textura de Nube de Nebulosa Volumétrica Suave ───────────── */
let texNebulosaCache = null;
function texturaNubeNebulosa() {
  if (texNebulosaCache) return texNebulosaCache;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 124);
  grd.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  grd.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)');
  grd.addColorStop(0.75, 'rgba(255, 255, 255, 0.08)');
  grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  texNebulosaCache = t;
  return t;
}

/* ───────────── Nebulosas Volumétricas (Magenta/Vía Láctea o Bicolor Cian/Ámbar) ───────────── */
function NubesNebulosa3D({ colorA = '#c084fc', colorB = '#38bdf8' }) {
  const grupoRef = useRef();
  const tex = useMemo(() => texturaNubeNebulosa(), []);

  const capas = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const ang = (i / 36) * Math.PI * 2;
      const dist = 14 + (i % 5) * 4.5;
      const x = Math.cos(ang) * dist + Math.sin(i * 3) * 3;
      const y = ((i % 7) - 3) * 2.4;
      const z = -12 - (i % 6) * 3.8;
      const escala = 8 + (i % 4) * 4.5;
      const esColorA = i % 2 === 0;
      return { x, y, z, escala, color: esColorA ? colorA : colorB, rot: i * 0.45 };
    });
  }, [colorA, colorB]);

  useFrame((_, dt) => {
    if (grupoRef.current) grupoRef.current.rotation.z += dt * 0.015;
  });

  return (
    <group ref={grupoRef}>
      {capas.map((n, idx) => (
        <mesh key={idx} position={[n.x, n.y, n.z]} rotation={[0, 0, n.rot]}>
          <planeGeometry args={[n.escala, n.escala]} />
          <meshBasicMaterial
            map={tex}
            color={n.color}
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────── Campo Denso de Asteroides Instanciados (Fila 2 Panel 6, Fila 4 Panel 5) ───────────── */
function CinturonAsteroides3D({ modoAnillo = false }) {
  const instRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const texRoca = useMemo(() => texturaAsteroideRoca(), []);

  const rocas = useMemo(() => {
    const N = 180;
    return Array.from({ length: N }, (_, i) => {
      const ang = (i * 2.39996) % (Math.PI * 2);
      const r = 4.5 + ((i * 31) % 100) * 0.25;
      const x = ( (i * 53) % 44 ) - 22;
      const y = modoAnillo
        ? -2.8 + (((i * 19) % 20) - 10) * 0.08
        : (((i * 29) % 24) - 12) * 0.45;
      const z = -2 - ((i * 37) % 34);
      const s = 0.14 + ((i * 13) % 10) * 0.065;
      return { x: modoAnillo ? x * 1.3 : Math.cos(ang) * r, y, z, s, vel: 0.2 + (i % 5) * 0.1 };
    });
  }, [modoAnillo]);

  useFrame(({ clock }) => {
    if (!instRef.current) return;
    const t = clock.elapsedTime;
    rocas.forEach((r, i) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(t * r.vel, t * r.vel * 0.7, i);
      dummy.scale.set(r.s * 1.2, r.s * 0.85, r.s);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    });
    instRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={instRef} args={[null, null, rocas.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial map={texRoca} roughness={0.9} metalness={0.15} />
      </instancedMesh>
      {!modoAnillo && (
        <>
          <Asteroide3D radio={1.25} position={[-5.2, 1.4, -3.5]} semilla={2} />
          <Asteroide3D radio={0.95} position={[5.6, -1.5, -4.2]} semilla={7} />
          <Asteroide3D radio={0.68} position={[3.2, 2.3, -6.5]} semilla={11} />
        </>
      )}
    </group>
  );
}

/* ───────────── Tormenta Electromagnética / Rayos de Plasma (Fila 4 Panel 6, Fila 5 Panel 6) ───────────── */
function TormentaPlasma3D() {
  const grupoRef = useRef();

  const rayos = useMemo(() => {
    return Array.from({ length: 18 }, (_, k) => {
      const ang = (k / 18) * Math.PI * 2;
      const pts = [new THREE.Vector3(0, 0, -10)];
      for (let s = 1; s <= 7; s++) {
        const dist = s * 2.2;
        const desvX = Math.sin(k * 3.1 + s * 1.9) * 0.9;
        const desvY = Math.cos(k * 2.7 + s * 2.3) * 0.9;
        pts.push(
          new THREE.Vector3(
            Math.cos(ang) * dist + desvX,
            Math.sin(ang) * dist + desvY,
            -10 + Math.sin(s) * 1.5
          )
        );
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: k % 2 === 0 ? '#60a5fa' : '#c084fc',
        transparent: true,
        opacity: 0.85,
      });
      return new THREE.Line(geo, mat);
    });
  }, []);

  useEffect(() => {
    return () => {
      rayos.forEach((l) => {
        l.geometry.dispose();
        l.material.dispose();
      });
    };
  }, [rayos]);

  useFrame(({ clock }) => {
    if (!grupoRef.current) return;
    grupoRef.current.rotation.z = Math.sin(clock.elapsedTime * 2.5) * 0.15;
  });

  return (
    <group ref={grupoRef}>
      {rayos.map((linea, idx) => (
        <primitive key={idx} object={linea} />
      ))}
      <DestelloSolar3D posicion={[0, 0, -10]} color="#a855f7" escala={1.35} />
    </group>
  );
}

/* ───────────── Disco de Acreción y Vórtice Gravitatorio (Fila 4 Panel 3, Fila 5 Panel 5) ───────────── */
function VorticeAcrecion3D() {
  const discoRef = useRef();
  const espiralRef = useRef();

  useFrame((_, dt) => {
    if (discoRef.current) discoRef.current.rotation.z += dt * 0.65;
    if (espiralRef.current) espiralRef.current.rotation.z -= dt * 0.95;
  });

  return (
    <group position={[0, 0.5, -12]} rotation={[0.55, -0.25, 0]}>
      {/* Singularidad central oscura */}
      <mesh>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshBasicMaterial color="#02040a" />
      </mesh>
      {/* Anillo de fotones hiperbrillante */}
      <mesh>
        <torusGeometry args={[1.75, 0.08, 16, 64]} />
        <meshBasicMaterial color="#fff7ed" toneMapped={false} />
      </mesh>
      {/* Disco de acreción caliente naranja-ámbar */}
      <group ref={discoRef}>
        {[2.4, 3.4, 4.6, 5.8].map((r, i) => (
          <mesh key={r}>
            <ringGeometry args={[r - 0.55, r, 64]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? '#fb923c' : '#f59e0b'}
              transparent
              opacity={0.55 - i * 0.09}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* Espiral cuántica azul (Fila 5 Panel 5) */}
      <group ref={espiralRef}>
        {[3.0, 4.2, 5.4].map((r) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.045, 12, 64, Math.PI * 1.35]} />
            <meshBasicMaterial color="#00f0ff" toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* Jets relativistas polares */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, s * 4.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.65, 9, 20, 1, true]} />
          <meshBasicMaterial
            color="#bae6fd"
            transparent
            opacity={0.42}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────── Escena Principal de Crucero Interplanetario ───────────── */
export default function CruceroEspacial3D({
  escenarioId = 'via_lactea_nebulosa',
  modeloNodriza,
}) {
  return (
    <group>
      <Stars radius={95} depth={55} count={2400} factor={2.6} fade speed={0.4} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[10, 12, 8]} intensity={3.2} color="#fff7ed" castShadow />
      <directionalLight position={[-8, -6, -6]} intensity={2.0} color="#38bdf8" />

      {escenarioId === 'via_lactea_nebulosa' && (
        <NubesNebulosa3D colorA="#c084fc" colorB="#ec4899" />
      )}

      {escenarioId === 'nebulosa_bicolor' && (
        <NubesNebulosa3D colorA="#38bdf8" colorB="#f59e0b" />
      )}

      {escenarioId === 'cinturon_asteroides' && (
        <>
          <CinturonAsteroides3D modoAnillo={false} />
          <DestelloSolar3D posicion={[3.5, 3.2, -18]} color="#fef08a" escala={1.1} />
        </>
      )}

      {escenarioId === 'anillos_contraluz' && (
        <>
          <CinturonAsteroides3D modoAnillo />
          <DestelloSolar3D posicion={[2.2, 0.8, -16]} color="#f59e0b" escala={1.45} />
        </>
      )}

      {escenarioId === 'tormenta_plasma' && <TormentaPlasma3D />}

      {escenarioId === 'vortice_acrecion' && <VorticeAcrecion3D />}

      {/* Nave Nodriza ASTRION navegando en crucero interplanetario */}
      <group position={[0, -0.35, 1.2]} rotation={[0.14, -0.45, -0.08]} scale={0.78}>
        <Nodriza3D
          modelo={modeloNodriza.id}
          configuracion3D={modeloNodriza.configuracion_3d}
          colorCasco={modeloNodriza.casco}
          colorAcento={modeloNodriza.acento}
          desplegado={1}
          bahiaAbierta={false}
          propulsionActiva
          escanerActivo
        />
      </group>
    </group>
  );
}

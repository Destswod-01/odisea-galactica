// La nave en 3D, construida con piezas según el diseño del jugador.
// Como Juno, gira sobre su eje (estabilización por giro) con la antena apuntando "arriba" (a la Tierra).
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { texturaCeldas } from './texturas.js';

const LARGO_ALA = { panel_chico: 2.2, panel_mediano: 3.6, panel_gigante: 5.2 };
const RADIO = { tanque_chico: 0.9, tanque_mediano: 1.0, tanque_grande: 1.15 };
const PLATO = { antena_media: 0.55, antena_alta: 1.25, antena_ka: 1.25 };

// Cada pieza "salta" al aparecer: escala de 0 a 1 con un pequeño rebote.
function Pop({ children, retraso = 0, ...props }) {
  const ref = useRef();
  const t = useRef(-retraso);
  useFrame((_, dt) => {
    if (!ref.current || t.current > 1) return;
    t.current += dt * 2.2;
    const x = Math.max(0, Math.min(1, t.current));
    const s = x === 1 ? 1 : 1 - Math.cos(x * Math.PI * 2.5) * (1 - x) ** 2;
    ref.current.scale.setScalar(Math.max(0.001, s));
  });
  return <group ref={ref} scale={0.001} {...props}>{children}</group>;
}

function Ala({ largo, conMag, detalle }) {
  const segmentos = Math.max(2, Math.round(largo / 1.1));
  const ancho = largo / segmentos;
  const celdas = texturaCeldas();
  return (
    <group>
      <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial color="#9aa4b8" metalness={0.8} roughness={0.3} />
      </mesh>
      {Array.from({ length: segmentos }).map((_, i) => (
        <mesh key={i} position={[0.5 + ancho * (i + 0.5), 0, 0]}>
          <boxGeometry args={[ancho - 0.04, 0.04, 0.95]} />
          <meshStandardMaterial map={celdas} metalness={0.6} roughness={0.25} emissive="#0a1a44" />
        </mesh>
      ))}
      {conMag && (
        <group position={[0.5 + largo + 0.35, 0, 0]}>
          <mesh><boxGeometry args={[0.5, 0.18, 0.4]} /><meshStandardMaterial color="#e8ebf0" metalness={0.3} roughness={0.5} /></mesh>
          <mesh position={[0.3, 0, 0]}><sphereGeometry args={[0.08, 12, 12]} /><meshStandardMaterial color={detalle} emissive={detalle} emissiveIntensity={0.6} /></mesh>
        </group>
      )}
    </group>
  );
}

function Llama() {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const f = 1 + Math.sin(performance.now() / 30) * 0.12 + Math.random() * 0.08;
    ref.current.scale.set(1, f, 1);
  });
  return (
    <group ref={ref} position={[0, -1.25, 0]}>
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.32, 1.4, 16, 1, true]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.4, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.9, 12, 1, true]} />
        <meshBasicMaterial color="#fff4c2" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#ffaa55" intensity={6} distance={6} position={[0, -0.6, 0]} />
    </group>
  );
}

export default function Nave3D({ diseno, estetica, girar = true, motor = false, ...props }) {
  const giro = useRef();
  useFrame((_, dt) => { if (girar && giro.current) giro.current.rotation.y += dt * 0.35; });
  const casco = estetica?.casco || '#c9d3e6';
  const detalle = estetica?.detalle || '#ff7a1a';
  const r = RADIO[diseno.propulsion] || 0.95;
  const largo = LARGO_ALA[diseno.energia] || 0;
  const plato = PLATO[diseno.antena] || 0;
  const inst = diseno.instrumentos || [];
  const tiene = (id) => inst.includes(id);
  const modulos = inst.filter((i) => !['mag', 'sonda_atmosferica', 'camara_hd'].includes(i));
  const metal = { metalness: 0.65, roughness: 0.35 };

  return (
    <group {...props}>
      <group ref={giro}>
        {/* Cuerpo hexagonal (crece con el tanque) */}
        <Pop key={`cuerpo${diseno.propulsion}`}>
          <mesh rotation={[0, Math.PI / 6, 0]}>
            <cylinderGeometry args={[r, r, 1.1, 6]} />
            <meshStandardMaterial color={casco} {...metal} />
          </mesh>
          <mesh rotation={[0, Math.PI / 6, 0]} position={[0, 0.56, 0]}>
            <cylinderGeometry args={[r * 1.02, r * 1.02, 0.06, 6]} />
            <meshStandardMaterial color={detalle} {...metal} />
          </mesh>
          <mesh rotation={[0, Math.PI / 6, 0]} position={[0, -0.56, 0]}>
            <cylinderGeometry args={[r * 1.02, r * 1.02, 0.06, 6]} />
            <meshStandardMaterial color={detalle} {...metal} />
          </mesh>
        </Pop>

        {/* Tobera del motor principal */}
        <mesh position={[0, -0.85, 0]}>
          <cylinderGeometry args={[0.18, 0.35, 0.5, 20, 1, true]} />
          <meshStandardMaterial color="#3b3f48" metalness={0.9} roughness={0.25} side={THREE.DoubleSide} />
        </mesh>
        {motor && <Llama />}

        {/* Alas solares: 3 brazos a 120° */}
        {largo > 0 && [0, 1, 2].map((k) => (
          <group key={`${k}${diseno.energia}${tiene('mag')}`} rotation={[0, (k * Math.PI * 2) / 3, 0]}>
            <Pop retraso={k * 0.12} position={[r * 0.85, 0, 0]}>
              <Ala largo={largo} conMag={k === 0 && tiene('mag')} detalle={detalle} />
            </Pop>
          </group>
        ))}

        {/* RTG: dos generadores en brazos, brillan por el calor */}
        {diseno.energia === 'rtg' && [0.6, 2.6].map((a, k) => (
          <group key={k} rotation={[0, a, 0]}>
            <Pop retraso={k * 0.1} position={[r + 0.6, -0.1, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 1.2, 6]} /><meshStandardMaterial color="#9aa4b8" /></mesh>
              <mesh position={[0.6, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.9, 10]} /><meshStandardMaterial color="#3b3f48" emissive="#ff5a1a" emissiveIntensity={0.5} {...metal} /></mesh>
              {Array.from({ length: 8 }).map((_, f) => (
                <mesh key={f} position={[0.6, 0, 0]} rotation={[0, (f * Math.PI) / 4, 0]}>
                  <boxGeometry args={[0.62, 0.8, 0.02]} />
                  <meshStandardMaterial color="#555b66" emissive="#ff5a1a" emissiveIntensity={0.25} {...metal} />
                </mesh>
              ))}
            </Pop>
          </group>
        ))}

        {/* Instrumentos alrededor del cuerpo */}
        {modulos.map((id, i) => {
          const a = (i / modulos.length) * Math.PI * 2 + 0.3;
          return (
            <Pop key={id} retraso={i * 0.05} position={[Math.cos(a) * (r + 0.12), -0.2 + (i % 2) * 0.35, Math.sin(a) * (r + 0.12)]}>
              <mesh><boxGeometry args={[0.24, 0.24, 0.24]} /><meshStandardMaterial color={detalle} {...metal} /></mesh>
              <mesh position={[Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14]}><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color="#10141c" emissive="#4da3ff" emissiveIntensity={0.8} /></mesh>
            </Pop>
          );
        })}
        {tiene('camara_hd') && (
          <Pop key="hd" position={[-(r + 0.3), 0.1, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.6, 18]} /><meshStandardMaterial color="#2a2f3a" {...metal} /></mesh>
            <mesh position={[-0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.02, 18]} /><meshStandardMaterial color="#4da3ff" emissive="#4da3ff" emissiveIntensity={0.6} /></mesh>
          </Pop>
        )}
        {tiene('sonda_atmosferica') && (
          <Pop key="sonda" position={[0, -1.25, 0]}>
            <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.7, 0.5, 24]} /><meshStandardMaterial color="#a0663a" roughness={0.8} /></mesh>
          </Pop>
        )}
      </group>

      {/* Bóveda y antena: no giran (la antena siempre apunta a la Tierra) */}
      {diseno.blindaje === 'boveda_titanio' && (
        <Pop key="boveda" position={[0, 0.85, 0]}>
          <mesh><boxGeometry args={[0.95, 0.55, 0.95]} /><meshStandardMaterial color="#8a909c" metalness={0.9} roughness={0.28} /></mesh>
        </Pop>
      )}
      {diseno.blindaje === 'blindaje_aluminio' && (
        <Pop key="alu" position={[0, 0.78, 0]}>
          <mesh><boxGeometry args={[0.8, 0.4, 0.8]} /><meshStandardMaterial color="#d9dee7" metalness={0.7} roughness={0.35} /></mesh>
        </Pop>
      )}
      {plato > 0 && (
        <Pop key={diseno.antena} position={[0, 1.15, 0]}>
          <mesh rotation={[Math.PI, 0, 0]} position={[0, plato, 0]}>
            <sphereGeometry args={[plato, 40, 16, 0, Math.PI * 2, 0, Math.PI / 5]} />
            <meshStandardMaterial color="#f3f5f9" metalness={0.3} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.03, 0.03, 0.7, 6]} /><meshStandardMaterial color="#9aa4b8" /></mesh>
          <mesh position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={diseno.antena === 'antena_ka' ? detalle : '#9aa4b8'} emissive={diseno.antena === 'antena_ka' ? detalle : '#000'} emissiveIntensity={0.7} />
          </mesh>
        </Pop>
      )}
    </group>
  );
}

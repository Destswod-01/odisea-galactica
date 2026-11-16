// Planetas en 3D: Júpiter (bandas, Gran Mancha Roja, atmósfera brillante, auroras) y la Tierra.
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { texturaJupiter, texturaLuna, texturaTierra } from './texturas.js';

function Atmosfera({ radio, color, intensidad = 0.6 }) {
  // Esfera un poco más grande, vista por dentro, con brillo aditivo: halo de atmósfera.
  return (
    <mesh scale={radio * 1.035}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial color={color} transparent opacity={intensidad * 0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export function Jupiter3D({ radio = 1, auroras = true, ...props }) {
  const ref = useRef();
  const aur = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.08; // Júpiter rota cada ~10 h: el más rápido del sistema solar
    if (aur.current) aur.current.children.forEach((m, k) => { m.material.opacity = 0.35 + 0.3 * Math.sin(performance.now() / 500 + k * 2); });
  });
  return (
    <group {...props}>
      <mesh ref={ref} scale={radio} rotation={[0.05, 0, 0.05]}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial map={texturaJupiter()} roughness={0.9} metalness={0} />
      </mesh>
      <Atmosfera radio={radio} color="#ffcf99" />
      {auroras && (
        <group ref={aur}>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, s * radio * 0.93, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radio * 0.32, radio * 0.025, 12, 64]} />
              <meshBasicMaterial color={s > 0 ? '#7dfcc8' : '#a98bff'} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function Tierra3D({ radio = 1, ...props }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.05; });
  return (
    <group {...props}>
      <mesh ref={ref} scale={radio}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texturaTierra()} roughness={0.8} />
      </mesh>
      <Atmosfera radio={radio} color="#7fc4ff" intensidad={1} />
    </group>
  );
}

export function Luna3D({ radio = 1, ...props }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.04; });
  return (
    <group {...props}>
      <mesh ref={ref} scale={radio}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texturaLuna()} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

// El planeta o luna de destino de la misión.
export function Destino3D({ destino = 'jupiter', radio = 1, ...props }) {
  if (destino === 'luna') return <Luna3D radio={radio * 0.75} {...props} />;
  return <Jupiter3D radio={radio} {...props} />;
}

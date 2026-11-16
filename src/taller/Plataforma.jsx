import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloque } from './Cuarto.jsx';

export default function Plataforma({ activa, reducido }) {
  const aro = useRef(), escaner = useRef(), luz = useRef(), garras = useRef();
  const tiempo = useRef(0);
  useFrame((_, dt) => {
    tiempo.current += Math.min(dt, .1);
    if (!reducido) aro.current.rotation.y += dt * (activa ? 1.1 : .075);
    luz.current.emissiveIntensity = activa && !reducido ? 1.8 + Math.sin(tiempo.current * 5) * .6 : .8;
    escaner.current.visible = activa && !reducido;
    escaner.current.position.y = 1.5 + (Math.sin(tiempo.current * 2) + 1) * 1.7;
    garras.current.scale.setScalar(activa ? .94 : 1);
  });
  return <group>
    {[4.6, 4.2, 3.65].map((r, i) => <mesh key={r} position={[0, .11 + i * .13, 0]} receiveShadow><cylinderGeometry args={[r, r, .22, 96]} /><meshStandardMaterial color={i === 2 ? '#344c5b' : '#111f2b'} metalness={.65} roughness={.32} /></mesh>)}
    <group ref={aro} position={[0, .47, 0]}>{[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map(a => <group key={a} rotation={[0, a, 0]}><mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[3.58, .035, 8, 64, 1.4]} /><meshStandardMaterial ref={a === 0 ? luz : undefined} color="#9beefa" emissive="#6ce1f0" emissiveIntensity={1.4} /></mesh><Bloque position={[3.58, -.015, 0]} size={[.16, .08, .32]} color="#dce8e9" /></group>)}</group>
    <mesh position={[0, .43, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[4.52, .025, 8, 96]} /><meshBasicMaterial color="#8de7f0" /></mesh>
    {Array.from({ length: 24 }, (_, i) => <group key={i} rotation={[0, i * Math.PI / 12, 0]}><Bloque position={[4.05, .38, 0]} size={[.22, .02, .06]} color={i % 3 ? '#50677a' : '#dab470'} /></group>)}
    <mesh position={[0, .75, 0]}><cylinderGeometry args={[.5, .85, .65, 12]} /><meshStandardMaterial color="#a9bac2" metalness={.7} roughness={.35} /></mesh>
    <group ref={garras}>{[0, 2.094, 4.189].map(a => <group key={a} rotation={[0, a, 0]}><Bloque position={[1.1, .9, 0]} size={[.18, 1.2, .2]} color="#97aab2" /><Bloque position={[.95, 1.45, 0]} size={[.5, .12, .22]} color="#e1b45e" /><Bloque position={[1.11, .8, .12]} size={[.055, .6, .04]} color="#7af1e0" glow={activa} /></group>)}</group>
    <mesh ref={escaner} visible={false} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.6, 1.64, 64]} /><meshBasicMaterial color="#a6fcff" transparent opacity={.6} depthWrite={false} side={2} /></mesh>
  </group>;
}

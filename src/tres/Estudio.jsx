import { Environment, Lightformer } from '@react-three/drei';

// Local light cards: metallic reflections without downloading an HDR at runtime.
export default function Estudio() {
  return <Environment resolution={128}>
    <Lightformer intensity={3} position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 6, 1]} />
    <Lightformer intensity={2} color="#a5d7ef" position={[-7, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 5, 1]} />
    <Lightformer intensity={3} position={[5, 3, -5]} rotation={[0, -Math.PI / 4, 0]} scale={[4, 8, 1]} />
  </Environment>;
}

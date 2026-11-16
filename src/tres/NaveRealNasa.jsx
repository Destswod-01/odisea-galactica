// Modelos 3D REALES de NASA (NASA 3D Resources, dominio público), traídos de la rama de Erick (C2).
// UN solo lienzo para todos los modelos: el informe ya tiene otras escenas y cada lienzo extra gasta un contexto WebGL.
// Cada modelo se normaliza en un grupo envolvente (idempotente en StrictMode) y gira solo.
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DRACO = new URL('./draco/', document.baseURI).href;

const MODELOS_NASA = {
  lro: './modelos_nasa/lro_nasa.glb',
  juno: './modelos_nasa/juno_nasa.glb',
  dsn: './modelos_nasa/antena_dsn_nasa.glb',
};

function Modelo({ url, posicion = [0, 0, 0], tam = 1.85, velocidad = 0.35 }) {
  // Los modelos de LRO y Juno vienen comprimidos con Draco: el decodificador va en public/draco/ (no depende de un CDN).
  const { scene } = useGLTF(url, DRACO);
  const { objeto, escala, offset } = useMemo(() => {
    const cl = scene.clone(true);
    cl.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(cl);
    const medida = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    const s = tam / Math.max(medida.x, medida.y, medida.z, 1e-6);
    return {
      objeto: cl,
      escala: s,
      offset: [-centro.x * s, -centro.y * s, -centro.z * s],
    };
  }, [scene, tam]);
  const grupo = useRef();
  useFrame((_, dt) => { if (grupo.current) grupo.current.rotation.y += dt * velocidad; });
  return (
    <group ref={grupo} position={posicion}>
      <group position={offset} scale={escala}>
        <primitive object={objeto} />
      </group>
    </group>
  );
}

/** modelos: lista de claves de MODELOS_NASA, se acomodan de izquierda a derecha. */
export default function NaveRealNasa({ modelos = ['lro'], alto = 260 }) {
  const separacion = 2.4;
  const x0 = -((modelos.length - 1) * separacion) / 2;
  return (
    <div className="nasa3d-lienzo" style={{ height: alto }}>
      <Canvas camera={{ position: [0, 0.9, 5.2 + modelos.length * 0.85], fov: 40 }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.95} />
        <hemisphereLight intensity={0.6} color="#d9f0ff" groundColor="#142536" />
        <directionalLight position={[4, 5, 5]} intensity={2.2} />
        <directionalLight position={[-4, -2, -3]} intensity={0.8} color="#7bdce9" />
        <Suspense fallback={null}>
          {modelos.map((m, i) => <Modelo key={m} url={MODELOS_NASA[m] ?? MODELOS_NASA.lro} posicion={[x0 + i * separacion, 0, 0]} />)}
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}

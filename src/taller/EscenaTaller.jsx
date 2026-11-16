import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Cuarto from './Cuarto.jsx';
import Maquina from './Maquina.jsx';
import Operador from './Operador.jsx';
import Brazo from './Brazo.jsx';
import NaveEstudio from '../tres/NaveEstudio.jsx';
import { CoheteMini, PiezaModelo } from '../tres/piezas3d.jsx';
import { ESTACIONES, aMundo } from './estaciones.js';
import Nitidez from '../tres/Nitidez.jsx';

export function Luces({ calidad = 'media' }) {
  return <><hemisphereLight args={['#d2e9ff', '#30404e', 2]} />
    <directionalLight position={[4, 15, 9]} intensity={3.4} color="#fff0d8" castShadow={calidad !== 'baja'} shadow-mapSize={[calidad === 'alta' ? 4096 : 2048, calidad === 'alta' ? 4096 : 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-normalBias={.05} />
    <directionalLight position={[-8, 7, -6]} intensity={2} color="#74c9ff" />
    <Environment resolution={128} frames={1}><Lightformer form="rect" intensity={3} color="#c7e9ff" position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 20, 1]} /><Lightformer intensity={2} position={[8, 4, 8]} scale={10} color="#ffe0b2" /></Environment>
  </>;
}
function Camara({ fase, estacion, reducido, zoom, encuadre, trabajo }) {
  const { camera, size } = useThree();
  const objetivo = useRef(new THREE.Vector3(0, 1, 0));
  useFrame((_, dt) => {
    const cerca = ['entrando', 'maquina'].includes(fase);
    const aspecto = size.width / size.height;
    const factor = (aspecto < 1.1 ? 1.2 : aspecto > 1.7 ? .82 : 1) / zoom;
    const montaje = (fase === 'instalando' && trabajo?.categoria !== 'cohete') || encuadre === 'montaje';
    const p = cerca ? aMundo(estacion, [0, 3.8, 7.8]) : montaje ? [11 * factor, 10 * factor, 16 * factor] : [22 * factor, 21 * factor, 28 * factor];
    const t = cerca ? aMundo(estacion, [0, 2.2, .4]) : montaje ? [-1.5, 2.3, 1.4] : [0, 1, -.8];
    const k = reducido ? 1 : 1 - Math.exp(-Math.min(dt, .06) * 4);
    camera.position.lerp(new THREE.Vector3(...p), k); objetivo.current.lerp(new THREE.Vector3(...t), k); camera.lookAt(objetivo.current);
  });
  return null;
}
export default function EscenaTaller({ diseno, estetica, mision, calidad, fase, estacion, destino, alLlegar, alEstacion, trabajo, alEntregar, alInstalar, alEtapa, reducido, recien, zoom = 1, encuadre = 'taller' }) {
  const [dpr, setDpr] = useState(2);
  return <Canvas shadows={calidad !== 'baja'} dpr={dpr} camera={{ position: [22, 21, 28], fov: 43, near: .1, far: 200 }} gl={{ antialias: true, powerPreference: 'high-performance', precision: 'highp' }} frameloop={fase === 'maquina' ? 'never' : 'always'}>
    <color attach="background" args={['#0b1521']} />
    <Suspense fallback={null}><Luces calidad={calidad} /><Cuarto mision={mision.id} activa={fase === 'instalando'} reducido={reducido} />
      <group position={[0, 2.3, 0]}><NaveEstudio diseno={diseno} estetica={estetica} girar={false} recien={recien} /></group>
      {diseno.cohete && <group position={[8.4, .4, 4.6]}><CoheteMini id={diseno.cohete} altura={4.2} /></group>}
      {ESTACIONES.map(e => <Maquina key={e.id} estacion={e} calidad={calidad} estado={e.id === estacion ? 'activa' : 'reposo'} completa={e.id === 'instrumentos' ? diseno.instrumentos.length > 0 : e.id === 'estetica' ? !!estetica.nombre : !!diseno[e.id]} alPulsar={alEstacion} />)}
      <Operador inicioEn="cohete" destino={destino} color={estetica.detalle} gesto={fase === 'celebrando' ? 'celebrar' : fase === 'entrando' ? 'teclear' : 'reposo'} calidad={calidad} alLlegar={alLlegar} reducido={reducido} />
      <Brazo trabajo={trabajo?.categoria !== 'cohete' ? trabajo : null} alEntregar={alEntregar} alTerminar={alInstalar} alEtapa={alEtapa} estetica={estetica} reducido={reducido} />
      <Nitidez calidad={calidad} revision={`${JSON.stringify(diseno)}-${fase}`} alResolver={setDpr} />
    </Suspense><Camara {...{ fase, estacion, reducido, zoom, encuadre, trabajo }} />
  </Canvas>;
}
export function VisorPieza({ categoria, id, estetica, diseno, calidad, reducido }) {
  const [dpr, setDpr] = useState(2);
  return <Canvas dpr={dpr} camera={{ position: [3.7, 2.4, 4.8], fov: 35 }} gl={{ alpha: true, antialias: true }}>
    <Suspense fallback={null}><Luces calidad="baja" />
      <group position={[0, .25, 0]}>{categoria === 'estetica' ? <NaveEstudio diseno={diseno} estetica={estetica} scale={.38} girar={false} /> : <PiezaModelo categoria={categoria} id={id} estetica={estetica} escala={categoria === 'cohete' ? 1.6 : 2.15} />}</group>
      <mesh position={[0, -1.4, 0]}><cylinderGeometry args={[1, 1.12, .12, 64]} /><meshStandardMaterial color="#142739" metalness={.7} roughness={.3} /></mesh>
      <mesh position={[0, -1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.96, .012, 8, 64]} /><meshBasicMaterial color="#8ae0eb" /></mesh>
      <Nitidez calidad={calidad} revision={id} alResolver={setDpr} />
    </Suspense><OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={9} autoRotate={!reducido && calidad !== 'baja'} autoRotateSpeed={.7} />
  </Canvas>;
}

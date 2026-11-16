import { Suspense, useLayoutEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Operador from './Operador.jsx';
import { Luces } from './EscenaTaller.jsx';
import Cuarto from './Cuarto.jsx';
import Maquina from './Maquina.jsx';
import { ESTACIONES, posicionOperador } from './estaciones.js';
import NaveEstudio from '../tres/NaveEstudio.jsx';
import Nitidez from '../tres/Nitidez.jsx';
const DEMO = { propulsion: 'tanque_chico', energia: 'panel_chico', antena: 'antena_alta', blindaje: 'blindaje_aluminio', instrumentos: ['lroc'] };
function Encuadre() {
  const { camera, size } = useThree();
  useLayoutEffect(() => { camera.position.set(...(size.width / size.height < 1 ? [14, 8, 18] : [13, 7.5, 16])); camera.lookAt(2.5, 2, 2); }, [camera, size.width, size.height]);
  return null;
}
// Un monito por jugador de la sala en línea (máx. 4): mismo operador, solo cambia el color del traje.
const TRAJES = ['#ee9c4d', '#5cc8ff', '#7fe3b0', '#e06c9f'];
const LUGARES = [[4, 5], [6.6, 3.2], [1.6, 7.2], [7.6, 6.4]];

export default function PortadaHangar({ misionId = 'lro', jugadores = 1 }) {
  const [dpr, setDpr] = useState(2);
  const [x, z] = posicionOperador('cohete');
  return <Canvas shadows dpr={dpr} camera={{ position: [13, 7.5, 16], fov: 40 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#0a1420']} />
    <Suspense fallback={null}><Luces calidad="media" /><Cuarto mision={misionId === 'juno' ? 'juno' : 'lro'} />
      {ESTACIONES.slice(2, 6).map(e => <Maquina key={e.id} estacion={e} calidad="baja" estado="reposo" completa />)}
      {LUGARES.slice(0, Math.max(1, Math.min(4, jugadores))).map(([px, pz], i) => <group key={i} position={[px, .03, pz]} rotation={[0, Math.PI / 2 + .25 - i * .18, 0]} scale={2.6}><group position={[-x, 0, -z]}><Operador destino="cohete" gesto="saludar" color={TRAJES[i]} calidad={i === 0 ? 'alta' : 'media'} /></group></group>)}
      <group position={[0, 2.3, 0]}><NaveEstudio diseno={{ ...DEMO, energia: misionId === 'juno' ? 'panel_mediano' : 'panel_chico' }} estetica={{ casco: '#dae5e8', detalle: '#eab66b' }} /></group>
      <pointLight position={[5, 4, 6]} color="#ffe2b1" intensity={12} distance={8} />
      <Nitidez revision={misionId} alResolver={setDpr} />
    </Suspense><Encuadre /><OrbitControls enableZoom={false} enablePan={false} minPolarAngle={.95} maxPolarAngle={1.25} minAzimuthAngle={.25} maxAzimuthAngle={.9} target={[2.5, 2, 2]} />
  </Canvas>;
}

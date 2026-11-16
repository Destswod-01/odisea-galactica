import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Cuerpo, PanelSolar, Rtg, Antena, Blindaje, InstrumentoModelo, Aparece, radioCuerpo, largoPanel, radioPlato, lugarEnAnillo, puntoDeMontaje } from './piezas3d.jsx';
const METAL = { metalness: .8, roughness: .32 };
function Tobera({ motor }) {
  const ref = useRef();
  const curva = useMemo(() => [new THREE.Vector2(.13, 0), new THREE.Vector2(.1, -.12), new THREE.Vector2(.16, -.32), new THREE.Vector2(.32, -.62)], []);
  useFrame(({ clock }) => { if (ref.current) ref.current.scale.y = 1 + Math.sin(clock.elapsedTime * 36) * .07; });
  return <group position={[0, -.64, 0]}>
    <mesh><latheGeometry args={[curva, 40]} /><meshStandardMaterial color="#3c4751" metalness={.8} roughness={.3} side={THREE.DoubleSide} /></mesh>
    {[.17, .3, .43, .58].map((y, i) => <mesh key={y} position={[0, -y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.12 + i * .06, .012, 6, 32]} /><meshStandardMaterial color="#93a2ab" {...METAL} /></mesh>)}
    {motor && <group ref={ref} position={[0, -.62, 0]}>{[0, 1].map(k => <mesh key={k} position={[0, -.65 + k * .15, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[.28 - k * .13, 1.5 - k * .35, 32, 1, true]} /><meshBasicMaterial color={k ? '#e4faff' : '#7ab6f4'} transparent opacity={.65} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>)}</group>}
  </group>;
}
function AlaDesplegable({ largo, r, despliegue }) {
  const ref = useRef();
  const [inicial] = useState(() => (1 - despliegue) * Math.PI / 2);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, (1 - despliegue) * Math.PI / 2, 4, dt); });
  return <group position={[r, -.12, 0]} ref={ref} rotation={[0, 0, inicial]}><PanelSolar largo={largo} /></group>;
}
function AntenaOrientable({ plato, ka, orientacion }) {
  const ref = useRef();
  const [inicial] = useState(orientacion);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, orientacion, 4, dt); });
  return <group ref={ref} position={[0, 1.2, 0]} rotation={[inicial, 0, 0]}><Antena radio={plato} ka={ka} /></group>;
}
export default function NaveEstudio({ diseno, estetica, girar = true, motor = false, recien = null, despliegue = 1, orientacionAntena = 0, rastreadores = false, ...props }) {
  const ref = useRef();
  useFrame((_, dt) => { if (girar && ref.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) ref.current.rotation.y += dt * .12; });
  const r = radioCuerpo(diseno.propulsion), largo = largoPanel(diseno.energia), plato = radioPlato(diseno.antena);
  const inst = diseno.instrumentos || [];
  const aparece = (categoria, id, children) => <Aparece activa={recien?.categoria === categoria} clave={id} key={id}>{children}</Aparece>;
  return <group {...props}><group ref={ref}>
    {diseno.propulsion ? aparece('propulsion', diseno.propulsion, <><Cuerpo id={diseno.propulsion} r={r} color={estetica?.casco} detalle={estetica?.detalle} /><Tobera motor={motor} /></>) : <mesh><cylinderGeometry args={[.82, .82, 1.18, 6]} /><meshStandardMaterial color="#75b7c6" wireframe transparent opacity={.35} /></mesh>}
    {diseno.energia && aparece('energia', diseno.energia, <>
      {largo && [0, 1, 2].map(i => <group key={i} rotation={[0, i * Math.PI * 2 / 3, 0]}><AlaDesplegable largo={largo} r={r} despliegue={despliegue} /></group>)}
      {diseno.energia === 'rtg' && [-1, 1].map(s => <group key={s} position={[s * (r + .85), 0, 0]}><Rtg lado={s} /></group>)}
    </>)}
    {plato && aparece('antena', diseno.antena, <AntenaOrientable plato={plato} orientacion={orientacionAntena} ka={diseno.antena === 'antena_ka'} />)}
    {rastreadores && <group position={[0, .45, r + .05]}><mesh><boxGeometry args={[.32, .24, .24]} /><meshStandardMaterial color="#283a52" /></mesh><mesh position={[0, 0, .13]}><circleGeometry args={[.075, 16]} /><meshBasicMaterial color="#c4c0ff" /></mesh></group>}
    {diseno.blindaje && aparece('blindaje', diseno.blindaje, <group position={[0, .82, 0]}><Blindaje id={diseno.blindaje} /></group>)}
    {inst.map(id => { const especial = ['mag', 'sonda_atmosferica'].includes(id); const lugar = lugarEnAnillo(inst, id, r + .2); return aparece('instrumentos', id, <group position={especial ? puntoDeMontaje('instrumentos', id, diseno) : lugar.pos} rotation={[0, especial ? 0 : lugar.a, 0]}><InstrumentoModelo id={id} /></group>); })}
  </group></group>;
}

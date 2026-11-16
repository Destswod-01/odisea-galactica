import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bloque } from './Cuarto.jsx';
import { PiezaModelo, puntoDeMontaje } from '../tres/piezas3d.jsx';

import { articulacion, cicloMontaje, DURACION_MONTAJE, ENTREGA } from './cinematica.js';

const VY = new THREE.Vector3(0, 1, 0);
function colocarBarra(obj, a, b) {
  const d = b.clone().sub(a); obj.position.copy(a).add(b).multiplyScalar(.5);
  obj.quaternion.setFromUnitVectors(VY, d.clone().normalize()); obj.scale.y = d.length();
}
export default function Brazo({ trabajo, alEntregar, alTerminar, alEtapa, estetica, reducido }) {
  const base = useRef(), superior = useRef(), inferior = useRef(), codo = useRef(), pinza = useRef(), carga = useRef();
  const dedoI = useRef(), dedoD = useRef(), destello = useRef(), chispas = useRef();
  const reloj = useRef({ id: null, t: 0, terminado: false, entregado: false, etapa: null });
  useFrame((_, dt) => {
    const e = reloj.current;
    if (e.id !== trabajo?.id) { e.id = trabajo?.id; e.t = 0; e.terminado = false; e.entregado = false; e.etapa = null; }
    e.t += Math.min(dt, .1);
    const k = trabajo ? Math.min(1, e.t / (reducido ? .1 : DURACION_MONTAJE)) : 0;
    const montaje = trabajo ? puntoDeMontaje(trabajo.categoria, trabajo.pieza, trabajo.diseno) : [0, 0, 0];
    const fin = [montaje[0], montaje[1] + 2.3, montaje[2]];
    const ciclo = cicloMontaje(k, fin), bx = ciclo.bx;
    const punta = new THREE.Vector3(...ciclo.punta);
    const h = new THREE.Vector3(bx, 1.5, 1.4), c = new THREE.Vector3(...articulacion(h.toArray(), punta.toArray()));
    base.current.position.x = bx; codo.current.position.copy(c); pinza.current.position.copy(punta);
    dedoI.current.position.x = -ciclo.apertura; dedoD.current.position.x = ciclo.apertura;
    colocarBarra(superior.current, h, c); colocarBarra(inferior.current, c, punta);
    carga.current.visible = !!trabajo && !ciclo.entregada;
    carga.current.position.set(...(ciclo.recogida ? ciclo.punta : [-5.4, 1.6, 4.2])); carga.current.position.y -= .3;
    destello.current.visible = !!trabajo && ciclo.soldando && !reducido;
    destello.current.position.copy(punta); destello.current.scale.setScalar(.13 + Math.sin(e.t * 24) * .04);
    chispas.current.visible = destello.current.visible; chispas.current.position.copy(punta);
    chispas.current.rotation.y = e.t * 2; chispas.current.scale.setScalar(.8 + Math.sin(e.t * 14) * .2);
    if (trabajo && ciclo.etapa !== e.etapa) { e.etapa = ciclo.etapa; alEtapa?.(ciclo.etapa); }
    if (trabajo && k >= ENTREGA && !e.entregado) { e.entregado = true; alEntregar(trabajo.id); }
    if (trabajo && k >= 1 && !e.terminado) { e.terminado = true; alTerminar(trabajo.id); }
  });
  return <group>
    {[1.05, 1.75].map(z => <Bloque key={z} position={[0, .18, z]} size={[13, .16, .12]} color="#a2b8c3" />)}
    <group ref={base} position={[-5.6, 0, 0]}><Bloque position={[0, .4, 1.4]} size={[1.4, .7, 1.25]} color="#d47a38" /><mesh position={[0, 1.1, 1.4]}><cylinderGeometry args={[.45, .6, .9, 24]} /><meshStandardMaterial color="#cdd5d6" metalness={.6} roughness={.3} /></mesh><mesh position={[0, 1.5, 1.4]}><sphereGeometry args={[.38, 20, 16]} /><meshStandardMaterial color="#182b39" /></mesh></group>
    {[superior, inferior].map((ref, i) => <mesh key={i} ref={ref} castShadow><boxGeometry args={[i ? .22 : .32, 1, .38]} /><meshStandardMaterial color={i ? '#b8c9ce' : '#eea24e'} metalness={.6} roughness={.3} /></mesh>)}
    <mesh ref={codo}><sphereGeometry args={[.31, 20, 16]} /><meshStandardMaterial color="#dce1df" metalness={.7} roughness={.3} /></mesh>
    <group ref={pinza}><mesh><sphereGeometry args={[.23, 20, 16]} /><meshStandardMaterial color="#85e8ec" emissive="#318f96" /></mesh>{[dedoI, dedoD].map((ref, i) => <group key={i} ref={ref}><Bloque position={[0, -.18, 0]} size={[.09, .45, .18]} color="#b1c8d1" /><Bloque position={[i ? -.06 : .06, -.38, 0]} size={[.19, .08, .18]} color="#324955" /></group>)}</group>
    <mesh ref={destello} visible={false}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#dbfdff" toneMapped={false} /></mesh>
    <group ref={chispas} visible={false}>{Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[Math.sin(i * 11) * .45, Math.cos(i * 9) * .35, Math.sin(i * 7) * .45]} rotation={[i, i * .7, 0]}><boxGeometry args={[.015, .16, .015]} /><meshBasicMaterial color={i % 2 ? '#9cf5ff' : '#ffc981'} toneMapped={false} /></mesh>)}</group>
    <group ref={carga}>{trabajo && <PiezaModelo categoria={trabajo.categoria} id={trabajo.pieza} estetica={estetica} escala={.65} />}</group>
  </group>;
}

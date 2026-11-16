import { useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { PerspectiveCamera, RenderTexture, useTexture } from '@react-three/drei';
import Plataforma from './Plataforma.jsx';
import { useT } from '../i18n/idioma.js';

export function Bloque({ size, color = '#263b4c', glow = false, ...props }) {
  return <mesh castShadow receiveShadow {...props}><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={glow ? 0 : .45} roughness={.42} emissive={glow ? color : '#000000'} emissiveIntensity={glow ? 2 : 0} /></mesh>;
}
export function Rotulo({ texto, size = [4, .65], color = '#bdebf3', ...props }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
    const x = c.getContext('2d'); x.fillStyle = color; x.font = '600 65px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, 512, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [texto, color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return <mesh {...props}><planeGeometry args={size} /><meshBasicMaterial map={tex} transparent depthWrite={false} /></mesh>;
}
function Planeta({ mision }) {
  const tex = useTexture(`./texturas/${mision === 'juno' ? 'jupiter' : 'moon'}.jpg`);
  return <mesh position={[6.2, 5.95, -11.05]}><planeGeometry args={[12.4, 3.5]} /><meshBasicMaterial><RenderTexture attach="map" width={1024} height={384} frames={1} key={mision}>
    <color attach="background" args={['#040d19']} /><PerspectiveCamera makeDefault manual aspect={12.4 / 3.5} position={[0, 0, 12]} fov={36} />
    <ambientLight intensity={.45} /><directionalLight position={[-3, 5, 4]} intensity={3} />
    <mesh position={[2.5, -.7, 0]} rotation={[.05, .6, .1]}><sphereGeometry args={[2.8, 64, 32]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>
    {Array.from({ length: 40 }, (_, i) => <mesh key={i} position={[Math.sin(i * 73) * 13, Math.cos(i * 39) * 4, -4]}><sphereGeometry args={[.012 + (i % 3) * .007, 5, 4]} /><meshBasicMaterial color="#96b8d4" /></mesh>)}
  </RenderTexture></meshBasicMaterial></mesh>;
}
function Piso() {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color();
    for (let x = 0; x < 13; x++) for (let z = 0; z < 11; z++) {
      const i = x * 11 + z; ref.current.setMatrixAt(i, m.makeTranslation(-12 + x * 2, .005, -10 + z * 2));
      ref.current.setColorAt(i, c.set((x + z) % 2 ? '#23323d' : '#293a46'));
    }
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[null, null, 143]} receiveShadow><boxGeometry args={[1.96, .035, 1.96]} /><meshStandardMaterial metalness={.45} roughness={.42} /></instancedMesh>;
}
export default function Cuarto({ mision = 'lro', activa = false, reducido = false }) {
  const t = useT();
  return <group>
    <Bloque position={[0, -.3, 0]} size={[27, .6, 23]} color="#111e2b" />
    <Piso />
    <Bloque position={[-13.15, 3.8, 0]} size={[.35, 7.6, 22]} color="#354854" />
    <Bloque position={[0, 2, -11.15]} size={[26, 4, .35]} color="#354854" />
    <Bloque position={[-6.8, 5.85, -11.15]} size={[12.4, 3.7, .35]} color="#293c4c" />
    <Bloque position={[0, 7.8, -11.15]} size={[26, .5, .6]} color="#b2c4c9" />
    <Bloque position={[-13, 7.8, 0]} size={[.6, .5, 22]} color="#b2c4c9" />
    <Bloque position={[6.6, 4.1, -11.1]} size={[12.7, .25, .6]} color="#a6b8bf" />
    <Planeta mision={mision} />
    {[-12.6, -.3, 12.6].map(x => <Bloque key={x} position={[x, 5.9, -10.95]} size={[.22, 3.6, .3]} color="#a6b8bf" />)}
    {[-8, -2, 4, 10].map(z => <group key={z}><Bloque position={[-12.85, 4, z]} size={[.35, 7.4, .25]} color="#91a5ae" /><Bloque position={[-12.6, 6.5, z - .9]} size={[.08, .08, 1.5]} color="#9ff6ff" glow /></group>)}
    <Bloque position={[0, 3.98, -10.9]} size={[25.7, .035, .05]} color="#83cddc" glow />
    <Bloque position={[-12.85, 7.5, 0]} size={[.04, .06, 21.8]} color="#bdf7ff" glow />
    <Rotulo texto="ODISEA GALÁCTICA" position={[-6.8, 6, -10.91]} size={[9, 1.1]} />
    <Rotulo texto="SPACECRAFT ASSEMBLY FACILITY" position={[-6.8, 5.05, -10.9]} size={[8, .42]} color="#779aa9" />
    <Rotulo texto={t('hangar.cuarto.ensamblaje')} position={[0, .04, 8.8]} rotation={[-Math.PI / 2, 0, 0]} size={[6, .55]} />
    {[-9.3, -8.9].map(x => <Bloque key={x} position={[x, .045, -.8]} size={[.035, .012, 17.4]} color="#d9bd6f" />)}
    <Bloque position={[1.5, .045, -7.4]} size={[21, .012, .035]} color="#d9bd6f" />
    <Plataforma activa={activa} reducido={reducido} />
    <Bloque position={[-5.4, .45, 4.2]} size={[1.9, .9, 1.9]} color="#576e7b" />
    <Bloque position={[-5.4, .94, 4.2]} size={[2, .08, 2]} color="#9ddfe7" />
    <Rotulo texto={t('hangar.cuarto.carga')} position={[-5.4, .55, 5.16]} size={[1.3, .28]} />
    <mesh position={[8.4, .2, 4.6]}><cylinderGeometry args={[1.5, 1.6, .4, 48]} /><meshStandardMaterial color="#354e5f" metalness={.65} roughness={.3} /></mesh>
    <Rotulo texto={t('hangar.cuarto.lanzador')} position={[8.4, .05, 7]} rotation={[-Math.PI / 2, 0, 0]} size={[2.7, .35]} />
    {[6.8, 9.4].map(x => <group key={x} position={[x, 0, 9.3]}><Bloque position={[0, .5, 0]} size={[1.9, 1, 1.1]} color="#526574" /><Bloque position={[0, 1.02, 0]} size={[2, .1, 1.15]} color="#a4b5ba" />{[-.7, .7].map(a => <Bloque key={a} position={[a, .5, .56]} size={[.08, .85, .03]} color="#e2b665" />)}</group>)}
  </group>;
}
export function Demo() { return <><ambientLight intensity={1.6} /><directionalLight position={[3, 12, 7]} intensity={3} /><Cuarto /></>; }

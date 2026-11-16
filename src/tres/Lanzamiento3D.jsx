// Lanzamiento en 3D: cohete con núcleo, propulsores sólidos, etapa superior y cofia.
// El cielo se oscurece con la altura, el humo queda atrás, las etapas sueltas caen girando
// y la cámara sigue al cohete (y tiembla durante el despegue).
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';
import { Lienzo } from './Escenas.jsx';
import { Tierra3D } from './PlanetasHD.jsx';
import Estudio from './Estudio.jsx';

const CIELO_BAJO = new THREE.Color('#29465a');
const CIELO_ALTO = new THREE.Color('#03050b');

function Fuego({ escala = 1, color = '#ffb347', y = 0 }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.scale.set(escala, escala * (1 + Math.sin(performance.now() / 25) * 0.15 + Math.random() * 0.1), escala);
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.35, 2, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.18, 1.2, 12, 1, true]} />
        <meshBasicMaterial color="#fff6d0" transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Propulsor({ fuego }) {
  return (
    <group>
      <mesh><cylinderGeometry args={[0.16, 0.16, 3.2, 16]} /><meshStandardMaterial color="#f4f4f4" roughness={0.5} /></mesh>
      <mesh position={[0, 1.75, 0]}><coneGeometry args={[0.16, 0.35, 16]} /><meshStandardMaterial color="#f4f4f4" /></mesh>
      <mesh position={[0, -1.7, 0]}><cylinderGeometry args={[0.1, 0.17, 0.25, 12]} /><meshStandardMaterial color="#333" /></mesh>
      {fuego && <Fuego escala={0.55} y={-1.8} color="#ffd27a" />}
    </group>
  );
}

function Nucleo({ fuego }) {
  return (
    <group>
      <mesh><cylinderGeometry args={[0.42, 0.42, 5, 48]} /><meshStandardMaterial color="#deded6" metalness={.45} roughness={0.3} /></mesh>
      {[-2.3,-1.8,.7,1.9,2.4].map(y => <mesh key={y} position={[0,y,0]}><cylinderGeometry args={[.425,.425,.065,48]} /><meshStandardMaterial color="#63717b" metalness={.8} roughness={.3} /></mesh>)}
      {[-1,1].map(s => <mesh key={s} position={[s*.425,0,0]}><boxGeometry args={[.035,4.7,.075]} /><meshStandardMaterial color="#8a959b" metalness={.7} roughness={.25} /></mesh>)}
      <mesh position={[0, -2.6, 0]}><cylinderGeometry args={[0.28, 0.42, 0.3, 16]} /><meshStandardMaterial color="#3b3f48" metalness={0.8} /></mesh>
      {fuego && <Fuego escala={1} y={-2.75} />}
    </group>
  );
}

// Pieza que cae: se separa con un empujón lateral, cae y gira.
function Caida({ children, desde, empuje }) {
  const ref = useRef();
  const v = useRef(new THREE.Vector3(empuje * 0.8, 2.5, empuje * 0.3)); // siguen subiendo un poco por inercia
  const giro = useRef(empuje * 1.4);
  useFrame((_, dt) => {
    if (!ref.current) return;
    v.current.y -= dt * 2.2;
    ref.current.position.addScaledVector(v.current, dt);
    ref.current.rotation.z += giro.current * dt;
  });
  return <group ref={ref} position={desde}>{children}</group>;
}

// Humo: esferas que quedan atrás y se expanden.
function Humo({ activo, alturaRef }) {
  const N = 60;
  const ref = useRef();
  const datos = useMemo(() => Array.from({ length: N }, () => ({ p: new THREE.Vector3(0, -999, 0), vida: 0, s: 1 })), []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const siguiente = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (activo) {
      for (let k = 0; k < 2; k++) {
        const d = datos[siguiente.current++ % N];
        d.p.set((Math.random() - 0.5) * 0.6, alturaRef.current - 3.2, (Math.random() - 0.5) * 0.6);
        d.vida = 1; d.s = 0.4;
      }
    }
    datos.forEach((d, i) => {
      d.vida = Math.max(0, d.vida - dt * 0.35);
      d.s += dt * 1.8;
      d.p.x += (Math.random() - 0.5) * dt;
      tmp.position.copy(d.p);
      tmp.scale.setScalar(d.vida > 0 ? d.s : 0.0001);
      tmp.updateMatrix();
      ref.current.setMatrixAt(i, tmp.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[null, null, N]}>
      <sphereGeometry args={[0.5, 10, 10]} />
      <meshStandardMaterial color="#e8e8e8" transparent opacity={0.55} roughness={1} depthWrite={false} />
    </instancedMesh>
  );
}

function Mundo({ progreso, etapa, enVuelo, cuenta, solidos, caidos, fin, inclinacion = 0 }) {
  const { scene, camera } = useThree();
  const cohete = useRef();
  const cielo = useRef();
  const tierra = useRef();
  const altura = useRef(0);
  const [separaciones, setSeparaciones] = useState([]);
  const soltoSolidos = caidos.includes('solidos');
  const soltoPrimera = caidos.includes('primera');

  // Cuando se suelta una etapa, nace una pieza que cae desde la posición actual del cohete.
  useEffect(() => {
    const nuevas = caidos.filter((c) => !separaciones.some((s) => s.tipo === c));
    if (nuevas.length) setSeparaciones((s) => [...s, ...nuevas.map((tipo) => ({ tipo, y: altura.current }))]);
  }, [caidos]); // eslint-disable-line react-hooks/exhaustive-deps

  const posSolidos = useMemo(() => Array.from({ length: solidos }, (_, k) => {
    const a = (k / solidos) * Math.PI * 2 + 0.4;
    return [Math.cos(a) * 0.6, -0.8, Math.sin(a) * 0.6];
  }), [solidos]);

  useFrame((_, dt) => {
    // El cohete sube; la altura en la escena crece con el progreso.
    const objetivo = progreso * progreso * 160;
    altura.current += (objetivo - altura.current) * Math.min(1, dt * 3);
    if (cohete.current) {
      cohete.current.position.y = altura.current;
      // El cohete se inclina (giro gravitatorio). Se suaviza para que no salte.
      const objetivo = -(inclinacion * Math.PI) / 180 * 0.6;
      cohete.current.rotation.z += (objetivo - cohete.current.rotation.z) * Math.min(1, dt * 6);
    }
    if (cielo.current) cielo.current.position.y = altura.current; // las estrellas acompañan a la cámara
    if (tierra.current) tierra.current.position.y = altura.current - 63; // la Tierra se ve abajo, curva
    // Cielo: azul a negro con la altura; niebla igual.
    const c = CIELO_BAJO.clone().lerp(CIELO_ALTO, Math.min(1, progreso * 1.6));
    scene.background = c;
    // Cámara: sigue al cohete y tiembla con los motores principales.
    const temblor = (cuenta !== null || (enVuelo && etapa === 'solidos')) ? 0.06 : enVuelo && etapa === 'primera' ? 0.025 : 0;
    camera.position.set(7 + (Math.random() - 0.5) * temblor, altura.current + 1.5 + (Math.random() - 0.5) * temblor, 12.5);
    camera.lookAt(0, altura.current + 0.6, 0);
  });

  const motorAbajo = enVuelo && (etapa === 'solidos' || etapa === 'primera');
  return (
    <>
      <ambientLight intensity={0.6} />
      <Estudio />
      <directionalLight position={[5, 10, 6]} intensity={2.2} />
      <hemisphereLight args={['#bfe0ff', '#2d3a2a', 0.6]} />

      {/* Suelo, plataforma y torre */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.3, 0]}><circleGeometry args={[80, 64]} /><meshStandardMaterial color="#26363d" roughness={.95} /></mesh>
      {[-1,1].map(s => <group key={s}><mesh position={[s*3.4,-3.1,5]}><boxGeometry args={[.04,.03,30]} /><meshBasicMaterial color="#b4c8c9" /></mesh>{[0,1,2,3,4,5].map(i => <mesh key={i} position={[s*4,-3, i*4-6]}><boxGeometry args={[.18,.08,.35]} /><meshBasicMaterial color="#b9dce7" /></mesh>)}</group>)}
      {Array.from({length:7},(_,i)=><group key={i} position={[-2.2,-2.5+i,0]}><mesh><boxGeometry args={[1.25,.1,1.2]} /><meshStandardMaterial color="#7c8a90" metalness={.7} roughness={.4} /></mesh><mesh position={[.5,.45,.5]} rotation={[0,0,.65]}><boxGeometry args={[.06,1.3,.06]} /><meshStandardMaterial color="#a0adb0" metalness={.6} roughness={.4} /></mesh></group>)}
      <mesh position={[0, -3.2, 0]}><boxGeometry args={[5, 0.3, 5]} /><meshStandardMaterial color="#6b7078" /></mesh>
      <mesh position={[-2.2, 0, 0]}><boxGeometry args={[0.35, 6.5, 0.35]} /><meshStandardMaterial color="#65727c" metalness={0.7} /></mesh>
      {/* Nubes */}
      {[[4, 12, -3], [-6, 22, -6], [3, 35, -8], [-4, 48, -5]].map(([x, y, z], k) => (
        <group key={k} position={[x, y, z]}>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[j * 1.2 - 1.2, Math.sin(j) * 0.3, 0]}><sphereGeometry args={[1 + (j % 2) * 0.4, 14, 14]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.85} /></mesh>
          ))}
        </group>
      ))}
      {/* La Tierra se ve abajo al final del ascenso */}
      {progreso > 0.6 && <group ref={tierra} position={[0, -999, -25]}><Tierra3D radio={60} /></group>}

      {progreso > 0.3 && <group ref={cielo}><Stars radius={60} depth={30} count={2000} factor={3} fade /></group>}

      <Humo activo={motorAbajo && progreso < 0.7} alturaRef={altura} />

      <group ref={cohete}>
        {!soltoPrimera && <Nucleo fuego={motorAbajo} />}
        {!soltoSolidos && posSolidos.map((p, k) => <group key={k} position={p}><Propulsor fuego={enVuelo && etapa === 'solidos'} /></group>)}
        {/* Etapa superior + cofia (la nave va adentro) */}
        <mesh position={[0, 3.1, 0]}><cylinderGeometry args={[0.42, 0.42, 1.2, 24]} /><meshStandardMaterial color="#f0f2f5" metalness={0.3} /></mesh>
        {etapa === 'apagado' && !fin && <group position={[0, 2.45, 0]}><Fuego escala={0.6} color="#8fd3ff" /></group>}
        <mesh position={[0, 4.4, 0]}><cylinderGeometry args={[0.5, 0.5, 1.4, 24]} /><meshStandardMaterial color="#fbfbfd" metalness={0.2} /></mesh>
        <mesh position={[0, 5.55, 0]}><coneGeometry args={[0.5, 0.9, 24]} /><meshStandardMaterial color="#fbfbfd" metalness={0.2} /></mesh>
      </group>

      {separaciones.map((s, k) => (
        s.tipo === 'solidos'
          ? posSolidos.map((p, j) => (
            <Caida key={`${k}${j}`} desde={[p[0], s.y + p[1], p[2]]} empuje={p[0] > 0 ? 1.2 : -1.2}>
              <Propulsor />
            </Caida>
          ))
          : <Caida key={k} desde={[0, s.y, 0]} empuje={0.4}><Nucleo /></Caida>
      ))}
    </>
  );
}

export default function Lanzamiento3D(props) {
  return (
    <Lienzo alto={560} camara={[6, 1.2, 9]} fov={50} estrellas={false} respaldo={props.respaldo}>
      <Mundo {...props} />
    </Lienzo>
  );
}

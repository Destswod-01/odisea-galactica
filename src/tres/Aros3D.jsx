import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Tierra3D } from './PlanetasHD.jsx';
import NaveMision from '../nodriza/NaveMision.jsx';
import { ANGULO_ASCENSO, posicionAscenso, RADIO_TIERRA_ESCENA } from '../motor/entornoVuelo.js';

function Nubes() {
  const ref = useRef();
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < 42; i++) {
      o.position.set(
        (i % 7 - 3) * 33 + Math.sin(i * 3) * 12,
        50 + Math.floor(i / 7) * 22,
        -25 - Math.floor(i / 7) * 24
      );
      o.scale.set(25 + Math.sin(i) * 7, 4 + (i % 3), 16);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[null, null, 42]}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color="#f2f7ff" transparent opacity={0.42} depthWrite={false} roughness={1} />
    </instancedMesh>
  );
}

function PlumaFuego({ escala = 1, colorExterior = '#ff8c24', colorNucleo = '#fff8d6', y = 0, empuje = 1 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulso = 1 + Math.sin(clock.elapsedTime * 48) * 0.16;
    const e = escala * (0.55 + 0.45 * empuje);
    ref.current.scale.set(e, e * pulso, e);
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, -1.05, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.42, 2.5, 18, 1, true]} />
        <meshBasicMaterial
          color={colorExterior}
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.65, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 1.5, 14, 1, true]} />
        <meshBasicMaterial
          color={colorNucleo}
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function PropulsorSRB({ fuego, empuje = 1 }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.14, 0.15, 2.7, 14]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <coneGeometry args={[0.14, 0.36, 14]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.35} />
      </mesh>
      <mesh position={[0, -1.45, 0]}>
        <cylinderGeometry args={[0.09, 0.15, 0.22, 12]} />
        <meshStandardMaterial color="#2b3038" metalness={0.7} />
      </mesh>
      {fuego && <PlumaFuego escala={0.58} y={-1.55} colorExterior="#ffae42" empuje={empuje} />}
    </group>
  );
}

function NucleoPrimeraEtapa({ fuego, empuje = 1 }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.42, 0.44, 4.2, 32]} />
        <meshStandardMaterial color="#d9823b" metalness={0.45} roughness={0.38} />
      </mesh>
      {[-1.8, -0.7, 0.6, 1.75].map(y => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.445, 0.445, 0.07, 32]} />
          <meshStandardMaterial color="#e5e9ec" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0.43, 0, 0]}>
        <boxGeometry args={[0.05, 3.9, 0.08]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, -2.22, 0]}>
        <cylinderGeometry args={[0.28, 0.42, 0.28, 18]} />
        <meshStandardMaterial color="#333942" metalness={0.85} />
      </mesh>
      {fuego && <PlumaFuego escala={1.12} y={-2.35} empuje={empuje} />}
    </group>
  );
}

// Sistema denso de vapor criogénico en la base, nubes masivas de vapor/humo al despegar y columna de humo
function VaporPolvoYEstela({ simulacion, enCuenta, cuenta = 5, cohetePosRef }) {
  const TOTAL_VAPOR = 220;
  const TOTAL_BRASA = 70;
  const meshVaporRef = useRef();
  const meshBrasaRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 0..69: venteo criogénico denso saliendo del cohete, brazos umbilicales y base durante toda la cuenta (5..1)
  // 70..149: gran nube volumétrica de vapor/humo en la base y trinchera (se multiplica al encender motores y despegar)
  // 150..219: columna densa de humo y vapor bajo las toberas mientras el cohete despega lentamente y sube
  const particulasVapor = useMemo(
    () =>
      Array.from({ length: TOTAL_VAPOR }, (_, i) => {
        const enBase = i >= 35;
        return {
          x: (Math.random() - 0.5) * (enBase ? 2.2 : 0.6),
          y: enBase ? 3.2 + Math.random() * 0.9 : 4.2 + (i % 3) * 1.05,
          z: (Math.random() - 0.5) * (enBase ? 2.2 : 0.6),
          vx: (Math.random() - 0.5) * 1.4,
          vy: 0.35 + Math.random() * 0.55,
          vz: (Math.random() - 0.5) * 1.4,
          vida: i < 150 ? Math.random() * 0.9 : 0,
          escala: i < 70 ? 0.38 + Math.random() * 0.28 : 0.52 + Math.random() * 0.35,
          fase: i * 0.43,
        };
      }),
    []
  );

  const particulasBrasa = useMemo(
    () =>
      Array.from({ length: TOTAL_BRASA }, (_, i) => ({
        x: (Math.random() - 0.5) * 1.8,
        y: 3.2 + Math.random() * 0.6,
        z: (Math.random() - 0.5) * 1.8,
        vx: (Math.random() - 0.5) * 3.2,
        vy: 0.6 + Math.random() * 1.4,
        vz: (Math.random() - 0.5) * 3.2,
        vida: 0,
        escala: 0.55,
        fase: i * 0.61,
      })),
    []
  );

  const cursorEstela = useRef(150);

  useFrame(({ clock }, rawDt) => {
    if (!meshVaporRef.current || !meshBrasaRef.current) return;
    const dt = Math.min(0.05, rawDt);
    const t = clock.elapsedTime;
    const s = simulacion.current;
    const dist = s.distancia || 0;
    // El vapor y humo masivo se concentran en la plataforma y el despegue inicial (dist < 32);
    // al entrar al corredor de aros en el aire se disipa para no tapar la vista de los aros.
    const factorHumo = 1 - THREE.MathUtils.smoothstep(dist, 15, 32);
    const enRampaOCerca = factorHumo > 0.01;
    const fuegoActivo = (!enCuenta && s.tiempo > 0) || (enCuenta && cuenta <= 2);

    // 1. Venteo criogénico continuo en los costados del cohete, brazos y base (visible desde 5 hasta el despegue)
    for (let i = 0; i < 70; i++) {
      const p = particulasVapor[i];
      if (!enRampaOCerca) {
        p.vida = Math.max(0, p.vida - dt * 2.2);
      } else {
        p.vida -= dt * 0.62;
        if (p.vida <= 0) {
          const enBase = i >= 30;
          const nivelY = enBase ? -1.85 + Math.random() * 0.55 : [-0.7, 0.35, 1.55][i % 3];
          p.x = enBase ? (Math.random() - 0.5) * 1.5 : -0.42 + Math.sin(t + i) * 0.2;
          p.y = 5 + nivelY + (Math.random() - 0.5) * 0.25;
          p.z = (Math.random() - 0.5) * (enBase ? 1.5 : 0.45);
          p.vx = enBase ? (Math.random() - 0.5) * 1.8 : 0.65 + Math.random() * 0.75;
          p.vy = enBase ? 0.35 + Math.random() * 0.55 : -0.18 + Math.random() * 0.3;
          p.vz = (Math.random() - 0.5) * (enBase ? 1.8 : 0.85);
          p.vida = 0.8 + Math.random() * 0.65;
          p.escala = (enBase ? 0.45 + Math.random() * 0.38 : 0.3 + Math.random() * 0.26) * factorHumo;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.escala += dt * 0.65 * factorHumo;
        }
      }
    }

    // 2. Nube masiva de vapor y humo en la base de la plataforma (suave en 5..3, explosiva en 2..1 y en el despegue)
    for (let i = 70; i < 150; i++) {
      const p = particulasVapor[i];
      if (!enRampaOCerca) {
        p.vida = Math.max(0, p.vida - dt * 2.2);
      } else {
        p.vida -= dt * (fuegoActivo ? 0.55 : 0.42);
        if (p.vida <= 0) {
          const lado = i % 2 === 0 ? 1 : -1;
          const intensidad = fuegoActivo ? 1.55 : 0.48;
          p.x = (Math.random() - 0.5) * 2.1;
          p.y = 3.05 + Math.random() * 0.75;
          p.z = (Math.random() - 0.5) * 2.1;
          p.vx = lado * (1.5 + Math.random() * 4.4) * intensidad + (Math.random() - 0.5) * 1.6;
          p.vy = (0.6 + Math.random() * 2.5) * intensidad;
          p.vz = (Math.random() - 0.5) * 4.0 * intensidad;
          p.vida = 0.9 + Math.random() * 0.85;
          p.escala =
            (fuegoActivo ? 0.75 + Math.random() * 0.75 : 0.42 + Math.random() * 0.32) * factorHumo;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.escala += dt * (fuegoActivo ? 2.15 : 0.62) * factorHumo;
        }
      }
    }

    // 3. Columna espesa de humo y vapor bajo el cohete al despegar de la base (se apaga al entrar a los aros)
    if (fuegoActivo && enRampaOCerca) {
      for (let k = 0; k < 5; k++) {
        const idx = cursorEstela.current;
        cursorEstela.current = 150 + ((idx - 150 + 1) % (TOTAL_VAPOR - 150));
        const p = particulasVapor[idx];
        const cPos = cohetePosRef.current;
        p.x = cPos[0] + (Math.random() - 0.5) * 0.75;
        p.y = cPos[1] - 1.45 + (Math.random() - 0.5) * 0.4;
        p.z = cPos[2] + (Math.random() - 0.5) * 0.75;
        p.vx = (Math.random() - 0.5) * 1.6;
        p.vy = -1.4 - Math.random() * 1.6;
        p.vz = (Math.random() - 0.5) * 1.6;
        p.vida = 0.95 * factorHumo;
        p.escala = (0.72 + Math.random() * 0.38) * factorHumo;
      }
    }
    for (let i = 150; i < TOTAL_VAPOR; i++) {
      const p = particulasVapor[i];
      if (p.vida > 0) {
        p.vida = Math.max(0, p.vida - dt * (enRampaOCerca ? 0.55 : 2.4));
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.escala += dt * 1.45 * factorHumo;
      }
    }

    for (let i = 0; i < TOTAL_VAPOR; i++) {
      const p = particulasVapor[i];
      dummy.position.set(p.x, p.y, p.z);
      const sFinal = p.vida > 0 ? p.escala * Math.min(1, p.vida * 1.8) * factorHumo : 0.0001;
      dummy.scale.setScalar(sFinal);
      dummy.rotation.set(t * 0.2 + p.fase, t * 0.35 + p.fase, 0);
      dummy.updateMatrix();
      meshVaporRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshVaporRef.current.instanceMatrix.needsUpdate = true;

    // 4. Nube incandescente de ignición bajo las toberas y en el foso de llamas (solo en 2, 1 y el despegue inicial)
    const cPos = cohetePosRef.current;
    for (let i = 0; i < TOTAL_BRASA; i++) {
      const p = particulasBrasa[i];
      if (!fuegoActivo || !enRampaOCerca) {
        p.vida = Math.max(0, p.vida - dt * 2.4);
      } else {
        p.vida -= dt * 0.85;
        if (p.vida <= 0) {
          const enCola = i >= 40;
          const lado = i % 2 === 0 ? 1 : -1;
          p.x = (enCola ? cPos[0] : 0) + (Math.random() - 0.5) * (enCola ? 0.75 : 1.9);
          p.y = (enCola ? cPos[1] - 1.3 : 3.1) + (Math.random() - 0.5) * 0.5;
          p.z = (enCola ? cPos[2] : 0) + (Math.random() - 0.5) * (enCola ? 0.75 : 1.9);
          p.vx = enCola ? (Math.random() - 0.5) * 2.2 : lado * (2.0 + Math.random() * 4.5);
          p.vy = enCola ? -1.8 - Math.random() * 2.0 : 0.7 + Math.random() * 2.2;
          p.vz = (Math.random() - 0.5) * 3.2;
          p.vida = (0.65 + Math.random() * 0.55) * factorHumo;
          p.escala = (0.58 + Math.random() * 0.55) * factorHumo;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.escala += dt * 1.9 * factorHumo;
        }
      }
      dummy.position.set(p.x, p.y, p.z);
      const sFinal = p.vida > 0 ? p.escala * Math.min(1, p.vida * 2.0) * factorHumo : 0.0001;
      dummy.scale.setScalar(sFinal);
      dummy.rotation.set(0, t * 0.45 + p.fase, t * 0.25);
      dummy.updateMatrix();
      meshBrasaRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshBrasaRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshVaporRef} args={[null, null, TOTAL_VAPOR]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#cbd5e1"
          emissiveIntensity={0.38}
          transparent
          opacity={0.82}
          roughness={0.92}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh ref={meshBrasaRef} args={[null, null, TOTAL_BRASA]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#fed7aa"
          emissive="#f97316"
          emissiveIntensity={1.15}
          transparent
          opacity={0.76}
          roughness={0.85}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

// Complejo de Lanzamiento 41 de Cabo Cañaveral con mordazas de sujeción, brazos umbilicales y foso de llamas
function RampaCaboCanaveral({ enIgnicion, distancia }) {
  if (distancia > 220) return null;
  const suelto = Math.min(1, Math.max(0, distancia / 1.6));
  const anguloBrazo = suelto * 0.95;
  const anguloMordaza = suelto * 0.85;

  return (
    <group position={[0, 5, 0]}>
      {/* Explanada costera y pista de hormigón */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.4, 0]}>
        <circleGeometry args={[58, 48]} />
        <meshStandardMaterial color="#1e293b" roughness={0.95} />
      </mesh>

      {/* Estructura principal de la plataforma móvil (MLP) con pozo deflector */}
      <mesh position={[0, -2.55, 0]}>
        <boxGeometry args={[6.4, 1.1, 6.4]} />
        <meshStandardMaterial color="#475569" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Foso deflector de llamas (Flame Trench) bajo las toberas */}
      <mesh position={[0, -3.05, 0]}>
        <boxGeometry args={[8.8, 0.5, 2.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Anillo de soporte y colector de supresión de agua alrededor de la base del cohete */}
      <mesh position={[0, -1.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.92, 0.11, 12, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* 4 Mordazas hidráulicas de sujeción en la base (Hold-Down Clamps) */}
      {[0, 1, 2, 3].map(i => {
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <group
            key={i}
            position={[Math.cos(ang) * 0.82, -1.9, Math.sin(ang) * 0.82]}
            rotation={[0, -ang, 0]}
          >
            <mesh position={[0, -0.05, 0]}>
              <boxGeometry args={[0.36, 0.28, 0.26]} />
              <meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.4} />
            </mesh>
            <group position={[0, 0.08, 0]} rotation={[0, 0, -anguloMordaza]}>
              <mesh position={[-0.22, 0.12, 0]}>
                <boxGeometry args={[0.48, 0.12, 0.18]} />
                <meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.35} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* Torre umbilical de servicio con celosía metálica y 3 brazos de sujeción al cohete */}
      <group position={[-1.95, 0.45, -0.25]}>
        <mesh>
          <boxGeometry args={[0.95, 6.2, 0.95]} />
          <meshStandardMaterial color="#64748b" metalness={0.68} roughness={0.38} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[0, -2.6 + i * 0.78, 0]}>
            <boxGeometry args={[1.12, 0.08, 1.12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
          </mesh>
        ))}

        {[
          { y: -0.8, largo: 1.55, color: '#94a3b8' },
          { y: 0.75, largo: 1.55, color: '#cbd5e1' },
          { y: 2.05, largo: 1.48, color: '#e2e8f0' },
        ].map((brazo, idx) => (
          <group
            key={idx}
            position={[0.45, brazo.y, 0.25]}
            rotation={[0, anguloBrazo, anguloBrazo * 0.35]}
          >
            <mesh position={[brazo.largo / 2, 0, 0]}>
              <boxGeometry args={[brazo.largo, 0.14, 0.2]} />
              <meshStandardMaterial color={brazo.color} metalness={0.65} roughness={0.35} />
            </mesh>
            <mesh position={[brazo.largo, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.38, 0.045, 8, 20, Math.PI]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[brazo.largo * 0.55, -0.14, 0.08]} rotation={[0, 0, 0.15]}>
              <cylinderGeometry args={[0.035, 0.035, brazo.largo * 0.9, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Tanques esféricos criogénicos (LOX y LH2) */}
      {[-4.6, 4.6].map((x, i) => (
        <group key={i} position={[x, -2.4, -2.2]}>
          <mesh>
            <sphereGeometry args={[0.85, 20, 20]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.35} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.65, 0]}>
            <cylinderGeometry args={[0.55, 0.65, 0.8, 12]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
        </group>
      ))}

      {/* 4 Torres pararrayos perimetrales */}
      {[
        [-4.2, -3.2],
        [4.2, -3.2],
        [-4.2, 3.2],
        [4.2, 3.2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.2, z]}>
          <cylinderGeometry args={[0.06, 0.14, 9.5, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      <pointLight position={[3.5, 1.5, 3.5]} color="#e0f2fe" intensity={6} distance={18} />
      {enIgnicion && (
        <pointLight position={[0, -1.8, 0]} color="#fb923c" intensity={28} distance={30} />
      )}
    </group>
  );
}

function Mundo({
  simulacion,
  cfg,
  diseno,
  estetica,
  camaraModo = 'tercera',
  enCuenta = false,
  cuenta = 5,
}) {
  const aros = useRef([]);
  const estrellas = useRef();
  const coheteRef = useRef();
  const conoMaxQRef = useRef();
  const srbCaidosRef = useRef();
  const cofiaCaidaRef = useRef();
  const primeraCaidaRef = useRef();
  const cohetePosRef = useRef([0, 5, 0]);

  const sepTimers = useRef({ solidos: 0, cofia: 0, primera: 0 });
  const recorrido = useMemo(() => simulacion.current.ruta.map(a => [a.x, a.y, -a.z]), [simulacion]);
  const cielo = useMemo(() => new THREE.Color(), []);
  const oscuro = useMemo(() => new THREE.Color('#030817'), []);

  const solidosCount = simulacion.current.solidos ?? cfg.solidos ?? 0;
  const posSolidos = useMemo(
    () =>
      Array.from({ length: solidosCount }, (_, k) => {
        const a = (k / Math.max(1, solidosCount)) * Math.PI * 2 + 0.35;
        return [Math.cos(a) * 0.56, -0.55, Math.sin(a) * 0.56];
      }),
    [solidosCount]
  );

  useFrame(({ camera, scene, clock }, dt) => {
    const s = simulacion.current;
    const dist = s.distancia || 0;
    const posCorredor = posicionAscenso(s.x, s.y, dist);

    // En la base y durante los primeros metros lentos tras soltar las mordazas, el cohete sube verticalmente
    // entre el humo antes de inclinarse hacia el corredor de aros ya en el aire.
    const mezclaCorredor = THREE.MathUtils.smoothstep(dist, 5, 42);
    const posVertical = [s.x * mezclaCorredor, 5 + dist * 0.88, -dist * 0.12];
    const pos = [
      THREE.MathUtils.lerp(posVertical[0], posCorredor[0], mezclaCorredor),
      THREE.MathUtils.lerp(posVertical[1], posCorredor[1], mezclaCorredor),
      THREE.MathUtils.lerp(posVertical[2], posCorredor[2], mezclaCorredor),
    ];
    cohetePosRef.current = pos;

    const p = dist / (s.ruta.at(-1)?.z || 685);
    cielo.set('#6cb0d6').lerp(oscuro, Math.min(1, p * 1.75));
    scene.background = cielo;
    if (estrellas.current) estrellas.current.visible = p > 0.18;

    for (const clave of ['solidos', 'cofia', 'primera']) {
      if (s.caidos?.includes(clave)) {
        sepTimers.current[clave] = Math.min(12, sepTimers.current[clave] + dt);
      } else {
        sepTimers.current[clave] = 0;
      }
    }

    if (coheteRef.current) {
      coheteRef.current.position.set(...pos);
      const pitchCorredor =
        (ANGULO_ASCENSO - Math.PI / 2) * mezclaCorredor -
        (((s.inclinacion || 0) * Math.PI) / 180) * 0.22 * mezclaCorredor;
      const guiadoPitch = (s.vy || 0) * 0.028 * mezclaCorredor;
      const guiadoYaw = -(s.vx || 0) * 0.035 * mezclaCorredor;
      coheteRef.current.rotation.set(pitchCorredor + guiadoPitch, 0, guiadoYaw);
      coheteRef.current.visible = camaraModo !== 'primera';
    }

    // Animar desprendimiento de SRBs
    if (srbCaidosRef.current) {
      const t = sepTimers.current.solidos;
      srbCaidosRef.current.visible = t > 0 && t < 8;
      if (t > 0) {
        srbCaidosRef.current.children.forEach((hijo, k) => {
          const base = posSolidos[k] || [0.55, -0.55, 0];
          const dirX = Math.sign(base[0]) || 1;
          const dirZ = Math.sign(base[2]) || 1;
          hijo.position.set(
            base[0] + dirX * t * 1.9,
            base[1] - t * t * 2.6,
            base[2] + dirZ * t * 1.1
          );
          hijo.rotation.set(t * 1.4, t * 0.8, dirX * t * 1.8);
        });
      }
    }

    // Animar eyección de las dos mitades de la cofia
    if (cofiaCaidaRef.current) {
      const t = sepTimers.current.cofia;
      cofiaCaidaRef.current.visible = t > 0 && t < 8;
      if (t > 0) {
        cofiaCaidaRef.current.children.forEach((valva, idx) => {
          const signo = idx === 0 ? -1 : 1;
          valva.position.set(signo * (0.4 + t * 2.4), 3.6 - t * t * 1.8, -t * 1.2);
          valva.rotation.set(t * 0.9, 0, signo * t * 1.7);
        });
      }
    }

    // Animar caída de la primera etapa tras MECO
    if (primeraCaidaRef.current) {
      const t = sepTimers.current.primera;
      primeraCaidaRef.current.visible = t > 0 && t < 8;
      if (t > 0) {
        primeraCaidaRef.current.position.set(0, -t * 3.8, t * 0.9);
        primeraCaidaRef.current.rotation.set(t * 0.45, 0, t * 0.35);
      }
    }

    if (conoMaxQRef.current) {
      conoMaxQRef.current.visible = Boolean(s.enMaxQ);
      if (s.enMaxQ) {
        const sPulso = 1 + Math.sin(clock.elapsedTime * 28) * 0.1;
        conoMaxQRef.current.scale.set(sPulso, 1, sPulso);
      }
    }

    // Vibración de cámara: suave en 5..3, intensa en 2..1 y durante el despegue lento de la base
    const intensidadTemblor =
      enCuenta
        ? cuenta <= 2
          ? 0.095
          : 0.018
        : dist > 0 && dist < 35
        ? 0.075
        : s.enMaxQ
        ? 0.045 + (s.estres || 0) * 0.08
        : 0.01;
    const jx = Math.sin(clock.elapsedTime * 57) * 0.5 * intensidadTemblor;
    const jy = Math.cos(clock.elapsedTime * 63) * 0.5 * intensidadTemblor;

    if (camaraModo === 'primera' && !enCuenta) {
      camera.position.set(pos[0] + jx, pos[1] + jy, pos[2]);
      camera.rotation.set(ANGULO_ASCENSO, 0, 0);
    } else if (camaraModo === 'lateral' && !enCuenta) {
      camera.position.set(pos[0] + 8.5 + jx, pos[1] + 0.8 + jy, pos[2] + 5.5);
      camera.lookAt(pos[0], pos[1] + 0.8, pos[2]);
    } else {
      // En la cuenta regresiva (5..1) y el despegue inicial lento (dist < 14), la cámara enfoca de cerca
      // al cohete en su base sacando vapor y humo; ya en el aire pasa detrás del cohete a toda velocidad.
      const mezclaSeguimiento = THREE.MathUtils.smoothstep(dist, 12, 44);
      const rampaCam = [2.75, 4.35 + dist * 0.35, 7.1];
      const rampaMira = [0, 4.55 + dist * 0.72, 0];

      const vueloCam = posicionAscenso(s.x, s.y - 1.35, dist - 11.5);
      const vueloMira = posicionAscenso(s.x, s.y, dist + 28);

      camera.position.set(
        THREE.MathUtils.lerp(rampaCam[0], vueloCam[0], mezclaSeguimiento) + jx,
        THREE.MathUtils.lerp(rampaCam[1], vueloCam[1], mezclaSeguimiento) + jy,
        THREE.MathUtils.lerp(rampaCam[2], vueloCam[2], mezclaSeguimiento)
      );
      camera.lookAt(
        THREE.MathUtils.lerp(rampaMira[0], vueloMira[0], mezclaSeguimiento),
        THREE.MathUtils.lerp(rampaMira[1], vueloMira[1], mezclaSeguimiento),
        THREE.MathUtils.lerp(rampaMira[2], vueloMira[2], mezclaSeguimiento)
      );
    }

    aros.current.forEach((g, i) => {
      if (!g) return;
      const aro = s.ruta[i];
      g.visible = !enCuenta && aro.z > dist - 8;
      g.children[0].material.color.set(
        aro.resultado === true
          ? '#7affbb'
          : aro.resultado === false
          ? '#ff607e'
          : i === s.indice
          ? '#81fff1'
          : '#538ba9'
      );
      g.children[1].rotation.z = s.tiempo * 0.25;
    });
  });

  const s = simulacion.current;
  const soltoSolidos = s.caidos?.includes('solidos');
  const soltoCofia = s.caidos?.includes('cofia');
  const soltoPrimera = s.caidos?.includes('primera');
  // En 5, 4, 3 el cohete saca vapor en su base; en 2, 1 se encienden los motores y el humo antes de despegar
  const fuegoEncendido = (!enCuenta && s.tiempo > 0) || (enCuenta && cuenta <= 2);

  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[100, 120, 60]} intensity={3.2} />
      <hemisphereLight args={['#bfe0ff', '#1e293b', 0.65]} />
      <group ref={estrellas}>
        <Stars radius={1800} depth={600} count={1700} factor={3} saturation={0} fade speed={0} />
      </group>
      <Suspense fallback={null}>
        <Tierra3D position={[0, -RADIO_TIERRA_ESCENA, 0]} radio={RADIO_TIERRA_ESCENA} />
      </Suspense>
      <Nubes />

      <RampaCaboCanaveral enIgnicion={fuegoEncendido && s.distancia < 55} distancia={s.distancia} />
      <VaporPolvoYEstela
        simulacion={simulacion}
        enCuenta={enCuenta}
        cuenta={cuenta}
        cohetePosRef={cohetePosRef}
      />

      <group ref={coheteRef} position={[0, 5, 0]} scale={0.62}>
        {!soltoPrimera && (
          <NucleoPrimeraEtapa fuego={fuegoEncendido} empuje={s.empuje ?? 1} />
        )}

        {!soltoSolidos &&
          posSolidos.map((p, k) => (
            <group key={k} position={p}>
              <PropulsorSRB
                fuego={fuegoEncendido && (s.progreso || 0) < 0.34}
                empuje={s.empuje ?? 1}
              />
            </group>
          ))}

        <group position={[0, 2.75, 0]}>
          <mesh>
            <cylinderGeometry args={[0.4, 0.42, 1.35, 28]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.35} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.78, 0]}>
            <cylinderGeometry args={[0.14, 0.26, 0.3, 18]} />
            <meshStandardMaterial color="#334155" metalness={0.85} />
          </mesh>
          {soltoPrimera && !s.terminado && (
            <PlumaFuego
              escala={0.72}
              y={-0.9}
              colorExterior="#38bdf8"
              colorNucleo="#e0f2fe"
              empuje={s.empuje ?? 1}
            />
          )}
        </group>

        {diseno && (
          <group position={[0, 3.85, 0]} scale={0.28}>
            <Suspense fallback={null}>
              <NaveMision
                diseno={diseno}
                estetica={estetica}
                despliegue={0}
                motor={false}
                girar={false}
              />
            </Suspense>
          </group>
        )}

        {!soltoCofia && (
          <group position={[0, 4.1, 0]}>
            <mesh>
              <cylinderGeometry args={[0.48, 0.42, 1.35, 28]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.28} metalness={0.2} />
            </mesh>
            <mesh position={[0, 1.12, 0]}>
              <coneGeometry args={[0.48, 0.95, 28]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.28} metalness={0.2} />
            </mesh>
          </group>
        )}

        <group ref={conoMaxQRef} position={[0, 2.2, 0]} visible={false}>
          <mesh>
            <coneGeometry args={[1.45, 2.2, 32, 1, true]} />
            <meshBasicMaterial
              color={(s.estres || 0) > 0.65 ? '#fb923c' : '#bae6fd'}
              transparent
              opacity={0.32}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1.55, 32]} />
            <meshBasicMaterial
              color="#e0f2fe"
              transparent
              opacity={0.38}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>

        <group ref={srbCaidosRef} visible={false}>
          {posSolidos.map((p, k) => (
            <group key={k} position={p}>
              <PropulsorSRB fuego={false} />
            </group>
          ))}
        </group>

        <group ref={cofiaCaidaRef} visible={false}>
          {[-1, 1].map(lado => (
            <group key={lado}>
              <mesh>
                <cylinderGeometry
                  args={[0.48, 0.48, 1.6, 20, 1, false, lado > 0 ? 0 : Math.PI, Math.PI]}
                />
                <meshStandardMaterial color="#f1f5f9" side={THREE.DoubleSide} metalness={0.3} />
              </mesh>
            </group>
          ))}
        </group>

        <group ref={primeraCaidaRef} visible={false}>
          <NucleoPrimeraEtapa fuego={false} />
        </group>
      </group>

      {/* Corredor de aros de guiado (oculto durante la cuenta regresiva para admirar el cohete en su base) */}
      <group rotation={[ANGULO_ASCENSO, 0, 0]} position={[0, 5, 0]} visible={!enCuenta}>
        <Line
          points={recorrido}
          color="#80d9e6"
          lineWidth={1}
          transparent
          opacity={0.3}
          dashed
          dashSize={2}
          gapSize={4}
        />
        {simulacion.current.ruta.map((a, i) => (
          <group key={i} ref={g => { aros.current[i] = g; }} position={[a.x, a.y, -a.z]}>
            <mesh>
              <torusGeometry args={[cfg.radio, 0.065, 8, 80]} />
              <meshBasicMaterial color="#81fff1" toneMapped={false} />
            </mesh>
            <group>
              {[0, 1, 2, 3].map(k => (
                <mesh
                  key={k}
                  position={[
                    Math.cos((k * Math.PI) / 2) * (cfg.radio + 0.35),
                    Math.sin((k * Math.PI) / 2) * (cfg.radio + 0.35),
                    0,
                  ]}
                  rotation={[0, 0, (k * Math.PI) / 2]}
                >
                  <boxGeometry args={[0.35, 0.13, 0.08]} />
                  <meshBasicMaterial color="#e0fff7" />
                </mesh>
              ))}
            </group>
            <mesh>
              <torusGeometry args={[cfg.radio + 0.17, 0.018, 6, 80]} />
              <meshBasicMaterial color="#a0e5f5" transparent opacity={0.35} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

export default function Aros3D({
  simulacion,
  cfg,
  diseno,
  estetica,
  camaraModo = 'tercera',
  enCuenta = false,
  cuenta = 5,
  alListo,
}) {
  return (
    <Canvas
      camera={{ fov: 64, near: 0.1, far: 3000 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={alListo}
    >
      <Mundo
        simulacion={simulacion}
        cfg={cfg}
        diseno={diseno}
        estetica={estetica}
        camaraModo={camaraModo}
        enCuenta={enCuenta}
        cuenta={cuenta}
      />
    </Canvas>
  );
}

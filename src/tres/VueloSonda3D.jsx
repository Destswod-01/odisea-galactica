import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import NaveEstudio from './NaveEstudio.jsx';
import { Tierra3D } from './PlanetasHD.jsx';
import Estudio from './Estudio.jsx';
import { progresoSeparacion } from '../motor/entornoVuelo.js';

function EtapaSuperior() {
  return (
    <group>
      {/* Tanque criogénico Centaur */}
      <mesh>
        <cylinderGeometry args={[0.76, 0.76, 2.6, 40]} />
        <meshStandardMaterial color="#e7e9e5" metalness={0.6} roughness={0.3} />
      </mesh>
      {[-1.15, 0.85, 1.18].map(y => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.775, 0.775, 0.1, 40]} />
          <meshStandardMaterial color="#556b7b" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      {/* Adaptador cónico de carga útil y anillo expulsor con resortes */}
      <mesh position={[0, 1.52, 0]}>
        <cylinderGeometry args={[0.64, 0.76, 0.46, 40]} />
        <meshStandardMaterial color="#a7a58a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.76, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.05, 10, 36]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Tobera RL10 inferior */}
      <mesh position={[0, -1.65, 0]}>
        <cylinderGeometry args={[0.2, 0.44, 0.7, 32, 1, true]} />
        <meshStandardMaterial color="#354352" metalness={0.9} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Un cuarto (90°) de la punta del cohete (cofia cuádruple).
// Cuando aperturaRef.current === 0, los 4 pétalos forman un cono/cilindro 100% cerrado.
// Al activarse el Paso 1, giran sobre sus bisagras abriéndose en 4 partes y luego se desprenden.
function PetaloCofia({ indice, aperturaRef }) {
  const pivoteRef = useRef();
  const anguloY = (indice * Math.PI) / 2;
  const rBase = 0.92;
  const altoCilindro = 1.85;
  const altoCono = 1.45;

  useFrame(() => {
    if (!pivoteRef.current) return;
    const a = aperturaRef.current; // 0 = completamente cerrada, 1 = abierta en 4 partes y liberada
    // Primero se abre sobre sus bisagras (0 -> 0.68 del progreso) hasta ~82 grados,
    // y en el tramo final (0.68 -> 1) se separa flotando hacia el exterior
    const bisagra = THREE.MathUtils.smoothstep(a, 0, 0.68);
    const desprendimiento = THREE.MathUtils.smoothstep(a, 0.68, 1.0);

    const rotApertura = bisagra * 1.42 + desprendimiento * 0.55;
    pivoteRef.current.rotation.x = rotApertura;
    pivoteRef.current.position.set(
      0,
      -desprendimiento * 1.1,
      rBase + desprendimiento * 2.8
    );
  });

  return (
    <group rotation={[0, anguloY, 0]}>
      <group ref={pivoteRef} position={[0, 0, rBase]}>
        <group position={[0, 0, -rBase]}>
          {/* Pared cilíndrica exterior del cuarto de cofia (90° = PI/2) */}
          <mesh position={[0, altoCilindro / 2, 0]}>
            <cylinderGeometry
              args={[rBase, rBase, altoCilindro, 24, 1, true, -Math.PI / 4, Math.PI / 2]}
            />
            <meshStandardMaterial
              color="#f4f7fb"
              metalness={0.3}
              roughness={0.28}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Revestimiento acústico/térmico interior dorado */}
          <mesh position={[0, altoCilindro / 2, 0]}>
            <cylinderGeometry
              args={[
                rBase * 0.96,
                rBase * 0.96,
                altoCilindro * 0.96,
                18,
                1,
                true,
                -Math.PI / 4 + 0.03,
                Math.PI / 2 - 0.06,
              ]}
            />
            <meshStandardMaterial
              color="#c89d54"
              metalness={0.65}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Punta cónica superior del cuarto de cofia (90° = PI/2) */}
          <mesh position={[0, altoCilindro + altoCono / 2, 0]}>
            <cylinderGeometry
              args={[0.02, rBase, altoCono, 24, 1, true, -Math.PI / 4, Math.PI / 2]}
            />
            <meshStandardMaterial
              color="#f8fafc"
              metalness={0.3}
              roughness={0.26}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Interior dorado de la punta cónica */}
          <mesh position={[0, altoCilindro + altoCono / 2, 0]}>
            <cylinderGeometry
              args={[
                0.02,
                rBase * 0.96,
                altoCono * 0.96,
                18,
                1,
                true,
                -Math.PI / 4 + 0.03,
                Math.PI / 2 - 0.06,
              ]}
            />
            <meshStandardMaterial
              color="#b78a42"
              metalness={0.6}
              roughness={0.42}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Línea de junta pirotécnica longitudinal en el borde de cada pétalo */}
          <mesh
            position={[
              Math.sin(Math.PI / 4) * (rBase + 0.01),
              altoCilindro / 2,
              Math.cos(Math.PI / 4) * (rBase + 0.01),
            ]}
          >
            <boxGeometry args={[0.025, altoCilindro, 0.025]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Anillo de cierre pirotécnico inferior */}
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry
              args={[rBase + 0.015, rBase + 0.015, 0.12, 20, 1, true, -Math.PI / 4, Math.PI / 2]}
            />
            <meshStandardMaterial
              color="#475569"
              metalness={0.75}
              roughness={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// Líneas de velocidad orbital sobre el ecuador para sentir los 28 400 km/h alrededor de la Tierra
function LineasVelocidadEcuatorial({ turbo = false }) {
  const N = 36;
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const trazos = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        x: ((i * 7.3) % 36) - 18,
        y: -2.8 + ((i * 3.1) % 8.5),
        z: -6 + ((i * 2.7) % 9),
        largo: 1.4 + (i % 4) * 0.75,
        vel: 9 + (i % 5) * 2.5,
      })),
    []
  );

  useFrame((_, dt) => {
    if (!ref.current) return;
    const mult = turbo ? 2.8 : 1;
    trazos.forEach((tr, i) => {
      tr.x -= tr.vel * mult * dt;
      if (tr.x < -18) tr.x = 18;
      dummy.position.set(tr.x, tr.y, tr.z);
      dummy.scale.set(tr.largo * (turbo ? 1.8 : 1), 0.018, 0.018);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, N]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#bae6fd"
        transparent
        opacity={0.32}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// Planeta destino visible en el horizonte hacia el que sale disparada la sonda al terminar
function PlanetaDestinoHorizonte({ esJuno }) {
  return (
    <group position={[26, 4.5, -22]}>
      <mesh>
        <sphereGeometry args={[esJuno ? 2.1 : 1.35, 32, 32]} />
        <meshStandardMaterial
          color={esJuno ? '#d99b66' : '#cbd5e1'}
          emissive={esJuno ? '#9a5b25' : '#475569'}
          emissiveIntensity={0.35}
          roughness={0.7}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[esJuno ? 2.65 : 1.75, 24, 24]} />
        <meshBasicMaterial
          color={esJuno ? '#fdba74' : '#e2e8f0'}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Escena({
  mision,
  diseno,
  estetica,
  separacion,
  reloj,
  activados = [],
  activa,
  perdido,
  cofiaAbierta = false,
  combustibleSeparado = false,
  propulsoresActivos = false,
  instrumentosActivos = false,
  focoCamara = 'general',
  progresoPaso = 0,
}) {
  const nave = useRef();
  const etapa = useRef();
  const tierraGrupo = useRef();
  const halo = useRef();
  const ondaAntena = useRef();
  const destelloMotorRef = useRef();
  const aperturaCofiaRef = useRef(0);
  const progresoExpulsionRef = useRef(0);
  const disparoSalidaRef = useRef(0);
  const camPosActual = useRef(new THREE.Vector3(0.6, 2.6, 9.2));
  const camMiraActual = useRef(new THREE.Vector3(0.2, 0.65, 0));
  const { size } = useThree();

  useFrame(({ camera, clock }, dt) => {
    const movil = size.width / size.height < 0.9;
    const t = clock.elapsedTime;

    // 1. La Tierra gira por su ecuador de oeste a este debajo de la nave con velocidad orbital viva
    if (tierraGrupo.current) {
      tierraGrupo.current.rotation.z = -0.12;
      tierraGrupo.current.rotation.x = 0.22;
      tierraGrupo.current.rotation.y -= dt * (focoCamara === 'salida' ? 0.55 : 0.24);
    }

    // 2. Apertura progresiva de las 4 partes de la punta del cohete:
    // Antes de pulsar el Paso 1 (cofiaAbierta === false), metaCofia es estrictamente 0 (100% cerrada).
    // Al pulsar el Paso 1, se abre siguiendo progresoPaso de 0 a 1.
    const metaCofia = !separacion
      ? 1
      : !cofiaAbierta
      ? 0
      : focoCamara === 'cofia4'
      ? Math.min(1, progresoPaso)
      : 1;
    aperturaCofiaRef.current = THREE.MathUtils.damp(aperturaCofiaRef.current, metaCofia, 4.0, dt);
    const apCofia = aperturaCofiaRef.current;

    // 3. Expulsión horizontal de la sonda fuera del compartimento abierto (Paso 2):
    // Mientras está en el Paso 1, pExpulsion es 0 y la sonda permanece guardada dentro de las 4 valvas.
    let pExpulsion;
    if (separacion && reloj?.current !== undefined && combustibleSeparado === 'auto') {
      pExpulsion = progresoSeparacion(reloj.current);
    } else if (separacion) {
      const metaExp = !combustibleSeparado
        ? 0
        : focoCamara === 'expulsar'
        ? Math.min(1, progresoPaso)
        : 1;
      progresoExpulsionRef.current = THREE.MathUtils.damp(
        progresoExpulsionRef.current,
        metaExp,
        2.6,
        dt
      );
      pExpulsion = progresoExpulsionRef.current;
    } else {
      pExpulsion = 1;
    }

    // 4. Cuando termina el paso 5 ('salida' o final de 'propulsores'), la sonda sale disparada hacia el planeta destino
    const enDisparo =
      separacion && (focoCamara === 'salida' || (focoCamara === 'propulsores' && progresoPaso > 0.68));
    if (enDisparo) {
      disparoSalidaRef.current = Math.min(
        28,
        disparoSalidaRef.current + dt * (6 + disparoSalidaRef.current * 2.4)
      );
    } else {
      disparoSalidaRef.current = THREE.MathUtils.damp(disparoSalidaRef.current, 0, 4, dt);
    }
    const dSalida = disparoSalidaRef.current;

    const balanceoOrbital = Math.sin(t * 2.1) * 0.12;

    if (etapa.current && separacion) {
      // En el Paso 1 (pExpulsion = 0), la etapa Centaur + la punta de 4 partes cerrada están en primer plano
      // orbitando horizontalmente (-PI/2 en Z). La base de los 4 pétalos queda en x = -1.25 + 1.52 = +0.27,
      // y los pétalos cerrados cubren desde x = +0.27 hasta la punta en x = +3.57.
      etapa.current.position.set(
        -1.25 - pExpulsion * 4.6 - dSalida * 2.5,
        0.65 + balanceoOrbital - pExpulsion * 1.1,
        -pExpulsion * 0.8
      );
      etapa.current.rotation.set(0, 0, -Math.PI / 2 - pExpulsion * 0.22);
    }

    if (nave.current) {
      if (separacion) {
        // Mientras las 4 partes de la cofia están cerradas (apCofia < 0.03), la sonda está oculta/compacta
        // exactamente dentro del cilindro de la cofia (x = 1.22, escala = 0.36) para que no sobresalga nada.
        // Al abrirse los 4 pétalos se ve adentro sobre el adaptador, y en el Paso 2 sale expulsada hacia adelante
        // creciendo suavemente a su escala real (0.82).
        nave.current.visible = apCofia > 0.02 || pExpulsion > 0.01;
        const escalaInterna = 0.38 + Math.min(1, apCofia * 0.5) * 0.14;
        const escalaDinamica = THREE.MathUtils.lerp(escalaInterna, 0.82, pExpulsion);
        nave.current.scale.setScalar(escalaDinamica);

        nave.current.position.set(
          1.22 + pExpulsion * 0.65 + dSalida * 1.35,
          0.65 + balanceoOrbital + dSalida * 0.24,
          -dSalida * 0.95
        );

        const inclinacionHorizontal = THREE.MathUtils.lerp(-Math.PI / 2, -0.22, pExpulsion);
        const inclinacionDisparo = enDisparo ? -0.95 : inclinacionHorizontal;
        nave.current.rotation.z = THREE.MathUtils.damp(
          nave.current.rotation.z,
          inclinacionDisparo,
          3.5,
          dt
        );
        nave.current.rotation.y =
          focoCamara === 'paneles' || focoCamara === 'antena'
            ? THREE.MathUtils.damp(nave.current.rotation.y, 0.35, 3, dt)
            : -0.3 + pExpulsion * Math.sin(t * 0.65) * 0.25;
      } else {
        nave.current.visible = true;
        nave.current.scale.setScalar(0.8);
        nave.current.position.set(0, 0, 0);
        nave.current.rotation.set(0, -0.3, 0);
      }
    }

    // 5. Cámara cinemática: se acerca (zoom in) a cada parte cuando se está desplegando
    if (separacion) {
      const posNave = nave.current ? nave.current.position : new THREE.Vector3(1.22, 0.65, 0);
      let objetivoCam = new THREE.Vector3(movil ? 3.2 : 1.6, movil ? 3.8 : 2.6, movil ? 12.2 : 8.8);
      let objetivoMira = new THREE.Vector3(0.7, 0.65, 0);

      if (focoCamara === 'cofia4') {
        // Zoom directo a la punta cerrada del cohete viendo cómo se abren las 4 partes como pétalos
        objetivoCam.set(2.4, 1.85, movil ? 7.6 : 5.4);
        objetivoMira.set(1.35, 0.65, 0);
      } else if (focoCamara === 'expulsar') {
        // Encuadre cercano al compartimiento abierto viendo salir la navecita hacia la órbita ecuatorial
        objetivoCam.set(1.5, 1.8, movil ? 8.4 : 6.1);
        objetivoMira.set(posNave.x * 0.85, 0.65, 0);
      } else if (focoCamara === 'paneles') {
        // Zoom cercano a las alas solares desplegándose y captando energía
        objetivoCam.set(posNave.x + 1.25, posNave.y + 1.6, movil ? 6.2 : 4.3);
        objetivoMira.set(posNave.x, posNave.y - 0.05, 0);
      } else if (focoCamara === 'antena') {
        // Zoom cercano al plato de la antena y sensores en la parte superior
        objetivoCam.set(posNave.x - 1.05, posNave.y + 1.35, movil ? 5.8 : 4.05);
        objetivoMira.set(posNave.x, posNave.y + 0.45, 0);
      } else if (focoCamara === 'propulsores' || focoCamara === 'salida') {
        // Plano épico detrás de la tobera mirando hacia el planeta destino mientras enciende y sale disparada
        objetivoCam.set(1.5 - Math.min(2.5, dSalida * 0.15), 1.65, movil ? 8.2 : 5.8);
        objetivoMira.set(posNave.x + 1.5, posNave.y + 0.2, posNave.z - 0.6);
      }

      camPosActual.current.lerp(objetivoCam, Math.min(1, dt * 3.4));
      camMiraActual.current.lerp(objetivoMira, Math.min(1, dt * 4.2));
      camera.position.copy(camPosActual.current);
      camera.lookAt(camMiraActual.current);
    } else {
      camera.position.set(movil ? 13 : 9, movil ? 8 : 6, movil ? 20 : 14);
      camera.lookAt(0, 0.6, 0);
    }

    if (destelloMotorRef.current) {
      const sLlama = 1 + Math.sin(t * 45) * 0.18 + (enDisparo ? 0.65 : 0);
      destelloMotorRef.current.scale.set(sLlama, sLlama * (enDisparo ? 1.8 : 1.1), sLlama);
    }

    if (halo.current) {
      halo.current.rotation.z = (reloj?.current || t) * 0.3;
    }
    if (ondaAntena.current) {
      const pulso = (t * 1.6) % 1;
      ondaAntena.current.scale.setScalar(1 + pulso * 2.6);
      ondaAntena.current.material.opacity = (1 - pulso) * 0.65;
    }
  });

  const panelesListos = activados.includes(0);
  const antenaLista = activados.includes(1);
  const rastreadoresListos = activados.includes(2) || propulsoresActivos || instrumentosActivos;
  const esJuno = mision?.id === 'juno';

  return (
    <>
      <color attach="background" args={['#030918']} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[6, 10, 8]} intensity={3} />
      <pointLight position={[-5, 2, -2]} color="#79bdf2" intensity={35} />
      <Estudio />
      <Stars radius={90} depth={100} count={1200} factor={2.2} fade speed={0.8} />

      {separacion && (
        <>
          <LineasVelocidadEcuatorial turbo={focoCamara === 'salida' || propulsoresActivos} />
          <PlanetaDestinoHorizonte esJuno={esJuno} />
        </>
      )}

      <Suspense fallback={null}>
        <group
          ref={tierraGrupo}
          position={separacion ? [0, -24.2, -9] : [-4, -29, -15]}
        >
          <Tierra3D radio={23} position={[0, 0, 0]} />
          {separacion && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[24.8, 0.035, 8, 128]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
            </mesh>
          )}
        </group>
      </Suspense>

      {/* Sonda espacial guardada dentro de las 4 partes cerradas y expulsada en el Paso 2 */}
      <group ref={nave}>
        <NaveEstudio
          diseno={diseno}
          estetica={estetica}
          girar={false}
          scale={1}
          motor={propulsoresActivos}
          despliegue={panelesListos ? 1 : 0}
          orientacionAntena={antenaLista ? -0.45 : 0}
          rastreadores={rastreadoresListos}
        />
        {antenaLista && separacion && (
          <mesh ref={ondaAntena} position={[0, 1.65, 0]} rotation={[Math.PI / 3, 0, 0]}>
            <ringGeometry args={[0.35, 0.46, 32]} />
            <meshBasicMaterial color="#ffcb79" transparent opacity={0.55} side={THREE.DoubleSide} />
          </mesh>
        )}
        {propulsoresActivos && separacion && (
          <group ref={destelloMotorRef} position={[0, -1.35, 0]}>
            <mesh position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.42, 2.4, 20, 1, true]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent
                opacity={0.75}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <pointLight color="#38bdf8" intensity={16} distance={10} />
          </group>
        )}
      </group>

      {/* Etapa superior Centaur + Punta del cohete cerrada en 4 partes sobre la órbita ecuatorial */}
      {separacion && (
        <group ref={etapa}>
          <EtapaSuperior />
          <group position={[0, 1.52, 0]}>
            {[0, 1, 2, 3].map(idx => (
              <PetaloCofia key={idx} indice={idx} aperturaRef={aperturaCofiaRef} />
            ))}
          </group>
        </group>
      )}

      {!separacion && (
        <group ref={halo} position={[0, 0, -1]}>
          <mesh>
            <torusGeometry args={[4.8, 0.012, 6, 96]} />
            <meshBasicMaterial
              color={perdido ? '#ff687a' : ['#8bf4dd', '#ffcb79', '#bba9ff'][activa] || '#517b98'}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      )}
    </>
  );
}

export default function VueloSonda3D({ alListo, ...props }) {
  return (
    <Canvas
      camera={{ position: [1.6, 2.6, 8.8], fov: 42, near: 0.1, far: 400 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={alListo}
    >
      <Escena {...props} />
    </Canvas>
  );
}

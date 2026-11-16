// Generador 3D de Campos de Terreno y Superficies Planetarias (Tierra Firme y Exploración).
// Cubre los 6 biomas de las Filas 2, 3 y 5 de la imagen de referencia con texturas de micro-relieve:
// 1. Valle Lunar (con Tierra en el horizonte)
// 2. Desierto y Cañones de Marte
// 3. Llanura Helada y Agujas de Hielo de Europa
// 4. Mundo Volcánico con Ríos de Lava (Ío)
// 5. Ciclones y Vórtices de Nubes de Júpiter
// 6. Superficie de Asteroide con Impacto Cinético / Explosión (Misión DART)
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import Nodriza3D from '../nodriza/Nodriza3D.jsx';
import PlanetaNasaHD from './PlanetasNasaHD.jsx';
import { DestelloSolar3D } from './DespegueAtmosferico3D.jsx';

/* ───────────── Textura Procedural de Detalle Superficial y Micro-Relieve (Bump/Color) ───────────── */
const cacheTexTerreno = {};
function texturaSuperficieBioma(biomaId, colorBase, colorSecundario, colorHorizonte) {
  if (cacheTexTerreno[biomaId]) return cacheTexTerreno[biomaId];
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');

  g.fillStyle = colorBase;
  g.fillRect(0, 0, 512, 512);

  // Grano geológico, estratos y micro-cráteres
  for (let i = 0; i < 900; i++) {
    const x = (i * 7919) % 512;
    const y = (i * 104729) % 512;
    const r = 1.5 + (i % 14);
    g.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Grietas de hielo (Europa), venas de lava (Volcánico) o estratos de cañón (Marte)
  g.strokeStyle =
    biomaId === 'terreno_volcanico'
      ? colorHorizonte
      : biomaId === 'terreno_europa'
      ? '#38bdf8'
      : colorSecundario;

  for (let k = 0; k < 55; k++) {
    g.beginPath();
    let x = (k * 97) % 512;
    let y = (k * 193) % 512;
    g.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += Math.cos(k + s) * 45;
      y += Math.sin(k * 0.8 + s) * 35;
      g.lineTo(x, y);
    }
    g.lineWidth = biomaId === 'terreno_nubes_jupiter' ? 6 : 2;
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  cacheTexTerreno[biomaId] = t;
  return t;
}

/* ───────────── Función Matemática de Elevación Topográfica (DEM por Bioma) ───────────── */
function alturaTerreno(x, z, biomaId) {
  const distCentro = Math.hypot(x, z - 1.2);
  const mascaraCentro = Math.min(1, Math.max(0, (distCentro - 2.0) / 3.5));

  if (biomaId === 'terreno_luna') {
    const anilloCrater = Math.exp(-Math.pow(distCentro - 7.5, 2) / 5.5) * 2.8;
    const montanasFondo =
      z < -3.5 ? Math.pow(Math.abs(z + 3.5) * 0.22, 1.35) * (0.65 + 0.35 * Math.sin(x * 0.45)) : 0;
    const rugosidad =
      Math.sin(x * 0.55) * Math.cos(z * 0.48) * 0.48 +
      Math.sin(x * 1.4 + z * 1.1) * 0.16;
    return (anilloCrater + montanasFondo + rugosidad) * mascaraCentro - 1.85;
  }

  if (biomaId === 'terreno_marte') {
    const dunas = Math.sin(x * 0.8 + Math.sin(z * 0.35) * 1.6) * 0.38;
    const mesetas = Math.abs(x) > 3.2 ? Math.floor((Math.abs(x) - 2.6) * 0.9) * 0.85 : 0;
    const cordillera = z < -4 ? Math.min(4.8, Math.abs(z + 4) * 0.45) : 0;
    return (dunas + mesetas + cordillera) * mascaraCentro - 1.85;
  }

  if (biomaId === 'terreno_europa') {
    const surcos = Math.abs(Math.sin(x * 0.65 + z * 0.42)) * 0.72;
    const crestas = Math.abs(x) > 4.2 ? (Math.abs(x) - 4.2) * 0.55 : 0;
    return (surcos + crestas) * mascaraCentro - 1.92;
  }

  if (biomaId === 'terreno_volcanico') {
    const canalLava = Math.sin(z * 0.32) * 1.6;
    const distCanal = Math.abs(x - canalLava);
    const riberas = distCanal < 1.5 ? -0.42 : Math.min(3.8, (distCanal - 1.5) * 0.58);
    const colinas = Math.sin(x * 0.6) * Math.cos(z * 0.5) * 0.55;
    return riberas + colinas * mascaraCentro - 1.75;
  }

  if (biomaId === 'terreno_nubes_jupiter') {
    const ang = Math.atan2(z, x);
    const espiral = Math.sin(distCentro * 0.85 - ang * 2.0) * 0.52;
    const ojo = distCentro < 3.0 ? -(3.0 - distCentro) * 0.45 : 0;
    return espiral + ojo - 1.8;
  }

  // terreno_asteroide_impacto
  const crater = distCentro < 3.8 ? -Math.cos((distCentro / 3.8) * (Math.PI / 2)) * 1.45 : 0;
  const borde = Math.exp(-Math.pow(distCentro - 4.2, 2) / 2.8) * 1.55;
  const irregular = Math.sin(x * 0.6) * Math.cos(z * 0.55) * 0.42;
  return crater + borde + irregular - 1.85;
}

/* ───────────── Malla de Terreno 3D con Textura de Relieve y Color por Altitud ───────────── */
function MallaTerrenoBioma({ bioma }) {
  const texSuperficie = useMemo(
    () =>
      texturaSuperficieBioma(
        bioma.id,
        bioma.color_suelo,
        bioma.color_secundario,
        bioma.color_horizonte
      ),
    [bioma]
  );

  const geoTerreno = useMemo(() => {
    const geo = new THREE.PlaneGeometry(52, 52, 128, 128);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colores = new Float32Array(pos.count * 3);

    const cBajo = new THREE.Color(bioma.color_secundario);
    const cAlto = new THREE.Color(bioma.color_suelo);
    const cBrillo = new THREE.Color(bioma.color_horizonte);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = alturaTerreno(x, z, bioma.id);
      pos.setY(i, y);

      const tAlt = Math.max(0, Math.min(1, (y + 2.3) / 3.8));
      tmp.copy(cBajo).lerp(cAlto, tAlt);
      if (bioma.id === 'terreno_volcanico' && y < -1.85) {
        tmp.copy(cBrillo);
      } else if (bioma.id === 'terreno_europa' && tAlt < 0.25) {
        tmp.copy(cBrillo);
      }
      colores[i * 3] = tmp.r;
      colores[i * 3 + 1] = tmp.g;
      colores[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geo.computeVertexNormals();
    return geo;
  }, [bioma]);

  useEffect(() => () => geoTerreno.dispose(), [geoTerreno]);

  return (
    <mesh geometry={geoTerreno} receiveShadow castShadow>
      <meshStandardMaterial
        map={texSuperficie}
        bumpMap={texSuperficie}
        bumpScale={0.12}
        vertexColors
        roughness={bioma.id === 'terreno_europa' ? 0.25 : 0.86}
        metalness={bioma.id === 'terreno_europa' ? 0.35 : 0.14}
      />
    </mesh>
  );
}

/* ───────────── Rocas, Cantos Rodados y Agujas de Hielo Instanciadas ───────────── */
function RocasYFormaciones3D({ bioma }) {
  const instRef = useRef();
  const agujasRef = useRef();

  const datosRocas = useMemo(() => {
    const N = 130;
    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const esc = new THREE.Vector3();
    const euler = new THREE.Euler();

    return Array.from({ length: N }, (_, i) => {
      const ang = (i * 2.39996) % (Math.PI * 2);
      const r = 2.6 + ((i * 29) % 100) * 0.18;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = alturaTerreno(x, z, bioma.id);
      const s = 0.12 + (i % 6) * 0.065;
      pos.set(x, y + s * 0.3, z);
      euler.set(i * 0.4, i * 0.8, i * 0.3);
      quat.setFromEuler(euler);
      esc.set(s * 1.35, s * 0.8, s);
      mat.compose(pos, quat, esc);
      return mat.clone();
    });
  }, [bioma]);

  // Agujas de hielo cristalino (Penitentes) en el corredor central de Europa (Fila 3 Panel 2)
  const datosAgujas = useMemo(() => {
    if (bioma.id !== 'terreno_europa') return [];
    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const esc = new THREE.Vector3();
    const euler = new THREE.Euler();

    return Array.from({ length: 48 }, (_, i) => {
      const lado = i % 2 === 0 ? 1 : -1;
      const x = lado * (2.1 + (i % 7) * 0.85);
      const z = 1.5 - (i % 12) * 1.35;
      const h = 1.4 + (i % 5) * 0.85;
      const y = alturaTerreno(x, z, bioma.id);
      pos.set(x, y + h * 0.42, z);
      euler.set(0, i * 0.5, lado * -0.08);
      quat.setFromEuler(euler);
      esc.set(0.28, h, 0.28);
      mat.compose(pos, quat, esc);
      return mat.clone();
    });
  }, [bioma]);

  useLayoutEffect(() => {
    if (instRef.current) {
      datosRocas.forEach((m, i) => instRef.current.setMatrixAt(i, m));
      instRef.current.instanceMatrix.needsUpdate = true;
    }
    if (agujasRef.current && datosAgujas.length > 0) {
      datosAgujas.forEach((m, i) => agujasRef.current.setMatrixAt(i, m));
      agujasRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [datosRocas, datosAgujas]);

  return (
    <group>
      <instancedMesh
        key={`rocas-${bioma.id}`}
        ref={instRef}
        args={[null, null, datosRocas.length]}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={bioma.color_secundario} roughness={0.9} />
      </instancedMesh>

      {datosAgujas.length > 0 && (
        <instancedMesh
          key={`agujas-${bioma.id}`}
          ref={agujasRef}
          args={[null, null, datosAgujas.length]}
          castShadow
        >
          <coneGeometry args={[1, 1, 6]} />
          <meshPhysicalMaterial
            color="#e0f2fe"
            emissive="#0284c7"
            emissiveIntensity={0.45}
            roughness={0.12}
            metalness={0.15}
            clearcoat={1}
          />
        </instancedMesh>
      )}
    </group>
  );
}

/* ───────────── Efecto Especial: Ríos de Lava o Fisuras Criovolcánicas Luminosas ───────────── */
function PlanoFluidoLuminoso({ color = '#f97316', nivelY = -1.92 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.material.opacity = 0.82 + Math.sin(clock.elapsedTime * 3.2) * 0.14;
  });

  return (
    <mesh ref={ref} position={[0, nivelY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[48, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
    </mesh>
  );
}

/* ───────────── Efecto Especial: Impacto Cinético / Explosión DART (Fila 5 Panel 4) ───────────── */
function ExplosionImpacto3D() {
  const bolaRef = useRef();
  const ondaRef = useRef();
  const escombrosRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const fragmentos = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => {
      const ang = (i * 2.39996) % (Math.PI * 2);
      const elev = 0.25 + ((i * 17) % 10) * 0.11;
      const vel = 1.8 + (i % 7) * 0.65;
      return { ang, elev, vel, s: 0.08 + (i % 5) * 0.045 };
    });
  }, []);

  useFrame(({ clock }) => {
    const ciclo = (clock.elapsedTime * 0.55) % 1;
    const ease = 1 - Math.pow(1 - ciclo, 2.4);

    if (bolaRef.current) {
      bolaRef.current.scale.setScalar(0.8 + ease * 2.4);
      bolaRef.current.material.opacity = Math.max(0, (1 - ciclo) * 0.88);
    }
    if (ondaRef.current) {
      ondaRef.current.scale.setScalar(1 + ease * 7.2);
      ondaRef.current.material.opacity = Math.max(0, (1 - ciclo) * 0.75);
    }
    if (escombrosRef.current) {
      fragmentos.forEach((f, i) => {
        const d = ease * f.vel * 3.8;
        const x = Math.cos(f.ang) * d;
        const z = Math.sin(f.ang) * d;
        const y = -1.4 + d * f.elev - 0.5 * 2.2 * ciclo * ciclo;
        dummy.position.set(x, Math.max(-1.8, y), z);
        dummy.rotation.set(ciclo * 6, i, ciclo * 4);
        dummy.scale.setScalar(f.s);
        dummy.updateMatrix();
        escombrosRef.current.setMatrixAt(i, dummy.matrix);
      });
      escombrosRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, -1.2]}>
      <mesh ref={bolaRef} position={[0, -1.2, 0]}>
        <sphereGeometry args={[1.05, 32, 24]} />
        <meshBasicMaterial
          color="#fb923c"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ondaRef} position={[0, -1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1.15, 48]} />
        <meshBasicMaterial
          color="#fde047"
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <instancedMesh ref={escombrosRef} args={[null, null, fragmentos.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#78716c" emissive="#ea580c" emissiveIntensity={0.65} />
      </instancedMesh>
      <pointLight position={[0, 0.5, 0]} color="#fb923c" intensity={14} distance={16} />
    </group>
  );
}

/* ───────────── Baliza / Conector de Aterrizaje para Mini-Drones en Tierra Firme ───────────── */
function ZonaAterrizajeModular({ color = '#38bdf8', children }) {
  const aroRef = useRef();
  useFrame((_, dt) => {
    if (aroRef.current) aroRef.current.rotation.z += dt * 0.8;
  });

  return (
    <group position={[0, -1.78, 1.2]}>
      <mesh ref={aroRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.18, 48]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.39, 32]} />
        <meshBasicMaterial color="#a5f3fc" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Haz vertical de enlace con la nave nodriza en órbita */}
      <mesh position={[0, 2.0, -1.8]} rotation={[-0.42, 0, 0]}>
        <cylinderGeometry args={[0.14, 1.05, 4.6, 24, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {children}
    </group>
  );
}

/* ───────────── Componente Principal: Campo de Terreno 3D ───────────── */
export default function CampoTerreno3D({
  bioma,
  modeloNodriza,
  mostrarNodrizaEnCielo = true,
  children,
}) {
  return (
    <group>
      <fog attach="fog" args={[bioma.color_cielo, 14, 48]} />
      <Stars radius={90} depth={40} count={1800} factor={2.2} fade />

      <ambientLight intensity={0.68} color={bioma.color_horizonte} />
      <directionalLight
        position={[12, 14, -10]}
        intensity={3.5}
        color="#fff7ed"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 6, 8]} intensity={1.3} color={bioma.color_horizonte} />

      {/* Cielo y Planeta Madre encuadrados en el horizonte central (Fila 3 Paneles 1, 2, 3) */}
      {bioma.planeta_madre === 'tierra' && (
        <PlanetaNasaHD id="tierra" radio={3.2} position={[-3.4, 2.2, -20]} />
      )}
      {bioma.planeta_madre === 'saturno_cielo' && (
        <PlanetaNasaHD id="saturno_asteroides" radio={3.8} position={[3.4, 2.5, -21]} />
      )}
      {bioma.planeta_madre === 'jupiter_cielo' && (
        <PlanetaNasaHD id="jupiter" radio={4.2} position={[-3.6, 2.4, -22]} />
      )}
      {bioma.planeta_madre === 'sol_tenue' && (
        <DestelloSolar3D posicion={[2.6, 2.4, -20]} color="#fdba74" escala={1.1} />
      )}

      {/* Malla de terreno 3D con relieve DEM y textura geológica */}
      <MallaTerrenoBioma bioma={bioma} />

      {/* Rocas instanciadas y agujas de hielo */}
      {bioma.id !== 'terreno_nubes_jupiter' && <RocasYFormaciones3D bioma={bioma} />}

      {/* Ríos de lava incandescente o grietas criovolcánicas */}
      {bioma.id === 'terreno_volcanico' && (
        <PlanoFluidoLuminoso color="#f97316" nivelY={-1.92} />
      )}
      {bioma.id === 'terreno_europa' && (
        <PlanoFluidoLuminoso color="#00f0ff" nivelY={-1.96} />
      )}

      {/* Explosión e impacto cinético en el bioma de asteroide */}
      {bioma.id === 'terreno_asteroide_impacto' && <ExplosionImpacto3D />}

      {/* Nave Nodriza estacionada en el cielo (bajo la barra superior, totalmente visible) */}
      {mostrarNodrizaEnCielo && (
        <group position={[0, 1.85, -3.4]} scale={0.38}>
          <Nodriza3D
            modelo={modeloNodriza.id}
            configuracion3D={modeloNodriza.configuracion_3d}
            colorCasco={modeloNodriza.casco}
            colorAcento={modeloNodriza.acento}
            desplegado={1}
            bahiaAbierta
            propulsionActiva
            escanerActivo
          />
        </group>
      )}

      {/* Zona de aterrizaje en tierra firme con conector para las sondas */}
      {bioma.id !== 'terreno_asteroide_impacto' && (
        <ZonaAterrizajeModular color={modeloNodriza.acento}>
          {children}
        </ZonaAterrizajeModular>
      )}
    </group>
  );
}

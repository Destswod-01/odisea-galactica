/* eslint-disable react-refresh/only-export-components */
// Globos planetarios de alta definición y cuerpos celestes de la NASA (Fila 1 y Fila 2 de la referencia).
// Combina los mapas reales 2K en ./texturas/ con mapas procedurales de relieve, luces nocturnas,
// corteza helada de Europa (lineae), anillos translúcidos de Saturno y asteroides 3D.
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const cachePlanetas = {};

/* ───────────── Generadores de mapas procedurales de alta resolución ───────────── */
export function texturaEuropaNasa() {
  if (cachePlanetas.europa) return cachePlanetas.europa;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');

  // Base de hielo azul-crema criogénico
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#9ab8d4');
  grd.addColorStop(0.25, '#cfdce8');
  grd.addColorStop(0.5, '#dbe6ef');
  grd.addColorStop(0.75, '#c6d6e6');
  grd.addColorStop(1, '#8fb0ce');
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 512);

  // Manchas minerales y caos de hielo
  for (let i = 0; i < 160; i++) {
    const x = (i * 7919) % 1024;
    const y = (i * 104729) % 512;
    const r = 12 + (i % 45);
    const rg = g.createRadialGradient(x, y, 2, x, y, r);
    rg.addColorStop(0, i % 3 === 0 ? 'rgba(138, 98, 74, 0.28)' : 'rgba(110, 165, 210, 0.3)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Fracturas tectónicas rojizas/marrones (Lineae de Europa) y vetas cian
  for (let k = 0; k < 85; k++) {
    g.beginPath();
    let x = (k * 313) % 1024;
    let y = (k * 197) % 512;
    g.moveTo(x, y);
    for (let s = 0; s < 7; s++) {
      x += Math.cos(k * 0.7 + s * 0.5) * 95;
      y += Math.sin(k * 1.1 + s * 0.4) * 55;
      g.lineTo(x, y);
    }
    g.strokeStyle = k % 4 === 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(132, 76, 52, 0.58)';
    g.lineWidth = 1 + (k % 3) * 0.9;
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  cachePlanetas.europa = t;
  return t;
}

export function texturaSaturnoNasa() {
  if (cachePlanetas.saturno) return cachePlanetas.saturno;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');

  const bandas = [
    '#cbb389', '#dfca9f', '#e8d6b0', '#d4bc8e', '#c2a676',
    '#ead9b7', '#dcc69c', '#bfa272', '#e4d1ab', '#cab083',
  ];
  let y = 0;
  let idx = 0;
  while (y < 512) {
    const h = 10 + ((idx * 19) % 24);
    g.fillStyle = bandas[idx % bandas.length];
    g.fillRect(0, y, 1024, h + 2);
    y += h;
    idx++;
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cachePlanetas.saturno = t;
  return t;
}

export function texturaAnillosSaturno() {
  if (cachePlanetas.anillos) return cachePlanetas.anillos;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d');

  for (let x = 0; x < 512; x++) {
    const u = x / 512;
    // División de Cassini entre u=0.62 y u=0.68
    const cassini = u > 0.62 && u < 0.68 ? 0.08 : 1;
    const interior = u < 0.18 ? u / 0.18 : 1;
    const exterior = u > 0.92 ? (1 - u) / 0.08 : 1;
    const onda = 0.65 + 0.35 * Math.sin(x * 0.35) * Math.cos(x * 0.11);
    const alfa = Math.max(0, Math.min(0.92, onda * cassini * interior * exterior));
    const r = Math.round(215 + Math.sin(x * 0.2) * 25);
    const gr = Math.round(192 + Math.sin(x * 0.2) * 22);
    const b = Math.round(150 + Math.cos(x * 0.15) * 20);
    g.fillStyle = `rgba(${r},${gr},${b},${alfa.toFixed(3)})`;
    g.fillRect(x, 0, 1, 64);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cachePlanetas.anillos = t;
  return t;
}

export function texturaAsteroideRoca() {
  if (cachePlanetas.asteroide) return cachePlanetas.asteroide;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#57534e';
  g.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 420; i++) {
    const x = (i * 7919) % 512;
    const y = (i * 104729) % 512;
    const r = 3 + (i % 18);
    g.fillStyle = i % 2 === 0 ? 'rgba(28, 25, 23, 0.48)' : 'rgba(168, 162, 158, 0.25)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cachePlanetas.asteroide = t;
  return t;
}

/* ───────────── Shader Fresnel de Atmósfera Planetaria ───────────── */
export function HaloAtmosferico({ radio = 1, color = '#38bdf8', intensidad = 0.48 }) {
  const uniforms = useMemo(
    () => ({
      tono: { value: new THREE.Color(color) },
      fuerza: { value: intensidad },
    }),
    [color, intensidad]
  );

  return (
    <mesh scale={radio * 1.028}>
      <sphereGeometry args={[1, 64, 48]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vVista;
          void main() {
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vVista = normalize(-mvPos.xyz);
            gl_Position = projectionMatrix * mvPos;
          }
        `}
        fragmentShader={`
          uniform vec3 tono;
          uniform float fuerza;
          varying vec3 vNormal;
          varying vec3 vVista;
          void main() {
            float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vVista)), 0.0), 3.8);
            gl_FragColor = vec4(tono, fresnel * fuerza);
          }
        `}
      />
    </mesh>
  );
}

/* ───────────── Asteroide 3D con Cráteres Deformados (Estilo Bennu / DART) ───────────── */
export function Asteroide3D({ radio = 1, velocidad = 0.18, semilla = 1, ...props }) {
  const ref = useRef();
  const texRoca = useMemo(() => texturaAsteroideRoca(), []);

  const geoDeformada = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radio, 4);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      // Deformación triaxial + cráteres deterministas
      const ond1 = Math.sin(n.x * 4.2 + semilla) * Math.cos(n.y * 3.7 - semilla) * 0.16;
      const ond2 = Math.sin(n.z * 7.5 + n.x * 5.1) * 0.07;
      const factor = 1 + ond1 + ond2;
      pos.setXYZ(i, v.x * factor * 1.18, v.y * factor * 0.86, v.z * factor * 0.95);
    }
    geo.computeVertexNormals();
    return geo;
  }, [radio, semilla]);

  useEffect(() => () => geoDeformada.dispose(), [geoDeformada]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * velocidad;
    ref.current.rotation.x += dt * velocidad * 0.35;
  });

  return (
    <mesh ref={ref} geometry={geoDeformada} castShadow receiveShadow {...props}>
      <meshStandardMaterial
        map={texRoca}
        bumpMap={texRoca}
        bumpScale={0.08}
        roughness={0.92}
        metalness={0.12}
      />
    </mesh>
  );
}

/* ───────────── Componente Selector de Planeta HD de la NASA ───────────── */
export default function PlanetaNasaHD({
  id = 'tierra',
  radio = 2.6,
  velocidadGiro = 0.035,
  ...props
}) {
  const giroRef = useRef();
  const nubesRef = useRef();

  const texMapas = useTexture({
    tierra: './texturas/earth_daymap.jpg',
    nubes: './texturas/earth_clouds.jpg',
    luna: './texturas/moon.jpg',
    marte: './texturas/mars.jpg',
    jupiter: './texturas/jupiter.jpg',
  });

  Object.values(texMapas).forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });

  const texEuropa = useMemo(() => texturaEuropaNasa(), []);
  const texSaturno = useMemo(() => texturaSaturnoNasa(), []);
  const texAnillos = useMemo(() => texturaAnillosSaturno(), []);

  const geoAnillos = useMemo(() => {
    const geo = new THREE.RingGeometry(radio * 1.32, radio * 2.38, 96, 1);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const dist = v.length();
      const u = (dist - radio * 1.32) / (radio * 1.06);
      uv.setXY(i, u, 0.5);
    }
    return geo;
  }, [radio]);
  useEffect(() => () => geoAnillos.dispose(), [geoAnillos]);

  useFrame((_, dt) => {
    if (giroRef.current) giroRef.current.rotation.y += dt * velocidadGiro;
    if (nubesRef.current) nubesRef.current.rotation.y += dt * velocidadGiro * 1.35;
  });

  if (id === 'luna') {
    return (
      <group {...props}>
        <mesh ref={giroRef} scale={radio} castShadow receiveShadow>
          <sphereGeometry args={[1, 96, 64]} />
          <meshStandardMaterial
            map={texMapas.luna}
            bumpMap={texMapas.luna}
            bumpScale={0.045}
            roughness={0.94}
          />
        </mesh>
      </group>
    );
  }

  if (id === 'marte') {
    return (
      <group {...props}>
        <mesh ref={giroRef} scale={radio} castShadow receiveShadow>
          <sphereGeometry args={[1, 96, 64]} />
          <meshStandardMaterial
            map={texMapas.marte}
            bumpMap={texMapas.marte}
            bumpScale={0.05}
            roughness={0.88}
          />
        </mesh>
        <HaloAtmosferico radio={radio} color="#fb923c" intensidad={0.42} />
      </group>
    );
  }

  if (id === 'jupiter') {
    return (
      <group {...props}>
        <mesh ref={giroRef} scale={radio} castShadow receiveShadow>
          <sphereGeometry args={[1, 96, 64]} />
          <meshStandardMaterial map={texMapas.jupiter} roughness={0.78} />
        </mesh>
        <HaloAtmosferico radio={radio} color="#f59e0b" intensidad={0.38} />
      </group>
    );
  }

  if (id === 'europa') {
    return (
      <group {...props}>
        <mesh ref={giroRef} scale={radio} castShadow receiveShadow>
          <sphereGeometry args={[1, 96, 64]} />
          <meshPhysicalMaterial
            map={texEuropa}
            bumpMap={texEuropa}
            bumpScale={0.03}
            roughness={0.28}
            metalness={0.15}
            clearcoat={0.55}
          />
        </mesh>
        <HaloAtmosferico radio={radio} color="#67e8f9" intensidad={0.36} />
      </group>
    );
  }

  if (id === 'saturno_asteroides') {
    return (
      <group {...props}>
        <group rotation={[0.32, 0, -0.24]}>
          <mesh ref={giroRef} scale={radio * 0.85} castShadow receiveShadow>
            <sphereGeometry args={[1, 80, 64]} />
            <meshStandardMaterial map={texSaturno} roughness={0.75} />
          </mesh>
          <mesh geometry={geoAnillos} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <meshStandardMaterial
              map={texAnillos}
              transparent
              side={THREE.DoubleSide}
              roughness={0.6}
            />
          </mesh>
        </group>
        {/* Asteroide principal estilo Bennu en primer plano como en el Panel 6 de la Fila 1 */}
        <Asteroide3D
          radio={radio * 0.34}
          position={[-radio * 1.35, radio * 0.18, radio * 0.85]}
          semilla={3}
        />
        <Asteroide3D
          radio={radio * 0.14}
          position={[-radio * 0.75, -radio * 0.45, radio * 1.1]}
          semilla={9}
        />
      </group>
    );
  }

  // Por defecto: Tierra (Blue Marble + Nubes + Halo Rayleigh)
  return (
    <group {...props}>
      <mesh ref={giroRef} scale={radio} castShadow receiveShadow>
        <sphereGeometry args={[1, 96, 64]} />
        <meshStandardMaterial
          map={texMapas.tierra}
          roughness={0.62}
          metalness={0.18}
        />
      </mesh>
      <mesh ref={nubesRef} scale={radio * 1.008}>
        <sphereGeometry args={[1, 80, 64]} />
        <meshStandardMaterial
          alphaMap={texMapas.nubes}
          transparent
          opacity={0.68}
          depthWrite={false}
        />
      </mesh>
      <HaloAtmosferico radio={radio} color="#38bdf8" intensidad={0.55} />
    </group>
  );
}

import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/* Port de los globos planetarios de nodriza (worktree-nodriza/src/paisajes/PlanetasNasaHD.jsx):
   misma geometría, materiales, halos y texturas NASA; solo cambian los giros ya aprobados del juego. */

export function HaloAtmosferico({
  radio = 1,
  color = '#38bdf8',
  colorTerminador = '#f97316',
  intensidad = 0.72,
  dirSol = [0.65, 0.55, 0.52],
}) {
  const matInternoRef = useRef();
  const matCoronaRef = useRef();
  const [sx, sy, sz] = dirSol;
  const uniformsInterno = useMemo(
    () => ({
      tono: { value: new THREE.Color(color) },
      tonoCrepusculo: { value: new THREE.Color(colorTerminador) },
      fuerza: { value: intensidad },
      dirSol: { value: new THREE.Vector3(sx, sy, sz).normalize() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const uniformsCorona = useMemo(
    () => ({
      tono: { value: new THREE.Color(color) },
      tonoCrepusculo: { value: new THREE.Color(colorTerminador) },
      fuerza: { value: intensidad * 1.15 },
      dirSol: { value: new THREE.Vector3(sx, sy, sz).normalize() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    for (const [mat, mult] of [
      [matInternoRef.current, 1],
      [matCoronaRef.current, 1.15],
    ]) {
      const u = mat?.uniforms;
      if (!u) continue;
      u.tono.value.set(color);
      u.tonoCrepusculo.value.set(colorTerminador);
      u.fuerza.value = intensidad * mult;
      u.dirSol.value.set(sx, sy, sz).normalize();
    }
  }, [color, colorTerminador, intensidad, sx, sy, sz]);

  return (
    <group>
      {/* Aro fino de dispersión Rayleigh sobre el limbo y terminador crepuscular */}
      <mesh scale={radio * 1.015}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial
          ref={matInternoRef}
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniformsInterno}
          vertexShader={`
            varying vec3 vNormalVista;
            varying vec3 vNormalMundo;
            varying vec3 vVista;
            void main() {
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              vNormalVista = normalize(normalMatrix * normal);
              vNormalMundo = normalize(mat3(modelMatrix) * normal);
              vVista = normalize(-mvPos.xyz);
              gl_Position = projectionMatrix * mvPos;
            }
          `}
          fragmentShader={`
            uniform vec3 tono;
            uniform vec3 tonoCrepusculo;
            uniform float fuerza;
            uniform vec3 dirSol;
            varying vec3 vNormalVista;
            varying vec3 vNormalMundo;
            varying vec3 vVista;
            void main() {
              float nv = max(dot(normalize(vNormalVista), normalize(vVista)), 0.0);
              float fresnel = pow(1.0 - nv, 3.1);
              float nl = dot(normalize(vNormalMundo), normalize(dirSol));
              float iluminado = smoothstep(-0.32, 0.58, nl);
              float crepusculo = exp(-pow(nl * 3.6, 2.0)) * 0.65;
              vec3 colFinal = mix(tono, tonoCrepusculo, crepusculo);
              float alfa = fresnel * fuerza * (0.14 + 0.96 * iluminado);
              gl_FragColor = vec4(colFinal * 1.35, alfa);
            }
          `}
        />
      </mesh>

      {/* Halo exosférico delgado ceñido al lado iluminado del planeta */}
      <mesh scale={radio * 1.048}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial
          ref={matCoronaRef}
          transparent
          depthWrite={false}
          fog={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          uniforms={uniformsCorona}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vNormalMundo;
            varying vec3 vVista;
            void main() {
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vNormalMundo = normalize(mat3(modelMatrix) * normal);
              vVista = normalize(-mvPos.xyz);
              gl_Position = projectionMatrix * mvPos;
            }
          `}
          fragmentShader={`
            uniform vec3 tono;
            uniform vec3 tonoCrepusculo;
            uniform float fuerza;
            uniform vec3 dirSol;
            varying vec3 vNormal;
            varying vec3 vNormalMundo;
            varying vec3 vVista;
            void main() {
              float d = max(dot(normalize(vNormal), -normalize(vVista)), 0.0);
              float halo = pow(d, 3.4) * (1.0 - smoothstep(0.45, 0.95, d));
              float nl = dot(normalize(vNormalMundo), normalize(dirSol));
              float iluminado = smoothstep(-0.28, 0.65, nl);
              float crepusculo = exp(-pow(nl * 3.8, 2.0)) * 0.45;
              vec3 col = mix(tono, tonoCrepusculo, crepusculo);
              gl_FragColor = vec4(col * 1.3, halo * fuerza * (0.18 + 1.55 * iluminado));
            }
          `}
        />
      </mesh>
    </group>
  );
}

function useDirSolUniform(dirSol = [0.65, 0.55, 0.52]) {
  const [sx, sy, sz] = dirSol;
  return useMemo(() => ({ value: new THREE.Vector3(sx, sy, sz).normalize() }), [sx, sy, sz]);
}

export function Jupiter3D({ radio = 1, auroras = false, anillos = false, dirSol = [0.65, 0.55, 0.52], ...props }) {
  const giroRef = useRef();
  const auroraRef = useRef();
  const texPrincipal = useTexture('./texturas/jupiter.jpg');

  useEffect(() => {
    texPrincipal.colorSpace = THREE.SRGBColorSpace;
    texPrincipal.anisotropy = 8;
  }, [texPrincipal]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (giroRef.current) giroRef.current.rotation.y += dt * 0.025;
    if (auroraRef.current) auroraRef.current.rotation.y += dt * 0.035;
  });

  return (
    <group {...props}>
      <mesh ref={giroRef} scale={[radio, radio * 0.935, radio]} castShadow receiveShadow rotation={[0.04, 0.7, -0.08]}>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial fog={false} map={texPrincipal} roughness={0.68} metalness={0.02} />
      </mesh>
      {auroras && (
        <group ref={auroraRef} rotation={[0.04, 0.7, -0.08]}>
          {/* Óvalo auroral boreal de Júpiter (Juno UVS) */}
          <mesh position={[0, radio * 0.935 * 0.94, 0]} rotation={[-Math.PI / 2 + 0.08, 0, 0]}>
            <ringGeometry args={[radio * 0.14, radio * 0.28, 64]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Óvalo auroral austral */}
          <mesh position={[0, -radio * 0.935 * 0.94, 0]} rotation={[Math.PI / 2 + 0.08, 0, 0]}>
            <ringGeometry args={[radio * 0.14, radio * 0.28, 64]} />
            <meshBasicMaterial
              color="#818cf8"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
      {anillos && (
        <mesh rotation={[-Math.PI / 2 + 0.04, 0, 0]}>
          <ringGeometry args={[radio * 1.35, radio * 1.65, 96]} />
          <meshBasicMaterial
            color="#d97706"
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <HaloAtmosferico radio={radio} color="#f3c68a" colorTerminador="#c27430" intensidad={0.38} dirSol={dirSol} />
    </group>
  );
}

export function Luna3D({ radio = 1, dirSol = [0.65, 0.55, 0.52], ...props }) {
  const giroRef = useRef();
  const [texPrincipal, texNormalDem] = useTexture([
    './texturas/moon.jpg',
    './texturas/planetas/luna_normal_lola.jpg',
  ]);
  useEffect(() => {
    texPrincipal.colorSpace = THREE.SRGBColorSpace;
    texPrincipal.anisotropy = 8;
    texNormalDem.colorSpace = THREE.NoColorSpace;
    texNormalDem.anisotropy = 8;
  }, [texPrincipal, texNormalDem]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (giroRef.current) giroRef.current.rotation.y += dt * 0.01;
  });
  return (
    <group {...props}>
      <group rotation={[0.76, 0.42, -0.18]}>
        <mesh ref={giroRef} scale={radio} castShadow receiveShadow>
          <sphereGeometry args={[1, 160, 112]} />
          <meshStandardMaterial
            fog={false}
            map={texPrincipal}
            normalMap={texNormalDem}
            normalScale={new THREE.Vector2(2.35, 2.35)}
            bumpMap={texPrincipal}
            bumpScale={0.08}
            roughness={0.96}
            metalness={0.01}
            envMapIntensity={0.24}
          />
        </mesh>
      </group>
      <HaloAtmosferico radio={radio} color="#cbd5e1" colorTerminador="#475569" intensidad={0.04} dirSol={dirSol} />
    </group>
  );
}

export function Tierra3D({ radio = 1, dirSol = [0.65, 0.55, 0.52], ...props }) {
  const giroRef = useRef();
  const nubesRef = useRef();
  const sombraNubesRef = useRef();
  const dirSolUniform = useDirSolUniform(dirSol);

  const texMapas = useTexture({
    tierra: './texturas/earth_daymap.jpg',
    tierraNormal: './texturas/earth_normal_2048.jpg',
    tierraSpec: './texturas/earth_specular_2048.jpg',
    tierraLuces: './texturas/earth_lights_2048.png',
    nubes: './texturas/earth_clouds.jpg',
  });

  useEffect(() => {
    Object.entries(texMapas).forEach(([k, t]) => {
      if (k !== 'tierraNormal' && k !== 'tierraSpec') {
        t.colorSpace = THREE.SRGBColorSpace;
      }
      t.anisotropy = 8;
    });
  }, [texMapas]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (giroRef.current) giroRef.current.rotation.y += dt * 0.025;
    if (nubesRef.current) nubesRef.current.rotation.y += dt * 0.025 * 1.32;
    if (sombraNubesRef.current) sombraNubesRef.current.rotation.y += dt * 0.025 * 1.32;
  });

  const matTierra = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      fog: false,
      map: texMapas.tierra,
      normalMap: texMapas.tierraNormal,
      normalScale: new THREE.Vector2(1.55, 1.55),
      roughnessMap: texMapas.tierraSpec,
      emissive: new THREE.Color('#ffcf75').multiplyScalar(1.5),
      emissiveMap: texMapas.tierraLuces,
      emissiveIntensity: 1.0,
      roughness: 1.0,
      metalness: 0.08,
      clearcoat: 0.42,
      clearcoatRoughness: 0.22,
    });
    m.customProgramCacheKey = () => 'tierra-terminator-sunglint-v1';
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uDirSolTierra = dirSolUniform;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vNormalMundoTierra;`
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
          vNormalMundoTierra = normalize(mat3(modelMatrix) * objectNormal);`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uDirSolTierra;
          varying vec3 vNormalMundoTierra;`
        )
        // Invierte earth_specular_2048.jpg: océanos=0.18 (sunglint!) y tierra=0.88 (mate)
        .replace(
          '#include <roughnessmap_fragment>',
          `float roughnessFactor = roughness;
          #ifdef USE_ROUGHNESSMAP
            vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
            roughnessFactor *= mix(0.88, 0.18, texelRoughness.g);
          #endif`
        )
        // Enmascara las luces de ciudades para que SOLO brillen en el hemisferio nocturno y crepúsculo
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float nlTierra = dot(normalize(vNormalMundoTierra), normalize(uDirSolTierra));
          float mascaraNoche = smoothstep(0.14, -0.24, nlTierra);
          totalEmissiveRadiance *= mascaraNoche;`
        );
    };
    return m;
  }, [texMapas.tierra, texMapas.tierraNormal, texMapas.tierraSpec, texMapas.tierraLuces, dirSolUniform]);

  useEffect(() => () => matTierra.dispose(), [matTierra]);

  return (
    <group {...props}>
      <group ref={giroRef} rotation={[0, 1.5, 0.15]}>
        <mesh scale={radio} castShadow receiveShadow material={matTierra}>
          <sphereGeometry args={[1, 128, 96]} />
        </mesh>
      </group>

      {/* Sombra proyectada de las nubes sobre océanos y continentes */}
      <mesh ref={sombraNubesRef} scale={radio * 1.005} rotation={[0.012, -0.015, 0]}>
        <sphereGeometry args={[1, 96, 64]} />
        <meshBasicMaterial
          fog={false}
          alphaMap={texMapas.nubes}
          color="#020617"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>

      {/* Capa volumétrica de cúmulos y ciclones */}
      <mesh ref={nubesRef} scale={radio * 1.012}>
        <sphereGeometry args={[1, 112, 80]} />
        <meshStandardMaterial
          fog={false}
          map={texMapas.nubes}
          alphaMap={texMapas.nubes}
          bumpMap={texMapas.nubes}
          bumpScale={0.03}
          transparent
          opacity={0.9}
          roughness={0.78}
          depthWrite={false}
        />
      </mesh>

      <HaloAtmosferico
        radio={radio}
        color="#38bdf8"
        colorTerminador="#fb923c"
        intensidad={0.86}
        dirSol={dirSol}
      />
    </group>
  );
}

export function Destino3D({ destino = 'jupiter', radio = 1, dirSol = [0.65, 0.55, 0.52], ...props }) {
  if (destino === 'luna') return <Luna3D radio={radio * 0.75} dirSol={dirSol} {...props} />;
  if (destino === 'marte') return <Marte3D radio={radio * 0.82} dirSol={dirSol} {...props} />;
  return <Jupiter3D radio={radio} dirSol={dirSol} {...props} />;
}

export function Marte3D({ radio = 1, dirSol = [0.65, 0.55, 0.52], ...props }) {
  const giroRef = useRef();
  const [texPrincipal, texNormalDem] = useTexture([
    './texturas/planetas/marte_hd.jpg',
    './texturas/planetas/marte_normal_mola.jpg',
  ]);

  useEffect(() => {
    texPrincipal.colorSpace = THREE.SRGBColorSpace;
    texPrincipal.anisotropy = 8;
    texNormalDem.anisotropy = 8;
  }, [texPrincipal, texNormalDem]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (giroRef.current) giroRef.current.rotation.y += dt * 0.015;
  });

  return (
    <group {...props}>
      <group rotation={[0.44, 0.18, 0.12]}>
        <mesh ref={giroRef} scale={radio} castShadow receiveShadow>
          <sphereGeometry args={[1, 160, 112]} />
          <meshStandardMaterial
            fog={false}
            map={texPrincipal}
            normalMap={texNormalDem}
            normalScale={new THREE.Vector2(1.4, 1.4)}
            roughness={0.88}
            metalness={0.03}
            envMapIntensity={0.25}
          />
        </mesh>
      </group>
      <HaloAtmosferico
        radio={radio}
        color="#e59e72"
        colorTerminador="#b4532a"
        intensidad={0.44}
        dirSol={dirSol}
      />
    </group>
  );
}

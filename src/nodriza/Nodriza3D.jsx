/* eslint-disable react-refresh/only-export-components */
// Modelos 3D procedurales de alta fidelidad para las 3 naves nodrizas del Proyecto ASTRION-X.
// Diseñado como módulo independiente listo para integrarse en ÓRBITA 2.0 (sin mini-drones).
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/* ───────────── Caché de texturas procedurales Canvas ───────────── */
const cacheTex = {};

export function texturaCeldasNodriza() {
  if (cacheTex.celdas) return cacheTex.celdas;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');

  g.fillStyle = '#06112b';
  g.fillRect(0, 0, 512, 512);

  const cols = 6;
  const rows = 4;
  const cw = 512 / cols;
  const ch = 512 / rows;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cw;
      const y = j * ch;
      const grd = g.createLinearGradient(x, y, x + cw, y + ch);
      grd.addColorStop(0, (i + j) % 2 === 0 ? '#133163' : '#0f2854');
      grd.addColorStop(0.5, '#1b427d');
      grd.addColorStop(1, '#091b3e');
      g.fillStyle = grd;
      g.fillRect(x + 4, y + 4, cw - 8, ch - 8);

      // Sub-celdas fotovoltaicas y colectores plateados
      g.strokeStyle = 'rgba(130, 190, 255, 0.28)';
      g.lineWidth = 1;
      for (let sub = 1; sub < 4; sub++) {
        g.beginPath();
        g.moveTo(x + 4, y + (ch * sub) / 4);
        g.lineTo(x + cw - 4, y + (ch * sub) / 4);
        g.stroke();
      }
      g.fillStyle = 'rgba(205, 230, 255, 0.45)';
      g.fillRect(x + cw * 0.33, y + 5, 1.5, ch - 10);
      g.fillRect(x + cw * 0.66, y + 5, 1.5, ch - 10);

      // Marco dorado/cobre fino por celda como en el póster ASTRION-X
      g.strokeStyle = 'rgba(218, 175, 92, 0.55)';
      g.lineWidth = 2;
      g.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
    }
  }

  g.strokeStyle = '#93c5fd';
  g.lineWidth = 5;
  g.strokeRect(2.5, 2.5, 507, 507);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  cacheTex.celdas = t;
  return t;
}

export function texturaRielBahia() {
  if (cacheTex.riel) return cacheTex.riel;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');

  g.fillStyle = '#071320';
  g.fillRect(0, 0, 256, 512);

  // Líneas de guía laterales azul cian brillante
  g.fillStyle = '#00e5ff';
  g.fillRect(18, 0, 8, 512);
  g.fillRect(230, 0, 8, 512);

  g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  g.lineWidth = 2;
  for (let y = 16; y < 512; y += 32) {
    g.beginPath();
    g.moveTo(36, y);
    g.lineTo(220, y);
    g.stroke();

    // Chevrones de salida hacia +Z
    g.strokeStyle = 'rgba(0, 240, 255, 0.75)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(92, y + 18);
    g.lineTo(128, y + 6);
    g.lineTo(164, y + 18);
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cacheTex.riel = t;
  return t;
}

/* ───────────── Materiales compartidos ───────────── */
const crearMat = (color, metalness, roughness, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

const MAT = {
  estructuraOscura: crearMat('#18222d', 0.78, 0.34),
  grafito: crearMat('#243240', 0.68, 0.4),
  titanio: crearMat('#7a8b99', 0.85, 0.28),
  aceroClaro: crearMat('#cdd7e0', 0.8, 0.26),
  oroMli: crearMat('#d8a648', 0.88, 0.28),
  cobre: crearMat('#b96f38', 0.75, 0.35),
  negroOptico: crearMat('#0c1218', 0.45, 0.5),
  platoBlanco: crearMat('#eef3f8', 0.35, 0.38, { side: THREE.DoubleSide }),
  cianLuz: new THREE.MeshBasicMaterial({ color: '#38bdf8', toneMapped: false }),
  cianIntenso: new THREE.MeshBasicMaterial({ color: '#a5f3fc', toneMapped: false }),
  ambarLuz: new THREE.MeshBasicMaterial({ color: '#fb923c', toneMapped: false }),
  verdeLuz: new THREE.MeshBasicMaterial({ color: '#34d399', toneMapped: false }),
  hazGuia: new THREE.MeshBasicMaterial({
    color: '#00e5ff',
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
  plasmaIonico: new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
  plasmaNucleo: new THREE.MeshBasicMaterial({
    color: '#e0faff',
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
};

function useMaterialDinamico(color, metalness = 0.55, roughness = 0.32, extra = {}) {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, metalness, roughness]
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

let _matCeldaCompartido = null;
function obtenerMatCelda() {
  if (!_matCeldaCompartido) {
    _matCeldaCompartido = new THREE.MeshStandardMaterial({
      map: texturaCeldasNodriza(),
      color: '#9fc5f8',
      metalness: 0.45,
      roughness: 0.22,
    });
  }
  return _matCeldaCompartido;
}

/* ───────────── Subcomponente: Ala Solar Articulada (Estilo Póster ASTRION-X) ───────────── */
function AlaSolarNodriza({
  largo = 3.85,
  ancho = 1.55,
  angulo = 0.62,
  radioAnclaje = 2.35,
  desplegado = 1,
  conPropulsorLateral = true,
  esConcentrador = false,
  enFlecha = false,
  matMarco,
  matLuz,
}) {
  const grupoPlegado = useRef();
  const matCelda = useMemo(obtenerMatCelda, []);

  useFrame((_, dt) => {
    if (!grupoPlegado.current) return;
    const metaZ = (1 - desplegado) * (Math.PI * 0.46);
    if (Math.abs(grupoPlegado.current.rotation.z - metaZ) < 0.001) return;
    grupoPlegado.current.rotation.z = THREE.MathUtils.damp(
      grupoPlegado.current.rotation.z,
      metaZ,
      4.5,
      dt
    );
  });

  const inclinacionFlecha = enFlecha ? 0.18 : 0;

  return (
    <group rotation={[0, angulo, 0]}>
      {/* Hombro mecánico anclado al casco */}
      <group position={[radioAnclaje * 0.88, 0.08, 0]}>
        <mesh castShadow receiveShadow material={MAT.estructuraOscura}>
          <boxGeometry args={[0.58, 0.34, 0.62]} />
        </mesh>
        <mesh position={[0.16, 0.19, 0]} material={MAT.oroMli}>
          <boxGeometry args={[0.32, 0.04, 0.46]} />
        </mesh>
        {/* Luz indicadora azul en el hombro */}
        <mesh position={[0.26, 0, 0.32]} material={matLuz}>
          <boxGeometry args={[0.18, 0.07, 0.02]} />
        </mesh>
        <mesh position={[0.26, 0, -0.32]} material={matLuz}>
          <boxGeometry args={[0.18, 0.07, 0.02]} />
        </mesh>

        {/* Articulación motorizada */}
        <group ref={grupoPlegado} position={[0.32, 0.04, 0]} rotation={[0.08, inclinacionFlecha, 0]}>
          {/* Cilindros hidráulicos y brazo extensor */}
          <mesh position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.titanio}>
            <cylinderGeometry args={[0.08, 0.08, 0.52, 16]} />
          </mesh>
          {[-0.28, 0.28].map((z) => (
            <mesh key={z} position={[0.26, 0.02, z]} rotation={[0, 0, Math.PI / 2]} material={MAT.aceroClaro}>
              <cylinderGeometry args={[0.035, 0.035, 0.56, 12]} />
            </mesh>
          ))}

          {/* Marco principal biselado del panel solar */}
          <group position={[0.52 + largo * 0.5, 0, 0]}>
            {/* Base estructural metálica del panel */}
            <mesh castShadow receiveShadow material={matMarco}>
              <boxGeometry args={[largo, 0.07, ancho]} />
            </mesh>
            {/* Borde perimetral reforzado */}
            <mesh position={[0, 0.01, ancho * 0.5 + 0.035]} material={MAT.estructuraOscura}>
              <boxGeometry args={[largo + 0.06, 0.09, 0.07]} />
            </mesh>
            <mesh position={[0, 0.01, -ancho * 0.5 - 0.035]} material={MAT.estructuraOscura}>
              <boxGeometry args={[largo + 0.06, 0.09, 0.07]} />
            </mesh>
            <mesh position={[largo * 0.5 + 0.04, 0.01, 0]} material={MAT.titanio}>
              <boxGeometry args={[0.08, 0.09, ancho + 0.12]} />
            </mesh>

            {/* Superficie fotovoltaica superior e inferior */}
            <mesh position={[0, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matCelda}>
              <planeGeometry args={[largo - 0.14, ancho - 0.12]} />
            </mesh>

            {/* Costillas divisorias de los segmentos del ala */}
            {[-0.33, 0, 0.33].map((f) => (
              <mesh key={f} position={[largo * f, 0.045, 0]} material={MAT.oroMli}>
                <boxGeometry args={[0.04, 0.025, ancho - 0.08]} />
              </mesh>
            ))}

            {/* Espejos concentradores dorados laterales (exclusivo de ASTRION-V) */}
            {esConcentrador &&
              [-1, 1].map((s) => (
                <mesh
                  key={s}
                  position={[0, 0.11, s * (ancho * 0.5 + 0.14)]}
                  rotation={[s * 0.48, 0, 0]}
                  material={MAT.oroMli}
                >
                  <boxGeometry args={[largo - 0.1, 0.02, 0.24]} />
                </mesh>
              ))}

            {/* Vigas traseras de refuerzo */}
            <mesh position={[0, -0.055, 0]} material={MAT.grafito}>
              <boxGeometry args={[largo - 0.18, 0.04, 0.16]} />
            </mesh>

            {/* Pod de sensores / magnetómetro y baliza en la punta del ala */}
            {conPropulsorLateral && (
              <group position={[largo * 0.5 + 0.16, 0, 0]}>
                <mesh material={MAT.estructuraOscura}>
                  <boxGeometry args={[0.24, 0.14, 0.44]} />
                </mesh>
                <mesh position={[0.13, 0, 0]} material={matLuz}>
                  <boxGeometry args={[0.03, 0.06, 0.28]} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

/* ───────────── Subcomponente: Brazo Táctico Lateral con Propulsores Iónicos (como en la imagen) ───────────── */
function BrazoTacticoLateral({ lado = 1, radio = 2.35, matCasco, matLuz, propulsionActiva }) {
  return (
    <group position={[lado * (radio + 0.55), -0.05, -0.15]} rotation={[0, lado * -0.12, 0]}>
      {/* Cuerpo blindado del brazo lateral */}
      <mesh castShadow receiveShadow material={MAT.estructuraOscura}>
        <boxGeometry args={[1.35, 0.46, 0.72]} />
      </mesh>
      <mesh position={[lado * 0.1, 0.24, 0]} material={matCasco}>
        <boxGeometry args={[1.1, 0.08, 0.58]} />
      </mesh>
      {/* Ranuras emisoras de plasma azul en el costado (visibles en el póster) */}
      <mesh position={[lado * 0.22, 0.02, 0.37]} material={matLuz}>
        <boxGeometry args={[0.48, 0.12, 0.02]} />
      </mesh>
      <mesh position={[lado * 0.22, 0.02, -0.37]} material={matLuz}>
        <boxGeometry args={[0.48, 0.12, 0.02]} />
      </mesh>
      {/* Cabezal externo con sensores y propulsor */}
      <group position={[lado * 0.82, -0.02, 0]}>
        <mesh castShadow material={MAT.titanio}>
          <boxGeometry args={[0.42, 0.34, 0.52]} />
        </mesh>
        <mesh position={[lado * 0.22, 0, 0]} material={matLuz}>
          <boxGeometry args={[0.04, 0.16, 0.32]} />
        </mesh>
        {propulsionActiva && (
          <mesh position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]} material={MAT.plasmaIonico}>
            <coneGeometry args={[0.16, 0.55, 16, 1, true]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/* ───────────── Subcomponente: Generador Nuclear RTG ───────────── */
function ModuloRtg({ angulo, radio = 2.4 }) {
  return (
    <group rotation={[0, angulo, 0]}>
      <group position={[radio + 0.48, -0.18, 0]} rotation={[0, 0, -0.22]}>
        <mesh position={[-0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.titanio}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 12]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={MAT.estructuraOscura}>
          <cylinderGeometry args={[0.18, 0.18, 0.82, 16]} />
        </mesh>
        {/* Aletas incandescentes de disipación térmica */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            rotation={[(i * Math.PI) / 3, 0, 0]}
            material={MAT.ambarLuz}
          >
            <boxGeometry args={[0.72, 0.02, 0.46]} />
          </mesh>
        ))}
        <mesh position={[0.43, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.oroMli}>
          <cylinderGeometry args={[0.14, 0.18, 0.08, 16]} />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────── Subcomponente: Núcleo de IA y Control (ASTRION-CORE) ───────────── */
function NucleoAstrionCore({ alturaCasco, radioCasco, matCasco, matLuz, escanerActivo, variante }) {
  const anilloRef = useRef();
  const escanerRef = useRef();

  useFrame((_, dt) => {
    if (!escanerActivo) return;
    if (anilloRef.current) {
      anilloRef.current.rotation.y += dt * 1.4;
    }
    if (escanerRef.current) {
      escanerRef.current.rotation.y -= dt * 2.2;
    }
  });

  const rCore = radioCasco * 0.58;
  const yBase = alturaCasco * 0.5;

  return (
    <group position={[0, yBase, 0]}>
      {/* Zócalo blindado del domo superior */}
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow material={MAT.estructuraOscura}>
        <cylinderGeometry args={[rCore * 1.08, rCore * 1.18, 0.28, 16]} />
      </mesh>

      {/* Anillo luminoso cian de estado de IA (ASTRION-CORE) */}
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} material={matLuz}>
        <torusGeometry args={[rCore * 1.03, 0.032, 12, 48]} />
      </mesh>

      {/* Placas radiales segmentadas del domo como en el póster */}
      <group ref={anilloRef} position={[0, 0.34, 0]}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[rCore * 0.78, 0, 0]} castShadow material={i % 2 === 0 ? matCasco : MAT.titanio}>
                <boxGeometry args={[0.36, 0.18, 0.48]} />
              </mesh>
              <mesh position={[rCore * 0.96, 0.02, 0]} material={matLuz}>
                <boxGeometry args={[0.04, 0.06, 0.28]} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Riel protector circular superior */}
      <mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.aceroClaro}>
        <torusGeometry args={[rCore * 0.88, 0.028, 10, 40]} />
      </mesh>

      {/* Bóveda central de procesadores cuánticos/neuronales */}
      <mesh position={[0, 0.38, 0]} castShadow material={variante === 'astrion_v' ? MAT.oroMli : MAT.grafito}>
        <cylinderGeometry args={[rCore * 0.56, rCore * 0.68, 0.26, 12]} />
      </mesh>
      <mesh position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.cianIntenso}>
        <torusGeometry args={[rCore * 0.48, 0.022, 8, 32]} />
      </mesh>

      {/* Haz de escaneo orbital activo */}
      {escanerActivo && (
        <group ref={escanerRef} position={[0, 0.55, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={MAT.hazGuia}>
            <ringGeometry args={[rCore * 0.6, rCore * 2.4, 32, 1, 0, Math.PI * 0.45]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ───────────── Subcomponente: Antena Híbrida (Láser y Radio de Banda Profunda) ───────────── */
function AntenaBandaProfunda({
  alturaCasco,
  radioPlato = 1.05,
  laserActivo = false,
  dobleReflector = false,
  matLuz,
}) {
  const grupoPlato = useRef();

  const geoParabola = useMemo(() => {
    const pts = Array.from({ length: 12 }, (_, i) => {
      const x = (radioPlato * i) / 11;
      const y = 0.32 * (x * x) / (radioPlato * radioPlato);
      return new THREE.Vector2(x, y);
    });
    return new THREE.LatheGeometry(pts, 20);
  }, [radioPlato]);
  useEffect(() => () => geoParabola.dispose(), [geoParabola]);

  useFrame(({ clock }) => {
    if (!grupoPlato.current || !laserActivo) return;
    grupoPlato.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.22;
  });

  const yTop = alturaCasco * 0.5 + 0.52;

  return (
    <group position={[0, yTop, -0.12]}>
      {/* Mástil secundario de comunicación láser / telemetría (izquierda, igual al póster) */}
      <group position={[-0.92, 0, -0.18]}>
        <mesh position={[0, 0.38, 0]} material={MAT.aceroClaro}>
          <cylinderGeometry args={[0.025, 0.04, 0.76, 12]} />
        </mesh>
        <mesh position={[0, 0.78, 0]} material={MAT.oroMli}>
          <cylinderGeometry args={[0.06, 0.06, 0.14, 12]} />
        </mesh>
        <mesh position={[0, 0.9, 0]} material={MAT.cianIntenso}>
          <sphereGeometry args={[0.055, 16, 16]} />
        </mesh>
      </group>

      {/* Torreta cardán del plato parabólico principal */}
      <mesh position={[0, 0.18, 0]} material={MAT.titanio}>
        <cylinderGeometry args={[0.14, 0.22, 0.36, 16]} />
      </mesh>

      <group ref={grupoPlato} position={[0, 0.38, 0]} rotation={[0.38, -0.18, 0]}>
        {/* Plato parabólico principal */}
        <mesh geometry={geoParabola} material={MAT.platoBlanco} castShadow />
        {/* Aro de borde metálico */}
        <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.aceroClaro}>
          <torusGeometry args={[radioPlato, 0.024, 10, 48]} />
        </mesh>

        {/* Trípode del alimentador de banda profunda + emisor óptico láser */}
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
          <mesh
            key={a}
            position={[Math.cos(a) * radioPlato * 0.42, 0.48, Math.sin(a) * radioPlato * 0.42]}
            rotation={[Math.sin(a) * 0.52, 0, -Math.cos(a) * 0.52]}
            material={MAT.titanio}
          >
            <cylinderGeometry args={[0.016, 0.016, radioPlato * 0.88, 8]} />
          </mesh>
        ))}

        {/* Cabezal alimentador Ka / X y lente láser */}
        <mesh position={[0, 0.74, 0]} material={dobleReflector ? MAT.oroMli : MAT.estructuraOscura}>
          <cylinderGeometry args={[0.14, 0.09, 0.22, 16]} />
        </mesh>
        <mesh position={[0, 0.87, 0]} material={matLuz}>
          <sphereGeometry args={[0.065, 16, 16]} />
        </mesh>

        {/* Haz de transmisión láser de espacio profundo cuando está en fase 5 (Transmisión) */}
        {laserActivo && (
          <mesh position={[0, 4.2, 0]} material={MAT.hazGuia}>
            <cylinderGeometry args={[0.03, 0.12, 6.8, 16, 1, true]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/* ───────────── Subcomponente: Bahía Frontal de Despliegue de Mini Drones ───────────── */
function BahiaDespliegueFrontal({ radioCasco, alturaCasco, bahiaAbierta = true, matCasco, matLuz }) {
  const rampaInf = useRef();
  const compuertaSup = useRef();
  const hazRef = useRef();
  const texRiel = useMemo(() => texturaRielBahia(), []);

  useFrame((_, dt) => {
    const objetivoRampa = bahiaAbierta ? 0.52 : -1.42;
    const objetivoSup = bahiaAbierta ? -0.35 : 0.95;
    if (rampaInf.current && Math.abs(rampaInf.current.rotation.x - objetivoRampa) > 0.001) {
      rampaInf.current.rotation.x = THREE.MathUtils.damp(rampaInf.current.rotation.x, objetivoRampa, 5, dt);
    }
    if (compuertaSup.current && Math.abs(compuertaSup.current.rotation.x - objetivoSup) > 0.001) {
      compuertaSup.current.rotation.x = THREE.MathUtils.damp(compuertaSup.current.rotation.x, objetivoSup, 5, dt);
    }
    if (hazRef.current && hazRef.current.visible !== bahiaAbierta) {
      hazRef.current.visible = bahiaAbierta;
    }
  });

  const zFrente = radioCasco * 0.86;

  return (
    <group position={[0, -0.04, zFrente]}>
      {/* Pórtico blindado trapezoidal exterior (fiel al póster ASTRION-X) */}
      {/* Dintel superior con bisel y luces azules */}
      <mesh position={[0, alturaCasco * 0.42, 0.14]} castShadow material={matCasco}>
        <boxGeometry args={[1.95, 0.28, 0.46]} />
      </mesh>
      {/* Dos faros circulares/rectangulares azules sobre la bahía como en el póster */}
      {[-0.72, 0.72].map((x) => (
        <group key={x} position={[x, alturaCasco * 0.36, 0.36]}>
          <mesh material={MAT.estructuraOscura}>
            <cylinderGeometry args={[0.13, 0.15, 0.08, 16]} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>
          <mesh position={[0, 0, 0.03]} material={MAT.cianIntenso}>
            <sphereGeometry args={[0.085, 16, 16]} />
          </mesh>
        </group>
      ))}

      {/* Pilares laterales blindados de la bahía */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.92, 0, 0.1]}>
          <mesh castShadow receiveShadow material={matCasco}>
            <boxGeometry args={[0.32, alturaCasco * 0.88, 0.52]} />
          </mesh>
          {/* Aletas mecánicas laterales abiertas */}
          <mesh
            position={[s * 0.22, -0.06, 0.24]}
            rotation={[0, s * (bahiaAbierta ? 0.42 : 0.05), 0]}
            material={MAT.titanio}
          >
            <boxGeometry args={[0.12, alturaCasco * 0.64, 0.44]} />
          </mesh>
          {/* Tira LED vertical interior */}
          <mesh position={[-s * 0.14, 0, 0.12]} material={matLuz}>
            <boxGeometry args={[0.03, alturaCasco * 0.68, 0.04]} />
          </mesh>
        </group>
      ))}

      {/* Cavidad interior del hangar de mini-drones */}
      <mesh position={[0, 0, -0.38]} material={MAT.negroOptico}>
        <boxGeometry args={[1.52, alturaCasco * 0.74, 0.96]} />
      </mesh>

      {/* Piso interior con textura de rieles electromagnéticos cian */}
      <mesh position={[0, -alturaCasco * 0.34, -0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.38, 1.15]} />
        <meshBasicMaterial map={texRiel} toneMapped={false} />
      </mesh>

      {/* Racks modulares internos (vacíos, listos para integrar mini-drones de otro miembro del equipo) */}
      {[-0.52, 0.52].map((x) => (
        <group key={x} position={[x, 0.05, -0.35]}>
          <mesh material={MAT.titanio}>
            <boxGeometry args={[0.16, 0.42, 0.75]} />
          </mesh>
          <mesh position={[0, -0.12, 0.1]} material={MAT.oroMli}>
            <boxGeometry args={[0.18, 0.08, 0.52]} />
          </mesh>
        </group>
      ))}

      {/* Tira de iluminación cenital azul neón dentro de la bahía */}
      <mesh position={[0, alturaCasco * 0.32, -0.1]} material={MAT.cianIntenso}>
        <boxGeometry args={[1.32, 0.03, 0.62]} />
      </mesh>

      {/* Compuerta superior articulada */}
      <group ref={compuertaSup} position={[0, alturaCasco * 0.34, 0.28]}>
        <mesh position={[0, -0.14, 0.12]} material={MAT.grafito}>
          <boxGeometry args={[1.48, 0.28, 0.06]} />
        </mesh>
      </group>

      {/* Rampa inferior articulada con guías luminosas */}
      <group ref={rampaInf} position={[0, -alturaCasco * 0.36, 0.24]}>
        <mesh position={[0, 0, 0.32]} castShadow material={MAT.estructuraOscura}>
          <boxGeometry args={[1.46, 0.06, 0.68]} />
        </mesh>
        {[-0.54, 0.54].map((x) => (
          <mesh key={x} position={[x, 0.038, 0.34]} material={matLuz}>
            <boxGeometry args={[0.05, 0.02, 0.58]} />
          </mesh>
        ))}
      </group>

      {/* Haz guía holográfico proyectado hacia afuera (sin el mini-dron) */}
      <mesh
        ref={hazRef}
        position={[0, -0.26, 1.05]}
        rotation={[Math.PI / 2 + 0.18, 0, 0]}
        material={MAT.hazGuia}
      >
        <cylinderGeometry args={[0.42, 0.78, 1.85, 24, 1, true]} />
      </mesh>
    </group>
  );
}

/* ───────────── Subcomponente: Propulsión Iónica + Química Inferior y Trasera ───────────── */
function SistemaPropulsion({ radioCasco, alturaCasco, numToberas = 4, propulsionActiva = true }) {
  const plumaRef = useRef();

  useFrame(({ clock }) => {
    if (!plumaRef.current || !propulsionActiva) return;
    const pulso = 1 + Math.sin(clock.elapsedTime * 28) * 0.09;
    plumaRef.current.scale.set(1, pulso, 1);
  });

  const yFondo = -alturaCasco * 0.5;

  return (
    <group>
      {/* Placa base octogonal de propulsión y gestión térmica */}
      <mesh position={[0, yFondo - 0.08, 0]} material={MAT.estructuraOscura}>
        <cylinderGeometry args={[radioCasco * 0.82, radioCasco * 0.68, 0.18, 8]} />
      </mesh>

      {/* Anillo iónico central bajo el casco */}
      <mesh position={[0, yFondo - 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.cianLuz}>
        <torusGeometry args={[radioCasco * 0.45, 0.04, 12, 48]} />
      </mesh>

      {/* Toberas iónicas perimetrales (brillo azul debajo del casco como en el póster) */}
      <group ref={plumaRef}>
        {Array.from({ length: numToberas }, (_, i) => {
          const ang = (i / numToberas) * Math.PI * 2 + Math.PI / numToberas;
          const x = Math.cos(ang) * radioCasco * 0.58;
          const z = Math.sin(ang) * radioCasco * 0.58;
          return (
            <group key={i} position={[x, yFondo - 0.16, z]}>
              <mesh material={MAT.titanio}>
                <cylinderGeometry args={[0.24, 0.3, 0.16, 20]} />
              </mesh>
              <mesh position={[0, -0.09, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.cianIntenso}>
                <ringGeometry args={[0.06, 0.25, 24]} />
              </mesh>
              {propulsionActiva && (
                <>
                  <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]} material={MAT.plasmaIonico}>
                    <coneGeometry args={[0.26, 0.75, 20, 1, true]} />
                  </mesh>
                  <mesh position={[0, -0.32, 0]} rotation={[Math.PI, 0, 0]} material={MAT.plasmaNucleo}>
                    <coneGeometry args={[0.13, 0.46, 16, 1, true]} />
                  </mesh>
                </>
              )}
            </group>
          );
        })}
      </group>

      {/* Toberas químicas gemelas en la popa (-Z) para empuje orbital pesado */}
      {[-0.55, 0.55].map((x) => (
        <group key={x} position={[x, 0, -radioCasco * 0.92]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh material={MAT.titanio}>
            <cylinderGeometry args={[0.16, 0.28, 0.38, 20]} />
          </mesh>
          <mesh position={[0, -0.2, 0]} material={MAT.cianIntenso}>
            <cylinderGeometry args={[0.22, 0.12, 0.04, 16]} />
          </mesh>
          {propulsionActiva && (
            <mesh position={[0, -0.62, 0]} rotation={[Math.PI, 0, 0]} material={MAT.plasmaIonico}>
              <coneGeometry args={[0.24, 0.9, 18, 1, true]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* ───────────── Componente Principal: Nave Nodriza 3D (3 Modelos) ───────────── */
export default function Nodriza3D({
  modelo = 'astrion_x',
  configuracion3D,
  colorCasco = '#e6edf5',
  colorAcento = '#38bdf8',
  desplegado = 1,
  bahiaAbierta = true,
  propulsionActiva = true,
  escanerActivo = false,
  laserActivo = false,
  girar = false,
  ...props
}) {
  const grupoRaiz = useRef();

  const cfg = configuracion3D || {
    ladosCasco: 8,
    radioCasco: 2.35,
    alturaCasco: 1.15,
    numPaneles: 4,
    largoPanel: 3.85,
    anchoPanel: 1.55,
    anguloPaneles: [0.62, 2.52, -2.52, -0.62],
    radioPlato: 1.05,
    rtg: 2,
    toberasIonicas: 4,
  };

  const matCasco = useMaterialDinamico(colorCasco, 0.48, 0.3);
  const matMarco = useMaterialDinamico('#d4dde6', 0.72, 0.28);
  const matLuz = useMemo(
    () => new THREE.MeshBasicMaterial({ color: colorAcento, toneMapped: false }),
    [colorAcento]
  );
  useEffect(() => () => matLuz.dispose(), [matLuz]);

  useFrame(({ clock }, dt) => {
    if (!grupoRaiz.current || (!girar && !propulsionActiva)) return;
    if (girar) {
      grupoRaiz.current.rotation.y += dt * 0.14;
    }
    if (propulsionActiva) {
      grupoRaiz.current.position.y = Math.sin(clock.elapsedTime * 1.3) * 0.06;
    }
  });

  const {
    ladosCasco,
    radioCasco,
    alturaCasco,
    largoPanel,
    anchoPanel,
    anguloPaneles,
    radioPlato,
    rtg,
    toberasIonicas,
  } = cfg;

  // Caras del casco octogonal/hexagonal (excepto la cara frontal +Z que aloja la Bahía de Despliegue)
  const carasPerimetro = useMemo(() => {
    const lista = [];
    for (let i = 0; i < ladosCasco; i++) {
      const ang = (i / ladosCasco) * Math.PI * 2;
      // Saltamos la cara frontal (ang ≈ 0) porque ahí va la Bahía de Despliegue
      if (Math.abs(Math.sin(ang)) < 0.35 && Math.cos(ang) > 0.7) continue;
      lista.push({ i, ang });
    }
    return lista;
  }, [ladosCasco]);

  return (
    <group {...props}>
      <group ref={grupoRaiz}>
        {/* 1. NÚCLEO ESTRUCTURAL DEL CASCO */}
        <mesh
          rotation={[0, Math.PI / ladosCasco, 0]}
          castShadow
          receiveShadow
          material={MAT.estructuraOscura}
        >
          <cylinderGeometry args={[radioCasco * 0.94, radioCasco * 0.9, alturaCasco, ladosCasco]} />
        </mesh>

        {/* Cubierta superior e inferior biselada en cerámica-titanio blanco */}
        <mesh
          position={[0, alturaCasco * 0.48, 0]}
          rotation={[0, Math.PI / ladosCasco, 0]}
          castShadow
          receiveShadow
          material={matCasco}
        >
          <cylinderGeometry args={[radioCasco * 0.84, radioCasco * 0.98, 0.14, ladosCasco]} />
        </mesh>
        <mesh
          position={[0, -alturaCasco * 0.48, 0]}
          rotation={[0, Math.PI / ladosCasco, 0]}
          receiveShadow
          material={matCasco}
        >
          <cylinderGeometry args={[radioCasco * 0.96, radioCasco * 0.8, 0.14, ladosCasco]} />
        </mesh>

        {/* Placas de blindaje perimetrales, aislamiento dorado MLI y sensores ópticos */}
        {carasPerimetro.map(({ i, ang }) => (
          <group key={i} rotation={[0, ang, 0]}>
            <group position={[0, 0, radioCasco * 0.88]}>
              {/* Placa blindada biselada */}
              <mesh castShadow receiveShadow material={i % 2 === 0 ? matCasco : MAT.aceroClaro}>
                <boxGeometry args={[radioCasco * 0.68, alturaCasco * 0.78, 0.14]} />
              </mesh>
              {/* Banda térmica dorada MLI en cavidades laterales */}
              <mesh position={[0, 0, -0.03]} material={MAT.oroMli}>
                <boxGeometry args={[radioCasco * 0.74, alturaCasco * 0.36, 0.1]} />
              </mesh>
              {/* Ranura emisora azul cian en cada cara */}
              <mesh position={[0, -alturaCasco * 0.24, 0.08]} material={matLuz}>
                <boxGeometry args={[radioCasco * 0.42, 0.055, 0.02]} />
              </mesh>
              {/* Lente de espectrómetro / sensor científico */}
              <mesh position={[0, alturaCasco * 0.16, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={MAT.negroOptico}>
                <cylinderGeometry args={[0.11, 0.13, 0.06, 16]} />
              </mesh>
              <mesh position={[0, alturaCasco * 0.16, 0.115]} material={MAT.cianIntenso}>
                <sphereGeometry args={[0.065, 14, 14]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* 2. BAHÍA FRONTAL DE DESPLIEGUE DE MINI DRONES (+Z) */}
        <BahiaDespliegueFrontal
          radioCasco={radioCasco}
          alturaCasco={alturaCasco}
          bahiaAbierta={bahiaAbierta}
          matCasco={matCasco}
          matLuz={matLuz}
        />

        {/* 3. BRAZOS TÁCTICOS LATERALES CON PROPULSORES Y SENSORES */}
        <BrazoTacticoLateral
          lado={-1}
          radio={radioCasco}
          matCasco={matCasco}
          matLuz={matLuz}
          propulsionActiva={propulsionActiva}
        />
        <BrazoTacticoLateral
          lado={1}
          radio={radioCasco}
          matCasco={matCasco}
          matLuz={matLuz}
          propulsionActiva={propulsionActiva}
        />

        {/* 4. PANELES SOLARES ARTICULADOS */}
        {anguloPaneles.map((ang, idx) => (
          <AlaSolarNodriza
            key={idx}
            largo={largoPanel}
            ancho={anchoPanel}
            angulo={ang}
            radioAnclaje={radioCasco}
            desplegado={desplegado}
            esConcentrador={modelo === 'astrion_v'}
            enFlecha={modelo === 'astrion_s'}
            matMarco={matMarco}
            matLuz={matLuz}
          />
        ))}

        {/* 5. GENERADORES DE RADIOISÓTOPOS (RTG) */}
        {rtg >= 2 &&
          Array.from({ length: rtg }, (_, idx) => {
            const ang = ((idx + 0.5) / rtg) * Math.PI * 2 + Math.PI / 4;
            return <ModuloRtg key={idx} angulo={ang} radio={radioCasco * 0.95} />;
          })}

        {/* 6. NÚCLEO DE IA Y CONTROL (ASTRION-CORE) */}
        <NucleoAstrionCore
          alturaCasco={alturaCasco}
          radioCasco={radioCasco}
          matCasco={matCasco}
          matLuz={matLuz}
          escanerActivo={escanerActivo}
          variante={modelo}
        />

        {/* 7. ANTENA DE COMUNICACIÓN (LÁSER Y RADIO DE BANDA PROFUNDA) */}
        <AntenaBandaProfunda
          alturaCasco={alturaCasco}
          radioPlato={radioPlato}
          laserActivo={laserActivo}
          dobleReflector={modelo === 'astrion_v'}
          matLuz={matLuz}
        />

        {/* 8. SISTEMA DE PROPULSIÓN HÍBRIDA (IÓNICA + QUÍMICA) */}
        <SistemaPropulsion
          radioCasco={radioCasco}
          alturaCasco={alturaCasco}
          numToberas={toberasIonicas}
          propulsionActiva={propulsionActiva}
        />
      </group>
    </group>
  );
}

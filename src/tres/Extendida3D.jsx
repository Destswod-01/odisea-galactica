// Escena 3D de la etapa 08 «Misión extendida»: la nave del jugador (con su diseño del hangar) orbita el destino, el Sol tiene dirección real y los
// eclipses se ven (la nave entra en la sombra del planeta y la luz baja). Los paneles brillan según la generación y un halo térmico se tiñe de azul (frío)
// o naranja (calor). Al final, la escena muestra la disposición: hundirse con su estela, quedarse en órbita o alejarse.
// La pantalla (Extendida.jsx) manda el estado del motor por un ref; aquí nada se guarda en React.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG_EXTENDIDA as C, generacionExt } from '../motor/extendida08.js';
import { Destino3D } from './PlanetasHD.jsx';
import Nave3D from './Nave3D.jsx';

const FOV = 40, R_PLANETA = 3.2, R_ORBITA = 5.4, ESCALA_NAVE = 0.2, N_ESTELA = 18, ANCHO_VISTO = 15.5;
const SOL = new THREE.Vector3(1, 0.3, 0.55).normalize(); // dirección hacia el Sol
const E1 = SOL.clone().negate(); // el eje de la órbita que apunta a la sombra
const E2 = new THREE.Vector3(0.1, 1, -0.2).cross(E1).normalize().add(new THREE.Vector3(0, 0.35, 0)).normalize(); // plano algo inclinado
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (v) => v * v * (3 - 2 * v);
const COLOR_EVENTO = { eclipse: '#7aa6ff', tormenta: '#ffb04a', pico: '#ff6a4a', micro: '#ffffff', giro: '#d58bff', seguro: '#ff4a4a', temp: '#ff8a4a', daño: '#ff4a4a', ok: '#6bffb0' };

// Posición orbital de la nave: ángulo base + un empujón hacia la sombra cuando hay eclipse.
function posicionOrbita(s, tVisual, salida) {
  const base = tVisual * 0.35;
  let w = 0;
  if (s.eclipse > 0) w = suave(acotar(Math.min((s.eclipseTotal - s.eclipse) / 0.9, s.eclipse / 0.9), 0, 1));
  const resto = ((base % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI; // ángulo en [−π, π]
  const th = base + (0 - resto) * w;
  salida.copy(E1).multiplyScalar(Math.cos(th) * R_ORBITA).addScaledVector(E2, Math.sin(th) * R_ORBITA);
  return w;
}

function Escena({ estadoRef, destino, diseno, estetica }) {
  const { camera, size } = useThree();
  const raiz = useRef(null), nave = useRef(null), sol = useRef(null), ambiente = useRef(null), luzNave = useRef(null), cono = useRef(null);
  const halo = useRef(null), calor = useRef(null), estela = useRef([]), pings = useRef([]), flash = useRef(null);
  const vis = useRef({ t: 0, p: new THREE.Vector3(), ultimoEv: undefined, cierre: null, histo: [], ping: 0, nivel: 1 });
  const jupiter = destino === 'jupiter';
  const sinMovimiento = useMemo(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const rec = useMemo(() => ({
    geoHalo: new THREE.SphereGeometry(1, 24, 16), geoAnillo: new THREE.RingGeometry(0.9, 1, 40), geoCono: new THREE.CylinderGeometry(R_PLANETA * 0.97, R_PLANETA * 0.97, 9, 28, 1, true),
    geoEstela: new THREE.SphereGeometry(1, 8, 6), geoFlash: new THREE.SphereGeometry(1, 16, 12),
    matHalo: new THREE.MeshBasicMaterial({ color: '#ffd37a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    matCalor: new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, toneMapped: false }),
    matCono: new THREE.MeshBasicMaterial({ color: '#000814', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    matEstela: new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    matFlash: new THREE.MeshBasicMaterial({ color: '#fff1c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    matsPing: Array.from({ length: 3 }, () => new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })),
  }), []);
  useEffect(() => () => {
    for (const k of Object.keys(rec)) { if (Array.isArray(rec[k])) rec[k].forEach(m => m.dispose()); else rec[k].dispose(); }
  }, [rec]);
  // El cono de sombra apunta del planeta hacia la dirección opuesta al Sol.
  useEffect(() => { cono.current?.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), E1); cono.current?.position.copy(E1).multiplyScalar(4.5); }, []);

  useFrame((_, dtCrudo) => {
    const dt = Math.min(dtCrudo, 0.1), s = estadoRef.current, v = vis.current, ahora = performance.now();
    if (!s) return;
    // Encuadre: cabe el ancho de la órbita en vertical y en horizontal; en vertical se sube la escena para dejar sitio al HUD de abajo.
    const aspecto = size.width / Math.max(1, size.height), alto = Math.max(ANCHO_VISTO / aspecto, 11), dist = alto / (2 * Math.tan(FOV * Math.PI / 360));
    camera.aspect = aspecto; camera.fov = FOV; camera.position.set(0, 1.2, dist); camera.lookAt(0, 0, 0); camera.near = 0.5; camera.far = 300; camera.updateProjectionMatrix();
    raiz.current.position.set(aspecto > 1.2 ? 1.6 : 0, aspecto > 1.2 ? -0.2 : 1.3, 0);
    if (s.fase !== 'pausa' && s.fase !== 'ficha') v.t += dt;

    const cierre = s.fase === 'cierre';
    if (cierre && v.cierre == null) v.cierre = 0;
    if (cierre) v.cierre += dt; else v.cierre = null;
    const p = cierre ? acotar(v.cierre / 4.5, 0, 1) : 0;

    // Luz: el eclipse baja la luz del Sol y la de la nave; en «Ciencia» la nave mira lejos del Sol.
    const w = posicionOrbita(s, v.t, v.p), meta = 1 - 0.62 * w;
    v.nivel += (meta - v.nivel) * (1 - Math.exp(-5 * dt));
    if (sol.current) sol.current.intensity = (jupiter ? 3.2 : 3.8) * v.nivel;
    if (ambiente.current) ambiente.current.intensity = 0.2 * (0.6 + 0.4 * v.nivel);
    if (luzNave.current) luzNave.current.intensity = 6 * v.nivel;

    // Posición de la nave según la escena: órbita, hundimiento (impacto, hundir, choque) o alejamiento (silencio).
    const f = s.final, hunde = cierre && (f === 'hundir' || f === 'impacto' || f === 'choque'), aleja = cierre && f === 'silencio';
    const pos = nave.current.position;
    let esc = ESCALA_NAVE;
    if (hunde) {
      const q = suave(p), r = R_ORBITA + (R_PLANETA * 0.96 - R_ORBITA) * q;
      pos.copy(v.p).normalize().multiplyScalar(r); esc *= 1 - 0.6 * q;
      v.p.copy(pos);
    } else if (aleja) {
      pos.copy(v.p).normalize().multiplyScalar(R_ORBITA + 18 * p * p); esc *= 1 - 0.8 * p;
    } else pos.copy(v.p);
    nave.current.scale.setScalar(Math.max(0.001, esc));
    nave.current.visible = !(hunde && p >= 1);
    nave.current.rotation.set(0, 0, 0.35);

    // Estela: puntos que siguen a la nave y se encogen; se enciende al hundirse o con los motores de corrección.
    const encendida = hunde && p > 0.05 && p < 1;
    if (encendida) v.histo.unshift(pos.clone()); else if (v.histo.length) v.histo.pop();
    if (v.histo.length > N_ESTELA) v.histo.length = N_ESTELA;
    estela.current.forEach((m, i) => {
      const h = v.histo[i];
      if (!m) return;
      m.visible = !!h && encendida;
      if (m.visible) { m.position.copy(h); m.scale.setScalar(Math.max(0.01, 0.18 * (1 - i / N_ESTELA))); }
    });

    // Destello del impacto
    if (flash.current) {
      const q = hunde && p > 0.92 ? (p - 0.92) / 0.08 : 0;
      flash.current.visible = q > 0; flash.current.position.copy(v.p);
      flash.current.scale.setScalar(0.3 + q * 1.6); rec.matFlash.opacity = q > 0 ? (1 - q * 0.6) * (f === 'hundir' ? 0.5 : 0.9) : 0;
    }

    // Halo: dorado según la generación; halo térmico azul (frío) o naranja (calor).
    const gen = s.genBase > 0 ? acotar(generacionExt(s) / s.genBase, 0, 1.2) : 0;
    halo.current.position.copy(pos); halo.current.scale.setScalar(1.5 * (esc / ESCALA_NAVE) + 0.2); rec.matHalo.opacity = cierre ? 0.04 : 0.04 + 0.2 * gen * (0.85 + 0.15 * Math.sin(ahora / 400));
    const frio = acotar((C.TEMP_MIN + 14 - s.temperatura) / 20, 0, 1), caliente = acotar((s.temperatura - (C.TEMP_MAX - 14)) / 20, 0, 1);
    calor.current.position.copy(pos); calor.current.scale.setScalar(1.9 * (esc / ESCALA_NAVE) + 0.3);
    rec.matCalor.color.set(caliente > frio ? '#ff8a2a' : '#4aa8ff'); rec.matCalor.opacity = cierre ? 0 : 0.5 * Math.max(frio, caliente);
    if (luzNave.current) luzNave.current.position.copy(pos).addScaledVector(SOL, 1.2);

    // Destellos de eventos: un anillo que se expande desde la nave.
    if (v.ultimoEv === undefined) v.ultimoEv = s.evSeq || 0;
    for (const ev of s.eventos || []) {
      if (ev.id <= v.ultimoEv) continue;
      v.ultimoEv = ev.id;
      const k = v.ping++ % 3, m = pings.current[k];
      if (m) { m.userData = { t0: ahora, color: COLOR_EVENTO[ev.tipo] || '#fff' }; rec.matsPing[k].color.set(m.userData.color); }
    }
    pings.current.forEach((m, k) => {
      if (!m) return;
      const e = m.userData?.t0 ? (ahora - m.userData.t0) / (sinMovimiento ? 300 : 900) : 2;
      m.visible = e < 1; if (m.visible) { m.position.copy(pos); m.quaternion.copy(camera.quaternion); m.scale.setScalar(0.6 + e * 3.2); rec.matsPing[k].opacity = 0.9 * (1 - e); }
    });
  });

  return <>
    <color attach="background" args={['#02050c']} />
    <ambientLight ref={ambiente} intensity={0.2} color="#8fa6c8" />
    <directionalLight ref={sol} position={SOL.clone().multiplyScalar(30).toArray()} intensity={3.6} color="#fff4de" />
    <Stars radius={90} depth={40} count={2600} factor={5} saturation={0} fade speed={0} />
    <group ref={raiz}>
      {/* El planeta carga su textura (suspende): va en su propio Suspense para que el resto de la escena se dibuje mientras tanto. */}
      <Suspense fallback={null}><Destino3D destino={jupiter ? 'jupiter' : 'luna'} radio={jupiter ? R_PLANETA : R_PLANETA / 0.75} /></Suspense>
      <mesh ref={cono} geometry={rec.geoCono} material={rec.matCono} />
      <group ref={nave}><Nave3D diseno={diseno} estetica={estetica} girar /></group>
      <pointLight ref={luzNave} color="#fff1d8" intensity={6} distance={8} decay={2} />
      <mesh ref={halo} geometry={rec.geoHalo} material={rec.matHalo} renderOrder={3} />
      <mesh ref={calor} geometry={rec.geoHalo} material={rec.matCalor} renderOrder={3} />
      {Array.from({ length: N_ESTELA }, (_, i) => <mesh key={i} ref={el => { estela.current[i] = el; }} geometry={rec.geoEstela} material={rec.matEstela} visible={false} renderOrder={4} />)}
      <mesh ref={flash} geometry={rec.geoFlash} material={rec.matFlash} visible={false} renderOrder={5} />
      {rec.matsPing.map((m, k) => <mesh key={k} ref={el => { pings.current[k] = el; }} geometry={rec.geoAnillo} material={m} visible={false} renderOrder={6} />)}
    </group>
  </>;
}

export default function Extendida3D({ estadoRef, destino, diseno, estetica }) {
  return <Canvas className="ext-canvas" dpr={[1, 1.5]} camera={{ fov: FOV, near: 0.5, far: 300, position: [0, 1.2, 24] }} gl={{ antialias: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
    <Escena estadoRef={estadoRef} destino={destino} diseno={diseno} estetica={estetica} />
  </Canvas>;
}

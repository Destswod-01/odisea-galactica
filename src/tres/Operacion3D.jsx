// Escena 3D de la etapa 07 «Operación científica» (ver docs/OPERACION_07.md, sección «v2 · 3D»). Una sola escena a pantalla completa con tres subescenas:
//   1 · Cartografía: franja de superficie que avanza bajo la nave (Luna con cráteres 3D y Sol bajo; Júpiter con bandas de nubes y vórtices), horizonte curvo,
//       hologramas dorados en las posiciones del motor y la retícula turquesa en la fila del visor. Mapeo LINEAL motor → mundo (operacion07Mapa.js).
//   2 · Espectro: la nave apunta su espectrómetro a la pluma de LCROSS (partículas, Luna) o al limbo de Júpiter (capas); el color sigue tu hipótesis.
//   3 · Transmisión: la nave con un plato de antena que gira con el ángulo del motor, la Tierra en el ángulo objetivo y un cono de haz con paquetes de datos.
// La pantalla (Operacion07.jsx) manda el estado del motor por un ref (`estadoRef`); aquí no se guarda nada en React. Los paneles HUD de vidrio viven en la pantalla.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG_OPERACION as C, GASES, ajusteEspectral, anguloTierra, calidadSenal, velocidadObjetivos } from '../motor/operacion07.js';
import { K_MUNDO, alturaSuelo, direccionAntena, giroAntena, mezclaGases, mundoRadio, mundoX, mundoZ } from '../motor/operacion07Mapa.js';
import Nave3D from './Nave3D.jsx';
import { Jupiter3D, Luna3D, Tierra3D } from './PlanetasHD.jsx';

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (a, b, v) => { const t = acotar((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (a, b) => { const t = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return t - Math.floor(t); };
const fract = v => v - Math.floor(v);
const EJE_Y = new THREE.Vector3(0, 1, 0);

// ---------- Texturas y materiales hechos a mano ----------
function texturaGlow() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Espiral de un vórtice de Júpiter: brazos crema sobre transparente.
function texturaEspiral() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); x.translate(128, 128);
  const fondo = x.createRadialGradient(0, 0, 4, 0, 0, 126);
  fondo.addColorStop(0, 'rgba(255,244,222,.9)'); fondo.addColorStop(0.6, 'rgba(226,170,120,.55)'); fondo.addColorStop(1, 'rgba(180,110,70,0)');
  x.fillStyle = fondo; x.beginPath(); x.arc(0, 0, 126, 0, Math.PI * 2); x.fill();
  x.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    x.beginPath();
    for (let a = 0; a < 9; a += 0.1) { const r = 6 + a * 13, ang = a + k * Math.PI / 2; x[a === 0 ? 'moveTo' : 'lineTo'](Math.cos(ang) * r, Math.sin(ang) * r); }
    x.strokeStyle = k % 2 ? 'rgba(255,255,255,.5)' : 'rgba(110,60,38,.45)'; x.lineWidth = 9; x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// Material de haz (cono o cilindro abierto): bordes suaves por ángulo de vista y un degradado a lo largo (uv.y: 0 base, 1 punta).
function crearHaz(color, { a0 = 1, a1 = 1, borde = 1.5 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: 0.3 }, uA0: { value: a0 }, uA1: { value: a1 }, uBorde: { value: borde } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.0); vV=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOp; uniform float uA0; uniform float uA1; uniform float uBorde; varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ float f=pow(abs(dot(normalize(vN),normalize(vV))),uBorde); float a=mix(uA0,uA1,vUv.y); gl_FragColor=vec4(uColor,f*a*uOp);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
}
// Coloca un cilindro unitario (punta arriba en uv.y = 1) con la punta en `desde` y la base en `hasta`, de radio `radio` en la base.
const _v = new THREE.Vector3();
function orientarHaz(m, desde, hasta, radio) {
  _v.copy(desde).sub(hasta); const L = Math.max(_v.length(), 1e-3);
  m.position.copy(desde).add(hasta).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(EJE_Y, _v.multiplyScalar(1 / L));
  m.scale.set(radio, L, radio);
}
const geometriaHaz = () => new THREE.CylinderGeometry(0.06, 1, 1, 28, 1, true);

// ---------- Estado compartido de la escena ----------
// `mundo`: reloj propio (se detiene en pausa) y avance de la superficie, que integra la misma velocidad del motor. Corre ANTES que el resto de los cuadros.
function useMundo(estadoRef) {
  const mundo = useRef({ t: 0, scroll: 0, vel: 0 });
  useFrame((_, dtCrudo) => {
    const s = estadoRef.current, m = mundo.current, dt = Math.min(dtCrudo, 0.1);
    m.pausa = s.fase === 'pausa';
    if (m.pausa) return;
    m.t += dt;
    if (s.f === 1) {
      m.vel = velocidadObjetivos(s.g.capturas || 0) * K_MUNDO;
      m.scroll += m.vel * dt * (s.fase === 'jugando' ? 1 : s.fase === 'ficha' ? 0.35 : 0.15);
    }
  }, -10);
  return mundo;
}

// ---------- Cámara ----------
// Encuadre que calza una región mínima (`need`: media anchura y media altura en la vista) aunque el HUD de vidrio tape una parte del lienzo: la zona libre se
// calcula midiendo el HUD en el DOM (a la derecha en pantalla ancha, abajo en celular vertical) y la escena se corre con `setViewOffset` hacia la zona libre.
function Rig({ hudRef, mira, dir, need, fov, calmo }) {
  const { camera, size, gl } = useThree();
  const med = useRef({ n: 0, fx: 0, fy: 0 });
  useEffect(() => () => { camera.clearViewOffset?.(); }, [camera]);
  useFrame(() => {
    const m = med.current, W = size.width, H = size.height;
    if (m.n++ % 15 === 0) {
      let fx = 0, fy = 0; const hud = hudRef?.current, canvas = gl.domElement;
      if (hud && canvas) {
        const h = hud.getBoundingClientRect(), c = canvas.getBoundingClientRect();
        if (c.width > 10 && c.height > 10 && h.width > 4) {
          if (h.width < c.width * 0.7) fx = acotar((c.right - h.left) / c.width, 0, 0.6); else fy = acotar((c.bottom - h.top) / c.height, 0, 0.7);
        }
      }
      m.fx = fx; m.fy = fy;
    }
    const Wv = Math.max(10, W * (1 - m.fx)), Hv = Math.max(10, H * (1 - m.fy)), aspecto = Wv / Hv, t = Math.tan((fov * Math.PI) / 360);
    const dist = Math.max(need.hh / t, need.hw / (aspecto * t));
    const sway = calmo ? 0 : Math.sin(performance.now() / 2400) * 0.12;
    camera.fov = fov; camera.aspect = aspecto; camera.near = 0.5; camera.far = 600;
    if (m.fx > 0 || m.fy > 0) camera.setViewOffset(Wv, Hv, 0, 0, W, H); else camera.clearViewOffset();
    camera.position.set(mira[0] + dir[0] * dist + sway, mira[1] + dir[1] * dist, mira[2] + dir[2] * dist);
    camera.lookAt(mira[0], mira[1], mira[2]);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  });
  return null;
}

// ---------- Luces ----------
// Sol direccional con día y noche: oscila despacio alrededor de su posición base y, en los ciclos de noche, baja su intensidad (queda la luz ambiente).
function Luces({ mundo, sol, intensidad, ambiente, ciclo, sombras, calmo }) {
  const luz = useRef(null);
  useFrame(() => {
    const l = luz.current; if (!l) return;
    const th = mundo.current.t * (calmo ? 0 : 0.07);
    const f = ciclo ? 0.45 + 0.55 * suave(-0.3, 0.45, Math.cos(th)) : 1;
    l.intensity = intensidad * f;
    const giro = ciclo ? Math.sin(th) * 0.45 : 0, c = Math.cos(giro), s = Math.sin(giro);
    l.position.set(sol[0] * c - sol[2] * s, sol[1], sol[0] * s + sol[2] * c);
  });
  return <>
    <ambientLight intensity={ambiente} color="#8fa6c8" />
    <directionalLight ref={luz} position={sol} intensity={intensidad} color="#fff2dc" castShadow={sombras} shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-32} shadow-camera-right={32} shadow-camera-top={32} shadow-camera-bottom={-32} shadow-camera-near={1} shadow-camera-far={140} shadow-bias={-0.0006} shadow-normalBias={0.05} />
  </>;
}
function Estrellas({ calmo }) {
  const g = useRef(null);
  useFrame((_, dt) => { if (g.current && !calmo) g.current.rotation.x -= Math.min(dt, 0.1) * 0.012; });
  return <group ref={g}><Stars radius={140} depth={50} count={2600} factor={5} saturation={0} fade speed={0} /></group>;
}

// =====================================================================================================================
// FASE 1 · Cartografía
// =====================================================================================================================
const ANCHO_SUELO = 150, FONDO_SUELO = 170, Z_CENTRO_SUELO = -55, PERIODO_TEX = 60;
function geometriaSuelo(segX, segZ) {
  const g = new THREE.PlaneGeometry(ANCHO_SUELO, FONDO_SUELO, segX, segZ); g.rotateX(-Math.PI / 2); g.translate(0, 0, Z_CENTRO_SUELO);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, alturaSuelo(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

function SueloLuna({ mundo }) {
  const tx = useTexture('./texturas/moon.jpg');
  const geo = useMemo(() => geometriaSuelo(110, 90), []);
  // Copias de la textura (la original está en caché y la usa la esfera de otras fases): se repite, se desliza y se usa también como relieve.
  const { mapa, relieve } = useMemo(() => {
    const m = tx.clone(); m.colorSpace = THREE.SRGBColorSpace; m.wrapS = m.wrapT = THREE.RepeatWrapping; m.repeat.set(ANCHO_SUELO / PERIODO_TEX, FONDO_SUELO / (PERIODO_TEX / 2)); m.anisotropy = 4; m.needsUpdate = true;
    const b = m.clone(); b.colorSpace = THREE.NoColorSpace; b.needsUpdate = true;
    return { mapa: m, relieve: b };
  }, [tx]);
  useEffect(() => () => { geo.dispose(); mapa.dispose(); relieve.dispose(); }, [geo, mapa, relieve]);
  useFrame(() => { const o = mundo.current.scroll / PERIODO_TEX; mapa.offset.x = o; relieve.offset.x = o; });
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial map={mapa} bumpMap={relieve} bumpScale={4} color="#d8d3cb" roughness={1} metalness={0} /></mesh>;
}

// Cráter 3D: malla polar con fondo hundido y borde levantado; el borde y la pared proyectan sombra con el Sol bajo.
function geometriaCrater() {
  const anillos = 14, seg = 30, pos = [], uv = [], idx = [], TMAX = 1.55;
  const perfil = t => (t < 0.9 ? -0.42 * (1 - (t / 0.9) ** 2) : 0) + 0.17 * Math.exp(-(((t - 0.98) / 0.16) ** 2));
  for (let r = 0; r <= anillos; r++) {
    const t = (TMAX * r) / anillos;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2, x = Math.cos(a) * t, z = Math.sin(a) * t;
      pos.push(x, perfil(t), z); uv.push(0.5 + (x / TMAX) * 0.5, 0.5 + (z / TMAX) * 0.5);
    }
  }
  for (let r = 0; r < anillos; r++) for (let s = 0; s < seg; s++) { const a = r * (seg + 1) + s, b = a + seg + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function texturaBordeCrater() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff'); g.addColorStop(0.7, '#fff'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function Crateres({ mundo }) {
  const N = 26, LIM = 38;
  const geo = useMemo(geometriaCrater, []);
  const alfa = useMemo(texturaBordeCrater, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a7a39c', roughness: 1, transparent: true, alphaMap: alfa, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [alfa]);
  const datos = useMemo(() => Array.from({ length: N }, (_, i) => ({ bx: ((i + hash(i, 1)) / N) * 2 * LIM - LIM, z: -13 + hash(i, 2) * 26, r: 0.8 + hash(i, 3) ** 1.6 * 2.6, p: 0.7 + hash(i, 4) * 0.5 })), []);
  const refs = useRef([]);
  useEffect(() => () => { geo.dispose(); alfa.dispose(); mat.dispose(); }, [geo, alfa, mat]);
  useFrame(() => {
    const sc = mundo.current.scroll;
    datos.forEach((d, i) => {
      const m = refs.current[i]; if (!m) return;
      const x = ((((d.bx - sc) % (2 * LIM)) + 3 * LIM) % (2 * LIM)) - LIM, k = suave(LIM, LIM - 6, Math.abs(x));
      m.position.set(x, alturaSuelo(x, d.z) + 0.02, d.z); m.scale.set(d.r * Math.max(k, 0.001), d.r * d.p * Math.max(k, 0.001), d.r * Math.max(k, 0.001)); m.visible = k > 0.01;
    });
  });
  return <>{datos.map((_, i) => <mesh key={i} ref={el => { refs.current[i] = el; }} geometry={geo} material={mat} castShadow receiveShadow />)}</>;
}

function SueloJupiter({ mundo, calmo }) {
  const tx = useTexture('./texturas/jupiter.jpg');
  const geo = useMemo(() => geometriaSuelo(110, 90), []);
  const uDesp = useMemo(() => ({ value: 0 }), []);
  const mapa = useMemo(() => {
    const m = tx.clone(); m.colorSpace = THREE.SRGBColorSpace; m.wrapS = THREE.RepeatWrapping; m.wrapT = THREE.MirroredRepeatWrapping;
    m.repeat.set(ANCHO_SUELO / PERIODO_TEX, FONDO_SUELO / 80); m.offset.set(0, 0.5 - (30 / FONDO_SUELO) * (FONDO_SUELO / 80)); m.anisotropy = 4; m.needsUpdate = true; return m;
  }, [tx]);
  // Cada banda de nubes (franjas de 2,6 en Z) se desliza a su propia velocidad: cizalla como en la atmósfera real.
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.95, metalness: 0, color: '#ffffff' });
    m.onBeforeCompile = sh => {
      sh.uniforms.uDesp = uDesp;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vMundoZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMundoZ = position.z;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uDesp; varying float vMundoZ;').replace('#include <map_fragment>',
        `#ifdef USE_MAP
          float banda = floor((vMundoZ + 200.0) / 2.6); float kb = fract(sin(banda * 12.9898) * 43758.5453);
          vec2 uvB = vMapUv + vec2(uDesp * (0.6 + 0.8 * kb), 0.0);
          vec4 sampledDiffuseColor = texture2D( map, uvB );
          diffuseColor *= sampledDiffuseColor;
        #endif`);
    };
    m.customProgramCacheKey = () => 'op07-jupiter';
    return m;
  }, [mapa, uDesp]);
  useEffect(() => () => { geo.dispose(); mapa.dispose(); mat.dispose(); }, [geo, mapa, mat]);
  useFrame(() => { uDesp.value = (mundo.current.scroll / PERIODO_TEX) * (calmo ? 0.6 : 1); });
  return <mesh geometry={geo}><primitive object={mat} attach="material" /></mesh>;
}

// Vórtices de Júpiter: cúpulas bajas con una espiral que gira; se desplazan con la superficie.
function Vortices({ mundo, calmo }) {
  const N = 8, LIM = 38;
  const geo = useMemo(() => new THREE.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const tex = useMemo(texturaEspiral, []);
  const mats = useMemo(() => Array.from({ length: N }, (_, i) => new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, color: i % 3 === 0 ? '#e8b18a' : i % 3 === 1 ? '#fff0d6' : '#d9946a' })), [tex]);
  const datos = useMemo(() => Array.from({ length: N }, (_, i) => ({ bx: ((i + hash(i, 7)) / N) * 2 * LIM - LIM, z: -14 + hash(i, 8) * 26, r: 1.5 + hash(i, 9) * 2.6, w: (0.35 + hash(i, 10) * 0.8) * (i % 2 ? 1 : -1) })), []);
  const refs = useRef([]), giros = useRef([]);
  useEffect(() => () => { geo.dispose(); tex.dispose(); mats.forEach(m => m.dispose()); }, [geo, tex, mats]);
  useFrame((_, dtc) => {
    const sc = mundo.current.scroll, dt = Math.min(dtc, 0.1), giro = mundo.current.pausa ? 0 : 1;
    datos.forEach((d, i) => {
      const m = refs.current[i], gi = giros.current[i]; if (!m) return;
      const x = ((((d.bx - sc) % (2 * LIM)) + 3 * LIM) % (2 * LIM)) - LIM, k = suave(LIM, LIM - 6, Math.abs(x));
      m.position.set(x, alturaSuelo(x, d.z) + 0.03, d.z); m.scale.set(d.r * 1.35 * Math.max(k, 0.001), d.r * 0.22 * Math.max(k, 0.001), d.r * Math.max(k, 0.001)); m.visible = k > 0.01;
      if (gi && !calmo) gi.rotation.y += d.w * dt * giro;
    });
  });
  return <>{datos.map((_, i) => <group key={i} ref={el => { refs.current[i] = el; }}><mesh ref={el => { giros.current[i] = el; }} geometry={geo} material={mats[i]} /></group>)}</>;
}

// Hologramas dorados (cuadro y anillos del boceto) en las posiciones del motor; al capturarlos brillan en verde y suben.
const COLORES_HOLO = { marco: '#ffd390', a1: '#f2d9a0', a2: '#c9a463', cerca: '#fff6d6', ok: '#67f0ba' };
function Objetivos({ estadoRef, mundo, calmo }) {
  const N = 16;
  const geos = useMemo(() => {
    const marco = new THREE.RingGeometry(0.86, 1, 4, 1); marco.rotateZ(Math.PI / 4); marco.rotateX(-Math.PI / 2);
    const a1 = new THREE.RingGeometry(0.5, 0.6, 44); a1.rotateX(-Math.PI / 2);
    const a2 = new THREE.RingGeometry(0.18, 0.3, 36); a2.rotateX(-Math.PI / 2);
    const col = new THREE.CylinderGeometry(1, 1, 1, 26, 1, true); col.translate(0, 0.5, 0);
    return { marco, a1, a2, col };
  }, []);
  const slots = useMemo(() => Array.from({ length: N }, () => {
    const b = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    return { marco: b(COLORES_HOLO.marco), a1: b(COLORES_HOLO.a1), a2: b(COLORES_HOLO.a2), col: crearHaz(COLORES_HOLO.marco, { a0: 0.9, a1: 0, borde: 1 }) };
  }), []);
  useEffect(() => () => { Object.values(geos).forEach(g => g.dispose()); slots.forEach(s => Object.values(s).forEach(m => m.dispose())); }, [geos, slots]);
  const grupos = useRef([]), r1 = useRef([]), r2 = useRef([]), previo = useRef({ lista: new Map(), capturas: 0 }), efectos = useRef([]);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame((_, dtc) => {
    const s = estadoRef.current, g = s.g, pausa = s.fase === 'pausa', dt = pausa ? 0 : Math.min(dtc, 0.1), t = mundo.current.t, vel = velocidadObjetivos(g.capturas || 0);
    const actuales = new Map((g.objetivos || []).filter(o => !o.usado).map(o => [o.id, o])), pv = previo.current;
    // Captura: sube el contador y desaparece de la lista el objetivo que estaba dentro del visor → efecto verde que sube.
    if (g.capturas > pv.capturas) {
      let mejor = null, d0 = 1e9;
      for (const [id, o] of pv.lista) if (!actuales.has(id)) { const d = Math.abs(o.x - C.X_VISOR); if (d < C.TOLERANCIA_X + 60 && d < d0) { mejor = o; d0 = d; } }
      if (mejor) efectos.current.push({ x: mejor.x, y: mejor.y, r: mejor.r, t: 0 });
    }
    pv.lista = actuales; pv.capturas = g.capturas;
    efectos.current = efectos.current.filter(e => { e.t += dt; return e.t < 1.1; });
    const lista = [...actuales.values()].map(o => ({ o, ef: null })).concat(efectos.current.map(e => ({ o: { x: e.x - vel * e.t, y: e.y, r: e.r }, ef: e })));
    for (let i = 0; i < N; i++) {
      const gr = grupos.current[i], it = lista[i];
      if (!gr) continue;
      if (!it) { gr.visible = false; continue; }
      const { o, ef } = it, X = mundoX(o.x), Z = mundoZ(o.y), r = mundoRadio(o.r), sl = slots[i];
      const dentro = !ef && Math.abs(o.x - C.X_VISOR) < C.TOLERANCIA_X && Math.abs(o.y - g.y) < C.TOLERANCIA_Y;
      const pulso = calmo ? 0 : Math.sin(t * 4 + i) * 0.05 + (dentro ? Math.sin(t * 14) * 0.05 : 0);
      gr.visible = true; gr.position.set(X, alturaSuelo(X, Z) + 0.14 + (ef ? ef.t * 3.2 : 0.06 * (calmo ? 0 : Math.sin(t * 2.2 + i))), Z);
      gr.scale.setScalar(r * (1 + pulso + (ef ? ef.t * 0.55 : 0)));
      const op = ef ? 1 - ef.t / 1.1 : (0.55 + 0.4 * suave(C.ANCHO + 40, C.ANCHO - 40, o.x)) + (dentro ? 0.05 : 0);
      if (ef) { col.set(COLORES_HOLO.ok); sl.marco.color.copy(col); sl.a1.color.copy(col); sl.a2.color.copy(col); sl.col.uniforms.uColor.value.copy(col); }
      else { sl.marco.color.set(dentro ? COLORES_HOLO.cerca : COLORES_HOLO.marco); sl.a1.color.set(COLORES_HOLO.a1); sl.a2.color.set(COLORES_HOLO.a2); sl.col.uniforms.uColor.value.set(dentro ? COLORES_HOLO.cerca : COLORES_HOLO.marco); }
      sl.marco.opacity = sl.a1.opacity = sl.a2.opacity = Math.min(1, op);
      sl.col.uniforms.uOp.value = (ef ? 0.55 : 0.28 + (dentro ? 0.18 : 0)) * (ef ? 1 - ef.t / 1.1 : 1);
      if (r1.current[i] && !calmo) { r1.current[i].rotation.y += dt * 0.7; r2.current[i].rotation.y -= dt * 1.2; }
    }
  });
  return <>{slots.map((sl, i) => <group key={i} ref={el => { grupos.current[i] = el; }} visible={false} renderOrder={4}>
    <mesh geometry={geos.marco} material={sl.marco} scale={1.4142} renderOrder={4} />
    <mesh ref={el => { r1.current[i] = el; }} geometry={geos.a1} material={sl.a1} renderOrder={4} />
    <mesh ref={el => { r2.current[i] = el; }} geometry={geos.a2} material={sl.a2} renderOrder={4} />
    <mesh geometry={geos.col} material={sl.col} scale={[0.5, 2.2, 0.5]} renderOrder={3} />
  </group>)}</>;
}

// Retícula turquesa del boceto proyectada en el suelo (cuadro ±25 y cruz ±50 del motor), la nave del jugador arriba y el haz de escaneo que baja hasta la retícula.
function NaveYVisor({ estadoRef, diseno, estetica, mundo, calmo }) {
  const ret = useRef(null), nave = useRef(null), hazRef = useRef(null), zNave = useRef(null);
  const geos = useMemo(() => {
    const cuadro = new THREE.RingGeometry(0.93 * 1.4142, 1.4142, 4, 1); cuadro.rotateZ(Math.PI / 4); cuadro.rotateX(-Math.PI / 2);
    const h = new THREE.PlaneGeometry(4, 0.07); h.rotateX(-Math.PI / 2); const v = new THREE.PlaneGeometry(0.07, 4); v.rotateX(-Math.PI / 2);
    const punto = new THREE.CircleGeometry(0.1, 20); punto.rotateX(-Math.PI / 2);
    return { cuadro, h, v, punto, haz: geometriaHaz() };
  }, []);
  const matRet = useMemo(() => new THREE.MeshBasicMaterial({ color: '#84f5dd', transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), []);
  const matPunto = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), []);
  const matHaz = useMemo(() => crearHaz('#84f5dd', { a0: 1, a1: 0.3, borde: 1.2 }), []);
  useEffect(() => () => { Object.values(geos).forEach(g => g.dispose()); matRet.dispose(); matPunto.dispose(); matHaz.dispose(); }, [geos, matRet, matPunto, matHaz]);
  const desde = useMemo(() => new THREE.Vector3(), []), hasta = useMemo(() => new THREE.Vector3(), []), verde = useMemo(() => new THREE.Color('#6fffc8'), []), turq = useMemo(() => new THREE.Color('#84f5dd'), []);
  useFrame((_, dtc) => {
    const s = estadoRef.current, g = s.g, dt = Math.min(dtc, 0.1), Zv = mundoZ(g.y), t = mundo.current.t;
    if (zNave.current === null) zNave.current = Zv;
    zNave.current += (Zv - zNave.current) * (1 - Math.exp(-9 * dt));
    const flash = g.destello > 0 ? Math.min(1, g.destello / C.DESTELLO_S + 0.3) : 0, Y = alturaSuelo(0, Zv);
    ret.current.position.set(0, Y + 0.07, Zv);
    const pul = calmo ? 1 : 1 + Math.sin(t * 6) * 0.03 + flash * 0.25; ret.current.scale.setScalar(pul);
    matRet.color.copy(turq).lerp(verde, flash); matRet.opacity = 0.9 + flash * 0.1;
    const zn = zNave.current + 1.4, yn = 6.4 + (calmo ? 0 : Math.sin(t * 1.3) * 0.12);
    nave.current.position.set(0, yn, zn);
    desde.set(0, yn - 0.7, zn); hasta.set(0, Y + 0.05, Zv);
    orientarHaz(hazRef.current, desde, hasta, 1.25);
    matHaz.uniforms.uOp.value = (g.destello > 0 ? 0.55 : 0.2) + (s.fase === 'jugando' ? 0.06 : 0);
    matHaz.uniforms.uColor.value.copy(turq).lerp(verde, flash);
  });
  return <>
    <group ref={ret} renderOrder={9}>
      <mesh geometry={geos.cuadro} material={matRet} renderOrder={9} /><mesh geometry={geos.h} material={matRet} renderOrder={9} /><mesh geometry={geos.v} material={matRet} renderOrder={9} /><mesh geometry={geos.punto} material={matPunto} renderOrder={10} />
    </group>
    <mesh ref={hazRef} geometry={geos.haz} material={matHaz} renderOrder={5} />
    {/* La nave mira hacia donde avanza (a la izquierda: la superficie corre de derecha a izquierda). */}
    <group ref={nave}><group rotation={[0.35, 0, Math.PI / 2]} scale={0.5}><Nave3D diseno={diseno} estetica={estetica} girar={false} motor={false} /></group></group>
  </>;
}

function EscenaCartografia({ estadoRef, destino, diseno, estetica, calmo, hudRef }) {
  const mundo = useMundo(estadoRef), jup = destino === 'jupiter';
  return <>
    <color attach="background" args={[jup ? '#0a0806' : '#02050c']} />
    <fog attach="fog" args={[jup ? '#7a5636' : '#0c121c', 45, 150]} />
    <Rig hudRef={hudRef} mira={[0, 1.5, -1.5]} dir={[0, Math.sin(42 * Math.PI / 180), Math.cos(42 * Math.PI / 180)]} need={{ hw: 13, hh: 12 }} fov={46} calmo={calmo} />
    {/* Sol bajo (Luna: ~20° para alargar las sombras de los cráteres; Júpiter: más alto) con día y noche lentos. */}
    <Luces mundo={mundo} sol={jup ? [-30, 24, -8] : [-34, 13, -10]} intensidad={jup ? 2.9 : 3.4} ambiente={jup ? 0.38 : 0.2} ciclo sombras={!jup} calmo={calmo} />
    <Estrellas calmo={calmo} />
    {jup ? <><SueloJupiter mundo={mundo} calmo={calmo} /><Vortices mundo={mundo} calmo={calmo} /></> : <><SueloLuna mundo={mundo} /><Crateres mundo={mundo} /></>}
    <Objetivos estadoRef={estadoRef} mundo={mundo} calmo={calmo} />
    <NaveYVisor estadoRef={estadoRef} diseno={diseno} estetica={estetica} mundo={mundo} calmo={calmo} />
  </>;
}

// =====================================================================================================================
// FASE 2 · Espectro
// =====================================================================================================================
// Mezcla viva de tu hipótesis (color) y su coincidencia con la medición de la muestra actual (intensidad). Se recalcula solo cuando cambian los niveles o la muestra.
function useMezcla(estadoRef, destino) {
  const gases = GASES[destino], viva = useRef({ clave: null, mezcla: mezclaGases(gases, [0, 0, 0, 0]), fit: 0, niveles: [0, 0, 0, 0] });
  const leer = () => {
    const g = estadoRef.current.g, v = viva.current;
    if (g.niveles && (g.niveles !== v.niveles || g.muestra !== v.muestra)) {
      v.niveles = g.niveles; v.muestra = g.muestra; v.clave = `${g.muestra}|${g.niveles.join()}`;
      v.mezcla = mezclaGases(gases, g.niveles);
      v.fit = g.objetivos?.[Math.min(g.muestra, C.MUESTRAS - 1)] ? ajusteEspectral(gases, g.objetivos[Math.min(g.muestra, C.MUESTRAS - 1)], g.niveles) / 100 : 0;
      v.cambio = (v.cambio || 0) + 1;
    }
    return v;
  };
  return leer;
}

const BASE_LIMBO = 16, CENTRO_PLANETA_Y = -3.9;
function PlanetaLimbo({ destino, radio }) {
  return <group position={[0, CENTRO_PLANETA_Y - radio, -6]} rotation={[0.1, 0, 0]}>{destino === 'jupiter' ? <Jupiter3D radio={radio} /> : <Luna3D radio={radio} />}</group>;
}

// Pluma de LCROSS: partículas que suben balísticas desde el cráter Cabeus (en el limbo) y se abren; color = mezcla de gases de tu hipótesis.
function PlumaLuna({ leer, mundo, calmo, base }) {
  const N = 900;
  const dat = useMemo(() => ({
    pos: new Float32Array(N * 3), col: new Float32Array(N * 3),
    f0: Float32Array.from({ length: N }, (_, i) => hash(i, 1)), v0: Float32Array.from({ length: N }, (_, i) => 0.55 + hash(i, 2) * 0.45), u: Float32Array.from({ length: N }, (_, i) => hash(i, 3)),
    dx: Float32Array.from({ length: N }, (_, i) => hash(i, 4) * 2 - 1), dz: Float32Array.from({ length: N }, (_, i) => hash(i, 5) * 2 - 1), idx: new Int8Array(N).fill(-1),
  }), []);
  const glow = useMemo(texturaGlow, []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dat.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(dat.col, 3)); return g; }, [dat]);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.36, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }), [glow]);
  const rgb = useMemo(() => GASES.luna.map(g => { const n = parseInt(g.color.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }), []);
  const cambio = useRef(-1);
  useEffect(() => () => { geo.dispose(); glow.dispose(); mat.dispose(); }, [geo, glow, mat]);
  useFrame(() => {
    const v = leer(), t = mundo.current.t * (calmo ? 0.5 : 1), { pos, col, f0, v0, u, dx, dz, idx } = dat;
    if (cambio.current !== v.cambio) { // reparte los gases entre las partículas según sus proporciones
      cambio.current = v.cambio;
      for (let i = 0; i < N; i++) { let acum = 0, k = -1; for (let j = 0; j < v.mezcla.pesos.length; j++) { acum += v.mezcla.pesos[j]; if (u[i] <= acum) { k = j; break; } } idx[i] = v.mezcla.total > 0 ? k : -1; }
    }
    const brillo = 0.3 + 0.95 * v.fit;
    for (let i = 0; i < N; i++) {
      const a = fract(f0[i] + t * 0.17), alto = 9.5 * v0[i] * (1 - (1 - a) ** 2), abre = (0.12 + 2.1 * a) * dx[i];
      pos[i * 3] = base[0] + abre; pos[i * 3 + 1] = base[1] + alto; pos[i * 3 + 2] = base[2] + (0.1 + 1.4 * a) * dz[i];
      const f = (1 - a) ** 1.1 * suave(0, 0.05, a) * brillo, c = idx[i] >= 0 ? rgb[idx[i]] : [0.62, 0.72, 0.82];
      col[i * 3] = c[0] * f; col[i * 3 + 1] = c[1] * f; col[i * 3 + 2] = c[2] * f;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={3} />;
}

// Limbo de Júpiter: capas de bruma, una por gas, sobre el borde del planeta. Cada capa es un casco (cara trasera) que solo se ve fuera del disco del planeta.
function CapasLimbo({ leer, mundo, calmo, radio }) {
  const geo = useMemo(() => new THREE.SphereGeometry(1, 64, 40), []);
  const mats = useMemo(() => GASES.jupiter.map(g => new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), []);
  const bruma = useMemo(() => new THREE.MeshBasicMaterial({ color: '#bcd0e6', transparent: true, opacity: 0, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  useEffect(() => () => { geo.dispose(); mats.forEach(m => m.dispose()); bruma.dispose(); }, [geo, mats, bruma]);
  useFrame(() => {
    const v = leer(), t = mundo.current.t, brillo = 0.3 + 0.7 * v.fit;
    mats.forEach((m, i) => { const w = v.niveles?.[i] ? v.niveles[i] / C.NIVEL_MAX : 0; m.opacity = w * 0.42 * brillo * (calmo ? 1 : 0.9 + 0.1 * Math.sin(t * 1.6 + i)); });
    bruma.opacity = v.mezcla.total > 0 ? 0.03 : 0.1;
  });
  return <group position={[0, CENTRO_PLANETA_Y - radio, -6]}>
    <mesh geometry={geo} material={bruma} scale={radio * 1.012} />
    {mats.map((m, i) => <mesh key={i} geometry={geo} material={m} scale={radio * (1.028 + i * 0.03)} />)}
  </group>;
}

function EscenaEspectro({ estadoRef, destino, diseno, estetica, calmo, hudRef }) {
  const mundo = useMundo(estadoRef), jup = destino === 'jupiter', leer = useMezcla(estadoRef, destino), radio = jup ? 22 : BASE_LIMBO;
  const geoHaz = useMemo(geometriaHaz, []), matHaz = useMemo(() => crearHaz('#ffffff', { a0: 1, a1: 0.5, borde: 1.4 }), []);
  useEffect(() => () => { geoHaz.dispose(); matHaz.dispose(); }, [geoHaz, matHaz]);
  const hazRef = useRef(null), naveRef = useRef(null), emisor = useRef(null);
  const desde = useMemo(() => new THREE.Vector3(-5.9, 2.0, 1.2), []), hasta = useMemo(() => new THREE.Vector3(5.6, jup ? 0.9 : 3.0, -6), [jup]);
  const base = useMemo(() => { const x = 3.1, y = CENTRO_PLANETA_Y - radio + Math.sqrt(radio * radio - x * x); return [x, y + 0.05, -6]; }, [radio]);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const v = leer(), t = mundo.current.t, [r, g, b] = v.mezcla.rgb;
    col.setRGB(r, g, b, THREE.SRGBColorSpace); col.lerp(new THREE.Color('#ffffff'), 0.25 * v.fit);
    matHaz.uniforms.uColor.value.copy(col); matHaz.uniforms.uOp.value = (0.2 + 0.55 * v.fit) * (calmo ? 1 : 0.92 + 0.08 * Math.sin(t * 9));
    orientarHaz(hazRef.current, desde, hasta, 0.9 + 0.5 * v.fit);
    if (naveRef.current) naveRef.current.position.y = calmo ? 1.6 : 1.6 + Math.sin(t * 0.9) * 0.1;
    if (emisor.current) { emisor.current.material.color.copy(col); emisor.current.scale.setScalar(0.12 + 0.05 * Math.sin(t * 8)); }
  });
  return <>
    <color attach="background" args={['#02050c']} />
    <Rig hudRef={hudRef} mira={[0, 1.2, 0]} dir={[0, 0.06, 1]} need={{ hw: 11, hh: 7.5 }} fov={40} calmo={calmo} />
    <Luces mundo={mundo} sol={[14, 3, 7]} intensidad={3.1} ambiente={0.3} ciclo sombras={false} calmo={calmo} />
    <Estrellas calmo={calmo} />
    <PlanetaLimbo destino={destino} radio={radio} />
    {jup ? <CapasLimbo leer={leer} mundo={mundo} calmo={calmo} radio={radio} /> : <PlumaLuna leer={leer} mundo={mundo} calmo={calmo} base={base} />}
    <mesh ref={hazRef} geometry={geoHaz} material={matHaz} renderOrder={4} />
    <group ref={naveRef} position={[-7.4, 1.6, 1.2]}><group rotation={[0.25, 0.5, -0.5]} scale={0.5}><Nave3D diseno={diseno} estetica={estetica} girar={!calmo} /></group></group>
    <mesh ref={emisor} position={desde} renderOrder={6}><sphereGeometry args={[1, 12, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
  </>;
}

// =====================================================================================================================
// FASE 3 · Transmisión
// =====================================================================================================================
const R_TIERRA = 7.6, BISAGRA = [0, 0.62, 0], LARGO_HAZ = 9.5;
const AMBAR = new THREE.Color('#ffb347'), VERDE = new THREE.Color('#59ffb0');

// Plato de antena de alta ganancia (modelo aparte, montado sobre la nave): gira en su bisagra con el ángulo del motor. Su eje es +Y local.
function PlatoAntena({ estadoRef, calmo }) {
  const bis = useRef(null), ang = useRef(null);
  useFrame((_, dtc) => {
    const a = estadoRef.current.g.angulo ?? C.ANGULO_INICIAL, dt = Math.min(dtc, 0.1), meta = giroAntena(a);
    if (ang.current === null) ang.current = meta;
    ang.current += (meta - ang.current) * (calmo ? 1 : 1 - Math.exp(-18 * dt));
    bis.current.rotation.z = ang.current;
  });
  return <group ref={bis} position={BISAGRA}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.34, 12]} /><meshStandardMaterial color="#8d97a6" metalness={0.8} roughness={0.3} /></mesh>
    <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.035, 0.05, 0.6, 10]} /><meshStandardMaterial color="#aab4c2" metalness={0.7} roughness={0.35} /></mesh>
    <group position={[0, 0.58, 0]}>
      <mesh rotation={[Math.PI, 0, 0]} position={[0, 1.1, 0]}><sphereGeometry args={[1.1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 4]} /><meshStandardMaterial color="#f3f5f9" metalness={0.35} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.02, 0.02, 0.85, 8]} /><meshStandardMaterial color="#cfd6e0" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0.86, 0]}><sphereGeometry args={[0.08, 14, 14]} /><meshStandardMaterial color="#8fe8f3" emissive="#8fe8f3" emissiveIntensity={1.2} /></mesh>
    </group>
  </group>;
}

function EscenaTransmision({ estadoRef, destino, diseno, estetica, calmo, hudRef }) {
  const mundo = useMundo(estadoRef), jup = destino === 'jupiter', radio = jup ? 20 : 16;
  const glow = useMemo(texturaGlow, []), geoHaz = useMemo(geometriaHaz, []), matHaz = useMemo(() => crearHaz('#ffb347', { a0: 0.25, a1: 1, borde: 1.3 }), []);
  const geoPaq = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []), matPaq = useMemo(() => new THREE.MeshBasicMaterial({ color: '#b5ffd8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const matHalo = useMemo(() => new THREE.SpriteMaterial({ map: glow, color: '#8cc8ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [glow]);
  useEffect(() => () => { glow.dispose(); geoHaz.dispose(); matHaz.dispose(); geoPaq.dispose(); matPaq.dispose(); matHalo.dispose(); }, [glow, geoHaz, matHaz, geoPaq, matPaq, matHalo]);
  const hazRef = useRef(null), tierra = useRef(null), paq = useRef([]);
  const desde = useMemo(() => new THREE.Vector3(...BISAGRA), []), hasta = useMemo(() => new THREE.Vector3(), []), col = useMemo(() => new THREE.Color(), []);
  const dsn = useMemo(() => ({ ...diseno, antena: null }), [diseno]); // la antena de serie se cambia por el plato articulado
  useFrame(() => {
    const s = estadoRef.current, g = s.g, t = mundo.current.t, q = calidadSenal(g.angulo, anguloTierra(g, g.t)) / 100, d = direccionAntena(g.angulo), dt3 = direccionAntena(anguloTierra(g, g.t));
    hasta.set(BISAGRA[0] + d.x * LARGO_HAZ, BISAGRA[1] + d.y * LARGO_HAZ, 0);
    orientarHaz(hazRef.current, desde, hasta, 0.45 + (1 - q) * 0.5);
    col.copy(AMBAR).lerp(VERDE, suave(0.25, 0.85, q)); matHaz.uniforms.uColor.value.copy(col);
    matHaz.uniforms.uOp.value = 0.14 + 0.2 * q + (g.tx ? 0.2 : 0);
    tierra.current.position.set(BISAGRA[0] + dt3.x * R_TIERRA, BISAGRA[1] + dt3.y * R_TIERRA, 0);
    matHalo.opacity = 0.75 + 0.25 * q * (calmo ? 1 : 0.8 + 0.2 * Math.sin(t * 3));
    paq.current.forEach((m, i) => {
      if (!m) return;
      const a = fract(t * 0.55 + i / paq.current.length);
      m.visible = !!g.tx; m.position.set(BISAGRA[0] + d.x * LARGO_HAZ * a, BISAGRA[1] + d.y * LARGO_HAZ * a, 0.05); m.scale.set(0.11 + 0.05 * (1 - a), 0.11 + 0.05 * (1 - a), 0.11 + 0.05 * (1 - a));
    });
  });
  return <>
    <color attach="background" args={['#02050c']} />
    <Rig hudRef={hudRef} mira={[0, 3.6, 0]} dir={[0, 0.16, 0.987]} need={{ hw: 9.8, hh: 7.6 }} fov={40} calmo={calmo} />
    {/* Día y noche: el Sol da la vuelta despacio; de noche la nave queda con la luz ambiente. */}
    <Luces mundo={mundo} sol={[13, 5, 7]} intensidad={3.2} ambiente={0.34} ciclo sombras={false} calmo={calmo} />
    <Estrellas calmo={calmo} />
    <group position={[0, -2.3 - radio, -5]}>{jup ? <Jupiter3D radio={radio} /> : <Luna3D radio={radio} />}</group>
    <group scale={0.44}><Nave3D diseno={dsn} estetica={estetica} girar={false} /></group>
    <PlatoAntena estadoRef={estadoRef} calmo={calmo} />
    <mesh ref={hazRef} geometry={geoHaz} material={matHaz} renderOrder={4} />
    {Array.from({ length: 6 }).map((_, i) => <mesh key={i} ref={el => { paq.current[i] = el; }} geometry={geoPaq} material={matPaq} visible={false} renderOrder={6} />)}
    {/* La Tierra: pequeña y brillante, en el ángulo objetivo del motor (se mueve despacio). */}
    <group ref={tierra}><Tierra3D radio={0.55} /><sprite scale={[3.4, 3.4, 1]} material={matHalo} renderOrder={5} /></group>
  </>;
}

// =====================================================================================================================
export default function Operacion3D({ estadoRef, f, clave, destino, diseno, estetica, hudRef, calmo }) {
  const props = { estadoRef, destino, diseno: diseno || {}, estetica: estetica || {}, calmo: !!calmo, hudRef };
  return <Canvas className="op-canvas3d" dpr={[1, 1.5]} shadows="soft" camera={{ fov: 46, near: 0.5, far: 600, position: [0, 20, 24] }} gl={{ antialias: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
    {f === 1 ? <EscenaCartografia key={clave} {...props} /> : f === 2 ? <EscenaEspectro key={clave} {...props} /> : <EscenaTransmision key={clave} {...props} />}
  </Canvas>;
}

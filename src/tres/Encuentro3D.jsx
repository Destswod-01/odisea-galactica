// Escena 3D de la etapa 05 «Aproximación y encuentro»: terreno de ±160 m con el Sol como única luz fuerte (sombras negras: no hay aire),
// cielo negro con la Tierra (Luna) o Júpiter (Ío), los objetos del sitio y el dron. La pantalla (Encuentro.jsx) manda el estado del motor por un ref.
// Ejes y ángulos como el motor: yaw 0 mira a −Z, yaw + gira a la izquierda; en modo foto la cámara calca camaraDron(s) (posición, dirección y fov).
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { alturaTerreno, camaraDron } from '../motor/encuentro.js';
import { crearSonda } from '../sondas/modelos.js';

const RAD = Math.PI / 180;
// Ajustes de brillo por destino: intensidad del Sol y exposición del renderer (en Ío el Sol es 27 veces más débil; la exposición compensa solo en parte).
const AJUSTE = { luna: { sol: 5.5, exposicion: 1 }, io: { sol: 1.5, exposicion: 1.9 } };
const SEG_TERRENO = 160, TAM_HORIZONTE = 2400, SEG_HORIZONTE = 120;

// ---------- Utilidades ----------
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (a, b, v) => { const t = acotar((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const envolver = a => Math.atan2(Math.sin(a), Math.cos(a));
const hash2 = (a, b) => { const t = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return t - Math.floor(t); };
function ruido(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => ruido(x, z) * .55 + ruido(x * 2.1 + 7, z * 2.1 - 3) * .3 + ruido(x * 4.7 - 5, z * 4.7 + 9) * .15;
const semillaDe = txt => [...txt].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// ---------- Color del suelo (por vértice, según altura, pendiente y rasgos del sitio) ----------
const PAL = {
  luna: new THREE.Color('#a29e96'),
  amarillo: new THREE.Color('#cdb83e'), naranja: new THREE.Color('#d98a2c'), palido: new THREE.Color('#ebe3b4'), oscuro: new THREE.Color('#33271f'),
  patera: new THREE.Color('#3a2822'), isla: new THREE.Color('#2b2320'), lago: new THREE.Color('#3b1a12')
};
function colorLuna(sitio, x, z, pend, c) {
  const n = fbm(x / 11, z / 11), m = fbm(x / 2.4 + 40, z / 2.4 - 12);
  let b = .62 + .6 * n + .22 * (m - .5);
  b *= 1 - Math.min(.5, pend * 1.5);
  for (const k of sitio.crateres) {
    const t = Math.hypot(x - k.x, z - k.z) / k.r;
    if (t < 2.2) { b += .34 * Math.exp(-(((t - 1) / .22) ** 2)) + (t > 1 ? .09 * (2.2 - t) : 0); if (t < .8) b *= .93; }
  }
  for (const s of sitio.senuelos) if (s.tipo === 'halo') b += .55 * Math.exp(-((Math.hypot(x - s.x, z - s.z) / (s.radio * 2.2)) ** 2));
  c.copy(PAL.luna).multiplyScalar(b); c.r *= 1.02; c.b *= .96;
}
function colorIo(sitio, x, z, pend, c) {
  const n1 = fbm(x / 60 + 3, z / 60 - 2), n2 = fbm(x / 13, z / 13 + 5), n3 = fbm(x / 36 + 11, z / 36 + 5);
  c.copy(PAL.amarillo).lerp(PAL.naranja, sm(.38, .66, n1)).lerp(PAL.palido, sm(.58, .78, n2) * .7);
  c.lerp(PAL.oscuro, sm(.6, .72, n3) * (1 - Math.min(1, pend * 3)) * .85);
  c.multiplyScalar((.8 + .35 * n2) * (1 - Math.min(.4, pend * 1.2)));
  for (const k of sitio.crateres) { const t = Math.hypot(x - k.x, z - k.z) / k.r; if (t < 1) c.lerp(PAL.patera, .25 + .5 * (1 - t)); else if (t < 1.25) c.lerp(PAL.palido, .25 * (1.25 - t) / .25); }
  const o = sitio.objetivo;
  if (o.id === 'loki') { const d = Math.hypot(x - o.x, z - o.z); c.lerp(PAL.lago, 1 - sm(22, 32, d)); c.lerp(PAL.isla, 1 - sm(4, 9, d)); }
  if (o.id === 'pluma') { const d = Math.hypot(x - o.x, z - o.z); c.lerp(PAL.palido, .45 * (1 - sm(6, 26, d))); }
}

function geometriaTerreno(cfg, sitio, io) {
  const g = new THREE.PlaneGeometry(cfg.tamano, cfg.tamano, SEG_TERRENO, SEG_TERRENO); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, n = p.count;
  for (let i = 0; i < n; i++) p.setY(i, alturaTerreno(cfg, sitio, p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const nr = g.attributes.normal, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    (io ? colorIo : colorLuna)(sitio, p.getX(i), p.getZ(i), 1 - nr.getY(i), c);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
// Llanura que rodea el terreno: continúa las alturas del borde y se aplana en ~120 m; los vértices de dentro bajan para quedar ocultos bajo el terreno.
function geometriaHorizonte(cfg, sitio, io) {
  const L = cfg.tamano / 2, g = new THREE.PlaneGeometry(TAM_HORIZONTE, TAM_HORIZONTE, SEG_HORIZONTE, SEG_HORIZONTE); g.rotateX(-Math.PI / 2);
  const fuera = (x, z) => Math.max(Math.abs(x) - L, Math.abs(z) - L);
  const alt = (x, z) => alturaTerreno(cfg, sitio, x, z) * (1 - sm(0, 120, fuera(x, z)));
  const p = g.attributes.position, n = p.count, nr = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), a = alt(x, z);
    const nx = (alt(x - 10, z) - alt(x + 10, z)) / 20, nz = (alt(x, z - 10) - alt(x, z + 10)) / 20, l = Math.hypot(nx, 1, nz);
    nr[i * 3] = nx / l; nr[i * 3 + 1] = 1 / l; nr[i * 3 + 2] = nz / l;
    (io ? colorIo : colorLuna)(sitio, x, z, 1 - 1 / l, c);
    col[i * 3] = c.r * .85; col[i * 3 + 1] = c.g * .85; col[i * 3 + 2] = c.b * .85;
    p.setY(i, fuera(x, z) < -1 ? -80 : a - .05);
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------- Contexto del mundo ----------
const Mundo = createContext(null);
const useMundo = () => useContext(Mundo);
function Pieza({ g, m, cast = true, ...p }) { return <mesh geometry={g} material={m} castShadow={cast} receiveShadow {...p} />; }
const matMate = (reg, color, extra = {}) => reg(new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: 0, ...extra }));
// Textura circular suave para las partículas (compartida).
let puntito = null;
function texturaPuntito() {
  if (puntito) return puntito;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  puntito = new THREE.CanvasTexture(c); puntito.colorSpace = THREE.SRGBColorSpace;
  return puntito;
}

// Mancha (disco o anillo, opcionalmente elíptico) pegada al terreno: halos, coladas, bordes oscuros, escarcha.
function Parche({ x, z, r, ri = 0, sx = 1, sz = 1, ang = 0, color, opacity = 1, dy = .07, emisivo = 0, emColor = '#000000', seg = 40, aros = 5 }) {
  const { h, reg } = useMundo();
  const g = useMemo(() => {
    const geo = reg(new THREE.RingGeometry(ri || .01, r, seg, aros)); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i) * sx, pz = p.getZ(i) * sz, wx = px * c + pz * s, wz = -px * s + pz * c;
      p.setXYZ(i, wx, h(x + wx, z + wz) + dy, wz);
    }
    geo.computeVertexNormals(); return geo;
  }, [reg, h, x, z, r, ri, sx, sz, ang, dy, seg, aros]);
  const m = useMemo(() => reg(new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, emissive: emColor, emissiveIntensity: emisivo })), [reg, color, opacity, emColor, emisivo]);
  return <mesh geometry={g} material={m} position={[x, 0, z]} receiveShadow renderOrder={1} />;
}
// Cinta sobre el terreno (huellas y rodadas).
function Cinta({ x, z, ang, largo, ancho, color, opacity = .55, curva = 1.2 }) {
  const { h, reg } = useMundo();
  const g = useMemo(() => {
    const n = 28, pos = [], idx = [], dx = -Math.sin(ang), dz = -Math.cos(ang), lx = Math.cos(ang), lz = -Math.sin(ang);
    for (let i = 0; i <= n; i++) {
      const t = i / n * largo, w = Math.sin(t * .45) * curva, cx = x + dx * t + lx * w, cz = z + dz * t + lz * w;
      for (const lado of [-1, 1]) { const px = cx + lx * ancho / 2 * lado, pz = cz + lz * ancho / 2 * lado; pos.push(px - x, h(px, pz) + .06, pz - z); }
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geo = reg(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }, [reg, h, x, z, ang, largo, ancho, curva]);
  const m = useMemo(() => reg(new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), [reg, color, opacity]);
  return <mesh geometry={g} material={m} position={[x, 0, z]} receiveShadow renderOrder={1} />;
}
// Barra cilíndrica entre dos puntos.
function Barra({ a, b, r, m, reg }) {
  const { g, pos, q } = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
    return { g: reg(new THREE.CylinderGeometry(r, r, len, 8)), pos: A.clone().add(B).multiplyScalar(.5), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()) };
  }, [a, b, r, reg]);
  return <Pieza g={g} m={m} position={pos} quaternion={q} />;
}
// Roca angulosa: icosaedro deformado con ruido (misma semilla = misma roca).
function useRoca(semilla) {
  const { reg } = useMundo();
  return useMemo(() => {
    const g = reg(new THREE.IcosahedronGeometry(1, 1)), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = .76 + .42 * ruido(x * 2.1 + semilla, z * 2.1 + y * 1.7); p.setXYZ(i, x * f, y * f, z * f); }
    g.computeVertexNormals(); return g;
  }, [reg, semilla]);
}
function Roca({ x, y, z, rx, ry, rz = rx, semilla, color, rot = 0 }) {
  const { reg } = useMundo(), g = useRoca(semilla);
  const m = useMemo(() => matMate(reg, color, { flatShading: true }), [reg, color]);
  return <Pieza g={g} m={m} position={[x, y + ry * .55, z]} scale={[rx, ry, rz]} rotation={[0, rot, 0]} />;
}

// ---------- Objetos del sitio ----------
function Modulo({ ob }) {
  const { reg } = useMundo(), k = ob.radio / 4, kv = ob.alto / 3, ang = semillaDe(ob.id) % 6;
  const o = useMemo(() => ({
    cuerpo: reg(new THREE.CylinderGeometry(1.5, 1.5, 1.5, 8)), faja: reg(new THREE.CylinderGeometry(1.55, 1.55, .22, 8)), campana: reg(new THREE.ConeGeometry(.75, 1, 14, 1, true)),
    pie: reg(new THREE.CylinderGeometry(.55, .65, .12, 14)), caja: reg(new THREE.BoxGeometry(.55, .55, .5)), antena: reg(new THREE.CylinderGeometry(.03, .03, 1.6, 6)),
    oro: matMate(reg, '#d6a645', { roughness: .45, metalness: .25, emissive: '#2a1700', emissiveIntensity: .6 }), negro: matMate(reg, '#1c1a18'), gris: matMate(reg, '#b9b6ad', { roughness: .5 }),
    patas: [45, 135, 225, 315].map(a => ({ a: [Math.cos(a * RAD) * 1.35, 1.6, Math.sin(a * RAD) * 1.35], b: [Math.cos(a * RAD) * 3.3, .14, Math.sin(a * RAD) * 3.3] }))
  }), [reg]);
  // Las manchas y huellas van en coordenadas del mundo (fuera del grupo escalado) para pegarse al terreno.
  return <><group position={[ob.x, ob.y, ob.z]} rotation={[0, ang, 0]} scale={[k, kv, k]}>
    <Pieza g={o.cuerpo} m={o.oro} position={[0, 2.15, 0]} rotation={[0, Math.PI / 8, 0]} />
    <Pieza g={o.faja} m={o.negro} position={[0, 1.55, 0]} rotation={[0, Math.PI / 8, 0]} />
    <Pieza g={o.campana} m={o.negro} position={[0, .95, 0]} rotation={[Math.PI, 0, 0]} />
    {[0, 90, 180, 270].map(a => <Pieza key={a} g={o.caja} m={o.gris} position={[Math.cos(a * RAD) * 1.55, 2.15, Math.sin(a * RAD) * 1.55]} rotation={[0, -a * RAD, 0]} />)}
    <Pieza g={o.antena} m={o.gris} position={[.7, 3.6, .3]} />
    {o.patas.map((p, i) => <group key={i}><Barra a={p.a} b={p.b} r={.07} m={o.oro} reg={reg} /><Pieza g={o.pie} m={o.oro} position={[p.b[0], .06, p.b[2]]} /></group>)}
  </group>
    <Parche x={ob.x} z={ob.z} r={9} color="#d4cfc4" opacity={.5} dy={.05} seg={48} />
    <Parche x={ob.x} z={ob.z} r={2.6 * k} color="#2c2824" opacity={.55} dy={.06} seg={24} aros={2} />
    <Cinta x={ob.x + 3} z={ob.z + 2} ang={ang + 2.2} largo={16} ancho={.35} color="#2a2724" opacity={.5} curva={.8} />
    <Cinta x={ob.x - 2} z={ob.z + 3} ang={ang + 3.6} largo={11} ancho={.35} color="#2a2724" opacity={.45} curva={.6} />
  </>;
}
function Rover({ ob }) {
  const { reg } = useMundo(), ang = (semillaDe(ob.id) % 100) / 100 * Math.PI * 2, k = ob.radio / 3;
  const o = useMemo(() => ({
    tina: reg(new THREE.CylinderGeometry(1.15, .78, .75, 12)), tapa: reg(new THREE.CylinderGeometry(1.1, 1.1, .06, 20)), rueda: reg(new THREE.CylinderGeometry(.36, .36, .26, 14)), brazo: reg(new THREE.BoxGeometry(.9, .08, .12)), antena: reg(new THREE.CylinderGeometry(.025, .025, 1.2, 6)), mastil: reg(new THREE.BoxGeometry(.4, .5, .3)),
    plata: matMate(reg, '#c6c8cc', { roughness: .5, metalness: .2 }), panel: matMate(reg, '#2a3b5c', { roughness: .4, metalness: .3, emissive: '#0a1530', emissiveIntensity: .5 }), negro: matMate(reg, '#26272a'), dorado: matMate(reg, '#c9a24d', { roughness: .5 })
  }), [reg]);
  return <>
    {[-1, 1].map(lado => <Cinta key={lado} x={ob.x + Math.cos(ang) * 1.35 * k * lado + Math.sin(ang) * 1.5} z={ob.z - Math.sin(ang) * 1.35 * k * lado + Math.cos(ang) * 1.5} ang={ang + Math.PI} largo={34} ancho={.4} color="#2a2724" opacity={.6} />)}
    <group position={[ob.x, ob.y + .1, ob.z]} rotation={[0, ang, 0]} scale={k}>
      <Pieza g={o.tina} m={o.plata} position={[0, .95, 0]} />
      <Pieza g={o.tapa} m={o.panel} position={[0, 1.6, 1.05]} rotation={[-1.15, 0, 0]} />
      <Pieza g={o.mastil} m={o.dorado} position={[0, 1.5, -.4]} />
      <Pieza g={o.antena} m={o.plata} position={[.5, 2.1, -.5]} rotation={[0, 0, -.2]} />
      {[-1, 1].map(lado => [-.9, -.3, .3, .9].map(zz => <group key={`${lado}${zz}`}><Pieza g={o.brazo} m={o.negro} position={[lado * .95, .65, zz]} /><Pieza g={o.rueda} m={o.negro} position={[lado * 1.35, .36, zz]} rotation={[0, 0, Math.PI / 2]} /></group>))}
    </group>
  </>;
}
function Fosa({ ob }) {
  return <>
    <Parche x={ob.x} z={ob.z} r={21} ri={15.5} color="#14110f" opacity={.8} dy={.1} seg={56} aros={4} />
    <Parche x={ob.x} z={ob.z} r={26} ri={21} color="#c5c1b8" opacity={.35} dy={.06} seg={56} aros={3} />
  </>;
}
function RocaObjeto({ ob, color }) { return <Roca x={ob.x} y={ob.y} z={ob.z} rx={ob.radio} ry={ob.alto * .55} rz={ob.radio * .85} semilla={semillaDe(ob.id)} color={color} rot={semillaDe(ob.id) % 6} />; }
function Isla({ ob }) {
  const { reg, h } = useMundo(), luz = useRef();
  const yLago = h(ob.x + 14, ob.z) + .12;
  const g = useMemo(() => reg(new THREE.CircleGeometry(30, 56)), [reg]);
  const m = useMemo(() => reg(new THREE.MeshStandardMaterial({ color: '#8a2208', emissive: '#ff4a10', emissiveIntensity: 1.5, roughness: .6 })), [reg]);
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (m) m.emissiveIntensity = 1.4 + .3 * Math.sin(t * 1.6) + .12 * Math.sin(t * 5.3); if (luz.current) luz.current.intensity = 70 + 15 * Math.sin(t * 1.3); });
  return <>
    <mesh geometry={g} material={m} position={[ob.x, yLago, ob.z]} rotation={[-Math.PI / 2, 0, 0]} />
    <pointLight ref={luz} position={[ob.x, yLago + 3, ob.z]} color="#ff6a28" intensity={70} distance={90} decay={2} />
    <Roca x={ob.x - 1.5} y={ob.y - .3} z={ob.z + 1} rx={2.6} ry={1.6} semilla={5} color="#2c2420" />
    <Roca x={ob.x + 2.4} y={ob.y - .4} z={ob.z - 1.8} rx={1.8} ry={1.1} semilla={9} color="#352b26" rot={1} />
  </>;
}
function Pico({ ob }) {
  const { reg } = useMundo(), g = useMemo(() => reg(new THREE.ConeGeometry(2.1, 7, 9)), [reg]), m = useMemo(() => matMate(reg, '#6a5a4a', { flatShading: true }), [reg]);
  return <Pieza g={g} m={m} position={[ob.x, ob.y + 35 - 3, ob.z]} />;
}
function Pluma({ ob }) {
  const { reg, sol } = useMundo(), N = 650, gravedad = 1.8;
  const d = useMemo(() => {
    const vup = Math.sqrt(2 * gravedad * ob.alto), arr = [];
    for (let i = 0; i < N; i++) {
      const v0 = vup * (.5 + .5 * Math.sqrt(hash2(i, 1))), T = 2 * v0 / gravedad, a = hash2(i, 2) * Math.PI * 2;
      arr.push({ v0, T, a, vh: ob.radio * (.12 + .88 * hash2(i, 3) ** .7) / T, f: hash2(i, 4) });
    }
    return arr;
  }, [ob.alto, ob.radio]);
  const geo = useMemo(() => { const g = reg(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); return g; }, [reg]);
  const matP = useMemo(() => reg(new THREE.PointsMaterial({ color: '#efe9a0', size: 2.4, map: texturaPuntito(), transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })), [reg]);
  const mCasco = useMemo(() => reg(new THREE.MeshBasicMaterial({ color: '#f0e68c', transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), [reg]);
  const gCol = useMemo(() => reg(new THREE.CylinderGeometry(ob.radio * .55, ob.radio * .1, ob.alto * .8, 20, 1, true)), [reg, ob.radio, ob.alto]);
  const gCupula = useMemo(() => { const s = reg(new THREE.SphereGeometry(ob.radio * 1.15, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)); s.scale(1, .5, 1); return s; }, [reg, ob.radio]);
  const gBoca = useMemo(() => reg(new THREE.ConeGeometry(2.4, 1.6, 14)), [reg]), mBoca = useMemo(() => matMate(reg, '#2b211b'), [reg]);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime, p = geo.attributes.position;
    for (let i = 0; i < N; i++) {
      const q = d[i], tau = (t + q.f * q.T) % q.T, r = q.vh * tau;
      p.setXYZ(i, Math.cos(q.a) * r, q.v0 * tau - .5 * gravedad * tau * tau, Math.sin(q.a) * r);
    }
    p.needsUpdate = true;
    // Dispersión hacia adelante: se ve más cuando la cámara mira hacia el Sol con la pluma de por medio.
    const ax = camera.position.x - ob.x, ay = camera.position.y - ob.y, az = camera.position.z - ob.z, l = Math.hypot(ax, ay, az) || 1;
    const phi = Math.acos(acotar((ax * sol[0] + ay * sol[1] + az * sol[2]) / l, -1, 1)) / RAD, f = .3 + 1.2 * sm(60, 150, phi);
    matP.opacity = acotar(.5 * f, 0, .95); mCasco.opacity = acotar(.1 * f, 0, .35);
  });
  return <group position={[ob.x, ob.y, ob.z]}>
    <Pieza g={gBoca} m={mBoca} position={[0, .6, 0]} />
    <points geometry={geo} material={matP} frustumCulled={false} />
    <mesh geometry={gCol} material={mCasco} position={[0, ob.alto * .4, 0]} />
    <mesh geometry={gCupula} material={mCasco} position={[0, ob.alto * .78, 0]} />
  </group>;
}
// Nube de gas (señuelo de la pluma): esferas apagadas, sin columna ni sombrilla.
function Nube({ ob }) {
  const { reg } = useMundo(), g = useMemo(() => reg(new THREE.SphereGeometry(1, 14, 10)), [reg]), m = useMemo(() => reg(new THREE.MeshBasicMaterial({ color: '#8fa28c', transparent: true, opacity: .16, depthWrite: false })), [reg]);
  return <group position={[ob.x, ob.y, ob.z]}>{[[0, 3, 0, 1], [3, 4, 1, .7], [-3, 3.5, -1, .8], [1, 7, 2, .6], [-1.5, 6, 0, .7]].map(([x, y, z, s], i) => <mesh key={i} geometry={g} material={m} position={[x * ob.radio / 5, y * ob.alto / 12, z * ob.radio / 5]} scale={ob.radio * .5 * s} />)}</group>;
}
function Cuenco({ ob, io }) {
  const brillo = ob.tipo === 'halo', gr = ob.tipo === 'grieta';
  return <>
    {brillo && <Parche x={ob.x} z={ob.z} r={ob.radio * 2.6} color="#dedad0" opacity={.5} dy={.05} seg={44} />}
    {io && <Parche x={ob.x} z={ob.z} r={ob.radio * .9} color="#2e211b" opacity={.9} dy={.05} />}
    <Parche x={ob.x} z={ob.z} r={ob.radio * 1.25} ri={ob.radio * .85} color={io ? '#e6d99a' : '#c8c4bb'} opacity={.5} dy={.06} seg={44} aros={3} />
    {gr && <Parche x={ob.x} z={ob.z} r={ob.radio * .5} ri={ob.radio * .3} color="#ff6a28" emColor="#ff4010" emisivo={1.4} opacity={.9} dy={.09} seg={32} aros={2} />}
  </>;
}
function Loma({ ob, io }) {
  const { reg } = useMundo(), esMonticulo = ob.tipo === 'monticulo';
  const g = useMemo(() => {
    if (esMonticulo) return reg(new THREE.ConeGeometry(ob.radio, ob.alto, 18));
    const s = reg(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)); s.scale(ob.radio, ob.alto * .45, ob.radio); return s;
  }, [reg, esMonticulo, ob.radio, ob.alto]);
  const m = useMemo(() => matMate(reg, io ? '#e8dca0' : '#8a867e'), [reg, io]);
  return <>
    <Pieza g={g} m={m} position={[ob.x, ob.y + (esMonticulo ? ob.alto / 2 - .4 : -.4), ob.z]} />
    {!esMonticulo && <Roca x={ob.x} y={ob.y + ob.alto * .4} z={ob.z} rx={ob.radio * .3} ry={ob.radio * .26} semilla={semillaDe(ob.id)} color={io ? '#51402f' : '#6b6762'} />}
  </>;
}
function Meseta({ ob }) {
  const { reg } = useMundo(), g = useMemo(() => reg(new THREE.CylinderGeometry(ob.radio * .78, ob.radio * 1.1, ob.alto + 4, 22)), [reg, ob.radio, ob.alto]), m = useMemo(() => matMate(reg, '#b89a4a', { flatShading: true }), [reg]);
  return <Pieza g={g} m={m} position={[ob.x, ob.y + ob.alto / 2 - 2, ob.z]} />;
}
function Colada({ ob }) {
  const frio = ob.tipo === 'mancha', ang = (semillaDe(ob.id) % 100) / 100 * Math.PI;
  return <Parche x={ob.x} z={ob.z} r={ob.radio} sx={frio ? 1.1 : 1.6} sz={frio ? .9 : .55} ang={ang} color={frio ? '#f2efe0' : '#231b18'} opacity={frio ? .8 : .93} dy={.08} seg={40} aros={5} />;
}
// Señuelos «gemelos»: se parecen al objetivo de lejos, pero de cerca cambian de color, tamaño o detalle (los nombra el motor).
function Gemelo({ ob, objetivoId, io }) {
  switch (objetivoId) {
    case 'apolo11': return <><Parche x={ob.x} z={ob.z} r={ob.radio * 2.4} color="#dedad0" opacity={.5} dy={.05} seg={44} /><Parche x={ob.x} z={ob.z} r={ob.radio * .7} color="#26231f" opacity={.8} dy={.06} /><Roca x={ob.x + 1} y={ob.y} z={ob.z} rx={.9} ry={.7} semilla={4} color="#7d7a73" /></>;
    case 'lunojod1': return <RocaObjeto ob={{ ...ob, id: ob.id, radio: ob.radio * .55, alto: ob.alto * 1.1 }} color="#77736c" />;
    case 'fosa': return <><Parche x={ob.x} z={ob.z} r={ob.radio * .8} color="#0d0b0a" opacity={.88} dy={.08} seg={48} /><Parche x={ob.x} z={ob.z} r={ob.radio * 1.2} ri={ob.radio * .8} color="#c5c1b8" opacity={.4} dy={.06} seg={48} aros={3} /></>;
    case 'tycho': return <RocaObjeto ob={ob} color="#8a857d" />;
    case 'loki': return <Parche x={ob.x} z={ob.z} r={ob.radio} sx={1.8} sz={.7} ang={1} color="#1e1714" opacity={.93} dy={.08} />;
    case 'steeple': return <Loma ob={{ ...ob, tipo: 'monticulo', radio: ob.radio * 1.15, alto: ob.alto * .75 }} io={io} />;
    default: return <Nube ob={ob} />;
  }
}
function Objeto({ ob, esObjetivo, io }) {
  const { sitio } = useMundo(), roca = io ? '#51402f' : '#6b6762';
  if (!esObjetivo && ob.tipo === 'gemelo') return <Gemelo ob={ob} objetivoId={sitio.objetivo.id} io={io} />;
  switch (ob.forma) {
    case 'modulo': return <Modulo ob={ob} />;
    case 'rover': return <Rover ob={ob} />;
    case 'fosa': return <Fosa ob={ob} />;
    case 'roca': return <RocaObjeto ob={ob} color={roca} />;
    case 'isla': return <Isla ob={ob} />;
    case 'pico': return <Pico ob={ob} />;
    case 'pluma': return <Pluma ob={ob} />;
    case 'crater': return <Cuenco ob={ob} io={io} />;
    case 'loma': return <Loma ob={ob} io={io} />;
    case 'colada': return <Colada ob={ob} />;
    case 'meseta': return <Meseta ob={ob} />;
    default: return null;
  }
}

// ---------- Mundo: suelo, luces, cielo ----------
function Suelo({ io }) {
  const { cfg, sitio, reg } = useMundo();
  const g = useMemo(() => reg(geometriaTerreno(cfg, sitio, io)), [reg, cfg, sitio, io]);
  const gh = useMemo(() => reg(geometriaHorizonte(cfg, sitio, io)), [reg, cfg, sitio, io]);
  const m = useMemo(() => reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })), [reg]);
  const o = sitio.inicio;
  return <>
    <mesh geometry={g} material={m} castShadow receiveShadow />
    <mesh geometry={gh} material={m} receiveShadow />
    <Parche x={o.x} z={o.z} r={3.2} ri={2.6} color="#7fe8ff" emColor="#40d0ff" emisivo={1.2} opacity={.9} dy={.12} seg={36} aros={1} />
  </>;
}
// (Sin columna-baliza: el aro del suelo marca el punto de descenso; la columna tapaba la vista de persecución.)
function Luces({ io, movil }) {
  const { sol } = useMundo(), aj = io ? AJUSTE.io : AJUSTE.luna, tam = movil ? 1024 : 2048;
  return <>
    <ambientLight intensity={.02} />
    <directionalLight position={[sol[0] * 600, sol[1] * 600, sol[2] * 600]} intensity={aj.sol} color={io ? '#fff0d0' : '#fffaf0'} castShadow
      shadow-mapSize={[tam, tam]} shadow-camera-left={-240} shadow-camera-right={240} shadow-camera-top={240} shadow-camera-bottom={-240} shadow-camera-near={50} shadow-camera-far={1300} shadow-bias={-.0005} shadow-normalBias={.4} />
  </>;
}
function Cielo({ io }) {
  const { sol, reg } = useMundo(), tx = useTexture(io ? './texturas/jupiter.jpg' : './texturas/earth_daymap.jpg');
  useMemo(() => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; }, [tx]);
  // El planeta se pone en el lado opuesto al Sol (así se ve casi lleno) y bajo, para que quede sobre el horizonte.
  const az = Math.atan2(sol[0], -sol[2]) + Math.PI, el = (io ? 24 : 36) * RAD, D = 1500;
  const dir = [Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)], radio = io ? D * Math.tan(9.5 * RAD) : D * Math.tan(1.25 * RAD);
  const gP = useMemo(() => reg(new THREE.SphereGeometry(1, 64, 40)), [reg]), gS = useMemo(() => reg(new THREE.SphereGeometry(1, 20, 14)), [reg]);
  const mS = useMemo(() => reg(new THREE.MeshBasicMaterial({ color: '#fff4d6', toneMapped: false })), [reg]);
  return <>
    <mesh geometry={gP} position={[dir[0] * D, dir[1] * D, dir[2] * D]} scale={radio} rotation={[.3, io ? 1 : 2.4, .2]}>
      <meshStandardMaterial map={tx} roughness={.9} emissive="#ffffff" emissiveMap={tx} emissiveIntensity={io ? .06 : .05} />
    </mesh>
    <mesh geometry={gS} material={mS} position={[sol[0] * 2500, sol[1] * 2500, sol[2] * 2500]} scale={24} />
    <Stars radius={2200} depth={200} count={2800} factor={7} saturation={0} fade speed={0} />
  </>;
}

// ---------- Dron ----------
// Chorro de gas frío: cono cuyo vértice está en la boquilla (origen) y que se alarga con el mando.
function Chorro({ refChorro, pos, rot, mat, geo }) {
  return <group position={pos} rotation={rot} ref={refChorro} scale={[1, .001, 1]}><mesh geometry={geo} material={mat} /></group>;
}
function Dron({ dronRef, chorros, tipo = 'M4' }) {
  const { reg } = useMundo(), mod = useRef(null), grp = dronRef;
  const geo = useMemo(() => { const g = reg(new THREE.ConeGeometry(.09, .9, 10, 1, true)); g.translate(0, -.45, 0); return g; }, [reg]);
  const mat = useMemo(() => reg(new THREE.MeshBasicMaterial({ color: '#a8e4ff', transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), [reg]);
  useEffect(() => {
    let modelo = null;
    const cont = mod.current;
    try {
      modelo = crearSonda(tipo); if (tipo !== 'M4') modelo.desplegar?.(1); modelo.objeto.scale.setScalar(1.7); modelo.objeto.rotation.y = Math.PI; // el lente de navegación (+Z del modelo) mira al frente (−Z)
      cont.add(modelo.objeto);
    } catch {
      const g = new THREE.SphereGeometry(.5, 16, 12), m = new THREE.MeshStandardMaterial({ color: '#dfe6ee' }), e = new THREE.Mesh(g, m);
      e.castShadow = true; cont.add(e);
      modelo = { objeto: e, liberar() { g.dispose(); m.dispose(); } };
    }
    return () => { cont.remove(modelo.objeto); modelo.liberar(); };
  }, [tipo]);
  return <group ref={grp}>
    <group ref={mod} />
    <Chorro refChorro={chorros.abajo} pos={[0, -.5, 0]} rot={[0, 0, 0]} mat={mat} geo={geo} />
    <Chorro refChorro={chorros.atras} pos={[0, 0, .55]} rot={[-Math.PI / 2, 0, 0]} mat={mat} geo={geo} />
    <Chorro refChorro={chorros.frente} pos={[0, 0, -.55]} rot={[Math.PI / 2, 0, 0]} mat={mat} geo={geo} />
    <Chorro refChorro={chorros.izq} pos={[-.55, 0, 0]} rot={[0, 0, -Math.PI / 2]} mat={mat} geo={geo} />
    <Chorro refChorro={chorros.der} pos={[.55, 0, 0]} rot={[0, 0, Math.PI / 2]} mat={mat} geo={geo} />
  </group>;
}

// ---------- Cámara, dron suavizado y captura ----------
function Rig({ estadoRef, mandoRef, disparoRef, alCaptura, dronRef, chorros }) {
  const { h } = useMundo(), sm_ = useRef(null), camYaw = useRef(0), fovActual = useRef(0);
  useFrame(({ camera, gl, scene }, dtCrudo) => {
    const dt = Math.min(dtCrudo, .1), s = estadoRef.current, d = s.dron, k = 1 - Math.exp(-16 * dt);
    let a = sm_.current;
    if (!a || Math.hypot(a.x - d.x, a.y - d.y, a.z - d.z) > 8) { a = sm_.current = { x: d.x, y: d.y, z: d.z, yaw: d.yaw }; camYaw.current = d.yaw; }
    else { a.x += (d.x - a.x) * k; a.y += (d.y - a.y) * k; a.z += (d.z - a.z) * k; a.yaw += envolver(d.yaw - a.yaw) * k; }
    // Dron: se inclina hacia donde acelera y los chorros se encienden con el mando.
    const g = dronRef.current, m = mandoRef.current || {}, sy = Math.sin(d.yaw), cy = Math.cos(d.yaw);
    const vAd = -(d.vx * sy + d.vz * cy), vLa = d.vx * cy - d.vz * sy;
    g.position.set(a.x, a.y, a.z); g.rotation.set(-vAd * .03, a.yaw, -vLa * .03, 'YXZ'); g.visible = s.modo !== 'foto';
    const vuelo = s.fase === 'vuelo', ad = vuelo ? m.adelante || 0 : 0, la = vuelo ? m.lateral || 0 : 0, ve = vuelo ? m.vertical || 0 : 0;
    const poner = (c, v) => { if (c.current) { c.current.scale.y = Math.max(.001, v); c.current.visible = v > .02; } };
    const pulso = .9 + .1 * Math.sin(performance.now() / 40);
    poner(chorros.abajo, (.32 + Math.max(0, ve) * .9 - Math.max(0, -ve) * .2) * pulso); poner(chorros.atras, Math.max(0, ad) * pulso); poner(chorros.frente, Math.max(0, -ad) * pulso);
    poner(chorros.izq, Math.max(0, la) * pulso); poner(chorros.der, Math.max(0, -la) * pulso);
    // Cámara.
    let fov = 62;
    if (s.modo === 'foto') {
      const c = camaraDron(s); fov = c.fov;
      camera.position.set(c.pos[0], c.pos[1], c.pos[2]); camera.rotation.order = 'YXZ'; camera.rotation.set(d.inclinacion * RAD, d.yaw, 0);
    } else {
      camYaw.current += envolver(a.yaw - camYaw.current) * (1 - Math.exp(-4 * dt));
      const cx = a.x + Math.sin(camYaw.current) * 7.5, cz = a.z + Math.cos(camYaw.current) * 7.5, cyy = Math.max(a.y + 3.2, h(cx, cz) + 1.8);
      camera.position.set(cx, cyy, cz); camera.lookAt(a.x - Math.sin(a.yaw) * 6, a.y + .2, a.z - Math.cos(a.yaw) * 6);
    }
    if (Math.abs(fovActual.current - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); fovActual.current = fov; }
    // Captura: se dibuja un cuadro con esta misma cámara y se lee en el acto.
    if (disparoRef.current) {
      disparoRef.current = false;
      let url = null;
      // Se recorta el cuadro central (el mismo cuadrado del visor y del motor: alto = fov vertical).
      try {
        gl.render(scene, camera);
        const src = gl.domElement, l = Math.min(src.width, src.height), lado = Math.min(l, 900), c = document.createElement('canvas');
        c.width = c.height = lado;
        c.getContext('2d').drawImage(src, (src.width - l) / 2, (src.height - l) / 2, l, l, 0, 0, lado, lado);
        url = c.toDataURL('image/jpeg', .85);
      } catch { url = null; }
      alCaptura(url);
    }
  });
  return null;
}

export default function Encuentro3D({ estadoRef, mandoRef, disparoRef, alCaptura, cfg }) {
  const sitio = estadoRef.current.sitio, io = cfg.destino === 'io';
  const movil = useMemo(() => !!window.matchMedia?.('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 520, []);
  const dronRef = useRef(null), chorros = { abajo: useRef(), atras: useRef(), frente: useRef(), izq: useRef(), der: useRef() };
  const mundo = useMemo(() => {
    const set = new Set();
    return { cfg, sitio, sol: sitio.sol, h: (x, z) => alturaTerreno(cfg, sitio, x, z), reg: o => { set.add(o); return o; }, liberar: () => set.forEach(o => o.dispose?.()) };
  }, [cfg, sitio]);
  useEffect(() => () => mundo.liberar(), [mundo]);
  const aj = io ? AJUSTE.io : AJUSTE.luna;
  return <Canvas className="enc-canvas" dpr={[1, 1.5]} shadows={movil ? true : 'soft'} camera={{ fov: 62, near: .15, far: 5000, position: [0, 20, 0] }}
    gl={{ antialias: !movil, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = aj.exposicion; }}>
    <Mundo.Provider value={mundo}>
      <color attach="background" args={['#000000']} />
      <Luces io={io} movil={movil} />
      <Suelo io={io} />
      {[sitio.objetivo, ...sitio.senuelos].map((ob, i) => <Objeto key={ob.id || 'objetivo'} ob={ob} esObjetivo={i === 0} io={io} />)}
      <Cielo io={io} />
      <Dron dronRef={dronRef} chorros={chorros} tipo={estadoRef.current.sonda || 'M4'} />
      <Rig estadoRef={estadoRef} mandoRef={mandoRef} disparoRef={disparoRef} alCaptura={alCaptura} dronRef={dronRef} chorros={chorros} />
    </Mundo.Provider>
  </Canvas>;
}

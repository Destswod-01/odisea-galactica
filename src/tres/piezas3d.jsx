/* eslint-disable react-refresh/only-export-components */
// Módulo E del taller 3D: cada pieza de la sonda como modelo suelto (y la maqueta del cohete).
// Los usa la vista previa de las máquinas, el brazo robot y NaveEstudio (una sola versión de cada pieza).
// Las constantes de montaje (RADIO_TANQUE, LARGO_PANEL, …) son la fuente única: NaveEstudio y
// puntoDeMontaje derivan de ellas para no desincronizarse.
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Estudio from './Estudio.jsx';
import NaveEstudio from './NaveEstudio.jsx';
import piezasJson from '../datos/piezas.json';
import cohetesJson from '../datos/cohetes.json';

/* ───────────── constantes de montaje (compartidas con NaveEstudio) ───────────── */
export const RADIO_TANQUE = { tanque_chico: .82, tanque_mediano: .94, tanque_grande: 1.08 };
export const LARGO_PANEL = { panel_chico: 2.2, panel_mediano: 3.6, panel_gigante: 5.2 };
export const RADIO_PLATO = { antena_media: .65, antena_alta: 1.12, antena_ka: 1.12 };
export const Y_PANEL = -.12; // altura de las alas solares sobre el centro de la nave
export const Y_ANTENA = 1.2;
export const Y_BLINDAJE = .82;
export const Y_ANILLO = .38; // altura del anillo de instrumentos
export const Y_SONDA = -1.65;
export const MEDIA_ALTURA = .59; // el cuerpo hexagonal mide 1,18
export const TAM_BLINDAJE = [.82, .35, .72];
const SIN_ANILLO = ['mag', 'sonda_atmosferica'];
const DURACION_APARICION = .45;

export const radioCuerpo = (id) => RADIO_TANQUE[id] || .82;
export const largoPanel = (id) => LARGO_PANEL[id];
export const radioPlato = (id) => RADIO_PLATO[id];

// Posición (local a la nave) de un instrumento del anillo: el orden en diseno.instrumentos manda.
export function lugarEnAnillo(instrumentos, id, r) {
  const lista = instrumentos.includes(id) ? instrumentos : [...instrumentos, id];
  const i = lista.filter((x) => !SIN_ANILLO.includes(x)).indexOf(id);
  const a = (i / Math.max(lista.length, 3)) * Math.PI * 2 + .5;
  return { a, pos: [Math.sin(a) * r, Y_ANILLO, Math.cos(a) * r] };
}

// Dónde dibuja NaveEstudio cada pieza (coordenadas locales a la nave, sin el giro de «girar»).
export function puntoDeMontaje(categoria, id, diseno = {}) {
  const r = radioCuerpo(diseno.propulsion);
  const inst = diseno.instrumentos || [];
  switch (categoria) {
    case 'propulsion': return [0, 0, 0];
    case 'energia': {
      if (id === 'rtg') return [r + .85, 0, 0];
      const L = largoPanel(id) || 3.6;
      return [r + .55 + L / 2, Y_PANEL, 0];
    }
    case 'antena': return [0, Y_ANTENA + .3, 0];
    case 'blindaje': return [0, Y_BLINDAJE, 0];
    case 'instrumentos': {
      if (id === 'sonda_atmosferica') return [0, Y_SONDA, 0];
      if (id === 'mag') {
        const L = largoPanel(diseno.energia);
        return L ? [r + L + 1.85, Y_PANEL, 0] : [0, Y_PANEL, -(r + 1.1)];
      }
      return lugarEnAnillo(inst, id, r + .2).pos;
    }
    default: return [0, 0, 0]; // el cohete va en el pedestal, no en la nave
  }
}

/* ───────────── materiales y geometrías compartidos ───────────── */
const mat = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const MAT = {
  acero: mat('#b3bec7', .8, .32),
  aceroClaro: mat('#d4dde1', .8, .3),
  aluminio: mat('#c9d0d3', .72, .36),
  aluminioClaro: mat('#b6c0c6', .75, .34),
  grafito: mat('#283744', .5, .5),
  oscuro: mat('#2d3c4a', .6, .4),
  negro: mat('#171e25', .4, .55),
  titanio: mat('#75828b', .85, .3),
  oroCuerpo: mat('#7f6a38', .78, .4),
  oroPlaca: mat('#a79764', .85, .35),
  mli: mat('#d9b04a', .9, .3), // aislante dorado tipo MLI
  cobre: mat('#c9743a', .5, .35),
  blanco: mat('#eef0f1', .25, .45),
  crema: mat('#ede9dd', .25, .5),
  alimentador: mat('#c1b48e', .8, .35),
  rtg: mat('#555b5e', .8, .32),
  aletaRtg: mat('#303b44', .7, .4),
  sensor: mat('#e1d9ba', .5, .45),
  naranja: mat('#f08a3c', .4, .45),
  ablativo: mat('#8b7660', .1, .75),
  lente: new THREE.MeshPhysicalMaterial({ color: '#234874', metalness: .65, roughness: .06, clearcoat: 1, clearcoatRoughness: .05 }),
  cristal: new THREE.MeshPhysicalMaterial({ color: '#0f2a3d', metalness: .3, roughness: .04, clearcoat: 1 }),
  led: new THREE.MeshBasicMaterial({ color: '#7be8ee', toneMapped: false }),
  laser: new THREE.MeshBasicMaterial({ color: '#8dff9a', toneMapped: false }),
  uv: new THREE.MeshBasicMaterial({ color: '#b48cff', toneMapped: false }),
  alerta: new THREE.MeshBasicMaterial({ color: '#ff7892', toneMapped: false }),
  tobera: mat('#3c4751', .8, .3, { side: THREE.DoubleSide }),
  parabola: mat('#ede9dd', .25, .5, { side: THREE.DoubleSide }),
  celda: null, // se crea bajo demanda (necesita canvas)
};
const GEO = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  cil: new THREE.CylinderGeometry(1, 1, 1, 28),
  cil8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cil6: new THREE.CylinderGeometry(1, 1, 1, 6),
  esfera: new THREE.SphereGeometry(1, 28, 18),
  plano: new THREE.PlaneGeometry(1, 1),
};
const cacheGeo = new Map();
const geoCache = (clave, crear) => { if (!cacheGeo.has(clave)) cacheGeo.set(clave, crear()); return cacheGeo.get(clave); };
const tronco = (r1, r2, h, seg = 24) => geoCache(`t${r1}|${r2}|${h}|${seg}`, () => new THREE.CylinderGeometry(r2, r1, h, seg)); // r1 abajo, r2 arriba
const toroG = (r, tubo) => geoCache(`o${r}|${tubo}`, () => new THREE.TorusGeometry(r, tubo, 8, 48));
const ogiva = (r, h) => geoCache(`g${r}|${h}`, () => new THREE.LatheGeometry(Array.from({ length: 13 }, (_, i) => { const t = i / 12; return new THREE.Vector2(Math.max(.0001, r * Math.pow(Math.cos(t * Math.PI / 2), .75)), h * t); }), 32));
const paraboloide = (R, prof) => geoCache(`p${R}|${prof}`, () => new THREE.LatheGeometry(Array.from({ length: 25 }, (_, i) => { const x = R * i / 24; return new THREE.Vector2(x, prof * x * x / (R * R)); }), 64));

let texCeldas = null;
function materialCelda() {
  if (MAT.celda) return MAT.celda;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0a1840'; g.fillRect(0, 0, 256, 256);
  const N = 6, s = 256 / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const gr = g.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
    gr.addColorStop(0, (i + j) % 2 ? '#1c3a66' : '#17325a'); gr.addColorStop(1, '#0f2547');
    g.fillStyle = gr; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    g.fillStyle = 'rgba(190,215,255,.55)'; // colectores de plata
    g.fillRect(i * s + s * .33, j * s + 2, 1.5, s - 4); g.fillRect(i * s + s * .66, j * s + 2, 1.5, s - 4);
  }
  g.strokeStyle = '#8fb6f0'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 253, 253);
  texCeldas = new THREE.CanvasTexture(c);
  texCeldas.colorSpace = THREE.SRGBColorSpace;
  texCeldas.anisotropy = 8;
  MAT.celda = new THREE.MeshPhysicalMaterial({ map: texCeldas, color: '#8fb8e6', metalness: .5, roughness: .25, clearcoat: .5 });
  return MAT.celda;
}

const reducido = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Material propio (colores de estética) que se libera al desmontar.
function useMat(color, metalness, roughness) {
  const m = useMemo(() => mat(color, metalness, roughness), [color, metalness, roughness]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/* ───────────── primitivas ───────────── */
function Malla({ g, m, p, rot, s, sombra = true }) {
  return <mesh geometry={g} material={m} position={p} rotation={rot} scale={s} castShadow={sombra} dispose={null} />;
}
const Caja = ({ t, ...p }) => <Malla g={GEO.caja} s={t} {...p} />;
const Cil = ({ r, h, seg = 28, ...p }) => <Malla g={seg === 8 ? GEO.cil8 : seg === 6 ? GEO.cil6 : GEO.cil} s={[r, h, r]} {...p} />;
const Esf = ({ r, s, ...p }) => <Malla g={GEO.esfera} s={s || [r, r, r]} {...p} />;
const Tronco = ({ r1, r2, h, seg, ...p }) => <Malla g={tronco(r1, r2, h, seg)} {...p} />;
const Aro = ({ r, tubo = .02, ...p }) => <Malla g={toroG(r, tubo)} {...p} />;
// Cilindro con el eje en Z (hacia fuera): r1 en la base, r2 en la punta.
const Tubo = ({ r, r2 = r, l, p, m, seg }) => <Tronco r1={r} r2={r2} h={l} seg={seg} p={p} rot={[Math.PI / 2, 0, 0]} m={m} />;

const _o = new THREE.Object3D();
const _y = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
// Matriz de una instancia: rotada en Y por `ry` después de colocar (p, rot, s).
export function m4(p, s, rot = [0, 0, 0], ry = 0) {
  _o.position.set(p[0], p[1], p[2]); _o.rotation.set(rot[0], rot[1], rot[2]); _o.scale.set(s[0], s[1], s[2]); _o.updateMatrix();
  return new THREE.Matrix4().makeRotationY(ry).multiply(_o.matrix);
}
// Matriz de una barra cilíndrica (geometría unitaria de eje Y) entre dos puntos.
export function matrizBarra(a, b, rad) {
  _a.set(a[0], a[1], a[2]); _d.set(b[0], b[1], b[2]).sub(_a);
  const largo = _d.length(); _d.normalize();
  _q.setFromUnitVectors(_y, _d); _p.copy(_a).addScaledVector(_d, largo / 2); _s.set(rad, largo, rad);
  return new THREE.Matrix4().compose(_p, _q, _s);
}
// Varias mallas iguales en una sola llamada de dibujo.
export function Inst({ g, m, mats }) {
  const ref = useRef();
  useLayoutEffect(() => {
    mats.forEach((x, i) => ref.current.setMatrixAt(i, x));
    ref.current.instanceMatrix.needsUpdate = true;
  }, [mats]);
  return <instancedMesh key={mats.length} ref={ref} args={[g, m, mats.length]} frustumCulled={false} castShadow dispose={null} />;
}
export function Barras({ lista, rad = .02, m = MAT.aluminio }) {
  const mats = useMemo(() => lista.map(([a, b]) => matrizBarra(a, b, rad)), [lista, rad]);
  return <Inst g={GEO.cil8} m={m} mats={mats} />;
}
const Barra = ({ a, b, rad = .025, m = MAT.acero }) => { const lista = useMemo(() => [[a, b]], [a, b]); return <Barras lista={lista} rad={rad} m={m} />; };

/* ───────────── animación de aparición (0,45 s) ───────────── */
// Envuelve una pieza: escala 0 → 1 con rebote corto y un destello aditivo que se apaga.
// Se dispara cuando `activa` pasa a true o cambia `clave` (p. ej. se reemplaza la pieza).
export function Aparece({ activa = false, clave = '', radio = 1, centro = [0, 0, 0], color = '#9be9ee', children, ...resto }) {
  const grupo = useRef(), destello = useRef();
  const t = useRef(DURACION_APARICION);
  const mDest = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [color]);
  useEffect(() => () => mDest.dispose(), [mDest]);
  useLayoutEffect(() => {
    if (!activa || reducido()) return;
    t.current = 0;
    grupo.current?.scale.setScalar(.001);
    if (destello.current) destello.current.visible = true;
  }, [activa, clave]);
  useFrame((_, dt) => {
    const g = grupo.current;
    if (!g || t.current >= DURACION_APARICION) return;
    t.current += dt;
    const k = Math.min(1, t.current / DURACION_APARICION);
    const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // easeOutBack corto
    g.scale.setScalar(Math.max(.001, k >= 1 ? 1 : e));
    mDest.opacity = .75 * Math.pow(1 - k, 2);
    if (k >= 1 && destello.current) destello.current.visible = false;
  });
  return <group ref={grupo} {...resto}>
    {children}
    <mesh ref={destello} geometry={GEO.esfera} material={mDest} position={centro} scale={radio} visible={false} dispose={null} />
  </group>;
}

/* ───────────── cuerpo / tanque de propelente (categoría propulsion) ───────────── */
export function Cuerpo({ id, r = .82, color = '#c9d3e6', detalle = '#8ecedb' }) {
  const nivel = { tanque_chico: 1, tanque_mediano: 2, tanque_grande: 3 }[id] || 1;
  const mCasco = useMat(color, .8, .32), mDetalle = useMat(detalle, .6, .35);
  const d = useMemo(() => {
    const caras = [0, 1, 2, 3, 4, 5].map((i) => i * Math.PI / 3);
    const placasCasco = [], placasOro = [], franjas = [], tornillos = [], rejillas = [], aristas = [], bandas = [];
    caras.forEach((ry, i) => {
      (i % 3 === 0 ? placasCasco : placasOro).push(m4([0, 0, r * .87], [r * .88, 1.06, .035], [0, 0, 0], ry));
      franjas.push(m4([0, .41, r * .9], [r * .78, .035, .02], [0, 0, 0], ry));
      bandas.push(m4([0, -.43, r * .9], [r * .8, .03, .02], [0, 0, 0], ry));
      [-1, 1].forEach((x) => [-1, 1].forEach((y) => tornillos.push(m4([x * r * .38, y * .44, r * .9], [.025, .035, .025], [Math.PI / 2, 0, 0], ry))));
      if (i % 3 === 0) for (let j = 0; j < 8; j++) rejillas.push(m4([0, -.35 + j * .075, r * .91], [r * .65, .025, .025], [0, 0, 0], ry));
      const th = i * Math.PI / 3 + Math.PI / 6;
      aristas.push(m4([Math.sin(th) * r, 0, Math.cos(th) * r], [.03, 1.18, .03]));
    });
    return { placasCasco, placasOro, franjas, tornillos, rejillas, aristas, bandas };
  }, [r]);
  return <group>
    <Malla g={GEO.cil6} m={MAT.oroCuerpo} s={[r, 1.18, r]} rot={[0, Math.PI / 6, 0]} />
    {[-.61, .61].map((y) => <Malla key={y} g={GEO.cil6} m={mCasco} s={[r * 1.04, .065, r * 1.04]} p={[0, y, 0]} rot={[0, Math.PI / 6, 0]} />)}
    <Inst g={GEO.caja} m={mCasco} mats={d.placasCasco} />
    <Inst g={GEO.caja} m={MAT.oroPlaca} mats={d.placasOro} />
    <Inst g={GEO.caja} m={mDetalle} mats={d.franjas} />
    <Inst g={GEO.caja} m={MAT.mli} mats={d.bandas} />
    <Inst g={GEO.cil6} m={MAT.aceroClaro} mats={d.tornillos} />
    <Inst g={GEO.caja} m={MAT.grafito} mats={d.rejillas} />
    <Inst g={GEO.caja} m={MAT.aluminioClaro} mats={d.aristas} />
    {/* indicador de nivel de propelente: 1, 2 o 3 barras según el tanque */}
    <group rotation={[0, Math.PI / 3, 0]}>
      <Caja t={[.2, .13, .012]} p={[r * .3, -.14, r * .915]} m={MAT.negro} />
      {Array.from({ length: nivel }, (_, k) => <Caja key={k} t={[.035, .09, .012]} p={[r * .3 - .06 + k * .06, -.14, r * .925]} m={MAT.led} sombra={false} />)}
    </group>
  </group>;
}

/* ───────────── alas solares ───────────── */
export function PanelSolar({ largo }) {
  const n = Math.max(1, Math.round(largo / 1.1)), w = largo / n;
  const d = useMemo(() => {
    const marcos = [], celdas = [], traseras = [], bordes = [], bisagras = [], diag = [];
    for (let i = 0; i < n; i++) {
      const x = .55 + (i + .5) * w;
      marcos.push(m4([x, 0, 0], [w, .065, 1.18]));
      celdas.push(m4([x, .036, 0], [w - .09, 1.04, 1], [-Math.PI / 2, 0, 0]));
      traseras.push(m4([x, -.05, 0], [w, .04, .035]));
      bordes.push(m4([x - w / 2, .045, 0], [.055, .03, 1.18]));
      diag.push([[x - w / 2, -.06, -.52], [x + w / 2, -.06, .52]], [[x - w / 2, -.06, .52], [x + w / 2, -.06, -.52]]);
    }
    for (let i = 0; i <= n; i++) bisagras.push(m4([.55 + i * w, .02, 0], [.03, 1.24, .03], [Math.PI / 2, 0, 0]));
    const largueros = [-.6, .6].map((z) => matrizBarra([.55, .02, z], [.55 + largo, .02, z], .016));
    return { marcos, celdas, traseras, bordes, bisagras, largueros, diag };
  }, [n, w, largo]);
  return <group>
    <Barra a={[0, 0, 0]} b={[.55, 0, 0]} rad={.055} />
    <Caja t={[.18, .15, .15]} p={[.06, 0, 0]} m={MAT.oscuro} />
    <Aro r={.1} tubo={.018} p={[.2, 0, 0]} rot={[0, Math.PI / 2, 0]} m={MAT.naranja} />
    <Inst g={GEO.caja} m={MAT.aluminioClaro} mats={d.marcos} />
    <Inst g={GEO.plano} m={materialCelda()} mats={d.celdas} />
    <Inst g={GEO.caja} m={MAT.oscuro} mats={d.traseras} />
    <Inst g={GEO.caja} m={MAT.grafito} mats={d.bordes} />
    <Inst g={GEO.cil8} m={MAT.acero} mats={d.bisagras} />
    <Inst g={GEO.cil8} m={MAT.acero} mats={d.largueros} />
    <Barras lista={d.diag} rad={.012} m={MAT.acero} />
  </group>;
}

/* ───────────── generador de radioisótopos (RTG) ───────────── */
export function Rtg({ lado = 1 }) {
  const aletas = useMemo(() => Array.from({ length: 11 }, (_, i) => m4([0, -.45 + i * .09, 0], [.31, .022, .31])), []);
  return <group>
    <Barra a={[-lado * .85, 0, 0]} b={[0, 0, 0]} rad={.055} />
    <Cil r={.22} h={.95} m={MAT.rtg} />
    <Inst g={GEO.cil8} m={MAT.aletaRtg} mats={aletas} />
    {[-1, 1].map((s) => <Cil key={s} r={.24} h={.05} p={[0, s * .5, 0]} m={MAT.mli} />)}
    <Cil r={.235} h={.05} p={[0, 0, 0]} m={MAT.naranja} />
    <Caja t={[.2, .12, .2]} p={[-lado * .2, 0, 0]} m={MAT.oscuro} />
  </group>;
}

/* ───────────── antena de alta ganancia ───────────── */
export function Antena({ radio, ka = false }) {
  const d = useMemo(() => {
    const prof = .34, nCostillas = radio > .9 ? 14 : 8, lista = [];
    for (let k = 0; k < nCostillas; k++) {
      const ang = k / nCostillas * Math.PI * 2;
      for (let i = 0; i < 6; i++) {
        const x0 = radio * i / 6, x1 = radio * (i + 1) / 6;
        lista.push([[Math.cos(ang) * x0, prof * x0 * x0 / (radio * radio) + .006, Math.sin(ang) * x0], [Math.cos(ang) * x1, prof * x1 * x1 / (radio * radio) + .006, Math.sin(ang) * x1]]);
      }
    }
    const patas = [0, 2.094, 4.189].map((a) => [[Math.cos(a) * radio * .85, .24, Math.sin(a) * radio * .85], [0, .85, 0]]);
    return { costillas: lista, patas };
  }, [radio]);
  return <group>
    <Cil r={.09} h={.5} p={[0, -.2, 0]} m={MAT.acero} />
    <Cil r={.17} h={.05} p={[0, -.45, 0]} m={MAT.oscuro} />
    <Caja t={[.3, .08, .12]} p={[0, -.08, 0]} m={MAT.grafito} />
    <Malla g={paraboloide(radio, .34)} m={MAT.parabola} />
    <Aro r={radio} tubo={.022} p={[0, .34, 0]} rot={[Math.PI / 2, 0, 0]} m={MAT.aluminioClaro} />
    <Barras lista={d.costillas} rad={.007} m={MAT.aluminioClaro} />
    <Barras lista={d.patas} rad={.017} m={MAT.acero} />
    <Tronco r1={.075} r2={.11} h={.15} p={[0, .82, 0]} m={MAT.alimentador} />
    {ka && <>
      {/* alimentador dorado extra de la banda Ka */}
      <Tronco r1={.06} r2={.15} h={.24} p={[0, 1, 0]} m={MAT.mli} />
      <Cil r={.1} h={.015} p={[0, 1.14, 0]} m={MAT.mli} />
      {[0, 2.094, 4.189].map((a) => <Barra key={a} a={[Math.cos(a) * .08, 1.12, Math.sin(a) * .08]} b={[Math.cos(a) * .1, 1.01, Math.sin(a) * .1]} rad={.008} m={MAT.mli} />)}
    </>}
  </group>;
}

/* ───────────── blindaje ───────────── */
export function Blindaje({ id, simbolo = false }) {
  const [W, H, D] = TAM_BLINDAJE;
  const d = useMemo(() => {
    const t = id === 'boveda_titanio';
    const tornillos = [];
    const filas = t ? 6 : 4;
    for (let i = 0; i < filas; i++) {
      const x = -W / 2 + .06 + (W - .12) * i / (filas - 1);
      [-1, 1].forEach((sz) => [-1, 1].forEach((sy) => tornillos.push(m4([x, sy * (H / 2 - .05), sz * (D / 2)], [.022, .03, .022], [Math.PI / 2, 0, 0]))));
    }
    const marco = [];
    const v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => [x * W / 2, y * H / 2, z * D / 2]);
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => marco.push([v[a], v[b]]));
    return { tornillos, marco };
  }, [id, W, H, D]);
  if (id === 'blindaje_ninguno') return <group>
    <Barras lista={d.marco} rad={.022} m={MAT.aluminio} />
    <Caja t={[.5, .05, .4]} p={[0, -.1, 0]} m={MAT.grafito} />
    {[[-.14, .08], [.14, -.06], [.1, .12]].map(([x, z], k) => <Caja key={k} t={[.1, .04, .08]} p={[x, -.05, z]} m={MAT.negro} />)}
    {simbolo && <group position={[0, .24, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <Aro r={.22} tubo={.026} m={MAT.alerta} sombra={false} />
      <Caja t={[.5, .05, .025]} rot={[0, 0, Math.PI / 4]} m={MAT.alerta} sombra={false} />
    </group>}
  </group>;
  if (id === 'boveda_titanio') return <group>
    <Caja t={[W, H, D]} m={MAT.titanio} />
    <Caja t={[W * .86, .04, D * .84]} p={[0, H / 2 + .015, 0]} m={MAT.acero} />
    <Caja t={[W * .86, H * .8, D + .05]} m={MAT.titanio} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <Caja key={`${sx}${sz}`} t={[.09, H + .04, .09]} p={[sx * W / 2, 0, sz * D / 2]} m={MAT.grafito} />))}
    <Caja t={[W * .5, .035, .05]} p={[0, H / 2 + .045, 0]} m={MAT.mli} />
    <Inst g={GEO.cil6} m={MAT.aceroClaro} mats={d.tornillos} />
  </group>;
  return <group>
    <Caja t={[W, H, D]} m={MAT.aluminio} />
    {[-.34, .34].map((x) => <Caja key={x} t={[.03, .025, D + .01]} p={[x, H / 2, 0]} m={MAT.grafito} />)}
    {[-1, 1].map((s) => <Caja key={s} t={[W + .01, .02, .02]} p={[0, 0, s * (D / 2)]} m={MAT.grafito} />)}
    <Inst g={GEO.cil6} m={MAT.aceroClaro} mats={d.tornillos} />
  </group>;
}

/* ───────────── instrumentos ───────────── */
// Marco común: +Z hacia fuera de la nave, +Y arriba; el origen está sobre la pared del cuerpo.
const Placa = () => <Caja t={[.3, .3, .12]} p={[0, 0, -.06]} m={MAT.oscuro} />;
const INSTRUMENTOS = {
  mwr: () => <>
    <Caja t={[.36, .5, .05]} p={[0, 0, .08]} m={MAT.blanco} />
    {[0, 1, 2, 3, 4].map((i) => <Caja key={i} t={[.3, .022, .012]} p={[0, -.18 + i * .09, .11]} m={MAT.negro} sombra={false} />)}
    <Caja t={[.4, .03, .06]} p={[0, .26, .08]} m={MAT.mli} /><Caja t={[.4, .03, .06]} p={[0, -.26, .08]} m={MAT.mli} />
  </>,
  gravedad: () => <>
    <Caja t={[.3, .24, .18]} p={[0, 0, .09]} m={MAT.mli} />
    <Tronco r1={.03} r2={.11} h={.2} p={[0, 0, .28]} rot={[Math.PI / 2, 0, 0]} m={MAT.aluminio} />
    <Aro r={.11} tubo={.012} p={[0, 0, .38]} m={MAT.acero} />
    <Esf r={.035} p={[.12, .1, .2]} m={MAT.negro} />
  </>,
  mag: () => <>
    <Tubo r={.018} l={.8} p={[0, 0, .4]} m={MAT.aceroClaro} />
    <Caja t={[.22, .2, .24]} p={[0, 0, .82]} m={MAT.sensor} />
    <Caja t={[.12, .12, .14]} p={[0, 0, .5]} m={MAT.sensor} />
    <Caja t={[.1, .04, .1]} p={[0, .12, .82]} m={MAT.negro} />
  </>,
  jiram: () => <>
    <Caja t={[.26, .26, .2]} p={[0, 0, .1]} m={MAT.mli} />
    <Tubo r={.11} l={.36} p={[0, 0, .38]} m={MAT.blanco} />
    {[.3, .46].map((z) => <Tubo key={z} r={.12} l={.03} p={[0, 0, z]} m={MAT.aluminio} />)}
    <Tubo r={.095} l={.012} p={[0, 0, .565]} m={MAT.negro} />
    <Tubo r={.07} l={.012} p={[0, 0, .572]} m={MAT.lente} />
  </>,
  particulas: () => <>
    <Caja t={[.36, .22, .1]} p={[0, 0, .08]} m={MAT.grafito} />
    {[-1, 0, 1].map((k) => <group key={k} position={[k * .11, 0, .2]} rotation={[0, -k * .35, 0]}>
      <Caja t={[.08, .17, .14]} m={MAT.aluminio} />
      <Caja t={[.05, .1, .012]} p={[0, 0, .075]} m={MAT.negro} sombra={false} />
    </group>)}
    <Tubo r={.05} l={.1} p={[0, .14, .12]} m={MAT.mli} />
  </>,
  uvs_waves: () => <>
    <Caja t={[.3, .34, .16]} p={[0, 0, .08]} m={MAT.blanco} />
    <Caja t={[.02, .24, .012]} p={[0, 0, .166]} m={MAT.uv} sombra={false} />
    <Tubo r={.05} l={.04} p={[0, -.1, .17]} m={MAT.negro} />
    <Caja t={[.22, .012, .012]} p={[-.14, .22, .08]} m={MAT.aceroClaro} /><Caja t={[.22, .012, .012]} p={[.14, .22, .08]} m={MAT.aceroClaro} />
    <Caja t={[.05, .06, .05]} p={[0, .2, .08]} m={MAT.oscuro} />
  </>,
  junocam: () => <>
    <Caja t={[.24, .2, .18]} p={[0, 0, .09]} m={MAT.blanco} />
    <Caja t={[.24, .035, .19]} p={[0, .1, .09]} m={MAT.naranja} />
    <Tubo r={.09} l={.1} p={[0, 0, .23]} m={MAT.oscuro} />
    <Tronco r1={.1} r2={.14} h={.08} p={[0, 0, .3]} rot={[Math.PI / 2, 0, 0]} m={MAT.negro} />
    <Esf s={[.075, .075, .035]} p={[0, 0, .3]} m={MAT.lente} />
  </>,
  camara_hd: () => <>
    <Caja t={[.26, .26, .2]} p={[0, 0, .1]} m={MAT.oscuro} />
    <Tubo r={.14} l={.5} p={[0, 0, .45]} m={MAT.blanco} />
    {[.3, .45, .6].map((z) => <Tubo key={z} r={.152} l={.03} p={[0, 0, z]} m={MAT.aluminio} />)}
    <Tronco r1={.15} r2={.2} h={.14} p={[0, 0, .75]} rot={[Math.PI / 2, 0, 0]} m={MAT.negro} />
    <Tubo r={.125} l={.012} p={[0, 0, .69]} m={MAT.lente} />
  </>,
  lroc: () => <>
    <Caja t={[.3, .2, .16]} p={[0, 0, .06]} m={MAT.oscuro} />
    {[-1, 1].map((s) => <group key={s} position={[s * .08, -.03, 0]}>
      <Tubo r={.06} l={.55} p={[0, 0, .33]} m={MAT.negro} />
      {[.2, .45].map((z) => <Tubo key={z} r={.065} l={.03} p={[0, 0, z]} m={MAT.blanco} />)}
      <Tronco r1={.062} r2={.08} h={.06} p={[0, 0, .62]} rot={[Math.PI / 2, 0, 0]} m={MAT.blanco} />
      <Tubo r={.05} l={.012} p={[0, 0, .6]} m={MAT.lente} />
    </group>)}
    <Caja t={[.12, .1, .1]} p={[0, .12, .08]} m={MAT.blanco} />
    <Tubo r={.04} l={.1} p={[0, .12, .16]} m={MAT.negro} />
  </>,
  lend: () => <>
    <Cil r={.14} h={.5} p={[0, 0, .17]} m={MAT.acero} />
    {[-.2, -.12, -.04, .04, .12, .2].map((y) => <Cil key={y} r={.152} h={.022} p={[0, y, .17]} m={MAT.grafito} />)}
    <Cil r={.15} h={.05} p={[0, .27, .17]} m={MAT.mli} />
    <Cil r={.15} h={.05} p={[0, -.27, .17]} m={MAT.mli} />
    <Caja t={[.06, .3, .02]} p={[0, 0, .315]} m={MAT.negro} sombra={false} />
  </>,
  lola: () => <>
    <Caja t={[.3, .28, .2]} p={[0, 0, .1]} m={MAT.grafito} />
    <Caja t={[.3, .04, .2]} p={[0, .16, .1]} m={MAT.mli} />
    <Tubo r={.08} l={.2} p={[0, -.02, .3]} m={MAT.negro} />
    <Tubo r={.06} l={.012} p={[0, -.02, .4]} m={MAT.lente} />
    <Tubo r={.035} l={.26} p={[0, .1, .33]} m={MAT.aceroClaro} />
    <Esf r={.028} p={[0, .1, .47]} m={MAT.laser} sombra={false} />
    {[-.1, -.05, 0, .05, .1].map((x) => <Esf key={x} r={.012} p={[x, -.12, .21]} m={MAT.oscuro} sombra={false} />)}
  </>,
  diviner: () => <>
    <Caja t={[.28, .26, .16]} p={[0, 0, .08]} m={MAT.blanco} />
    <Cil r={.08} h={.2} p={[0, 0, .22]} rot={[0, 0, Math.PI / 2]} m={MAT.acero} />
    <Esf s={[.07, .05, .05]} p={[0, 0, .3]} m={MAT.negro} />
    <Caja t={[.3, .02, .2]} p={[0, .15, .1]} m={MAT.grafito} />
    {[-.1, -.05, 0, .05, .1].map((x) => <Caja key={x} t={[.012, .1, .2]} p={[x, .21, .1]} m={MAT.aluminio} />)}
  </>,
  lamp: () => <>
    <Caja t={[.3, .1, .2]} p={[0, -.1, .1]} m={MAT.grafito} />
    <Cil r={.13} h={.32} p={[0, .04, .16]} rot={[0, 0, Math.PI / 2]} m={MAT.aluminio} />
    {[-.17, .17].map((x) => <Cil key={x} r={.135} h={.02} p={[x, .04, .16]} rot={[0, 0, Math.PI / 2]} m={MAT.mli} />)}
    <Tubo r={.045} l={.03} p={[0, .06, .29]} m={MAT.negro} />
    <Tubo r={.03} l={.012} p={[0, .06, .31]} m={MAT.uv} />
    <Caja t={[.24, .05, .03]} p={[0, -.05, .22]} m={MAT.mli} />
  </>,
  crater: () => <>
    <Cil r={.08} h={.5} p={[0, 0, .15]} m={MAT.aluminio} />
    {[-.14, 0, .14].map((y) => <Cil key={y} r={.12} h={.02} p={[0, y, .15]} m={MAT.mli} />)}
    <Esf r={.08} p={[0, .26, .15]} m={MAT.blanco} />
    <Caja t={[.1, .5, .06]} p={[0, 0, .04]} m={MAT.grafito} />
  </>,
  minirf: () => <>
    <Caja t={[.58, .38, .035]} p={[0, 0, .22]} m={MAT.blanco} />
    {[-.24, -.16, -.08, 0, .08, .16, .24].map((x) => <Caja key={x} t={[.012, .32, .012]} p={[x, 0, .242]} m={MAT.negro} sombra={false} />)}
    {[-1, 1].map((sy) => <Caja key={sy} t={[.6, .025, .05]} p={[0, sy * .19, .22]} m={MAT.mli} />)}
    {[-1, 1].map((sx) => [-1, 1].map((sy) => <Cil key={`${sx}${sy}`} r={.015} h={.14} p={[sx * .25, sy * .15, .1]} rot={[Math.PI / 2, 0, 0]} m={MAT.acero} seg={8} />))}
  </>,
  sonda_atmosferica: () => <>
    {/* escudo térmico hacia abajo (−Y), cápsula y paracaídas arriba */}
    <Malla g={geoCache('cono', () => new THREE.ConeGeometry(.6, .35, 48))} m={MAT.ablativo} rot={[Math.PI, 0, 0]} />
    <Aro r={.5} tubo={.012} p={[0, -.02, 0]} rot={[Math.PI / 2, 0, 0]} m={MAT.grafito} />
    <Aro r={.3} tubo={.012} p={[0, -.12, 0]} rot={[Math.PI / 2, 0, 0]} m={MAT.grafito} />
    <Tronco r1={.28} r2={.2} h={.22} p={[0, .28, 0]} m={MAT.aluminio} />
    <Cil r={.09} h={.08} p={[0, .43, 0]} m={MAT.naranja} />
    <Barra a={[.12, .4, 0]} b={[.2, .6, 0]} rad={.01} />
  </>,
};
// Centro aproximado y escala para centrar cada instrumento en la vista previa.
const AJUSTE = { mag: { c: [0, 0, .42], s: 1.05 }, camara_hd: { c: [0, 0, .38], s: 1.3 }, lroc: { c: [0, 0, .3], s: 1.5 }, sonda_atmosferica: { c: [0, .12, 0], s: 1.2 }, minirf: { c: [0, 0, .2], s: 1.5 }, jiram: { c: [0, 0, .28], s: 1.6 }, lend: { c: [0, 0, .17], s: 1.7 }, crater: { c: [0, 0, .15], s: 1.7 } };

export function InstrumentoModelo({ id }) {
  const Forma = INSTRUMENTOS[id];
  if (!Forma) return <Caja t={[.3, .3, .3]} p={[0, 0, .15]} m={MAT.aluminio} />;
  return <group dispose={null}>{id !== 'sonda_atmosferica' && id !== 'mag' && <Placa />}<Forma /></group>;
}

/* ───────────── maqueta del cohete ───────────── */
function PropulsorSolido({ p }) {
  return <group position={p}>
    <Cil r={.16} h={3.2} m={MAT.blanco} />
    <Malla g={ogiva(.16, .5)} m={MAT.blanco} p={[0, 1.6, 0]} />
    {[-1.1, .2, 1.2].map((y) => <Cil key={y} r={.165} h={.05} p={[0, y, 0]} m={MAT.grafito} />)}
    <Tronco r1={.07} r2={.15} h={.3} p={[0, -1.72, 0]} m={MAT.tobera} />
    <Cil r={.17} h={.12} p={[0, -1.55, 0]} m={MAT.oscuro} />
  </group>;
}
function NucleoCohete({ r, h, y = 0, color, toberas = 2, bandas = [] }) {
  const pos = toberas === 1 ? [[0, 0]] : toberas === 2 ? [[-.15, 0], [.15, 0]] : [[0, .18], [-.16, -.1], [.16, -.1]];
  return <group position={[0, y, 0]}>
    <Cil r={r} h={h} m={color} />
    {bandas.map((b) => <Cil key={b} r={r + .006} h={.07} p={[0, b * h / 2, 0]} m={MAT.grafito} />)}
    <Cil r={r + .01} h={.06} p={[0, h / 2 - .05, 0]} m={MAT.negro} />
    <Tronco r1={r * .7} r2={r} h={.3} p={[0, -h / 2 - .15, 0]} m={MAT.oscuro} />
    {pos.map(([x, z], k) => <Tronco key={k} r1={.075} r2={.2} h={.45} p={[x * r / .42, -h / 2 - .45, z]} m={MAT.tobera} />)}
    <Caja t={[.035, h * .94, .075]} p={[r, 0, 0]} m={MAT.acero} />
    <Caja t={[.035, h * .94, .075]} p={[-r, 0, 0]} m={MAT.acero} />
  </group>;
}
export function CoheteMini({ id, altura = 3.2 }) {
  const c = cohetesJson.find((x) => x.id === id);
  const pesado = id === 'pesado';
  const solidos = pesado ? 0 : (c?.solidos ?? 0);
  const fondo = -2.85, tope = pesado ? 6.5 : 6.0, s = altura / (tope - fondo);
  const sol = useMemo(() => Array.from({ length: solidos }, (_, k) => { const a = (k / solidos) * Math.PI * 2 + .4; return [Math.cos(a) * .6, -.8, Math.sin(a) * .6]; }), [solidos]);
  const rf = pesado ? .78 : .5, ru = pesado ? .52 : .42, yu = pesado ? 3.3 : 3.1;
  return <group scale={s} dispose={null}><group position={[0, -fondo, 0]}>
    {pesado ? <>
      <NucleoCohete r={.52} h={5.4} y={.1} color={MAT.blanco} toberas={3} bandas={[-.7, -.2, .45]} />
      {[-1, 1].map((sx) => <group key={sx} position={[sx * .98, 0, 0]}>
        <NucleoCohete r={.42} h={4.4} y={-.5} color={MAT.crema} toberas={2} bandas={[-.6, .1, .7]} />
        <Malla g={ogiva(.42, .9)} m={MAT.cobre} p={[0, 1.7, 0]} />
        <Caja t={[.55, .3, .4]} p={[-sx * .55, 1.1, 0]} m={MAT.grafito} />
      </group>)}
      <Cil r={.62} h={.2} p={[0, 2.9, 0]} m={MAT.negro} />
    </> : <>
      <NucleoCohete r={.42} h={5} color={MAT.cobre} toberas={2} bandas={[-.9, -.35, .3]} />
      <Cil r={.435} h={.22} p={[0, 2.5, 0]} m={MAT.negro} />
      {sol.map((p, k) => <PropulsorSolido key={k} p={p} />)}
    </>}
    {/* etapa superior, adaptador y cofia */}
    <Cil r={ru} h={1.2} p={[0, yu, 0]} m={MAT.blanco} />
    <Cil r={ru + .005} h={.06} p={[0, yu - .3, 0]} m={MAT.grafito} />
    <Tronco r1={ru} r2={rf} h={.14} p={[0, yu + .65, 0]} m={MAT.blanco} />
    <Cil r={rf} h={1.4} p={[0, yu + 1.42, 0]} m={MAT.blanco} />
    {[0, 1, 2, 3, 4, 5].map((k) => <Caja key={k} t={[.05, .35, .02]} p={[Math.sin(k * 1.047) * (rf + .005), yu + 1.2, Math.cos(k * 1.047) * (rf + .005)]} rot={[0, k * 1.047, 0]} m={MAT.grafito} sombra={false} />)}
    <Aro r={rf} tubo={.012} p={[0, yu + 1.42, 0]} rot={[Math.PI / 2, 0, 0]} m={MAT.aluminio} />
    <Malla g={ogiva(rf, pesado ? 1.4 : 1.0)} m={MAT.blanco} p={[0, yu + 2.12, 0]} />
  </group></group>;
}

/* ───────────── pieza suelta (vista previa del holograma) ───────────── */
export function PiezaModelo({ categoria, id, estetica, escala = 1 }) {
  const color = estetica?.casco || '#c9d3e6', detalle = estetica?.detalle || '#8ecedb';
  let pieza = null;
  if (categoria === 'cohete') pieza = <group position={[0, -.8, 0]}><CoheteMini id={id} altura={1.6} /></group>;
  else if (categoria === 'propulsion') pieza = <group scale={.68}><Cuerpo id={id} r={radioCuerpo(id)} color={color} detalle={detalle} /></group>;
  else if (categoria === 'energia' && id === 'rtg') pieza = <group scale={.9} position={[.38, 0, 0]}><Rtg /></group>;
  else if (categoria === 'energia') {
    const L = largoPanel(id) || 3.6;
    pieza = <group scale={.3} rotation={[.5, 0, 0]}><group position={[-(L + .55) / 2, 0, 0]}><PanelSolar largo={L} /></group></group>;
  } else if (categoria === 'antena') pieza = <group scale={.55} position={[0, -.17, 0]}><Antena radio={radioPlato(id) || .65} ka={id === 'antena_ka'} /></group>;
  else if (categoria === 'blindaje') pieza = <group scale={1.4}><Blindaje id={id} simbolo /></group>;
  else if (categoria === 'instrumentos') {
    const a = AJUSTE[id] || { c: [0, 0, .2], s: 1.9 };
    pieza = <group scale={a.s} position={[-a.c[0] * a.s, -a.c[1] * a.s, -a.c[2] * a.s]}><InstrumentoModelo id={id} /></group>;
  }
  return <group scale={escala} dispose={null}>{pieza}</group>;
}

/* ───────────── banco de pruebas ───────────── */
const texRotulos = new Map();
function texturaRotuloId(texto) {
  if (texRotulos.has(texto)) return texRotulos.get(texto);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(16,24,34,.88)';
  g.beginPath(); g.roundRect(4, 8, 504, 80, 18); g.fill();
  g.strokeStyle = '#9be9ee'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#edf4fa'; g.font = "600 42px Inter, 'Segoe UI', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 256, 50, 480);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texRotulos.set(texto, t);
  return t;
}

function Pedestal({ x, z, rotulo, quieto, children }) {
  const giro = useRef();
  const mRot = useMemo(() => new THREE.MeshBasicMaterial({ map: texturaRotuloId(rotulo), transparent: true, toneMapped: false }), [rotulo]);
  useEffect(() => () => mRot.dispose(), [mRot]);
  useFrame((_, dt) => { if (!quieto && giro.current) giro.current.rotation.y += dt * .4; });
  return <group position={[x, 0, z]}>
    <Cil r={.9} h={.12} p={[0, .06, 0]} m={MAT.oscuro} />
    <Aro r={.88} tubo={.012} p={[0, .125, 0]} rot={[Math.PI / 2, 0, 0]} m={MAT.led} sombra={false} />
    <group ref={giro} position={[0, 1.05, 0]}>{children}</group>
    <mesh geometry={GEO.plano} material={mRot} position={[0, .03, 1.2]} rotation={[-1.2, 0, 0]} scale={[1.9, .36, 1]} dispose={null} />
  </group>;
}

const CATEGORIAS_DEMO = ['propulsion', 'energia', 'antena', 'blindaje'];
const DISENO_COMPLETO = { cohete: 'atlas_v_551', propulsion: 'tanque_mediano', energia: 'panel_mediano', antena: 'antena_ka', blindaje: 'boveda_titanio', instrumentos: ['mwr', 'mag', 'jiram', 'junocam', 'sonda_atmosferica'] };
const DISENO_VACIO = { cohete: null, propulsion: null, energia: null, antena: null, blindaje: null, instrumentos: [] };
const ORDEN_RECIEN = ['propulsion', 'energia', 'antena', 'blindaje', 'instrumentos'];

export function Demo({ calidad = 'alta' }) {
  const quieto = reducido();
  const [recien, setRecien] = useState(null);
  useEffect(() => {
    if (quieto) return undefined;
    let k = 0;
    const iv = setInterval(() => { setRecien(ORDEN_RECIEN[k % ORDEN_RECIEN.length]); k++; }, 2600);
    return () => clearInterval(iv);
  }, [quieto]);
  const filas = useMemo(() => {
    const sep = 2.5, lista = [];
    lista.push(cohetesJson.map((c) => ({ categoria: 'cohete', id: c.id })));
    CATEGORIAS_DEMO.forEach((cat) => lista.push(piezasJson.filter((p) => p.categoria === cat).map((p) => ({ categoria: cat, id: p.id }))));
    const inst = piezasJson.filter((p) => p.categoria === 'instrumento').map((p) => ({ categoria: 'instrumentos', id: p.id }));
    for (let i = 0; i < inst.length; i += 8) lista.push(inst.slice(i, i + 8));
    const z0 = -(lista.length - 1) * sep / 2 - 2;
    return lista.map((fila, i) => fila.map((it, j) => ({ ...it, x: (j - (fila.length - 1) / 2) * sep, z: z0 + i * sep })));
  }, []);
  const zNaves = filas[filas.length - 1][0].z + 5.2;
  return <>
    <ambientLight intensity={.5} color="#8fa9c4" />
    <hemisphereLight args={['#bfe0ff', '#1d2a37', .5]} />
    <directionalLight position={[8, 14, 8]} intensity={2.2} color="#fff1dc" castShadow={calidad !== 'baja'} shadow-mapSize={[2048, 2048]} shadow-bias={-.0004}
      shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-far={40} />
    {calidad !== 'baja' && <Estudio />}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#131c26" metalness={.4} roughness={.4} /></mesh>
    {filas.flat().map((it) => <Pedestal key={`${it.categoria}${it.id}`} x={it.x} z={it.z} rotulo={it.id} quieto={quieto}>
      <PiezaModelo categoria={it.categoria} id={it.id} />
    </Pedestal>)}
    <group position={[-4.2, 1.2, zNaves]} scale={.45}><NaveEstudio diseno={DISENO_COMPLETO} estetica={{ casco: '#c9d3e6', detalle: '#ff7a1a' }} recien={recien} motor girar={!quieto} /></group>
    <group position={[4.2, 1.2, zNaves]} scale={.6}><NaveEstudio diseno={DISENO_VACIO} girar={!quieto} /></group>
  </>;
}

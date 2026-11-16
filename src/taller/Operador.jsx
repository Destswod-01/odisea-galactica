// Módulo D del taller 3D: el operador, un astronauta-ingeniero chibi que camina entre las máquinas.
// Ver docs/TALLER_3D.md §7. Animación 100 % procedural (sin esqueleto, sin setState por cuadro).
//
// Jerarquía: raíz (posición/rumbo) → cadera → torso → cabeza / hombros → codos / (cadera → piernas → rodillas).
// Cada cuadro se calcula una pose objetivo según la animación y se mezcla (amortiguación exponencial)
// con la pose actual, así los cambios caminar ⇄ reposo ⇄ gesto nunca dan saltos.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ESTACION, ESTACIONES, posicionOperador, rutaEntre } from './estaciones.js';

export const VELOCIDAD = 5; // unidades por segundo

const ACEL = 12; // u/s² al arrancar
const FRENADO = 14; // u/s² al frenar
const DURACION_GESTO = { celebrar: 1.0, saludar: 1.1 }; // segundos; luego vuelven a reposo
const TAU = Math.PI * 2;

// ───────────────────────── utilidades ─────────────────────────

const suave = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const envolver = (d) => ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const prefiereMovimientoReducido = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Textura de sombra de contacto (calidad baja): se genera una sola vez con canvas.
let _texSombra = null;
function texturaSombra() {
  if (_texSombra) return _texSombra;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.38)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  _texSombra = new THREE.CanvasTexture(c);
  _texSombra.colorSpace = THREE.SRGBColorSpace;
  return _texSombra;
}

// ───────────────────────── geometrías y materiales ─────────────────────────

// Geometrías compartidas por calidad (se crean una vez por componente y se liberan al desmontar).
function crearGeos(calidad) {
  const s = calidad === 'alta' ? 32 : calidad === 'media' ? 20 : 12;
  const capas = calidad === 'baja' ? 3 : 6;
  const radial = calidad === 'baja' ? 8 : 14;
  const rr = calidad === 'baja' ? 2 : 4;
  const PI = Math.PI;
  return {
    casco: new THREE.SphereGeometry(0.42, s, Math.round(s * 0.75)),
    // placa oscura y cristal comparten el mismo recorte frontal de la esfera
    placa: new THREE.SphereGeometry(0.432, s, s, PI / 2 - 0.98, 1.96, 0.9, 1.05),
    cristal: new THREE.SphereGeometry(0.462, s, s, PI / 2 - 0.98, 1.96, 0.9, 1.05),
    reflejo: new THREE.SphereGeometry(0.466, s, 8, PI / 2 + 0.1, 0.5, 1.0, 0.32),
    ojo: new THREE.SphereGeometry(1, 14, 10),
    sonrisa: new THREE.TorusGeometry(0.05, 0.009, 6, 16, PI),
    franjaCasco: new THREE.TorusGeometry(0.427, 0.016, 6, s, 2.3),
    aroCasco: new THREE.TorusGeometry(0.3, 0.022, 6, s),
    cuello: new THREE.TorusGeometry(0.2, 0.045, 8, s),
    auricular: new THREE.CylinderGeometry(0.088, 0.088, 0.07, radial),
    tapaAuricular: new THREE.SphereGeometry(0.06, 10, 8),
    antenaBase: new THREE.CylinderGeometry(0.04, 0.05, 0.04, radial),
    antenaVara: new THREE.CylinderGeometry(0.011, 0.014, 0.14, 8),
    antenaPunta: new THREE.SphereGeometry(0.03, 12, 10),
    torso: new THREE.CapsuleGeometry(0.2, 0.06, capas, s),
    franjaTorso: new THREE.TorusGeometry(0.194, 0.011, 6, s),
    cinturon: new THREE.TorusGeometry(0.168, 0.026, 6, s),
    hebilla: new RoundedBoxGeometry(0.075, 0.055, 0.03, 2, 0.012),
    bolsa: new RoundedBoxGeometry(0.075, 0.075, 0.055, 2, 0.015),
    panel: new RoundedBoxGeometry(0.17, 0.1, 0.03, 2, 0.012),
    lucecita: new THREE.SphereGeometry(0.014, 8, 6),
    mochila: new RoundedBoxGeometry(0.38, 0.38, 0.16, rr, 0.05),
    tapaMochila: new RoundedBoxGeometry(0.385, 0.05, 0.17, rr, 0.02),
    tanque: new THREE.CapsuleGeometry(0.052, 0.2, capas, radial),
    luzMochila: new THREE.SphereGeometry(0.024, 10, 8),
    esfHombro: new THREE.SphereGeometry(0.085, 14, 12),
    esfCodo: new THREE.SphereGeometry(0.066, 12, 10),
    brazo: new THREE.CapsuleGeometry(0.064, 0.06, capas, radial),
    antebrazo: new THREE.CapsuleGeometry(0.058, 0.04, capas, radial),
    puno: new THREE.TorusGeometry(0.06, 0.018, 6, 14),
    guante: new THREE.SphereGeometry(0.1, 16, 12),
    pulgar: new THREE.SphereGeometry(0.04, 10, 8),
    parche: new THREE.CylinderGeometry(0.056, 0.056, 0.012, radial + 6),
    aroParche: new THREE.TorusGeometry(0.056, 0.009, 6, 18),
    esfCadera: new THREE.SphereGeometry(0.1, 14, 12),
    muslo: new THREE.CapsuleGeometry(0.09, 0.02, capas, radial),
    esfRodilla: new THREE.SphereGeometry(0.084, 12, 10),
    pantorrilla: new THREE.CapsuleGeometry(0.076, 0.05, capas, radial),
    bota: new RoundedBoxGeometry(0.2, 0.12, 0.32, rr, 0.05),
    suela: new RoundedBoxGeometry(0.21, 0.04, 0.33, rr, 0.018),
    puntera: new THREE.SphereGeometry(0.075, 12, 8),
    sombra: new THREE.CircleGeometry(0.5, 20),
  };
}

// Materiales: los fijos se comparten; el del traje depende del color. Los que se animan son propios.
function crearMats(calidad, color) {
  const fisico = calidad !== 'baja';
  const casco = fisico
    ? new THREE.MeshPhysicalMaterial({ color: '#f4f7fa', roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 })
    : new THREE.MeshStandardMaterial({ color: '#f4f7fa', roughness: 0.3 });
  const cristal = fisico
    ? new THREE.MeshPhysicalMaterial({
        color: '#14283a', roughness: 0.04, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.03,
        transparent: true, opacity: 0.5, depthWrite: false,
      })
    : new THREE.MeshStandardMaterial({ color: '#14283a', roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.45, depthWrite: false });
  return {
    casco,
    cristal,
    traje: new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 }),
    blanco: new THREE.MeshStandardMaterial({ color: '#e9eef2', roughness: 0.4, metalness: 0.05 }),
    gris: new THREE.MeshStandardMaterial({ color: '#aeb9c4', roughness: 0.45, metalness: 0.5 }),
    grafito: new THREE.MeshStandardMaterial({ color: '#2f3b48', roughness: 0.6, metalness: 0.15 }),
    cuero: new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.7, metalness: 0.1 }),
    amarillo: new THREE.MeshStandardMaterial({ color: '#e8c14a', roughness: 0.4, metalness: 0.3 }),
    placa: new THREE.MeshStandardMaterial({ color: '#08111a', roughness: 0.3, metalness: 0.5 }),
    reflejo: new THREE.MeshBasicMaterial({
      color: '#9be9ee', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
    ojo: new THREE.MeshBasicMaterial({ color: '#d4fbff', toneMapped: false }),
    luzAntena: new THREE.MeshStandardMaterial({ color: '#ff6a4c', emissive: '#ff6a4c', emissiveIntensity: 1.6, roughness: 0.4 }),
    luzMochila: new THREE.MeshStandardMaterial({ color: '#79dfb1', emissive: '#79dfb1', emissiveIntensity: 1.4, roughness: 0.4 }),
    luzPanel: new THREE.MeshBasicMaterial({ color: '#79dfb1', toneMapped: false }),
    luzPanel2: new THREE.MeshBasicMaterial({ color: '#efbe76', toneMapped: false }),
    sombra: new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, opacity: 0.7, depthWrite: false }),
  };
}

// ───────────────────────── poses ─────────────────────────

const CLAVES = [
  'y', 'sy', 'leanX', 'twistY', 'rollZ', 'headX', 'headY', 'headZ',
  'aLX', 'aLZ', 'aRX', 'aRZ', 'eLX', 'eLZ', 'eRX', 'eRZ', 'lLX', 'lRX', 'kL', 'kR',
];
const crearPose = () => {
  const o = {};
  for (let i = 0; i < CLAVES.length; i++) o[CLAVES[i]] = 0;
  o.sy = 1;
  return o;
};

// Escribe en `o` la pose objetivo. `mov` = false apaga lo decorativo (movimiento reducido).
function componer(o, anim, t, fase, amp, u, mov) {
  const m = mov ? 1 : 0;
  // base de reposo: respiración, balanceo y mirada a los lados
  for (let i = 0; i < CLAVES.length; i++) o[CLAVES[i]] = 0;
  o.sy = 1 + 0.012 * Math.sin(t * 2.1) * m;
  o.y = 0.006 * Math.sin(t * 2.1) * m;
  o.rollZ = 0.025 * Math.sin(t * 0.9) * m;
  o.headY = 0.4 * Math.sin(t * 0.55) * Math.sin(t * 0.21 + 1) * m;
  o.headX = 0.05 * Math.sin(t * 0.7) * m;
  o.aLX = 0.05 * Math.sin(t * 2.1 + 1) * m;
  o.aRX = 0.05 * Math.sin(t * 2.1 + 2) * m;
  o.aLZ = 0.1;
  o.aRZ = -0.1;
  o.eLX = -0.15;
  o.eRX = -0.15;

  if (anim === 'caminar') {
    const s = Math.sin(fase);
    const c = Math.cos(fase);
    o.sy = 1;
    o.headY = 0;
    o.headX = -0.06 * amp;
    o.leanX = 0.105 * amp; // 6°
    o.twistY = 0.14 * amp * s;
    o.rollZ = 0.03 * amp * s;
    o.lLX = -0.7 * amp * s;
    o.lRX = 0.7 * amp * s;
    o.kL = 0.9 * amp * Math.max(0, c);
    o.kR = 0.9 * amp * Math.max(0, -c);
    o.aLX = 0.8 * amp * s;
    o.aRX = -0.8 * amp * s;
    o.eLX = -0.25 * amp - 0.35 * amp * Math.max(0, -s) - 0.15 * (1 - amp);
    o.eRX = -0.25 * amp - 0.35 * amp * Math.max(0, s) - 0.15 * (1 - amp);
    // el cuerpo baja donde las piernas se abren y sube al cruzarse: los pies tocan el piso
    o.y = -0.34 * (1 - Math.cos(0.7 * amp * Math.abs(s))) + 0.02 * amp * Math.abs(c);
  } else if (anim === 'teclear') {
    o.leanX = 0.07;
    o.headX = 0.14;
    o.headY = 0.2 * Math.sin(t * 1.3) * m;
    o.aLX = -1.05;
    o.aRX = -1.05;
    o.aLZ = 0.08;
    o.aRZ = -0.08;
    o.eLX = -1.0 + 0.22 * Math.sin(t * 13);
    o.eRX = -1.0 + 0.22 * Math.sin(t * 13 + 2.4);
  } else if (anim === 'celebrar') {
    const agacha = u < 0.18 ? suave(0, 0.18, u) : 0;
    const salto = u < 0.18 ? 0 : Math.sin((Math.PI * (u - 0.18)) / 0.82);
    const arriba = suave(0.12, 0.4, u) * (1 - suave(0.82, 1, u));
    o.sy = 1;
    o.y = -0.06 * agacha + 0.4 * salto;
    o.lLX = o.lRX = -0.35 * agacha - 0.3 * salto;
    o.kL = o.kR = 0.7 * agacha + 0.5 * salto;
    o.aLX = o.aRX = -2.7 * arriba;
    o.aLZ = (0.3 + 0.15 * Math.sin(t * 18)) * arriba + 0.1 * (1 - arriba);
    o.aRZ = -(0.3 + 0.15 * Math.sin(t * 18 + 1)) * arriba - 0.1 * (1 - arriba);
    o.eLX = o.eRX = -0.3 * arriba - 0.15 * (1 - arriba);
    o.headX = -0.2 * arriba;
    o.leanX = -0.08 * arriba;
  } else if (anim === 'saludar') {
    const sube = suave(0, 0.2, u) * (1 - suave(0.85, 1, u));
    o.aRX = -0.25 * sube;
    o.aRZ = -0.1 - 2.3 * sube;
    o.eRX = -0.15 - 0.15 * sube;
    o.eRZ = -0.55 * Math.sin(t * 11) * sube;
    o.headZ = -0.12 * sube;
    o.headY = 0.25 * sube;
    o.rollZ += 0.04 * Math.sin(t * 5) * sube;
  }
}

// ───────────────────────── estado del movimiento ─────────────────────────

function crearEstado(destino) {
  const valido = !!ESTACION[destino];
  const e = {
    x: 0, z: 0, rot: 0, rotObj: 0, v: 0, fase: 0, t: 0,
    caminando: false, estacion: null, origen: null, meta: null, ruta: null, idx: 1,
    destinoPedido: destino, gPrev: 'reposo', gT: 0,
    sigParp: 2 + Math.random() * 2, parpIni: -1,
    mov: !prefiereMovimientoReducido(),
    pose: crearPose(), obj: crearPose(),
  };
  if (valido) colocar(e, destino);
  return e;
}

const mirar = (e, id) => Math.atan2(ESTACION[id].pos[0] - e.x, ESTACION[id].pos[2] - e.z);

// Pone al operador frente a la estación, sin caminar.
function colocar(e, id) {
  const [x, z] = posicionOperador(id);
  e.x = x;
  e.z = z;
  e.rot = e.rotObj = mirar(e, id);
  e.estacion = id;
  e.caminando = false;
  e.v = 0;
}

// Cierra el recorrido: queda mirando a la máquina y avisa una sola vez.
function llegar(e, alLlegar) {
  e.caminando = false;
  e.v = 0;
  e.estacion = e.meta;
  e.rotObj = mirar(e, e.meta);
  if (alLlegar) alLlegar(e.meta);
}

// Calcula la ruta hacia `id`; si ya iba caminando, parte del punto de ruta más cercano (sin teletransportarse).
function planificar(e, id, alLlegar) {
  let desde = e.estacion;
  if (e.caminando) {
    const a = posicionOperador(e.origen);
    const b = posicionOperador(e.meta);
    const da = (a[0] - e.x) ** 2 + (a[1] - e.z) ** 2;
    const db = (b[0] - e.x) ** 2 + (b[1] - e.z) ** 2;
    desde = da <= db ? e.origen : e.meta;
  }
  const r = rutaEntre(desde, id);
  e.origen = desde;
  e.meta = id;
  if (!e.mov) {
    // movimiento reducido: sin recorrido
    e.x = r[r.length - 1][0];
    e.z = r[r.length - 1][1];
    e.rot = mirar(e, id);
    llegar(e, alLlegar);
    e.rot = e.rotObj;
    return;
  }
  e.ruta = [[e.x, e.z], ...r];
  e.idx = 1;
  e.caminando = true;
}

// ───────────────────────── componente ─────────────────────────

export default function Operador({ destino, inicioEn, color = '#ff7a1a', gesto = 'reposo', calidad = 'alta', alLlegar, reducido = false }) {
  const raiz = useRef(null);
  const cadera = useRef(null);
  const torso = useRef(null);
  const cabeza = useRef(null);
  const ojos = useRef(null);
  const antena = useRef(null);
  const brazoI = useRef(null);
  const brazoD = useRef(null);
  const codoI = useRef(null);
  const codoD = useRef(null);
  const piernaI = useRef(null);
  const piernaD = useRef(null);
  const rodillaI = useRef(null);
  const rodillaD = useRef(null);

  // La carga de texturas puede terminar después de que se elija una estación.
  // Mantener el origen del taller permite completar y notificar ese recorrido.
  const [e] = useState(() => crearEstado(inicioEn ?? destino));
  const [inicio] = useState(() => [e.x, e.z, e.rot]);
  const props = useRef({ destino, gesto, alLlegar });
  useEffect(() => {
    props.current = { destino, gesto, alLlegar };
  });

  const geo = useMemo(() => crearGeos(calidad), [calidad]);
  const mat = useMemo(() => crearMats(calidad, color), [calidad, color]);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat]);

  // seguimiento de «movimiento reducido» sin consultar el medio en cada cuadro
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const alCambiar = () => {
      e.mov = !mq.matches && !reducido;
    };
    alCambiar();
    mq.addEventListener?.('change', alCambiar);
    return () => mq.removeEventListener?.('change', alCambiar);
  }, [e, reducido]);

  useFrame((_, delta) => {
    if (!raiz.current) return;
    const dt = Math.min(delta, 0.05);
    const p = props.current;
    e.t += dt;

    // ── cambio de destino ──
    if (p.destino !== e.destinoPedido && ESTACION[p.destino]) {
      e.destinoPedido = p.destino;
      if (e.estacion === null) colocar(e, p.destino); // primera estación recibida: aparece sin caminar
      else planificar(e, p.destino, p.alLlegar);
    }

    // ── desplazamiento por la ruta ──
    if (e.caminando) {
      while (e.idx < e.ruta.length && Math.hypot(e.ruta[e.idx][0] - e.x, e.ruta[e.idx][1] - e.z) < 1e-4) e.idx++;
      let rem = 0;
      let px = e.x;
      let pz = e.z;
      for (let i = e.idx; i < e.ruta.length; i++) {
        const q = e.ruta[i];
        rem += Math.hypot(q[0] - px, q[1] - pz);
        px = q[0];
        pz = q[1];
      }
      if (rem < 0.01) {
        llegar(e, p.alLlegar);
      } else {
        const q = e.ruta[e.idx];
        e.rotObj = Math.atan2(q[0] - e.x, q[1] - e.z);
        // velocidad: aceleración y frenado suaves; baja en las esquinas mientras gira
        const err = Math.abs(envolver(e.rotObj - e.rot));
        const vObj = Math.min(VELOCIDAD, Math.sqrt(2 * FRENADO * rem) + 0.25) * Math.max(0.35, 1 - err / 1.6);
        e.v += Math.max(-FRENADO * dt, Math.min(ACEL * dt, vObj - e.v));
        let paso = e.v * dt;
        e.fase += e.v * dt * 2.4;
        while (paso > 0 && e.idx < e.ruta.length) {
          const r = e.ruta[e.idx];
          const dx = r[0] - e.x;
          const dz = r[1] - e.z;
          const d = Math.hypot(dx, dz);
          if (d <= paso) {
            e.x = r[0];
            e.z = r[1];
            paso -= d;
            e.idx++;
          } else {
            e.x += (dx / d) * paso;
            e.z += (dz / d) * paso;
            paso = 0;
          }
        }
      }
    }
    // giro suave hacia el rumbo
    e.rot += envolver(e.rotObj - e.rot) * (1 - Math.exp(-(e.caminando ? 9 : 5) * dt));
    raiz.current.position.set(e.x, 0, e.z);
    raiz.current.rotation.y = e.rot;

    // ── qué animación toca ──
    if (p.gesto !== e.gPrev) {
      e.gPrev = p.gesto;
      e.gT = 0;
    } else if (!e.caminando) {
      e.gT += dt; // el gesto queda pendiente mientras camina
    }
    let anim = 'reposo';
    let u = 0;
    if (e.caminando) anim = 'caminar';
    else if (p.gesto === 'teclear') anim = 'teclear';
    else if (DURACION_GESTO[p.gesto] && e.gT < DURACION_GESTO[p.gesto]) {
      anim = p.gesto;
      u = e.gT / DURACION_GESTO[p.gesto];
    }

    // ── pose objetivo y mezcla ──
    const amp = Math.min(1, e.v / 2.5);
    componer(e.obj, anim, e.t, e.fase, amp, u, e.mov);
    const k = 1 - Math.exp(-14 * dt);
    const cur = e.pose;
    const obj = e.obj;
    for (let i = 0; i < CLAVES.length; i++) {
      const c = CLAVES[i];
      cur[c] += (obj[c] - cur[c]) * k;
    }

    cadera.current.position.y = 0.5 + cur.y;
    torso.current.rotation.set(cur.leanX, cur.twistY, cur.rollZ);
    torso.current.scale.y = cur.sy;
    cabeza.current.rotation.set(cur.headX, cur.headY, cur.headZ);
    brazoI.current.rotation.set(cur.aLX, 0, cur.aLZ);
    brazoD.current.rotation.set(cur.aRX, 0, cur.aRZ);
    codoI.current.rotation.set(cur.eLX, 0, cur.eLZ);
    codoD.current.rotation.set(cur.eRX, 0, cur.eRZ);
    piernaI.current.rotation.x = cur.lLX;
    piernaD.current.rotation.x = cur.lRX;
    rodillaI.current.rotation.x = cur.kL;
    rodillaD.current.rotation.x = cur.kR;

    // ── detalles: parpadeo, antena y luces ──
    if (e.mov) {
      if (e.parpIni < 0 && e.t > e.sigParp) e.parpIni = e.t;
      if (e.parpIni >= 0) {
        const kp = (e.t - e.parpIni) / 0.16;
        if (kp >= 1) {
          e.parpIni = -1;
          e.sigParp = e.t + 3 + Math.random() * 2; // cada 3–5 s
          ojos.current.scale.y = 1;
        } else {
          ojos.current.scale.y = 1 - 0.92 * Math.sin(Math.PI * kp);
        }
      }
    }
    const vaiven = e.mov ? 0.12 * amp * Math.sin(e.fase * 2) + 0.04 * Math.sin(e.t * 3) : 0;
    antena.current.rotation.z = -0.3 + vaiven;
    antena.current.rotation.x = -0.12 * amp + (e.mov ? 0.03 * Math.sin(e.t * 2.3) : 0);
    mat.luzAntena.emissiveIntensity = e.mov ? 1.3 + 0.9 * Math.sin(e.t * 4) : 1.6;
    mat.luzMochila.emissiveIntensity = e.mov ? 1.2 + 0.4 * Math.sin(e.t * 1.7) : 1.3;
  });

  const sombra = calidad !== 'baja';
  const cs = { castShadow: sombra };

  // Brazo completo: hombro → brazo superior → codo → antebrazo → guante (lado +1 = izquierda del personaje).
  const brazo = (lado, refHombro, refCodo) => (
    <group ref={refHombro} position={[0.235 * lado, 0.32, 0]}>
      <mesh geometry={geo.esfHombro} material={mat.blanco} {...cs} />
      <mesh geometry={geo.brazo} material={mat.traje} position={[0, -0.095, 0]} {...cs} />
      {lado > 0 && (
        <group position={[0.066, -0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh geometry={geo.parche} material={mat.amarillo} />
          <mesh geometry={geo.aroParche} material={mat.blanco} position={[0, 0.006, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      )}
      <group ref={refCodo} position={[0, -0.19, 0]}>
        <mesh geometry={geo.esfCodo} material={mat.blanco} {...cs} />
        <mesh geometry={geo.antebrazo} material={mat.traje} position={[0, -0.08, 0]} {...cs} />
        <mesh geometry={geo.puno} material={mat.blanco} position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geo.guante} material={mat.blanco} position={[0, -0.21, 0]} scale={[1, 0.95, 1.05]} {...cs} />
        <mesh geometry={geo.pulgar} material={mat.blanco} position={[-0.075 * lado, -0.2, 0.05]} {...cs} />
      </group>
    </group>
  );

  // Pierna completa: cadera → muslo → rodilla → pantorrilla → bota.
  const pierna = (lado, refCadera, refRodilla) => (
    <group ref={refCadera} position={[0.11 * lado, 0, 0]}>
      <mesh geometry={geo.esfCadera} material={mat.blanco} />
      <mesh geometry={geo.muslo} material={mat.traje} position={[0, -0.085, 0]} {...cs} />
      <group ref={refRodilla} position={[0, -0.17, 0]}>
        <mesh geometry={geo.esfRodilla} material={mat.blanco} {...cs} />
        <mesh geometry={geo.pantorrilla} material={mat.traje} position={[0, -0.1, 0]} {...cs} />
        <mesh geometry={geo.bota} material={mat.grafito} position={[0, -0.23, 0.04]} {...cs} />
        <mesh geometry={geo.puntera} material={mat.grafito} position={[0, -0.25, 0.17]} scale={[1.25, 0.8, 0.9]} />
        <mesh geometry={geo.suela} material={mat.blanco} position={[0, -0.31, 0.04]} {...cs} />
      </group>
    </group>
  );

  return (
    <group ref={raiz} position={[inicio[0], 0, inicio[1]]} rotation={[0, inicio[2], 0]}>
      {calidad === 'baja' && (
        <mesh geometry={geo.sombra} material={mat.sombra} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -0.02]} scale={[1.05, 1.05, 1]} />
      )}

      <group ref={cadera} position={[0, 0.5, 0]}>
        {/* ── piernas ── */}
        {pierna(1, piernaI, rodillaI)}
        {pierna(-1, piernaD, rodillaD)}

        {/* ── torso ── */}
        <group ref={torso}>
          <mesh geometry={geo.torso} material={mat.traje} position={[0, 0.2, 0]} {...cs} />
          <mesh geometry={geo.franjaTorso} material={mat.blanco} position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={geo.franjaTorso} material={mat.blanco} position={[0, 0.29, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* cinturón de herramientas */}
          <mesh geometry={geo.cinturon} material={mat.cuero} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={geo.hebilla} material={mat.amarillo} position={[0, 0.05, 0.178]} />
          <mesh geometry={geo.bolsa} material={mat.cuero} position={[0.13, 0.05, 0.115]} rotation={[0, 0.8, 0]} {...cs} />
          <mesh geometry={geo.bolsa} material={mat.cuero} position={[-0.13, 0.05, 0.115]} rotation={[0, -0.8, 0]} {...cs} />
          {/* panel del pecho */}
          <mesh geometry={geo.panel} material={mat.gris} position={[0, 0.28, 0.185]} />
          <mesh geometry={geo.lucecita} material={mat.luzPanel} position={[-0.05, 0.28, 0.203]} />
          <mesh geometry={geo.lucecita} material={mat.luzPanel2} position={[0.0, 0.28, 0.203]} />
          <mesh geometry={geo.lucecita} material={mat.ojo} position={[0.05, 0.28, 0.203]} />
          {/* collar */}
          <mesh geometry={geo.cuello} material={mat.gris} position={[0, 0.43, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* mochila de soporte vital */}
          <group position={[0, 0.2, -0.27]}>
            <mesh geometry={geo.mochila} material={mat.blanco} {...cs} />
            <mesh geometry={geo.tapaMochila} material={mat.traje} position={[0, 0.2, 0]} {...cs} />
            <mesh geometry={geo.tanque} material={mat.gris} position={[0.1, -0.02, -0.13]} {...cs} />
            <mesh geometry={geo.tanque} material={mat.gris} position={[-0.1, -0.02, -0.13]} {...cs} />
            <mesh geometry={geo.esfCodo} material={mat.traje} position={[0.1, 0.125, -0.13]} scale={[0.8, 0.5, 0.8]} />
            <mesh geometry={geo.esfCodo} material={mat.traje} position={[-0.1, 0.125, -0.13]} scale={[0.8, 0.5, 0.8]} />
            <mesh geometry={geo.luzMochila} material={mat.luzMochila} position={[0.12, 0.13, -0.085]} />
          </group>

          {/* ── brazos ── */}
          {brazo(1, brazoI, codoI)}
          {brazo(-1, brazoD, codoD)}

          {/* ── cabeza ── */}
          <group ref={cabeza} position={[0, 0.43, 0]}>
            <group position={[0, 0.2, 0]}>
              <mesh geometry={geo.casco} material={mat.casco} {...cs} />
              {/* franja de color sobre el casco y aro inferior */}
              <mesh geometry={geo.franjaCasco} material={mat.traje} rotation={[0, Math.PI / 2, 0]} />
              <mesh geometry={geo.aroCasco} material={mat.gris} position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]} />
              {/* cara: placa oscura, ojos que parpadean, sonrisa y cristal del visor */}
              <mesh geometry={geo.placa} material={mat.placa} />
              <group ref={ojos} position={[0, 0.02, 0]}>
                <mesh geometry={geo.ojo} material={mat.ojo} position={[0.12, 0, 0.4236]} rotation={[0, 0.28, 0.12]} scale={[0.048, 0.075, 0.02]} />
                <mesh geometry={geo.ojo} material={mat.ojo} position={[-0.12, 0, 0.4236]} rotation={[0, -0.28, -0.12]} scale={[0.048, 0.075, 0.02]} />
              </group>
              <mesh geometry={geo.sonrisa} material={mat.ojo} position={[0, -0.075, 0.434]} rotation={[-0.18, 0, Math.PI]} />
              <mesh geometry={geo.cristal} material={mat.cristal} />
              <mesh geometry={geo.reflejo} material={mat.reflejo} />
              {/* auriculares */}
              <mesh geometry={geo.auricular} material={mat.traje} position={[0.43, 0, 0]} rotation={[0, 0, Math.PI / 2]} {...cs} />
              <mesh geometry={geo.auricular} material={mat.traje} position={[-0.43, 0, 0]} rotation={[0, 0, Math.PI / 2]} {...cs} />
              <mesh geometry={geo.tapaAuricular} material={mat.grafito} position={[0.455, 0, 0]} scale={[0.5, 1, 1]} />
              <mesh geometry={geo.tapaAuricular} material={mat.grafito} position={[-0.455, 0, 0]} scale={[0.5, 1, 1]} />
              {/* antena con lucecita */}
              <group position={[0.17, 0.37, -0.08]}>
                <mesh geometry={geo.antenaBase} material={mat.gris} />
                <group ref={antena} rotation={[0, 0, -0.3]}>
                  <mesh geometry={geo.antenaVara} material={mat.gris} position={[0, 0.09, 0]} />
                  <mesh geometry={geo.antenaPunta} material={mat.luzAntena} position={[0, 0.17, 0]} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ───────────────────────── Demo ─────────────────────────

const MARCADOR = new THREE.CylinderGeometry(0.55, 0.6, 0.12, 32);

// Piso simple + luces + 7 marcadores; el operador recorre las estaciones 1→7 en bucle:
// al llegar teclea 1,5 s, celebra y sigue con la siguiente.
export function Demo({ calidad = 'alta' }) {
  const [i, setI] = useState(0);
  const [gesto, setGesto] = useState('teclear');
  const temporizadores = useRef([]);

  const programar = useCallback((fn, ms) => {
    temporizadores.current.push(setTimeout(fn, ms));
  }, []);

  // teclear 1,5 s → celebrar → pasar a la siguiente estación
  const ciclo = useCallback(() => {
    programar(() => {
      setGesto('celebrar');
      programar(() => {
        setGesto('reposo');
        setI((k) => (k + 1) % ESTACIONES.length);
      }, 1100);
    }, 1500);
  }, [programar]);

  const alLlegar = useCallback(() => {
    setGesto('teclear');
    ciclo();
  }, [ciclo]);

  useEffect(() => {
    const lista = temporizadores.current;
    ciclo(); // la primera estación no dispara alLlegar: el ciclo arranca solo
    return () => {
      lista.forEach(clearTimeout);
      lista.length = 0;
    };
  }, [ciclo]);

  const marcadores = useMemo(() => ESTACIONES.map((est) => (
    <mesh key={est.id} geometry={MARCADOR} position={[est.pos[0], 0.06, est.pos[2]]} receiveShadow>
      <meshStandardMaterial color={est.color} emissive={est.color} emissiveIntensity={0.35} roughness={0.5} />
    </mesh>
  )), []);

  return (
    <>
      <ambientLight intensity={0.55} color="#8fa9c4" />
      <hemisphereLight args={['#b8d4f0', '#1a222b', 0.35]} />
      <directionalLight
        position={[8, 14, 8]}
        intensity={2.2}
        color="#fff1dc"
        castShadow={calidad !== 'baja'}
        shadow-mapSize={[calidad === 'alta' ? 2048 : 1024, calidad === 'alta' ? 2048 : 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#131c26" roughness={0.45} metalness={0.3} />
      </mesh>
      {marcadores}
      <Operador destino={ESTACIONES[i].id} gesto={gesto} calidad={calidad} alLlegar={alLlegar} />
    </>
  );
}

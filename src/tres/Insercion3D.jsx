// Escena 3D de la etapa 06 «Inserción orbital — Minisonda»: planeta fijo a la izquierda (gira en sentido horario visto por el jugador),
// la minisonda M1 siempre recta (solo se mueve en X), cuerpos rocosos que caen en diagonal con rotación 3D propia y un aro verde en el fotografiable.
// Ejes: los del motor (insercion06.js): x lateral, y vertical con 0 = la línea de la sonda; todo el juego ocurre en el plano z = 0 y la cámara mira a −Z.
// La pantalla (Insercion.jsx) manda el estado del motor por un ref; aquí nada se guarda en React.
// v2: luz de «noche orbital» con un foco en la minisonda, planeta más grande en el «paso rasante», cuerpos con personalidad (bólido con estela,
// raros que brillan, oscilantes teñidos) y textos flotantes proyectados a la pantalla (nodos DOM del contenedor `flotantesRef`).
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG_INSERCION as C, posicionCuerpo, rotacionCuerpo } from '../motor/insercion06.js';
import { crearSonda } from '../sondas/modelos.js';

const FOV = 40, ALTO_NECESARIO = 16.5, ANCHO_NECESARIO = 2 * (C.XMAX + 1.5), FRACCION_SONDA = 0.36; // la sonda queda al 36 % del alto de la pantalla
const PROF_PLANETA = 12, VARIANTES = 4, MAX_CUERPOS = C.CUERPOS_MAX;
const ESCALA_SONDA = 1.5; // más grande que su radio de colisión (0,55): se lee mejor y la colisión es tolerante
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (a, b, v) => { const t = acotar((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (a, b) => { const t = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return t - Math.floor(t); };

// Roca angulosa: icosaedro deformado con ruido y achatado (misma semilla = misma roca). Se hacen pocas variantes y se reutilizan.
function geometriaRoca(semilla) {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, ex = .85 + hash(semilla, 1) * .3, ey = .8 + hash(semilla, 2) * .3, ez = .8 + hash(semilla, 3) * .25;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = .78 + .4 * hash(Math.round(x * 3.1 + semilla * 5), Math.round(z * 3.1 + y * 2.3));
    p.setXYZ(i, x * f * ex, y * f * ey, z * f * ez);
  }
  g.computeVertexNormals();
  return g;
}

// ---------- Planeta ----------
// Fijo a la izquierda y detrás del plano de juego. Gira en sentido horario visto desde la cámara (rotation.z negativa) y el Sol, fijo a la derecha, ilumina su lado de día.
function Planeta({ destino, camRef }) {
  const jupiter = destino === 'jupiter', tx = useTexture(jupiter ? './texturas/jupiter.jpg' : './texturas/moon.jpg');
  useMemo(() => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; }, [tx]);
  const grupo = useRef(null), giro = useRef(null), escala = useRef(1);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 72, 48), []);
  const atm = useMemo(() => jupiter ? new THREE.MeshBasicMaterial({ color: '#f1d3a6', transparent: true, opacity: .14, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }) : null, [jupiter]);
  useEffect(() => () => { geo.dispose(); atm?.dispose(); }, [geo, atm]);
  useFrame((_, dt) => {
    const cam = camRef.current, s = cam.estado?.current;
    if (!cam.listo) return;
    // Posición en pantalla: el borde derecho del planeta queda a ~34 % del ancho; como está detrás (z = −PROF), se compensa la perspectiva.
    // Paso rasante: el planeta crece (y se corre un poco a la derecha) con suavidad; en los demás temas vale 1.
    escala.current += ((s?.tema?.planeta ?? 1) - escala.current) * (1 - Math.exp(-3 * Math.min(dt, .1)));
    const k = (cam.dist + PROF_PLANETA) / cam.dist, horizontal = cam.ancho > cam.alto, R = cam.alto * (horizontal ? .5 : .6) * escala.current, izq = cam.x - cam.ancho / 2, cx = izq + cam.ancho * ((horizontal ? .36 : .13) + .14 * (escala.current - 1)) - R, cy = cam.y - cam.alto * .06;
    grupo.current.position.set(cam.x + (cx - cam.x) * k, cam.y + (cy - cam.y) * k, -PROF_PLANETA);
    grupo.current.scale.setScalar(R * k);
    if (!s || s.fase !== 'pausa') giro.current.rotation.z -= dt * (jupiter ? .09 : .05);
  });
  return <group ref={grupo}>
    <group rotation={[.45, 0, -.25]}>
      <mesh ref={giro} geometry={geo}><meshStandardMaterial map={tx} roughness={jupiter ? .85 : 1} metalness={0} /></mesh>
    </group>
    {atm && <mesh geometry={geo} material={atm} scale={1.07} />}
  </group>;
}

// ---------- Minisonda ----------
// M1 siempre recta: un giro fijo en el soporte la deja de frente a la cámara con las alas abiertas a los lados y la antena hacia ti; NUNCA cambia durante el juego.
function Minisonda({ sondaRef, chorros, tipo = 'M1' }) {
  const cont = useRef(null);
  const geoChorro = useMemo(() => { const g = new THREE.ConeGeometry(.1, .8, 10, 1, true); g.translate(0, .4, 0); return g; }, []);
  const matChorro = useMemo(() => new THREE.MeshBasicMaterial({ color: '#a8e4ff', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(() => {
    const el = cont.current;
    let modelo;
    try { modelo = crearSonda(tipo); modelo.desplegar?.(1); el.add(modelo.objeto); } catch {
      const g = new THREE.BoxGeometry(.5, .6, .3), m = new THREE.MeshStandardMaterial({ color: '#c8d3de' }), e = new THREE.Mesh(g, m);
      el.add(e); modelo = { objeto: e, liberar() { g.dispose(); m.dispose(); } };
    }
    return () => { el.remove(modelo.objeto); modelo.liberar(); };
  }, [tipo]);
  useEffect(() => () => { geoChorro.dispose(); matChorro.dispose(); }, [geoChorro, matChorro]);
  return <group ref={sondaRef}>
    <group ref={cont} rotation={[Math.PI / 2, 0, 0]} scale={ESCALA_SONDA} />
    {/* Propulsores laterales: el de la izquierda empuja hacia la derecha y viceversa. */}
    <group position={[-.3, -.05, .12]} rotation={[0, 0, Math.PI / 2]}><group ref={chorros.izq} scale={[1, .001, 1]}><mesh geometry={geoChorro} material={matChorro} /></group></group>
    <group position={[.3, -.05, .12]} rotation={[0, 0, -Math.PI / 2]}><group ref={chorros.der} scale={[1, .001, 1]}><mesh geometry={geoChorro} material={matChorro} /></group></group>
  </group>;
}

// ---------- Cuerpos y aro de foto ----------
function Cuerpos({ cuerposRef, aroRef, estelasRef }) {
  const geos = useMemo(() => Array.from({ length: VARIANTES }, (_, i) => geometriaRoca(i + 1)), []);
  const mats = useMemo(() => Array.from({ length: MAX_CUERPOS }, () => new THREE.MeshStandardMaterial({ color: '#888', roughness: 1, metalness: 0, flatShading: true })), []);
  const geoAro = useMemo(() => new THREE.TorusGeometry(1, .045, 10, 56), []);
  const matAro = useMemo(() => new THREE.MeshBasicMaterial({ color: '#5dffa6', transparent: true, opacity: .95, depthWrite: false, toneMapped: false }), []);
  // Estela del bólido: un cono abierto (base en el cuerpo, punta hacia atrás) con mezcla aditiva.
  const geoEstela = useMemo(() => { const g = new THREE.ConeGeometry(.5, 3.2, 12, 1, true); g.translate(0, 1.6, 0); return g; }, []);
  const matEstela = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), []);
  useEffect(() => () => { geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); geoAro.dispose(); matAro.dispose(); geoEstela.dispose(); matEstela.dispose(); }, [geos, mats, geoAro, matAro, geoEstela, matEstela]);
  return <>
    {mats.map((m, i) => <mesh key={i} ref={el => { cuerposRef.current[i] = el; }} geometry={geos[i % VARIANTES]} material={m} visible={false} />)}
    {mats.map((_, i) => <mesh key={`e${i}`} ref={el => { estelasRef.current[i] = el; }} geometry={geoEstela} material={matEstela} visible={false} renderOrder={2} />)}
    <mesh ref={aroRef} geometry={geoAro} material={matAro} visible={false} renderOrder={5} />
  </>;
}

// ---------- Luces ----------
// Día: sol fijo a la derecha. Noche orbital: casi todo a oscuras y un foco (luz puntual) pegado a la minisonda que ilumina lo cercano.
// El paso de uno a otro es suave (`nivel`: 0 = día, 1 = noche).
function Luces({ estadoRef, sondaRef, jupiter }) {
  const ambiente = useRef(null), sol = useRef(null), foco = useRef(null), nivel = useRef(0);
  const solBase = jupiter ? 3.4 : 3.8, ambBase = .16;
  useFrame((_, dtCrudo) => {
    const s = estadoRef.current, dt = Math.min(dtCrudo, .1), meta = s.tema?.luz === 'noche' ? 1 : 0;
    nivel.current += (meta - nivel.current) * (1 - Math.exp(-2.5 * dt));
    const n = nivel.current;
    if (ambiente.current) ambiente.current.intensity = ambBase * (1 - .72 * n);
    if (sol.current) sol.current.intensity = solBase * (1 - .9 * n);
    if (foco.current) {
      foco.current.visible = n > .02; foco.current.intensity = 95 * n;
      const p = sondaRef.current?.position; if (p) foco.current.position.set(p.x, .9, 3.4);
    }
  });
  return <>
    <ambientLight ref={ambiente} intensity={ambBase} color="#8fa6c8" />
    <directionalLight ref={sol} position={[14, 5, 8]} intensity={solBase} color="#fff4de" />
    <pointLight ref={foco} color="#d6efff" intensity={0} distance={15} decay={2} visible={false} />
  </>;
}

// ---------- Cámara y bucle de dibujo ----------
// Encuadre: calza el alto o el ancho necesarios (el mayor), así la sonda y los límites laterales se ven igual en pantalla ancha y en vertical.
function Rig({ estadoRef, camRef, sondaRef, chorros, cuerposRef, estelasRef, aroRef, estrellasRef, flotantesRef, sinVibracion }) {
  const { camera, size } = useThree(), visual = useRef({ x: 0, fase: null, vibra: 0, ultimoEv: undefined, flota: [], punto: new THREE.Vector3() });
  useEffect(() => { const v = visual.current; return () => { v.flota.forEach(f => f.el.remove()); v.flota = []; }; }, []);
  useFrame((_, dtCrudo) => {
    const dt = Math.min(dtCrudo, .1), s = estadoRef.current, v = visual.current, aspecto = size.width / Math.max(1, size.height), ahora = performance.now();
    const alto = Math.max(ALTO_NECESARIO, ANCHO_NECESARIO / aspecto), ancho = alto * aspecto, dist = alto / (2 * Math.tan(FOV * Math.PI / 360));
    // En pantalla ancha la zona de juego se corre a la derecha para dejar sitio al planeta.
    const x = -acotar((aspecto - 1.25) * 1.9, 0, 7), y = alto * (.5 - FRACCION_SONDA);
    Object.assign(camRef.current, { estado: estadoRef, listo: true, x, y, alto, ancho, dist });
    // Vibración al chocar (apagada con prefers-reduced-motion).
    if (s.fase === 'fallo' && v.fase !== 'fallo' && s.motivo?.tipo === 'choque' && !sinVibracion) v.vibra = .45;
    v.fase = s.fase; v.vibra = Math.max(0, v.vibra - dt);

    // Eventos nuevos del motor: «¡Por poco!» da una vibración leve de cámara y cada evento crea un texto flotante (nodo DOM de `flotantesRef`).
    if (v.ultimoEv === undefined) v.ultimoEv = s.evSeq || 0;
    const cont = flotantesRef?.current;
    for (const ev of s.eventos || []) {
      if (ev.id <= v.ultimoEv) continue;
      v.ultimoEv = ev.id;
      if (ev.tipo === 'poco' && !sinVibracion) v.vibra = Math.max(v.vibra, .2);
      if (!cont) continue;
      const el = document.createElement('div');
      el.className = `ins-flota ${ev.tipo === 'poco' ? 'poco' : `q-${String(ev.calidad || '').toLowerCase()}`}${ev.raro ? ' raro' : ''}`;
      el.textContent = ev.texto; cont.appendChild(el); v.flota.push({ el, ev, t0: ahora });
    }

    const sacudida = v.vibra > 0 ? (v.vibra / .45) ** 2 * .35 : 0, t = ahora / 1000;
    camera.position.set(x + Math.sin(t * 90) * sacudida, y + Math.cos(t * 77) * sacudida, dist);
    if (camera.fov !== FOV) camera.fov = FOV;
    camera.aspect = aspecto; camera.near = .5; camera.far = 400; camera.updateProjectionMatrix(); camera.updateMatrixWorld();

    // Textos flotantes: suben desde la sonda (proyectados a la pantalla), aparecen con un pequeño «pop» y se desvanecen.
    v.flota = v.flota.filter(f => {
      const edad = (ahora - f.t0) / 1300;
      if (edad >= 1) { f.el.remove(); return false; }
      v.punto.set(f.ev.x, (f.ev.tipo === 'poco' ? 2.7 : 1.6) + edad * 1.6, 0).project(camera);
      f.el.style.transform = `translate(${((v.punto.x * .5 + .5) * size.width).toFixed(1)}px,${((-v.punto.y * .5 + .5) * size.height).toFixed(1)}px) translate(-50%,-50%) scale(${(edad < .12 ? .6 + edad * 3.3 : 1).toFixed(2)})`;
      f.el.style.opacity = edad < .12 ? String(edad / .12) : String(1 - ((edad - .12) / .88) ** 2);
      return true;
    });

    // Minisonda: se mueve en X con interpolación suave; sin giro ni inclinación.
    v.x += (s.x - v.x) * (1 - Math.exp(-18 * dt));
    sondaRef.current.position.set(v.x, 0, 0); sondaRef.current.visible = s.fase !== 'cinematica';
    const enJuego = s.fase === 'jugando' || s.fase === 'pausa', eje = enJuego ? s.eje || 0 : 0, pulso = .9 + .1 * Math.sin(ahora / 45);
    const poner = (g, f) => { if (g.current) { g.current.scale.y = Math.max(.001, f); g.current.visible = f > .03; } };
    poner(chorros.izq, Math.max(0, eje) * pulso); poner(chorros.der, Math.max(0, -eje) * pulso);

    // Cuerpos: posición REAL (la misma función del motor, con el vaivén del oscilante), rotación 3D propia y aparición gradual arriba.
    let aro = null;
    const yAbajo = -alto * FRACCION_SONDA - 1.5; // por debajo de la pantalla
    for (let i = 0; i < MAX_CUERPOS; i++) {
      const m = cuerposRef.current[i], c = s.cuerpos[i], est = estelasRef.current[i];
      if (est) est.visible = false;
      if (!m) continue;
      if (!c) { m.visible = false; continue; }
      const p = posicionCuerpo(c, s.t), entra = suave(C.Y_APARICION, C.Y_APARICION - 1.6, p.y);
      m.visible = p.y <= C.Y_APARICION && p.y > yAbajo;
      if (!m.visible) continue;
      m.position.set(p.x, p.y, 0);
      m.scale.setScalar(Math.max(.001, c.radio * entra));
      const r = rotacionCuerpo(c, s.t); m.rotation.set(r[0], r[1], r[2]);
      // Personalidad: el raro brilla (hielo o metal), el oscilante lleva un tinte azul y el bólido deja estela.
      const clave = `${c.id}|${c.color}|${c.variante}`;
      if (m.userData.clave !== clave) {
        const raro = c.variante === 'raro';
        m.material.color.set(c.color); m.material.emissive.set(raro ? c.brillo || '#9fd8ff' : c.variante === 'oscilante' ? '#2a78a8' : '#000000');
        m.material.roughness = raro ? .3 : 1; m.material.metalness = raro ? .65 : 0; m.userData.clave = clave;
      }
      m.material.emissiveIntensity = c.variante === 'raro' ? .6 + .3 * Math.sin(ahora / 170 + c.id) : c.variante === 'oscilante' ? .3 : 0;
      if (est && c.variante === 'bolido') {
        const n = Math.hypot(c.vx, c.vy) || 1;
        est.visible = true; est.position.set(p.x, p.y, 0); est.rotation.set(0, 0, Math.atan2(c.vx / n, c.vy / n)); est.scale.set(c.radio * 1.1 * entra, 1, c.radio * 1.1 * entra);
      }
      if (s.ventana && s.ventana.idx === c.id) aro = { m, c, p };
    }
    const a = aroRef.current;
    if (aro && a) {
      const pulsar = 1 + .07 * Math.sin(ahora / 90), frac = s.ventana.restante / (s.ventana.total || C.VENTANA_FOTO_S);
      a.visible = true; a.position.set(aro.p.x, aro.p.y, .3); a.scale.setScalar(aro.c.radio * 1.55 * pulsar);
      a.material.opacity = .55 + .4 * acotar(frac * 2, 0, 1);
    } else if (a) a.visible = false;

    // Estrellas: giran despacio alrededor del eje X, que para el jugador es un avance continuo hacia abajo (la nave avanza por su órbita).
    if (estrellasRef.current && s.fase !== 'pausa') estrellasRef.current.rotation.x -= dt * .05;
  });
  return null;
}

export default function Insercion3D({ estadoRef, destino, flotantesRef }) {
  const sondaRef = useRef(null), camRef = useRef({ listo: false, estado: null, x: 0, y: 0, alto: 16, ancho: 10, dist: 30 }), cuerposRef = useRef([]), estelasRef = useRef([]), aroRef = useRef(null), estrellasRef = useRef(null);
  const chorros = { izq: useRef(null), der: useRef(null) };
  const sinVibracion = useMemo(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const jupiter = destino === 'jupiter';
  return <Canvas className="ins-canvas" dpr={[1, 1.5]} camera={{ fov: FOV, near: .5, far: 400, position: [0, 3, 32] }} gl={{ antialias: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
    <color attach="background" args={['#02050c']} />
    {/* Sol fijo a la derecha: la cara del planeta hacia él es de día y la contraria queda de noche; en «noche orbital» baja la luz y se enciende el foco. */}
    <Luces estadoRef={estadoRef} sondaRef={sondaRef} jupiter={jupiter} />
    <group ref={estrellasRef}><Stars radius={90} depth={40} count={2600} factor={5} saturation={0} fade speed={0} /></group>
    <Planeta destino={destino} camRef={camRef} />
    <Minisonda sondaRef={sondaRef} chorros={chorros} tipo={estadoRef.current.sonda || 'M1'} />
    <Cuerpos cuerposRef={cuerposRef} aroRef={aroRef} estelasRef={estelasRef} />
    <Rig estadoRef={estadoRef} camRef={camRef} sondaRef={sondaRef} chorros={chorros} cuerposRef={cuerposRef} estelasRef={estelasRef} aroRef={aroRef} estrellasRef={estrellasRef} flotantesRef={flotantesRef} sinVibracion={sinVibracion} />
  </Canvas>;
}

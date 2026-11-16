// Etapa 05 «Aproximación y encuentro»: el dron baja a un terreno, busca el objetivo y le toma UNA foto (ver docs/ENCUENTRO.md).
// Motor puro (sin React ni three). Ejes como three.js: X derecha, Y arriba, Z hacia atrás; el terreno es de ±tamano/2 en X y Z.
// Convención de ángulos: yaw 0 mira hacia −Z; yaw positivo gira a la IZQUIERDA (un objeto con rotation.y = yaw mira a (−sin yaw, 0, −cos yaw)).
// Inclinación de la cámara: 0 = horizontal, −90 = hacia abajo. Acimut del Sol: 0 = hacia −Z, 90 = hacia +X.
import { cantidadDrones, sondaEncuentro } from './drones.js';
import { DRON_BASE, estadisticasDron } from './dronDiseno.js';
import { ajusteMinijuego } from './dificultad.js';
import { t as tr } from '../i18n/idioma.js';

const RAD = Math.PI / 180;
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (a, b, v) => { const t = acotar((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const norm = v => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Objetivos por misión. forma: figura que dibuja la pantalla; radio/alto en metros; vista (oblicua|cenital|rasante) y fase (lateral|contraluz)
// preferidas; sol: elevación y acimut en grados; emision 0..1 (luz propia); gemelo: cómo se llama el señuelo de forma parecida.
export const OBJETIVOS = {
  lro: [
    { id: 'apolo11', nombre: 'Etapa de descenso del Apolo 11 (Base Tranquilidad)', corto: 'el Apolo 11', pista: 'Módulo dorado de cuatro patas con un halo claro alrededor.', dato: 'La cámara de LRO fotografió los sitios Apolo: se ven el módulo, las huellas y el halo claro que dejó el motor al aterrizar.', forma: 'modulo', radio: 4, alto: 3, vista: 'oblicua', fase: 'lateral', sol: { elevacion: 25, azimut: 70 }, emision: 0, gemelo: 'un cráter pequeño con halo claro' },
    { id: 'lunojod1', nombre: 'Rover Lunojod 1 (Luna 17, 1970)', corto: 'el Lunojod 1', pista: 'Vehículo de ocho ruedas con tapa en forma de bañera y huellas largas detrás.', dato: 'LRO lo localizó en 2010; su retrorreflector aún devuelve pulsos láser enviados desde la Tierra.', forma: 'rover', radio: 3, alto: 1.6, vista: 'oblicua', fase: 'lateral', sol: { elevacion: 30, azimut: 250 }, emision: 0, gemelo: 'una roca con sombra alargada' },
    { id: 'fosa', nombre: 'Fosa del Mar de la Tranquilidad', corto: 'la fosa', pista: 'Un pozo redondo y profundo, de paredes verticales, en medio de la llanura.', dato: 'Es un agujero que podría conectar con un tubo de lava: posible refugio para futuras bases.', forma: 'fosa', radio: 18, alto: 2, vista: 'cenital', fase: 'lateral', sol: { elevacion: 60, azimut: 120 }, emision: 0, gemelo: 'un cráter pequeño' },
    { id: 'tycho', nombre: 'Roca en el pico central del cráter Tycho', corto: 'la roca de Tycho', pista: 'Una roca grande y angulosa en la cima de un pico, con su sombra larga.', dato: 'LRO la fotografió en 2011 con el Sol bajo: la sombra larga delata su altura.', forma: 'roca', radio: 5, alto: 4, vista: 'rasante', fase: 'lateral', sol: { elevacion: 12, azimut: 300 }, emision: 0, gemelo: 'una roca de 4 m' }
  ],
  juno: [
    { id: 'loki', nombre: 'Isla en el lago de lava Loki Patera', corto: 'la isla de Loki', pista: 'Una isla oscura y rugosa dentro de un lago liso que brilla de rojo.', dato: 'Juno mostró en 2024 que la superficie del lago es lisa «como vidrio», con islas dentro. La lava brilla con luz propia.', forma: 'isla', radio: 8, alto: 2, vista: 'oblicua', fase: 'lateral', sol: { elevacion: 35, azimut: 90 }, emision: .6, gemelo: 'una colada oscura' },
    { id: 'steeple', nombre: 'Montaña Steeple', corto: 'la montaña Steeple', pista: 'Un pico afilado como un campanario, muy por encima de la llanura.', dato: 'Juno la vio con el Sol bajo: las sombras largas resaltaron su forma.', forma: 'pico', radio: 12, alto: 35, vista: 'rasante', fase: 'lateral', sol: { elevacion: 10, azimut: 200 }, emision: 0, gemelo: 'una loma aguda' },
    { id: 'pluma', nombre: 'Pluma volcánica activa', corto: 'la pluma', pista: 'Un chorro de gas y azufre que sube desde una grieta, con forma de paraguas.', dato: 'Las plumas lanzan azufre a gran altura; sus partículas dispersan la luz hacia adelante, así que se ven mejor a contraluz.', forma: 'pluma', radio: 10, alto: 30, vista: 'oblicua', fase: 'contraluz', sol: { elevacion: 20, azimut: 160 }, emision: .1, gemelo: 'una nube de gas' }
  ]
};
// Señuelos por destino ({ tipo, nombre, forma, radio, alto }). cuenco: también excava un cráter en el terreno.
export const SENUELOS = {
  luna: [
    { tipo: 'roca', nombre: 'una roca de 4 m', forma: 'roca', radio: 2.2, alto: 3 },
    { tipo: 'halo', nombre: 'un cráter pequeño con halo brillante', forma: 'crater', radio: 4, alto: .5, cuenco: true },
    { tipo: 'loma', nombre: 'una roca sobre una loma', forma: 'loma', radio: 5, alto: 5 },
    { tipo: 'escombro', nombre: 'un montón de escombros', forma: 'roca', radio: 3, alto: 1.5 },
    { tipo: 'crater', nombre: 'un cráter joven', forma: 'crater', radio: 7, alto: .5, cuenco: true },
    { tipo: 'bloque', nombre: 'un bloque eyectado', forma: 'roca', radio: 3.5, alto: 3.5 }
  ],
  io: [
    { tipo: 'colada', nombre: 'una colada oscura', forma: 'colada', radio: 8, alto: .5 },
    { tipo: 'patera', nombre: 'una patera (depresión volcánica)', forma: 'crater', radio: 9, alto: .5, cuenco: true },
    { tipo: 'meseta', nombre: 'una meseta pequeña', forma: 'meseta', radio: 7, alto: 6 },
    { tipo: 'monticulo', nombre: 'un montículo de azufre', forma: 'loma', radio: 5, alto: 4 },
    { tipo: 'mancha', nombre: 'una mancha de escarcha de SO₂', forma: 'colada', radio: 10, alto: .3 },
    { tipo: 'grieta', nombre: 'una grieta humeante', forma: 'crater', radio: 5, alto: .5, cuenco: true }
  ]
};

// Textos visibles del objetivo y de los señuelos en el idioma actual (las constantes de arriba no se tocan; se traducen por id).
export const textoObjetivo = (o, campo) => tr(`e05.obj.${o.id}.${campo}`, undefined, o[campo]);
export const nombreVisto = (sitio, ob) => ob.id === sitio.objetivo.id ? textoObjetivo(ob, 'nombre') : ob.tipo === 'gemelo' ? tr(`e05.obj.${sitio.objetivo.id}.gemelo`, undefined, ob.nombre) : tr(`e05.sen.${ob.tipo}`, undefined, ob.nombre);

// Configuración por destino. tamano: lado del terreno (m), centrado en (0,0). umbral: puntaje mínimo para aprobar.
// La dificultad (B11) ajusta el umbral de aprobación de la foto, la agilidad del dron y el consumo de batería.
export function configurarEncuentro(mision) {
  const io = mision?.id === 'juno', aj = ajusteMinijuego(mision);
  const umbral = Math.min(84, Math.max(50, Math.round((io ? 72 : 70) / aj.tolerancia)));
  return { destino: io ? 'io' : 'luna', cuerpo: io ? 'Ío' : 'Luna', tamano: 320, gravedad: io ? 1.8 : 1.62, intensidadSol: io ? 1 / 27 : 1, umbral, velDron: aj.velocidad, consumoDron: 1 / aj.tiempo, colorSuelo: io ? '#c9b24a' : '#8d8a84', semillaBase: io ? 2027 : 1969 };
}

// ---------- Terreno ----------
const hash = (ix, iz, s) => { let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function ruido(x, z, s) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, s), b = hash(ix + 1, iz, s), c = hash(ix, iz + 1, s), d = hash(ix + 1, iz + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// Altura del terreno (m) en (x, z): ruido suave de 3 octavas + cráteres del sitio + la modificación propia del objetivo.
// Determinista y barata (~1 µs). Fuera del terreno devuelve la altura del borde.
export function alturaTerreno(cfg, sitio, x, z) {
  const L = cfg.tamano / 2; x = acotar(x, -L, L); z = acotar(z, -L, L);
  const s = cfg.semillaBase + sitio.semilla, o = sitio.objetivo, dO = o ? Math.hypot(x - o.x, z - o.z) : 99;
  // Cerca del objetivo el suelo es más liso, para que los objetos se asienten bien.
  let y = (ruido(x / 90, z / 90, s) * .6 + ruido(x / 35, z / 35, s + 1) * .3 + ruido(x / 12, z / 12, s + 2) * .1 - .5) * 14 * (dO < 60 ? .25 + .75 * suave(10, 60, dO) : 1);
  for (const c of sitio.crateres) {
    const t = Math.hypot(x - c.x, z - c.z) / c.r;
    if (t < 1.8) y += (t < 1 ? -c.h * (1 - t * t) : 0) + .25 * c.h * Math.exp(-(((t - 1) / .18) ** 2));
  }
  if (dO > 60) return y;
  switch (o.id) {
    case 'fosa': if (dO < 18) { const q = suave(.7, 1, dO / 18); y = -15 * (1 - q) + y * q; } break;
    case 'tycho': if (dO < 30) y += 12.5 * (1 + Math.cos(Math.PI * dO / 30)); break;
    case 'steeple': if (dO < 12) y += 35 * (1 - dO / 12) ** 1.5; break;
    case 'loki': if (dO < 40) { const q = suave(.6, 1, dO / 40); y = -5 * (1 - q) + y * q + 3 * (1 - suave(4, 8, dO)); } break;
  }
  return y;
}
// Normal unitaria [x, y, z] del terreno por diferencias finitas (paso de 1 m).
export function normalTerreno(cfg, sitio, x, z) {
  const dx = alturaTerreno(cfg, sitio, x + 1, z) - alturaTerreno(cfg, sitio, x - 1, z), dz = alturaTerreno(cfg, sitio, x, z + 1) - alturaTerreno(cfg, sitio, x, z - 1);
  return norm([-dx / 2, 1, -dz / 2]);
}

// ---------- Sitio ----------
function azar(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const vectorSol = ({ elevacion, azimut }) => { const e = elevacion * RAD, a = azimut * RAD; return [Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)]; };
// Sitio de la partida (misma semilla = mismo sitio): objetivo, 5–8 señuelos (2 de forma muy parecida), cráteres, zona de búsqueda
// (radio 45, NO centrada en el objetivo), punto de inicio del dron (a 90–140 m) y vector unitario hacia el Sol.
// objetivo.y es la cota de apoyo (suelo del objetivo; en `steeple` la base del pico, en `fosa` el fondo); su punto de mira es y + alto/2.
// Formas de señuelo/objetivo: modulo, rover, fosa, roca, isla, pico, pluma, crater, loma, colada, meseta.
export function generarSitio(cfg, mision, { objetivoId, semilla } = {}) {
  const lista = OBJETIVOS[mision?.id === 'juno' ? 'juno' : 'lro'], sem = semilla ?? Math.floor(Math.random() * 2 ** 31), rnd = azar(sem * 7 + cfg.semillaBase);
  const def = lista.find(o => o.id === objetivoId) || lista[Math.floor(rnd() * lista.length)], L = cfg.tamano / 2;
  const ox = (rnd() * 2 - 1) * 70, oz = (rnd() * 2 - 1) * 70;
  let inicio = null;
  for (let i = 0; i < 200 && !inicio; i++) {
    const a = rnd() * 2 * Math.PI, d = 90 + rnd() * 50, x = ox + Math.cos(a) * d, z = oz + Math.sin(a) * d;
    if (Math.abs(x) < L - 8 && Math.abs(z) < L - 8) inicio = { x, z };
  }
  inicio ||= { x: ox > 0 ? ox - 100 : ox + 100, z: oz };
  const lejos = (x, z, p, m) => Math.hypot(x - p.x, z - p.z) >= m;
  const crateres = [];
  for (let i = 0, n = 6 + Math.floor(rnd() * 4); i < n; i++) {
    const r = 5 + rnd() * 17, x = (rnd() * 2 - 1) * (L - 15), z = (rnd() * 2 - 1) * (L - 15);
    if (lejos(x, z, { x: ox, z: oz }, r + 30) && lejos(x, z, inicio, r + 15)) crateres.push({ x, z, r, h: r * (.12 + rnd() * .18) });
  }
  // Señuelos: 2 gemelos del objetivo (misma forma, tamaño parecido) a 25–80 m de él + 3–6 de la lista del destino.
  const plantillas = SENUELOS[cfg.destino].map(p => ({ p, k: rnd() })).sort((a, b) => a.k - b.k).slice(0, 3 + Math.floor(rnd() * 4)).map(e => e.p);
  const modelos = [0, 1].map(() => ({ tipo: 'gemelo', nombre: def.gemelo, forma: def.forma, radio: def.radio * (.8 + rnd() * .35), alto: def.alto * (.8 + rnd() * .3), gemelo: true })).concat(plantillas);
  const colocados = [{ x: ox, z: oz, r: def.radio }];
  const senuelos = modelos.map((m, i) => {
    let x = 0, z = 0;
    for (let k = 0; k < 80; k++) {
      if (m.gemelo) { const a = rnd() * 2 * Math.PI, d = 25 + rnd() * 55; x = ox + Math.cos(a) * d; z = oz + Math.sin(a) * d; } else { x = (rnd() * 2 - 1) * (L - 15); z = (rnd() * 2 - 1) * (L - 15); }
      if (Math.abs(x) < L - 12 && Math.abs(z) < L - 12 && lejos(x, z, inicio, 14) && colocados.every(c => lejos(x, z, c, c.r + m.radio + 12))) break;
    }
    colocados.push({ x, z, r: m.radio });
    if (m.cuenco) crateres.push({ x, z, r: m.radio, h: m.radio * .3 });
    const { gemelo: _g, cuenco: _c, ...resto } = m;
    return { id: `s${i + 1}`, ...resto, x, z, y: 0 };
  });
  const za = rnd() * 2 * Math.PI, zd = 14 + rnd() * 16;
  const sitio = { semilla: sem, objetivo: { ...def, x: ox, z: oz, y: 0 }, senuelos, crateres, zona: { x: ox + Math.cos(za) * zd, z: oz + Math.sin(za) * zd, r: 45 }, inicio, sol: norm(vectorSol(def.sol)) };
  sitio.objetivo.y = alturaTerreno(cfg, sitio, ox, oz) - (def.id === 'steeple' ? 35 : 0);
  for (const s of senuelos) s.y = alturaTerreno(cfg, sitio, s.x, s.z);
  return sitio;
}

// ---------- Cámara y foto ----------
// Cámara del dron: pos = [x, y + 0,4, z]; dir unitario desde yaw e inclinación; fov (°) = fovBase / zoom.
// dir = [−sin(yaw)·cos(inc), sin(inc), −cos(yaw)·cos(inc)] (yaw 0 mira a −Z; yaw positivo gira a la izquierda).
export function camaraDron(s) {
  const d = s.dron, i = d.inclinacion * RAD;
  return { pos: [d.x, d.y + .4, d.z], dir: [-Math.sin(d.yaw) * Math.cos(i), Math.sin(i), -Math.cos(d.yaw) * Math.cos(i)], fov: s.stats.fovBase / d.zoom };
}
const ALTURA_MIN = 1.5, ALTURA_MAX = 120;
const apuntar = o => [o.x, o.y + o.alto / 2, o.z];
// ¿El terreno tapa el segmento a→b? Marcha de rayos cada ~2 m; se detiene `corte` m antes de b (para no chocar con el propio objeto).
function tapado(cfg, sitio, a, b, corte) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], total = Math.hypot(dx, dy, dz) || 1, largo = Math.max(0, total - corte), n = Math.ceil(largo / 2);
  for (let i = 1; i <= n; i++) { const t = largo * i / n / total; if (alturaTerreno(cfg, sitio, a[0] + dx * t, a[2] + dz * t) > a[1] + dy * t) return true; }
  return false;
}
// Iluminación del objetivo: normal·Sol (0..1), sombra si el terreno tapa el Sol, luz propia (lava) y foco del dron.
// ilum 0..1 para el criterio de luz; absoluta (en unidades de «Sol lunar pleno» = 1) para la exposición.
function luzObjetivo(cfg, sitio, dist, stats) {
  const o = sitio.objetivo, nT = normalTerreno(cfg, sitio, o.x, o.z), n = norm([nT[0], nT[1] + 1, nT[2]]), mira = apuntar(o), sol = sitio.sol;
  let geom = Math.min(1, Math.max(0, punto(n, sol)) / .15), sombra = false;
  // La marcha hacia el Sol empieza fuera del propio cuerpo del objetivo.
  const en = k => [mira[0] + sol[0] * k, mira[1] + sol[1] * k, mira[2] + sol[2] * k];
  if (tapado(cfg, sitio, en(o.radio * 1.2), en(150), 0)) { sombra = true; geom *= stats.termica ? .25 : .05; }
  const propia = o.emision * (stats.termica ? 1.6 : 1), foco = stats.foco && dist < stats.radioFoco ? 1 - dist / stats.radioFoco : 0;
  return { geom, sombra, ilum: Math.min(1, geom + propia + foco * .7), absoluta: cfg.intensidadSol * geom + o.emision * .5 + foco * .5 };
}
const exposicion = abs => acotar(.004 / Math.max(abs, 1e-3), .002, .5);
const distA = (camara, p) => Math.hypot(p[0] - camara.pos[0], p[1] - camara.pos[1], p[2] - camara.pos[2]);
// Exposición estimada que muestra el modo foto, sin revelar la calificación: { exposicion_s, nivel: 'corta' | 'media' | 'larga' }.
// Se mide sobre el objetivo si está dentro del cuadro; si no, con luz plena.
export function exposicionEstimada(cfg, sitio, camara, stats) {
  const p = apuntar(sitio.objetivo), dist = distA(camara, p), v = norm([p[0] - camara.pos[0], p[1] - camara.pos[1], p[2] - camara.pos[2]]);
  const dentro = Math.acos(acotar(punto(v, camara.dir), -1, 1)) < camara.fov / 2 * RAD * .95;
  const t = exposicion(dentro ? luzObjetivo(cfg, sitio, dist, stats).absoluta : cfg.intensidadSol);
  return { exposicion_s: t, nivel: t < .02 ? 'corta' : t < .06 ? 'media' : 'larga' };
}
// 1 dentro de [a, b]; baja linealmente a 0 a `ancho` de distancia del rango.
const fueraDe = (v, a, b, ancho) => acotar(1 - (v < a ? a - v : v > b ? v - b : 0) / ancho, 0, 1);
const CRITERIOS = ['encuadre', 'tamano', 'nitidez', 'luz', 'angulo'], PESOS = { encuadre: .25, tamano: .2, nitidez: .2, luz: .2, angulo: .15 };
const RANGO_VISTA = { cenital: [65, 90], oblicua: [25, 55], rasante: [5, 25] };
const NITIDEZ_LIMITE = .003; // desplazamiento angular (rad) que deja la foto totalmente movida, sin zoom (K = 1)
// Calificación de una foto (ver tabla de docs/ENCUENTRO.md). camara = { pos, dir, fov }; velocidad en m/s.
// total 0–100 entero; criterios 0–1; motivo ≠ null = intento fallido directo con total 0 ('fuera' | 'tapado' | 'equivocado').
export function evaluarFoto(cfg, sitio, camara, velocidad, stats) {
  const o = sitio.objetivo, medio = camara.fov / 2 * RAD;
  const rechazo = (motivo, fotografiado, nombreFotografiado, consejo) => ({ total: 0, aprobada: false, criterios: { encuadre: 0, tamano: 0, nitidez: 0, luz: 0, angulo: 0 }, fotografiado, motivo, nombreFotografiado, consejo, exposicion_s: exposicionEstimada(cfg, sitio, camara, stats).exposicion_s });
  // Objetos dentro del cuadro; el fotografiado es aquel cuyo borde queda más cerca del centro de la retícula
  // (0 si la retícula cae sobre él). En empate gana el objetivo si la retícula está sobre él; si no, el más centrado.
  // Antes se dividía θ entre el tamaño angular y un cráter grande detrás del objetivo «ganaba» aunque se apuntara al objetivo.
  const vistos = [o, ...sitio.senuelos].map(ob => {
    const p = apuntar(ob), dist = distA(camara, p), th = Math.acos(acotar(punto([p[0] - camara.pos[0], p[1] - camara.pos[1], p[2] - camara.pos[2]], camara.dir) / dist, -1, 1));
    return { ob, p, dist, th, k: Math.max(0, th - Math.atan(ob.radio / dist)) };
  }).filter(v => v.th <= medio * .95).sort((a, b) => a.k - b.k || (a.ob === o ? -1 : b.ob === o ? 1 : a.th - b.th));
  if (!vistos.length) return rechazo('fuera', null, null, tr('e05.consejo.fuera'));
  const f = vistos[0];
  if (f.ob !== o) return rechazo('equivocado', f.ob.id, nombreVisto(sitio, f.ob), tr('e05.consejo.equivocado', { nombre: nombreVisto(sitio, f.ob), corto: textoObjetivo(o, 'corto'), pista: textoObjetivo(o, 'pista') }));
  if (tapado(cfg, sitio, camara.pos, f.p, o.radio * .8)) return rechazo('tapado', o.id, textoObjetivo(o, 'nombre'), tr('e05.consejo.tapado'));
  const zoom = stats.fovBase / camara.fov, luz = luzObjetivo(cfg, sitio, f.dist, stats), t = exposicion(luz.absoluta);
  const relleno = 2 * Math.atan(o.radio / f.dist) / (camara.fov * RAD);
  const aCam = norm([camara.pos[0] - f.p[0], camara.pos[1] - f.p[1], camara.pos[2] - f.p[2]]), phi = Math.acos(acotar(punto(aCam, sitio.sol), -1, 1)) / RAD;
  const [a, b] = o.fase === 'contraluz' ? [120, 170] : [35, 100];
  let fase = fueraDe(phi, a, b, 45); if (phi < 20) fase = Math.min(fase, .2);
  const elev = Math.asin(acotar(aCam[1], -1, 1)) / RAD, [ea, eb] = RANGO_VISTA[o.vista];
  const criterios = {
    encuadre: 1 - f.th / medio,
    tamano: relleno < .25 ? acotar((relleno - .02) / .23, 0, 1) : relleno > .6 ? acotar((1.1 - relleno) / .5, 0, 1) : 1,
    nitidez: acotar(1 - velocidad * t / f.dist * zoom * stats.sensibilidad / NITIDEZ_LIMITE, 0, 1),
    luz: luz.ilum * (fase + (1 - fase) * o.emision),
    angulo: fueraDe(elev, ea, eb, 30)
  };
  const total = Math.round(100 * CRITERIOS.reduce((s, k) => s + PESOS[k] * criterios[k], 0)), peor = CRITERIOS.reduce((m, k) => criterios[k] < criterios[m] ? k : m);
  return { total, aprobada: total >= cfg.umbral, criterios, fotografiado: o.id, motivo: null, nombreFotografiado: textoObjetivo(o, 'nombre'), consejo: consejoCriterio(peor, o, { relleno, sombra: luz.sombra, phi, criterios }), exposicion_s: t };
}
// Lectura en vivo para el HUD: distancia al objetivo y «señal» de 1 a 4 barras (frío/caliente, SIN dirección: buscarlo es
// parte del reto) y, en modo foto, la misma calificación que tendría la foto si se tomara ahora (luz, enfoque, encuadre…).
export function lecturaObjetivo(cfg, s) {
  const d = s.dron, o = s.sitio.objetivo;
  const distancia = Math.hypot(o.x - d.x, o.y + o.alto / 2 - d.y, o.z - d.z);
  const senal = distancia < 30 ? 4 : distancia < 60 ? 3 : distancia < 100 ? 2 : 1;
  const foto = s.modo === 'foto' ? evaluarFoto(cfg, s.sitio, camaraDron(s), Math.hypot(d.vx, d.vy, d.vz), s.stats) : null;
  return { distancia, senal, foto };
}
// Consejo de IO para el criterio más bajo.
function consejoCriterio(k, o, x) {
  if (x.criterios[k] >= .9) return tr('e05.consejo.perfecta');
  switch (k) {
    case 'encuadre': return tr('e05.consejo.encuadre');
    case 'tamano': return x.relleno < .25 ? tr('e05.consejo.tamano_chico') : tr('e05.consejo.tamano_grande');
    case 'nitidez': return tr('e05.consejo.nitidez');
    case 'luz': return x.sombra ? tr('e05.consejo.luz_sombra') : x.phi < 20 ? tr('e05.consejo.luz_espalda') : o.fase === 'contraluz' ? tr('e05.consejo.luz_contraluz') : tr('e05.consejo.luz_relieve');
    default: return o.vista === 'cenital' ? tr('e05.consejo.angulo_cenital') : o.vista === 'rasante' ? tr('e05.consejo.angulo_rasante') : tr('e05.consejo.angulo_oblicua');
  }
}

// ---------- Estado y pasos ----------
const dronInicial = (cfg, sitio, yaw) => ({ x: sitio.inicio.x, y: alturaTerreno(cfg, sitio, sitio.inicio.x, sitio.inicio.z) + 8, z: sitio.inicio.z, vx: 0, vy: 0, vz: 0, yaw, inclinacion: -15, zoom: 1 });
// Estado inicial. Siempre hay al menos UN dron para la etapa 05 (pedido de Eduardo, 14 nov): si en el juego 04 se usaron o
// perdieron todos, o el diseño no llevaba, la nodriza conserva un dron de reserva (dronReserva: true). Rotores sin aire → 'novuela'.
// 'sindron' queda solo por compatibilidad (ya no se produce).
// opciones: { objetivoId, semilla, disenoDron (partes del dron; por defecto DRON_BASE) }. Fases: ficha, vuelo, pausa, revision, exito, fracaso, novuela, omitida.
export const DRONES_MINIMOS_ENCUENTRO = 1;
export function crearEncuentro(estado, diseno, mision, opciones = {}) {
  const cfg = configurarEncuentro(mision), sitio = generarSitio(cfg, mision, opciones), stats = estadisticasDron(opciones.disenoDron || DRON_BASE, cfg.destino);
  const enBahia = estado.dronesRestantes ?? cantidadDrones(diseno || {});
  const dronReserva = enBahia < DRONES_MINIMOS_ENCUENTRO, drones = Math.max(DRONES_MINIMOS_ENCUENTRO, enBahia);
  const yaw = Math.atan2(-(sitio.zona.x - sitio.inicio.x), -(sitio.zona.z - sitio.inicio.z));
  const fase = drones <= 0 ? 'sindron' : !stats.puedeVolar ? 'novuela' : 'ficha';
  const motivo = fase === 'sindron' ? tr('e05.sindron', { corto: textoObjetivo(sitio.objetivo, 'corto') }) : fase === 'novuela' ? stats.motivoNoVuela : null;
  return { fase, motivo, sonda: sondaEncuentro(diseno, mision), drones, dronReserva, faseAntes: null, intento: 1, maxIntentos: 3, sitio, stats, dron: dronInicial(cfg, sitio, yaw), yawInicial: yaw, bateria: stats.bateria_s, modo: 'persecucion', fotos: [], resultado: null, chocado: false, bateriaNave: estado.bateria, bateriaNaveMax: estado.bateriaMax, registro: [] };
}
const hacia = (v, t, paso) => Math.abs(t - v) <= paso ? t : v + Math.sign(t - v) * paso;
function acercar(vx, vz, tx, tz, paso) { const dx = tx - vx, dz = tz - vz, n = Math.hypot(dx, dz); return n <= paso ? [tx, tz] : [vx + dx / n * paso, vz + dz / n * paso]; }
const falla = (s, motivo, consejo) => ({ ...s, fase: 'revision', modo: 'persecucion', chocado: motivo === 'choque', resultado: { total: 0, aprobada: false, criterios: { encuadre: 0, tamano: 0, nitidez: 0, luz: 0, angulo: 0 }, fotografiado: null, motivo, nombreFotografiado: null, consejo, exposicion_s: 0 }, registro: [...s.registro, tr('e05.reg.intento', { i: s.intento, texto: consejo })] });
// Acciones: empezar · tiempo { dt, mando: { adelante, lateral, vertical, giro } } (ejes −1..1 relativos al yaw; giro + = izquierda) ·
// camara { inclinacion (−90..10), zoom (1..zoomMax) } · modo { modo: 'persecucion' | 'foto' } · foto · reintentar · continuar · saltar · pausar · reanudar.
// ctx = { mision, cfg? }.
export function pasoEncuentro(s, accion, ctx = {}) {
  const cfg = ctx.cfg || configurarEncuentro(ctx.mision);
  switch (accion.tipo) {
    case 'empezar': return s.fase === 'ficha' ? { ...s, fase: 'vuelo' } : s;
    case 'pausar': return s.fase === 'vuelo' ? { ...s, fase: 'pausa', faseAntes: 'vuelo' } : s;
    case 'reanudar': return s.fase === 'pausa' ? { ...s, fase: s.faseAntes || 'vuelo', faseAntes: null } : s;
    case 'saltar': return ['sindron', 'novuela'].includes(s.fase) ? { ...s, fase: 'omitida' } : s;
    case 'camara': return s.fase === 'vuelo' ? { ...s, dron: { ...s.dron, inclinacion: acotar(accion.inclinacion ?? s.dron.inclinacion, -90, 10), zoom: acotar(accion.zoom ?? s.dron.zoom, 1, s.stats.zoomMax) } } : s;
    case 'modo': return s.fase === 'vuelo' && ['persecucion', 'foto'].includes(accion.modo) ? { ...s, modo: accion.modo } : s;
    case 'foto': {
      if (s.fase !== 'vuelo' || s.modo !== 'foto') return s;
      const d = s.dron, camara = camaraDron(s), resultado = evaluarFoto(cfg, s.sitio, camara, Math.hypot(d.vx, d.vy, d.vz), s.stats);
      return { ...s, fase: 'revision', resultado, fotos: [...s.fotos, { intento: s.intento, camara, resultado }], registro: [...s.registro, tr('e05.reg.foto', { i: s.intento, total: resultado.total, motivo: resultado.motivo ? ` (${tr(`e05.motivo.${resultado.motivo}`)})` : '' })] };
    }
    case 'reintentar':
      if (s.fase !== 'revision' || s.resultado.aprobada || s.intento >= s.maxIntentos) return s;
      return { ...s, fase: 'vuelo', intento: s.intento + 1, dron: dronInicial(cfg, s.sitio, s.yawInicial), bateria: s.stats.bateria_s, modo: 'persecucion', resultado: null, chocado: false, bateriaNave: Math.max(0, s.bateriaNave - s.bateriaNaveMax * .02), registro: [...s.registro, tr('e05.reg.otro')] };
    case 'continuar':
      if (s.fase !== 'revision') return s;
      return s.resultado.aprobada ? { ...s, fase: 'exito' } : s.intento >= s.maxIntentos ? { ...s, fase: 'fracaso' } : s;
    case 'tiempo': return s.fase === 'vuelo' ? volar(s, cfg, Math.max(0, Math.min(.1, accion.dt || 0)), accion.mando || {}) : s;
    default: return s;
  }
}
// Colisión con objetos (el objetivo y los señuelos): cilindro de radio ~0,8·r alrededor de cada uno, desde el suelo hasta su altura.
// No chocan los huecos ni lo que no es sólido (cráteres, fosas, plumas, coladas) ni los objetivos que ya son parte del terreno
// (fosa, Tycho, Steeple, Loki: con ellos choca el terreno).
const NO_SOLIDAS = new Set(['crater', 'fosa', 'pluma', 'colada']), OBJETIVOS_TERRENO = new Set(['fosa', 'tycho', 'steeple', 'loki']);
export function choqueConObjeto(cfg, sitio, x, y, z) {
  for (const ob of [sitio.objetivo, ...sitio.senuelos]) {
    if (NO_SOLIDAS.has(ob.forma) || (ob === sitio.objetivo && OBJETIVOS_TERRENO.has(ob.id))) continue;
    const tope = alturaTerreno(cfg, sitio, ob.x, ob.z) + (ob.y || 0) + ob.alto;
    if (Math.hypot(x - ob.x, z - ob.z) < ob.radio * .8 + .6 && y < tope) return ob;
  }
  return null;
}
function volar(s, cfg, dt, m) {
  const st = s.stats, d = s.dron, L = cfg.tamano / 2, ej = k => acotar(m[k] || 0, -1, 1);
  const ad = ej('adelante'), la = ej('lateral'), ve = ej('vertical'), gi = ej('giro');
  // Mando horizontal relativo al yaw: adelante = (−sin, −cos); derecha = (cos, −sin).
  let tx = -Math.sin(d.yaw) * ad + Math.cos(d.yaw) * la, tz = -Math.cos(d.yaw) * ad - Math.sin(d.yaw) * la;
  const nt = Math.hypot(tx, tz); if (nt > 1) { tx /= nt; tz /= nt; }
  const velMax = st.velMax * (cfg.velDron ?? 1);
  const [vx, vz] = acercar(d.vx, d.vz, tx * velMax, tz * velMax, st.aceleracion * dt), vy = hacia(d.vy, ve * st.empujeVertical, st.aceleracion * dt);
  const x = acotar(d.x + vx * dt, -L + 1, L - 1), z = acotar(d.z + vz * dt, -L + 1, L - 1);
  const dron = { ...d, x, z, y: Math.min(ALTURA_MAX, d.y + vy * dt), vx: x === d.x + vx * dt ? vx : 0, vy, vz: z === d.z + vz * dt ? vz : 0, yaw: d.yaw + gi * 90 * RAD * dt };
  const suelo = alturaTerreno(cfg, s.sitio, x, z) + ALTURA_MIN;
  let n = { ...s, dron };
  const golpe = choqueConObjeto(cfg, s.sitio, x, dron.y, z);
  if (golpe) return falla({ ...n, dron: { ...dron, vx: 0, vy: 0, vz: 0 } }, 'choque', tr('e05.falla.objeto', { nombre: nombreVisto(s.sitio, golpe) }));
  if (dron.y < suelo) {
    // Contra el suelo: choque si baja a más de 3 m/s o si el terreno sube de golpe contra el dron (salvo con LIDAR, que mantiene la altura).
    if (!st.mantieneAltura && (vy < -3 || suelo - d.y > 3)) return falla({ ...n, dron: { ...dron, y: suelo, vy: 0 } }, 'choque', vy < -3 ? tr('e05.falla.suelo') : tr('e05.falla.ladera'));
    n = { ...n, dron: { ...dron, y: suelo, vy: Math.max(0, vy) } };
  }
  const bateria = s.bateria - dt * st.factorRadiacion * (cfg.consumoDron ?? 1) * (1 + .4 * Math.min(1, Math.hypot(ad, la, ve, gi)));
  return bateria <= 0 ? falla({ ...n, bateria: 0 }, 'bateria', tr('e05.falla.bateria')) : { ...n, bateria };
}

// Vuelca el resultado de la etapa en el estado de la misión (idempotente).
// exito: encuentroCompletado, puntuacionEncuentro (mejor total × 10), batería de la nave y decisión; fracaso: perdida; omitida: sin bonificación.
export function aplicarEncuentro(e, s) {
  const o = s.sitio.objetivo;
  if (s.fase === 'exito') {
    if (e.encuentroCompletado) return e;
    const mejor = Math.max(0, ...s.fotos.filter(f => f.resultado.aprobada).map(f => f.resultado.total));
    return { ...e, bateria: s.bateriaNave, encuentroCompletado: true, puntuacionEncuentro: mejor * 10, decisiones: [...e.decisiones, { tipo: 'info', texto: tr('e05.decision.exito', { nombre: textoObjetivo(o, 'nombre'), mejor, i: s.intento, dato: textoObjetivo(o, 'dato') }) }] };
  }
  if (s.fase === 'fracaso') {
    const perdida = tr('e05.decision.fracaso', { nombre: textoObjetivo(o, 'nombre') });
    return e.perdida === perdida ? e : { ...e, perdida, decisiones: [...e.decisiones, { tipo: 'mal', texto: perdida }] };
  }
  if (s.fase === 'omitida') {
    if (e.encuentroCompletado) return e;
    return { ...e, encuentroCompletado: true, puntuacionEncuentro: 0, decisiones: [...e.decisiones, { tipo: 'info', texto: tr('e05.decision.omitido', { motivo: s.motivo }) }] };
  }
  return e;
}

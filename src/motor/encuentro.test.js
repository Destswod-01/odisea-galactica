import { describe, it, expect } from 'vitest';
import { OBJETIVOS, SENUELOS, configurarEncuentro, alturaTerreno, normalTerreno, generarSitio, crearEncuentro, pasoEncuentro, camaraDron, evaluarFoto, exposicionEstimada, aplicarEncuentro, lecturaObjetivo, choqueConObjeto } from './encuentro.js';
import { DRON_BASE, estadisticasDron } from './dronDiseno.js';

const RAD = Math.PI / 180, LRO = { id: 'lro' }, JUNO = { id: 'juno' };
const misionDe = id => id === 'juno' ? JUNO : LRO;
const todos = [['lro', 'apolo11'], ['lro', 'lunojod1'], ['lro', 'fosa'], ['lro', 'tycho'], ['juno', 'loki'], ['juno', 'steeple'], ['juno', 'pluma']];
const estado = { bateria: 2000, bateriaMax: 2000, decisiones: [], dronesRestantes: 2 };
// Cámara a `dist` m del punto de mira, `elev`° sobre el horizonte visto desde el objetivo y con ángulo de fase `phi`; `lado` ±1 elige a qué lado del Sol.
function camaraObjetivo(sitio, { dist, elev, phi, lado = 1, fov = 60 }) {
  const o = sitio.objetivo, p = [o.x, o.y + o.alto / 2, o.z], sol = sitio.sol, es = Math.asin(sol[1]), ec = elev * RAD;
  const c = Math.max(-1, Math.min(1, (Math.cos(phi * RAD) - Math.sin(ec) * Math.sin(es)) / (Math.cos(ec) * Math.cos(es))));
  const psi = Math.atan2(sol[2], sol[0]) + lado * Math.acos(c);
  const pos = [p[0] + dist * Math.cos(ec) * Math.cos(psi), p[1] + dist * Math.sin(ec), p[2] + dist * Math.cos(ec) * Math.sin(psi)];
  return { pos, dir: p.map((v, i) => (v - pos[i]) / dist), fov };
}
// Geometría ideal: relleno ~0,4 del cuadro, vista y fase preferidas del objetivo.
const ideal = (sitio, extra = {}) => {
  const o = sitio.objetivo;
  return { dist: o.radio / Math.tan(12 * RAD), elev: { oblicua: 40, cenital: 78, rasante: 15 }[o.vista], phi: o.fase === 'contraluz' ? 145 : 65, ...extra };
};
const mejor = (cfg, sitio, p, vel, stats) => [1, -1].map(lado => evaluarFoto(cfg, sitio, camaraObjetivo(sitio, { ...p, lado }), vel, stats)).sort((a, b) => b.total - a.total)[0];
const preparar = (id, objetivoId, semilla = 3) => { const m = misionDe(id), cfg = configurarEncuentro(m); return { m, cfg, sitio: generarSitio(cfg, m, { objetivoId, semilla }), stats: estadisticasDron(DRON_BASE, cfg.destino) }; };
// Pone el dron del estado en una cámara dada (yaw/inclinación coherentes con camaraDron) y activa el modo foto.
function ponerDron(s, cam) {
  const [x, y, z] = cam.pos, [dx, dy, dz] = cam.dir;
  return { ...s, fase: 'vuelo', modo: 'foto', dron: { ...s.dron, x, y: y - .4, z, vx: 0, vy: 0, vz: 0, yaw: Math.atan2(-dx, -dz), inclinacion: Math.asin(dy) / RAD, zoom: s.stats.fovBase / cam.fov } };
}
const avanzar = (s, ctx, accion, n, dt = .1) => { for (let i = 0; i < n && s.fase === 'vuelo'; i++) s = pasoEncuentro(s, { tipo: 'tiempo', dt, ...accion }, ctx); return s; };

describe('catálogo y configuración', () => {
  it('trae los 4 objetivos de LRO y los 3 de Juno con todos sus datos', () => {
    expect(OBJETIVOS.lro.map(o => o.id)).toEqual(['apolo11', 'lunojod1', 'fosa', 'tycho']); expect(OBJETIVOS.juno.map(o => o.id)).toEqual(['loki', 'steeple', 'pluma']);
    for (const o of [...OBJETIVOS.lro, ...OBJETIVOS.juno]) {
      for (const k of ['nombre', 'corto', 'pista', 'dato', 'forma']) expect(typeof o[k]).toBe('string');
      expect(o.radio).toBeGreaterThan(0); expect(['oblicua', 'cenital', 'rasante']).toContain(o.vista); expect(['lateral', 'contraluz']).toContain(o.fase);
      expect(o.sol.elevacion).toBeGreaterThan(0); expect(o.emision).toBeGreaterThanOrEqual(0); expect(o.emision).toBeLessThanOrEqual(1);
    }
    expect(SENUELOS.luna.length).toBeGreaterThanOrEqual(4); expect(SENUELOS.io.length).toBeGreaterThanOrEqual(4);
  });
  it('configura Luna e Ío', () => {
    expect(configurarEncuentro(LRO)).toMatchObject({ destino: 'luna', cuerpo: 'Luna', tamano: 320, intensidadSol: 1, umbral: 70 });
    expect(configurarEncuentro(JUNO)).toMatchObject({ destino: 'io', cuerpo: 'Ío', intensidadSol: 1 / 27, umbral: 72 });
  });
});

describe('terreno', () => {
  it('es determinista, rápido y devuelve el borde fuera del terreno', () => {
    const { cfg, sitio } = preparar('lro', 'apolo11', 7);
    expect(alturaTerreno(cfg, sitio, 12.3, -45.6)).toBe(alturaTerreno(cfg, sitio, 12.3, -45.6));
    expect(alturaTerreno(cfg, sitio, 500, 20)).toBe(alturaTerreno(cfg, sitio, 160, 20)); expect(alturaTerreno(cfg, sitio, -9e3, 9e3)).toBe(alturaTerreno(cfg, sitio, -160, 160));
    const t = performance.now(); let a = 0; for (let i = 0; i < 20000; i++) a += alturaTerreno(cfg, sitio, (i % 140) * 2 - 140, Math.floor(i / 140) * 2 - 140);
    expect(Number.isFinite(a)).toBe(true); expect(performance.now() - t).toBeLessThan(500);
    const otro = preparar('lro', 'apolo11', 8); expect(alturaTerreno(otro.cfg, otro.sitio, 12.3, -45.6)).not.toBe(alturaTerreno(cfg, sitio, 12.3, -45.6));
  });
  it('la fosa es un pozo de ~15 m; Tycho y Steeple tienen picos; Loki es un lago plano', () => {
    const f = preparar('lro', 'fosa'), o = f.sitio.objetivo;
    expect(alturaTerreno(f.cfg, f.sitio, o.x, o.z)).toBeLessThan(alturaTerreno(f.cfg, f.sitio, o.x + 19, o.z) - 12);
    const t = preparar('lro', 'tycho'); expect(alturaTerreno(t.cfg, t.sitio, t.sitio.objetivo.x, t.sitio.objetivo.z)).toBeGreaterThan(alturaTerreno(t.cfg, t.sitio, t.sitio.objetivo.x + 40, t.sitio.objetivo.z) + 15);
    const s = preparar('juno', 'steeple'), so = s.sitio.objetivo; expect(alturaTerreno(s.cfg, s.sitio, so.x, so.z)).toBeGreaterThan(so.y + 30);
    const l = preparar('juno', 'loki'), lo = l.sitio.objetivo;
    expect(Math.abs(alturaTerreno(l.cfg, l.sitio, lo.x + 20, lo.z) - alturaTerreno(l.cfg, l.sitio, lo.x - 20, lo.z))).toBeLessThan(.01);
  });
  it('la normal es unitaria y apunta hacia arriba en un llano', () => {
    const { cfg, sitio } = preparar('lro', 'apolo11'), n = normalTerreno(cfg, sitio, 10, 10);
    expect(Math.hypot(...n)).toBeCloseTo(1); expect(n[1]).toBeGreaterThan(.7);
    const f = preparar('lro', 'fosa'), o = f.sitio.objetivo, p = normalTerreno(f.cfg, f.sitio, o.x + 13, o.z); expect(p[0]).toBeLessThan(-.3);
  });
});

describe('sitio', () => {
  it('con la misma semilla da el mismo sitio y con otra, otro', () => {
    const cfg = configurarEncuentro(LRO), a = generarSitio(cfg, LRO, { semilla: 42 }), b = generarSitio(cfg, LRO, { semilla: 42 }), c = generarSitio(cfg, LRO, { semilla: 43 });
    expect(b).toEqual(a); expect(c).not.toEqual(a);
  });
  it('la zona contiene al objetivo sin estar centrada, el inicio queda a 90–140 m, hay 5–8 señuelos y todo cabe en el terreno', () => {
    for (const [id, ob] of todos) for (let semilla = 1; semilla <= 25; semilla++) {
      const { cfg, sitio: s } = preparar(id, ob, semilla), o = s.objetivo;
      const dz = Math.hypot(s.zona.x - o.x, s.zona.z - o.z); expect(dz).toBeLessThan(45); expect(dz).toBeGreaterThan(5); expect(s.zona.r).toBe(45);
      const di = Math.hypot(s.inicio.x - o.x, s.inicio.z - o.z); expect(di).toBeGreaterThanOrEqual(90); expect(di).toBeLessThanOrEqual(140);
      expect(s.senuelos.length).toBeGreaterThanOrEqual(5); expect(s.senuelos.length).toBeLessThanOrEqual(8);
      expect(s.senuelos.filter(x => x.forma === o.forma).length).toBeGreaterThanOrEqual(2);
      for (const p of [o, ...s.senuelos, s.inicio]) { expect(Math.abs(p.x)).toBeLessThan(cfg.tamano / 2); expect(Math.abs(p.z)).toBeLessThan(cfg.tamano / 2); }
      expect(Math.hypot(...s.sol)).toBeCloseTo(1); expect(o.id).toBe(ob);
    }
  });
  it('sin objetivoId lo elige al azar con la semilla y siempre es del catálogo', () => {
    const cfg = configurarEncuentro(JUNO), vistos = new Set();
    for (let semilla = 1; semilla <= 30; semilla++) { const s = generarSitio(cfg, JUNO, { semilla }); vistos.add(s.objetivo.id); expect(generarSitio(cfg, JUNO, { semilla }).objetivo.id).toBe(s.objetivo.id); }
    expect([...vistos].sort()).toEqual(['loki', 'pluma', 'steeple']);
  });
});

describe('calificación de la foto', () => {
  it('una cámara ideal (distancia, vista y fase preferidas, dron quieto, objetivo centrado) aprueba en los 7 objetivos', () => {
    for (const [id, ob] of todos) for (const semilla of [1, 2, 3, 4]) {
      const { cfg, sitio, stats } = preparar(id, ob, semilla), r = mejor(cfg, sitio, ideal(sitio), 0, stats);
      expect(r.motivo, `${ob} semilla ${semilla}`).toBeNull(); expect(r.aprobada, `${ob} semilla ${semilla}: ${r.total}`).toBe(true); expect(r.total).toBeGreaterThanOrEqual(90);
      expect(r.fotografiado).toBe(ob); expect(Number.isInteger(r.total)).toBe(true); expect(typeof r.consejo).toBe('string');
      for (const v of Object.values(r.criterios)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    }
  });
  it('objetivo fuera del cuadro → 0 «fuera»', () => {
    const { cfg, sitio, stats } = preparar('lro', 'apolo11'), c = camaraObjetivo(sitio, ideal(sitio));
    const r = evaluarFoto(cfg, sitio, { ...c, dir: [0, 1, 0] }, 0, stats);
    expect(r).toMatchObject({ total: 0, aprobada: false, motivo: 'fuera', fotografiado: null });
  });
  it('con la retícula sobre el objetivo no cuenta como «equivocado» aunque detrás haya un cráter-señuelo grande', () => {
    // Caso real de la prueba en pantalla: el módulo del Apolo 11 en el cuadro (retícula sobre él, no en su centro exacto)
    // y un cráter grande detrás. Barrido de cámaras alrededor del objetivo, con la retícula al 80 % de su radio aparente.
    let casos = 0;
    for (const semilla of [1, 2, 3, 4, 5]) {
      const { cfg, sitio, stats } = preparar('lro', 'apolo11', semilla), o = sitio.objetivo, p = [o.x, o.y + o.alto / 2, o.z];
      for (let a = 0; a < 360; a += 15) for (const d of [20, 35, 50, 70]) for (const alto of [4, 8]) {
        const x = o.x + Math.cos(a * RAD) * d, z = o.z + Math.sin(a * RAD) * d, pos = [x, alturaTerreno(cfg, sitio, x, z) + alto, z];
        const dist = Math.hypot(...p.map((v, k) => v - pos[k])), radAp = Math.atan(o.radio / dist);
        const elev = Math.asin((p[1] - pos[1]) / dist) + radAp * .8, az = Math.atan2(p[2] - pos[2], p[0] - pos[0]); // apunta por encima del centro
        const r = evaluarFoto(cfg, sitio, { pos, dir: [Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)], fov: 60 }, 0, stats);
        if (r.motivo === 'tapado') continue;
        casos++;
        expect(r.motivo, `semilla ${semilla}, ${a}°, ${d} m: ${r.nombreFotografiado}`).not.toBe('equivocado');
      }
    }
    expect(casos).toBeGreaterThan(200);
  });
  it('un señuelo centrado → 0 «equivocado» y nombra lo que se fotografió', () => {
    const { cfg, sitio, stats } = preparar('lro', 'lunojod1');
    for (const sen of sitio.senuelos) {
      const p = [sen.x, sen.y + sen.alto / 2, sen.z], pos = [sen.x + 25, sen.y + 15, sen.z + 5], d = Math.hypot(...p.map((v, i) => v - pos[i]));
      const r = evaluarFoto(cfg, sitio, { pos, dir: p.map((v, i) => (v - pos[i]) / d), fov: 60 }, 0, stats);
      expect(r.total).toBe(0); expect(r.motivo).toBe('equivocado'); expect(r.fotografiado).toBe(sen.id); expect(r.consejo).toContain(sen.nombre);
    }
  });
  it('el terreno en medio → 0 «tapado» (la fosa vista casi a ras del borde)', () => {
    const { cfg, sitio, stats } = preparar('lro', 'fosa'), o = sitio.objetivo, x = o.x + 32, z = o.z, y = alturaTerreno(cfg, sitio, x, z) + 2;
    const p = [o.x, o.y + o.alto / 2, o.z], pos = [x, y, z], d = Math.hypot(...p.map((v, i) => v - pos[i]));
    expect(evaluarFoto(cfg, sitio, { pos, dir: p.map((v, i) => (v - pos[i]) / d), fov: 60 }, 0, stats)).toMatchObject({ total: 0, motivo: 'tapado' });
    // Desde arriba la misma fosa sí se ve.
    expect(mejor(cfg, sitio, ideal(sitio), 0, stats).aprobada).toBe(true);
  });
  it('en Ío la misma foto con el dron a 5 m/s reprueba por nitidez y quieto aprueba; en la Luna 5 m/s a 30 m conserva la nitidez', () => {
    const { cfg, sitio, stats } = preparar('juno', 'steeple'), c = camaraObjetivo(sitio, ideal(sitio));
    // Se desvía 15° el encuadre para que el total quieto no sea 100.
    const lado = (() => { const [x, , z] = c.dir, n = Math.hypot(z, x) || 1; return [z / n, 0, -x / n].map(v => v * Math.tan(15 * RAD)); })();
    const sesgada = { ...c, dir: c.dir.map((v, i) => v + lado[i]) }, n = Math.hypot(...sesgada.dir); sesgada.dir = sesgada.dir.map(v => v / n);
    const quieto = evaluarFoto(cfg, sitio, sesgada, 0, stats), movido = evaluarFoto(cfg, sitio, sesgada, 5, stats);
    expect(quieto.exposicion_s).toBeGreaterThan(.09); expect(quieto.exposicion_s).toBeLessThan(.13);
    expect(quieto.aprobada).toBe(true); expect(quieto.criterios.nitidez).toBe(1);
    expect(movido.aprobada).toBe(false); expect(movido.criterios.nitidez).toBeLessThan(.1); expect(movido.motivo).toBeNull(); expect(movido.consejo).toMatch(/quieto/);
    const l = preparar('lro', 'apolo11'), m = evaluarFoto(l.cfg, l.sitio, camaraObjetivo(l.sitio, ideal(l.sitio, { dist: 30 })), 5, l.stats);
    expect(m.criterios.nitidez).toBeGreaterThanOrEqual(.6); expect(m.exposicion_s).toBeCloseTo(.004);
  });
  it('la pluma puntúa más luz a contraluz que con el Sol a la espalda, y el Apolo 11 al revés', () => {
    const j = preparar('juno', 'pluma'), L = preparar('lro', 'apolo11');
    const luz = ({ cfg, sitio, stats }, phi) => evaluarFoto(cfg, sitio, camaraObjetivo(sitio, ideal(sitio, { phi })), 0, stats).criterios.luz;
    expect(luz(j, 145)).toBeGreaterThan(luz(j, 10)); expect(luz(L, 65)).toBeGreaterThan(luz(L, 150));
  });
  it('sin Sol el objetivo queda a oscuras, la luz propia de Loki la compensa y el foco ayuda de cerca', () => {
    const { cfg, sitio, stats } = preparar('juno', 'loki'), c = camaraObjetivo(sitio, ideal(sitio));
    const conLava = evaluarFoto(cfg, { ...sitio, sol: [0, -.9, .1] }, c, 0, stats); // Sol bajo el horizonte
    expect(conLava.criterios.luz).toBeLessThan(.7); expect(conLava.criterios.luz).toBeGreaterThan(.2);
    const l = preparar('lro', 'tycho'), cl = camaraObjetivo(l.sitio, ideal(l.sitio)), apagado = { ...l.sitio, sol: [.05, -.9, .1] };
    expect(evaluarFoto(l.cfg, apagado, cl, 0, l.stats).criterios.luz).toBeLessThan(.1);
    const foco = estadisticasDron({ ...DRON_BASE, luz: 'foco' }, 'luna'), cerca = camaraObjetivo(l.sitio, ideal(l.sitio, { dist: 12 }));
    expect(evaluarFoto(l.cfg, apagado, cerca, 0, foco).criterios.luz).toBeGreaterThan(evaluarFoto(l.cfg, apagado, cerca, 0, l.stats).criterios.luz + .15);
  });
  it('la exposición estimada es corta en la Luna y larga en Ío, sin dar la calificación', () => {
    const l = preparar('lro', 'apolo11'), j = preparar('juno', 'steeple');
    expect(exposicionEstimada(l.cfg, l.sitio, camaraObjetivo(l.sitio, ideal(l.sitio)), l.stats)).toMatchObject({ nivel: 'corta' });
    const e = exposicionEstimada(j.cfg, j.sitio, camaraObjetivo(j.sitio, ideal(j.sitio)), j.stats); expect(e.nivel).toBe('larga'); expect(e.total).toBeUndefined();
  });
  it('el tamaño penaliza estar muy lejos y estar demasiado cerca', () => {
    const { cfg, sitio, stats } = preparar('lro', 'apolo11'), t = d => evaluarFoto(cfg, sitio, camaraObjetivo(sitio, ideal(sitio, { dist: d })), 0, stats).criterios.tamano;
    expect(t(19)).toBe(1); expect(t(150)).toBeLessThan(.2); expect(t(4.5)).toBeLessThan(.3);
  });
});

describe('vuelo', () => {
  const crear = (id = 'lro', ob = 'apolo11', opc = {}) => { const m = misionDe(id), cfg = configurarEncuentro(m); return { s: crearEncuentro(estado, { drones: 2 }, m, { objetivoId: ob, semilla: 3, ...opc }), ctx: { mision: m, cfg } }; };
  it('crea el estado inicial: ficha, un dron en el inicio y la batería llena', () => {
    const { s } = crear();
    expect(s).toMatchObject({ fase: 'ficha', intento: 1, maxIntentos: 3, modo: 'persecucion', resultado: null, chocado: false, bateriaNave: 2000, bateriaNaveMax: 2000, bateria: 120, fotos: [], registro: [] });
    expect(s.dron).toMatchObject({ x: s.sitio.inicio.x, z: s.sitio.inicio.z, vx: 0, zoom: 1 });
    expect(s.dron.y).toBeGreaterThan(alturaTerreno(configurarEncuentro(LRO), s.sitio, s.dron.x, s.dron.z) + 5); expect(s.stats.velMax).toBe(9);
    expect(pasoEncuentro(s, { tipo: 'tiempo', dt: .1 }, {}).dron).toBe(s.dron); // aún en la ficha no se vuela
    expect(pasoEncuentro(s, { tipo: 'empezar' }, {}).fase).toBe('vuelo');
  });
  it('siempre hay un dron para la etapa 05: sin drones en la bahía usa el de reserva y pasa a ficha', () => {
    const m = LRO;
    const vacio = crearEncuentro({ ...estado, dronesRestantes: 0 }, { drones: 3 }, m, { semilla: 1 });
    expect(vacio).toMatchObject({ fase: 'ficha', drones: 1, dronReserva: true });
    expect(crearEncuentro({ bateria: 1, bateriaMax: 1, decisiones: [] }, { drones: 0 }, m, { semilla: 1 })).toMatchObject({ fase: 'ficha', dronReserva: true });
    expect(crearEncuentro({ bateria: 1, bateriaMax: 1, decisiones: [] }, { drones: 2 }, m, { semilla: 1 })).toMatchObject({ fase: 'ficha', drones: 2, dronReserva: false });
    // En la ficha no se puede «saltar» la etapa: hay que jugarla.
    expect(pasoEncuentro(vacio, { tipo: 'saltar' }, { mision: m })).toBe(vacio);
  });
  it('si la etapa se omite (rotores sin aire), aplicarEncuentro no da bonificación y es idempotente', () => {
    const m = LRO, o = { ...crearEncuentro(estado, { drones: 1 }, m, { semilla: 1 }), fase: 'omitida', motivo: 'Sin dron que vuele.' };
    const e = aplicarEncuentro(estado, o); expect(e).toMatchObject({ encuentroCompletado: true, puntuacionEncuentro: 0 }); expect(e.decisiones.at(-1).texto).toMatch(/dron/); expect(aplicarEncuentro(e, o)).toBe(e);
  });
  it('con rotores en la Luna el dron no vuela: novuela con motivo y se puede saltar', () => {
    const s = crearEncuentro(estado, { drones: 1 }, LRO, { semilla: 1, disenoDron: { ...DRON_BASE, propulsion: 'rotores' } });
    expect(s.fase).toBe('novuela'); expect(s.motivo).toMatch(/aire|atm/i); expect(pasoEncuentro(s, { tipo: 'saltar' }, { mision: LRO }).fase).toBe('omitida');
  });
  it('avanza según el yaw, respeta velMax y se detiene sin mando', () => {
    const { s: s0, ctx } = crear(), s1 = { ...pasoEncuentro(s0, { tipo: 'empezar' }, ctx), dron: { ...s0.dron, yaw: 0, y: 40 } };
    const a = avanzar(s1, ctx, { mando: { adelante: 1, lateral: 0, vertical: 0, giro: 0 } }, 40);
    expect(a.dron.vz).toBeCloseTo(-9, 1); expect(a.dron.vx).toBeCloseTo(0); expect(a.dron.z).toBeLessThan(s1.dron.z - 20);
    const d = avanzar(s1, ctx, { mando: { adelante: 1, lateral: 1, vertical: 0, giro: 0 } }, 40); expect(Math.hypot(d.dron.vx, d.dron.vz)).toBeLessThanOrEqual(9.001); expect(d.dron.vx).toBeGreaterThan(5);
    const p = avanzar(a, ctx, { mando: {} }, 40); expect(Math.hypot(p.dron.vx, p.dron.vz)).toBeLessThan(.01);
    const g = avanzar({ ...s1, dron: { ...s1.dron, yaw: 90 * RAD } }, ctx, { mando: { adelante: 1 } }, 40); expect(g.dron.vx).toBeCloseTo(-9, 1); // yaw 90° mira a −X
  });
  it('giro +1 gira a la izquierda a 90°/s y la cámara calca la convención de three.js', () => {
    const { s: s0, ctx } = crear(), s1 = { ...pasoEncuentro(s0, { tipo: 'empezar' }, ctx), dron: { ...s0.dron, yaw: 0, y: 40 } };
    const g = avanzar(s1, ctx, { mando: { giro: 1 } }, 10); expect(g.dron.yaw).toBeCloseTo(Math.PI / 2, 3);
    const c = camaraDron({ ...g, dron: { ...g.dron, inclinacion: 0 } }); expect(c.dir[0]).toBeCloseTo(-1); expect(c.dir[2]).toBeCloseTo(0);
    const c0 = camaraDron({ ...s1, dron: { ...s1.dron, inclinacion: -90 } }); expect(c0.dir[1]).toBeCloseTo(-1); expect(c0.pos[1]).toBeCloseTo(s1.dron.y + .4); expect(c0.fov).toBe(60);
  });
  it('recorta dt a 0,1 y no sale del terreno', () => {
    const { s: s0, ctx } = crear(), s1 = { ...pasoEncuentro(s0, { tipo: 'empezar' }, ctx), dron: { ...s0.dron, yaw: 0, y: 40, vz: -9 } };
    const a = pasoEncuentro(s1, { tipo: 'tiempo', dt: 5, mando: { adelante: 1 } }, ctx); expect(s1.dron.z - a.dron.z).toBeLessThanOrEqual(.91); expect(s1.bateria - a.bateria).toBeLessThanOrEqual(.14 + 1e-9);
    const borde = avanzar({ ...s1, dron: { ...s1.dron, z: -150 } }, ctx, { mando: { adelante: 1 } }, 60); expect(borde.dron.z).toBeGreaterThanOrEqual(-159); expect(borde.fase).toBe('vuelo');
  });
  it('baja despacio sin chocar y mantiene 1,5 m sobre el suelo; el vertical respeta ±4 m/s', () => {
    const { s: s0, ctx } = crear(), s1 = { ...pasoEncuentro(s0, { tipo: 'empezar' }, ctx), dron: { ...s0.dron, y: 30 } };
    const a = avanzar(s1, ctx, { mando: { vertical: -.4 } }, 200);
    expect(a.fase).toBe('vuelo'); expect(a.dron.y).toBeCloseTo(alturaTerreno(ctx.cfg, a.sitio, a.dron.x, a.dron.z) + 1.5, 1);
    const r = avanzar(s1, ctx, { mando: { vertical: 1 } }, 15); expect(r.dron.vy).toBeCloseTo(4, 1);
  });
  it('choca al bajar rápido contra el suelo: revisión con motivo «choque» y el LIDAR lo evita', () => {
    const { s: s0, ctx } = crear(), s1 = { ...pasoEncuentro(s0, { tipo: 'empezar' }, ctx), dron: { ...s0.dron, y: 12 } };
    const c = avanzar(s1, ctx, { mando: { vertical: -1 } }, 100);
    expect(c.fase).toBe('revision'); expect(c.chocado).toBe(true); expect(c.resultado).toMatchObject({ aprobada: false, total: 0, motivo: 'choque' }); expect(c.fotos).toHaveLength(0);
    const { s: l } = crear('lro', 'apolo11', { disenoDron: { ...DRON_BASE, navegacion: 'lidar' } }), l1 = { ...pasoEncuentro(l, { tipo: 'empezar' }, ctx), dron: { ...l.dron, y: 12 } };
    expect(avanzar(l1, ctx, { mando: { vertical: -1 } }, 100).fase).toBe('vuelo');
  });
  it('la batería baja con el tiempo y más con el mando; Ío gasta un 30 % más; en 0 falla «batería agotada»', () => {
    const { s: s0, ctx } = crear(), s1 = { ...pasoEncuentro(s0, { tipo: 'empezar' }, ctx), dron: { ...s0.dron, y: 40 } };
    const q = avanzar(s1, ctx, { mando: {} }, 10), m = avanzar(s1, ctx, { mando: { adelante: 1 } }, 10);
    expect(q.bateria).toBeCloseTo(119, 5); expect(m.bateria).toBeCloseTo(120 - 1.4, 5);
    const { s: j, ctx: cj } = crear('juno', 'steeple'), j1 = pasoEncuentro(j, { tipo: 'empezar' }, cj); expect(avanzar(j1, cj, { mando: {} }, 10).bateria).toBeCloseTo(120 - 1.3, 5);
    const k = avanzar({ ...s1, bateria: .15 }, ctx, { mando: {} }, 5); expect(k).toMatchObject({ fase: 'revision', bateria: 0 }); expect(k.resultado.motivo).toBe('bateria');
  });
  it('la cámara limita inclinación y zoom, y el modo/foto solo funcionan en vuelo', () => {
    const { s: s0, ctx } = crear(), s1 = pasoEncuentro(s0, { tipo: 'empezar' }, ctx);
    const c = pasoEncuentro(s1, { tipo: 'camara', inclinacion: -200, zoom: 20 }, ctx); expect(c.dron.inclinacion).toBe(-90); expect(c.dron.zoom).toBe(4);
    expect(pasoEncuentro(s1, { tipo: 'camara', inclinacion: 50, zoom: .1 }, ctx).dron).toMatchObject({ inclinacion: 10, zoom: 1 });
    expect(pasoEncuentro(s1, { tipo: 'foto' }, ctx)).toBe(s1); // en persecución no dispara
    expect(pasoEncuentro(s0, { tipo: 'modo', modo: 'foto' }, ctx)).toBe(s0);
    expect(pasoEncuentro(s1, { tipo: 'modo', modo: 'foto' }, ctx).modo).toBe('foto');
  });
  it('pausa congela el vuelo y reanudar lo devuelve', () => {
    const { s: s0, ctx } = crear(), s1 = pasoEncuentro(s0, { tipo: 'empezar' }, ctx), p = pasoEncuentro(s1, { tipo: 'pausar' }, ctx);
    expect(p.fase).toBe('pausa'); expect(pasoEncuentro(p, { tipo: 'tiempo', dt: .1, mando: { adelante: 1 } }, ctx)).toBe(p); expect(pasoEncuentro(p, { tipo: 'reanudar' }, ctx).fase).toBe('vuelo');
  });
});

describe('intentos y cierre', () => {
  const m = LRO, ctx = { mision: m, cfg: configurarEncuentro(m) };
  const inicio = () => pasoEncuentro(crearEncuentro(estado, { drones: 2 }, m, { objetivoId: 'apolo11', semilla: 3 }), { tipo: 'empezar' }, ctx);
  // Foto mala: el dron mira horizontalmente en sentido contrario al objetivo.
  const malaFoto = s => { const o = s.sitio.objetivo, n = Math.hypot(s.dron.x - o.x, s.dron.z - o.z); return pasoEncuentro(ponerDron(s, { pos: [s.dron.x, s.dron.y + .4, s.dron.z], dir: [(s.dron.x - o.x) / n, 0, (s.dron.z - o.z) / n], fov: 60 }), { tipo: 'foto' }, ctx); };
  const buenaFoto = s => pasoEncuentro(ponerDron(s, camaraObjetivo(s.sitio, ideal(s.sitio))), { tipo: 'foto' }, ctx);
  it('una foto mala reprueba, reintentar cobra el 2 % a la nave y reinicia el dron', () => {
    const f = malaFoto(inicio());
    expect(f).toMatchObject({ fase: 'revision' }); expect(f.resultado).toMatchObject({ aprobada: false, motivo: 'fuera' }); expect(f.fotos).toHaveLength(1);
    expect(pasoEncuentro(f, { tipo: 'continuar' }, ctx)).toBe(f); // reprobada con intentos: no se continúa
    const r = pasoEncuentro(f, { tipo: 'reintentar' }, ctx);
    expect(r).toMatchObject({ fase: 'vuelo', intento: 2, modo: 'persecucion', resultado: null, bateria: 120 }); expect(r.bateriaNave).toBeCloseTo(1960);
    expect(r.dron).toMatchObject({ x: r.sitio.inicio.x, z: r.sitio.inicio.z, vx: 0, zoom: 1 }); expect(r.fotos).toHaveLength(1);
  });
  it('tres reprobadas → fracaso → aplicarEncuentro pone la pérdida (idempotente)', () => {
    let s = inicio();
    for (let i = 1; i <= 3; i++) { s = malaFoto(s); expect(s.intento).toBe(i); if (i < 3) s = pasoEncuentro(s, { tipo: 'reintentar' }, ctx); }
    expect(pasoEncuentro(s, { tipo: 'reintentar' }, ctx)).toBe(s); expect(s.bateriaNave).toBeCloseTo(1920);
    s = pasoEncuentro(s, { tipo: 'continuar' }, ctx); expect(s.fase).toBe('fracaso');
    const e = aplicarEncuentro(estado, s); expect(e.perdida).toBe(`Encuentro: tres fotos reprobadas de ${s.sitio.objetivo.nombre}.`); expect(e.encuentroCompletado).toBeUndefined();
    expect(aplicarEncuentro(e, s)).toBe(e);
  });
  it('una foto aprobada → exito → puntuación = mejor total × 10, batería de la nave y dato real (idempotente)', () => {
    let s = pasoEncuentro(malaFoto(inicio()), { tipo: 'reintentar' }, ctx);
    s = buenaFoto(s); expect(s.fase).toBe('revision'); expect(s.resultado.aprobada).toBe(true); expect(s.resultado.total).toBe(100);
    expect(pasoEncuentro(s, { tipo: 'reintentar' }, ctx)).toBe(s);
    s = pasoEncuentro(s, { tipo: 'continuar' }, ctx); expect(s.fase).toBe('exito');
    const e = aplicarEncuentro(estado, s);
    expect(e).toMatchObject({ encuentroCompletado: true, puntuacionEncuentro: 1000 }); expect(e.bateria).toBeCloseTo(1960); expect(e.perdida).toBeUndefined();
    const t = e.decisiones.at(-1); expect(t.tipo).toBe('info'); expect(t.texto).toContain('Apolo 11'); expect(t.texto).toContain('100/100'); expect(t.texto).toContain(s.sitio.objetivo.dato);
    expect(aplicarEncuentro(e, s)).toBe(e);
    expect(aplicarEncuentro(estado, inicio())).toBe(estado); // etapa sin terminar: no toca nada
  });
  it('una foto de otro objeto cuenta como intento fallido «equivocado»', () => {
    const s0 = inicio(), sen = s0.sitio.senuelos[0], p = [sen.x, sen.y + sen.alto / 2, sen.z], pos = [sen.x + 20, sen.y + 12, sen.z], d = Math.hypot(...p.map((v, i) => v - pos[i]));
    const f = pasoEncuentro(ponerDron(s0, { pos, dir: p.map((v, i) => (v - pos[i]) / d), fov: 60 }), { tipo: 'foto' }, ctx);
    expect(f.fase).toBe('revision'); expect(f.resultado.motivo).toBe('equivocado');
  });
  it('en Ío la foto toma la velocidad real del dron', () => {
    const cj = { mision: JUNO, cfg: configurarEncuentro(JUNO) }, s0 = pasoEncuentro(crearEncuentro(estado, { drones: 2 }, JUNO, { objetivoId: 'steeple', semilla: 3 }), { tipo: 'empezar' }, cj);
    const a = ponerDron(s0, camaraObjetivo(s0.sitio, ideal(s0.sitio))), quieto = pasoEncuentro(a, { tipo: 'foto' }, cj), movido = pasoEncuentro({ ...a, dron: { ...a.dron, vx: 5 } }, { tipo: 'foto' }, cj);
    expect(quieto.resultado.criterios.nitidez).toBe(1); expect(movido.resultado.criterios.nitidez).toBeLessThan(.1);
  });
});

describe('lecturaObjetivo (HUD en vivo de la etapa 05)', () => {
  it('sube la señal al acercarse y, en modo foto, da la misma calificación que tendría la foto', () => {
    const cj = { mision: LRO, cfg: configurarEncuentro(LRO) }, s0 = pasoEncuentro(crearEncuentro(estado, { drones: 2 }, LRO, { objetivoId: 'apolo11', semilla: 3 }), { tipo: 'empezar' }, cj);
    const lejos = lecturaObjetivo(cj.cfg, s0);
    expect(lejos.foto).toBeNull();
    expect(lejos.senal).toBeLessThanOrEqual(2);
    const a = ponerDron(s0, camaraObjetivo(s0.sitio, ideal(s0.sitio))), cerca = lecturaObjetivo(cj.cfg, a);
    expect(cerca.senal).toBeGreaterThan(lejos.senal);
    expect(cerca.foto.total).toBe(pasoEncuentro(a, { tipo: 'foto' }, cj).resultado.total);
  });
});

describe('sonda del encuentro', () => {
  it('el estado de la 05 lleva el tipo elegido en la primera casilla', async () => {
    const { crearEncuentro: crear } = await import('./encuentro.js');
    const m = (await import('../datos/misiones/lro.json')).default;
    const e = { bateria: 100, bateriaMax: 100 };
    expect(crear(e, { drones: 2, sondas: ['M7', 'M2'] }, m).sonda).toBe('M7');
    expect(crear(e, { drones: 0 }, m).sonda).toBe('M4');
  });
});

describe('colisión con objetos (etapa 05)', () => {
  it('chocar con el módulo del Apolo 11 hace fallar el intento; pasar por encima no', () => {
    const cj = { mision: LRO, cfg: configurarEncuentro(LRO) }, s0 = pasoEncuentro(crearEncuentro(estado, { drones: 2 }, LRO, { objetivoId: 'apolo11', semilla: 3 }), { tipo: 'empezar' }, cj);
    const o = s0.sitio.objetivo, base = alturaTerreno(cj.cfg, s0.sitio, o.x, o.z);
    expect(choqueConObjeto(cj.cfg, s0.sitio, o.x, base + o.alto / 2, o.z)).toBe(o);
    expect(choqueConObjeto(cj.cfg, s0.sitio, o.x, base + o.alto + 2, o.z)).toBeNull();
    const dentro = { ...s0, fase: 'vuelo', dron: { ...s0.dron, x: o.x, z: o.z, y: base + o.alto / 2, vx: 0, vy: 0, vz: 0 } };
    const n = pasoEncuentro(dentro, { tipo: 'tiempo', dt: .05 }, cj);
    expect(n.fase).toBe('revision');
    expect(n.chocado).toBe(true);
  });
  it('los objetivos que son parte del terreno (fosa) no cuentan como objeto sólido', () => {
    const cj = { mision: LRO, cfg: configurarEncuentro(LRO) }, s0 = crearEncuentro(estado, { drones: 2 }, LRO, { objetivoId: 'fosa', semilla: 3 });
    const o = s0.sitio.objetivo;
    expect(choqueConObjeto(cj.cfg, s0.sitio, o.x, -50, o.z)).toBeNull();
  });
});

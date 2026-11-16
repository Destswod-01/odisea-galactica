// Coordenadas y tiempos de juego combinados con telemetría de ascenso, Max-Q y separación de etapas.
import { enMaxQ, MAX_Q, pasoEstres, perfilGiro } from './ascenso.js';
import { ajusteMinijuego } from './dificultad.js';

export const HITOS_ETAPAS = [
  {
    id: 'solidos',
    umbral: 0.34,
    requiereSolidos: true,
    tituloClave: 'e02.Despegue.hito.solidos.titulo',
    accionClave: 'e02.Despegue.hito.solidos.accion',
  },
  {
    id: 'primera',
    umbral: 0.68,
    requiereSolidos: false,
    tituloClave: 'e02.Despegue.hito.primera.titulo',
    accionClave: 'e02.Despegue.hito.primera.accion',
  },
];

// La dificultad (B11) agranda o achica los aros (tolerancia) y cambia la velocidad de la nave.
export function configurarAros(mision, cohete = null) {
  const aj = ajusteMinijuego(mision);
  const nivel = Math.max(1, Math.min(5, Number(mision.numero) || (mision.id === 'juno' ? 2 : 1)));
  const total = 10 + (nivel - 1) * 2;
  const solidos = cohete?.solidos ?? (mision.id === 'juno' ? 5 : 0);
  return {
    nivel,
    total,
    minimo: Math.ceil(total * 0.8),
    radio: Math.max(1.65, 3 - (nivel - 1) * 0.65) * aj.tolerancia,
    velocidad: (22 + (nivel - 1) * 8) * aj.velocidad,
    separacion: 70 - (nivel - 1) * 5,
    lateral: 7.5,
    solidos,
  };
}

export function crearVueloAros(cfg, opciones = {}) {
  const ruta = Array.from({ length: cfg.total }, (_, i) => ({
    x: i < 2 ? 0 : Math.sin((i - 1) * 0.95) * (5.8 + cfg.nivel * 0.3),
    y: i < 2 ? 0 : Math.sin((i - 1) * 1.32) * (2.8 + cfg.nivel * 0.15),
    z: 55 + i * cfg.separacion,
    resultado: null,
  }));
  const solidos = opciones.solidos ?? cfg.solidos ?? 0;
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    distancia: 0,
    tiempo: 0,
    indice: 0,
    aciertos: 0,
    puntos: 0,
    ultimo: null,
    ruta,
    terminado: false,
    // Estado extendido de cohete realista:
    modoRealista: Boolean(opciones.realista),
    solidos,
    empuje: 1,
    estres: 0,
    sobrecarga: false,
    bajoEmpujeEnMaxQ: false,
    bonoMaxQ: false,
    progreso: 0,
    altitudKm: 0,
    velocidadKmh: 0,
    inclinacion: 0,
    enMaxQ: false,
    etapaActual: solidos > 0 ? 'solidos' : 'primera',
    cofiaAbierta: false,
    caidos: [],
    alertaEtapa: null,
    etapasHistorial: [],
  };
}

export function fijarEmpuje(s, valor) {
  s.empuje = Math.max(0.5, Math.min(1, Number(valor) || 1));
  if (s.enMaxQ && s.empuje <= 0.78) s.bajoEmpujeEnMaxQ = true;
  return s;
}

export function activarSeparacionEtapa(s) {
  if (!s.alertaEtapa) return false;
  const hito = s.alertaEtapa;
  const demora = Math.max(0, s.tiempo - hito.inicio);
  const aTiempo = demora <= 3.8;
  const tarde = aTiempo ? 0 : Math.min(4, demora - 2.2);
  if (!s.caidos.includes(hito.id)) s.caidos.push(hito.id);
  if (hito.id === 'solidos') {
    s.etapaActual = 'primera';
    s.etapasHistorial.push({ etapa: 'solidos', combustible: 0, tarde });
  } else if (hito.id === 'primera') {
    s.etapaActual = 'centaur';
    s.etapasHistorial.push({ etapa: 'primera', combustible: 0, tarde });
  }
  if (aTiempo) s.puntos += 100;
  s.ultimo = {
    ok: aTiempo,
    tiempo: s.tiempo,
    numero: `etapa-${hito.id}`,
    // La interfaz traduce: aquí solo van claves y números (la instantánea del espejo no depende del idioma).
    clave: aTiempo ? 'e02.Lanzamiento.stage_on_time' : 'e02.Lanzamiento.stage_late',
    accionClave: hito.accionClave,
    v0: Math.round(tarde * 25),
  };
  s.alertaEtapa = null;
  return true;
}

export function resultadoAros(s, cfg) {
  return {
    aciertos: s.aciertos,
    total: cfg.total,
    puntos: s.puntos,
    aprobado: s.terminado && s.aciertos >= cfg.minimo,
    fallos: cfg.total - s.aciertos,
    sobrecarga: Boolean(s.sobrecarga),
    etapas: s.etapasHistorial || [],
    bonoMaxQ: Boolean(s.bonoMaxQ),
  };
}

// Evalúa el plano del aro una sola vez; interpola el punto de cruce aunque
// el frame termine más adelante. No cuenta pasar cerca sin atravesarlo.
export function pasoAros(s, entrada, delta, cfg) {
  if (s.terminado) return s;
  const dt = Math.max(0, Math.min(0.05, delta));
  const antes = { x: s.x, y: s.y, z: s.distancia, p: s.progreso || 0 };

  let dx = Number(!!entrada.der) - Number(!!entrada.izq);
  let dy = Number(!!entrada.arriba) - Number(!!entrada.abajo);
  const longitud = Math.hypot(dx, dy) || 1;
  dx /= longitud;
  dy /= longitud;

  const suavidad = 1 - Math.exp(-12 * dt);
  s.vx += (dx * cfg.lateral - s.vx) * suavidad;
  s.vy += (dy * cfg.lateral - s.vy) * suavidad;
  s.x = Math.max(-12, Math.min(12, s.x + s.vx * dt));
  s.y = Math.max(-7, Math.min(7, s.y + s.vy * dt));

  // Control de empuje (throttle) por teclado/botones
  if (entrada.bajarEmpuje) fijarEmpuje(s, s.empuje - 0.55 * dt);
  if (entrada.subirEmpuje) fijarEmpuje(s, s.empuje + 0.55 * dt);

  // En modo realista, el cohete despega muy lento venciendo su enorme peso en la base,
  // tarda unos segundos en superar la torre y ya en el aire acelera al máximo.
  let avanceVel = cfg.velocidad;
  if (s.modoRealista) {
    const curvaDespegue =
      s.tiempo < 6.0 ? 0.04 + 0.96 * Math.pow(Math.min(1, s.tiempo / 6.0), 2.2) : 1;
    const factorEmpuje = 0.74 + 0.26 * s.empuje;
    avanceVel = cfg.velocidad * curvaDespegue * factorEmpuje;
  }

  s.distancia += avanceVel * dt;
  s.tiempo += dt;

  // Telemetría de ascenso, giro gravitatorio, Max-Q y etapas
  const zFinal = s.ruta.at(-1)?.z || 685;
  s.progreso = Math.max(0, Math.min(1, s.distancia / zFinal));
  s.inclinacion = perfilGiro(s.progreso);
  s.altitudKm = Math.round(Math.pow(s.progreso, 1.35) * 185 * 10) / 10;
  s.velocidadKmh = Math.round((0.06 * s.progreso + 0.94 * Math.pow(s.progreso, 1.65)) * 28400);
  s.enMaxQ = enMaxQ(s.progreso);

  if (s.enMaxQ && s.empuje <= 0.78) s.bajoEmpujeEnMaxQ = true;
  s.estres = pasoEstres(s.estres || 0, s.progreso, s.empuje ?? 1, dt);
  if (s.estres >= 0.98) s.sobrecarga = true;

  // Bono al salir de Max-Q habiendo cuidado la estructura con throttle down
  if (antes.p <= MAX_Q[1] && s.progreso > MAX_Q[1] && !s.sobrecarga && s.bajoEmpujeEnMaxQ && !s.bonoMaxQ) {
    s.bonoMaxQ = true;
    s.puntos += 150;
    s.ultimo = {
      ok: true,
      tiempo: s.tiempo,
      numero: 'maxq',
      clave: 'e02.Lanzamiento.maxq_cleared',
    };
  }

  // Gestión de hitos de separación de etapas (SRB y MECO/Centaur; la cofia de 4 partes se abre en órbita)
  if (!s.alertaEtapa) {
    const pendiente = HITOS_ETAPAS.find(
      h => (!h.requiereSolidos || s.solidos > 0) && !s.caidos.includes(h.id) && s.progreso >= h.umbral
    );
    if (pendiente) {
      s.alertaEtapa = { ...pendiente, inicio: s.tiempo };
    }
  } else {
    if (entrada.separar) {
      activarSeparacionEtapa(s);
    } else if (s.tiempo - s.alertaEtapa.inicio >= 5.8) {
      activarSeparacionEtapa(s);
    }
  }

  const aro = s.ruta[s.indice];
  if (aro && s.distancia >= aro.z) {
    const t = (aro.z - antes.z) / (s.distancia - antes.z || 1);
    const x = antes.x + (s.x - antes.x) * t;
    const y = antes.y + (s.y - antes.y) * t;
    aro.resultado = Math.hypot(x - aro.x, y - aro.y) <= cfg.radio;
    if (aro.resultado) {
      s.aciertos++;
      s.puntos += 100;
    }
    s.ultimo = {
      ok: aro.resultado,
      tiempo: s.tiempo,
      numero: s.indice + 1,
      clave: aro.resultado ? 'e02.Lanzamiento.ring_trajectory_cleared' : 'e02.Lanzamiento.ring_missed_correct_course',
    };
    s.indice++;
    s.terminado = s.indice === cfg.total;
  }
  return s;
}

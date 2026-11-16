// Modelo educativo en unidades de juego. Integramos en el marco del planeta;
// la velocidad respecto al Sol es u + Vplaneta. La gravedad no repone propelente.
export const PLANETAS_HONDA = {
  tierra: { id: 'tierra', nombre: 'Tierra', radio: 3.2, mu: 80, velocidad: 2.2, inicioY: -9, rapidez: 5.5, seguro: 7.5, color: '#74cfef', textura: 'earth_daymap' },
  venus: { id: 'venus', nombre: 'Venus', radio: 3.1, mu: 65, velocidad: 1.8, inicioY: -9, rapidez: 5.2, seguro: 7.3, color: '#edc58b' },
  jupiter: { id: 'jupiter', nombre: 'Júpiter', radio: 4, mu: 140, velocidad: 2, inicioY: -11, rapidez: 6.2, seguro: 9.5, color: '#dfb590', textura: 'jupiter' },
  luna: { id: 'luna', nombre: 'Luna', radio: 2.6, mu: 25, velocidad: 0, inicioY: -6.3, rapidez: 4.5, seguro: 7.5, color: '#ccd4df', textura: 'moon', aproximacion: true },
};
export function crearHonda(planeta, angulo = 2, potencia = 100) {
  const a = angulo * Math.PI / 180, v = planeta.rapidez * potencia / 100;
  const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
  return { x: -24, y: planeta.inicioY, vx, vy, tiempo: 0, periapsis: Infinity,
    velocidadInicial: Math.hypot(vx, vy + planeta.velocidad), velocidadFinal: null,
    ganancia: 0, resultado: null, trayectoria: [[-24, planeta.inicioY]], muestras: 0 };
}
const aceleracion = (x, y, mu) => { const r = Math.max(.1, Math.hypot(x, y)); return [-mu * x / r ** 3, -mu * y / r ** 3]; };
export function periapsisPrevista(s, p) {
  const r = Math.hypot(s.x, s.y), energia = (s.vx ** 2 + s.vy ** 2) / 2 - p.mu / r;
  const h = s.x * s.vy - s.y * s.vx, excentricidad = Math.sqrt(Math.max(0, 1 + 2 * energia * h ** 2 / p.mu ** 2));
  return h ** 2 / (p.mu * (1 + excentricidad));
}
export function pasoHonda(anterior, dt, p) {
  if (anterior.resultado) return anterior;
  const s = { ...anterior, trayectoria: [...anterior.trayectoria] };
  const total = Math.max(0, Math.min(.25, dt)), pasos = Math.max(1, Math.ceil(total / .008)), h = total / pasos;
  for (let i = 0; i < pasos && !s.resultado; i++) {
    const [ax, ay] = aceleracion(s.x, s.y, p.mu);
    s.x += s.vx * h + ax * h * h / 2; s.y += s.vy * h + ay * h * h / 2;
    const [bx, by] = aceleracion(s.x, s.y, p.mu);
    s.vx += (ax + bx) * h / 2; s.vy += (ay + by) * h / 2; s.tiempo += h;
    const r = Math.hypot(s.x, s.y); s.periapsis = Math.min(s.periapsis, r);
    if (r <= p.radio + .12) s.resultado = 'impacto';
    else if (p.aproximacion && r < 9 && s.x * s.vx + s.y * s.vy < 0) {
      const peri = periapsisPrevista(s, p);
      if (peri >= p.radio + .4 && peri <= p.seguro) s.resultado = 'exito';
    }
    if (!s.resultado && ((s.x > 0 && r >= Math.hypot(24, p.inicioY)) || s.tiempo >= 20)) {
      s.velocidadFinal = Math.hypot(s.vx, s.vy + p.velocidad);
      s.ganancia = s.velocidadFinal - s.velocidadInicial;
      s.resultado = s.periapsis >= p.radio + .3 && s.periapsis <= p.seguro && s.ganancia > .35 && !p.aproximacion ? 'exito' : 'lejos';
    }
  }
  s.muestras++;
  if (s.muestras % 2 === 0 || s.resultado) s.trayectoria = [...s.trayectoria.slice(-399), [s.x, s.y]];
  return s;
}
export function preverHonda(p, angulo, potencia) {
  let s = crearHonda(p, angulo, potencia);
  for (let i = 0; i < 800 && !s.resultado; i++) s = pasoHonda(s, .04, p);
  return s;
}

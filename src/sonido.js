// Efectos de sonido sintetizados con Web Audio (sin archivos): clic, compra, éxito, fallo, medalla y alerta.
// Se pueden silenciar; la preferencia se recuerda en el navegador.
let ctx = null;
let silencio = (() => { try { return localStorage.getItem('vdl-silencio') === '1'; } catch { return false; } })();

export const estaSilenciado = () => silencio;
export function alternarSilencio() {
  silencio = !silencio;
  try { localStorage.setItem('vdl-silencio', silencio ? '1' : '0'); } catch { /* sin almacenamiento */ }
  return silencio;
}

function audio() {
  if (silencio) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

// Una nota: frecuencia, inicio (s), duración (s), tipo de onda y volumen.
function nota(a, f, t0, dur, tipo = 'sine', vol = 0.12) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, a.currentTime + t0);
  g.gain.setValueAtTime(0.0001, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + t0);
  o.stop(a.currentTime + t0 + dur + 0.05);
}

export const sonidos = {
  leop(sistema) { const a = audio(); if (a) nota(a, [440, 660, 880][sistema] || 440, 0, .22, 'sine', .09); },
  clic() { const a = audio(); if (a) nota(a, 880, 0, 0.06, 'triangle', 0.05); },
  elegir() { const a = audio(); if (a) { nota(a, 660, 0, 0.08, 'triangle', 0.07); nota(a, 990, 0.05, 0.1, 'triangle', 0.06); } },
  comprar() { const a = audio(); if (a) [988, 1319, 1568, 1976].forEach((f, i) => nota(a, f, i * 0.06, 0.18, 'square', 0.05)); },
  exito() { const a = audio(); if (a) [523, 659, 784].forEach((f, i) => nota(a, f, i * 0.09, 0.25, 'triangle', 0.09)); },
  fallo() { const a = audio(); if (a) { nota(a, 220, 0, 0.25, 'sawtooth', 0.06); nota(a, 165, 0.15, 0.35, 'sawtooth', 0.06); } },
  alerta() { const a = audio(); if (a) [0, 0.25].forEach((t) => nota(a, 740, t, 0.16, 'square', 0.05)); },
  medalla() {
    const a = audio();
    if (!a) return;
    [523, 659, 784, 1047].forEach((f, i) => nota(a, f, i * 0.12, 0.35, 'triangle', 0.1));
    [1047, 1319, 1568].forEach((f) => nota(a, f, 0.55, 0.9, 'sine', 0.06));
  },
};

// Clic suave en cualquier botón de la página (una sola vez por aplicación).
let instalado = false;
export function instalarClics() {
  if (instalado) return;
  instalado = true;
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.('button:not(:disabled), .tarjeta')) sonidos.clic();
  }, true);
}

// Fondo del juego: estrellas en 3 capas que titilan y se desplazan (paralaje),
// nebulosas suaves y estrellas fugaces de vez en cuando. Respeta «reducir movimiento».
import { useEffect, useRef } from 'react';

export default function Espacio({ velocidad = 1 }) {
  const ref = useRef(null);
  const vel = useRef(velocidad);
  vel.current = velocidad;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ancho, alto, estrellas, fugaces = [], id;

    const crear = () => {
      ancho = canvas.width = window.innerWidth * devicePixelRatio;
      alto = canvas.height = window.innerHeight * devicePixelRatio;
      estrellas = Array.from({ length: Math.round((ancho * alto) / 9000) }, () => {
        const capa = Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2;
        return {
          x: Math.random() * ancho, y: Math.random() * alto, capa,
          r: (0.4 + capa * 0.55 + Math.random() * 0.4) * devicePixelRatio,
          fase: Math.random() * Math.PI * 2, ritmo: 0.5 + Math.random() * 2,
          tono: Math.random() < 0.15 ? '255,200,160' : Math.random() < 0.3 ? '170,200,255' : '255,255,255',
        };
      });
    };
    crear();
    window.addEventListener('resize', crear);

    let t0 = performance.now();
    const cuadro = (ahora) => {
      const dt = Math.min(50, ahora - t0) / 1000;
      t0 = ahora;
      ctx.clearRect(0, 0, ancho, alto);
      // Nebulosas: dos manchas de color muy tenues.
      for (const [cx, cy, rr, c] of [[0.85, 0.2, 0.5, '30,140,140'], [0.15, 0.9, 0.4, '200,110,60']]) {
        const g = ctx.createRadialGradient(cx * ancho, cy * alto, 0, cx * ancho, cy * alto, rr * ancho);
        g.addColorStop(0, `rgba(${c},0.10)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ancho, alto);
      }
      for (const s of estrellas) {
        if (!quieto) {
          s.x -= (s.capa + 1) * 4 * vel.current * dt * devicePixelRatio;
          if (s.x < 0) s.x += ancho;
        }
        const brillo = quieto ? 0.8 : 0.55 + 0.45 * Math.sin(ahora / 1000 * s.ritmo + s.fase);
        ctx.fillStyle = `rgba(${s.tono},${brillo})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!quieto && Math.random() < 0.004) {
        fugaces.push({ x: Math.random() * ancho, y: Math.random() * alto * 0.5, vida: 1 });
      }
      fugaces = fugaces.filter((f) => f.vida > 0);
      for (const f of fugaces) {
        const largo = 120 * devicePixelRatio;
        const g = ctx.createLinearGradient(f.x, f.y, f.x + largo, f.y - largo * 0.4);
        g.addColorStop(0, `rgba(255,255,255,${f.vida})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5 * devicePixelRatio;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + largo, f.y - largo * 0.4);
        ctx.stroke();
        f.x -= 900 * dt * devicePixelRatio;
        f.y += 360 * dt * devicePixelRatio;
        f.vida -= dt * 1.4;
      }
      id = requestAnimationFrame(cuadro);
    };
    id = requestAnimationFrame(cuadro);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', crear); };
  }, []);

  return <canvas ref={ref} className="espacio" aria-hidden="true" />;
}

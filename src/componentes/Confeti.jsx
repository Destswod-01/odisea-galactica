// Lluvia de confeti (cobre, crema y verde azulado) para celebrar una medalla. Dura ~3 s.
import { useEffect, useRef } from 'react';

const COLORES = ['#f0a46b', '#ffc99c', '#f1e6d6', '#6fd3d6', '#4fe0a8', '#d9773d'];

export default function Confeti({ cantidad = 140 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = ref.current;
    const g = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const piezas = Array.from({ length: cantidad }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, color: COLORES[Math.floor(Math.random() * COLORES.length)],
    }));
    let id; const t0 = performance.now();
    const cuadro = (ahora) => {
      g.clearRect(0, 0, c.width, c.height);
      const vida = 1 - (ahora - t0) / 3200;
      piezas.forEach((p) => {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.globalAlpha = Math.max(0, vida); g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.color; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
      });
      if (vida > 0) id = requestAnimationFrame(cuadro);
    };
    id = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(id);
  }, [cantidad]);
  return <canvas ref={ref} className="confeti" aria-hidden="true" />;
}

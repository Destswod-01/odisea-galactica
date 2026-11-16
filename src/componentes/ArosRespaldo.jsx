import { useEffect, useRef } from 'react';
import { useT } from '../i18n/idioma.js';

// Perspectiva para equipos sin WebGL. Comparte física, cohete en 3.ª persona y puntuación con el visor 3D.
export default function ArosRespaldo({ simulacion, cfg, camaraModo = 'tercera', alListo }) {
  const t = useT();
  const canvas = useRef();
  useEffect(() => {
    const c = canvas.current;
    const ctx = c.getContext('2d');
    let frame;
    alListo();
    const pintar = () => {
      const { width: w, height: h } = c.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = simulacion.current;
      const focal = h / (2 * Math.tan((34 * Math.PI) / 180));
      const p = Math.min(1, s.distancia / (s.ruta.at(-1)?.z || 685));
      const cielo = ctx.createLinearGradient(0, 0, 0, h);
      cielo.addColorStop(
        0,
        `rgb(${Math.round(80 * (1 - p))},${Math.round(150 * (1 - p))},${Math.round(200 * (1 - p) + 15)})`
      );
      cielo.addColorStop(1, p < 0.5 ? '#6daccd' : '#09172b');
      ctx.fillStyle = cielo;
      ctx.fillRect(0, 0, w, h);

      if (p < 0.45) {
        ctx.fillStyle = '#e9f4ff66';
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.ellipse(
            (i / 8) * w,
            h * (0.1 + p * 3) + Math.sin(i) * 40,
            w * 0.16,
            14,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      for (let i = s.ruta.length - 1; i >= s.indice; i--) {
        const a = s.ruta[i];
        const z = a.z - s.distancia;
        if (z < 0.2) continue;
        const escala = focal / z;
        ctx.strokeStyle = i === s.indice ? '#81fff1' : '#548ca6';
        ctx.lineWidth = i === s.indice ? 3 : 1;
        ctx.beginPath();
        ctx.arc(w / 2 + (a.x - s.x) * escala, h / 2 - (a.y - s.y) * escala, cfg.radio * escala, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Silueta del cohete en 3.ª persona cuando no está en cámara de 1.ª persona
      if (camaraModo !== 'primera') {
        const cx = w / 2;
        const cy = h * 0.66;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((s.vx || 0) * 0.025));
        if (s.enMaxQ) {
          ctx.strokeStyle = (s.estres || 0) > 0.65 ? '#fb923c88' : '#bae6fd77';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -42);
          ctx.lineTo(-42, 16);
          ctx.lineTo(42, 16);
          ctx.closePath();
          ctx.stroke();
        }
        // Cuerpo y cofia
        ctx.fillStyle = s.caidos?.includes('primera') ? '#e2e8f0' : '#d9823b';
        ctx.fillRect(-10, -28, 20, 44);
        if (!s.caidos?.includes('cofia')) {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(-11, -28);
          ctx.lineTo(0, -50);
          ctx.lineTo(11, -28);
          ctx.closePath();
          ctx.fill();
        }
        // SRBs laterales
        if ((s.solidos || 0) > 0 && !s.caidos?.includes('solidos')) {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(-18, -14, 6, 30);
          ctx.fillRect(12, -14, 6, 30);
        }
        // Pluma de fuego
        const largoLlama = 22 + (s.empuje ?? 1) * 18 + Math.sin(s.tiempo * 35) * 5;
        ctx.fillStyle = s.caidos?.includes('primera') ? '#38bdf8' : '#fb923c';
        ctx.beginPath();
        ctx.moveTo(-9, 16);
        ctx.lineTo(0, 16 + largoLlama);
        ctx.lineTo(9, 16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      frame = requestAnimationFrame(pintar);
    };
    pintar();
    return () => cancelAnimationFrame(frame);
  }, [alListo, cfg, simulacion, camaraModo]);
  return <canvas ref={canvas} style={{ width: '100%', height: '100%' }} aria-label={t('e02.ArosRespaldo.trajectory_in_perspective')} />;
}

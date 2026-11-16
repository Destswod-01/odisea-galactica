import { t, useIdioma } from '../i18n/idioma.js';
import { useEffect, useLayoutEffect, useRef } from 'react';

const transformar = (w, h) => ({ escala: Math.min((w - 36) / 60, (h - 55) / 36), cx: w / 2, cy: h / 2 + 9 });
export default function MapaCrucero({ juego, planeta, prevista, alApuntar }) {
  useIdioma();
  const canvas = useRef(), datos = useRef({ juego, planeta, prevista }), imagen = useRef(null), arrastre = useRef(null);
  useLayoutEffect(() => { datos.current = { juego, planeta, prevista }; }, [juego, planeta, prevista]);
  useEffect(() => {
    imagen.current = null; if (!planeta.textura) return;
    let activa = true; const img = new Image(); img.onload = () => { if (activa) imagen.current = img; }; img.src = `./texturas/${planeta.textura}.jpg`;
    return () => { activa = false; };
  }, [planeta.textura]);
  useEffect(() => {
    const c = canvas.current, ctx = c.getContext('2d'); let frame;
    const dibujar = () => {
      const { width: w, height: h } = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { juego: s, planeta: p, prevista: prev } = datos.current, { escala: k, cx, cy } = transformar(w, h);
      const punto = (x, y) => [cx + x * k, cy - y * k];
      const fondo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .7); fondo.addColorStop(0, '#11344a'); fondo.addColorStop(.45, '#091c30'); fondo.addColorStop(1, '#030b17'); ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 130; i++) { const x = ((i * 137.507) % 997) / 997 * w, y = ((i * 73.33) % 607) / 607 * h; ctx.fillStyle = i % 7 === 0 ? '#a8d4eea0' : '#8caec452'; ctx.fillRect(x, y, i % 7 === 0 ? 1.5 : .8, i % 7 === 0 ? 1.5 : .8); }
      ctx.strokeStyle = '#5f99b213'; ctx.lineWidth = 1; ctx.setLineDash([2, 7]);
      for (let i = -25; i <= 25; i += 5) { ctx.beginPath(); ctx.moveTo(...punto(-30, i)); ctx.lineTo(...punto(30, i)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...punto(i, -26)); ctx.lineTo(...punto(i, 26)); ctx.stroke(); } ctx.setLineDash([]);
      const interior = p.aproximacion ? 8.5 : p.radio + .3, exterior = p.aproximacion ? 9.5 : p.seguro;
      ctx.beginPath(); ctx.arc(cx, cy, exterior * k, 0, Math.PI * 2); ctx.arc(cx, cy, interior * k, 0, Math.PI * 2, true); ctx.fillStyle = '#62d8b71c'; ctx.fill('evenodd');
      for (const r of [interior, exterior]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, Math.PI * 2); ctx.strokeStyle = '#8bebc553'; ctx.setLineDash([4, 6]); ctx.stroke(); } ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx, cy, (p.radio + .16) * k, 0, Math.PI * 2); ctx.strokeStyle = '#fa708a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, p.radio * k, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = p.color; ctx.fillRect(cx - p.radio * k, cy - p.radio * k, p.radio * k * 2, p.radio * k * 2);
      if (imagen.current) { const img = imagen.current, lado = img.height; ctx.drawImage(img, img.width * .36, 0, lado, lado, cx - p.radio * k, cy - p.radio * k, p.radio * k * 2, p.radio * k * 2); }
      else { ctx.strokeStyle = '#fff4b350'; ctx.lineWidth = 4; for (let i = -4; i < 5; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + i * p.radio * k / 5, p.radio * k, 5, -.25, 0, Math.PI * 2); ctx.stroke(); } }
      const sombra = ctx.createRadialGradient(cx - p.radio * k * .5, cy - p.radio * k * .6, p.radio * k * .1, cx + p.radio * k * .2, cy + p.radio * k * .3, p.radio * k * 1.5); sombra.addColorStop(0, '#ffffff15'); sombra.addColorStop(.55, '#04091722'); sombra.addColorStop(1, '#010512ef'); ctx.fillStyle = sombra; ctx.fillRect(cx - p.radio * k, cy - p.radio * k, p.radio * k * 2, p.radio * k * 2); ctx.restore();
      const trazar = (pts, color, ancho, guiones = []) => { if (!pts.length) return; ctx.beginPath(); ctx.moveTo(...punto(...pts[0])); pts.slice(1).forEach(pt => ctx.lineTo(...punto(...pt))); ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.setLineDash(guiones); ctx.stroke(); ctx.setLineDash([]); };
      if (s.fase === 'plan') trazar(prev.trayectoria, prev.resultado === 'impacto' ? '#ff829bab' : '#a1e7f7a0', 1.5, [5, 6]);
      const f = s.vuelo || { x: -24, y: p.inicioY, vx: Math.cos(s.angulo * Math.PI / 180), vy: Math.sin(s.angulo * Math.PI / 180) };
      if (s.vuelo) trazar(s.vuelo.trayectoria, '#a2f4df', 2);
      const [sx, sy] = punto(f.x, f.y);
      if (s.fase === 'plan') {
        const a = s.angulo * Math.PI / 180, largo = s.potencia / 100 * 11;
        trazar([[f.x, f.y], [f.x + Math.cos(a) * largo, f.y + Math.sin(a) * largo]], '#ffcf85', 2);
        ctx.beginPath(); ctx.arc(sx, sy, 17, 0, Math.PI * 2); ctx.strokeStyle = '#ffcf85a0'; ctx.lineWidth = 1; ctx.stroke();
      }
      if (s.fase === 'fallo' && f.resultado === 'impacto') {
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.strokeStyle = i % 2 ? '#ffb67d' : '#ff6c8a'; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 8, sy + Math.sin(a) * 8); ctx.lineTo(sx + Math.cos(a) * 24, sy + Math.sin(a) * 24); ctx.stroke(); }
      } else {
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(-Math.atan2(f.vy, f.vx)); ctx.shadowColor = '#a1f6e2'; ctx.shadowBlur = 12; ctx.fillStyle = '#d7fff4'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -6); ctx.lineTo(-3, 0); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.textAlign = 'center'; ctx.font = '11px monospace'; ctx.fillStyle = '#c5deec'; ctx.fillText(t(`e04.planeta.${s.planeta}`).toUpperCase(), cx, cy + (p.radio + 1.7) * k);
      if (!p.aproximacion) { ctx.strokeStyle = '#b8a0f3'; ctx.lineWidth = 2; const x = cx + (p.seguro + 2.3) * k; ctx.beginPath(); ctx.moveTo(x, cy + 18); ctx.lineTo(x, cy - 18); ctx.lineTo(x - 4, cy - 10); ctx.moveTo(x, cy - 18); ctx.lineTo(x + 4, cy - 10); ctx.stroke(); ctx.fillStyle = '#c0afe3'; ctx.font = '9px monospace'; ctx.fillText(t('e04.MapaCrucero.orbit'), x, cy + 32); }
      frame = requestAnimationFrame(dibujar);
    }; dibujar(); return () => cancelAnimationFrame(frame);
  }, []);
  const apuntar = e => {
    if (juego.fase !== 'plan') return;
    const r = canvas.current.getBoundingClientRect(), { escala, cx, cy } = transformar(r.width, r.height);
    const x = (e.clientX - r.left - cx) / escala, y = -(e.clientY - r.top - cy) / escala;
    const dx = x + 24, dy = y - planeta.inicioY;
    if (dx > .5) alApuntar({ angulo: Math.atan2(dy, dx) * 180 / Math.PI, potencia: Math.max(75, Math.min(125, Math.hypot(dx, dy) / 11 * 100)) });
  };
  return <canvas ref={canvas} className="capitan-canvas" aria-label={t('e04.MapaCrucero.trajectory_map_near_drag_to_aim', { v0: t(`e04.planeta.${juego.planeta}`) })}
    onPointerDown={e => { if (juego.fase !== 'plan') return; arrastre.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); apuntar(e); }}
    onPointerMove={e => { if (arrastre.current === e.pointerId) apuntar(e); }} onPointerUp={() => { arrastre.current = null; }} onPointerCancel={() => { arrastre.current = null; }} onLostPointerCapture={() => { arrastre.current = null; }} />;
}

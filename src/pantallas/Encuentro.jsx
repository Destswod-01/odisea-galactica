import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alturaTerreno, aplicarEncuentro, camaraDron, configurarEncuentro, crearEncuentro, exposicionEstimada, lecturaObjetivo, pasoEncuentro, textoObjetivo } from '../motor/encuentro.js';
import { useT } from '../i18n/idioma.js';
import DialogoIO from '../componentes/DialogoIO.jsx';
import { soportaWebGL } from '../tres/webgl.js';
import { sonidos } from '../sonido.js';
import { useEspejo } from '../red/espejo.js';
import './encuentro.css';
// La escena 3D (terreno, cielo, dron) carga three aparte para no inflar la carga inicial.
const Encuentro3D = lazy(() => import('../tres/Encuentro3D.jsx'));

const RAD = Math.PI / 180;
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const CRITERIOS = ['encuadre', 'tamano', 'nitidez', 'luz', 'angulo'];
const MEDIDORES = ['luz', 'nitidez', 'encuadre', 'tamano', 'angulo'];
const ICONO_MOTIVO = { fuera: '🔭', tapado: '⛰️', equivocado: '❓', choque: '💥', bateria: '🪫' };
const TECLAS_MANDO = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyR', 'KeyF', 'KeyQ', 'KeyE', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

// Minimapa: bordes del terreno, zona de búsqueda, punto de inicio y flecha del dron (NO marca el objetivo).
function Minimapa({ s }) {
  const tr = useT(), { zona, inicio } = s.sitio, d = s.dron;
  return <svg className="enc-mini" viewBox="-172 -172 344 344" role="img" aria-label={tr('e05.Encuentro.minimapa')}>
    <rect x="-160" y="-160" width="320" height="320" fill="#06141f" stroke="#8fd4e0" strokeWidth="3" />
    <path d="M-160 0H160M0 -160V160" stroke="#8fd4e044" strokeWidth="1.5" />
    <circle cx={zona.x} cy={zona.z} r={zona.r} fill="#7fe8ff14" stroke="#9de7d5" strokeWidth="3" strokeDasharray="9 7" />
    <circle cx={inicio.x} cy={inicio.z} r="6" fill="#7fe8ff" /><circle cx={inicio.x} cy={inicio.z} r="11" fill="none" stroke="#7fe8ff" strokeWidth="2" />
    <g transform={`translate(${d.x} ${d.z}) rotate(${-d.yaw / RAD})`}><polygon points="0,-17 12,13 0,6 -12,13" fill="#ffd390" stroke="#2a1a05" strokeWidth="2" /></g>
    <text x="0" y="-146" textAnchor="middle" fontSize="22" fill="#8fd4e0" fontFamily="monospace">N</text>
  </svg>;
}
// Joystick virtual: escribe adelante/lateral (−1..1) en el ref del mando táctil.
function Joystick({ tactil }) {
  const tr = useT();
  const base = useRef(null), perilla = useRef(null), id = useRef(null);
  const mover = e => {
    const r = base.current.getBoundingClientRect(), R = r.width / 2 * .68;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const n = Math.hypot(dx, dy);
    if (n > R) { dx *= R / n; dy *= R / n; }
    perilla.current.style.transform = `translate(${dx}px,${dy}px)`;
    const eje = v => Math.abs(v) < R * .14 ? 0 : Math.sign(v) * (Math.abs(v) - R * .14) / (R * .86);
    tactil.current.jx = eje(dx); tactil.current.jy = -eje(dy);
  };
  const soltar = () => { id.current = null; tactil.current.jx = 0; tactil.current.jy = 0; if (perilla.current) perilla.current.style.transform = 'translate(0,0)'; };
  return <div className="enc-joy" ref={base} role="group" aria-label={tr('e05.Encuentro.joystick')}
    onPointerDown={e => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); mover(e); }}
    onPointerMove={e => { if (id.current === e.pointerId) mover(e); }} onPointerUp={soltar} onPointerCancel={soltar} onLostPointerCapture={soltar} onContextMenu={e => e.preventDefault()}><i ref={perilla} /></div>;
}
// Botón que actúa mientras se mantiene pulsado.
function Mantener({ alAprieta, alSuelta, className, etiqueta, children }) {
  return <button type="button" className={className} aria-label={etiqueta} tabIndex={-1} onContextMenu={e => e.preventDefault()}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); alAprieta(); }} onPointerUp={alSuelta} onPointerCancel={alSuelta} onLostPointerCapture={alSuelta}>{children}</button>;
}
function Bateria({ pct, rad }) {
  const tr = useT();
  return <div className={`enc-bateria ${pct < .25 ? 'baja' : ''}`}><span>{rad ? '☢ ' : ''}{tr('e05.Encuentro.bateria')}</span><div className="enc-barra"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div><b>{Math.round(pct * 100)} %</b></div>;
}

export default function Encuentro({ mision, diseno, estado, setEstado, alTerminar, alPerder, opciones }) {
  const tr = useT();
  const cfg = useMemo(() => configurarEncuentro(mision), [mision]), ctx = useMemo(() => ({ mision, cfg }), [mision, cfg]);
  const webgl = useMemo(() => soportaWebGL(), []);
  const [inicial] = useState(() => {
    const n = crearEncuentro(estado, diseno, mision, opciones);
    return webgl || n.fase !== 'ficha' ? n : { ...n, fase: 'novuela', motivo: tr('e05.Encuentro.sin3d') };
  });
  const sRef = useRef(inicial), [s, setS] = useState(inicial), [captura, setCaptura] = useState(null);
  const { espectador, espectadorRef } = useEspejo({ fase: 'encuentro', s, setS, sRef });
  const mandoRef = useRef({ adelante: 0, lateral: 0, vertical: 0, giro: 0 }), disparoRef = useRef(false), cerrado = useRef(false);
  // `pulsadas`: teclas que bajaron desde el último cuadro; así un toque rápido (bajar y subir entre dos cuadros) también cuenta.
  const teclas = useRef(new Set()), pulsadas = useRef(new Set()), zoomTecla = useRef(0), tactil = useRef({ jx: 0, jy: 0, vert: 0, giro: 0, dx: 0, dy: 0, dz: 0 }), arrastre = useRef(null), escenaRef = useRef(null), espacio = useRef(false);

  const enviar = useCallback(a => {
    const n = pasoEncuentro(sRef.current, a, ctx);
    if (n !== sRef.current) { sRef.current = n; setS(n); }
    return n;
  }, [ctx]);
  const disparar = useCallback(() => {
    const e = sRef.current;
    if (e.fase !== 'vuelo') return;
    if (e.modo !== 'foto') enviar({ tipo: 'modo', modo: 'foto' }); else disparoRef.current = true;
  }, [enviar]);
  const cambiarModo = useCallback(() => { const e = sRef.current; if (e.fase === 'vuelo') enviar({ tipo: 'modo', modo: e.modo === 'foto' ? 'persecucion' : 'foto' }); }, [enviar]);
  const alternarPausa = useCallback(() => { const f = sRef.current.fase; if (f === 'vuelo') enviar({ tipo: 'pausar' }); else if (f === 'pausa') enviar({ tipo: 'reanudar' }); }, [enviar]);
  // La escena 3D devuelve la imagen en el mismo cuadro del disparo; con ella llega la acción `foto` (se califica el estado de ese instante).
  const alCaptura = useCallback(url => {
    const n = pasoEncuentro(sRef.current, { tipo: 'foto' }, ctx);
    if (n === sRef.current) return;
    sRef.current = n; setS(n); setCaptura({ intento: n.intento, url });
  }, [ctx]);

  // Bucle de vuelo: lee el mando (teclado + táctil), aplica la cámara y avanza el motor; el HUD se refresca a ~30 Hz.
  useEffect(() => {
    let id = 0, antes = performance.now(), acum = 0;
    const tiene = c => teclas.current.has(c) || pulsadas.current.has(c);
    const eje = (a, b) => (tiene(a) ? 1 : 0) - (tiene(b) ? 1 : 0);
    const bucle = ahora => {
      id = requestAnimationFrame(bucle);
      const dt = Math.min(.1, (ahora - antes) / 1000); antes = ahora; acum += dt;
      let e = sRef.current; const fase = e.fase, t = tactil.current;
      if (fase === 'vuelo' && !espectadorRef.current) {
        // ↑/↓ avanzan en persecución; en modo foto inclinan la cámara (abajo). E/Q son alternativa a R/F para la altura.
        const flechas = e.modo === 'foto' ? 0 : eje('ArrowUp', 'ArrowDown');
        const mando = { adelante: acotar(eje('KeyW', 'KeyS') + flechas + t.jy, -1, 1), lateral: acotar(eje('KeyD', 'KeyA') + t.jx, -1, 1), vertical: acotar(eje('KeyR', 'KeyF') + eje('KeyE', 'KeyQ') + t.vert, -1, 1), giro: acotar(eje('ArrowLeft', 'ArrowRight') + t.giro - t.dx * .4 / (Math.max(dt, .008) * 90), -1, 1) };
        mandoRef.current = mando;
        let inc = e.dron.inclinacion, zoom = e.dron.zoom;
        if (e.modo === 'foto') inc += eje('ArrowUp', 'ArrowDown') * 45 * dt - t.dy * .25;
        zoom *= Math.exp((zoomTecla.current * 1.2 * dt) + t.dz * .0015);
        if (inc !== e.dron.inclinacion || zoom !== e.dron.zoom) e = pasoEncuentro(e, { tipo: 'camara', inclinacion: inc, zoom }, ctx);
        e = pasoEncuentro(e, { tipo: 'tiempo', dt, mando }, ctx);
      } else mandoRef.current = { adelante: 0, lateral: 0, vertical: 0, giro: 0 };
      t.dx = 0; t.dy = 0; t.dz = 0; pulsadas.current.clear();
      if (!espectadorRef.current && e !== sRef.current) { sRef.current = e; if (e.fase !== fase || acum >= .033) { acum = 0; setS(e); } }
    };
    id = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(id);
  }, [ctx, espectadorRef]);

  // Teclado. ESPACIO se maneja aunque el foco esté en un botón: se cancela su clic y el scroll, y se dispara UNA sola vez.
  useEffect(() => {
    if (espectador) return undefined;
    const abajo = e => {
      const f = sRef.current.fase;
      if (e.code === 'Space') { if (f === 'vuelo') { e.preventDefault(); espacio.current = true; if (!e.repeat) disparar(); } return; }
      // Solo se ceden las teclas a campos de texto; el deslizador de zoom no debe «robar» el teclado del vuelo.
      if (e.target.matches?.('input:not([type=range]),select,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyP' || e.code === 'Escape') { if (f === 'vuelo' || f === 'pausa') { e.preventDefault(); if (!e.repeat) alternarPausa(); } return; }
      if (f !== 'vuelo') return;
      if (e.code === 'KeyC') { e.preventDefault(); if (!e.repeat) cambiarModo(); return; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTecla.current = 1; return; }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomTecla.current = -1; return; }
      if (TECLAS_MANDO.includes(e.code)) { e.preventDefault(); teclas.current.add(e.code); pulsadas.current.add(e.code); }
    };
    const arriba = e => {
      if (e.code === 'Space' && espacio.current) { e.preventDefault(); espacio.current = false; }
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') zoomTecla.current = 0;
      teclas.current.delete(e.code);
    };
    const perder = () => { if (espectadorRef.current) return; teclas.current.clear(); zoomTecla.current = 0; if (sRef.current.fase === 'vuelo') enviar({ tipo: 'pausar' }); };
    const ocultar = () => { if (document.hidden) perder(); };
    window.addEventListener('keydown', abajo); window.addEventListener('keyup', arriba); window.addEventListener('blur', perder); document.addEventListener('visibilitychange', ocultar);
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); window.removeEventListener('blur', perder); document.removeEventListener('visibilitychange', ocultar); };
  }, [espectador, espectadorRef, disparar, cambiarModo, alternarPausa, enviar]);
  // Rueda = zoom (sin hacer scroll de la página).
  useEffect(() => {
    const el = escenaRef.current; if (!el) return;
    const rueda = e => { e.preventDefault(); tactil.current.dz -= e.deltaY; };
    el.addEventListener('wheel', rueda, { passive: false });
    return () => el.removeEventListener('wheel', rueda);
  }, []);
  useEffect(() => { if (s.fase === 'revision') { if (s.resultado.aprobada) sonidos.exito(); else sonidos.fallo(); } }, [s.fase, s.resultado]);

  // Cierre de la etapa: vuelca el resultado en el estado de la misión (una sola vez) y avisa a la fase.
  const terminar = (accion, salida) => {
    if (cerrado.current) return;
    cerrado.current = true;
    const n = pasoEncuentro(sRef.current, accion, ctx);
    sRef.current = n; setS(n);
    setEstado(e => aplicarEncuentro(e, n));
    salida();
  };
  const reintentar = () => { setCaptura(null); enviar({ tipo: 'reintentar' }); };
  const arrastrar = e => {
    const a = arrastre.current;
    if (!a || a.id !== e.pointerId || sRef.current.fase !== 'vuelo') return;
    tactil.current.dx += e.clientX - a.x; tactil.current.dy += e.clientY - a.y; a.x = e.clientX; a.y = e.clientY;
  };
  const soltarArrastre = () => { arrastre.current = null; };

  const o = s.sitio.objetivo, d = s.dron, enVuelo = s.fase === 'vuelo' || s.fase === 'pausa', foto = s.modo === 'foto';
  const escena = useMemo(() => webgl && !['sindron', 'novuela', 'omitida'].includes(inicial.fase)
    ? <Suspense fallback={<div className="enc-cargando">{tr('e05.Encuentro.cargando')}</div>}><Encuentro3D estadoRef={sRef} mandoRef={mandoRef} disparoRef={disparoRef} alCaptura={alCaptura} cfg={cfg} /></Suspense> : null, [webgl, inicial.fase, alCaptura, cfg, tr('e05.idioma')]); // eslint-disable-line react-hooks/exhaustive-deps
  const altura = enVuelo ? d.y - alturaTerreno(cfg, s.sitio, d.x, d.z) : 0, velocidad = Math.hypot(d.vx, d.vy, d.vz);
  const expo = enVuelo && foto ? exposicionEstimada(cfg, s.sitio, camaraDron(s), s.stats) : null;
  const radiacion = s.stats.factorRadiacion > 1;
  // Objetivo y medidores en vivo (luz, enfoque, encuadre, tamaño, ángulo) = la calificación que tendría la foto ahora.
  const lectura = enVuelo ? lecturaObjetivo(cfg, s) : null, ev = lectura?.foto;
  const peor = ev && !ev.motivo ? MEDIDORES.reduce((m, k) => ev.criterios[k] < ev.criterios[m] ? k : m) : null;
  const nombreCrit = k => tr(k === 'nitidez' ? 'e05.Encuentro.enfoque' : `e05.crit.${k}`);
  const veredictoFoto = !ev ? '' : ev.motivo === 'fuera' ? tr('e05.lectura.fuera') : ev.motivo === 'equivocado' ? tr('e05.lectura.equivocado', { nombre: ev.nombreFotografiado ?? '' })
    : ev.motivo === 'tapado' ? tr('e05.lectura.tapado') : ev.aprobada ? tr('e05.lectura.lista', { t: ev.total, u: cfg.umbral }) : tr('e05.lectura.mejora', { criterio: nombreCrit(peor).toLowerCase(), t: ev.total, u: cfg.umbral });

  return <section className={`encuentro encuentro-${s.fase}`} data-fase={s.fase} data-modo={s.modo} data-intento={s.intento} data-objetivo={o.id}>
    <header className="enc-header">
      <div><span>{tr('e05.Encuentro.etapa')}</span><h1>{tr('e05.Encuentro.h1a')} <em>{tr('e05.Encuentro.h1b')}</em></h1></div>
      {lectura && <div className="enc-mision" role="status">
        <span>{tr('e05.Encuentro.debes')}</span>
        <b>🎯 {textoObjetivo(o, 'nombre')}</b>
        <small aria-label={tr('e05.Encuentro.senal_aria', { m: lectura.distancia.toFixed(0) })}>
          <i className={`enc-senal s${lectura.senal}`} aria-hidden="true"><em /><em /><em /><em /></i>{tr(`e05.Encuentro.senal${lectura.senal}`)} · {lectura.distancia.toFixed(0)} m
        </small>
      </div>}
      <div><button type="button" aria-label={s.fase === 'pausa' ? tr('e05.Encuentro.reanudar_vuelo') : tr('e05.Encuentro.pausar_vuelo')} title={tr('e05.Encuentro.pausa_titulo')} disabled={s.fase !== 'vuelo' && s.fase !== 'pausa'} onClick={alternarPausa}>{s.fase === 'pausa' ? '▶' : 'Ⅱ'}</button></div>
    </header>
    <div className="enc-escena" ref={escenaRef}>
      {escena}
      {enVuelo && <div className="enc-arrastre" onPointerDown={e => { arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={arrastrar} onPointerUp={soltarArrastre} onPointerCancel={soltarArrastre} />}
      {enVuelo && <>
        <div className="enc-hud">
          <div className="enc-panel">
            <b className="enc-modo">{foto ? tr('e05.Encuentro.modo_foto', { z: d.zoom.toFixed(1), i: Math.round(d.inclinacion) }) : tr('e05.Encuentro.modo_persecucion')}</b>
            <Bateria pct={acotar(s.bateria / s.stats.bateria_s, 0, 1)} rad={radiacion} />
            <div className="enc-datos-vuelo"><span>{tr('e05.Encuentro.altura')} <b>{altura.toFixed(0)} m</b></span><span>{tr('e05.Encuentro.vel')} <b>{velocidad.toFixed(1)} m/s</b></span></div>
            <div className="enc-intentos" aria-label={tr('e05.Encuentro.intento_aria', { i: s.intento, m: s.maxIntentos })}><span>{tr('e05.Encuentro.intentos')}</span>{Array.from({ length: s.maxIntentos }, (_, i) => <b key={i}>{i < s.maxIntentos - s.intento + 1 ? '●' : '○'}</b>)}</div>
          </div>
          <Minimapa s={s} />
        </div>
        {foto && <div className="enc-visor" aria-hidden="true">
          <i className="enc-tercio v1" /><i className="enc-tercio v2" /><i className="enc-tercio h1" /><i className="enc-tercio h2" /><i className="enc-centro" />
          <i className="enc-esq a" /><i className="enc-esq b" /><i className="enc-esq c" /><i className="enc-esq d" />
        </div>}
        {foto && expo && ev && <div className={`enc-medidor ${ev.motivo ? 'mal' : ev.aprobada ? 'lista' : 'casi'}`} role="status">
          <b>{veredictoFoto}</b>
          <div className="enc-medidas">{MEDIDORES.map(k => { const v = ev.criterios[k]; return <span key={k} className={k === peor ? 'peor' : ''}><small>{nombreCrit(k)}</small><i><em className={v >= .7 ? 'bien' : v >= .4 ? 'medio' : 'bajo'} style={{ width: `${Math.round(v * 100)}%` }} /></i></span>; })}</div>
          <small className={velocidad < .4 ? 'quieto' : ''}>{tr('e05.Encuentro.exposicion', { nivel: tr(`e05.nivel.${expo.nivel}`).toUpperCase() })} · {(expo.exposicion_s * 1000).toFixed(0)} ms · {velocidad < .4 ? tr('e05.Encuentro.estable') : tr('e05.Encuentro.moviendote')}</small>
        </div>}
        {!foto && s.fase === 'vuelo' && <p className="enc-pista">{tr('e05.Encuentro.pista')}</p>}
        {s.fase === 'vuelo' && <>
          {/* Leyenda de teclado (solo en pantallas con mouse); los controles en pantalla también funcionan con mouse/touchpad. */}
          <div className="enc-teclas" aria-hidden="true">
            {foto ? <>
              <span><kbd>←</kbd><kbd>→</kbd> {tr('e05.Encuentro.k.girar')}</span><span><kbd>↑</kbd><kbd>↓</kbd> {tr('e05.Encuentro.k.inclinar')}</span><span><kbd>+</kbd><kbd>−</kbd> {tr('e05.Encuentro.k.zoom')}</span><span><kbd>{tr('e05.Encuentro.k.espacio')}</kbd> {tr('e05.Encuentro.k.tomar')}</span><span><kbd>C</kbd> {tr('e05.Encuentro.k.volar')}</span>
            </> : <>
              <span><kbd>W</kbd><kbd>S</kbd> {tr('e05.Encuentro.k.o')} <kbd>↑</kbd><kbd>↓</kbd> {tr('e05.Encuentro.k.avanzar')}</span><span><kbd>A</kbd><kbd>D</kbd> {tr('e05.Encuentro.k.lado')}</span><span><kbd>←</kbd><kbd>→</kbd> {tr('e05.Encuentro.k.girar_arrastrar')}</span><span><kbd>E</kbd><kbd>Q</kbd> {tr('e05.Encuentro.k.subir_bajar')}</span><span><kbd>{tr('e05.Encuentro.k.espacio')}</kbd> {tr('e05.Encuentro.k.camara')}</span><span><kbd>P</kbd> {tr('e05.Encuentro.k.pausa')}</span>
            </>}
          </div>
          <div className="enc-tactil">
            <Joystick tactil={tactil} />
            <div className="enc-alt">
              <Mantener className="enc-boton" etiqueta={tr('e05.Encuentro.subir')} alAprieta={() => { tactil.current.vert = 1; }} alSuelta={() => { tactil.current.vert = 0; }}>▲</Mantener>
              <Mantener className="enc-boton" etiqueta={tr('e05.Encuentro.bajar')} alAprieta={() => { tactil.current.vert = -1; }} alSuelta={() => { tactil.current.vert = 0; }}>▼</Mantener>
            </div>
            <div className="enc-cam">
              <button type="button" className="enc-boton enc-cambiar" onClick={cambiarModo}>{foto ? '🎥' : '📷'}<small>{tr('e05.Encuentro.camara')}</small></button>
              <button type="button" className="enc-boton enc-disparo" onClick={disparar}>📸<small>{tr('e05.Encuentro.foto')}</small></button>
            </div>
            {foto && <label className="enc-zoom"><span>{tr('e05.Encuentro.zoom', { z: d.zoom.toFixed(1) })}</span><input type="range" tabIndex={-1} min="1" max={s.stats.zoomMax} step=".05" value={d.zoom} onChange={e => enviar({ tipo: 'camara', zoom: +e.target.value })} onPointerUp={e => e.currentTarget.blur()} /></label>}
          </div>
        </>}
      </>}
      {captura && s.fase === 'revision' && <div key={captura.intento} className="enc-flash" aria-hidden="true" />}

      {s.fase === 'ficha' && <div className="enc-modal"><DialogoIO titulo={tr('e05.Encuentro.ficha.titulo')} accion={tr('e05.Encuentro.ficha.accion')} alSeguir={() => enviar({ tipo: 'empezar' })}>
        <h3 className="enc-objetivo">{textoObjetivo(o, 'nombre')}</h3>
        {s.dronReserva && <p><b>{tr('e05.Encuentro.ficha.reserva')}</b> {tr('e05.Encuentro.ficha.reserva_a')}</p>}
        <p><b>{tr('e05.Encuentro.ficha.pista')}</b> {textoObjetivo(o, 'pista')}</p>
        <p><b>{tr('e05.Encuentro.ficha.dato')}</b> {textoObjetivo(o, 'dato')}</p>
        <p className="enc-variante">{tr('e05.Encuentro.ficha.variante')}</p>
        <p>{tr('e05.Encuentro.ficha.busca_a')}<b>{tr('e05.Encuentro.ficha.busca_b')}</b>{tr('e05.Encuentro.ficha.busca_c')}</p>
        <ul className="enc-criterios">
          <li><b>{tr('e05.crit.encuadre')}</b> · {tr('e05.Encuentro.ficha.c_encuadre')}</li>
          <li><b>{tr('e05.crit.tamano')}</b> · {tr('e05.Encuentro.ficha.c_tamano')}</li>
          <li><b>{tr('e05.crit.nitidez')}</b> · {tr('e05.Encuentro.ficha.c_nitidez')}</li>
          <li><b>{tr('e05.crit.luz')}</b> · {tr('e05.Encuentro.ficha.c_luz')}</li>
          <li><b>{tr('e05.crit.angulo')}</b> · {tr('e05.Encuentro.ficha.c_angulo')}</li>
        </ul>
        <p>{tr('e05.Encuentro.ficha.nec_a')}<b>{tr('e05.Encuentro.ficha.nec_b', { u: cfg.umbral })}</b>{tr('e05.Encuentro.ficha.nec_c')}<b>{tr('e05.Encuentro.ficha.nec_d')}</b>{tr('e05.Encuentro.ficha.nec_e')}</p>
        {cfg.destino === 'io' && <p className="enc-aviso">{tr('e05.Encuentro.ficha.io')} {radiacion ? tr('e05.Encuentro.ficha.io_rad') : tr('e05.Encuentro.ficha.io_blindaje')}</p>}
        <p className="enc-controles"><b>{tr('e05.Encuentro.ficha.teclado')}</b> {tr('e05.Encuentro.ficha.teclado_a')}<br /><b>{tr('e05.Encuentro.ficha.mouse')}</b> {tr('e05.Encuentro.ficha.mouse_a')}</p>
      </DialogoIO></div>}

      {s.fase === 'pausa' && <div className="enc-modal"><DialogoIO titulo={tr('e05.Encuentro.pausa_t')} accion={tr('e05.Encuentro.pausa_accion')} alSeguir={() => enviar({ tipo: 'reanudar' })}>
        <p>{tr('e05.Encuentro.pausa_a')}<b>{textoObjetivo(o, 'corto')}</b>{tr('e05.Encuentro.pausa_b', { i: s.intento, m: s.maxIntentos })}</p></DialogoIO></div>}

      {s.fase === 'revision' && <div className="enc-modal enc-modal-revision"><Revision s={s} cfg={cfg} captura={captura}
        alContinuar={() => terminar({ tipo: 'continuar' }, alTerminar)} alReintentar={reintentar} alInforme={() => terminar({ tipo: 'continuar' }, alPerder)} /></div>}

      {(s.fase === 'sindron' || s.fase === 'novuela') && <div className="enc-modal"><DialogoIO alerta titulo={webgl ? (s.fase === 'sindron' ? tr('e05.Encuentro.vacia') : tr('e05.Encuentro.no_despega')) : tr('e05.Encuentro.no_3d')} accion={tr('e05.Encuentro.sin_foto')} alSeguir={() => terminar({ tipo: 'saltar' }, alTerminar)}>
        <p>{s.motivo}</p><p>{tr('e05.Encuentro.sigue')}</p></DialogoIO></div>}
    </div>
  </section>;
}

// Tarjeta de revisión: la foto capturada, el total, los cinco criterios, el consejo de IO y los botones.
function Revision({ s, cfg, captura, alContinuar, alReintentar, alInforme }) {
  const tr = useT(), r = s.resultado, o = s.sitio.objetivo, ultima = s.intento >= s.maxIntentos, restantes = s.maxIntentos - s.intento;
  const titulo = r.motivo === 'equivocado' ? tr('e05.Encuentro.fotografiaste', { nombre: r.nombreFotografiado }) : r.motivo ? tr(`e05.titulo_motivo.${r.motivo}`) : r.aprobada ? tr('e05.Encuentro.buena_foto') : tr('e05.Encuentro.foto_reprobada');
  return <article className={`enc-tarjeta ${r.aprobada ? 'ok' : 'mal'}`} aria-label={tr('e05.Encuentro.resultado_aria')}>
    <div className="enc-foto">
      {captura?.url && !r.motivo?.match(/^(choque|bateria)$/) ? <img src={captura.url} alt={tr('e05.Encuentro.foto_alt')} /> : <div className="enc-sinfoto"><span aria-hidden="true">{ICONO_MOTIVO[r.motivo] || '📷'}</span></div>}
      <span className="enc-sello">{r.aprobada ? tr('e05.Encuentro.sello_ok') : tr('e05.Encuentro.sello_mal')}</span>
    </div>
    <div className="enc-datos">
      <span className="enc-kicker">{tr('e05.Encuentro.intento_de', { i: s.intento, m: s.maxIntentos })}</span>
      <h2>{titulo}</h2>
      <div className="enc-total"><strong>{r.total}</strong><span>/100</span><em>{r.aprobada ? tr('e05.Encuentro.aprobada') : tr('e05.Encuentro.reprobada')} · {tr('e05.Encuentro.umbral', { u: cfg.umbral })}</em></div>
      {!r.motivo && <div className="enc-criterios-barras">{CRITERIOS.map(k => <div key={k} className="enc-crit"><span>{tr(`e05.crit.${k}`)}</span><div className="enc-barra"><i style={{ width: `${Math.round(r.criterios[k] * 100)}%` }} /></div><b>{Math.round(r.criterios[k] * 100)}</b></div>)}</div>}
      <p className="enc-io"><b>IO:</b> {r.consejo}</p>
      {r.aprobada && <p className="enc-dato">{textoObjetivo(o, 'dato')}</p>}
      {r.aprobada && <button type="button" className="primario" onClick={alContinuar}>{tr('e05.Encuentro.continuar06')} <span>→</span></button>}
      {!r.aprobada && !ultima && <><button type="button" className="primario" onClick={alReintentar}>{tr('e05.Encuentro.reintentar')} <span>↻</span></button><p className="enc-costo">{tr('e05.Encuentro.reintento_costo', { n: restantes, intentos: restantes === 1 ? tr('e05.Encuentro.intento_s') : tr('e05.Encuentro.intentos_pl') })}</p></>}
      {!r.aprobada && ultima && <><button type="button" className="primario" onClick={alInforme}>{tr('e05.Encuentro.ver_informe')} <span>→</span></button><p className="enc-costo">{tr('e05.Encuentro.tres_reprobadas')}</p></>}
    </div>
  </article>;
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearSonda } from '../sondas/modelos.js';
import { DATOS_SONDAS, COLOR_SONDA, datosSonda, nombreCortoSonda } from '../sondas/datos.js';
import { cantidadDrones, tiposDrones } from '../motor/drones.js';
import { useIdioma, useT } from '../i18n/idioma.js';
import './taller-sondas.css';

const TIPOS = Object.keys(DATOS_SONDAS);

// Visor de UNA sonda: un solo renderer, liberado al desmontar (el hangar ya tiene su propia escena 3D).
function Visor({ tipo, alFallo }) {
  const host = useRef(null), api = useRef(null);
  useEffect(() => {
    const el = host.current;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch { alFallo(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.6;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(36, 1, .01, 100); camera.position.set(2.2, 1.6, 2.7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1.4; controls.maxDistance = 6;
    controls.autoRotate = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 1.1;
    scene.add(new T.HemisphereLight('#d0eaff', '#353347', 2));
    for (const [color, power, pos] of [['#fff1dc', 5, [3, 5, 3]], ['#689fff', 4, [-3, 2, -2]], ['#ffffff', 3, [0, 3, -4]]]) { const luz = new T.DirectionalLight(color, power); luz.position.set(...pos); scene.add(luz); }
    let model = null;
    api.current = { cambiar(id) {
      if (model) { scene.remove(model.objeto); model.liberar(); model = null; }
      try { model = crearSonda(id); } catch { return; }
      model.desplegar?.(1); scene.add(model.objeto); controls.target.set(0, id === 'M3' ? .25 : .06, 0);
    } };
    api.current.cambiar(tipoInicial.current);
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => { observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); model?.liberar(); renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove(); api.current = null; };
  }, [alFallo]);
  const tipoInicial = useRef(tipo);
  tipoInicial.current = tipo;
  useEffect(() => { api.current?.cambiar(tipo); }, [tipo]);
  return <div ref={host} className="ts-visor" />;
}

/** Modal «Taller de sondas»: ve las sondas ASTRION-M de una en una y elige cuál va en cada casilla de la bahía. */
export default function TallerSondas({ diseno, setDiseno, mision, alCerrar }) {
  const t = useT(), [idioma] = useIdioma();
  const n = cantidadDrones(diseno), actuales = tiposDrones(mision || { id: 'lro' }, diseno);
  const [i, setI] = useState(() => Math.max(0, TIPOS.indexOf(actuales[0]))), [fallo, setFallo] = useState(false);
  const tipo = TIPOS[i], d = datosSonda(tipo, idioma), cerrar = useRef(null);
  const sinWebgl = useRef(() => setFallo(true));
  const ponerEn = (c, k) => setDiseno(x => { const base = tiposDrones(mision || { id: 'lro' }, x); return { ...x, sondas: base.map((v, j) => j === c ? k : v) }; });
  const poner = c => ponerEn(c, tipo);
  // Arrastrar una sonda del catálogo a una casilla (ratón y táctil, con pointer events). Tocar sin arrastrar solo la muestra.
  const [arrastre, setArrastre] = useState(null);
  const inicio = useRef(null);
  const agarrar = (e, k) => { setI(TIPOS.indexOf(k)); inicio.current = { k, x: e.clientX, y: e.clientY, id: e.pointerId }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const mover = e => { const a = inicio.current; if (!a || a.id !== e.pointerId) return; if (arrastre || Math.hypot(e.clientX - a.x, e.clientY - a.y) > 6) setArrastre({ k: a.k, x: e.clientX, y: e.clientY }); };
  const soltar = e => {
    const a = inicio.current; inicio.current = null;
    if (a && arrastre) { const destino = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-casilla]'); if (destino) ponerEn(Number(destino.dataset.casilla), a.k); }
    setArrastre(null);
  };
  useEffect(() => {
    cerrar.current?.focus();
    const tecla = e => {
      if (e.key === 'Escape') alCerrar();
      else if (e.key === 'ArrowLeft') setI(v => (v + TIPOS.length - 1) % TIPOS.length);
      else if (e.key === 'ArrowRight') setI(v => (v + 1) % TIPOS.length);
    };
    window.addEventListener('keydown', tecla); return () => window.removeEventListener('keydown', tecla);
  }, [alCerrar]);
  const ir = k => setI(v => (v + k + TIPOS.length) % TIPOS.length);
  return createPortal(<div className="ts-fondo" onClick={e => { if (e.target === e.currentTarget) alCerrar(); }}>
    <section className="ts-modal" role="dialog" aria-modal="true" aria-label={t('hangar.sondas.titulo')}>
      <header><div><span>{t('hangar.sondas.familia')}</span><h2>{t('hangar.sondas.titulo')}</h2></div><button ref={cerrar} className="ts-x" onClick={alCerrar} aria-label={t('hangar.sondas.cerrar')}>×</button></header>
      <div className="ts-cuerpo">
        <div className="ts-escena" style={{ '--c': COLOR_SONDA[tipo] }}>
          {fallo ? <p className="ts-fallo">{t('hangar.sondas.sin3d')}</p> : <Visor tipo={tipo} alFallo={sinWebgl.current} />}
          <button className="ts-flecha ts-ant" onClick={() => ir(-1)} aria-label={t('hangar.sondas.anterior')}>‹</button>
          <button className="ts-flecha ts-sig" onClick={() => ir(1)} aria-label={t('hangar.sondas.siguiente')}>›</button>
          <span className="ts-pos">{i + 1} / {TIPOS.length}</span>
        </div>
        <div className="ts-info" style={{ '--c': COLOR_SONDA[tipo] }}>
          <h3><b>{tipo}</b> {d.nombre}</h3>
          <p>{d.texto}</p>
          <dl><div><dt>{t('hangar.sondas.uso')}</dt><dd>{d.uso}</dd></div><div><dt>{t('hangar.sondas.masa')}</dt><dd>{d.masa}</dd></div></dl>
        </div>
      </div>
      <div className="ts-bahia">
        <strong>{n ? t('hangar.sondas.elige', { tipo }) : t('hangar.sondas.sinDrones')}</strong>
        {n > 0 && <div className="ts-catalogo" aria-label={t('hangar.sondas.catalogo')}>{TIPOS.map(k => (
          <button key={k} type="button" className={`ts-ficha ${k === tipo ? 'vista' : ''}`} style={{ '--c': COLOR_SONDA[k] }}
            onPointerDown={e => agarrar(e, k)} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => { inicio.current = null; setArrastre(null); }}>
            <b>{k}</b><span>{nombreCortoSonda(k, idioma)}</span>
          </button>))}</div>}
        {n > 0 && <ul aria-label={t('hangar.sondas.casillas')}>{actuales.slice(0, n).map((k, c) => <li key={c}><button data-casilla={c} className={arrastre ? 'soltar' : ''} aria-pressed={k === tipo} style={{ '--c': COLOR_SONDA[k] }} onClick={() => poner(c)} aria-label={t('hangar.sondas.poner', { tipo, n: c + 1 })}><small>{t('hangar.sondas.casilla', { n: c + 1 })}</small><b>{k}</b><span>{nombreCortoSonda(k, idioma)}</span></button></li>)}</ul>}
      </div>
      {arrastre && <div className="ts-fantasma" style={{ left: arrastre.x, top: arrastre.y, '--c': COLOR_SONDA[arrastre.k] }} aria-hidden="true"><b>{arrastre.k}</b></div>}
      <footer><button className="ts-listo" onClick={alCerrar}>{t('hangar.sondas.listo')}</button></footer>
    </section>
  </div>, document.body);
}

import { useT } from '../i18n/idioma.js';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { crearSonda } from '../sondas/modelos.js';
import { DATOS_SONDAS, COLOR_SONDA } from '../sondas/datos.js';
import { aporteDron } from '../motor/drones.js';

// Duración del despliegue animado al lanzar (segundos).
const DURACION = .8;
// Tarjeta de la bahía: visor 3D pequeño del dron ACTUAL. Plegado al apuntar; se despliega al lanzar.
export default function DronBahia3D({ tipo, mision, lanzado }) {
  const t = useT();
  const host = useRef(null), api = useRef(null), meta = useRef(lanzado ? 1 : 0), [fallo, setFallo] = useState(false);
  useEffect(() => {
    const el = host.current;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFallo(true); return; }
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.6;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(36, 1, .01, 100); camera.position.set(2.5, 1.8, 3);
    scene.add(new T.HemisphereLight('#d0eaff', '#353347', 2));
    for (const [color, power, pos] of [['#fff1dc', 5, [3, 5, 3]], ['#689fff', 4, [-3, 2, -2]], ['#ffffff', 3, [0, 3, -4]]]) { const luz = new T.DirectionalLight(color, power); luz.position.set(...pos); scene.add(luz); }
    let model = null, t = meta.current, id = 0, antes = performance.now();
    api.current = {
      cambiar(tipoNuevo) {
        if (model) { scene.remove(model.objeto); model.liberar(); model = null; }
        try { model = crearSonda(tipoNuevo); } catch { return; }
        // Cámara más cerca que en el visor: la tarjeta es baja y ancha; M3 (paracaídas) necesita más altura.
        if (tipoNuevo === 'M3') camera.position.set(2.1, 1.5, 2.5); else camera.position.set(1.45, 1.0, 1.75);
        scene.add(model.objeto); camera.lookAt(0, tipoNuevo === 'M3' ? .25 : .06, 0);
        t = meta.current; model.desplegar(t);
      }
    };
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    const bucle = () => {
      id = requestAnimationFrame(bucle);
      const ahora = performance.now(), dt = Math.min(.1, (ahora - antes) / 1000); antes = ahora;
      if (model) {
        if (t !== meta.current) { t = meta.current > t ? Math.min(meta.current, t + dt / DURACION) : Math.max(meta.current, t - dt / DURACION); model.desplegar(t); }
        if (!reducido) model.objeto.rotation.y += dt * .5;
      }
      renderer.render(scene, camera);
    };
    bucle();
    return () => {
      cancelAnimationFrame(id); observer.disconnect();
      if (model) { scene.remove(model.objeto); model.liberar(); model = null; }
      renderer.dispose(); renderer.domElement.remove(); api.current = null;
    };
  }, []);
  useEffect(() => { meta.current = lanzado ? 1 : 0; }, [lanzado]);
  useEffect(() => { api.current?.cambiar(tipo); }, [tipo]);
  const d = DATOS_SONDAS[tipo], color = COLOR_SONDA[tipo];
  return <div className="dron-bahia" style={{ '--c': color }}>
    <div className="dron-bahia-visor" aria-hidden="true"><div ref={host} className="dron-bahia-canvas"/>{fallo && <div className="dron-bahia-icono"><svg viewBox="-10 -10 20 20"><path d="M0-8 8 0 0 8-8 0Z" fill="none" stroke={color} strokeWidth="1.2"/><circle r="2.6" fill={color}/></svg></div>}</div>
    <div className="dron-bahia-texto"><b>ASTRION-{tipo} · {t(`e04.sonda.${tipo}.nombre`, null, d.nombre)}</b><span>{t(`e04.sonda.${tipo}.uso`, null, d.uso)}</span><small>{aporteDron(mision, tipo)}</small></div>
  </div>;
}

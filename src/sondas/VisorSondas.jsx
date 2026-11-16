import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { crearSonda } from './modelos.js';
import { DATOS_SONDAS as DATOS } from './datos.js';
import './sondas.css';


export default function VisorSondas() {
  const host = useRef(null), api = useRef(null);
  const [tipo, setTipo] = useState('M1'), [despliegue, setDespliegue] = useState(100);
  const [rotar, setRotar] = useState(true), [malla, setMalla] = useState(false), [mensaje, setMensaje] = useState('');
  useEffect(() => {
    const el = host.current;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setMensaje('No se pudo iniciar WebGL. Prueba un navegador con aceleración gráfica.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.6;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(36, 1, .01, 100); camera.position.set(2.5, 1.8, 3);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 1.2; controls.maxDistance = 7; controls.autoRotateSpeed = .7;
    scene.add(new T.HemisphereLight('#d0eaff', '#353347', 2));
    for (const [color, power, pos] of [['#fff1dc', 5, [3, 5, 3]], ['#689fff', 4, [-3, 2, -2]], ['#ffffff', 3, [0, 3, -4]]]) {
      const light = new T.DirectionalLight(color, power); light.position.set(...pos); scene.add(light);
    }
    const grid = new T.GridHelper(8, 40, '#304b60', '#182b3b'); grid.position.y = -.86; scene.add(grid);
    let model;
    api.current = {
      cambiar(id) { if (model) { scene.remove(model.objeto); model.liberar(); } model = crearSonda(id); scene.add(model.objeto); controls.target.set(0, id === 'M3' ? .25 : .06, 0); },
      ajustar(t, giro, wire) { model?.desplegar(t / 100); controls.autoRotate = giro; model?.objeto.traverse(o => { if (o.material) o.material.wireframe = wire; }); },
      async exportar() {
        // Exportar siempre materiales sólidos; conserva el despliegue elegido.
        const copy = model.objeto.clone(true); copy.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.wireframe = false; } });
        try {
          const data = await new GLTFExporter().parseAsync(copy, { binary: true });
          const url = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
          const a = document.createElement('a'); a.href = url; a.download = `${model.objeto.name}.glb`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } finally { copy.traverse(o => o.material?.dispose()); }
      },
    };
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => { observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); model?.liberar(); grid.geometry.dispose(); grid.material.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); api.current = null; };
  }, []);
  useEffect(() => { api.current?.cambiar(tipo); }, [tipo]);
  useEffect(() => { api.current?.ajustar(despliegue, rotar, malla); }, [tipo, despliegue, rotar, malla]);
  const d = DATOS[tipo];
  return <main className="sondas-app">
    <header className="sondas-header"><a href="?">ODISEA GALÁCTICA <span>/ LABORATORIO</span></a><span className="sondas-status">● DISEÑO CONCEPTUAL / 01</span></header>
    <section className="sondas-titulo"><p>SISTEMAS DE EXPLORACIÓN REMOTA</p><h1>Pequeñas sondas.<br /><em>Grandes descubrimientos.</em></h1><span>Familia ASTRION-M / Estudio de modelos 3D</span></section>
    <div className="sondas-layout"><section className="sondas-escena" aria-label="Vista interactiva del modelo 3D">
      <div ref={host} className="sondas-canvas" /><div className="sondas-etiqueta">ASTRION-{tipo}<small>MODELO {Object.keys(DATOS).indexOf(tipo) + 1} / {Object.keys(DATOS).length}</small></div>
      <div className="sondas-vista">PERSPECTIVA LIBRE <span>Arrastra para orbitar · Rueda para acercar</span></div>
    </section><aside className="sondas-panel">
        <nav aria-label="Seleccionar sonda">{Object.keys(DATOS).map(id => <button key={id} className={tipo === id ? 'activa' : ''} aria-pressed={tipo === id} onClick={() => setTipo(id)}>{id}</button>)}</nav>
        <p className="sondas-kicker">ASTRION-{tipo}</p><h2>{d.nombre}</h2><p>{d.texto}</p>
        <dl><div><dt>Misión</dt><dd>{d.uso}</dd></div><div><dt>Masa de referencia</dt><dd>{d.masa}</dd></div><div><dt>Autonomía de referencia</dt><dd>{d.autonomia}</dd></div></dl>
        <p className="sondas-piezas">{d.piezas}</p>
        <label className="sondas-slider">Despliegue <strong>{despliegue}%</strong><input aria-label="Despliegue" type="range" min="0" max="100" value={despliegue} onChange={e => setDespliegue(Number(e.target.value))} /></label>
        <div className="sondas-opciones"><label><input type="checkbox" checked={rotar} onChange={e => setRotar(e.target.checked)} /> Giro automático</label><label><input type="checkbox" checked={malla} onChange={e => setMalla(e.target.checked)} /> Ver malla</label></div>
        <button className="sondas-exportar" onClick={async () => { try { await api.current?.exportar(); setMensaje('Modelo GLB exportado.'); } catch { setMensaje('No se pudo exportar el modelo.'); } }}>Descargar modelo .GLB ↗</button>
        <p role="status">{mensaje}</p>
      </aside></div>
    <footer>01 — GEOMETRÍA 3D REAL <span>Escala provisional en metros · M1–M3 basadas en referencia; M4–M8 conceptuales · Sin física validada</span></footer>
  </main>;
}

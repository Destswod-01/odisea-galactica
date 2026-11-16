import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calcularPagoPilotaje, crearPilotaje, NIVELES_PILOTAJE, pasoPilotaje } from '../motor/pilotajeTierra.js';
import { useT } from '../i18n/idioma.js';
import './pilotaje-tierra.css';
const TECLAS = { KeyW: 'arriba', ArrowUp: 'arriba', KeyS: 'abajo', ArrowDown: 'abajo', KeyA: 'izq', ArrowLeft: 'izq', KeyD: 'der', ArrowRight: 'der' };
export default function PilotajeTierra({ alTerminar, alSalir }) {
  const t = useT();
  const [dificultad, setDificultad] = useState('novato');
  const cfg = useMemo(() => NIVELES_PILOTAJE[dificultad], [dificultad]);
  const [fase, setFase] = useState('listo');
  const simulacion = useRef(null), teclas = useRef(new Set()), dedos = useRef(new Map()), cobrado = useRef(false);
  const [vista, setVista] = useState(() => crearPilotaje('novato'));
  const limpiar = useCallback(() => { teclas.current.clear(); dedos.current.clear(); }, []);
  const pausar = useCallback(() => { limpiar(); setFase(f => f === 'vuelo' ? 'pausa' : f); }, [limpiar]);
  useEffect(() => {
    const bajar = e => {
      if (fase !== 'vuelo') return;
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); pausar(); return; }
      if (TECLAS[e.code]) { e.preventDefault(); teclas.current.add(e.code); }
    };
    const subir = e => teclas.current.delete(e.code);
    const ocultar = () => { if (document.hidden) pausar(); };
    window.addEventListener('keydown', bajar); window.addEventListener('keyup', subir);
    window.addEventListener('blur', pausar); document.addEventListener('visibilitychange', ocultar);
    return () => { window.removeEventListener('keydown', bajar); window.removeEventListener('keyup', subir); window.removeEventListener('blur', pausar); document.removeEventListener('visibilitychange', ocultar); limpiar(); };
  }, [fase, pausar, limpiar]);
  useEffect(() => {
    if (fase !== 'vuelo') return;
    let frame, anterior = performance.now(), hud = 0;
    const tick = ahora => {
      const entrada = {};
      for (const k of teclas.current) entrada[TECLAS[k]] = true;
      for (const dir of dedos.current.values()) entrada[dir] = true;
      const s = pasoPilotaje(simulacion.current, entrada, (ahora - anterior) / 1000, dificultad);
      anterior = ahora;
      if (ahora - hud >= 32 || s.terminado) { setVista({ ...s }); hud = ahora; }
      if (s.terminado) { limpiar(); setFase('resultado'); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fase, dificultad, limpiar]);
  const iniciar = () => { limpiar(); cobrado.current = false; simulacion.current = crearPilotaje(dificultad); setVista({ ...simulacion.current }); setFase('vuelo'); };
  const resultado = { tipo: 'pilotaje', dificultad, aciertos: vista.aciertos, total: cfg.total };
  const pago = calcularPagoPilotaje(resultado);
  const cobrar = () => { if (fase !== 'resultado' || cobrado.current) return; cobrado.current = true; alTerminar(resultado); };
  const soltar = e => dedos.current.delete(e.pointerId);
  const objetivo = vista.ruta[vista.indice];
  const dx = objetivo ? objetivo.x - vista.x : 0, dy = objetivo ? objetivo.y - vista.y : 0;
  return <section className="pilotaje-tierra" aria-label={t('pilotaje.titulo')}>
    <header className="pt-cabecera"><div><small>{t('pilotaje.escuela')}</small><h2>{t('pilotaje.titulo')}</h2></div><button onClick={alSalir}>{t('pilotaje.salir')}</button></header>
    {fase === 'listo' ? <div className="pt-preparar"><h3>{t('pilotaje.reto')}</h3><p>{t('pilotaje.instrucciones')}</p><div className="pt-niveles" role="group" aria-label={t('pilotaje.dificultad')}>{Object.entries(NIVELES_PILOTAJE).map(([id, nivel]) => <button key={id} aria-pressed={dificultad === id} onClick={() => setDificultad(id)}><strong>{t(`pilotaje.${id}`)}</strong><span>{t('pilotaje.premio', {n: nivel.premio})}</span><small>{t('pilotaje.aros', {n: nivel.total})}</small></button>)}</div><p>{t('pilotaje.pago')}</p><button className="primario" onClick={iniciar}>{t('pilotaje.iniciar')}</button></div> : <>
      <div className="pt-hud"><strong>{t(`pilotaje.${dificultad}`)}</strong><span>{t('pilotaje.progreso', {n: vista.indice, total: cfg.total})}</span><span>{t('pilotaje.aciertos', {n: vista.aciertos})}</span><button onClick={pausar} disabled={fase !== 'vuelo'}>{t('pilotaje.pausa')}</button></div>
      <div className="pt-vuelo">
        <svg viewBox="0 0 800 450" role="img" aria-label={t('pilotaje.paisaje')}>
          <defs><linearGradient id="pt-cielo" x2="0" y2="1"><stop stopColor="#124c80"/><stop offset="1" stopColor="#b7e4f0"/></linearGradient><linearGradient id="pt-mar" x2="0" y2="1"><stop stopColor="#218b9b"/><stop offset="1" stopColor="#123d5a"/></linearGradient></defs>
          <rect width="800" height="450" fill="url(#pt-cielo)"/><circle cx="650" cy="65" r="24" fill="#fff5c7"/>
          <path d="M0 245L90 165 140 220 240 145 340 240 450 175 540 225 620 150 710 210 800 170V450H0Z" fill="#6c9389"/>
          <path d="M0 275Q200 250 400 275T800 275V450H0Z" fill="url(#pt-mar)"/>
          <path d="M0 270L160 290 270 450H0ZM800 270L650 285 530 450H800Z" fill="#386b50"/>
          {[0,1,2,3,4].map(i => <path key={i} d={`M${320-i*48} 450L400 270L${480+i*48} 450`} fill="none" stroke="#b4f1ef" opacity=".1"/>)}
          {vista.ruta.slice(vista.indice, vista.indice + 5).reverse().map((aro, i) => {
            const z = Math.max(0, aro.z - vista.distancia), escala = 600 / (z + 24);
            return <g key={aro.z} opacity={Math.max(.25, 1-z/330)}><circle cx={400+(aro.x-vista.x)*escala} cy={210-(aro.y-vista.y)*escala} r={cfg.radio*escala} fill="none" stroke={i === Math.min(4, vista.ruta.length-vista.indice-1) ? '#fff0a0' : '#82f9eb'} strokeWidth="4"/><circle cx={400+(aro.x-vista.x)*escala} cy={210-(aro.y-vista.y)*escala} r="2" fill="white"/></g>;
          })}
          <path d="M379 210H393M407 210H421M400 189V203M400 217V231" stroke="white" strokeWidth="2"/><circle cx="400" cy="210" r="3" fill="white"/>
          <path d="M0 420L200 410 310 436H490L600 410 800 420V450H0" fill="#102431" stroke="#6d9baf"/>
        </svg>
        {fase === 'vuelo' && <div className="pt-guia"><strong>{Math.hypot(dx,dy)<=cfg.radio ? t('pilotaje.alineado') : `${dy>.6?'↑':dy<-.6?'↓':''}${dx>.6?' →':dx<-.6?' ←':''}`}</strong><span>{t('pilotaje.cruce', {n: objetivo ? Math.max(0,(objetivo.z-vista.distancia)/cfg.velocidad).toFixed(1) : '0.0'})}</span></div>}
        {fase === 'pausa' && <div className="pt-overlay"><h3>{t('pilotaje.pausado')}</h3><button className="primario" onClick={() => setFase('vuelo')}>{t('pilotaje.reanudar')}</button></div>}
        {fase === 'resultado' && <div className="pt-overlay"><h3>{t('pilotaje.completado')}</h3><p>{t('pilotaje.resumen', {n:vista.aciertos,total:cfg.total})}</p><strong className="pt-dinero">+{pago} M</strong><button className="primario" onClick={cobrar}>{t('pilotaje.cobrar')}</button></div>}
      </div>
      <div className="pt-feedback" role="status">{vista.ultimo ? t(vista.ultimo.ok ? 'pilotaje.acierto' : 'pilotaje.fallo') : t('pilotaje.controles')}</div>
      <div className="pt-pad" role="group" aria-label={t('pilotaje.tactil')}>{[['izq','←'],['arriba','↑'],['abajo','↓'],['der','→']].map(([dir, signo]) => <button key={dir} disabled={fase !== 'vuelo'} aria-label={t(`pilotaje.${dir}`)} onPointerDown={e => {e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);dedos.current.set(e.pointerId,dir);}} onPointerUp={soltar} onPointerCancel={soltar} onLostPointerCapture={soltar}>{signo}</button>)}</div>
    </>}
  </section>;
}

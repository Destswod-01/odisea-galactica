import { useT } from '../i18n/idioma.js';
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useEspejo } from '../red/espejo.js';
import { configurarDrones, crearDrones, pasoDrones, previsionCorta, largoPrevision, zonaImpulso, anchoZona, objetivoDron, costoDron, margenDrones, aplicarDrones, posicionDronOrbital, tiposDrones, FUERZA_MIN, FUERZA_MAX, FUERZA_REFERENCIA } from '../motor/drones.js';
import DialogoIO from '../componentes/DialogoIO.jsx';
import { sonidos } from '../sonido.js';
import { COLOR_SONDA } from '../sondas/datos.js';
import './drones.css';
// La bahía 3D carga three y los modelos aparte para no inflar la carga inicial.
const DronBahia3D = lazy(() => import('./DronBahia3D.jsx'));
const MARCAS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], pct = f => `${(Math.max(FUERZA_MIN, Math.min(FUERZA_MAX, f)) - FUERZA_MIN) / (FUERZA_MAX - FUERZA_MIN) * 100}%`;
// Tramo corto de la previsión: trozos punteados cuya opacidad baja hacia la punta, sin perderse (mínimo 35 %).
const trozos = camino => { const n = Math.max(1, Math.ceil((camino.length - 1) / 5)); return Array.from({ length: n }, (_, i) => ({ pts: camino.slice(i * 5, i * 5 + 6), op: .65 * (1 - i / n) ** 1.2 + .35 })); };
const puntos = camino => camino.map(([x, y]) => `${x},${-y}`).join(' ');
// Casco octagonal de ASTRION-X (radio .62) y su contorno.
const OCTAGONO = Array.from({ length: 8 }, (_, i) => { const t = (22.5 + i * 45) * Math.PI / 180; return `${(.62 * Math.cos(t)).toFixed(3)},${(.62 * Math.sin(t)).toFixed(3)}`; }).join(' ');
// ASTRION-X vista desde arriba: casco claro, núcleo acento #38bdf8, 4 alas solares en X y detalles #f59e0b.
function NaveMadre({ x, y, giro, activa }) { return <g transform={`translate(${x},${-y}) rotate(${giro})`} className="nodriza-figura">{[45, 135, 225, 315].map(r => <g key={r} transform={`rotate(${r})`}><rect x=".5" y="-.36" width="1.3" height=".72" rx=".05" fill="#12396f" stroke="#6fb3ff" strokeWidth=".06"/><path d="M.95-.36v.72M1.35-.36v.72M.5 0h1.3" stroke="#3f7bc4" strokeWidth=".035"/><rect x=".5" y="-.09" width=".12" height=".18" fill="#f59e0b"/></g>)}<polygon points={OCTAGONO} fill="#e3ebf2" stroke="#ffffff" strokeWidth=".06"/><polygon points={OCTAGONO} fill="none" stroke="#9fb3c4" strokeWidth=".04" transform="scale(.72)"/><circle r=".24" fill="#38bdf8" stroke="#bfeaff" strokeWidth=".05"/><circle r=".1" fill="#effbff"/><rect x="-.2" y="-.6" width=".4" height=".09" rx=".03" fill="#f59e0b"/><path d="M-.3.6h.6l-.1.2h-.4Z" fill="#f59e0b"/>{activa && <path d="M-.2.85 0 1.8l.2-.95Z" fill="#8cf2ff" className="dron-pluma"/>}</g>; }
// Glifo pequeño de un dron con el color y la etiqueta de su tipo (M1, M2…).
function GlifoDron({ tipo, x, y, orbital, estado }) { const c = COLOR_SONDA[tipo] || '#8cf2ff'; return <g transform={`translate(${x},${-y})`}>{orbital && <><circle r=".55" fill={c} opacity=".18"/><circle r=".3" fill={c} opacity=".3"/></>}{estado === 'impacto' && <circle r=".65" fill="none" stroke="#ffb27c" strokeWidth=".15" strokeDasharray=".2 .2"/>}<path d="M0-.28.25 0 0 .28-.25 0Z" fill={estado === 'impacto' ? '#ff8b9f' : c} stroke="#f2ffff" strokeWidth=".06"/><text y="-.45" textAnchor="middle" fontSize=".4" fontFamily="monospace" fill={c} stroke="#041224" strokeWidth=".08" paintOrder="stroke">{tipo}</text></g>; }
export default function Drones({ mision, diseno, estado, setEstado, alTerminar, alHangar }) {
  const t = useT();
  const cfg = useMemo(() => configurarDrones(mision), [mision]), ctx = useMemo(() => ({ mision }), [mision]);
  const [s, setS] = useState(() => crearDrones(estado, diseno)), [ayuda, setAyuda] = useState(false);
  // Espejo en línea: el piloto manda su estado y los demás lo ven en vivo (sin reloj propio, sin teclas ni apuntado).
  const { espectador } = useEspejo({ fase: 'crucero', s, setS });
  const aplicado = useRef(false), mapa = useRef(null), drag = useRef(null);
  const tipos = useMemo(() => tiposDrones(mision, diseno), [mision, diseno]), tipoActual = tipos[Math.min(s.indice, tipos.length - 1)];
  const enviar = useCallback(a => setS(n => pasoDrones(n, a, ctx)), [ctx]);
  const activo = ['vuelo', 'avance'].includes(s.fase);
  const largo = largoPrevision(mision, s.indice), prevista = useMemo(() => trozos(previsionCorta(cfg, s.indice, s.angulo, FUERZA_REFERENCIA, largo)), [cfg, s.indice, s.angulo, largo]);
  // El aviso «no hay impulso» usa el ángulo diferido: arrastrar no espera al cálculo (zonaImpulso además memoriza).
  const anguloDif = useDeferredValue(s.angulo);
  const zonaAngulo = useMemo(() => s.fase === 'plan' && s.subfase === 'angulo' && s.disponibles > 0 ? zonaImpulso(cfg, s.indice, anguloDif) : true, [cfg, s.fase, s.subfase, s.indice, anguloDif, s.disponibles]);
  const ancho = anchoZona(mision, s.indice), impulso = s.subfase === 'impulso', corre = ['vuelo', 'avance', 'plan'].includes(s.fase);
  const margen = margenDrones(s, mision), costo = costoDron(impulso ? s.barra : s.fuerza), puedeLanzar = s.fase === 'plan' && s.disponibles > 0 && margen >= costoDron(FUERZA_MIN) && s.bateria >= s.bateriaMax * .015;
  useEffect(() => { if (!corre || espectador) return; let antes = performance.now(); const id = setInterval(() => { const ahora = performance.now(); enviar({ tipo: 'tiempo', dt: (ahora - antes) / 1000 }); antes = ahora; }, 40); return () => clearInterval(id); }, [corre, espectador, enviar]);
  useEffect(() => {
    if (espectador) return undefined;
    const pausa = () => enviar({ tipo: 'pausar' }), ocultar = () => { if (document.hidden) pausa(); };
    // Espacio actúa aunque el foco esté en un botón del juego: se cancela su comportamiento nativo (clic y scroll) y se envía UNA sola acción.
    const tecla = e => {
      if (e.code === 'Space' && s.fase === 'plan' && !ayuda) { e.preventDefault(); if (!e.repeat && (puedeLanzar || impulso)) enviar({ tipo: 'espacio' }); return; }
      if (e.target.matches?.('input,select,textarea,button') || e.repeat) return;
      if (e.code === 'Escape' && s.fase === 'plan' && impulso) { e.preventDefault(); enviar({ tipo: 'cambiarAngulo' }); return; }
      if (['Escape', 'KeyP'].includes(e.code)) { e.preventDefault(); pausa(); }
      if (s.fase !== 'plan' || ayuda || impulso) return;
      if (['ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); enviar({ tipo: 'ajustar', angulo: s.angulo + (e.code === 'ArrowRight' ? 2 : -2) }); }
    }, soltar = e => { if (e.code === 'Space' && s.fase === 'plan' && !ayuda) e.preventDefault(); };
    window.addEventListener('keydown', tecla); window.addEventListener('keyup', soltar); window.addEventListener('blur', pausa); document.addEventListener('visibilitychange', ocultar);
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('keyup', soltar); window.removeEventListener('blur', pausa); document.removeEventListener('visibilitychange', ocultar); };
  }, [enviar, espectador, s.fase, s.angulo, ayuda, impulso, puedeLanzar]);
  useEffect(() => { if (s.fase === 'resultado') { if (s.vuelo.resultado === 'objetivo') sonidos.exito(); else sonidos.fallo(); } }, [s.fase, s.vuelo?.resultado]);
  const continuar = () => { if (espectador || aplicado.current || s.fase !== 'fin') return; aplicado.current = true; setEstado(e => aplicarDrones(e, s)); alTerminar(); };
  const mx = cfg.orbita * Math.cos(s.posicion), my = cfg.orbita * Math.sin(s.posicion);
  const fz = impulso ? s.barra : FUERZA_REFERENCIA, a = s.angulo * Math.PI / 180, lx = -Math.cos(a) * (2 + fz / 100 * 5), ly = Math.sin(a) * (2 + fz / 100 * 5);
  const ex = mx + lx * Math.cos(s.posicion) - ly * Math.sin(s.posicion), ey = my + lx * Math.sin(s.posicion) + ly * Math.cos(s.posicion);
  const apuntar = e => {
    if (espectador || s.fase !== 'plan' || ayuda || impulso) return;
    const pt = mapa.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const pos = pt.matrixTransform(mapa.current.getScreenCTM().inverse()), dx = pos.x - mx, dy = -pos.y - my;
    const localX = dx * Math.cos(s.posicion) + dy * Math.sin(s.posicion), localY = -dx * Math.sin(s.posicion) + dy * Math.cos(s.posicion);
    enviar({ tipo: 'ajustar', angulo: Math.round(Math.atan2(localY, -localX) * 180 / Math.PI) });
  };
  return <section className={`drones drones-${s.fase}`} data-fase={s.fase} data-indice={s.indice} data-disponibles={s.disponibles} data-colocados={s.colocados.length} data-margen={margen} data-angulo={s.angulo} data-fuerza={s.fuerza} data-subfase={s.subfase} data-barra={s.barra} data-reloj={s.reloj} data-tiempo={s.vuelo?.tiempo || 0} aria-label={t('e04.Drones.drone_deployment_from_the_mothership')}>
    <header className="drones-header"><div><span>{t('e04.Drones.04_observation_network')}</span><h1>{t('e04.Drones.one_mothership')}<em>{t('e04.Drones.more_horizons')}</em></h1></div><div><button aria-label={t('e04.Drones.drone_help')} onClick={() => { enviar({ tipo: 'pausar' }); setAyuda(true); }}>?</button><button disabled={!activo} aria-label={t('e04.Drones.pause_drones')} onClick={() => enviar({ tipo: 'pausar' })}>Ⅱ</button></div></header>
    <div className="drones-hud"><div><span>{t('e04.Drones.in_the_bay')}</span><strong>{s.disponibles}<small> / {s.total}</small></strong></div><div><span>{t('e04.Drones.in_position')}</span><strong>{s.colocados.length}<small> / {s.total}</small></strong></div><div><span>{t('e04.Drones.extra_fuel_v')}</span><strong>{margen.toFixed(0)}<small> m/s</small></strong></div><div><span>{t('e04.Drones.battery')}</span><strong>{Math.round(s.bateria / s.bateriaMax * 100)}<small>%</small></strong></div></div>
    <div className="drones-cuerpo"><div className="drones-espacio"><div className="drones-mapa-titulo"><span>{cfg.nombre.toUpperCase()}{t('e04.Drones.orbital_map')}</span><small>{s.fase === 'avance' ? t('e04.Drones.the_mothership_is_moving_to_the') : s.fase === 'vuelo' ? t('e04.Drones.drone_released_gravity_is_curving_its') : impulso ? t('e04.Drones.stop_the_thrust_bar_with_space') : t('e04.Drones.drag_from_the_mothership_to_aim')}</small></div>
      <svg ref={mapa} viewBox="-14 -14 28 35" className="drones-mapa" role="img" aria-label={t('e04.Drones.orbital_map_of_mothership_and_observation', { v0: cfg.nombre })} onPointerDown={e => { if (s.fase !== 'plan' || ayuda || impulso) return; drag.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); apuntar(e); }} onPointerMove={e => { if (drag.current === e.pointerId) apuntar(e); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
        <defs><radialGradient id="sombra-dron" cx="25%" cy="20%" r="85%"><stop offset="0" stopColor="#e8f4ff" stopOpacity=".15"/><stop offset=".5" stopColor="#071126" stopOpacity=".05"/><stop offset="1" stopColor="#010718" stopOpacity=".95"/></radialGradient><radialGradient id="halo-dron"><stop offset="0" stopColor="#689ac8" stopOpacity=".25"/><stop offset="1" stopColor="#133656" stopOpacity="0"/></radialGradient><linearGradient id="casco-dron"><stop stopColor="#fff1b3"/><stop offset=".5" stopColor="#d6a64c"/><stop offset="1" stopColor="#665338"/></linearGradient><clipPath id="clip-dron"><circle r={cfg.radio}/></clipPath><marker id="flecha-dron" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#ffd390"/></marker></defs>
        {Array.from({ length: 85 }, (_, i) => <circle key={i} cx={(i * 13.71 % 28) - 14} cy={(i * 7.19 % 28) - 14} r={i % 5 ? .025 : .045} fill="#bfdbed" opacity={i % 3 ? .35 : .8}/>)}
        <circle r="8" fill="url(#halo-dron)"/><circle r={cfg.orbita} fill="none" stroke="#6a9bb5" strokeWidth=".045" strokeDasharray=".15 .3"/>
        <circle r={cfg.radio + .18} fill="#b3d4e1" opacity=".14"/><image href={`./texturas/${cfg.textura}.jpg`} x={-cfg.radio} y={-cfg.radio} width={cfg.radio * 2} height={cfg.radio * 2} preserveAspectRatio="xMidYMid slice" clipPath="url(#clip-dron)"/><circle r={cfg.radio} fill="url(#sombra-dron)"/>
        <text x="0" y={cfg.radio + 1} textAnchor="middle" className="drones-planeta-texto">{cfg.nombre.toUpperCase()}</text>
        {s.colocados.map(c => { const p = posicionDronOrbital(c, s.reloj); return <g key={c.indice} className="dron-orbital"><circle r={c.r} fill="none" stroke={COLOR_SONDA[c.tipo] || '#9fe9ff'} strokeWidth=".035" opacity=".28"/><GlifoDron tipo={c.tipo} x={p.x} y={p.y} orbital/></g>; })}
        {/* Arranque de la trayectoria: ámbar, más grueso y con halo y punta de flecha para que se note (mismo largo: la dificultad no cambia). */}
        {s.fase === 'plan' && prevista.map((z, i) => <g key={i} opacity={z.op}>
          <polyline points={puntos(z.pts)} fill="none" stroke="#ffb347" strokeWidth=".3" strokeOpacity=".25" strokeLinecap="round"/>
          <polyline points={puntos(z.pts)} fill="none" stroke="#ffd390" strokeWidth=".13" strokeDasharray=".35 .18" strokeLinecap="round"/>
        </g>)}
        {s.fase === 'plan' && (() => {
          const ultimo = prevista[prevista.length - 1], pts = ultimo?.pts ?? [];
          if (pts.length < 2) return null;
          const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]], ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI;
          return <path d="M .45 0 L -.25 .3 L -.12 0 L -.25 -.3 Z" fill="#ffd390" opacity={Math.max(.7, ultimo.op)} transform={`translate(${b[0]},${-b[1]}) rotate(${ang})`}/>;
        })()}
        {s.vuelo && <polyline points={puntos(s.vuelo.camino)} fill="none" stroke="#8ff8d7" strokeWidth=".09"/>}
        {Array.from({ length: s.total }, (_, i) => { const o = objetivoDron(cfg, i), hecho = s.colocados.some(c => c.indice === i); return <g key={i} transform={`translate(${o.x},${-o.y})`} opacity={i === s.indice || hecho ? 1 : i < s.indice ? .45 : .25}><circle r={cfg.tolerancia} fill={hecho ? '#55e2b8' : '#39eab51a'} stroke={hecho ? '#a5ffe2' : '#86f6d0'} strokeWidth=".09"/><circle r={cfg.tolerancia + .22} fill="none" stroke="#b4ffe3" strokeWidth=".035" strokeDasharray=".15 .1"/><text textAnchor="middle" dy=".2" fontSize=".55" fill={hecho ? '#083c3b' : '#d1fff0'}>{hecho ? '✓' : i + 1}</text></g>; })}
        {s.fase === 'plan' && <path d={`M${mx} ${-my}L${ex} ${-ey}`} stroke="#ffd390" strokeWidth=".13" markerEnd="url(#flecha-dron)"/>}
        <NaveMadre x={mx} y={my} giro={-s.posicion * 180 / Math.PI} activa={s.fase === 'avance'}/>
        {s.choque && <g key={s.choque.n} transform={`translate(${s.choque.x},${-s.choque.y})`}><circle className="dron-explosion" r=".6" fill="none" stroke="#ffb27c" strokeWidth=".14"/></g>}
        {s.vuelo && s.fase !== 'avance' && <GlifoDron tipo={tipoActual} x={s.vuelo.x} y={s.vuelo.y} estado={s.vuelo.resultado}/>}
      </svg>{impulso && <div className="drones-barra-caja flota"><div className="drones-barra-cab"><span>{t('e04.Drones.thrust')}</span><b className={Math.abs(s.barra - s.zona.centro) <= ancho ? 'en-zona' : ''}>{s.barra.toFixed(0)}</b></div>
            <div className="drones-barra" role="img" aria-label={t('e04.Drones.thrust_bar_green_zone_centered_at', { v0: s.barra.toFixed(0), v1: s.zona.centro })}><div className="drones-zona" style={{ left: pct(s.zona.centro - ancho), right: `calc(100% - ${pct(s.zona.centro + ancho)})` }}/>{MARCAS.map(m => <i key={m} className="drones-marca" style={{ left: pct(m) }}><em>{m}</em></i>)}<div className="drones-cursor" style={{ left: pct(s.barra) }}/></div></div>}<div className="drones-mapa-pie"><span><i/>{t('e04.Drones.target')}{Math.min(s.indice + 1, s.total)}{t('e04.Drones.of')}{s.total}</span><span>{t('e04.Drones.gravity_active_game_scale')}</span></div></div>
      <aside className="drones-consola">
        {s.fase === 'guia' && <DialogoIO titulo={t('e04.Drones.you_aim_gravity_curves')} accion={t('e04.Drones.prepare_first_drone')} alSeguir={() => enviar({ tipo: 'entendido' })}><p>{t('e04.Drones.the_mothership_carries')}<b>{s.total}{t('e04.Drones.drones_from_the_hangar')}</b>{t('e04.Drones.launch_one_toward_each_green_ring')}</p><p>{t('e04.Drones.set_the')}<b>{t('e04.Drones.angle')}</b>{t('e04.Drones.you_only_see_the_start_of')}<b>{t('e04.Drones.thrust_bar')}</b>{t('e04.Drones.in_the_green_zone_with_space')}</p><p>{t('e04.Drones.drones_already_placed_stay')}<b>{t('e04.Drones.in_orbit')}</b>{t('e04.Drones.and_become_obstacles_if_you_hit')}</p><p>{t('e04.Drones.each_launch_uses_one_drone_extra')}</p></DialogoIO>}
        {s.fase === 'sinequipo' && <DialogoIO titulo={t('e04.Drones.the_bay_is_empty')} accion={t('e04.Drones.continue_without_deploying_drones')} alSeguir={() => enviar({ tipo: 'terminar' })}><p>{t('e04.Drones.you_did_not_equip_drones_in')}</p><button onClick={alHangar}>{t('e04.Drones.return_to_hangar')}</button></DialogoIO>}
        {!impulso && ['plan', 'vuelo', 'avance', 'resultado'].includes(s.fase) && <Suspense fallback={<div className="dron-bahia dron-bahia-carga"/>}><DronBahia3D tipo={tipoActual} mision={mision} lanzado={['vuelo', 'resultado', 'avance'].includes(s.fase)}/></Suspense>}
        {s.fase === 'plan' && <><div className="drones-instruccion"><span>{t('e04.Drones.release_0')}{s.indice + 1}</span><h2>{t('e04.Drones.make_the_curve_reach_the_ring')}</h2><p>{t('e04.Drones.you_only_see_the_start_of_216')}{cfg.nombre}{t('e04.Drones.imagine_how_the_rest_will_curve')}</p></div>
          {!impulso && <><label className="drones-control" htmlFor="dron-angulo"><span>{t('e04.Drones.release_angle')}<b>{s.angulo.toFixed(0)}°</b></span><input id="dron-angulo" type="range" min="-85" max="85" step="1" value={s.angulo} onChange={e => enviar({ tipo: 'ajustar', angulo: +e.target.value })}/></label>
          {zonaAngulo ? <div className="drones-prediccion"><b>{t('e04.Drones.only_the_start_of_the_curve')}</b><span>{t('e04.Drones.the_dotted_line_uses_a_reference')}{FUERZA_REFERENCIA}{t('e04.Drones.set_the_angle_and_stop_the')}</span></div> : <p className="drones-alerta" role="status">{t('e04.Drones.no_thrust_can_reach_the_target')}</p>}
          <div className="drones-coste"><span>{t('e04.Drones.cost_of_this_launch')}</span><strong>{t('e04.Drones.1_drone')}<i>+</i> {costoDron(FUERZA_MIN).toFixed(0)}–{costoDron(FUERZA_MAX).toFixed(0)}{t('e04.Drones.m_s_depending_on_thrust')}<i>+</i>{t('e04.Drones.1_5_battery')}</strong></div>
          <button key="fijar" className="primario drones-lanzar drones-fijar" disabled={!puedeLanzar || !zonaAngulo} onClick={() => enviar({ tipo: 'fijarAngulo' })}>{t('e04.Drones.set_angle')}<span>⌖</span></button></>}
          {impulso && <><p className="drones-barra-ayuda">{t('e04.Drones.stop_the_bar_inside_the_green')}</p>
          <div className="drones-coste"><span>{t('e04.Drones.cost_if_released_now')}</span><strong>{t('e04.Drones.1_drone')}<i>+</i> {costo.toFixed(1)} m/s <i>+</i>{t('e04.Drones.1_5_battery')}</strong></div>
          <button key="liberar" className="primario drones-lanzar drones-liberar" disabled={margen < costo} onPointerDown={e => { if (e.pointerType !== 'mouse' || e.button === 0) { e.preventDefault(); enviar({ tipo: 'lanzar' }); } }} onClick={e => { if (e.detail === 0) enviar({ tipo: 'lanzar' }); }}>{t('e04.Drones.release')}<span>↗</span></button>
          <button className="drones-secundario" onClick={() => enviar({ tipo: 'cambiarAngulo' })}>{t('e04.Drones.change_angle')}</button></>}
          {!puedeLanzar && <p className="drones-alerta">{t('e04.Drones.not_enough_resources_the_mission_reserve')}</p>}<p className="drones-atajos">{t('e04.Drones.angle_space_sets_the_angle_then')}</p><button className="drones-secundario" onClick={() => enviar({ tipo: 'terminar' })}>{t('e04.Drones.save_resources_and_finish_deployment')}</button></>}
        {['vuelo', 'avance'].includes(s.fase) && <DialogoIO titulo={s.fase === 'avance' ? t('e04.Drones.target_confirmed_moving_the_mothership') : t('e04.Drones.drone_in_flight_watch_the_curve')}><p>{s.fase === 'avance' ? t('e04.Drones.the_mothership_coasts_along_its_orbit') : t('e04.Drones.the_drone_inherited_the_mothership_s')}</p><p>{t('e04.Drones.pause_time_with_p_or_the')}</p></DialogoIO>}
        {s.fase === 'resultado' && <DialogoIO alerta={s.vuelo.resultado !== 'objetivo'} titulo={s.vuelo.resultado === 'objetivo' ? t('e04.Drones.drone_in_position') : s.vuelo.resultado === 'choque' ? t('e04.Drones.collision_in_orbit') : s.vuelo.resultado === 'impacto' ? t('e04.Drones.impact_we_lost_this_drone') : t('e04.Drones.the_drone_did_not_reach_the')} accion={s.disponibles ? s.vuelo.resultado === 'objetivo' ? t('e04.Drones.move_to_the_next_point') : t('e04.Drones.prepare_another_drone') : t('e04.Drones.view_network_results')} alSeguir={() => enviar({ tipo: 'siguiente' })}><p>{s.vuelo.resultado === 'objetivo' ? t('e04.Drones.the_network_received_its_first_observation') : s.vuelo.resultado === 'choque' ? t('e04.Drones.collision_drone_hit_drone_in_orbit', { v0: s.indice + 1, v1: s.choque.con + 1 }) : t('e04.Drones.think_about_how_the_trajectory_curved')}</p><p>{t('e04.Drones.there_are')}<b>{s.disponibles}{t('e04.Drones.drones')}</b>{t('e04.Drones.left_in_the_bay')}</p></DialogoIO>}
        {s.fase === 'fin' && <DialogoIO titulo={s.colocados.length === s.total && s.total ? t('e04.Drones.observation_network_complete') : t('e04.Drones.deployment_finished')} accion={t('e04.Drones.continue_05_approach_and_rendezvous')} alSeguir={continuar}><p><b>{s.colocados.length}{t('e04.Drones.of')}{s.total}{t('e04.Drones.drones')}</b>{t('e04.Drones.reached_their_point')}{s.perdidos}{t('e04.Drones.lost_and')}{s.disponibles}{t('e04.Drones.kept_on_board')}</p><p>{t('e04.Drones.your_remaining_battery_power_and_fuel')}</p></DialogoIO>}
        <details className="drones-nota"><summary>{t('e04.Drones.experimental_variant_how_it_works')}</summary><p>{t('e04.Drones.this_fictional_extension_replaces_the_game')}</p><p>{t('e04.Drones.central_gravity_inherited_orbital_velocity_and')}{mision.dv_requerida_ms}{t('e04.Drones.m_s_for_nominal_maneuvers_in')}</p></details>
      </aside></div>
    {(s.fase === 'pausa' || ayuda) && <div className="drones-overlay"><DialogoIO titulo={ayuda ? t('e04.Drones.from_hangar_to_orbit') : t('e04.Drones.flight_paused')} accion={ayuda ? t('e04.Drones.got_it') : t('e04.Drones.resume_flight')} alSeguir={() => { if (ayuda) setAyuda(false); else enviar({ tipo: 'reanudar' }); }}><p>{ayuda ? t('e04.Drones.equip_0_to_4_drones_under') : t('e04.Drones.movement_and_resource_use_are_paused')}</p></DialogoIO></div>}
  </section>;
}

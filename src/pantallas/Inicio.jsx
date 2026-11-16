import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Jupiter from '../componentes/Jupiter.jsx';
import { etiquetaFase } from '../estado/partida.js';
import { useT } from '../i18n/idioma.js';
import './menu-principal.css';
import { FOTO_OBJETIVO } from '../datos/fotosObjetivo.js';
import './briefing.css';
import { salirSala } from '../red/cliente.js';
import { PanelEquipo } from '../componentes/SalaRed.jsx';
import { NIVEL_POR_DEFECTO, NIVELES } from '../motor/dificultad.js';
import './dificultad.css';
import { ConfigEquipo } from '../componentes/Equipo.jsx';
import { useSinConsejos } from '../componentes/TutorialFase.jsx';
import { soportaWebGL } from '../tres/webgl.js';
const PortadaHangar = lazy(() => import('../taller/PortadaHangar.jsx'));

// Campaña: la misión 1 (tutorial) siempre está abierta; cada una se desbloquea al completar la anterior.
const CAMPANA = [
  { id: 'lro', nombre: 'LRO', destino: 'La Luna', etiqueta: 'Tutorial', planeta: 'radial-gradient(circle at 35% 30%, #e6e6e6, #8d8d8d 60%, #4a4a4a)' },
  { id: 'juno', nombre: 'Juno', destino: 'Júpiter', planeta: 'repeating-linear-gradient(170deg, #e8d3b0 0 6px, #c48b5c 6px 11px, #f0e2c8 11px 16px, #a86c45 16px 20px)' },
  { id: 'maven', nombre: 'MAVEN', destino: 'Marte', planeta: 'radial-gradient(circle at 35% 30%, #f08a5a, #c1440e 60%, #6e2307)' },
  { id: 'dart', nombre: 'DART', destino: 'Dimorphos', planeta: 'radial-gradient(circle at 35% 30%, #b8ad9b, #7a6f5e 60%, #3f382e)' },
  { id: 'osiris', nombre: 'OSIRIS-REx', destino: 'Bennu', planeta: 'radial-gradient(circle at 35% 30%, #8f877b, #5d554a 60%, #2c2722)' },
];

// Menú principal (rediseño según el boceto de Eduardo):
//   izquierda = nombre del juego y misiones en columna · centro = el operador 3D con su globo de texto
//   debajo = «Iniciar misión» y 3 botones · arriba a la derecha (cabecera de App) = idioma, sonido, info y pantalla completa.
// `vista` controla el diálogo: 'info' (créditos y datos), 'opciones' o 'ayuda' (cómo jugar).
export function Menu({ progreso, misiones, alElegir, alReiniciar, alTierra, pruebas = false, partidaGuardada = null, alContinuar, vista = null, setVista = () => {}, red = null, equipoLocal = null, alEquipoLocal = () => {}, alEquipoRed = () => {} }) {
  const t = useT();
  const destino = m => t(`destino.${m.id}`, null, m.destino);
  const hecho = progreso.completadas;
  const abierta = k => pruebas || k === 0 || hecho.includes(CAMPANA[k - 1].id);
  const siguiente = CAMPANA.find((m, k) => abierta(k) && misiones[m.id] && !hecho.includes(m.id)) || CAMPANA[0];
  const [seleccion, setSeleccion] = useState(siguiente.id);
  const [sinConsejos, setSinConsejos] = useSinConsejos();
  const [nombre, setNombre] = useState(() => { try { return localStorage.getItem('odisea-nombre') || ''; } catch { return ''; } });
  // Ya no hay equipo por turnos en un mismo dispositivo: el equipo juega EN LÍNEA (cada quien en su dispositivo).
  const [modoElegido, setModo] = useState(red?.sala ? 'red' : 'solo');
  const modo = red?.sala ? 'red' : modoElegido;
  const cambiarNombre = (valor) => { setNombre(valor); try { localStorage.setItem('odisea-nombre', valor); } catch { /* sin almacenamiento */ } };
  const elegirModo = (valor) => {
    if (valor !== 'red' && red?.sala) salirSala();
    setModo(valor);
    if (valor !== 'solo') setVista(valor === 'local' ? 'equipoLocal' : 'equipo');
  };
  const listo = modo === 'red' ? !!red?.sala : modo === 'local' ? equipoLocal?.jugadores?.length >= 2 : nombre.trim().length > 0;
  const grupo = modo === 'red' ? red?.sala?.jugadores : modo === 'local' ? equipoLocal?.jugadores : null;
  const [errorReinicio, setErrorReinicio] = useState(false);
  const abrirReinicio = () => { setErrorReinicio(false); setVista('reiniciar'); };
  const dialogo = useRef(null);
  const actual = CAMPANA.find(m => m.id === seleccion), indice = CAMPANA.indexOf(actual);
  const jugable = !!misiones[seleccion] && abierta(indice);
  useEffect(() => { if (vista) { if (!dialogo.current?.open) dialogo.current?.showModal(); } else dialogo.current?.close(); }, [vista]);
  // Entra o sale del modo libre (sandbox) con el parámetro ?modo=pruebas.
  const alternarModoLibre = () => { const url = new URL(window.location.href); if (pruebas) url.searchParams.delete('modo'); else url.searchParams.set('modo', 'pruebas'); url.searchParams.delete('probar'); window.location.assign(url.href); };
  const estado = !misiones[seleccion] ? t('menu.proximamente') : jugable ? pruebas ? t('menu.hangarDesbloqueado') : actual.etiqueta ? t('menu.tutorial') : t('menu.disponible') : t('menu.bloqueada');
  const texto = !misiones[seleccion] ? t('menu.proximaActualizacion') : !jugable ? t('menu.completaPara', { mision: CAMPANA[indice - 1]?.nombre }) : seleccion === 'lro' ? t('menu.descLro') : t('menu.descJuno');
  const cerrar = () => setVista(null);
  return <section className="mp" aria-label={t('menu.aria')}>
    <div className="mp-escena" aria-label={t('menu.escena')}>{soportaWebGL() ? <Suspense fallback={<span className="menu-cargando">{t('menu.preparando')}</span>}><PortadaHangar misionId={seleccion} jugadores={red?.sala?.jugadores?.length ?? 1} /></Suspense> : <Jupiter tam={360} auroras />}</div>
    <div className="mp-atmosfera" />

    <aside className="mp-lateral">
      <div className="mp-nombre">
        <span className="menu-kicker">{t('menu.kicker')}</span>
        <h1>ODISEA{' '}<br />GALÁCTICA</h1>
        <label className="mp-tu-nombre">{t('red.tuNombre')}<input autoComplete="nickname" value={nombre} maxLength={18} onChange={e => cambiarNombre(e.target.value)} placeholder={t('red.nombreEj')} /></label>
        <p className="mp-lema">{t('menu.lema1')} {t('menu.lema2')}</p>
        <p className="mp-cuenta"><span title={t('menu.fondos')}>◈ {progreso.fondos} M</span><span title={t('menu.medallas')}>✦ {Object.values(progreso.medallas || {}).filter(Boolean).length}</span>{pruebas && <span className="mp-libre-activo">{t('menu.modoPruebas')}</span>}</p>
      </div>
      <nav className="mp-misiones" aria-label={t('menu.ariaCampana')}>
        <div className="mp-misiones-titulo"><span>{t('menu.campana')}</span><span>{t('menu.completadas', { n: hecho.length })}</span></div>
        <ul>{CAMPANA.map((m, k) => <li key={m.id}><button className={`mp-mision ${seleccion === m.id ? 'seleccionada' : ''} ${!misiones[m.id] || !abierta(k) ? 'cerrada' : ''}`} aria-pressed={seleccion === m.id} aria-label={`${t('menu.seleccionar', { mision: m.nombre })}${!misiones[m.id] ? t('menu.ariaProximamente') : !abierta(k) ? t('menu.ariaBloqueada') : ''}`} onClick={() => setSeleccion(m.id)}><span className="menu-orbe" style={{ background: m.planeta }} /><span className="mp-mision-texto"><strong>{m.nombre}</strong><small>{destino(m)}</small></span><span className="mp-mision-estado">{hecho.includes(m.id) ? '✓' : !misiones[m.id] ? t('menu.pronto') : !abierta(k) ? '🔒' : `0${k + 1}`}</span></button></li>)}</ul>
      </nav>
    </aside>

    <div className="mp-globo" aria-live="polite">
      <span className="mp-globo-quien">{t('menu.operador')} · {estado}</span>
      <h2>{actual.nombre}<span> / {destino(actual)}</span></h2>
      <p>{texto}</p>
      <p className="mp-equipo-resumen">{grupo?.length ? t('menu.equipoResumen', { nombres: grupo.map(j => j.nombre).join(', ') }) : t(`menu.modoResumen.${modo}`, { nombre: nombre.trim() })}{grupo?.length === 2 && ` · ${t('menu.dosRoles')}`}</p>
    </div>

    <div className="mp-acciones">
      {modo !== 'red' && partidaGuardada && alContinuar && <button className="mp-continuar" onClick={alContinuar}>{t('menu.continuar', { mision: misiones[partidaGuardada.misionId]?.nombre, fase: t(`fase.${partidaGuardada.fase}`, null, etiquetaFase(partidaGuardada.fase)) })}</button>}
      <button className="mp-jugar" disabled={!jugable || !listo} onClick={() => modo === 'red' ? setVista('equipo') : alElegir(seleccion, modo === 'local' ? equipoLocal : null)}><span>▶ {modo === 'red' ? t('red.abrirSala') : pruebas ? t('menu.probarHangar') : hecho.includes(seleccion) ? t('menu.volverAJugar') : t('menu.iniciar')}</span><span aria-hidden="true">↗</span></button>
      <div className="mp-modos" role="group" aria-label={t('menu.modoJuego')}>
        {[['solo', '👤'], ['red', '🌐']].map(([id, icono]) => <button key={id} aria-pressed={modo === id} onClick={() => elegirModo(id)}>{icono} {t(`menu.modo.${id}`)}</button>)}
      </div>
      {modo === 'solo' && !nombre.trim() && <span className="mp-pendiente">{t('menu.escribeNombre')}</span>}
      {hecho.includes('lro') && alTierra && <>
        <button className="mp-tierra" disabled={!!red?.sala} onClick={alTierra}>🌎 {t('tierra.titulo')}</button>
        {red?.sala && <span className="mp-pendiente">{t('tierra.salirSala')}</span>}
      </>}
      <div className="mp-secundarios">
        <button onClick={alternarModoLibre}>{pruebas ? t('menu.volverCampana') : t('menu.modoLibreCorto')}</button>
        <button onClick={() => setVista('ayuda')}>{t('menu.comoJugar')}</button>
        <button onClick={() => setVista('opciones')}>{t('menu.opcionesCorto')}</button>
        <button className="mp-reiniciar" onClick={abrirReinicio}>{t('menu.reiniciar')}</button>
      </div>
    </div>

    <dialog className="menu-dialogo" ref={dialogo} onClose={cerrar} onCancel={cerrar}>
      <button className="menu-dialogo-cerrar" onClick={cerrar} aria-label={t('menu.cerrarOpciones')}>×</button>
      {vista === 'equipoLocal' && <ConfigEquipo inicial={equipoLocal} nombreInicial={nombre} alListo={e => { alEquipoLocal(e); cerrar(); }} />}
      {vista === 'equipo' && red && <PanelEquipo key={vista} modoInicial="red" nombreInicial={nombre} alNombre={cambiarNombre} red={red} mision={jugable ? misiones[seleccion] : null} nombreMision={`${actual.nombre} / ${destino(actual)}`}
        alLocal={(e) => { alEquipoLocal(e); setModo('local'); cerrar(); }} alEmpezarRed={(x) => alEquipoRed(x, seleccion)} />}
      {vista === 'ayuda' && <>
        <span className="menu-kicker">{t('menu.controlMision')}</span><h2>{t('menu.ayudaTitulo')}</h2>
        <ol className="mp-pasos">{[1, 2, 3, 4, 5, 6].map(n => <li key={n}><strong>{t(`menu.ayuda${n}t`)}</strong><span>{t(`menu.ayuda${n}`)}</span></li>)}</ol>
        <p>{t('menu.ayudaEquipo')}</p>
      </>}
      {vista === 'opciones' && <>
        <span className="menu-kicker">{t('menu.controlMision')}</span><h2>{t('menu.opcionesCorto')}</h2>
        <p>{t('menu.descJuego')}</p><p>{pruebas ? t('menu.textoPruebas') : t('menu.textoGuardado')}</p>
        <button onClick={alternarModoLibre}>{pruebas ? t('menu.volverCampana') : t('menu.probarDesbloqueados')}</button>
        <button onClick={() => setSinConsejos(!sinConsejos)}>{t(sinConsejos ? 'tutorial.reactivar' : 'tutorial.desactivar')}</button>
        <button onClick={abrirReinicio}>{t('menu.reiniciar')}</button>
      </>}
      {vista === 'reiniciar' && <>
        <h2>{t('menu.reiniciar')}</h2>
        <p>{t('menu.confirmarReinicio')}</p>
        <p>{t('menu.reinicioAlcance')}</p>
        {errorReinicio && <p role="alert">{t('menu.reinicioError')}</p>}
        <button type="button" onClick={cerrar}>{t('menu.reinicioCancelar')}</button>
        <button type="button" className="mp-confirmar-reinicio" onClick={() => { if (alReiniciar() === false) setErrorReinicio(true); }}>{t('menu.reinicioConfirmar')}</button>
      </>}
      {vista === 'info' && <>
        <span className="menu-kicker">{t('menu.controlMision')}</span><h2>{t('creditos.titulo')}</h2>
        <ul className="menu-creditos"><li><a href="https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/" target="_blank" rel="noreferrer">{t('creditos.reto')}</a></li><li>{t('creditos.misiones')} <a href="https://science.nasa.gov/mission/lro/" target="_blank" rel="noreferrer">LRO</a> · <a href="https://science.nasa.gov/mission/juno/" target="_blank" rel="noreferrer">Juno</a></li><li>{t('creditos.proceso')}</li><li>{t('creditos.tierra')}</li><li>{t('creditos.fotosNasa')}</li><li>{t('creditos.texturas')}</li><li>{t('creditos.libs')}</li><li>{t('creditos.ia')}</li></ul>
        <p className="menu-creditos-aviso">{t('creditos.aviso')}</p>
        <p>{t('menu.texturas')}: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">Solar System Scope</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</p>
      </>}
      {vista !== 'reiniciar' && <button className="primario" onClick={cerrar}>{t('menu.volverJuego')}</button>}
    </dialog>
  </section>;
}

// Texto que se escribe letra por letra (respeta «reducir movimiento»).
function Maquina({ texto }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(texto.length); return; }
    setN(0);
    const id = setInterval(() => setN((x) => (x >= texto.length ? x : x + 2)), 18);
    return () => clearInterval(id);
  }, [texto]);
  return <>{texto.slice(0, n)}<span className="cursor-texto">{n < texto.length ? '▍' : ''}</span></>;
}

export function Briefing({ mision, alSeguir, dificultad = NIVEL_POR_DEFECTO, setDificultad }) {
  const t = useT();
  const [i, setI] = useState(0), [paso, setPaso] = useState(0), [volteadas, setVolteadas] = useState([]);
  const [movil, setMovil] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)'), cambiar = () => setMovil(media.matches);
    media.addEventListener('change', cambiar);
    return () => media.removeEventListener('change', cambiar);
  }, []);
  const avanzar = (delta) => {
    if (!movil || paso === 0 && (delta > 0 ? i < mision.briefing.length - 1 : i > 0)) setI(n => Math.max(0, Math.min(mision.briefing.length - 1, n + delta)));
    else setPaso(n => Math.max(0, Math.min(2, n + delta)));
  };
  useEffect(() => {
    const tecla = e => {
      if (e.repeat || e.target.closest('input, select, textarea, button, a, [role="radio"]')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); avanzar(e.key === 'ArrowRight' ? 1 : -1); }
      if (e.key === 'Enter' && (!movil || paso === 2)) { e.preventDefault(); alSeguir(); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });
  return <section className="br" aria-label={t('briefing.titulo', { n: mision.numero, nombre: mision.nombre, i: i + 1, total: mision.briefing.length })}>
    <nav className="br-pasos" aria-label={t('briefing.pasos')}>
      {['historia', 'objetivos', 'nivel'].map((id, n) => <button key={id} aria-current={paso === n ? 'step' : undefined} onClick={() => setPaso(n)}><b>{n + 1}</b> {t(`briefing.paso.${id}`)}</button>)}
    </nav>
    <div className="br-arriba" hidden={movil && paso !== 0}>
      <div className="br-directora">
        <figure><img src="./img/directora.webp" alt={t('briefing.directora')} /><figcaption><strong>Dra. Itzel Ramos</strong><span>{t('briefing.directora')}</span></figcaption></figure>
        <div className="br-historia"><h2>{t('briefing.mision', { nombre: mision.nombre })}</h2><p className="br-globo" aria-label={mision.briefing[i]}><span aria-hidden="true"><Maquina texto={mision.briefing[i]} /></span></p>
          <div className="br-paginas"><button disabled={i === 0} aria-label={t('briefing.anterior')} onClick={() => setI(n => n - 1)}>‹</button><span>{i + 1}/{mision.briefing.length}</span><div>{mision.briefing.map((_, n) => <button key={n} aria-label={t('briefing.pagina', { n: n + 1 })} aria-pressed={i === n} onClick={() => setI(n)}>●</button>)}</div><button disabled={i === mision.briefing.length - 1} aria-label={t('briefing.siguiente')} onClick={() => setI(n => n + 1)}>›</button></div>
        </div>
      </div>
      <div className="br-pregunta"><span>{t('briefing.pregunta')}</span><h1>{mision.pregunta}</h1></div>
    </div>
    <div className="br-objetivos" hidden={movil && paso !== 1}>
      <div className="br-seccion"><h2>{t('briefing.paso.objetivos')}</h2><span>{t('briefing.voltear')}</span></div>
      <div className="br-tarjetas">{mision.objetivos.map((o, n) => {
        const vuelta = volteadas.includes(o.id);
        return <button key={o.id} data-objetivo={o.id} style={FOTO_OBJETIVO[o.id] ? { '--foto': `url(${new URL(FOTO_OBJETIVO[o.id], document.baseURI).href})` } : undefined} className={`br-tarjeta${vuelta ? ' vuelta' : ''}${FOTO_OBJETIVO[o.id] ? ' con-foto' : ''}`} aria-pressed={vuelta} aria-label={`${o.nombre}. ${vuelta ? t('briefing.sensores', { x: o.necesitas }) : t('briefing.voltear')}`} onClick={() => setVolteadas(v => vuelta ? v.filter(id => id !== o.id) : [...v, o.id])}>
          <span className="br-cara br-frente" aria-hidden={vuelta}><span className="br-numero">0{n + 1}</span><strong>{o.nombre}</strong><span>{t('briefing.ciencia', { p: Math.round(o.peso * 100) })} ↻</span></span>
          <span className="br-cara br-reverso" aria-hidden={!vuelta}><strong>{t('briefing.sensoresTitulo')}</strong><span>{o.necesitas}</span><span>↶ {t('briefing.verObjetivo')}</span></span>
        </button>;
      })}</div>
      <p className="br-premio">✦ <strong>{t('briefing.recompensa', { n: mision.recompensa?.['Nivel JPL'] })}</strong><span>{t('briefing.pagoDespues')}</span></p>
    </div>
    <footer className="br-final" hidden={movil && paso !== 2}>
      <fieldset disabled={!setDificultad}><legend>{t('dificultad.titulo')}</legend><div className="br-niveles">{NIVELES.map(nivel => <label key={nivel}><input type="radio" name="dificultad" value={nivel} checked={dificultad === nivel} onChange={() => setDificultad?.(nivel)} /><span><strong>{t(`dificultad.${nivel}.nombre`)}</strong><span>{t(`dificultad.${nivel}.desc`)}</span></span></label>)}</div></fieldset>
      <div className="br-salida"><p>{setDificultad ? t('briefing.teclado') : t('briefing.nivelAnfitrion')}</p><button className="primario" onClick={alSeguir}>{t('briefing.irHangar')}</button></div>
    </footer>
    {movil && paso < 2 && <button className="br-continuar primario" onClick={() => setPaso(n => n + 1)}>{t('briefing.siguiente')} →</button>}
  </section>;
}

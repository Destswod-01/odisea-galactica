import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aplicarInsercion06, CONFIG_INSERCION as C, compararRecord, crearInsercion, cuerposPorSuperar, datosLlegada, pasoInsercion, puedeCerrar } from '../motor/insercion06.js';
import { useT } from '../i18n/idioma.js';
import DialogoIO from '../componentes/DialogoIO.jsx';
import { soportaWebGL } from '../tres/webgl.js';
import { sonidos } from '../sonido.js';
import { useEspejo } from '../red/espejo.js';
import './insercion.css';
// La escena 3D (planeta, minisonda, cuerpos) carga three aparte para no inflar la carga inicial.
const Insercion3D = lazy(() => import('../tres/Insercion3D.jsx'));

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const TECLAS_MANDO = ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'];
const ANCHO_NECESARIO = 2 * (C.XMAX + 1.5), ALTO_NECESARIO = 16.5; // el encuadre de la escena (ver Insercion3D.jsx), para convertir el arrastre en unidades
const fmt = (n, idioma) => Math.round(n || 0).toLocaleString(idioma || 'es');
const coma = (n, idioma) => (idioma === 'en' ? String(n) : String(n).replace('.', ','));
const sinMovimiento = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Récord de puntos de la etapa en localStorage (puede fallar: modo privado, datos bloqueados…). La comparación vive en el motor (`compararRecord`).
function leerRecord() {
  try { const v = Number(window.localStorage.getItem(C.CLAVE_RECORD)); return Number.isFinite(v) && v > 0 ? v : 0; } catch { return 0; }
}
function guardarRecord(n) {
  try { window.localStorage.setItem(C.CLAVE_RECORD, String(Math.round(n))); } catch { /* sin almacenamiento: el récord solo vive en esta partida */ }
}

// Botón que actúa mientras se mantiene pulsado.
function Mantener({ alAprieta, alSuelta, className, etiqueta, children }) {
  return <button type="button" className={className} aria-label={etiqueta} tabIndex={-1} onContextMenu={e => e.preventDefault()}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); alAprieta(); }} onPointerUp={alSuelta} onPointerCancel={alSuelta} onLostPointerCapture={alSuelta}>{children}</button>;
}

// Cinemática del encendido autónomo: aparece por tramos según el tiempo y se puede saltar.
function Cinematica({ s, real, alSaltar }) {
  const tr = useT(), t = s.tCin;
  return <div className="ins-cine" role="status" aria-live="polite">
    <span className="ins-kicker">{tr('e06.Insercion.cine.kicker', { nave: real.nave.toUpperCase(), cuerpo: real.cuerpo.toUpperCase() })}</span>
    <div className="ins-cine-lineas">
      <p>{tr('e06.Insercion.cine.a1')}<b>{tr('e06.Insercion.cine.a2')}</b>{tr('e06.Insercion.cine.a3', { cuerpo: real.cuerpo })}</p>
      {t > 1.8 && <p><b>{tr('e06.Insercion.cine.porque')}</b> {real.demora}</p>}
      {t > 3.6 && <p>{real.maniobra}</p>}
      {t > 5 && <p className="ins-confirma">{tr('e06.Insercion.cine.captura')}</p>}
    </div>
    <div className="ins-cine-barra"><i style={{ width: `${Math.round(acotar(t / C.DURACION_CINEMATICA_S, 0, 1) * 100)}%` }} /></div>
    <button type="button" className="ins-saltar" onClick={alSaltar}>{tr('e06.Insercion.cine.saltar')}</button>
  </div>;
}

// Tarjeta de presentación del tema de la misión (unos 2 s, no tapa los controles).
function TarjetaTema({ s }) {
  const tr = useT(), idioma = tr('e06.idioma'), t = s.tema, chips = [];
  if (t.ventana !== C.VENTANA_FOTO_S) chips.push(tr('e06.Insercion.chip.ventana', { v: coma(t.ventana, idioma) }));
  if (t.puntos !== 1) chips.push(tr('e06.Insercion.chip.puntos', { v: coma(t.puntos, idioma) }));
  if (t.gap !== 1) chips.push(tr('e06.Insercion.chip.seguidos'));
  if (t.vel !== 1) chips.push(tr('e06.Insercion.chip.rapidos'));
  if (t.luz === 'noche') chips.push(tr('e06.Insercion.chip.foco'));
  return <div className={`ins-tema tema-${t.id}`} role="status" aria-live="polite" aria-label={tr('e06.Insercion.tema.aria', { n: s.numero, nombre: t.nombre })}>
    <span className="ins-kicker">{tr('e06.Insercion.tema.kicker', { n: s.numero })}{s.intento > 1 ? tr('e06.Insercion.tema.intento', { i: s.intento }) : ''}</span>
    <h2>{t.nombre}</h2>
    <p>{t.texto}</p>
    {chips.length > 0 && <div className="ins-tema-chips">{chips.map(c => <span key={c}>{c}</span>)}</div>}
    <div className="ins-cuenta"><i style={{ width: `${Math.round(acotar(s.tTema / C.TEMA_DURACION_S, 0, 1) * 100)}%` }} /></div>
  </div>;
}

// Tarjeta de cierre de misión: estrellas, puntos, mejor combo, «¡Por poco!», fotos con su calificación y el dato del cuerpo raro.
function TarjetaResultado({ s, record, cerrable, alSiguiente, alContinuar }) {
  const tr = useT(), idioma = tr('e06.idioma'), r = s.resumen;
  if (!r) return null;
  return <div className="ins-aviso ins-resultado" role="status" aria-live="polite">
    <div className="ins-res-cab">
      <div><span className="ins-kicker">{tr('e06.Insercion.res.cumplida', { n: r.numero, tema: s.tema.nombre.toUpperCase() })}</span>
        <div className="ins-estrellas" role="img" aria-label={tr('e06.Insercion.res.estrellas', { n: r.estrellas })}>{[1, 2, 3].map(i => <b key={i} className={i <= r.estrellas ? 'llena' : ''}>★</b>)}</div></div>
      <div className="ins-res-puntos"><span>{tr('e06.Insercion.res.puntos')}</span><b>{fmt(r.puntos, idioma)}</b></div>
    </div>
    <div className="ins-res-cifras">
      <span>{tr('e06.Insercion.res.mejor_combo')}<b>×{r.mejorCombo}</b></span>
      <span>{tr('e06.Insercion.res.por_poco')}<b>{r.porPoco}</b></span>
      <span>{tr('e06.Insercion.res.total')}<b>{fmt(s.puntosTotal, idioma)}</b></span>
      <span>{tr('e06.Insercion.misiones')}<b>{Math.min(s.cumplidas, C.MISIONES_PARA_CERRAR)}/{C.MISIONES_PARA_CERRAR}</b></span>
    </div>
    {record.nuevo ? <p className="ins-nuevo-record">{tr('e06.Insercion.res.nuevo_record', { n: fmt(record.record, idioma) })}</p> : record.record > 0 && <p className="ins-record">{tr('e06.Insercion.res.record', { n: fmt(record.record, idioma) })}</p>}
    <ul className="ins-res-fotos" aria-label={tr('e06.Insercion.res.fotos')}>
      {r.fotos.map(f => <li key={f.n} className={`q-${f.calidad.toLowerCase()}`} title={`${f.clase}${f.raro ? tr('e06.Insercion.res.raro') : ''}`}>
        <i style={{ '--c': f.color }} /><b>{tr(`e06.calidad.${f.calidad}`)}</b><span>{f.mult > 1 ? `×${f.mult} ` : ''}+{f.pts}{f.raro ? ' ✦' : ''}</span></li>)}
    </ul>
    {r.raro && <p className="ins-dato"><b>✦ {r.raro.clase}.</b> {r.raro.dato}</p>}
    <div className="ins-cuenta"><i style={{ width: `${Math.round(acotar(s.tEspera / C.ESPERA_SIGUIENTE_S, 0, 1) * 100)}%` }} /></div>
    <p className="ins-res-pie">{tr('e06.Insercion.res.pie', { n: s.numero + 1 })}{cerrable ? tr('e06.Insercion.res.pie_cerrable', { m: C.MISIONES_PARA_CERRAR }) : ''}</p>
    <div className="ins-res-botones">
      {cerrable
        ? <button type="button" className="ins-siguiente" onClick={alContinuar}>{tr('e06.Insercion.continuar07')} <span>→</span></button>
        : <button type="button" className="ins-siguiente" onClick={alSiguiente}>{tr('e06.Insercion.res.siguiente')} <span>→</span></button>}
    </div>
  </div>;
}

export default function Insercion({ mision, diseno, estado, setEstado, alTerminar, opciones }) {
  const tr = useT(), idioma = tr('e06.idioma');
  const webgl = useMemo(() => soportaWebGL(), []);
  const [inicial] = useState(() => {
    const n = crearInsercion(estado, mision, { ...opciones, diseno });
    return webgl ? n : pasoInsercion(n, { tipo: 'saltar', motivo: tr('e06.Insercion.sin3d') });
  });
  const sRef = useRef(inicial), [s, setS] = useState(inicial), cerrado = useRef(false), [recordBase] = useState(leerRecord);
  const { espectador, espectadorRef } = useEspejo({ fase: 'insercion', s, setS, sRef });
  const real = datosLlegada(s.misionId);
  // `pulsadas`: teclas que bajaron desde el último cuadro, para que un toque rápido (bajar y subir entre dos cuadros) también cuente.
  const teclas = useRef(new Set()), pulsadas = useRef(new Set()), tactil = useRef({ izq: false, der: false, pend: 0 }), arrastre = useRef(null), escenaRef = useRef(null), flotantesRef = useRef(null);

  const enviar = useCallback(a => {
    const n = pasoInsercion(sRef.current, a);
    if (n !== sRef.current) { sRef.current = n; setS(n); }
    return n;
  }, []);
  const alternarPausa = useCallback(() => { const f = sRef.current.fase; if (f === 'jugando') enviar({ tipo: 'pausar' }); else if (f === 'pausa') enviar({ tipo: 'reanudar' }); }, [enviar]);

  // Bucle: lee el mando (teclado, botones y arrastre) y avanza el motor; el HUD se refresca a ~30 Hz.
  useEffect(() => {
    let id = 0, antes = performance.now(), acum = 0;
    const tiene = c => teclas.current.has(c) || pulsadas.current.has(c);
    const bucle = ahora => {
      id = requestAnimationFrame(bucle);
      const dt = Math.min(.1, (ahora - antes) / 1000); antes = ahora; acum += dt;
      const e = sRef.current, fase = e.fase, t = tactil.current;
      let n = e;
      if (!espectadorRef.current && (fase === 'jugando' || fase === 'cinematica' || fase === 'exito_mision' || fase === 'tema')) {
        let eje = (tiene('KeyD') || tiene('ArrowRight') ? 1 : 0) - (tiene('KeyA') || tiene('ArrowLeft') ? 1 : 0) + (t.der ? 1 : 0) - (t.izq ? 1 : 0);
        // Arrastre horizontal: lo arrastrado (en unidades de escena) se va gastando a la velocidad máxima de la sonda.
        if (t.pend && dt > 0) { const tope = C.VEL_X * dt, m = acotar(t.pend, -tope, tope); eje += m / tope; t.pend -= m; }
        n = pasoInsercion(e, { tipo: 'tiempo', dt, eje: acotar(eje, -1, 1) });
      }
      pulsadas.current.clear();
      if (!espectadorRef.current && n !== e) { sRef.current = n; if (n.fase !== fase || acum >= .033) { acum = 0; setS(n); } }
    };
    id = requestAnimationFrame(bucle);
    return () => cancelAnimationFrame(id);
  }, [espectadorRef]);

  // Teclado. ESPACIO se maneja aunque el foco esté en un botón: se cancela su clic y el scroll; el motor cuenta solo el flanco de bajada.
  useEffect(() => {
    if (espectador) return undefined;
    const abajo = e => {
      const f = sRef.current.fase;
      if (e.code === 'Space') { if (f === 'jugando') { e.preventDefault(); if (!e.repeat) enviar({ tipo: 'foto', abajo: true }); } return; }
      if (e.target.matches?.('input:not([type=range]),select,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyP' || e.code === 'Escape') { if (f === 'jugando' || f === 'pausa') { e.preventDefault(); if (!e.repeat) alternarPausa(); } return; }
      if (TECLAS_MANDO.includes(e.code) && (f === 'jugando' || f === 'exito_mision' || f === 'tema')) { e.preventDefault(); teclas.current.add(e.code); pulsadas.current.add(e.code); }
    };
    const arriba = e => {
      if (e.code === 'Space') { if (sRef.current.espacioAbajo) e.preventDefault(); enviar({ tipo: 'foto', abajo: false }); }
      teclas.current.delete(e.code);
    };
    const perder = () => { if (espectadorRef.current) return; teclas.current.clear(); tactil.current.izq = tactil.current.der = false; tactil.current.pend = 0; enviar({ tipo: 'foto', abajo: false }); if (sRef.current.fase === 'jugando') enviar({ tipo: 'pausar' }); };
    const ocultar = () => { if (document.hidden) perder(); };
    window.addEventListener('keydown', abajo); window.addEventListener('keyup', arriba); window.addEventListener('blur', perder); document.addEventListener('visibilitychange', ocultar);
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); window.removeEventListener('blur', perder); document.removeEventListener('visibilitychange', ocultar); };
  }, [espectador, espectadorRef, enviar, alternarPausa]);

  // Sonidos y avisos según lo que cambia en el estado (solo los de `sonido.js`: foto, éxito, choque y un «clic» al subir el combo).
  const previo = useRef({ fotos: 0, fase: inicial.fase, sin: 0, combo: 1, ev: 0 });
  useEffect(() => {
    const p = previo.current;
    if (s.fotos.length > p.fotos) sonidos.elegir();
    if (s.combo > p.combo) setTimeout(() => sonidos.clic(), 120); // el «clic» del combo suena justo después de la foto
    if (s.sinObjetivo > p.sin) sonidos.clic(); // «sin objetivo»: ESPACIO sin ventana abierta
    if (s.evSeq > p.ev) {
      const nuevo = s.eventos.filter(e => e.id > p.ev).some(e => e.tipo === 'poco');
      if (nuevo) { sonidos.leop(2); if (!sinMovimiento()) { try { window.navigator.vibrate?.(35); } catch { /* sin vibración */ } } } // vibración leve (solo si el sistema no pide reducir movimiento)
    }
    if (s.fase !== p.fase) { if (s.fase === 'fallo') sonidos.fallo(); else if (s.fase === 'exito_mision') sonidos.exito(); else if (s.fase === 'cinematica' || s.fase === 'ficha') sonidos.leop(1); }
    previo.current = { fotos: s.fotos.length, fase: s.fase, sin: s.sinObjetivo, combo: s.combo, ev: s.evSeq };
  }, [s.fotos.length, s.fase, s.sinObjetivo, s.combo, s.evSeq, s.eventos]);

  // Récord de la etapa (puntos de las misiones cumplidas): se compara en el motor y se guarda al cerrar cada misión.
  const record = useMemo(() => compararRecord(s.puntosTotal, recordBase), [s.puntosTotal, recordBase]);
  useEffect(() => { if (s.fase === 'exito_mision' && record.record > recordBase) guardarRecord(record.record); }, [s.fase, record, recordBase]);

  // Cierre de la etapa: vuelca el resultado en el estado de la misión (una sola vez) y avisa a la fase.
  const terminar = () => {
    if (cerrado.current) return;
    cerrado.current = true;
    const n = sRef.current.fase === 'omitida' ? sRef.current : pasoInsercion(sRef.current, { tipo: 'continuar' });
    sRef.current = n; setS(n);
    setEstado(e => aplicarInsercion06(e, n));
    alTerminar();
  };
  const arrastrar = e => {
    const a = arrastre.current, el = escenaRef.current;
    if (!a || a.id !== e.pointerId || !el) return;
    const r = el.getBoundingClientRect(), aspecto = r.width / Math.max(1, r.height), alto = Math.max(ALTO_NECESARIO, ANCHO_NECESARIO / aspecto);
    tactil.current.pend += (e.clientX - a.x) * (alto / Math.max(1, r.height)); a.x = e.clientX;
  };
  const soltarArrastre = () => { arrastre.current = null; };

  const enJuego = s.fase === 'jugando' || s.fase === 'pausa';
  const hayEscena = webgl && s.fase !== 'omitida';
  const escena = useMemo(() => hayEscena
    ? <Suspense fallback={<div className="ins-cargando">{tr('e06.Insercion.cargando')}</div>}><Insercion3D estadoRef={sRef} destino={inicial.destino} flotantesRef={flotantesRef} /></Suspense> : null, [hayEscena, inicial.destino, idioma]); // eslint-disable-line react-hooks/exhaustive-deps
  // Líneas de velocidad: posiciones y tiempos fijos (sutiles; se intensifican con el número de misión).
  const lineas = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ left: `${(i * 7.3 + (i % 3) * 3.1) % 100}%`, dur: `${(.85 + (i % 5) * .23).toFixed(2)}s`, delay: `${(-((i * .37) % 1.7)).toFixed(2)}s`, alto: `${10 + (i % 4) * 6}vh` })), []);
  const cerrable = puedeCerrar(s), ventana = s.ventana, fracVentana = ventana ? acotar(ventana.restante / (ventana.total || C.VENTANA_FOTO_S), 0, 1) : 0;
  const destino = s.destino === 'jupiter' ? tr('e06.Insercion.jupiter') : tr('e06.Insercion.luna');
  const esChoque = s.motivo?.tipo === 'choque';
  const recientes = s.fotos.slice(-8);
  const conAmbiente = ['tema', 'jugando', 'pausa'].includes(s.fase); // efectos de pantalla (líneas de velocidad, estática)
  const calidadFlash = s.ultimaFoto?.calidad ? `q-${s.ultimaFoto.calidad.toLowerCase()}` : '';

  return <section className={`insercion insercion-${s.fase}`} data-fase={s.fase} data-mision={s.numero} data-destino={s.destino} data-tema={s.tema.id}>
    <header className="ins-header">
      <div><span>{tr('e06.Insercion.etapa')}</span><h1>{tr('e06.Insercion.h1a')} <em>{tr('e06.Insercion.h1b')}</em></h1></div>
      <div><button type="button" aria-label={s.fase === 'pausa' ? tr('e06.Insercion.reanudar_etapa') : tr('e06.Insercion.pausar_etapa')} title={tr('e06.Insercion.pausa_titulo')} disabled={!enJuego} onClick={alternarPausa}>{s.fase === 'pausa' ? '▶' : 'Ⅱ'}</button></div>
    </header>
    <div className="ins-escena" ref={escenaRef}>
      {escena}
      {conAmbiente && <div className="ins-lineas" aria-hidden="true" style={{ '--k': Math.min(s.numero, 8) }}>{lineas.map((l, i) => <i key={i} style={{ left: l.left, height: l.alto, animationDuration: l.dur, animationDelay: l.delay }} />)}</div>}
      {conAmbiente && s.tema.estatica && <div className="ins-estatica" aria-hidden="true" />}
      <div className="ins-flotantes" ref={flotantesRef} aria-hidden="true" />
      {enJuego && <div className="ins-arrastre" onPointerDown={e => { arrastre.current = { id: e.pointerId, x: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={arrastrar} onPointerUp={soltarArrastre} onPointerCancel={soltarArrastre} />}
      {(enJuego || s.fase === 'tema' || s.fase === 'exito_mision' || s.fase === 'fallo') && <div className="ins-hud">
        <div className="ins-panel">
          <div className="ins-cab">
            <b className="ins-mision">{tr('e06.Insercion.mision', { n: s.numero })}</b>
            <span className="ins-pts" aria-label={tr('e06.Insercion.pts_aria', { p: fmt(s.puntosTotal + s.puntos, idioma), c: s.combo })}>{fmt(s.puntosTotal + s.puntos, idioma)}<em key={`c${s.combo}`} className={`ins-combo x${s.combo}`}>×{s.combo}</em></span>
          </div>
          <div className="ins-datos">
            <span>{tr('e06.Insercion.cuerpos')}<b>{cuerposPorSuperar(s)}</b></span>
            <span>{tr('e06.Insercion.fotos')}<b>{s.fotosMision}/{s.cuerpos.length}</b></span>
            <span>{tr('e06.Insercion.misiones')}<b>{Math.min(s.cumplidas, C.MISIONES_PARA_CERRAR)}/{C.MISIONES_PARA_CERRAR}</b></span>
          </div>
          <div className={`ins-ventana ${ventana ? 'abierta' : ''}`} role="status" aria-label={ventana ? tr('e06.Insercion.ventana_abierta') : tr('e06.Insercion.ventana_cerrada')}>
            <span>{ventana ? tr('e06.Insercion.ventana_titulo_abierta') : tr('e06.Insercion.ventana_titulo')}</span>
            <div className="ins-barra"><i style={{ width: `${Math.round(fracVentana * 100)}%` }} /></div>
          </div>
          <div className="ins-memoria" aria-label={tr('e06.Insercion.memoria_aria', { n: s.fotos.length, f: s.fotos.length === 1 ? tr('e06.Insercion.foto_s') : tr('e06.Insercion.fotos_pl') })}>
            <span>{tr('e06.Insercion.memoria', { n: s.fotos.length })}</span>
            <div>{s.fotos.length === 0 ? <em>{tr('e06.Insercion.vacia')}</em> : <>
              {s.fotos.length > recientes.length && <small>+{s.fotos.length - recientes.length}</small>}
              {recientes.map(f => <i key={f.n} className={`ins-mini q-${f.calidad.toLowerCase()}`} style={{ '--c': f.color }} title={tr('e06.Insercion.foto_titulo', { n: f.n, clase: f.clase, calidad: tr(`e06.calidad.${f.calidad}`), m: f.mision })}><b>{f.n}</b></i>)}
            </>}</div>
          </div>
        </div>
        {cerrable && (s.fase === 'jugando' || s.fase === 'pausa') && <button type="button" className="ins-cerrar" onClick={terminar}>{tr('e06.Insercion.continuar07')}</button>}
      </div>}
      {s.fase === 'jugando' && <>
        {/* Leyenda de teclado (solo en pantallas con mouse); los botones en pantalla también funcionan con mouse o touchpad. */}
        <div className="ins-teclas" aria-hidden="true">
          <span><kbd>A</kbd><kbd>D</kbd> {tr('e06.Insercion.o')} <kbd>←</kbd><kbd>→</kbd> {tr('e06.Insercion.mover')}</span><span><kbd>{tr('e06.Insercion.espacio')}</kbd> {tr('e06.Insercion.foto_s')}</span><span><kbd>P</kbd> {tr('e06.Insercion.o')} <kbd>Esc</kbd> {tr('e06.Insercion.pausa')}</span>
        </div>
        <div className="ins-tactil">
          <div className="ins-lados">
            <Mantener className="ins-boton" etiqueta={tr('e06.Insercion.izq')} alAprieta={() => { tactil.current.izq = true; }} alSuelta={() => { tactil.current.izq = false; }}>◄</Mantener>
            <Mantener className="ins-boton" etiqueta={tr('e06.Insercion.der')} alAprieta={() => { tactil.current.der = true; }} alSuelta={() => { tactil.current.der = false; }}>►</Mantener>
          </div>
          <Mantener className={`ins-boton ins-capturar ${ventana ? 'lista' : ''}`} etiqueta={tr('e06.Insercion.capturar_foto')} alAprieta={() => enviar({ tipo: 'foto', abajo: true })} alSuelta={() => enviar({ tipo: 'foto', abajo: false })}>📸<small>{tr('e06.Insercion.capturar')}</small></Mantener>
        </div>
      </>}
      {/* Destello del obturador: más claro y largo con una PERFECTA, más tenue con una JUSTA. */}
      {s.fotos.length > 0 && <div key={`f${s.fotos.length}`} className={`ins-flash ${calidadFlash}`} aria-hidden="true" />}
      {s.fase === 'fallo' && s.motivo?.tipo === 'choque' && <div key={`c${s.fallos}`} className="ins-flash choque" aria-hidden="true" />}

      {s.fase === 'cinematica' && <Cinematica s={s} real={real} alSaltar={() => enviar({ tipo: 'cinematica_saltar' })} />}

      {s.fase === 'tema' && <TarjetaTema s={s} />}

      {s.fase === 'ficha' && <div className="ins-modal"><DialogoIO titulo={tr('e06.Insercion.ficha.titulo')} accion={tr('e06.Insercion.ficha.accion')} alSeguir={() => enviar({ tipo: 'empezar' })}>
        <h3 className="ins-objetivo">{tr('e06.Insercion.ficha.h3')}</h3>
        <p>{tr('e06.Insercion.ficha.p1a', { destino })}<b>{tr('e06.Insercion.ficha.p1b')}</b>{tr('e06.Insercion.ficha.p1c')}</p>
        <ul className="ins-reglas">
          <li><b>{tr('e06.Insercion.ficha.esquiva')}</b> {tr('e06.Insercion.ficha.esquiva_a')} {s.destino === 'jupiter' ? tr('e06.Insercion.ficha.esquiva_j') : tr('e06.Insercion.ficha.esquiva_l')} {tr('e06.Insercion.ficha.esquiva_b')}</li>
          <li><b>{tr('e06.Insercion.ficha.foto')}</b> {tr('e06.Insercion.ficha.foto_a')}<b>{tr('e06.Insercion.ficha.foto_b')}</b>{tr('e06.Insercion.ficha.foto_c')}</li>
          <li><b>{tr('e06.Insercion.ficha.puntos')}</b> {tr('e06.Insercion.ficha.puntos_a')}<b>{tr('e06.por_poco', { pts: C.POR_POCO_PTS })}</b>.</li>
          <li><b>{tr('e06.Insercion.ficha.cumplida')}</b> {tr('e06.Insercion.ficha.cumplida_a')}</li>
        </ul>
        <p>{tr('e06.Insercion.ficha.nec_a')}<b>{tr('e06.Insercion.ficha.nec_b', { m: C.MISIONES_PARA_CERRAR })}</b>{tr('e06.Insercion.ficha.nec_c')}<b>{tr('e06.Insercion.ficha.nec_d')}</b>{tr('e06.Insercion.ficha.nec_e')}</p>
        <p className="ins-controles"><b>{tr('e06.Insercion.ficha.teclado')}</b> {tr('e06.Insercion.ficha.teclado_a')}<br /><b>{tr('e06.Insercion.ficha.mouse')}</b> {tr('e06.Insercion.ficha.mouse_a')}</p>
      </DialogoIO></div>}

      {s.fase === 'pausa' && <div className="ins-modal"><DialogoIO titulo={tr('e06.Insercion.pausa_t')} accion={tr('e06.Insercion.reanudar')} alSeguir={() => enviar({ tipo: 'reanudar' })}>
        <p>{tr('e06.Insercion.pausa_p', { n: s.numero, c: cuerposPorSuperar(s), cuerpos: cuerposPorSuperar(s) === 1 ? tr('e06.Insercion.cuerpo_s') : tr('e06.Insercion.cuerpos_pl') })}</p></DialogoIO></div>}

      {s.fase === 'exito_mision' && <TarjetaResultado s={s} record={record} cerrable={cerrable} alSiguiente={() => enviar({ tipo: 'siguiente' })} alContinuar={terminar} />}

      {s.fase === 'fallo' && <div className="ins-modal"><DialogoIO alerta titulo={esChoque ? tr('e06.Insercion.fallo.choque') : tr('e06.Insercion.fallo.foto')} accion={tr('e06.Insercion.fallo.reintentar', { n: s.numero })} alSeguir={() => enviar({ tipo: 'reintentar' })}>
        <p><b>{s.motivo?.texto}</b></p>
        {s.perdidos > 0 && <p className="ins-costo">{tr('e06.Insercion.fallo.pierdes', { p: fmt(s.perdidos, idioma) })}</p>}
        <p className="ins-costo">{tr('e06.Insercion.fallo.costo', { f: s.fallos })}</p>
        {cerrable && <button type="button" className="ins-secundario" onClick={terminar}>{tr('e06.Insercion.continuar07')}</button>}
      </DialogoIO></div>}

      {s.fase === 'omitida' && <div className="ins-modal"><DialogoIO alerta titulo={tr('e06.Insercion.omitida.titulo')} accion={tr('e06.Insercion.omitida.accion')} alSeguir={terminar}>
        <p>{s.motivo?.texto}</p><p>{tr('e06.Insercion.omitida.p')}</p></DialogoIO></div>}
    </div>
  </section>;
}

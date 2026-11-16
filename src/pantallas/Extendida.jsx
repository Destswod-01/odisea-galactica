// Etapa 08 «Decisiones de misión» — estilo Reigns (4 barras: Energía, Térmica, Propelente, Ciencia + cartas deslizables y disposición final).
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  aplicarReigns08,
  BARRAS_REIGNS,
  crearReigns08,
  opcionesFinalReigns,
  pasoReigns08,
  preverIndicadores,
} from '../motor/reigns08.js';
import DialogoIO from '../componentes/DialogoIO.jsx';
import { useIdioma, useT } from '../i18n/idioma.js';
import { useVotos08 } from '../red/votos08.js';
import { sonidos } from '../sonido.js';
import './extendida.css';

const ICONOS = {
  energia: '⚡',
  termica: '🌡️',
  propelente: '⛽',
  ciencia: '🔬',
};

const UMBRAL_SWIPE = 70;

export default function Extendida({ mision, estado, setEstado, setExtras, alTerminar }) {
  const t = useT();
  const [idioma] = useIdioma();
  const [s, setS] = useState(() => crearReigns08(estado, mision));
  // En sala (≥2 conectados) cada carta se vota en equipo; en Solo `eq.activo` es false y todo sigue igual.
  const eq = useVotos08({ s, setS });
  const [focoLado, setFocoLado] = useState(null); // 0 | 1 | null
  const [dragX, setDragX] = useState(0);
  const puntero = useRef(null);
  const cerrado = useRef(false);

  const carta = s.fase === 'jugando' ? s.mazo[s.indice] : null;
  const opcionesFin = useMemo(() => (s.fase === 'final' ? opcionesFinalReigns(s) : []), [s]);

  const yaVote = eq.activo && eq.miVoto != null;

  const elegir = (lado) => {
    if (eq.activo) {
      if (yaVote || s.fase !== 'jugando') return;
      sonidos.elegir();
      setDragX(0);
      setFocoLado(null);
      eq.votar(lado);
      return;
    }
    sonidos.elegir();
    setDragX(0);
    setFocoLado(null);
    setS(prev => pasoReigns08(prev, { tipo: 'elegir', lado }));
  };

  const elegirFinal = (op, idx) => {
    if (eq.activo) { sonidos.elegir(); eq.finalizar(idx); return; }
    sonidos.elegir();
    setDragX(0);
    setFocoLado(null);
    setS(prev => pasoReigns08(prev, { tipo: 'finalizar', id: op.id, lado: idx }));
  };

  const avanzar = () => {
    sonidos.clic();
    if (eq.activo) { eq.avanzar(); return; }
    setS(prev => pasoReigns08(prev, { tipo: 'siguiente' }));
  };

  const terminar = () => {
    if (cerrado.current) return;
    cerrado.current = true;
    const { estado: nuevoEst, extras } = aplicarReigns08(estado, s);
    setEstado(() => nuevoEst);
    if (setExtras) {
      setExtras(x => ({
        coincidenciasReales: (x.coincidenciasReales || 0) + (extras.coincidenciasReales || 0),
        desorbito: x.desorbito || !!extras.desorbito,
      }));
    }
    alTerminar();
  };

  // Teclado ← / → y Enter/Espacio.
  useEffect(() => {
    const tecla = (e) => {
      if (e.target?.matches?.('input,textarea,select')) return;
      if (s.fase === 'jugando' && carta) {
        if (e.code === 'ArrowLeft') { e.preventDefault(); elegir(0); }
        else if (e.code === 'ArrowRight') { e.preventDefault(); elegir(1); }
      } else if (s.fase === 'consecuencia') {
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); avanzar(); }
      } else if (s.fase === 'final') {
        if (e.code === 'ArrowLeft' && opcionesFin[0]) { e.preventDefault(); elegirFinal(opcionesFin[0], 0); }
        else if (e.code === 'ArrowRight' && opcionesFin[1]) { e.preventDefault(); elegirFinal(opcionesFin[1], 1); }
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [s.fase, carta, opcionesFin, eq.activo, eq.miVoto]);

  // Indicadores previos sobre las 4 barras según la opción marcada o la dirección del arrastre.
  const ladoPreview = dragX <= -22 ? 0 : dragX >= 22 ? 1 : focoLado;
  const indicadores = useMemo(() => {
    if (s.fase !== 'jugando' || !carta || ladoPreview == null) return {};
    return preverIndicadores(carta.opciones[ladoPreview]?.deltas);
  }, [s.fase, carta, ladoPreview]);

  const alBajarPuntero = (e) => {
    if (s.fase !== 'jugando' || yaVote || e.target?.closest?.('button')) return;
    puntero.current = { id: e.pointerId, x0: e.clientX };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const alMoverPuntero = (e) => {
    if (!puntero.current || puntero.current.id !== e.pointerId) return;
    setDragX(Math.max(-140, Math.min(140, e.clientX - puntero.current.x0)));
  };
  const alSoltarPuntero = (e) => {
    if (!puntero.current || puntero.current.id !== e.pointerId) return;
    const dx = e.clientX - puntero.current.x0;
    puntero.current = null;
    if (dx <= -UMBRAL_SWIPE) elegir(0);
    else if (dx >= UMBRAL_SWIPE) elegir(1);
    else setDragX(0);
  };

  return (
    <section
      className={`reigns reigns-${s.fase}`}
      data-fase={s.fase}
      data-ano={s.ano}
      data-carta={carta?.id || ''}
      aria-label={t('e08.reigns.titulo')}
    >
      <header className="rg-header">
        <div>
          <span>{t('e08.reigns.etapa')}</span>
          <h1>{t('e08.reigns.titulo')} <em>{t('e08.reigns.tituloEm')}</em></h1>
        </div>
        <div className="rg-ano">
          <b>{s.misionId.toUpperCase()}</b>
          <span>{t('e08.reigns.ano', { ano: s.ano, total: s.mazo.length })}</span>
        </div>
      </header>

      {/* 4 medidores estilo Reigns con puntos indicadores antes de elegir */}
      <div className="rg-barras" role="region" aria-label={t('e08.reigns.titulo')}>
        {BARRAS_REIGNS.map((k) => {
          const val = Math.round(s.barras[k] ?? 0);
          const crit = k !== 'ciencia' && val <= 20;
          const ind = indicadores[k];
          return (
            <div key={k} className={`rg-med ${crit ? 'critica' : ''}`} data-barra={k}>
              <div className="rg-med-top">
                <span className="rg-ind" aria-hidden="true">
                  {ind === 'grande' ? '◆' : ind === 'chico' ? '●' : ''}
                </span>
                <span className="rg-ico" aria-hidden="true">{ICONOS[k]}</span>
                <b>{val}%</b>
              </div>
              <div className="rg-pista"><i style={{ width: `${val}%` }} /></div>
              <small>{t(`e08.reigns.barra.${k}`)}</small>
            </div>
          );
        })}
      </div>

      <div className="rg-escenario">
        {s.fase === 'jugando' && carta && (
          <div className="rg-carta-wrap">
            <article
              className={`rg-carta ${dragX < -22 ? 'izq' : dragX > 22 ? 'der' : ''}`}
              style={{ transform: `translateX(${dragX}px) rotate(${(dragX * 0.08).toFixed(2)}deg)` }}
              onPointerDown={alBajarPuntero}
              onPointerMove={alMoverPuntero}
              onPointerUp={alSoltarPuntero}
              onPointerCancel={alSoltarPuntero}
            >
              {dragX < -22 && <div className="rg-sello izq">{carta.opciones[0].texto}</div>}
              {dragX > 22 && <div className="rg-sello der">{carta.opciones[1].texto}</div>}
              <span className="rg-cat">{t(carta.etiqueta)}</span>
              <div className="rg-icono" aria-hidden="true">{carta.icono}</div>
              <h2>{carta.titulo}</h2>
              <p>{carta.texto}</p>
              <small className="rg-pista-swipe">{t('e08.reigns.desliza')}</small>
            </article>

            <div className="rg-elecciones">
              {[0, 1].map((lado) => {
                const op = carta.opciones[lado];
                return (
                  <button
                    key={lado}
                    type="button"
                    className={`rg-btn-op ${lado === 0 ? 'izq' : 'der'} ${eq.activo && eq.miVoto === lado ? 'votada' : ''}`}
                    disabled={yaVote}
                    onMouseEnter={() => setFocoLado(lado)}
                    onMouseLeave={() => setFocoLado(null)}
                    onFocus={() => setFocoLado(lado)}
                    onBlur={() => setFocoLado(null)}
                    onClick={() => elegir(lado)}
                  >
                    <span>{lado === 0 ? '← ' : ''}{op.texto}{lado === 1 ? ' →' : ''}</span>
                  </button>
                );
              })}
            </div>

            {eq.activo && (
              <div className="rg-votacion" role="status" aria-live="polite">
                <b>{t('e08.voto.titulo')}</b>
                <small>{t('e08.voto.regla', { req: eq.requisito, n: eq.n })}</small>
                <ul>
                  {eq.jugadores.map((j) => (
                    <li key={j.id} className={j.votado ? 'listo' : ''}>
                      <span aria-hidden="true">{j.votado ? '✔' : '…'}</span> {j.nombre}{j.yo ? ` ${t('e08.voto.tu')}` : ''} · {j.votado ? t('e08.voto.yaVoto') : t('e08.voto.pensando')}
                    </li>
                  ))}
                </ul>
                <small>{yaVote ? t('e08.voto.tuVoto') : ''} {t('e08.voto.espera', { seg: eq.segundos })}</small>
              </div>
            )}
          </div>
        )}

        {s.fase === 'consecuencia' && s.ultima && (
          <article className="rg-carta rg-consecuencia" role="status">
            <span className="rg-cat">{s.ultima.carta.icono} {s.ultima.opcion.texto}</span>
            <p className={`rg-veredicto ${s.ultima.acierto ? 'ok' : 'mal'}`}>
              {s.ultima.equipo
                ? (s.ultima.acierto ? t('e08.voto.aciertaEquipo') : t('e08.voto.falloEquipo'))
                : (s.ultima.acierto ? t('e08.voto.aciertaSolo') : t('e08.voto.falloSolo'))}
            </p>
            {s.ultima.equipo && (
              <small className="rg-conteo">
                {t('e08.voto.conteo', { ok: s.ultima.equipo.votosOk, n: s.ultima.equipo.votantes, req: s.ultima.equipo.requisito })}
              </small>
            )}
            <p className="rg-cons-txt">{s.ultima.opcion.consecuencia}</p>
            <div className="rg-deltas">
              {BARRAS_REIGNS.map((k) => {
                const d = s.ultima.deltas[k] || 0;
                if (!d) return null;
                return (
                  <span key={k} className={d > 0 ? 'pos' : 'neg'}>
                    {ICONOS[k]} {d > 0 ? `+${d}` : d}%
                  </span>
                );
              })}
            </div>
            {s.ultima.carta.opciones[s.ultima.carta.correcta]?.vidaReal && (
              <p className="rg-real">
                <b>{t('e08.voto.datoReal')}</b> {s.ultima.carta.opciones[s.ultima.carta.correcta].vidaReal}
              </p>
            )}
            {s.ultima.finAnticipado && <p className="rg-alerta">{t('e08.reigns.finAnticipado')}</p>}
            <button type="button" className="primario rg-seguir" onClick={avanzar}>
              {s.ultima.finAnticipado || s.indice + 1 >= s.mazo.length
                ? t('e08.reigns.verEpilogo')
                : t('e08.reigns.siguiente')}
            </button>
          </article>
        )}

        {s.fase === 'final' && (
          <article className="rg-carta rg-final">
            <span className="rg-cat">{t('e08.reigns.cat.final')}</span>
            <div className="rg-icono" aria-hidden="true">{s.destino === 'jupiter' ? '🪐' : '🌑'}</div>
            <h2>{t('e08.reigns.finalTitulo')}</h2>
            <p>{opcionesFin.length === 1 && opcionesFin[0].forzado ? t('e08.reigns.finalForzado') : t('e08.reigns.finalTexto')}</p>
            {eq.activo && <small className="rg-conteo">{t('e08.voto.finalEquipo')}</small>}
            <div className={`rg-elecciones ${opcionesFin.length === 1 ? 'unica' : ''}`}>
              {opcionesFin.map((op, idx) => (
                <button
                  key={op.id}
                  type="button"
                  className={`rg-btn-op ${op.protege ? 'primario' : ''}`}
                  onClick={() => elegirFinal(op, idx)}
                >
                  <b>{op.texto}</b>
                  <small>{op.consecuencia}</small>
                </button>
              ))}
            </div>
          </article>
        )}

        {s.fase === 'cierre' && s.epilogo && (
          <article className="rg-carta rg-cierre">
            <span className="rg-cat">{t('e08.cierre.kicker', { final: s.finalElegido?.titulo || '' })}</span>
            <h2>{s.epilogo.titulo}</h2>
            <p>{s.epilogo.texto}</p>
            <p className="rg-detalle">{s.epilogo.detalle}</p>
            {s.finalElegido?.vidaReal && (
              <p className="rg-real"><b>{t('e08.cierre.vidaRealTitulo')}</b> {s.finalElegido.vidaReal}</p>
            )}
            <div className="rg-resumen-barras">
              <div><small>{t('e08.cierre.anos')}</small><b>{s.ano}</b></div>
              <div><small>{t('e08.cierre.datos')}</small><b>{Math.round(s.barras.ciencia)}%{idioma ? '' : ''}</b></div>
              <div><small>{t('e08.cierre.salud')}</small><b>{Math.round((s.barras.energia + s.barras.termica) / 2)}%</b></div>
            </div>
            <button type="button" className="primario rg-seguir" onClick={terminar}>
              {t('e08.cierre.verInforme')}
            </button>
          </article>
        )}
      </div>

      {s.fase === 'ficha' && (
        <div className="rg-modal">
          <DialogoIO
            titulo={t('e08.reigns.fichaTitulo')}
            accion={t('e08.reigns.fichaAccion')}
            alSeguir={() => { sonidos.elegir(); if (eq.activo) eq.avanzar(); else setS(prev => pasoReigns08(prev, { tipo: 'empezar' })); }}
          >
            <p>{t('e08.reigns.fichaP1')}</p>
            <p>{t('e08.reigns.fichaP2')}</p>
            {eq.activo && <p>{t('e08.voto.esperaInicio')}</p>}
          </DialogoIO>
        </div>
      )}
    </section>
  );
}

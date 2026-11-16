// Etapa 07 «Bajada de datos» — Tetris completo (10×20) sobre 3 pasadas de la Red de Espacio Profundo (DSN).
// En equipo, cada pieza la maneja un jugador distinto por turnos (red/turnos.js); los demás ven la partida en vivo.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  aplicarBajada07,
  celdasPieza,
  COLUMNAS,
  crearBajada07,
  filaDeCaida,
  FILAS,
  intervaloCaida,
  PASADAS_DSN,
  pasoBajada,
  ROTACIONES,
  TETROMINOS,
} from '../motor/bajada07.js';
import DialogoIO from '../componentes/DialogoIO.jsx';
import { useIdioma, useT } from '../i18n/idioma.js';
import { titularDePieza, useTurnos } from '../red/turnos.js';
import { enviar as enviarRed, useSala } from '../red/cliente.js';
import { sonidos } from '../sonido.js';
import './operacion07.css';

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n, id = 'es') => Math.round(n || 0).toLocaleString(id === 'en' ? 'en-US' : 'es');

// Pieza anunciada, recortada a su caja.
const MiniPieza = memo(function MiniPieza({ tipo }) {
  const celdas = tipo ? ROTACIONES[tipo][0] : [];
  const minF = Math.min(...celdas.map(([f]) => f), 9);
  const minC = Math.min(...celdas.map(([, c]) => c), 9);
  return (
    <div className="bj-mini" aria-hidden="true">
      {celdas.map(([f, c], i) => (
        <i key={i} style={{ gridRow: f - minF + 1, gridColumn: c - minC + 1, background: TETROMINOS[tipo].color }} />
      ))}
    </div>
  );
});

// Botón táctil que repite mientras se mantiene pulsado (mover y bajar).
function BotonCtl({ etiqueta, simbolo, alPulsar, repetir = false, clase = '' }) {
  const timer = useRef(null);
  const parar = () => { clearTimeout(timer.current); clearInterval(timer.current); timer.current = null; };
  useEffect(() => parar, []);
  return (
    <button
      type="button"
      className={`bj-ctl ${clase}`}
      aria-label={etiqueta}
      title={etiqueta}
      onPointerDown={(e) => {
        e.preventDefault();
        alPulsar();
        if (repetir) { parar(); timer.current = setTimeout(() => { timer.current = setInterval(alPulsar, 85); }, 240); }
      }}
      onPointerUp={parar}
      onPointerLeave={parar}
      onPointerCancel={parar}
      onContextMenu={(e) => e.preventDefault()}
    >
      {simbolo}
    </button>
  );
}

export default function Operacion07({ mision, diseno, piezas, resumen, estado, setEstado, alTerminar, opciones }) {
  const t = useT();
  const [idioma] = useIdioma();
  const [s, setS] = useState(() => crearBajada07(estado, mision, diseno, piezas, resumen, opciones));
  const [toast, setToast] = useState(null);
  const cerrado = useRef(false);
  const jugSeqRef = useRef(0);
  const faseRef = useRef(s.fase);

  // Turnos en línea: quien tiene la pieza la maneja; los demás reciben instantáneas y no simulan.
  const { enRed, titular, soyTitular, espectadorRef, jugadores } = useTurnos({ fase: 'operacion', s, setS });
  // En red, la partida no arranca hasta que todos los conectados entraron a la etapa (si no, quien llega tarde se traba).
  // Cada uno avisa por «presencia» (marcada con la partida, para no confundir una misión anterior en la misma sala).
  // Si alguien no llega en 20 s, se puede empezar de todos modos.
  const salaRed = useSala().sala;
  const marca = `etapa07:${salaRed?.estado?.partida ?? 0}`;
  useEffect(() => { if (enRed) enviarRed({ t: 'presencia', estacion: marca }); }, [enRed, marca]);
  const [paciencia, setPaciencia] = useState(false);
  useEffect(() => { if (!enRed) return undefined; const id = setTimeout(() => setPaciencia(true), 20000); return () => clearTimeout(id); }, [enRed]);
  const faltanRed = enRed ? (salaRed?.jugadores ?? []).filter((j) => j.conectado !== false && salaRed?.estado?.presencia?.[j.id] !== marca) : [];
  const todosListos = !enRed || paciencia || faltanRed.length === 0;

  const accion = useCallback((a) => {
    if (espectadorRef.current) return;
    setS((prev) => pasoBajada(prev, a));
  }, [espectadorRef]);

  // Caída por gravedad: solo en el jugador en turno; se reinicia con cada pieza nueva.
  const intervalo = intervaloCaida(s);
  useEffect(() => {
    if (s.fase !== 'jugando' || !soyTitular) return undefined;
    const id = setInterval(() => accion({ tipo: 'gravedad' }), intervalo);
    return () => clearInterval(id);
  }, [s.fase, s.n, soyTitular, intervalo, accion]);

  // Teclado: ← → mover, ↑/X rotar, Z rotar al revés, ↓ bajar, Espacio caída dura.
  useEffect(() => {
    const mapa = { ArrowLeft: { tipo: 'izq' }, ArrowRight: { tipo: 'der' }, ArrowUp: { tipo: 'rotar' }, KeyX: { tipo: 'rotar' }, KeyZ: { tipo: 'rotar', dir: -1 }, ArrowDown: { tipo: 'suave' }, Space: { tipo: 'dura' } };
    const tecla = (e) => {
      if (e.target?.matches?.('input,textarea,select')) return;
      const a = mapa[e.code];
      if (!a || s.fase !== 'jugando') return;
      e.preventDefault();
      if (e.code === 'Space' && (e.repeat || e.target?.tagName === 'BUTTON')) return;
      accion(a);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [s.fase, accion]);

  // Sonidos y aviso flotante según lo que cambió en el estado (también cuando llega por la red).
  useEffect(() => {
    const j = s.ultimaJugada;
    if (!j || j.seq === jugSeqRef.current) return undefined;
    jugSeqRef.current = j.seq;
    sonidos.exito();
    const est = PASADAS_DSN[s.pasada] || PASADAS_DSN[0];
    setToast({
      id: j.seq,
      combo: j.lineas,
      texto: j.lineas >= 2 ? t('e07.bajada.combo', { c: j.lineas, mbit: j.mbit }) : t('e07.bajada.bajada', { mbit: j.mbit, estacion: est.nombre }),
    });
    const timer = setTimeout(() => setToast((cur) => (cur?.id === j.seq ? null : cur)), 1700);
    return () => clearTimeout(timer);
  }, [s.ultimaJugada, s.pasada, t]);
  useEffect(() => {
    if (faseRef.current === s.fase) return;
    faseRef.current = s.fase;
    if (s.fase === 'desbordada') sonidos.fallo();
    else if (s.fase === 'pasada_ok' || s.fase === 'final') sonidos.exito();
  }, [s.fase]);

  // Tablero con la pieza en juego y su sombra superpuestas.
  const celdas = useMemo(() => {
    const m = s.tablero.map((fila) => fila.map((c) => (c ? { color: c.color } : null)));
    if (s.pieza && s.fase === 'jugando') {
      const color = TETROMINOS[s.pieza.tipo].color;
      const sombra = filaDeCaida(s.tablero, s.pieza);
      if (sombra !== s.pieza.f) {
        for (const [f, c] of celdasPieza({ ...s.pieza, f: sombra })) if (f >= 0 && !m[f][c]) m[f][c] = { color, sombra: true };
      }
      for (const [f, c] of celdasPieza(s.pieza)) if (f >= 0 && f < FILAS) m[f][c] = { color, activa: true };
    }
    return m;
  }, [s.tablero, s.pieza, s.fase]);

  const terminar = () => {
    if (cerrado.current) return;
    cerrado.current = true;
    setEstado((e) => aplicarBajada07(e, s, resumen));
    alTerminar();
  };

  // Nombres: en línea, el de la sala; en solo, «Tú».
  const nombreDe = (j) => (enRed ? (j?.nombre || '—') : t('e07.bajada.tu'));
  const nombreActual = nombreDe(titular);
  const proximo = nombreDe(enRed ? titularDePieza(jugadores, s.n + 1) : null);

  const est = PASADAS_DSN[s.pasada] || PASADAS_DSN[0];
  const frac = acotar(s.lineasPasada / Math.max(1, s.lineasMeta), 0, 1);
  const turnoTxt = !enRed ? t('e07.bajada.turnoSolo') : soyTitular ? t('e07.bajada.turnoTuyo') : t('e07.bajada.turnoDe', { nombre: nombreActual });

  return (
    <section
      className={`bajada bajada-${s.fase}`}
      data-fase={s.fase}
      data-pasada={s.pasada + 1}
      data-lineas={s.lineasPasada}
      data-meta={s.lineasMeta}
      data-turno={s.n}
      aria-label={t('e07.bajada.titulo')}
    >
      <header className="bj-header">
        <div>
          <span>{t('e07.bajada.etapa')}</span>
          <h1>{t('e07.bajada.titulo')} <em>{t('e07.bajada.tituloEm')}</em></h1>
        </div>
        <div className="bj-pasadas" role="status">
          {PASADAS_DSN.map((p, i) => (
            <span key={p.id} className={i === s.pasada ? 'activa' : i < s.pasada ? 'hecha' : ''}>
              <b>0{i + 1}</b> {p.nombre}
            </span>
          ))}
        </div>
      </header>

      <div className="bj-marcador">
        <div className="bj-estacion">
          <small>{t('e07.bajada.pasadaDe', { n: s.pasada + 1, total: PASADAS_DSN.length })} · {est.antena}</small>
          <strong>📡 {est.nombre}</strong>
        </div>
        <div className="bj-progreso">
          <div>
            <span>{t('e07.bajada.enviado')}: <b>{fmt(s.mbitPasada, idioma)} Mbit</b></span>
            <small>{t('e07.bajada.lineasMeta', { n: s.lineasPasada, meta: s.lineasMeta })}</small>
          </div>
          <div className="bj-barra"><i style={{ width: `${Math.round(frac * 100)}%` }} /></div>
        </div>
        {s.racha > 1 && <span className="bj-racha">{t('e07.bajada.racha', { n: s.racha })}</span>}
      </div>

      <div className="bj-cuerpo">
        <div className="bj-tablero-caja">
          <div className={`bj-turno ${enRed && soyTitular ? 'mio' : ''}`} role="status">{turnoTxt}</div>
          <div className="bj-grid" role="img" aria-label={t('e07.bajada.memoriaTitulo')} style={{ '--cols': COLUMNAS, '--filas': FILAS }}>
            {celdas.map((fila, f) => fila.map((c, col) => (
              <i
                key={`${f},${col}`}
                className={c ? (c.activa ? 'on activa' : c.sombra ? 'sombra' : 'on') : ''}
                style={c ? { '--c': c.color } : undefined}
              />
            )))}
          </div>
        </div>

        <aside className="bj-lado">
          <div className="bj-siguiente">
            <span>{t('e07.bajada.siguiente')}</span>
            <MiniPieza tipo={s.siguiente} />
            <small>{t('e07.bajada.leToca')}</small>
            <b data-testid="bj-proximo">{proximo}</b>
          </div>
          {/* Avisos de Mbit enviados: aquí, debajo de la siguiente pieza, para no tapar el tablero. */}
          {toast && (
            <div key={toast.id} className={`bj-toast ${toast.combo >= 2 ? 'combo' : ''}`} role="status">
              {toast.texto}
            </div>
          )}
        </aside>
      </div>

      <div className="bj-controles" role="group" aria-label={t('e07.bajada.teclas')}>
        <BotonCtl etiqueta={t('e07.bajada.ctlIzq')} simbolo="◀" repetir alPulsar={() => accion({ tipo: 'izq' })} />
        <BotonCtl etiqueta={t('e07.bajada.ctlRotar')} simbolo="⟳" alPulsar={() => accion({ tipo: 'rotar' })} />
        <BotonCtl etiqueta={t('e07.bajada.ctlDer')} simbolo="▶" repetir alPulsar={() => accion({ tipo: 'der' })} />
        <BotonCtl etiqueta={t('e07.bajada.ctlSuave')} simbolo="▼" repetir alPulsar={() => accion({ tipo: 'suave' })} />
        <BotonCtl etiqueta={t('e07.bajada.ctlDura')} simbolo="⤓" clase="dura" alPulsar={() => accion({ tipo: 'dura' })} />
      </div>
      <p className="bj-teclas">{t('e07.bajada.teclas')}</p>

      {s.fase === 'ficha' && (
        <div className="bj-modal">
          <DialogoIO
            titulo={t('e07.bajada.fichaTitulo')}
            accion={soyTitular && todosListos ? t('e07.bajada.fichaAccion') : undefined}
            alSeguir={() => { sonidos.elegir(); accion({ tipo: 'empezar' }); }}
          >
            <span className="bj-kicker">{t('e07.bajada.fichaKicker')}</span>
            <p>{t('e07.bajada.fichaP1')}</p>
            <ul className="bj-reglas">
              <li>{t('e07.bajada.fichaRegla1')}</li>
              <li>{t('e07.bajada.fichaRegla2')}</li>
              <li>{t('e07.bajada.fichaRegla3')}</li>
            </ul>
            {!todosListos && <p className="bj-espera" role="status">{t('e07.bajada.esperaJugadores', { nombres: faltanRed.map((j) => j.nombre).join(', ') })}</p>}
            {!soyTitular && todosListos && <p className="bj-espera">{t('e07.bajada.esperaInicio', { nombre: nombreActual })}</p>}
          </DialogoIO>
        </div>
      )}

      {(s.fase === 'pasada_ok' || s.fase === 'desbordada') && (() => {
        const res = s.resultadosPasadas.at(-1);
        const esUltima = s.pasada >= PASADAS_DSN.length - 1;
        const sig = PASADAS_DSN[s.pasada + 1];
        return (
          <div className="bj-modal">
            <DialogoIO
              alerta={s.fase === 'desbordada'}
              titulo={s.fase === 'desbordada'
                ? t('e07.bajada.desbordeTitulo', { estacion: res.nombre })
                : t('e07.bajada.okTitulo', { estacion: res.nombre })}
              accion={soyTitular
                ? (esUltima ? t('e07.bajada.verResumen') : t('e07.bajada.sigPasada', { n: s.pasada + 2, estacion: sig.nombre }))
                : undefined}
              alSeguir={() => accion({ tipo: 'siguiente_pasada' })}
            >
              <p>
                {s.fase === 'desbordada'
                  ? t('e07.bajada.desbordeTexto', { enviada: fmt(res.enviada, idioma), lineas: res.lineas, perdida: fmt(res.perdida, idioma) })
                  : t('e07.bajada.okTexto', { enviada: fmt(res.enviada, idioma), lineas: res.lineas })}
              </p>
              {!soyTitular && <p className="bj-espera">{t('e07.bajada.esperaContinuar', { nombre: nombreActual })}</p>}
            </DialogoIO>
          </div>
        );
      })()}

      {s.fase === 'final' && (
        <div className="bj-modal">
          <DialogoIO
            titulo={t('e07.bajada.finalTitulo')}
            accion={t('e07.bajada.finalContinuar')}
            alSeguir={terminar}
          >
            <p>{t('e07.bajada.finalSub')}</p>
            <div className="bj-res-cifras">
              <div><small>{t('e07.bajada.finalEnviado')}</small><b>{fmt(s.mbitTotal, idioma)} Mbit</b></div>
              <div><small>{t('e07.bajada.finalLineas')}</small><b>{s.lineasTotal}</b></div>
              <div><small>{t('e07.bajada.finalPerdido')}</small><b>{fmt(s.mbitPerdidos, idioma)} Mbit</b></div>
            </div>
            <ul className="bj-res-lista">
              {s.resultadosPasadas.map((r, i) => (
                <li key={r.id} className={r.desbordada ? 'alerta' : 'ok'}>
                  <b>0{i + 1} · {r.nombre}</b>
                  <span>{fmt(r.enviada, idioma)} Mbit · {r.lineas}/{r.meta} L</span>
                </li>
              ))}
            </ul>
          </DialogoIO>
        </div>
      )}
    </section>
  );
}

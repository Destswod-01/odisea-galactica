import { useT } from '../i18n/idioma.js';
// Cabina en primera persona: el interior de la bóveda de la nave.
// Una sola ilustración con 3 minijuegos según `modo`:
//   reinicio  → consola izquierda: encender los sistemas en orden (tras el modo seguro)
//   tormenta  → consola derecha: apagar los instrumentos expuestos antes de que llegue la tormenta
//   antena    → perilla central: girar la antena hasta recuperar la señal con la Tierra
import { useEffect, useMemo, useRef, useState } from 'react';
import { Cabina3D } from '../tres/perezoso.jsx';
import { soportaWebGL } from '../tres/webgl.js';

const SISTEMAS = ['Energía', 'Computadora', 'Orientación', 'Antena'];
const INSTRUMENTOS = [
  { id: 'jiram', nombre: 'Infrarroja', sensible: true },
  { id: 'mag', nombre: 'Magnetóm.', sensible: false },
  { id: 'particulas', nombre: 'Partículas', sensible: true },
  { id: 'mwr', nombre: 'Radiómetro', sensible: false },
  { id: 'uvs', nombre: 'Espectr. UV', sensible: true },
  { id: 'gravedad', nombre: 'Gravedad', sensible: false },
];
const TIEMPO = { reinicio: 15, tormenta: 9, antena: 15 };
// Tarjeta «Cómo se juega» que aparece antes de cada minijuego (el reloj espera).
const INSTRUCCIONES = {
  reinicio: {
    titulo: 'Reinicia la nave',
    pasos: [
      'La nave se apagó sola para protegerse: está en «modo seguro».',
      'Enciende las 4 interruptores de la consola SISTEMAS (a la izquierda) haciendo clic en ellas.',
      'Hay un orden correcto: piensa qué necesita cada sistema para funcionar. ¿Qué va primero?',
      'Si te equivocas, la luz se pone roja y pierdes 2,5 segundos.',
    ],
  },
  tormenta: {
    titulo: 'Protege los instrumentos',
    pasos: [
      'Viene una tormenta de partículas lanzada por el Sol.',
      'En la consola INSTRUMENTOS (a la derecha) apaga SOLO los 3 que tienen detectores expuestos: infrarroja, partículas y ultravioleta.',
      'Los que miden campos o señales (magnetómetro, radiómetro, gravedad) pueden seguir encendidos.',
      'Apagar uno equivocado cuesta 2,5 segundos.',
    ],
  },
  antena: {
    titulo: 'Recupera la señal',
    pasos: [
      'La antena dejó de apuntar a la Tierra y nadie nos escucha.',
      'Gira la perilla del centro (arrástrala o usa los botones ⟲ ⟳) mirando el monitor.',
      'Cuando la SEÑAL pase del 90 % las barras se ponen verdes: deja de girar.',
      'Mantén la señal 1,5 segundos y queda resuelto.',
    ],
  },
};

function Instrucciones({ modo, alEmpezar }) {
  const t = useT();
  const i = INSTRUCCIONES[modo];
  return (
    <div className="instrucciones">
      <div className="tarjeta-instrucciones">
        <h3>{t('e04.Cabina.how_to_play')}{TIEMPO[modo]}{t('e04.Cabina.seconds')}</h3>
        <h2>{t(`e04.cabina.instrucciones.${modo}.titulo`)}</h2>
        <ol>{i.pasos.map((p, indice) => <li key={p}>{t(`e04.cabina.instrucciones.${modo}.paso${indice}`)}</li>)}</ol>
        <button className="primario grande" onClick={alEmpezar}>{t('e04.Cabina.start')}</button>
      </div>
    </div>
  );
}
const PISTA = {
  reinicio: 'Sin energía nada funciona; sin computadora no puedes orientarte; sin orientación la antena no apunta a la Tierra.',
  tormenta: 'Apaga solo los que tienen detectores expuestos a las partículas. Los que miden campos o señales de radio pueden seguir.',
  antena: 'Gira la perilla hasta que la señal pase del 90 % y mantenla ahí.',
};

export default function Cabina({ modo, alTerminar }) {
  const t = useT();
  const [tiempo, setTiempo] = useState(TIEMPO[modo]);
  const [encendidos, setEncendidos] = useState([]); // reinicio
  const [apagados, setApagados] = useState([]); // tormenta
  const [error, setError] = useState(null); // nombre del último error (parpadea en rojo)
  const [angulo, setAngulo] = useState(0); // antena
  const [enVerde, setEnVerde] = useState(0); // segundos con buena señal
  const terminado = useRef(false);
  const [hecho, setHecho] = useState(false); // para redibujar al terminar
  // El reloj arranca cuando la cabina ya se ve (la escena 3D tarda un poco en cargar).
  const listo = useRef(!soportaWebGL());
  const [empezado, setEmpezado] = useState(false);
  const empezadoRef = useRef(false);
  const empezar = () => {
    empezadoRef.current = true;
    setEmpezado(true);
    // Respaldo: si la escena 3D no avisa en 3 s (GPU lenta o pestaña oculta), el reloj arranca igual.
    setTimeout(() => { listo.current = true; }, 3000);
  };
  const objetivo = useMemo(() => 60 + Math.random() * 240, []);
  const knob = useRef(null);

  const fin = (ok) => {
    if (terminado.current) return;
    terminado.current = true;
    setHecho(true);
    setTimeout(() => alTerminar(ok), 900); // deja ver el resultado en la cabina
  };

  const senal = modo === 'antena'
    ? Math.max(0, Math.cos(((angulo - objetivo) * Math.PI) / 180)) ** 6 : 0;
  const radiacion = modo === 'tormenta' ? 1 - tiempo / TIEMPO.tormenta : 0;

  useEffect(() => {
    const id = setInterval(() => {
      if (terminado.current || !listo.current || !empezadoRef.current) return;
      setTiempo((t) => Math.max(0, t - 0.1));
    }, 100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (tiempo <= 0) fin(false); }, [tiempo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (modo !== 'antena' || terminado.current) return;
    if (senal < 0.9) { setEnVerde(0); return; }
    const id = setInterval(() => setEnVerde((s) => s + 0.1), 100);
    return () => clearInterval(id);
  }, [modo, senal >= 0.9]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (enVerde >= 1.5) fin(true); }, [enVerde]); // eslint-disable-line react-hooks/exhaustive-deps

  const fallar = (nombre) => {
    setError(nombre);
    setTiempo((t) => Math.max(0, t - 2.5)); // equivocarse cuesta tiempo
    setTimeout(() => setError(null), 500);
  };
  const pulsarSistema = (s) => {
    if (modo !== 'reinicio' || terminado.current || !empezadoRef.current || encendidos.includes(s)) return;
    if (s !== SISTEMAS[encendidos.length]) return fallar(s);
    const n = [...encendidos, s];
    setEncendidos(n);
    if (n.length === SISTEMAS.length) fin(true);
  };
  const pulsarInstrumento = (ins) => {
    if (modo !== 'tormenta' || terminado.current || !empezadoRef.current || apagados.includes(ins.id)) return;
    if (!ins.sensible) return fallar(ins.id);
    const n = [...apagados, ins.id];
    setApagados(n);
    if (n.length === INSTRUMENTOS.filter((i) => i.sensible).length) fin(true);
  };
  // Perilla: arrastrar con el puntero (el ángulo sale de la posición respecto al centro).
  const girar = (ev) => {
    if (modo !== 'antena' || terminado.current) return;
    const svg = knob.current.ownerSVGElement;
    const p = svg.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    const { x, y } = p.matrixTransform(svg.getScreenCTM().inverse());
    setAngulo(((Math.atan2(y - 405, x - 400) * 180) / Math.PI + 450) % 360);
  };

  const exito = hecho && (modo === 'antena' ? enVerde >= 1.5 : modo === 'reinicio' ? encendidos.length === 4 : apagados.length === 3);
  const alarma = !hecho;
  const botonesAntena = modo === 'antena' && (
    <div className="acciones" style={{ marginTop: 8 }}>
      <button onClick={() => setAngulo((a) => (a + 345) % 360)} aria-label={t('e04.Cabina.turn_left')}>{t('e04.Cabina.turn')}</button>
      <button onClick={() => setAngulo((a) => (a + 15) % 360)} aria-label={t('e04.Cabina.turn_right')}>{t('e04.Cabina.turn_450')}</button>
    </div>
  );

  if (soportaWebGL()) {
    return (
      <div className="cabina">
        {!empezado && <Instrucciones modo={modo} alEmpezar={empezar} />}
        <Cabina3D modo={modo} sistemas={SISTEMAS} instrumentos={INSTRUMENTOS} encendidos={encendidos} apagados={apagados}
          error={error} angulo={angulo} senal={senal} radiacion={radiacion} tiempo={tiempo} hecho={hecho} exito={exito} alarma={alarma}
          pulsarSistema={pulsarSistema} pulsarInstrumento={pulsarInstrumento} alListo={() => { listo.current = true; }}
          alGirar={(d) => !terminado.current && empezadoRef.current && setAngulo((a) => (((a + d) % 360) + 360) % 360)} />
        <p className="tenue" style={{ margin: '8px 0 0' }}>{t(`e04.cabina.pista.${modo}`, null, PISTA[modo])} {modo !== 'antena' && t('e04.Cabina.click_the_switches')}{modo === 'antena' && t('e04.Cabina.drag_the_knob_or_use_the')}</p>
        {botonesAntena}
        <div className="cabina-controles" aria-label={t('e04.Cabina.cabin_controls')}>
          {modo === 'reinicio' && SISTEMAS.map(s => <button key={s} className={encendidos.includes(s) ? 'on' : ''} disabled={!empezado || hecho || encendidos.includes(s)} onClick={() => pulsarSistema(s)}>{encendidos.includes(s) ? '✓ ' : ''}{t(`e04.cabina.sistema.${s}`)}</button>)}
          {modo === 'tormenta' && INSTRUMENTOS.map(ins => <button key={ins.id} className={apagados.includes(ins.id) ? 'on' : ''} disabled={!empezado || hecho || apagados.includes(ins.id)} onClick={() => pulsarInstrumento(ins)}>{apagados.includes(ins.id) ? '✓ ' : ''}{t(`e04.cabina.instrumento.${ins.id}`)}</button>)}
          <span className="tiempo" role="status">{hecho ? (exito ? t('e04.Cabina.operation_complete') : t('e04.Cabina.time_up')) : `${tiempo.toFixed(1)} s`}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`cabina ${modo === 'tormenta' && radiacion > 0.6 ? 'temblor' : ''}`}>
      {!empezado && <Instrucciones modo={modo} alEmpezar={empezar} />}
      <svg viewBox="0 0 800 460" width="100%" role="img" aria-label={t('e04.Cabina.spacecraft_cabin')}>
        <defs>
          <clipPath id="ventanilla"><circle cx="400" cy="130" r="92" /></clipPath>
          <radialGradient id="vineta" cx="50%" cy="45%" r="70%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity=".7" />
          </radialGradient>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a3550" /><stop offset="1" stopColor="#141b2c" />
          </linearGradient>
        </defs>

        {/* Paredes de la bóveda con placas y remaches */}
        <rect width="800" height="460" fill="#101727" />
        {[0, 1, 2, 3].map((k) => <rect key={k} x={k * 200 + 4} y="4" width="192" height="220" rx="6" fill="#141d31" stroke="#1f2a44" />)}
        {Array.from({ length: 16 }).map((_, k) => <circle key={k} cx={14 + (k % 8) * 110} cy={k < 8 ? 14 : 214} r="2.5" fill="#2e3b5c" />)}

        {/* Ventanilla al espacio */}
        <g clipPath="url(#ventanilla)">
          <rect x="300" y="30" width="200" height="200" fill="#02040a" />
          {Array.from({ length: 30 }).map((_, k) => <circle key={k} cx={310 + ((k * 67) % 180)} cy={40 + ((k * 41) % 180)} r={k % 6 ? 0.8 : 1.6} fill="#fff" opacity=".8" />)}
          <Vista modo={modo} radiacion={radiacion} />
        </g>
        <circle cx="400" cy="130" r="92" fill="none" stroke="#5b6782" strokeWidth="14" />
        <circle cx="400" cy="130" r="100" fill="none" stroke="#2c3550" strokeWidth="4" />
        {Array.from({ length: 12 }).map((_, k) => {
          const a = (k * 30 * Math.PI) / 180;
          return <circle key={k} cx={400 + 92 * Math.cos(a)} cy={130 + 92 * Math.sin(a)} r="3" fill="#9aa4b8" />;
        })}

        {/* Balizas de alarma */}
        {[60, 740].map((x) => (
          <g key={x}>
            <rect x={x - 16} y="40" width="32" height="10" rx="3" fill="#3a4258" />
            <circle cx={x} cy="34" r="12" fill={alarma ? (modo === 'antena' ? '#ffc145' : '#ff3355') : exito ? '#3ddc97' : '#ff3355'} className={alarma ? 'baliza' : ''} />
          </g>
        ))}

        {/* Consola izquierda: sistemas (reinicio) */}
        <Consola x={12} titulo={t('e04.Cabina.systems')} activa={modo === 'reinicio'}>
          {SISTEMAS.map((s, k) => {
            const on = encendidos.includes(s);
            return (
              <Interruptor key={s} x={52 + k * 62} y={330} etiqueta={t(`e04.cabina.sistema.${s}`)} bajo={k % 2 === 1} on={on} mal={error === s}
                activo={modo === 'reinicio'} onClick={() => pulsarSistema(s)} />
            );
          })}
        </Consola>

        {/* Consola derecha: instrumentos (tormenta) */}
        <Consola x={540} titulo={t('e04.Cabina.instruments')} activa={modo === 'tormenta'}>
          {INSTRUMENTOS.map((ins, k) => (
            <Interruptor key={ins.id} x={580 + (k % 3) * 80} y={k < 3 ? 300 : 385} etiqueta={t(`e04.cabina.instrumento.${ins.id}`)} chico
              on={!apagados.includes(ins.id)} mal={error === ins.id} activo={modo === 'tormenta'} onClick={() => pulsarInstrumento(ins)} />
          ))}
        </Consola>

        {/* Monitor central */}
        <rect x="290" y="244" width="220" height="118" rx="10" fill="#1b2336" stroke="#3a4560" strokeWidth="3" />
        <rect x="302" y="254" width="196" height="98" rx="6" fill="#031510" />
        <g fontFamily="monospace" fill="#5dffb0" fontSize="11">
          <text x="312" y="272">{modo === 'reinicio' ? t('e04.Cabina.safe_mode') : modo === 'tormenta' ? t('e04.Cabina.solar_storm') : t('e04.Cabina.no_earth_signal')}</text>
          <text x="312" y="290">T-{tiempo.toFixed(1)} s</text>
          {modo === 'reinicio' && SISTEMAS.map((s, k) => (
            <text key={s} x={312 + (k % 2) * 92} y={308 + Math.floor(k / 2) * 16} fill={encendidos.includes(s) ? '#5dffb0' : '#2f6b52'}>
              {encendidos.includes(s) ? '[OK]' : '[--]'} {t(`e04.cabina.sistema.${s}`).slice(0, 7)}
            </text>
          ))}
          {modo === 'tormenta' && (
            <>
              <text x="312" y="310">{t('e04.Cabina.radiation')}</text>
              <rect x="312" y="318" width="176" height="12" fill="#0b2a1f" stroke="#2f6b52" />
              <rect x="312" y="318" width={176 * radiacion} height="12" fill={radiacion > 0.7 ? '#ff3355' : '#ffc145'} />
            </>
          )}
          {modo === 'antena' && (
            <>
              <text x="312" y="310">{t('e04.Cabina.signal')}{Math.round(senal * 100)} %</text>
              {Array.from({ length: 10 }).map((_, k) => (
                <rect key={k} x={312 + k * 17} y={338 - k * 2.4} width="12" height={8 + k * 2.4}
                  fill={senal * 10 > k ? (senal >= 0.9 ? '#5dffb0' : '#ffc145') : '#0b2a1f'} />
              ))}
            </>
          )}
          {hecho && <text x="400" y="345" textAnchor="middle" fontSize="13" fill={exito ? '#5dffb0' : '#ff3355'}>{exito ? t('e04.Cabina.solved') : t('e04.Cabina.failed')}</text>}
        </g>

        {/* Perilla de la antena */}
        <g ref={knob} className={modo === 'antena' ? 'perilla activa' : 'perilla'}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); girar(e); }}
          onPointerMove={(e) => e.buttons && girar(e)}>
          <circle cx="400" cy="405" r="38" fill="#2a3550" stroke="#56627f" strokeWidth="3" />
          {Array.from({ length: 24 }).map((_, k) => {
            const a = (k * 15 * Math.PI) / 180;
            return <line key={k} x1={400 + 42 * Math.cos(a)} y1={405 + 42 * Math.sin(a)} x2={400 + 47 * Math.cos(a)} y2={405 + 47 * Math.sin(a)} stroke="#56627f" strokeWidth="2" />;
          })}
          <g transform={`rotate(${angulo} 400 405)`}>
            <circle cx="400" cy="405" r="28" fill="#3a4766" />
            <rect x="397" y="379" width="6" height="22" rx="3" fill={modo === 'antena' ? '#ff7a1a' : '#6b7690'} />
          </g>
          <text x="400" y="456" textAnchor="middle" fontSize="10" fill="#8c9ab8">{t('e04.Cabina.antenna')}</text>
        </g>
        <rect width="800" height="460" fill="url(#vineta)" pointerEvents="none" />
      </svg>
      <p className="tenue" style={{ margin: '8px 0 0' }}>{t(`e04.cabina.pista.${modo}`, null, PISTA[modo])}</p>
      {modo === 'antena' && (
        <div className="acciones" style={{ marginTop: 8 }}>
          <button onClick={() => setAngulo((a) => (a + 345) % 360)} aria-label={t('e04.Cabina.turn_left')}>{t('e04.Cabina.turn')}</button>
          <button onClick={() => setAngulo((a) => (a + 15) % 360)} aria-label={t('e04.Cabina.turn_right')}>{t('e04.Cabina.turn_477')}</button>
        </div>
      )}
    </div>
  );
}

function Consola({ x, titulo, activa, children }) {
  return (
    <g opacity={activa ? 1 : 0.45}>
      <path d={`M${x} 450 L${x + 20} 250 L${x + 220} 250 L${x + 240} 450 Z`} fill="url(#metal)" stroke={activa ? '#ff7a1a' : '#2c3550'} strokeWidth={activa ? 2 : 1} />
      <text x={x + 120} y="270" textAnchor="middle" fontSize="11" fill={activa ? '#ffb36b' : '#6b7690'} letterSpacing="2">{titulo}</text>
      {children}
    </g>
  );
}

function Interruptor({ x, y, etiqueta, on, mal, activo, onClick, chico, bajo }) {
  const h = chico ? 34 : 44;
  return (
    <g onClick={onClick} style={{ cursor: activo ? 'pointer' : 'default' }} role="button" aria-label={etiqueta}>
      <circle cx={x} cy={y - h / 2 - 12} r="6" fill={mal ? '#ff3355' : on ? '#3ddc97' : '#253049'} className={mal ? 'parpadeo' : ''} />
      <rect x={x - 14} y={y - h / 2} width="28" height={h} rx="6" fill="#0c1220" stroke={mal ? '#ff3355' : '#3a4560'} />
      <g style={{ transform: `rotate(${on ? -28 : 28}deg)`, transformOrigin: `${x}px ${y}px`, transition: 'transform .18s' }}>
        <rect x={x - 3} y={y - h / 2 + 2} width="6" height={h / 2} rx="3" fill="#c9d3e6" />
        <circle cx={x} cy={y - h / 2 + 4} r="6" fill={on ? '#ff7a1a' : '#8c9ab8'} />
      </g>
      <text x={x} y={y + h / 2 + (bajo ? 30 : 14)} textAnchor="middle" fontSize={chico ? 9 : 10} fill="#c9d3e6">{etiqueta}</text>
    </g>
  );
}

function Vista({ modo, radiacion }) {
  if (modo === 'reinicio') {
    // Pasando junto a la Tierra.
    return (
      <g>
        <circle cx="430" cy="300" r="150" fill="#2b6fd6" />
        <path d="M300 200 q60 -20 120 10 t140 -5 v40 h-260z" fill="#fff" opacity=".35" />
        <circle cx="430" cy="300" r="152" fill="none" stroke="#9fd0ff" strokeWidth="5" opacity=".6" />
      </g>
    );
  }
  if (modo === 'tormenta') {
    // El frente de la tormenta se acerca y crece.
    return (
      <g>
        <circle cx="330" cy="70" r="16" fill="#fff3b0" />
        <circle cx="330" cy="70" r={30 + radiacion * 180} fill="#ff8a3d" opacity={0.15 + radiacion * 0.4} />
        {Array.from({ length: 12 }).map((_, k) => (
          <line key={k} className="particula" x1={320 + k * 14} y1={40 + (k % 4) * 12} x2={340 + k * 14} y2={60 + (k % 4) * 12}
            stroke="#ffd27a" strokeWidth="2" style={{ animationDelay: `${(k % 5) * 0.12}s` }} />
        ))}
      </g>
    );
  }
  // Antena: Júpiter a lo lejos, el Sol muy pequeño.
  return (
    <g>
      <clipPath id="jup-cabina"><circle cx="450" cy="170" r="46" /></clipPath>
      <circle cx="450" cy="170" r="46" fill="#d9a066" />
      <g clipPath="url(#jup-cabina)">
        {[-24, -10, 4, 18, 30].map((y, i) => <rect key={y} x="400" y={170 + y} width="100" height={i % 2 ? 6 : 4} fill="#a8683a" opacity=".7" />)}
      </g>
      <circle cx="340" cy="80" r="3" fill="#fff8d0" />
    </g>
  );
}

// Llegada: inserción orbital. La nave pasa junto al planeta; mantén ESPACIO (o el botón) para frenar.
// Frenar cerca del periapsis rinde más (efecto Oberth) y la órbita predicha se dibuja en vivo.
import { useEffect, useRef, useState } from 'react';
import { aplicarInsercion, dvParaInsercion } from '../motor/mision.js';
import { eficienciaFrenado, radioApoapsisCaptura } from '../motor/llegada.js';
import Jupiter from '../componentes/Jupiter.jsx';
import Nave from '../componentes/Nave.jsx';
import { EscenaJupiter } from '../tres/perezoso.jsx';
import { soportaWebGL } from '../tres/webgl.js';

const DURACION = 10; // segundos que dura el paso junto al planeta

export default function Llegada({ mision, diseno, estetica, estado, setEstado, alTerminar, alPerder, concepto }) {
  const req = mision.dv_insercion_ms;
  const ventana = mision.ventana_insercion_ms / req;
  const ritmo = req / 3.2; // m/s por segundo de freno: hay que empezar antes del periapsis
  const [disponible] = useState(() => Math.max(0, dvParaInsercion(estado, mision)));
  const [fase, setFase] = useState('instrucciones'); // instrucciones | paso | fin
  const [, setCuadro] = useState(0);
  const [res, setRes] = useState(null);
  const frenando = useRef(false);
  const sim = useRef({ s: -1, gastado: 0, efectivo: 0 });
  const s = sim.current;

  function terminar() {
    const eficiencia = s.gastado > 0 ? s.efectivo / s.gastado : 1;
    const r = aplicarInsercion(estado, mision, s.gastado, eficiencia);
    setEstado(r.estado);
    setRes(r);
    setFase('fin');
  }

  useEffect(() => {
    if (fase !== 'paso') return;
    let ultimo = performance.now();
    const id = setInterval(() => {
      const ahora = performance.now();
      const dt = Math.min(0.1, (ahora - ultimo) / 1000);
      ultimo = ahora;
      // Después del periapsis, si ya no frenas, el tiempo corre más rápido.
      const vel = s.s > 0.4 && !frenando.current ? 3 : 1;
      s.s += (dt * vel * 2) / DURACION;
      if (frenando.current && s.gastado < disponible) {
        const d = Math.min(ritmo * dt, disponible - s.gastado);
        s.gastado += d;
        s.efectivo += d * eficienciaFrenado(s.s);
      }
      if (s.s >= 1) { clearInterval(id); terminar(); return; }
      setCuadro((c) => c + 1);
    }, 30);
    return () => clearInterval(id);
  }, [fase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const abajo = (ev) => { if (ev.key === ' ' && fase === 'paso') { ev.preventDefault(); frenando.current = true; } };
    const arriba = (ev) => { if (ev.key === ' ') frenando.current = false; };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); };
  }, [fase]);

  const f = s.efectivo / req;
  const efic = eficienciaFrenado(s.s);
  const sinCombustible = s.gastado >= disponible - 1;
  const resultado = res?.resultado;

  return (
    <div className="panel">
      {concepto('llegada')}
      <h2>Llegada a {mision.destino.nombre} · Inserción orbital</h2>
      <div className="rejilla dos">
        <div>
          {soportaWebGL() ? (
            <div className={`lienzo-marco ${fase === 'paso' && frenando.current ? 'temblor' : ''}`}>
              <EscenaJupiter destino={mision.destino.id} diseno={diseno} estetica={estetica}
                avance={Math.min(1, (s.s + 1) / 2)} resultado={resultado} motor={fase === 'paso' && frenando.current} />
            </div>
          ) : (
            <div className="escena-llegada">
              <div className="jupiter-grande"><Jupiter tam={300} auroras /></div>
              <div className="nave-llegada" style={{ left: `${8 + Math.min(1, (s.s + 1) / 2) * 40}%` }}>
                <Nave diseno={diseno} estetica={estetica} ancho={130} motor={frenando.current} senal={false} />
              </div>
            </div>
          )}
        </div>
        <div>
          <OrbitaPredicha s={s.s} f={f} ventana={ventana} destino={mision.destino.nombre} />
          <div className="medidores-llegada">
            <div>
              <span className="tenue">Rendimiento del freno aquí</span>
              <div className="medidor"><div className="relleno" style={{ width: `${efic * 100}%`, background: efic > 0.8 ? 'var(--ok)' : efic > 0.5 ? 'var(--aviso)' : 'var(--mal)' }} /></div>
            </div>
            <div>
              <span className="tenue">Propelente para frenar: {Math.round(disponible - s.gastado)} m/s</span>
              <div className="medidor"><div className="relleno" style={{ width: `${disponible ? ((disponible - s.gastado) / disponible) * 100 : 0}%`, background: 'var(--acento)' }} /></div>
            </div>
          </div>
        </div>
      </div>

      {fase === 'instrucciones' && (
        <>
          <p className="directora">{mision.llegada_texto}</p>
          <ol className="pasos-lanzamiento">
            <li>La nave va a pasar junto a {mision.destino.nombre}. El punto más cercano se llama <strong>periapsis</strong> (marcado en el mapa).</li>
            <li>Mantén <kbd className="tecla">ESPACIO</kbd> (o el botón) para frenar. Frenar <strong>cerca del periapsis rinde más</strong>: mira el medidor «rendimiento del freno».</li>
            <li>Tu órbita futura se dibuja en naranja. Suelta cuando el punto más lejano quede dentro del <span className="bien">anillo verde</span>. Si frenas poco, pasas de largo; si frenas de más, la órbita queda demasiado baja.</li>
          </ol>
          {disponible < req * (1 - ventana) && <p className="mal">⚠ Solo te quedan {Math.round(disponible)} m/s y necesitas unos {req}: será casi imposible quedarte en órbita.</p>}
          <button className="primario" onClick={() => setFase('paso')}>Comenzar la aproximación</button>
        </>
      )}

      {fase === 'paso' && (
        <div className="controles-tactiles">
          <button className="primario grande mantener" style={{ padding: '18px 30px' }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); frenando.current = true; }}
            onPointerUp={() => { frenando.current = false; }} onPointerCancel={() => { frenando.current = false; }}>
            {sinCombustible ? 'SIN PROPELENTE' : frenando.current ? 'FRENANDO…' : 'MANTENER PARA FRENAR'}
          </button>
          <span className="tenue">{s.s < -0.3 ? 'Acercándote al periapsis…' : s.s < 0.3 ? '¡Estás en el periapsis: este es el mejor momento!' : 'Ya pasaste el periapsis: frenar rinde cada vez menos.'}</span>
        </div>
      )}

      {fase === 'fin' && res && (
        <>
          <p className={resultado === 'captura' ? 'bien' : 'mal'}>{res.estado.decisiones.at(-1).texto}</p>
          {resultado === 'escape'
            ? <button className="primario" onClick={alPerder}>Ver el informe</button>
            : <button className="primario" onClick={alTerminar}>Comenzar la ciencia</button>}
        </>
      )}
    </div>
  );
}

// Mapa de la órbita predicha: el planeta al centro, el periapsis a la derecha y el anillo verde objetivo.
function OrbitaPredicha({ s, f, ventana, destino }) {
  const px = 175, py = 150, rp = 40;
  const aPx = (r) => rp + 100 * r; // con f = 1 la apoapsis queda a 140 px
  const ra = radioApoapsisCaptura(f, ventana);
  const bandaMin = aPx(radioApoapsisCaptura(1 + ventana, ventana));
  const bandaMax = aPx(radioApoapsisCaptura(1 - ventana, ventana));
  let camino, nave;
  if (ra === Infinity) {
    // Trayectoria abierta: se cierra un poco a medida que frenas.
    const k = 40 + 180 * Math.max(0, f);
    const punto = (t) => [px + rp - k * t * t * 0.4, py - 150 * t];
    camino = Array.from({ length: 41 }, (_, i) => punto(-1 + i / 20)).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    nave = punto(s);
  } else {
    const r = aPx(ra);
    const a = (rp + r) / 2, b = Math.sqrt(rp * r), cx = px + rp - a;
    camino = `M${cx + a} ${py} A${a} ${b} 0 1 1 ${cx + a - 0.01} ${py}`;
    const th = s * Math.PI;
    nave = [cx + a * Math.cos(th), py + b * Math.sin(th)];
  }
  return (
    <svg viewBox="0 0 400 300" width="100%" className="mapa-transferencia" role="img" aria-label={`Órbita predicha alrededor de ${destino}`}>
      <circle cx={px} cy={py} r={(bandaMin + bandaMax) / 2} fill="none" stroke="rgba(61,220,151,.18)" strokeWidth={bandaMax - bandaMin} />
      <circle cx={px} cy={py} r={bandaMin} fill="none" stroke="#3ddc97" strokeDasharray="3 5" />
      <circle cx={px} cy={py} r={bandaMax} fill="none" stroke="#3ddc97" strokeDasharray="3 5" />
      <circle cx={px} cy={py} r="26" fill={destino.includes('Luna') ? '#9a9a9a' : '#d9a066'} />
      <path d={camino} fill="none" stroke="#ff7a1a" strokeWidth="2" strokeDasharray={ra === Infinity ? '6 4' : ''} />
      <circle cx={px + rp} cy={py} r="5" fill="none" stroke="#fff" strokeWidth="2" />
      <text x={px + rp + 8} y={py - 8} fontSize="11" fill="#fff">periapsis</text>
      <circle cx={nave[0]} cy={nave[1]} r="5" fill="#fff" />
      <text x="392" y="20" fontSize="11" fill="#3ddc97" textAnchor="end">anillo verde = órbita buena</text>
      <text x="392" y="290" fontSize="11" fill={ra === Infinity ? '#ff5470' : '#3ddc97'} textAnchor="end">
        {ra === Infinity ? 'Trayectoria abierta: ¡escaparías!' : 'Capturado: estás en órbita'}
      </text>
    </svg>
  );
}

// Minijuego «Pasada científica»: el suelo pasa bajo la nave con objetivos.
// Pulsa el instrumento correcto (teclas 1, 2, 3… o tocar) cuando el objetivo esté en la mira.
// Cada observación llena el búfer; los datos solo bajan a la Tierra mientras está a la vista.
// La ciencia que cuenta es la que LLEGA a la Tierra.
import { useEffect, useMemo, useRef, useState } from 'react';

const DURACION = 22; // segundos por pasada
const VEL = 70; // px por segundo
const MIRA = 200; // posición x de la mira
const MEDIA_MIRA = 34;
const BUFER = 100;
// La Tierra está a la vista en estos tramos de la pasada (segundos).
const VISIBLE = [[2, 8], [13, 19]];
const tierraVisible = (t) => VISIBLE.some(([a, b]) => t >= a && t <= b);

export default function Pasada({ mision, instrumentos, factorDatos, numero, total, arrastre = [], alTerminar }) {
  // Objetivos de esta pasada: cada objetivo científico aparece al menos una vez, el resto según su peso.
  const objetivos = useMemo(() => {
    const tipos = mision.pasadas;
    const lista = [...tipos];
    const peso = (t) => mision.objetivos.find((o) => o.id === t.objetivo)?.peso || 0.2;
    while (lista.length < 8) {
      let r = Math.random() * tipos.reduce((s, t) => s + peso(t), 0);
      lista.push(tipos.find((t) => (r -= peso(t)) <= 0) || tipos[0]);
    }
    return lista.sort(() => Math.random() - 0.5).map((t, i) => ({ ...t, id: i, x0: 680 + i * 170 + Math.random() * 40, estado: 'pendiente' }));
  }, [mision]);
  const maxDatos = Math.max(1, ...instrumentos.map((i) => i.datos_mbit_dia || 1));
  const tamano = (ins) => Math.max(4, Math.round((30 * (ins.datos_mbit_dia || 1)) / maxDatos));
  const ritmoBajada = 16 * factorDatos; // unidades por segundo mientras la Tierra está a la vista

  const [, setCuadro] = useState(0);
  const [aviso, setAviso] = useState(null);
  const sim = useRef({ t: 0, cola: arrastre.map((c) => ({ ...c })), bufer: arrastre.reduce((s, c) => s + c.restante, 0), enviados: {}, perdidos: 0, fin: false });
  const s = sim.current;
  const enMira = (o) => Math.abs(o.x0 - s.t * VEL - MIRA) <= MEDIA_MIRA;

  function observar(ins) {
    if (s.fin) return;
    const o = objetivos.find((x) => x.estado === 'pendiente' && enMira(x));
    if (!o) { setAviso({ ok: false, texto: 'No hay ningún objetivo en la mira.' }); return; }
    if (!(ins.ciencia?.[o.objetivo] > 0)) {
      setAviso({ ok: false, texto: `${ins.nombre.split(' (')[0]} no sirve para «${o.nombre}».` });
      return;
    }
    const tam = tamano(ins);
    if (s.bufer + tam > BUFER) {
      o.estado = 'perdido'; s.perdidos++;
      setAviso({ ok: false, texto: '¡Búfer lleno! Esos datos se perdieron. Espera a que la Tierra esté a la vista.' });
      return;
    }
    o.estado = 'observado';
    s.bufer += tam;
    s.cola.push({ objetivo: o.objetivo, restante: tam });
    setAviso({ ok: true, texto: `+ ${o.nombre} observado con ${ins.nombre.split(' (')[0]}.` });
  }

  useEffect(() => {
    let ultimo = performance.now();
    const id = setInterval(() => {
      const ahora = performance.now();
      const dt = Math.min(0.1, (ahora - ultimo) / 1000);
      ultimo = ahora;
      s.t += dt;
      // Bajada de datos a la Tierra.
      if (tierraVisible(s.t)) {
        let presupuesto = ritmoBajada * dt;
        while (presupuesto > 0 && s.cola.length) {
          const c = s.cola[0];
          const d = Math.min(presupuesto, c.restante);
          c.restante -= d; s.bufer -= d; presupuesto -= d;
          if (c.restante <= 0.001) { s.cola.shift(); s.enviados[c.objetivo] = (s.enviados[c.objetivo] || 0) + 1; }
        }
      }
      if (s.t >= DURACION && !s.fin) {
        s.fin = true;
        clearInterval(id);
        const cuenta = {};
        objetivos.forEach((o) => { cuenta[o.objetivo] = (cuenta[o.objetivo] || 0) + 1; });
        const aciertos = Object.fromEntries(mision.objetivos.map((o) => [o.id, Math.min(1, (s.enviados[o.id] || 0) / (cuenta[o.id] || 1))]));
        alTerminar({ aciertos, observados: objetivos.filter((o) => o.estado === 'observado').length, total: objetivos.length, perdidos: s.perdidos, arrastre: s.cola });
      }
      setCuadro((c) => c + 1);
    }, 30);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tecla = (ev) => {
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= instrumentos.length) { ev.preventDefault(); observar(instrumentos[n - 1]); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const visible = tierraVisible(s.t);
  const esLuna = mision.destino.id === 'luna';
  return (
    <div className="pasada">
      <div className="pasada-cabecera">
        <strong>Pasada {numero} de {total}</strong>
        <span className="tenue">{Math.max(0, Math.ceil(DURACION - s.t))} s</span>
        <span className={visible ? 'bien' : 'tenue'}>{visible ? '📡 Tierra a la vista: enviando datos' : '🌑 Sin contacto con la Tierra'}</span>
      </div>
      <svg viewBox="0 0 640 230" width="100%" className="pasada-vista" role="img" aria-label="Superficie bajo la nave con objetivos científicos">
        {/* Línea de tiempo de contacto con la Tierra */}
        <rect x="20" y="10" width="600" height="8" rx="4" fill="#16203a" />
        {VISIBLE.map(([a, b]) => <rect key={a} x={20 + (a / DURACION) * 600} y="10" width={((b - a) / DURACION) * 600} height="8" rx="4" fill="rgba(61,220,151,.6)" />)}
        <rect x={20 + Math.min(1, s.t / DURACION) * 600 - 1} y="6" width="3" height="16" fill="#fff" />
        {/* Suelo que se desplaza */}
        <rect x="0" y="40" width="640" height="190" fill={esLuna ? '#4a4a4f' : '#b98458'} />
        {Array.from({ length: 14 }).map((_, i) => {
          const x = ((i * 97 - s.t * VEL) % 700 + 700) % 700 - 30;
          return esLuna
            ? <circle key={i} cx={x} cy={70 + ((i * 53) % 140)} r={6 + (i % 4) * 4} fill="#3b3b40" stroke="#6a6a70" />
            : <rect key={i} x="0" y={44 + i * 13} width="640" height={5 + (i % 3) * 2} fill={i % 2 ? '#d4ad82' : '#a8683a'} opacity=".5" transform={`translate(${Math.sin(s.t + i) * 6} 0)`} />;
        })}
        <defs><pattern id="suelo-hd" width="1280" height="640" patternUnits="userSpaceOnUse" patternTransform={`translate(${-s.t * VEL} 0)`}><image href={esLuna ? './texturas/moon.jpg' : './texturas/jupiter.jpg'} width="1280" height="640" /></pattern><linearGradient id="suelo-sombra" x2="0" y2="1"><stop stopColor="#071322" stopOpacity=".45"/><stop offset="1" stopColor="#071322" stopOpacity=".1"/></linearGradient></defs>
        <rect y="40" width="640" height="190" fill="url(#suelo-hd)" />
        <rect y="40" width="640" height="190" fill="url(#suelo-sombra)" />
        {[80,120,160,200].map(y=><line key={y} x1="0" y1={y} x2="640" y2={y} stroke="#9acadd" opacity=".13"/>)}
        {/* Mira */}
        <rect x={MIRA - MEDIA_MIRA} y="40" width={MEDIA_MIRA * 2} height="190" fill="rgba(77,163,255,.12)" stroke="#4da3ff" strokeDasharray="5 4" />
        <text x={MIRA} y="222" fontSize="11" fill="#9ec9ff" textAnchor="middle">MIRA</text>
        {/* Objetivos */}
        {objetivos.map((o) => {
          const x = o.x0 - s.t * VEL;
          if (x < -40 || x > 680) return null;
          const enLaMira = o.estado === 'pendiente' && enMira(o);
          return (
            <g key={o.id} transform={`translate(${x} 130)`} opacity={o.estado === 'pendiente' ? 1 : 0.45}>
              {enLaMira && <circle r="30" fill="none" stroke="#ffc145" strokeWidth="3" />}
              <text fontSize="30" textAnchor="middle" dominantBaseline="central">{o.icono}</text>
              <text y="44" fontSize="11" fill="#fff" textAnchor="middle">{o.estado === 'observado' ? '✓ observado' : o.estado === 'perdido' ? '✗ perdido' : o.nombre}</text>
            </g>
          );
        })}
      </svg>
      <div className="pasada-bufer">
        <span className="tenue">Búfer de datos</span>
        <div className="medidor"><div className="relleno" style={{ width: `${(s.bufer / BUFER) * 100}%`, background: s.bufer > 80 ? 'var(--mal)' : 'var(--azul)' }} /></div>
        <span className="tenue">{Math.round(s.bufer)} / {BUFER}</span>
      </div>
      <div className="pasada-instrumentos">
        {instrumentos.map((ins, i) => (
          <button key={ins.id} onClick={() => observar(ins)}>
            <kbd className="tecla">{i + 1}</kbd> {ins.nombre.split(' (')[0]}
            <span className="tenue">{Object.keys(ins.ciencia || {}).map((k) => mision.objetivos.find((o) => o.id === k)?.corto).filter(Boolean).join(' · ')}</span>
          </button>
        ))}
      </div>
      {aviso && <p key={aviso.texto + s.t.toFixed(1)} className={`aviso-vuelo ${aviso.ok ? 'bien' : 'aviso'}`}>{aviso.texto}</p>}
    </div>
  );
}

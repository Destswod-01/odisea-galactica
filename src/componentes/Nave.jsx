import { useT } from '../i18n/idioma.js';

// La nave dibujada por capas: cada pieza elegida cambia el dibujo («lo que eliges se ve»).
// Juno gira sobre sí misma para estabilizarse, así que la nave rota lentamente.
const LARGO_ALA = { panel_chico: 55, panel_mediano: 90, panel_gigante: 135 };
const PLATO = { antena_media: 16, antena_alta: 34, antena_ka: 34 };
const RADIO_CUERPO = { tanque_chico: 30, tanque_mediano: 35, tanque_grande: 40 };

function oscurecer(hex, f = 0.7) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s) => Math.round(((n >> s) & 255) * f);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

function Ala({ cx, cy, r, largo, conMag, detalle }) {
  const segmentos = Math.max(2, Math.round(largo / 22));
  const ancho = largo / segmentos;
  return (
    <g>
      <rect x={cx + r - 2} y={cy - 2} width="10" height="4" fill="#9aa4b8" />
      {Array.from({ length: segmentos }).map((_, i) => (
        <g key={i}>
          <rect x={cx + r + 8 + i * ancho} y={cy - 13} width={ancho - 2} height="26" fill="#1c3570" stroke="#5b8fe0" strokeWidth=".8" />
          <line x1={cx + r + 8 + i * ancho} y1={cy} x2={cx + r + 6 + (i + 1) * ancho} y2={cy} stroke="#5b8fe0" strokeWidth=".4" />
        </g>
      ))}
      {conMag && (
        <g>
          <rect x={cx + r + 8 + largo} y={cy - 5} width="14" height="10" rx="2" fill="#d7dce6" stroke={detalle} />
          <circle cx={cx + r + 15 + largo} cy={cy} r="2" fill={detalle} />
        </g>
      )}
    </g>
  );
}

export default function Nave({ diseno, estetica, ancho = 380, girar = true, flotar = true, senal = true, motor = false }) {
  const t = useT();
  const casco = estetica?.casco || '#c9d3e6';
  const detalle = estetica?.detalle || '#ff7a1a';
  const cx = 210, cy = 160;
  const r = RADIO_CUERPO[diseno.propulsion] || 32;
  const largo = LARGO_ALA[diseno.energia] || 0;
  const plato = PLATO[diseno.antena] || 0;
  const inst = diseno.instrumentos || [];
  const tiene = (id) => inst.includes(id);
  const hex = (radio) => [0, 60, 120, 180, 240, 300].map((g) => {
    const a = (g * Math.PI) / 180;
    return `${cx + radio * Math.cos(a)},${cy + radio * Math.sin(a)}`;
  }).join(' ');
  // Instrumentos "genéricos" alrededor del cuerpo (los especiales se dibujan aparte).
  const modulos = inst.filter((i) => !['mag', 'sonda_atmosferica', 'camara_hd'].includes(i));

  return (
    <svg viewBox="0 0 420 330" width="100%" style={{ maxWidth: ancho, overflow: 'visible' }} role="img" aria-label={t('hangar.nave.aria')}>
      <g className={flotar ? 'flotar' : ''}>
      {/* Brillo del motor principal (se ve al frenar o acelerar) */}
      {motor && (
        <g>
          <ellipse className="llama" cx={cx} cy={cy + r + 26} rx="12" ry="30" fill="#ffb347" opacity=".9" />
          <ellipse className="llama" cx={cx} cy={cy + r + 18} rx="6" ry="18" fill="#fff6d0" />
        </g>
      )}
      <g className={girar ? 'giro' : ''} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {largo > 0 && [0, 120, 240].map((g, k) => (
          <g key={`${g}${diseno.energia}${tiene('mag')}`} transform={`rotate(${g - 90} ${cx} ${cy})`}>
            <g className="pieza" style={{ animationDelay: `${k * 0.08}s` }}><Ala cx={cx} cy={cy} r={r} largo={largo} conMag={k === 0 && tiene('mag')} detalle={detalle} /></g>
          </g>
        ))}
        {diseno.energia === 'rtg' && [30, 150].map((g) => (
          <g key={g} transform={`rotate(${g} ${cx} ${cy})`}>
            <line x1={cx + r} y1={cy} x2={cx + r + 34} y2={cy} stroke="#9aa4b8" strokeWidth="3" />
            <rect x={cx + r + 30} y={cy - 9} width="34" height="18" rx="4" fill="#3b3f48" stroke="#ff8a3d" strokeWidth="1.5" />
            {[0, 1, 2, 3].map((i) => <line key={i} x1={cx + r + 36 + i * 8} y1={cy - 9} x2={cx + r + 36 + i * 8} y2={cy + 9} stroke="#ff8a3d" strokeWidth=".6" />)}
          </g>
        ))}
        {modulos.map((id, i) => {
          const a = ((i * 360) / modulos.length + 15) * (Math.PI / 180);
          return <rect key={id} className="pieza" x={cx + (r + 4) * Math.cos(a) - 5} y={cy + (r + 4) * Math.sin(a) - 5} width="10" height="10" rx="2"
            fill={detalle} stroke={oscurecer(detalle)} />;
        })}
        <polygon points={hex(r)} fill={casco} stroke={oscurecer(casco)} strokeWidth="2" />
        <polygon points={hex(r * 0.62)} fill={oscurecer(casco, 0.85)} />
        {diseno.blindaje === 'boveda_titanio' && <rect key="boveda" className="pieza" x={cx - 15} y={cy - 15} width="30" height="30" rx="3" fill="#7d838f" stroke="#4b5059" strokeWidth="1.5" />}
        {diseno.blindaje === 'blindaje_aluminio' && <rect key="alu" className="pieza" x={cx - 13} y={cy - 13} width="26" height="26" rx="3" fill="#d9dee7" stroke="#9aa4b8" />}
      </g>

      {/* La antena siempre apunta a la Tierra: no gira con el cuerpo. */}
      {plato > 0 && (
        <g key={diseno.antena}>
          {senal && [0, 0.8, 1.6].map((d) => (
            <circle key={d} className="onda" cx={cx} cy={cy} r="6" fill="none" stroke="#7fd4ff" strokeWidth="1.5" style={{ animationDelay: `${d}s` }} />
          ))}
          <g className="pieza">
          <ellipse cx={cx} cy={cy} rx={plato} ry={plato} fill="#f3f5f9" stroke={detalle} strokeWidth="2" opacity=".95" />
          <ellipse cx={cx} cy={cy} rx={plato * 0.55} ry={plato * 0.55} fill="none" stroke="#c4cad6" />
          <circle cx={cx} cy={cy} r="4" fill={diseno.antena === 'antena_ka' ? detalle : '#9aa4b8'} />
          </g>
        </g>
      )}
      {tiene('sonda_atmosferica') && (
        <g>
          <path d={`M${cx - 18} ${cy + r + 34} q18 -26 36 0 z`} fill="#a0663a" stroke="#6b3f1f" />
          <line x1={cx} y1={cy + r} x2={cx} y2={cy + r + 14} stroke="#9aa4b8" strokeWidth="2" />
        </g>
      )}
      {tiene('camara_hd') && (
        <g>
          <rect x={cx - r - 30} y={cy - 9} width="26" height="18" rx="3" fill="#2a2f3a" stroke={detalle} />
          <circle cx={cx - r - 30} cy={cy} r="6" fill="#4da3ff" />
        </g>
      )}
      </g>
      {estetica?.nombre && (
        <text x={cx} y={318} textAnchor="middle" fill="#e6ecf8" fontSize="15" fontWeight="600" letterSpacing="2">
          {estetica.nombre.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

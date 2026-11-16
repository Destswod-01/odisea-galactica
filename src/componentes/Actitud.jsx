import { useT } from '../i18n/idioma.js';
// Indicador de actitud del ascenso: un cuarto de círculo de 0° (vertical) a 90° (horizontal).
// La cuña verde es el ángulo ideal del giro gravitatorio; la aguja blanca es tu cohete.
const CX = 20, CY = 190, R = 160;
const punto = (grados, r = R) => {
  const a = (grados * Math.PI) / 180; // 0° = arriba, 90° = derecha
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};

function cuna(desde, hasta, r = R) {
  const [x1, y1] = punto(desde, r);
  const [x2, y2] = punto(hasta, r);
  return `M${CX} ${CY} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`;
}

export default function Actitud({ objetivo, actual, tolerancia, viento, maxQ, estres }) {
  const t = useT();
  const dentro = Math.abs(actual - objetivo) <= tolerancia;
  const [ax, ay] = punto(actual, R + 6);
  return (
    <svg viewBox="0 0 220 210" width="100%" style={{ maxWidth: 240 }} role="img" aria-label={t('e02.Actitud.tilt_degrees_target', { v0: Math.round(actual), v1: Math.round(objetivo) })}>
      <path d={cuna(0, 90)} fill="rgba(255,255,255,.04)" stroke="#26345a" />
      {[0, 30, 60, 90].map((g) => {
        const [x, y] = punto(g, R + 14);
        return <text key={g} x={x} y={y} fontSize="10" fill="#8c9ab8" textAnchor="middle">{g}°</text>;
      })}
      <path d={cuna(Math.max(0, objetivo - tolerancia), Math.min(90, objetivo + tolerancia))} fill="rgba(61,220,151,.35)" stroke="#3ddc97" />
      <line x1={CX} y1={CY} x2={ax} y2={ay} stroke={dentro ? '#ffffff' : '#ff5470'} strokeWidth="4" strokeLinecap="round" />
      <circle cx={CX} cy={CY} r="6" fill="#ff7a1a" />
      {/* Viento: flecha que empuja hacia un lado */}
      {Math.abs(viento) > 0.5 && (
        <g transform={`translate(150 30) scale(${viento > 0 ? 1 : -1} 1)`}>
          <path d="M-20 0 H14 M6 -7 L14 0 L6 7" stroke="#9ec9ff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      <text x="150" y="56" fontSize="10" fill="#9ec9ff" textAnchor="middle">{Math.abs(viento) > 0.5 ? t('e02.actitud.viento') : ''}</text>
      {maxQ && (
        <g>
          <rect x="95" y="160" width="115" height="40" rx="6" fill={estres > 0.6 ? 'rgba(255,84,112,.3)' : 'rgba(255,193,69,.18)'} stroke={estres > 0.6 ? '#ff5470' : '#ffc145'} />
          <text x="152" y="176" fontSize="11" fill="#ffc145" textAnchor="middle" fontWeight="700">MAX-Q</text>
          <rect x="104" y="184" width="96" height="7" rx="3" fill="#16203a" />
          <rect x="104" y="184" width={96 * estres} height="7" rx="3" fill={estres > 0.6 ? '#ff5470' : '#ffc145'} />
        </g>
      )}
    </svg>
  );
}

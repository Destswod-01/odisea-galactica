// Júpiter con bandas que se mueven (rota cada ~10 horas) y la Gran Mancha Roja.
import { useId } from 'react';

const BANDAS = [
  [-0.82, 0.10, '#c9a27a'], [-0.62, 0.10, '#e8d3b0'], [-0.45, 0.12, '#b27a4f'], [-0.25, 0.10, '#f0e2c8'],
  [-0.08, 0.14, '#c48b5c'], [0.12, 0.10, '#eedcbc'], [0.3, 0.12, '#a86c45'], [0.5, 0.10, '#e3c9a2'], [0.68, 0.14, '#b98a63'],
];

export default function Jupiter({ tam = 260, auroras = false, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="-110 -110 220 220" width={tam} height={tam} className={`jupiter ${className}`} aria-hidden="true">
      <defs>
        <clipPath id={`disco${id}`}><circle r="100" /></clipPath>
        <radialGradient id={`sombra${id}`} cx="-0.35" cy="-0.35" r="1.3">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </radialGradient>
        <radialGradient id={`halo${id}`}>
          <stop offset="0.85" stopColor="#ffcf99" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffcf99" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="110" fill={`url(#halo${id})`} />
      <g clipPath={`url(#disco${id})`}>
        <rect x="-100" y="-100" width="200" height="200" fill="#d8b48a" />
        <g className="bandas">
          {[0, 1].map((k) => (
            <g key={k} transform={`translate(${k * 200} 0)`}>
              {BANDAS.map(([y, h, c], i) => (
                <path key={i} fill={c}
                  d={`M-100 ${y * 100} q50 ${-4 + (i % 3) * 3} 100 0 t100 0 V${(y + h) * 100} q-50 ${3 - (i % 2) * 4} -100 0 t-100 0 Z`} />
              ))}
              <ellipse cx="30" cy="28" rx="16" ry="9" fill="#b5452f" />
              <ellipse cx="30" cy="28" rx="10" ry="5" fill="#cf6a4a" />
            </g>
          ))}
        </g>
        <circle r="100" fill={`url(#sombra${id})`} />
      </g>
      {auroras && (
        <g className="auroras">
          <ellipse cx="0" cy="-92" rx="34" ry="8" fill="none" stroke="#7dfcc8" strokeWidth="3" />
          <ellipse cx="0" cy="94" rx="30" ry="7" fill="none" stroke="#a98bff" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}

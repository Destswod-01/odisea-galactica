// Parche de misión: cada misión de la NASA tiene uno. El jugador diseña el suyo.
import { useId } from 'react';

import { FONDOS } from './parcheOpciones.js';
import { useT } from '../i18n/idioma.js';

function Icono({ tipo, color }) {
  switch (tipo) {
    case 'planeta':
      return (
        <g>
          <circle cx="100" cy="100" r="34" fill="#d9a066" />
          {[-18, -6, 6, 18].map((y, i) => <rect key={y} x="68" y={100 + y - 3} width="64" height={i % 2 ? 5 : 3} fill="#a8683a" opacity=".8" />)}
          <ellipse cx="112" cy="110" rx="7" ry="4" fill="#b5452f" />
        </g>
      );
    case 'nave':
      return (
        <g transform="translate(100 100)">
          {[0, 120, 240].map((g) => <rect key={g} transform={`rotate(${g - 90})`} x="12" y="-5" width="32" height="10" fill="#4d7fd6" />)}
          <polygon points="-12,-7 0,-14 12,-7 12,7 0,14 -12,7" fill={color} />
        </g>
      );
    case 'estrella':
      return <polygon points="100,62 110,90 140,90 116,108 125,137 100,120 75,137 84,108 60,90 90,90" fill={color} />;
    default:
      return (
        <g>
          <ellipse cx="100" cy="100" rx="46" ry="18" fill="none" stroke={color} strokeWidth="3" transform="rotate(-20 100 100)" />
          <circle cx="100" cy="100" r="16" fill="#d9a066" />
          <circle cx="139" cy="84" r="5" fill={color} />
        </g>
      );
  }
}

export default function Parche({ parche, nombre, destino, anio = 2026, color = '#ff7a1a', tam = 160 }) {
  const t = useT();
  destino = destino ?? t('hangar.parche.destino');
  const id = useId().replace(/:/g, '');
  const { forma = 'circulo', fondo = FONDOS[0], icono = 'planeta' } = parche || {};
  // Marcos bordados (imágenes) encima del fondo; el fondo se recorta con la misma forma.
  const marco = { escudo: './img/marco-escudo.webp', ovalo: './img/marco-ovalo.webp', circulo: './img/marco-circulo.webp' }[forma];
  const borde = forma === 'escudo'
    ? <path d="M30 30 H170 V110 Q170 160 100 185 Q30 160 30 110 Z" fill={fondo} />
    : forma === 'ovalo'
      ? <ellipse cx="100" cy="100" rx="70" ry="88" fill={fondo} />
      : <circle cx="100" cy="100" r="86" fill={fondo} />;
  return (
    <svg viewBox="0 0 200 200" width={tam} height={tam} role="img" aria-label={t('hangar.parche.aria')}>
      <defs>
        <path id={`arriba${id}`} d="M36 100 A64 64 0 0 1 164 100" />
        <path id={`abajo${id}`} d="M30 112 A70 70 0 0 0 170 112" />
      </defs>
      {borde}
      {[[60, 55], [140, 60], [150, 130], [52, 140]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" fill="#fff" opacity=".7" />)}
      <Icono tipo={icono} color={color} />
      <image href={marco} x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid meet" />
      {forma === 'escudo' ? (
        // En el escudo los arcos se salen del borde: texto recto.
        <>
          <text x="100" y="50" fill="#fff" fontSize="15" fontWeight="700" letterSpacing="2" textAnchor="middle">{(nombre || t('hangar.parche.mision')).toUpperCase()}</text>
          <text x="100" y="152" fill={color} fontSize="11" fontWeight="600" letterSpacing="1.5" textAnchor="middle">{destino} · {anio}</text>
        </>
      ) : (
        <>
          <text fill="#fff" fontSize="15" fontWeight="700" letterSpacing="2">
            <textPath href={`#arriba${id}`} startOffset="50%" textAnchor="middle">{(nombre || t('hangar.parche.mision')).toUpperCase()}</textPath>
          </text>
          <text fill={color} fontSize="12" fontWeight="600" letterSpacing="2">
            <textPath href={`#abajo${id}`} startOffset="50%" textAnchor="middle">{destino} · {anio}</textPath>
          </text>
        </>
      )}
    </svg>
  );
}

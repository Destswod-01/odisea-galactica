import { useT } from '../i18n/idioma.js';
import { Component, lazy, Suspense, useEffect } from 'react';
import { soportaWebGL } from '../tres/webgl.js';
import { progresoSeparacion } from '../motor/entornoVuelo.js';

const VueloSonda3D = lazy(() => import('../tres/VueloSonda3D.jsx'));

function Esquema({
  alListo,
  segundos = 0,
  separacion,
  activados = [],
  diseno,
  cofiaAbierta = true,
  combustibleSeparado = true,
  propulsoresActivos = false,
}) {
  const t = useT();
  useEffect(() => {
    alListo?.();
  }, [alListo]);
  const p =
    combustibleSeparado === 'auto'
      ? progresoSeparacion(segundos)
      : combustibleSeparado
      ? 1
      : 0;
  const apCofia = cofiaAbierta ? 1 : 0;
  const paneles = activados.includes(0);
  const rtg = diseno.energia === 'rtg';
  return (
    <svg
      viewBox="0 0 600 440"
      role="img"
      aria-label={
        separacion
          ? t('e03.VistaSonda.the_probe_separates_from_the_upper')
          : t('e03.VistaSonda.probe_with_power_antenna_and_attitude')
      }
      style={{ width: '100%', height: '100%' }}
    >
      <rect width="600" height="440" fill="#030918" />
      <circle cx="180" cy="690" r="340" fill="#2c6b95" stroke="#99dbed" strokeWidth="8" />
      {[50, 110, 190, 280, 410, 510, 560].map((x, i) => (
        <circle key={x} cx={x} cy={30 + (i % 3) * 61} r="1.4" fill="#d8e9ff" />
      ))}
      {separacion && (
        <g transform={`translate(${-p * 60} ${p * 70}) rotate(${-p * 18} 300 270)`}>
          <rect x="276" y="225" width="48" height="115" rx="5" fill="#d4dce0" />
          <path d="M290 340H310L320 365H280Z" fill="#586a7d" />
          {/* 4 Valvas de la cofia */}
          {[-1, -0.35, 0.35, 1].map((dir, idx) => (
            <path
              key={idx}
              d="M276 225L300 135L324 225Z"
              fill="#e2e8f0"
              opacity={0.85}
              transform={`translate(${dir * apCofia * 65} ${-apCofia * 18}) rotate(${dir * apCofia * 48} 300 225)`}
            />
          ))}
        </g>
      )}
      <g transform={`translate(${separacion ? p * 20 : 0} ${separacion ? -p * 60 : 0})`}>
        {propulsoresActivos && (
          <path d="M290 222L300 256L310 222Z" fill="#7ab6f4" opacity="0.85" />
        )}
        <rect x="269" y="164" width="62" height="58" rx="8" fill="#b5a679" stroke="#e3d6b0" strokeWidth="2" />
        {!rtg && (
          <g stroke="#74bbec" fill="#1d5485" strokeWidth="2">
            <rect
              x={paneles ? 155 : 251}
              y={paneles ? 182 : 95}
              width={paneles ? 105 : 12}
              height={paneles ? 24 : 115}
            />
            <rect
              x="339"
              y={paneles ? 182 : 95}
              width={paneles ? 105 : 12}
              height={paneles ? 24 : 115}
            />
          </g>
        )}
        {rtg && (
          <g fill="#626c74">
            <rect x="245" y="180" width="20" height="42" />
            <rect x="335" y="180" width="20" height="42" />
          </g>
        )}
        <path
          d="M275 140Q300 173 325 140Z"
          fill={activados.includes(1) ? '#ffcb79' : '#b6ccd9'}
        />
        <path d="M300 155V164" stroke="#c2cbd2" strokeWidth="4" />
        <circle cx="310" cy="183" r="5" fill={activados.includes(2) ? '#c3adff' : '#34485b'} />
      </g>
    </svg>
  );
}

class Respaldo extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <Esquema {...this.props.datos} /> : this.props.children;
  }
}

export default function VistaSonda(props) {
  const t = useT();
  return (
    <Respaldo datos={props}>
      {soportaWebGL() ? (
        <Suspense fallback={<div className="sonda-cargando">{t('e03.VistaSonda.preparing_probe_view')}</div>}>
          <VueloSonda3D {...props} />
        </Suspense>
      ) : (
        <Esquema {...props} />
      )}
    </Respaldo>
  );
}

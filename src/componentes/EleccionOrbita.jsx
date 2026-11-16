import AyudaIO from './AyudaIO.jsx';
// Elección de órbita (tarea B1): 3 tarjetas por misión con lo que cambia en cobertura, comunicaciones, combustible,
// vida útil y radiación, comparado con la órbita real de la NASA. Elegir una guarda `diseno.orbita`.
// modo 'panel': ventana encima del hangar 3D (Esc cierra). modo 'enLinea': dentro de la pestaña del hangar 2D.
import { useEffect, useRef } from 'react';
import { comparacionConReal, orbitasDe, orbitaElegida, orbitaReal, EFECTOS_NEUTROS } from '../motor/orbita.js';
import { useT } from '../i18n/idioma.js';
import './eleccion-orbita.css';

const FILAS = [
  { id: 'ciencia', efecto: 'ciencia', fmt: (t, v) => t('orbita.valorMult', { n: v }) },
  { id: 'enlace', efecto: 'enlace', fmt: (t, v) => t('orbita.valorMult', { n: v }) },
  { id: 'dv', efecto: 'dv_extra_ms', fmt: (t, v) => t('orbita.valorDv', { n: v > 0 ? `+${v}` : v }) },
  { id: 'vida', efecto: 'vida_anos', fmt: (t, v) => t('orbita.valorAnos', { n: v }) },
  { id: 'radiacion', efecto: 'radiacion', fmt: (t, v) => t('orbita.valorMult', { n: v }) },
];
const ef = (o) => ({ ...EFECTOS_NEUTROS, ...(o?.efectos || {}) });

function Efecto({ fila, orbita, real, mejor }) {
  const t = useT();
  const v = ef(orbita)[fila.efecto] ?? 0, r = ef(real)[fila.efecto] ?? 0;
  const dir = Math.abs(v - r) < 1e-9 ? 0 : v > r ? 1 : -1;
  const flecha = dir > 0 ? '▲' : dir < 0 ? '▼' : '=';
  const clase = mejor > 0 ? 'mejor' : mejor < 0 ? 'peor' : 'igual';
  return <li className={`eo-efecto ${clase}`}>
    <span className="eo-efecto-nombre">{t(`orbita.${fila.id}`)}</span>
    <strong>{fila.fmt(t, v)}</strong>
    <span className="eo-flecha" aria-hidden="true">{flecha}</span>
    <span className="eo-sr">{t(dir > 0 ? 'orbita.mayor' : dir < 0 ? 'orbita.menor' : 'orbita.igual')}{mejor ? `, ${t(mejor > 0 ? 'orbita.mejor' : 'orbita.peor')}` : ''}</span>
  </li>;
}

export default function EleccionOrbita({ mision, diseno, setDiseno, resumen, modo = 'panel', alCerrar }) {
  const t = useT();
  const raiz = useRef(null);
  const lista = orbitasDe(mision);
  const real = orbitaReal(mision);
  const elegida = orbitaElegida(mision, diseno);
  useEffect(() => {
    if (modo !== 'panel') return undefined;
    const tecla = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    window.addEventListener('keydown', tecla);
    raiz.current?.querySelector('[role=radio][aria-checked=true]')?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', tecla);
  }, [modo, alCerrar]);
  // Funcional: dos clics seguidos no se pisan con el diseño anterior.
  const elegir = (o) => setDiseno((d) => ({ ...d, orbita: o.id }));
  // Flechas del teclado dentro del grupo de opciones (patrón radio).
  const mover = (e, i) => {
    const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const sig = (i + paso + lista.length) % lista.length;
    elegir(lista[sig]);
    raiz.current?.querySelectorAll('[role=radio]')[sig]?.focus();
  };
  const util = resumen ? Math.round(resumen.ciencia.total * resumen.factorDatos * 100) : null;
  const contenido = <>
    <header className="eo-cabecera">
      <div><span className="t-eyebrow">{mision.nombre}</span><h2 id="eo-titulo">{t('orbita.titulo')}</h2></div>
      {modo === 'panel' && <button type="button" className="eo-cerrar" onClick={alCerrar} aria-label={t('orbita.cerrar')}>×</button>}
    </header>
    <AyudaIO estacion="orbita" dificultad={mision?.dificultad} />
    {lista.length === 0 ? <p>{t('orbita.sinOrbitas')}</p> : <div className="eo-lista" role="radiogroup" aria-label={t('orbita.grupo')}>
      {lista.map((o, i) => {
        const marcada = o.id === elegida?.id, cmp = comparacionConReal(mision, o);
        return <div key={o.id} role="radio" aria-checked={marcada} tabIndex={marcada ? 0 : -1} className={`eo-tarjeta ${marcada ? 'elegida' : ''}`}
          onClick={() => elegir(o)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); elegir(o); } else mover(e, i); }}>
          <div className="eo-etiquetas">{o.real && <span className="eo-real">{t('orbita.real')}</span>}{marcada && <span className="eo-marca">● {t('orbita.elegida')}</span>}</div>
          <h3>{o.nombre}</h3>
          <p className="eo-altitud">{o.altitud}</p>
          <p className="eo-desc">{o.descripcion}</p>
          <p className="eo-porque"><strong>{t('orbita.porQue')}:</strong> {o.por_que}</p>
          <ul className="eo-efectos">{FILAS.map((f) => <Efecto key={f.id} fila={f} orbita={o} real={real} mejor={cmp[f.id]} />)}</ul>
        </div>;
      })}
    </div>}
    {resumen && <p className="eo-resumen" role="status"><strong>{t('orbita.resumen')}:</strong> {t('orbita.resCiencia', { n: util })} · {t('orbita.resDv', { n: Math.round(resumen.barras.dv.limite) })} · {t('orbita.resEnlace', { n: Math.round(resumen.enlace) })}</p>}
  </>;
  return modo === 'panel'
    ? <div className="eo-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar?.(); }}><section ref={raiz} className="eo-panel" role="dialog" aria-modal="true" aria-labelledby="eo-titulo">{contenido}</section></div>
    : <section ref={raiz} className="eo-enlinea" aria-labelledby="eo-titulo">{contenido}</section>;
}

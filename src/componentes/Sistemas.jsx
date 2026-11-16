import AyudaIO from './AyudaIO.jsx';
// Sistemas de la nave (tarea B3): batería, computadora de vuelo y control de orientación, con una opción simple y una avanzada.
// Elegir una guarda `diseno.bateria`, `diseno.computadora` o `diseno.orientacion` (el id de la pieza).
// modo 'panel': ventana encima del hangar 3D (Esc cierra). modo 'enLinea': dentro de la pestaña «Sistemas» del hangar 2D.
import { useEffect, useRef } from 'react';
import { SISTEMAS } from '../motor/sistemas.js';
import { mesesPieza } from '../motor/tiempo.js';
import { estaDesbloqueado } from '../estado/progreso.js';
import { useT } from '../i18n/idioma.js';
import { claseConsejo } from './consejoAyuda.js';
import { Insignia } from './Consejo.jsx';
import './eleccion-orbita.css';
import './sistemas.css';

const fmt = (n) => Math.round(n).toLocaleString('es-MX');

// El dato que distingue a cada categoría (Wh, Gbit o segundos de arco).
function datoClave(t, p) {
  if (p.bateria_wh) return t('sistemas.dato.wh', { n: fmt(p.bateria_wh) });
  if (p.almacenamiento_gbit) return t('sistemas.dato.gbit', { n: fmt(p.almacenamiento_gbit) });
  if (p.precision_arcsec) return t('sistemas.dato.arcsec', { n: fmt(p.precision_arcsec) });
  return null;
}

export default function Sistemas({ mision, piezas, setDiseno, resumen, progreso, alComprar, modo = 'panel', alCerrar }) {
  const t = useT();
  const raiz = useRef(null);
  useEffect(() => {
    if (modo !== 'panel') return undefined;
    const tecla = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    window.addEventListener('keydown', tecla);
    raiz.current?.querySelector('button')?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', tecla);
  }, [modo, alCerrar]);
  // Funcional: dos clics seguidos no se pisan con el diseño anterior.
  const elegir = (cat, id) => setDiseno((d) => ({ ...d, [cat]: id }));
  const elegidos = SISTEMAS.filter((c) => resumen.sistemas[c].pieza && !resumen.sistemas[c].auto).length;
  const contenido = <>
    <header className="eo-cabecera">
      <div><span className="t-eyebrow">{t('sistemas.estado.listo', { n: elegidos })}</span><h2 id="si-titulo">{t('sistemas.titulo')}</h2></div>
      {modo === 'panel' && <button type="button" className="eo-cerrar" onClick={alCerrar} aria-label={t('sistemas.cerrar')}>×</button>}
    </header>
    <AyudaIO estacion="sistemas" dificultad={mision?.dificultad} />
    <div className="si-grupos">
      {SISTEMAS.map((cat) => {
        const estado = resumen.sistemas[cat];
        const lista = piezas.filter((p) => p.categoria === cat);
        const titulo = t(`sistemas.${cat}.titulo`);
        return <section key={cat} className="si-grupo" aria-label={titulo}>
          <h3>{titulo}</h3>
          <p className="si-efecto">{t(`sistemas.${cat}.efecto`)}</p>
          <div className="si-opciones" role="radiogroup" aria-label={t('sistemas.grupo', { sistema: titulo })}>
            {lista.map((p) => {
              const marcada = estado.pieza?.id === p.id && !estado.auto;
              const auto = estado.pieza?.id === p.id && estado.auto;
              const libre = estaDesbloqueado(progreso, p);
              const alcanza = (progreso?.fondos ?? 0) >= (p.precio || 0);
              // B2b: en Principiante la opción simple sale recomendada (la avanzada ya trae su aviso).
              const consejo = mision?.dificultad === 'principiante' && !p.avanzada ? { estado: 'recomendada' } : null;
              return <div key={p.id} role="radio" aria-checked={marcada} aria-disabled={!libre} tabIndex={libre ? 0 : -1}
                className={`si-tarjeta ${marcada ? 'elegida' : ''} ${auto ? 'auto' : ''} ${libre ? '' : 'bloqueada'} ${claseConsejo(consejo)}`}
                onClick={() => libre && elegir(cat, p.id)}
                onKeyDown={(e) => { if (libre && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); elegir(cat, p.id); } }}>
                <div className="eo-etiquetas">
                  <span className={p.avanzada ? 'si-nivel avanzada' : 'si-nivel'}>{p.avanzada ? t('sistemas.avanzada') : t('sistemas.simple')}</span>
                  {marcada && <span className="eo-marca">● {t('sistemas.elegida')}</span>}
                  {auto && <span className="si-auto">{t('sistemas.auto')}</span>}
                </div>
                <h4>{!libre && '🔒 '}{p.nombre}<Insignia consejo={consejo} /></h4>
                {mision?.dificultad === 'principiante' && p.avanzada && <p className="consejo-motivo">{t('consejo.avanzada')}</p>}
                <ul className="si-fichas">
                  <li className="clave">{datoClave(t, p)}</li>
                  <li>{t('sistemas.dato.kg', { n: p.masa_kg })}</li>
                  <li>{t('sistemas.dato.musd', { n: p.costo_musd })}</li>
                  {p.potencia_w > 0 && <li>{t('sistemas.dato.w', { n: p.potencia_w })}</li>}
                  <li>{t('sistemas.dato.meses', { n: mesesPieza(p) })}</li>
                </ul>
                <p className="si-dato">{p.dato}</p>
                {!libre && <button type="button" className="si-comprar" disabled={!alcanza} onClick={(e) => { e.stopPropagation(); alComprar?.(p); }}>
                  {alcanza ? t('hangar.desbloquearPor', { precio: p.precio }) : t('hangar.necesitasFondos', { precio: p.precio, fondos: progreso?.fondos ?? 0 })}
                </button>}
              </div>;
            })}
          </div>
          {estado.falta && <p className="si-pendiente" role="status">△ {t('sistemas.pendiente')}</p>}
          {estado.auto && <p className="si-nota">{t('sistemas.autoNota')}</p>}
          {!estado.auto && !estado.falta && <button type="button" className="si-quitar" onClick={() => elegir(cat, null)}>{t('sistemas.quitar')}</button>}
        </section>;
      })}
    </div>
    <p className="eo-resumen" role="status">
      <strong>{t('sistemas.resumen.bateria', { n: fmt(resumen.bateriaWh ?? 0) })}</strong>
      {' · '}{t('sistemas.resumen.datos', { sin: Math.round(resumen.almacenamiento.perdidaSin * 100), con: Math.round(resumen.almacenamiento.perdidaCon * 100) })}
      {resumen.apuntado.arcsec !== null && <>{' · '}{t('sistemas.resumen.apuntado', { arcsec: resumen.apuntado.arcsec, bono: Math.round(resumen.apuntado.bono * 100) })}</>}
    </p>
  </>;
  return modo === 'panel'
    ? <div className="eo-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar?.(); }}><section ref={raiz} className="eo-panel" role="dialog" aria-modal="true" aria-labelledby="si-titulo">{contenido}</section></div>
    : <section ref={raiz} className="eo-enlinea" aria-labelledby="si-titulo">{contenido}</section>;
}

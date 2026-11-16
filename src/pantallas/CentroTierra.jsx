import { lazy, Suspense, useRef, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import './centro-tierra.css';
const EntrevistaTV = lazy(() => import('./EntrevistaTV.jsx'));
const PilotajeTierra = lazy(() => import('./PilotajeTierra.jsx'));

export default function CentroTierra({ fondos, alSalir, alCobrar, esperaMs = 0 }) {
  const t = useT();
  const [actividad, setActividad] = useState(null);
  const [recibo, setRecibo] = useState(null);
  const sesion = useRef(null);
  const cobrada = useRef(false);
  const elegir = (tipo) => {
    sesion.current = globalThis.crypto?.randomUUID?.() ?? `tierra-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cobrada.current = false; setRecibo(null); setActividad(tipo);
  };
  const terminar = (resultado) => {
    if (cobrada.current || resultado.tipo !== actividad) return;
    cobrada.current = true;
    const pago = alCobrar(resultado, sesion.current);
    setRecibo(pago); setActividad(null);
  };
  if (actividad) return <Suspense fallback={<div className="tierra-centro">{t('tierra.cargando')}</div>}>
    {actividad === 'entrevista'
      ? <EntrevistaTV alTerminar={terminar} alSalir={() => setActividad(null)} />
      : <PilotajeTierra alTerminar={terminar} alSalir={() => setActividad(null)} />}
  </Suspense>;
  return <section className="tierra-centro" aria-labelledby="tierra-titulo">
    <header><button className="tierra-volver tierra-volver-arriba" onClick={alSalir}>← {t('tierra.volver')}</button><span className="tierra-kicker">{t('tierra.kicker')}</span><h1 id="tierra-titulo">{t('tierra.titulo')}</h1>
      <p>{t('tierra.descripcion')}</p><strong>{t('tierra.fondos', { n: fondos })}</strong></header>
    {recibo !== null && <div className="tierra-recibo" role="status"><strong>{t('tierra.cobrado', { n: recibo })}</strong><p>{t('tierra.destino')}</p><button className="primario" onClick={alSalir}>{t('tierra.volver')}</button></div>}
    {esperaMs > 0 && <p className="tierra-espera" role="status">{t('tierra.espera', { min: Math.ceil(esperaMs / 60000) })}</p>}
    <div className="tierra-opciones">
      <article><span className="tierra-icono" aria-hidden="true">📺</span><h2>{t('tierra.entrevista')}</h2><p>{t('tierra.entrevistaDesc')}</p><strong>{t('tierra.entrevistaPago')}</strong><button disabled={esperaMs > 0} onClick={() => elegir('entrevista')}>{t('tierra.entrevistaBoton')}</button></article>
      <article><span className="tierra-icono" aria-hidden="true">✈</span><h2>{t('tierra.pilotaje')}</h2><p>{t('tierra.pilotajeDesc')}</p><strong>{t('tierra.pilotajePago')}</strong><button disabled={esperaMs > 0} onClick={() => elegir('pilotaje')}>{t('tierra.pilotajeBoton')}</button></article>
    </div>
    <p className="tierra-nota">{t('tierra.nota')}</p><button className="tierra-volver" onClick={alSalir}>{t('tierra.volver')}</button>
  </section>;
}

// Informe: la nave REAL de NASA (modelo 3D) junto a la antena de la Deep Space Network (C2), en un solo lienzo 3D.
import { lazy, Suspense } from 'react';
import { useT } from '../i18n/idioma.js';
import { soportaWebGL } from '../tres/webgl.js';
import './panel-nasa3d.css';

const NaveRealNasa = lazy(() => import('../tres/NaveRealNasa.jsx'));

export default function PanelNasa3D({ misionId }) {
  const t = useT();
  if (!soportaWebGL()) return null;
  const nave = misionId === 'juno' ? 'juno' : 'lro';
  return (
    <section className="nasa3d" aria-labelledby="nasa3d-titulo">
      <h3 id="nasa3d-titulo">🛰️ {t('nasa3d.titulo')}</h3>
      <p>{t('nasa3d.intro')}</p>
      <figure>
        <Suspense fallback={<div className="nasa3d-cargando">{t('nasa3d.cargando')}</div>}><NaveRealNasa modelos={[nave, 'dsn']} /></Suspense>
        <figcaption className="nasa3d-pies">
          <span><strong>{t(`nasa3d.${nave}`)}</strong>{t(`nasa3d.${nave}Desc`)}</span>
          <span><strong>{t('nasa3d.dsn')}</strong>{t('nasa3d.dsnDesc')}</span>
        </figcaption>
      </figure>
      <p className="nasa3d-credito">{t('nasa3d.credito')}</p>
    </section>
  );
}

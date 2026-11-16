import { useEffect, useRef } from 'react';
import { useT } from '../i18n/idioma.js';
import { requisitos, resumenRequisitos } from '../motor/requisitos.js';
import { BannerDirectora } from './TutorialFase.jsx';
import './revision-diseno.css';

const PASOS = ['necesidad', 'concepto', 'requisitos', 'diseno', 'verificar', 'implementar'];

// Revisión de diseño antes de lanzar (proceso NASA: cada requisito con su forma de verificarlo).
export default function RevisionDiseno({ mision, resumen, diseno, alLanzar, alVolver, equipo, misRoles = [], dificultad = 'intermedio' }) {
  const t = useT();
  const primero = useRef(null);
  const lista = requisitos(mision, resumen, diseno);
  const { cumplidos, total } = resumenRequisitos(lista);
  const todos = cumplidos === total;

  useEffect(() => {
    primero.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') alVolver?.(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [alVolver]);

  return (
    <div className="rd-fondo">
      <section className="rd-panel" role="dialog" aria-modal="true" aria-labelledby="rd-titulo">
        <BannerDirectora fase="revision" equipo={equipo} misRoles={misRoles} dificultad={dificultad} />
        <header>
          <h2 id="rd-titulo">{t('requisitos.titulo')}</h2>
          <p>{t('requisitos.intro')}</p>
        </header>
        <ol className="rd-pasos" aria-label={t('requisitos.pasos')}>
          {PASOS.map((p) => (
            <li key={p} className={p === 'verificar' ? 'activo' : ''} aria-current={p === 'verificar' ? 'step' : undefined}>
              {t(`requisitos.paso.${p}`)}
            </li>
          ))}
        </ol>
        <div className="rd-lista">
          <h3>{t('requisitos.lista')}</h3>
          <ul>
            {lista.map((r) => (
              <li key={r.id} className={r.cumple ? 'ok' : 'falla'}>
                <span className="rd-marca" role="img" aria-label={t(r.cumple ? 'requisitos.cumple' : 'requisitos.noCumple')}>{r.cumple ? '✓' : '✗'}</span>
                <div>
                  <strong>{t(r.clave, r.id === 'datos' ? { ...r.vars, unidad: t('requisitos.unidadDatos') } : r.vars)}</strong>
                  <small>{t('requisitos.verificacionEtiqueta')}: {t(r.verificacion, r.vars)}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <footer>
          <p className={`rd-resumen ${todos ? 'ok' : 'falla'}`} aria-live="polite">{t('requisitos.resumen', { cumplidos, total })}</p>
          {!todos && <p className="rd-aviso" role="note">{t('requisitos.aviso')}</p>}
          <div className="rd-botones">
            <button ref={primero} type="button" onClick={alVolver}>{t('requisitos.volver')}</button>
            <button type="button" className="primario" onClick={alLanzar}>{t(todos ? 'requisitos.lanzar' : 'requisitos.lanzarIgual')}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

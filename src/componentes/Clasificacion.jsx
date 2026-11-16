// Tabla de clasificación local y compartir diseño (B8).
// Muestra los 10 mejores puntajes de la misión, permite guardar el puntaje actual
// y copiar el enlace para compartir el diseño.
import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import {
  codificarDiseno,
  leerClasificacion,
  registrarResultado,
} from '../motor/compartir.js';
import './clasificacion.css';

const fechaCorta = (f) => {
  try {
    return new Date(f).toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export function Clasificacion({
  misionId: propMisionId,
  mision,
  puntaje: propPuntaje,
  diseno: propDiseno,
  actual,
}) {
  const t = useT();
  const mId = propMisionId || mision?.id || actual?.mision?.id || actual?.misionId || 'lro';
  const nombreMision = mision?.nombre || (mId === 'juno' ? 'Juno' : 'LRO');
  const disenoActual = propDiseno || actual?.diseno || null;
  const puntajeActual = propPuntaje ?? actual?.puntaje ?? null;

  const [lista, setLista] = useState(() => leerClasificacion(mId));
  const [nombre, setNombre] = useState(() => {
    try {
      return localStorage?.getItem('orbita2-ultimo-nombre') || '';
    } catch {
      return '';
    }
  });
  const [guardado, setGuardado] = useState(false);
  const [fechaGuardada, setFechaGuardada] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState(false);

  useEffect(() => {
    setLista(leerClasificacion(mId));
    setGuardado(false);
    setFechaGuardada(null);
  }, [mId]);

  const codigoDiseno = useMemo(() => {
    if (!disenoActual) return null;
    return codificarDiseno(mId, disenoActual);
  }, [mId, disenoActual]);

  const guardar = (e) => {
    e?.preventDefault();
    if (guardado || puntajeActual === null) return;
    const fecha = Date.now();
    const nuevaLista = registrarResultado({
      misionId: mId,
      puntaje: puntajeActual,
      nombre,
      fecha,
    });
    setLista(nuevaLista);
    setGuardado(true);
    setFechaGuardada(fecha);
    try {
      if (nombre.trim()) {
        localStorage?.setItem('orbita2-ultimo-nombre', nombre.trim().slice(0, 18));
      }
    } catch {
      /* sin almacenamiento */
    }
  };

  const copiarEnlace = async () => {
    if (!codigoDiseno) return;
    try {
      const params = new URLSearchParams();
      if (typeof window !== 'undefined') {
        const lang = new URLSearchParams(window.location.search).get('lang');
        if (lang) params.set('lang', lang);
      }
      params.set('diseno', codigoDiseno);
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiado(true);
      setErrorCopia(false);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErrorCopia(true);
      setTimeout(() => setErrorCopia(false), 2500);
    }
  };

  return (
    <section className="cl-contenedor" aria-labelledby="cl-titulo">
      <header className="cl-cabecera">
        <div className="cl-cabecera-info">
          <span className="cl-mision-badge">{nombreMision}</span>
          <h3 id="cl-titulo">🏆 {t('clasificacion.titulo')}</h3>
          <p className="cl-subtitulo">{t('clasificacion.subtitulo')}</p>
        </div>
        {codigoDiseno && (
          <div className="cl-compartir-zona">
            <button
              type="button"
              className={`cl-btn-compartir ${copiado ? 'copiado' : ''} ${errorCopia ? 'error' : ''}`}
              onClick={copiarEnlace}
              aria-live="polite"
            >
              {copiado ? t('clasificacion.enlaceCopiado') : errorCopia ? t('clasificacion.errorCopiar') : `🔗 ${t('clasificacion.copiarEnlace')}`}
            </button>
          </div>
        )}
      </header>

      {puntajeActual !== null && (
        <form className="cl-guardar-box" onSubmit={guardar}>
          <div className="cl-guardar-cab">
            <span className="cl-guardar-puntaje">
              {t('clasificacion.tuPuntaje', { n: puntajeActual })}
            </span>
          </div>
          <div className="cl-guardar-campos">
            <input
              type="text"
              className="cl-input-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={t('clasificacion.nombrePlaceholder')}
              maxLength={18}
              disabled={guardado}
              aria-label={t('clasificacion.nombrePlaceholder')}
            />
            <button
              type="submit"
              className={`cl-btn-guardar ${guardado ? 'guardado' : ''}`}
              disabled={guardado}
            >
              {guardado ? t('clasificacion.guardado') : t('clasificacion.guardar')}
            </button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        <p className="cl-vacio">{t('clasificacion.sinRegistros')}</p>
      ) : (
        <>
          <table className="cl-tabla">
            <thead>
              <tr>
                <th className="cl-th-pos">{t('clasificacion.col.posicion')}</th>
                <th>{t('clasificacion.col.nombre')}</th>
                <th className="cl-th-puntaje">{t('clasificacion.col.puntaje')}</th>
                <th className="cl-th-fecha">{t('clasificacion.col.fecha')}</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item, idx) => {
                const esActual = fechaGuardada !== null && item.fecha === fechaGuardada;
                const pos = idx + 1;
                return (
                  <tr
                    key={`${item.fecha}-${idx}`}
                    className={`cl-fila ${pos <= 3 ? `top-${pos}` : ''} ${esActual ? 'actual' : ''}`}
                  >
                    <td className="cl-td-pos">
                      <span className="cl-pos-badge">
                        {pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`}
                      </span>
                    </td>
                    <td className="cl-td-nombre">
                      <strong>{item.nombre}</strong>
                      {esActual && <span className="cl-etiqueta-actual">{t('clasificacion.actual')}</span>}
                    </td>
                    <td className="cl-td-puntaje">
                      <span className="cl-puntaje-valor">{item.puntaje}</span>
                    </td>
                    <td className="cl-td-fecha">{fechaCorta(item.fecha)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="cl-tarjetas">
            {lista.map((item, idx) => {
              const esActual = fechaGuardada !== null && item.fecha === fechaGuardada;
              const pos = idx + 1;
              return (
                <li
                  key={`card-${item.fecha}-${idx}`}
                  className={`cl-tarjeta ${pos <= 3 ? `top-${pos}` : ''} ${esActual ? 'actual' : ''}`}
                >
                  <div className="cl-tarjeta-pos">
                    <span className="cl-pos-badge">
                      {pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`}
                    </span>
                  </div>
                  <div className="cl-tarjeta-datos">
                    <div className="cl-tarjeta-nom">
                      <strong>{item.nombre}</strong>
                      {esActual && <span className="cl-etiqueta-actual">{t('clasificacion.actual')}</span>}
                    </div>
                    <span className="cl-tarjeta-fecha">{fechaCorta(item.fecha)}</span>
                  </div>
                  <div className="cl-tarjeta-puntaje">
                    <strong>{item.puntaje}</strong>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export default Clasificacion;

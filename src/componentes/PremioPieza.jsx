import { useEffect, useId, useRef } from 'react';
import { useT } from '../i18n/idioma.js';
import './premio-pieza.css';

export default function PremioPieza({ id, nombre, alCerrar }) {
  const t = useT(), dialogo = useRef(null), titulo = useId();
  useEffect(() => {
    const elemento = dialogo.current;
    elemento.showModal();
    return () => elemento.close();
  }, []);
  return <dialog ref={dialogo} className="premio-pieza" aria-labelledby={titulo} onCancel={e => { e.preventDefault(); alCerrar(); }}>
    <h2 id={titulo}>{t('economia.felicidades')}</h2>
    <img src={`./img/premios/${id}.svg`} alt={nombre} width="320" height="220" />
    <p>{t('economia.recibiste', { nombre })}</p>
    <button type="button" className="primario" onClick={alCerrar}>{t('economia.listo')}</button>
  </dialog>;
}

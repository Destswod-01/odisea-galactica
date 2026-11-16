import './dialogo-io.css';
import { useT } from '../i18n/idioma.js';
export default function DialogoIO({ titulo, children, accion, alSeguir, alerta = false }) {
  const t = useT();
  return <div className={`dialogo-io ${alerta ? 'io-alerta' : ''}`} role="status"><div className="io-avatar" aria-hidden="true"><i /><i /><b>IO</b></div><div className="io-contenido"><span>{t('io.copiloto')}</span><h2>{titulo}</h2><div className="io-explicacion">{children}</div>{accion && <button className="primario" onClick={alSeguir}>{accion} <span>→</span></button>}</div></div>;
}

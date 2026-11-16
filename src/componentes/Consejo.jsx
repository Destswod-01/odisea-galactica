// Insignia y motivo de una línea para las listas de piezas en Principiante (tarea B2b).
import { useT } from '../i18n/idioma.js';
import './consejo.css';

export function Insignia({ consejo }) {
  const t = useT();
  return consejo?.estado === 'recomendada' ? <span className="consejo-insignia">{t('consejo.recomendada')}</span> : null;
}
export function Motivo({ consejo }) {
  const t = useT();
  return consejo?.clave ? <span className="consejo-motivo">{t(consejo.clave, consejo.vars)}</span> : null;
}

// Tarjeta «Concepto» del tutorial: explica una idea la primera vez que aparece (solo en la misión tutorial).
import { useT } from '../i18n/idioma.js';
export default function Concepto({ mision, clave, visto, alCerrar }) {
  const t = useT();
  const c = mision.tutorial && mision.conceptos?.[clave];
  if (!c || visto) return null;
  return (
    <div className="concepto" role="note">
      <span className="concepto-icono" aria-hidden="true">📘</span>
      <div>
        <h3>{t('hangar.concepto')} · {c.titulo}</h3>
        <p>{c.texto}</p>
        <button className="primario" onClick={alCerrar}>{t('hangar.entendido')}</button>
      </div>
    </div>
  );
}

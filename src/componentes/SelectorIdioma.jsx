// Botón ES / EN de la cabecera: cambia el idioma de todo el juego sin perder la partida.
import { useIdioma } from '../i18n/idioma.js';
import './selector-idioma.css';

// Banderas en SVG (Windows no dibuja los emojis de bandera): México para ES y Estados Unidos para EN.
const BanderaMX = () => (
  <svg className="bandera" viewBox="0 0 18 12" width="18" height="12" aria-hidden="true">
    <rect width="6" height="12" fill="#006847" /><rect x="6" width="6" height="12" fill="#fff" /><rect x="12" width="6" height="12" fill="#ce1126" />
    <circle cx="9" cy="6" r="1.6" fill="#8c6b2f" />
  </svg>
);
const BanderaUS = () => (
  <svg className="bandera" viewBox="0 0 19 10" width="18" height="12" preserveAspectRatio="none" aria-hidden="true">
    <rect width="19" height="10" fill="#fff" />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} y={i * 1.54} width="19" height="0.77" fill="#b22234" />)}
    <rect width="7.6" height="5.4" fill="#3c3b6e" />
  </svg>
);

export default function SelectorIdioma({ className = '' }) {
  const [idioma, setIdioma] = useIdioma();
  const otro = idioma === 'es' ? 'en' : 'es';
  return (
    <button
      type="button"
      className={`boton-idioma ${className}`}
      onClick={() => setIdioma(otro)}
      aria-label={idioma === 'es' ? 'Switch to English' : 'Cambiar a español'}
      title={idioma === 'es' ? 'Switch to English' : 'Cambiar a español'}
    >
      <span aria-hidden="true" className={`idioma-op ${idioma === 'es' ? 'activo' : ''}`}><BanderaMX />ES</span>
      <span aria-hidden="true">/</span>
      <span aria-hidden="true" className={`idioma-op ${idioma === 'en' ? 'activo' : ''}`}><BanderaUS />EN</span>
    </button>
  );
}

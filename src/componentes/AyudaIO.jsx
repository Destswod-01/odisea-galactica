import { useId, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import { esModoProbar } from '../motor/tutorial.js';
import { useSinConsejos } from './TutorialFase.jsx';

export default function AyudaIO({ estacion, dificultad }) {
  const t = useT();
  const textoId = useId();
  const [sinConsejos] = useSinConsejos();
  const [abierto, setAbierto] = useState(() => !(sinConsejos || esModoProbar()));
  if (dificultad === 'experto') return null;
  return (
    <div className="t-ayuda-io">
      <button
        type="button"
        className="t-bot"
        aria-label={t('hangar.ayudaIO')}
        aria-expanded={abierto}
        aria-controls={textoId}
        onClick={() => setAbierto(!abierto)}
      >
        <span className="t-bot-visor" aria-hidden="true"><i /><i /></span>
        <small>IO</small>
      </button>
      <p id={textoId} hidden={!abierto}>{t(`hangar.explicacion.${estacion}`)}</p>
    </div>
  );
}

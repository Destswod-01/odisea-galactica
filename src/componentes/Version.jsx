import { useEffect, useState } from 'react';
import version from '../../version.json';
import { useT } from '../i18n/idioma.js';
import './version.css';

export default function Version() {
  const t = useT();
  const [nueva, setNueva] = useState(null);
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let activo = true;
    const controller = new AbortController();
    const revisar = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const respuesta = await fetch(new URL(`version.json?t=${Date.now()}`, location.href), { cache: 'no-store', signal: controller.signal });
        if (!respuesta.ok) return;
        const dato = await respuesta.json();
        if (activo && dato.version && dato.version !== version.version) setNueva(dato.version);
      } catch { /* Sin conexión: la partida sigue funcionando. */ }
    };
    revisar();
    const timer = setInterval(revisar, 60000);
    document.addEventListener('visibilitychange', revisar);
    return () => { activo = false; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', revisar); };
  }, []);
  const actualizar = () => { const url = new URL(location.href); url.searchParams.set('v', nueva); location.assign(url.href); };
  return <div className="version-publica"><span>{t('hangar.version', { v: version.version })}</span>{nueva && <div role="status"><strong>{t('hangar.nuevaVersion')}</strong><span>{t('hangar.nuevaVersionTexto')}</span><button onClick={actualizar}>{t('hangar.actualizar')}</button></div>}</div>;
}

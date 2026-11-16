// Aviso del espejo en línea: al piloto le dice que le toca manejar; a los demás, quién maneja y que están mirando.
import { useEffect, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import { espejoDeSala } from '../red/espejo.js';
import './aviso-espejo.css';

export default function AvisoEspejo({ red, equipo, fase }) {
  const t = useT();
  const e = espejoDeSala(red.sala, red.miId, fase);
  const [visto, setVisto] = useState(fase);
  useEffect(() => { if (!e.soyPiloto) return undefined; setVisto(null); const id = setTimeout(() => setVisto(fase), 6000); return () => clearTimeout(id); }, [fase, e.soyPiloto]);
  if (!e.activo) return null;
  if (e.soyPiloto) return visto === fase ? null : <div className="aviso-espejo piloto" role="status">{t('red.espejo.piloto')}</div>;
  const roles = equipo?.jugadores?.find((j) => j.idRed === e.piloto.id)?.roles ?? [];
  const rol = roles.length ? t(`equipo.rol.${roles[0]}`) : '';
  return <div className="aviso-espejo espectador" role="status">{rol ? t('red.espejo.mirando', { nombre: e.piloto.nombre, rol }) : t('red.espejo.mirandoSolo', { nombre: e.piloto.nombre })}</div>;
}

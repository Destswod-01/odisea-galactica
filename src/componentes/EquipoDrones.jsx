import { cantidadDrones, tiposDrones, EQUIPO_DRON } from '../motor/drones.js';
import { useState } from 'react';
import { COLOR_SONDA, nombreCortoSonda } from '../sondas/datos.js';
import { useT, useIdioma } from '../i18n/idioma.js';
import TallerSondas from './TallerSondas.jsx';
import './equipo-drones.css';
// `mision` es opcional: Hangar y Taller aún no la pasan, así que sin ella se usa la lista de LRO.
export default function EquipoDrones({ diseno, setDiseno, mision }) {
  const t = useT(), [idioma] = useIdioma(), [abierto, setAbierto] = useState(false);
  const n = cantidadDrones(diseno), tipos = tiposDrones(mision || { id: 'lro' }, diseno).slice(0, n);
  return <div className="equipo-drones"><span>{t('hangar.drones.bahia')}</span><h3>{t('hangar.drones.titulo')}</h3><p>{t('hangar.drones.texto', { kg: EQUIPO_DRON.masa_kg, musd: EQUIPO_DRON.costo_musd })}</p><p className={`equipo-drones-aviso ${n ? 'paso2' : 'paso1'}`} role="status">{n ? t('hangar.drones.avisoAsignar') : t('hangar.drones.avisoCantidad')}</p><div role="group" aria-label={t('hangar.drones.equipados')}>{[0, 1, 2, 3, 4].map(i => <button key={i} aria-pressed={n === i} onClick={() => setDiseno(d => ({ ...d, drones: i }))}>{i}</button>)}</div>{n > 0 && <ul className="equipo-drones-chips" aria-label={t('hangar.drones.tipos')}>{tipos.map((k, i) => <li key={i} style={{ '--c': COLOR_SONDA[k] }}><b>{k}</b> {nombreCortoSonda(k, idioma)}</li>)}</ul>}{n > 0 && <button type="button" className="equipo-drones-taller" onClick={() => setAbierto(true)}>{t('hangar.sondas.abrir')}</button>}{abierto && <TallerSondas {...{ diseno, setDiseno, mision, alCerrar: () => setAbierto(false) }} />}<strong>{n ? t('hangar.drones.resumen', { n, kg: n * 12, musd: n * 2 }) : t('hangar.drones.sin')}</strong><small>{t('hangar.drones.ficticia')}</small></div>;
}

// Modo equipo (B4): configuración de jugadores, aviso de turno, votación antes de lanzar y resultado en el informe.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import { conflictos, crearEquipo, evaluarRoles, MAX_JUGADORES, puntuacionEquipo, ROLES, turnoDeEstacion, votar, votoSugerido } from '../motor/equipo.js';
import './equipo.css';

const ICONO = Object.fromEntries(ROLES.map((r) => [r.id, r.icono]));

/** Elegir de 2 a 4 jugadores y ver cómo se reparten los roles. alListo(equipo). */
export function ConfigEquipo({ inicial, nombreInicial = '', alListo }) {
  const t = useT();
  const [nombres, setNombres] = useState(() => inicial?.jugadores?.length >= 2 ? inicial.jugadores.map((j) => j.nombre) : [nombreInicial, '']);
  const equipo = useMemo(() => crearEquipo(nombres.map((n, i) => n.trim() || t('equipo.nombre', { n: i + 1 }))), [nombres, t]);
  const valido = nombres.length >= 2 && nombres.every(n => n.trim().length > 0);
  const cambiar = (i, v) => setNombres((ns) => ns.map((n, k) => (k === i ? v.slice(0, 18) : n)));
  return (
    <section className="eq-config" aria-labelledby="eq-config-titulo">
      <h3 id="eq-config-titulo">👥 {t('equipo.titulo')}</h3>
      <p className="eq-intro">{t('red.minimoLocal')}</p>
      <div className="eq-nombres">
        {nombres.map((n, i) => (
          <div key={i} className="eq-nombre">
            <input value={n} onChange={(e) => cambiar(i, e.target.value)} placeholder={t('equipo.nombre', { n: i + 1 })} aria-label={t('equipo.nombre', { n: i + 1 })} />
            {nombres.length > 2 && <button type="button" onClick={() => setNombres((ns) => ns.filter((_, k) => k !== i))} aria-label={`${t('equipo.quitar')} ${i + 1}`}>×</button>}
          </div>
        ))}
        {nombres.length < MAX_JUGADORES && <button type="button" className="eq-agregar" onClick={() => setNombres((ns) => [...ns, ''])}>{t('equipo.agregar')}</button>}
      </div>
      <h4>{nombres.length === 1 ? t('equipo.solo') : t('equipo.reparto')}</h4>
      <ul className="eq-reparto">
        {equipo.jugadores.map((j) => (
          <li key={j.id}>
            <strong>{j.nombre}</strong>
            <span>{j.roles.map((r) => `${ICONO[r]} ${t(`equipo.rol.${r}`)}`).join(' · ')}</span>
          </li>
        ))}
      </ul>
      {alListo && <button type="button" className="primario eq-listo" disabled={!valido} onClick={() => { if (valido) alListo(crearEquipo(nombres)); }}>{t('menu.equipoListo')}</button>}
    </section>
  );
}

/** Aviso de turno en el hangar: quién tiene el dispositivo según la estación abierta. */
export function TurnoEquipo({ equipo, estacion }) {
  const t = useT();
  if (!equipo || equipo.jugadores.length < 2 || !estacion) return null;
  const { jugador, rol, icono } = turnoDeEstacion(equipo, estacion);
  return (
    <div className="eq-turno" role="status" aria-live="polite">
      <span className="eq-turno-icono" aria-hidden="true">{icono}</span>
      <span><strong>{t('equipo.turno', { nombre: jugador.nombre })}</strong><small>{t(`equipo.rol.${rol}`)}</small></span>
    </div>
  );
}

/**
 * Votación antes de lanzar. Cada rol ve su evaluación y vota (sugerido según su área).
 * alAprobado(equipoActualizado) si todos aprueban; alCambios(equipoActualizado) para volver al hangar.
 */
export function VotacionEquipo({ equipo, resumen, requisitos, alAprobado, alCambios }) {
  const t = useT();
  const ev = useMemo(() => evaluarRoles(resumen, requisitos), [resumen, requisitos]);
  const lista = useMemo(() => conflictos(resumen, ev), [resumen, ev]);
  const [votos, setVotos] = useState(() => Object.fromEntries(ROLES.map((r) => [r.id, votoSugerido(ev, r.id)])));
  const [resultado, setResultado] = useState(null);
  const primero = useRef(null);
  useEffect(() => { primero.current?.focus(); }, []);
  const dueño = (rol) => equipo.jugadores.find((j) => j.roles.includes(rol))?.nombre ?? '';
  const emitir = () => setResultado(votar(equipo, votos));
  return (
    <div className="eq-fondo">
      <section className="eq-votacion" role="dialog" aria-modal="true" aria-labelledby="eq-vot-titulo">
        <header>
          <h2 id="eq-vot-titulo">{t('equipo.votacion')} · {t('equipo.ronda', { n: equipo.rondas + 1 })}</h2>
          <p>{t('equipo.votacionIntro')}</p>
        </header>
        <ul className="eq-roles">
          {ROLES.map((r, i) => (
            <li key={r.id} className={ev[r.id].ok ? 'ok' : 'falla'}>
              <div className="eq-rol-cab"><span aria-hidden="true">{r.icono}</span><strong>{t(`equipo.rol.${r.id}`)}</strong><small>{dueño(r.id)}</small></div>
              <p>{ev[r.id].ok ? '✓' : '⚠'} {t(ev[r.id].clave, ev[r.id].vars)}</p>
              <div className="eq-voto" role="radiogroup" aria-label={t(`equipo.rol.${r.id}`)}>
                {['aprueba', 'cambio'].map((v) => (
                  <button key={v} ref={i === 0 && v === 'aprueba' ? primero : undefined} type="button" role="radio" aria-checked={votos[r.id] === v}
                    className={votos[r.id] === v ? `activo ${v}` : v} disabled={!!resultado} onClick={() => setVotos((x) => ({ ...x, [r.id]: v }))}>
                    {t(v === 'aprueba' ? 'equipo.aprueba' : 'equipo.cambio')}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {lista.length > 0 && (
          <div className="eq-conflictos">
            <h3>🤝 {t('equipo.conflictos')}</h3>
            <ul>{lista.map((c) => <li key={c.id}>{t(c.clave, c.vars)}</li>)}</ul>
          </div>
        )}
        <footer>
          {!resultado && <button type="button" className="primario" onClick={emitir}>{t('equipo.votar')}</button>}
          {resultado?.aprobado && (<><p className="eq-res ok" role="status">✅ {t('equipo.aprobado')}</p><button type="button" className="primario" onClick={() => alAprobado(resultado)}>{t('equipo.continuar')}</button></>)}
          {resultado && !resultado.aprobado && (<><p className="eq-res falla" role="status">{t('equipo.rechazado', { vetos: resultado.vetos - equipo.vetos })}</p><button type="button" onClick={() => alCambios(resultado)}>{t('equipo.volverHangar')}</button></>)}
        </footer>
      </section>
    </div>
  );
}

/** Tarjeta del informe: puntos por jugador, bono de coordinación y cómo se pusieron de acuerdo. */
export function ResultadoEquipo({ equipo, resumen, requisitos, cienciaFinal }) {
  const t = useT();
  if (!equipo || equipo.jugadores.length < 2) return null;
  const p = puntuacionEquipo(equipo, resumen, requisitos, cienciaFinal);
  return (
    <section className="eq-resultado" aria-labelledby="eq-res-titulo">
      <h3 id="eq-res-titulo">👥 {t('equipo.resultado')}</h3>
      <ul>
        {p.jugadores.map((j) => (
          <li key={j.id}><strong>{j.nombre}</strong><span>{j.roles.map((r) => ICONO[r]).join(' ')} {j.roles.map((r) => t(`equipo.rol.${r}`)).join(' · ')}</span><em>{t('equipo.puntos', { puntos: j.puntos })}</em></li>
        ))}
      </ul>
      <p className="eq-bono">{t('equipo.bono', { bono: Math.round(p.bono * 100) })}</p>
      <p>{p.equilibrada ? t('equipo.equilibrada') : t('equipo.desequilibrada')}</p>
      <p className="tenue">{t('equipo.rondas', { rondas: p.rondas, vetos: p.vetos })}</p>
    </section>
  );
}

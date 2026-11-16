// Modo equipo: panel «Jugar en equipo» (en este dispositivo o en línea con código), sala de espera,
// votación en red y resultados del equipo en red.
import { useMemo, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import { conflictos, crearEquipo, evaluarRoles, puntuacionEquipo, ROLES, votoSugerido } from '../motor/equipo.js';
import { crearSala, enviar, salirSala, unirseSala } from '../red/cliente.js';
import { ConfigEquipo } from './Equipo.jsx';
import './sala-red.css';
import { NIVELES, NIVEL_POR_DEFECTO } from '../motor/dificultad.js';

const ICONO = Object.fromEntries(ROLES.map((r) => [r.id, r.icono]));
const NOMBRE_GUARDADO = 'odisea-nombre';
const leerNombre = () => { try { return localStorage.getItem(NOMBRE_GUARDADO) || ''; } catch { return ''; } };
const guardarNombre = (n) => { try { localStorage.setItem(NOMBRE_GUARDADO, n); } catch { /* sin almacenamiento */ } };

/** Equipo del juego a partir de los jugadores de la sala (en orden de llegada), con su id de red. */
export function equipoDeSala(sala) {
  const e = crearEquipo(sala.jugadores.map((j) => j.nombre));
  return { ...e, jugadores: e.jugadores.map((j, i) => ({ ...j, idRed: sala.jugadores[i]?.id })) };
}

/** Panel del menú «Jugar en equipo». */
export function PanelEquipo({ red, mision, nombreMision, alLocal, alEmpezarRed, modoInicial = null, nombreInicial, alNombre }) {
  const t = useT();
  const [modo, setModo] = useState(red.sala ? 'red' : modoInicial);
  const [nombre, setNombre] = useState(() => nombreInicial ?? leerNombre());
  const [codigo, setCodigo] = useState('');
  const [dificultad, setDificultad] = useState(NIVEL_POR_DEFECTO);
  const sala = red.sala;
  const soyHost = sala && sala.hostId === red.miId;
  const equipo = useMemo(() => (sala ? equipoDeSala(sala) : null), [sala]);
  const listoNombre = nombre.trim().length > 0;
  const conNombre = (f) => () => { guardarNombre(nombre.trim()); f(); };

  if (!modo && !sala) return (
    <div className="sr">
      <span className="menu-kicker">{t('red.kicker')}</span><h2>{t('red.titulo')}</h2>
      <p>{t('red.intro')}</p>
      <div className="sr-opciones">
        <button className="sr-opcion" onClick={() => setModo('red')}><strong>🌐 {t('red.enLinea')}</strong><span>{t('red.enLineaDesc')}</span></button>
        <button className="sr-opcion" onClick={() => setModo('local')}><strong>📱 {t('red.local')}</strong><span>{t('red.localDesc')}</span></button>
      </div>
    </div>
  );

  if (modo === 'local' && !sala) return (
    <div className="sr">
      <button className="sr-atras" onClick={() => setModo(null)}>← {t('red.atras')}</button>
      <ConfigEquipo nombreInicial={nombre} alListo={alLocal} />
    </div>
  );

  if (!sala) return (
    <div className="sr">
      <button className="sr-atras" onClick={() => setModo(null)}>← {t('red.atras')}</button>
      <h2>🌐 {t('red.enLinea')}</h2>
      <label className="sr-campo">{t('red.tuNombre')}<input value={nombre} maxLength={18} onChange={(e) => { setNombre(e.target.value); alNombre?.(e.target.value); }} placeholder={t('red.nombreEj')} /></label>
      <div className="sr-dos">
        <section>
          <h3>{t('red.crear')}</h3>
          <p>{t('red.crearDesc', { mision: nombreMision })}</p>
          <button className="primario" disabled={!listoNombre || red.estado === 'conectando'} onClick={conNombre(() => crearSala(nombre.trim()))}>{t('red.crearBoton')}</button>
        </section>
        <section>
          <h3>{t('red.unirme')}</h3>
          <input className="sr-codigo-campo" value={codigo} maxLength={5} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABCDE" aria-label={t('red.codigo')} />
          <button disabled={!listoNombre || codigo.length !== 5 || red.estado === 'conectando'} onClick={conNombre(() => unirseSala(codigo, nombre.trim()))}>{t('red.unirmeBoton')}</button>
        </section>
      </div>
      {red.estado === 'conectando' && <p className="sr-aviso">{t('red.conectando')}</p>}
      {red.error && red.error !== 'reconectando' && <p className="sr-aviso sr-error" role="alert">{t(`red.error.${red.error}`, null, t('red.error.generico'))}</p>}
    </div>
  );

  // Sala de espera.
  const host = sala.jugadores.find((j) => j.id === sala.hostId);
  return (
    <div className="sr">
      <span className="menu-kicker">{t('red.salaKicker')}</span>
      <h2>{t('red.sala')}</h2>
      <div className="sr-codigo" aria-label={t('red.codigo')}>
        <span>{t('red.comparte')}</span>
        <strong>{sala.codigo}</strong>
        <button onClick={() => navigator.clipboard?.writeText(sala.codigo)}>{t('red.copiar')}</button>
      </div>
      <ul className="sr-jugadores">
        {equipo.jugadores.map((j, i) => (
          <li key={j.idRed ?? i} className={sala.jugadores[i]?.conectado ? '' : 'fuera'}>
            <strong>{j.nombre}{j.idRed === red.miId ? ` · ${t('red.tu')}` : ''}{j.idRed === sala.hostId ? ' · ⭐' : ''}</strong>
            <span>{j.roles.map((r) => `${ICONO[r]} ${t(`equipo.rol.${r}`)}`).join(' · ')}</span>
          </li>
        ))}
        {sala.jugadores.length < 4 && <li className="sr-hueco">{t('red.hueco', { n: 4 - sala.jugadores.length })}</li>}
      </ul>
      {soyHost ? (
        <div className="sr-host">
          <p>{t('red.mision', { mision: nombreMision })}</p>
          <div className="sr-dif" role="radiogroup" aria-label={t('dificultad.titulo')}>
            {NIVELES.map((n) => <button key={n} role="radio" aria-checked={dificultad === n} className={dificultad === n ? 'activo' : ''} onClick={() => setDificultad(n)}>{t(`dificultad.${n}.nombre`)}</button>)}
          </div>
          <button className="primario" disabled={!mision || sala.jugadores.length < 2 || (red.estado !== 'en_sala' || red.error === 'reconectando')} onClick={() => { if (sala.jugadores.length >= 2) alEmpezarRed({ equipo: equipoDeSala(sala), dificultad }); }}>{t('red.empezar')}</button>
          {sala.jugadores.length < 2 && <p className="sr-aviso">{t('red.faltanJugadores')}</p>}
        </div>
      ) : <p className="sr-aviso">{t('red.esperando', { host: host?.nombre ?? '' })}</p>}
      <button className="sr-salir" onClick={salirSala}>{t('red.salir')}</button>
      {red.error === 'reconectando' && <p className="sr-aviso">{t('red.reconectando')}</p>}
    </div>
  );
}

/** Lista fija en el hangar en red: cada jugador con sus roles, si está conectado y qué estación tiene abierta. */
// Piezas que revisa cada estación (para la lista de pendientes). Órbita y estilo nunca faltan.
const PIEZAS_ESTACION = { cohete: ['cohete'], propulsion: ['propulsion'], energia: ['energia'], blindaje: ['blindaje'], antena: ['antena'], instrumentos: ['instrumentos'], sistemas: ['bateria', 'computadora', 'orientacion'] };
const ESTACIONES_ROL = Object.fromEntries(ROLES.map((r) => [r.id, r.estaciones.filter((e) => PIEZAS_ESTACION[e])]));

export function BarraRed({ red, equipo, misRoles, aviso, faltan = [] }) {
  const t = useT();
  const [abierta, setAbierta] = useState(() => typeof matchMedia !== 'function' || !matchMedia('(max-width: 700px)').matches);
  if (!red.sala) return null;
  const presencia = red.sala.estado?.presencia ?? {};
  const nombreEstacion = (id) => (!id ? '' : id === 'sistemas' ? t('sistemas.chip') : id === 'orbita' ? t('orbita.chip') : t(`hangar.estacion.${id}.corto`, null, id));
  const jugadores = equipo?.jugadores ?? [];
  const falta = (estacion) => PIEZAS_ESTACION[estacion].some((k) => faltan.includes(k));
  const pendientes = Object.keys(PIEZAS_ESTACION).filter(falta).length;
  return (
    <aside className={`sr-lista ${abierta ? '' : 'cerrada'}`} aria-label={t('red.listaJugadores')}>
      <header><strong>🌐 {red.sala.codigo}</strong><span>{t('red.tusRoles')}: {misRoles.map((r) => ICONO[r]).join(' ')}</span><button type="button" className="sr-min" onClick={() => setAbierta(!abierta)} aria-expanded={abierta} aria-label={abierta ? t('red.minimizar') : t('red.mostrar')}>{abierta ? '−' : '+'}</button></header>
      <p className={`sr-pendientes ${pendientes ? 'faltan' : 'listo'}`} role="status">{pendientes ? t('red.faltanPiezas', { n: pendientes }) : t('red.naveLista')}</p>
      {abierta && <ul>
        {jugadores.map((j) => {
          const enLinea = red.sala.jugadores.find((x) => x.id === j.idRed)?.conectado;
          const donde = nombreEstacion(presencia[j.idRed]);
          return (
            <li key={j.idRed ?? j.id} className={`${enLinea ? 'on' : 'off'} ${j.idRed === red.miId ? 'yo' : ''}`}>
              <i aria-hidden="true" />
              <div>
                <strong>{j.nombre}{j.idRed === red.miId ? ` · ${t('red.tu')}` : ''}</strong>
                <small>{j.roles.map((r) => `${ICONO[r]} ${t(`equipo.rol.${r}`)}`).join(' · ')}</small>
                {donde && <small className="sr-donde">{t('red.enEstacion', { estacion: donde })}</small>}
                <span className="sr-checks">{j.roles.flatMap((r) => ESTACIONES_ROL[r] ?? []).map((e) => <b key={e} className={falta(e) ? 'no' : 'si'}>{falta(e) ? '✗' : '✓'} {nombreEstacion(e)}</b>)}</span>
              </div>
            </li>
          );
        })}
      </ul>}
      {aviso && <p className="sr-barra-aviso" role="status">{aviso}</p>}
    </aside>
  );
}

/** Votación en red: cada quien vota con sus roles; la ronda se cierra en el servidor cuando votan los 4. */
export function VotacionRed({ red, misRoles, equipo, resumen, requisitos, rondaVista = 0, alAprobado, alCerrar }) {
  const t = useT();
  const est = red.sala?.estado ?? {};
  const ev = useMemo(() => evaluarRoles(resumen, requisitos), [resumen, requisitos]);
  const lista = useMemo(() => conflictos(resumen, ev), [resumen, ev]);
  const [mios, setMios] = useState(() => Object.fromEntries(misRoles.map((r) => [r, votoSugerido(ev, r)])));
  const resultado = est.votacion && est.votacion.ronda > rondaVista ? est.votacion : null;
  const yaVote = misRoles.length > 0 && misRoles.every((r) => est.votos?.[r]);
  const dueno = (rol) => equipo.jugadores.find((j) => j.roles.includes(rol))?.nombre ?? '';
  return (
    <div className="eq-fondo">
      <section className="eq-votacion" role="dialog" aria-modal="true" aria-labelledby="sr-vot-titulo">
        <header>
          <h2 id="sr-vot-titulo">🌐 {t('equipo.votacion')} · {t('equipo.ronda', { n: (est.ronda ?? 0) + (resultado ? 0 : 1) })}</h2>
          <p>{t('red.votacionIntro')}</p>
        </header>
        <ul className="eq-roles">
          {ROLES.map((r) => {
            const mio = misRoles.includes(r.id);
            const votado = resultado ? resultado.votos[r.id] : est.votos?.[r.id];
            return (
              <li key={r.id} className={ev[r.id].ok ? 'ok' : 'falla'}>
                <div className="eq-rol-cab"><span aria-hidden="true">{r.icono}</span><strong>{t(`equipo.rol.${r.id}`)}</strong><small>{dueno(r.id)}{mio ? ` · ${t('red.tu')}` : ''}</small></div>
                <p>{ev[r.id].ok ? '✓' : '⚠'} {t(ev[r.id].clave, ev[r.id].vars)}</p>
                {mio && !yaVote && !resultado ? (
                  <div className="eq-voto" role="radiogroup" aria-label={t(`equipo.rol.${r.id}`)}>
                    {['aprueba', 'cambio'].map((v) => <button key={v} type="button" role="radio" aria-checked={mios[r.id] === v} className={mios[r.id] === v ? `activo ${v}` : v} onClick={() => setMios((x) => ({ ...x, [r.id]: v }))}>{t(v === 'aprueba' ? 'equipo.aprueba' : 'equipo.cambio')}</button>)}
                  </div>
                ) : <p className="sr-voto-estado">{votado ? (resultado || mio ? t(votado === 'aprueba' ? 'equipo.aprueba' : 'equipo.cambio') : t('red.yaVoto')) : t('red.esperandoVoto')}</p>}
              </li>
            );
          })}
        </ul>
        {lista.length > 0 && <div className="eq-conflictos"><h3>🤝 {t('equipo.conflictos')}</h3><ul>{lista.map((c) => <li key={c.id}>{t(c.clave, c.vars)}</li>)}</ul></div>}
        <footer>
          {!resultado && !yaVote && misRoles.length > 0 && <button type="button" className="primario" onClick={() => enviar({ t: 'voto', votos: mios })}>{t('equipo.votar')}</button>}
          {!resultado && yaVote && <p className="eq-res" role="status">{t('red.esperandoEquipo')}</p>}
          {resultado?.aprobado && <><p className="eq-res ok" role="status">✅ {t('equipo.aprobado')}</p><button type="button" className="primario" onClick={alAprobado}>{t('equipo.continuar')}</button></>}
          {resultado && !resultado.aprobado && <><p className="eq-res falla" role="status">{t('equipo.rechazado', { vetos: resultado.vetos })}</p><button type="button" onClick={alCerrar}>{t('equipo.volverHangar')}</button></>}
        </footer>
      </section>
    </div>
  );
}

/** Resultado del equipo en red: el puntaje de cada jugador (cada quien vuela su copia de la misma nave). */
export function ResultadoRed({ red, equipo, resumen, requisitos, cienciaFinal }) {
  const t = useT();
  const sala = red.sala;
  if (!sala || !equipo) return null;
  const est = sala.estado;
  const p = puntuacionEquipo({ ...equipo, rondas: est.ronda ?? 0, vetos: est.vetosTotal ?? 0 }, resumen, requisitos, cienciaFinal);
  const puntajes = equipo.jugadores.map((j) => est.resultados?.[j.idRed]?.puntaje).filter((x) => Number.isFinite(x));
  const promedio = puntajes.length ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length) : null;
  return (
    <section className="eq-resultado" aria-labelledby="sr-res-titulo">
      <h3 id="sr-res-titulo">🌐 {t('red.resultado', { codigo: sala.codigo })}</h3>
      <ul>
        {equipo.jugadores.map((j) => {
          const r = est.resultados?.[j.idRed];
          return <li key={j.idRed}><strong>{j.nombre}</strong><span>{j.roles.map((x) => ICONO[x]).join(' ')} {j.roles.map((x) => t(`equipo.rol.${x}`)).join(' · ')}</span><em>{r ? t('red.puntos', { puntos: Math.round(r.puntaje) }) : t('red.volando')}</em></li>;
        })}
      </ul>
      {promedio !== null && <p className="eq-bono">{t('red.promedio', { puntos: promedio })} · {t('equipo.bono', { bono: Math.round(p.bono * 100) })}</p>}
      <p>{p.equilibrada ? t('equipo.equilibrada') : t('equipo.desequilibrada')}</p>
      <p className="tenue">{t('equipo.rondas', { rondas: est.ronda ?? 0, vetos: est.vetosTotal ?? 0 })}</p>
    </section>
  );
}

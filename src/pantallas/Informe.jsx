import PremioPieza from '../componentes/PremioPieza.jsx';
// Informe final: arriba el puntaje (desglosado en barras) y los botones; abajo 4 pestañas para no apilar todo el texto:
// Resultado (por qué salió así) · Tu nave (contra la real de NASA) · Bitácora (lo que pasó) · Ranking.
import { disenoReal, resumenNave } from '../motor/nave.js';
import { puntaje, explicaciones } from '../motor/mision.js';
import Nave from '../componentes/Nave.jsx';
import Parche from '../componentes/Parche.jsx';
import Contador from '../componentes/Contador.jsx';
import { Comparacion } from '../tres/perezoso.jsx';
import { soportaWebGL } from '../tres/webgl.js';
import { useEffect, useRef, useState } from 'react';
import Confeti from '../componentes/Confeti.jsx';
import { sonidos } from '../sonido.js';
import { useT } from '../i18n/idioma.js';
import { BannerDirectora } from '../componentes/TutorialFase.jsx';
import './informe.css';

const ICONO_NIVEL = { bien: '✅', aviso: '⚠️', mal: '❌' };
const MEDALLA_IMG = { Bronce: 'bronce', Plata: 'plata', Oro: 'oro', 'Nivel JPL': 'jpl' };
const PARTES = [['ciencia', 50], ['presupuesto', 15], ['salud', 15], ['ejecucion', 15], ['reales', 5]];
const PESTANAS = [['resultado', '📊'], ['nave', '🛰️'], ['bitacora', '📜'], ['ranking', '🏆']];

export default function Informe({ mision, piezas, cohetes, diseno, estetica, resumen, estado, extras, alReintentar, alMenu, alCobrar, alCerrarPremio, equipo, misRoles = [], dificultad = 'intermedio', paneles = {} }) {
  const t = useT();
  const [pestana, setPestana] = useState('resultado');
  // Al terminar la partida: 1 minuto y regresa solo a la página principal (se puede ir ya o quedarse a leer).
  const [restante, setRestante] = useState(60);
  const [quedarse, setQuedarse] = useState(false);
  const p = puntaje(estado, resumen, mision, extras);
  const real = disenoReal(mision, piezas);
  const rReal = resumenNave(real, piezas, cohetes, mision);
  const nombre = (id) => piezas.find((x) => x.id === id)?.nombre || cohetes.find((x) => x.id === id)?.nombre || '—';
  const pq = mision.real.por_que;
  // Con medalla, la agencia paga (una sola vez por informe). Repetir solo paga si mejoras la medalla.
  const exito = !estado.perdida && p.medalla !== 'Sin medalla';
  const [pago, setPago] = useState(null);
  const cobrado = useRef(false);
  useEffect(() => {
    if (cobrado.current || !exito) return;
    cobrado.current = true;
    setPago(alCobrar(p.medalla));
    setTimeout(() => sonidos.medalla(), 400);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (quedarse || pago?.premio) return undefined;
    if (restante <= 0) { alMenu(); return undefined; }
    const id = setTimeout(() => setRestante((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [restante, quedarse, pago?.premio]); // eslint-disable-line react-hooks/exhaustive-deps

  const filas = [
    [t('informe.f.energia'), nombre(diseno.energia), nombre(real.energia), pq.energia],
    [t('informe.f.antena'), nombre(diseno.antena), nombre(real.antena), pq.antena],
    [t('informe.f.blindaje'), nombre(diseno.blindaje), nombre(real.blindaje), pq.blindaje],
    [t('informe.f.propulsion'), nombre(diseno.propulsion), nombre(real.propulsion), pq.propulsion],
    [t('informe.f.cohete'), nombre(diseno.cohete), nombre(real.cohete), pq.cohete],
    [t('informe.f.instrumentos'), `${diseno.instrumentos.length}`, `${real.instrumentos.length}`, ''],
    [t('informe.f.masa'), `${Math.round(resumen.masaTotal)} kg`, `${mision.real.resumen.masa_kg} kg`, ''],
    [t('informe.f.energiaEn', { destino: mision.destino.nombre }), `${Math.round(resumen.generacion)} W`, `≈ ${mision.real.resumen.energia_jupiter_w} W`, ''],
    [t('informe.f.costo'), t('informe.musd', { n: resumen.costo }), t('informe.musd', { n: mision.real.resumen.costo_musd }), ''],
  ];

  return (
    <div className="rejilla informe-v2">
      <BannerDirectora fase="informe" equipo={equipo} misRoles={misRoles} dificultad={dificultad} perdida={!!estado.perdida} />
      <div className="panel inf-hero">
        {exito && <img className="medalla-grande" src={`./img/medalla-${MEDALLA_IMG[p.medalla]}.webp`} alt={t('informe.medallaAlt', { medalla: t(`informe.medalla.${p.medalla}`) })} />}
        {exito && <Confeti />}
        <div className="medalla"><Parche parche={estetica.parche} nombre={estetica.nombre} destino={mision.destino.nombre.toUpperCase()} color={estetica.detalle} tam={96} /></div>
        <div className="inf-puntaje">
          <h3>{t('informe.titulo')}</h3>
          <h1 className={estado.perdida ? 'mal' : 'bien'}>
            {estado.perdida ? t('informe.perdida') : <><Contador valor={p.total} />{t('informe.puntos')}<span className={`medalla-txt medalla m-${p.medalla.split(' ')[0].toLowerCase()}`}>{t(`informe.medalla.${p.medalla}`)}</span></>}
          </h1>
          {estado.perdida && <p className="mal">{estado.perdida}</p>}
          {!estado.perdida && !exito && <p className="aviso">{t('informe.sinMedalla')}</p>}
          {!estado.perdida && (
            <ul className="inf-partes" aria-label={t('informe.partes', p.partes)}>
              {PARTES.map(([k, max]) => (
                <li key={k}>
                  <span>{t(`informe.parte.${k}`)}</span>
                  <i><em className={p.partes[k] / max >= .7 ? 'bien' : p.partes[k] / max >= .4 ? 'medio' : 'bajo'} style={{ width: `${Math.round((p.partes[k] / max) * 100)}%` }} /></i>
                  <b>{p.partes[k]}/{max}</b>
                </li>
              ))}
            </ul>
          )}
          {pago && (
            <p className="pago">
              {pago.pago > 0
                ? <>{t('informe.pagoA')}<strong>{pago.pago}{t('informe.pagoB')}</strong>{t('informe.pagoC')}</>
                : <>{t('informe.yaCobrado', { monto: pago.monto })}</>}
            </p>
          )}
          {pago?.premio && <PremioPieza id={pago.premio} nombre={nombre(pago.premio)} alCerrar={() => { alCerrarPremio?.(); setPago(actual => ({ ...actual, premio: null })); }} />}
        </div>
        <div className="acciones inf-acciones">
          {!quedarse && <p className="inf-contador" role="timer" aria-live="off">{t('informe.contador', { s: restante })} <button type="button" className="inf-quedarse" onClick={() => setQuedarse(true)}>{t('informe.quedarse')}</button></p>}
          <button className="primario" onClick={alMenu}>{exito ? t('informe.siguiente') : t('informe.volverMenu')}</button>
          <button onClick={alReintentar}>{t('informe.reintentar')}</button>
        </div>
      </div>

      <nav className="inf-pestanas" role="tablist" aria-label={t('informe.titulo')}>
        {PESTANAS.map(([id, icono]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}>
            <span aria-hidden="true">{icono}</span> {t(`informe.tab.${id}`)}
          </button>
        ))}
      </nav>

      {pestana === 'resultado' && <>
        {paneles.equipo && <div className="panel">{paneles.equipo}</div>}
        <div className="panel porque">
          <h3>{t('porque.titulo')}</h3>
          <ul className="porque-lista inf-chips">
            {explicaciones(resumen, estado, mision).map((x) => (
              <li key={x.recurso + x.clave} className={x.nivel}>
                <span className="porque-icono" role="img" aria-label={t(`porque.nivel.${x.nivel}`)}>{ICONO_NIVEL[x.nivel]}</span> <span>{t(x.clave, x.vars)}</span>
              </li>
            ))}
          </ul>
          <details className="inf-mas">
            <summary>{t('porque.segmentos')}</summary>
            <ul className="porque-lista">
              <li className="info">🚀 {t('porque.lanzamiento')}</li>
              <li className="info">🛰️ {t('porque.espacio')}</li>
              <li className="info">📡 {t('porque.tierra')}</li>
              <li className="info">👩‍🔬 {t(`porque.usuario.${['lro', 'juno'].includes(mision.id) ? mision.id : 'otro'}`)}</li>
            </ul>
          </details>
        </div>
      </>}

      {pestana === 'nave' && <>
        <div className="panel" style={{ textAlign: 'center' }}>
          <h3>{t('informe.contra', { nombre: mision.nombre_real })}</h3>
          {soportaWebGL() ? (
            <>
              <Comparacion diseno={diseno} estetica={estetica} real={real} />
              <div style={{ display: 'flex' }}><p className="tenue" style={{ flex: 1 }}>{estetica.nombre || t('informe.tuNave')}</p><p className="tenue" style={{ flex: 1 }}>{t('informe.nasa', { nombre: mision.nombre_real })}</p></div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}><Nave diseno={diseno} estetica={estetica} ancho={220} senal={false} /><p className="tenue">{estetica.nombre || t('informe.tuNave')}</p></div>
              <div style={{ flex: 1 }}><Nave diseno={real} estetica={{ casco: '#c9d3e6', detalle: '#ff7a1a' }} ancho={220} senal={false} /><p className="tenue">{t('informe.nasa', { nombre: mision.nombre_real })}</p></div>
            </div>
          )}
        </div>
        <div className="panel">
          <h3>{t('informe.piezaTitulo')}</h3>
          <div className="inf-tabla">
            <table>
              <thead><tr><th></th><th>{t('informe.tuNave')}</th><th>{t('informe.colReal', { nombre: mision.nombre_real })}</th></tr></thead>
              <tbody>
                {filas.map(([k, tuya, suya]) => (
                  <tr key={k}><td>{k}</td><td className={tuya === suya ? 'bien' : ''}>{tuya === suya ? '✓ ' : ''}{tuya}</td><td>{suya}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="inf-mas">
            <summary>{t('informe.porqueNasa', { nombre: mision.nombre_real })}</summary>
            <ul className="porque-lista">
              {filas.filter(([, , , porque]) => porque).map(([k, , , porque]) => <li key={k}><b>{k}:</b> {porque}</li>)}
              <li>{pq.orbita} {pq.final}</li>
              <li>{t('informe.masaReal', { n: Math.round(rReal.masaTotal) })}</li>
            </ul>
          </details>
        </div>
        {paneles.nasa && <div className="panel">{paneles.nasa}</div>}
      </>}

      {pestana === 'bitacora' && (
        <div className="panel">
          <h3>{t('informe.pasoTitulo')}</h3>
          <ul className="inf-bitacora">
            {estado.decisiones.map((d, i) => <li key={i} className={d.tipo}>{d.texto}</li>)}
          </ul>
        </div>
      )}

      {pestana === 'ranking' && <>
        {paneles.ranking && <div className="panel">{paneles.ranking}</div>}
        {paneles.historial && <div className="panel">{paneles.historial}</div>}
      </>}
    </div>
  );
}

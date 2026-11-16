// Simulación rápida y comparación de intentos (B5). Dos piezas autónomas:
//  - SimulacionRapida: panel modal con la estimación del diseño actual.
//  - Comparacion: tabla (o tarjetas en el celular) con los últimos 5 intentos de la misión.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import piezas from '../datos/piezas.json';
import { borrarIntentos, leerIntentos, registrarIntento, resumenCorto, simulacionRapida } from '../motor/intentos.js';
import './intentos.css';

const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);

function Barra({ etiqueta, valor, texto, tono }) {
  return (
    <div className="in-barra">
      <div className="in-barra-top"><span>{etiqueta}</span><strong>{texto}</strong></div>
      <div className="in-pista" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(valor)}>
        <i className={tono} style={{ width: `${pct(valor)}%` }} />
      </div>
    </div>
  );
}

export function SimulacionRapida({ mision, resumen, diseno, alCerrar, alGuardar }) {
  const t = useT();
  const primero = useRef(null);
  const [guardado, setGuardado] = useState(false);
  const sim = useMemo(() => simulacionRapida(resumen, mision, diseno, piezas), [resumen, mision, diseno]);

  useEffect(() => {
    primero.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [alCerrar]);

  const guardar = () => {
    if (guardado) return;
    registrarIntento({ misionId: mision.id, diseno, resumenCorto: resumenCorto(resumen, mision, diseno, sim.ciencia), puntaje: sim.puntaje, tipo: 'simulacion', fecha: Date.now() });
    setGuardado(true);
    alGuardar?.();
  };

  const m = sim.presupuesto.margen;
  const { cumplidos, total } = sim.requisitos;
  return (
    <div className="in-fondo">
      <section className="in-panel" role="dialog" aria-modal="true" aria-labelledby="in-titulo">
        <header>
          <h2 id="in-titulo">🧪 {t('intentos.titulo')}</h2>
          <p>{t('intentos.intro')}</p>
        </header>
        <div className="in-cuerpo">
          <div className="in-puntaje" aria-live="polite">
            <span>{t('intentos.puntaje')}</span>
            <strong>{sim.puntaje}<small>/100</small></strong>
          </div>
          <Barra etiqueta={t('intentos.ciencia')} valor={sim.ciencia} texto={`${pct(sim.ciencia)} %`} tono="ok" />
          <Barra etiqueta={t('intentos.salud')} valor={sim.salud / 100} texto={`${Math.round(sim.salud)} %`} tono={sim.salud < 60 ? 'aviso' : 'ok'} />
          <Barra etiqueta={t('intentos.presupuesto')} valor={Math.max(0, m) / 0.2} texto={`${m >= 0 ? '+' : '−'}${Math.round(Math.abs(m) * 100)} %`} tono={m < 0 ? 'mal' : 'ok'} />
          <Barra etiqueta={t('intentos.requisitos')} valor={total ? cumplidos / total : 0} texto={t('intentos.requisitosVal', { cumplidos, total })} tono={cumplidos < total ? 'aviso' : 'ok'} />
          <h3>{t('intentos.porque')}</h3>
          <ul className="in-motivos">
            {sim.motivos.map((x) => <li key={x.clave}>{t(x.clave, x.vars)}</li>)}
          </ul>
          <p className="in-nota">{t('intentos.aviso')}</p>
        </div>
        <div className="in-botones">
          <button type="button" ref={primero} onClick={guardar} disabled={guardado}>{guardado ? t('intentos.guardado') : t('intentos.guardar')}</button>
          <button type="button" className="secundario" onClick={alCerrar}>{t('intentos.cerrar')}</button>
        </div>
      </section>
    </div>
  );
}

const fechaCorta = (f) => {
  try { return new Date(f).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

// `actual` (opcional): { diseno, resumen, mision, puntaje, ciencia } del intento que acaba de terminar.
// Si viene, se registra UNA vez como tipo 'mision' y esa fila queda marcada como «Actual».
export function Comparacion({ misionId, actual }) {
  const t = useT();
  const [lista, setLista] = useState(() => leerIntentos(misionId));
  const [fechaActual, setFechaActual] = useState(null);
  const hecho = useRef(false);

  useEffect(() => {
    if (!actual || hecho.current) return;
    hecho.current = true;
    const fecha = Date.now();
    setFechaActual(fecha);
    setLista(registrarIntento({
      misionId, diseno: actual.diseno, tipo: 'mision', fecha, puntaje: actual.puntaje,
      resumenCorto: resumenCorto(actual.resumen, actual.mision, actual.diseno, actual.ciencia),
    }));
  }, [actual, misionId]);

  if (!lista.length) return null;
  const mejor = Math.max(...lista.map((i) => i.puntaje));
  const borrar = () => { borrarIntentos(misionId); setLista([]); };
  const filas = lista.map((i) => ({
    i, r: i.resumenCorto || {}, esMejor: i.puntaje === mejor, esActual: fechaActual != null && i.fecha === fechaActual,
    icono: i.tipo === 'mision' ? '🚀' : '🧪', tipo: t(`intentos.tipo.${i.tipo === 'mision' ? 'mision' : 'simulacion'}`),
  }));
  const cls = (f) => `${f.esMejor ? 'mejor' : ''} ${f.esActual ? 'actual' : ''}`.trim();
  const marcas = (f) => (
    <>
      {f.esMejor && <em className="in-marca">{t('intentos.mejor')}</em>}
      {f.esActual && <em className="in-marca act">{t('intentos.actual')}</em>}
    </>
  );

  return (
    <section className="in-comparacion" aria-labelledby="in-comp-titulo">
      <h3 id="in-comp-titulo">{t('intentos.comparacion')}</h3>
      <table className="in-tabla">
        <thead>
          <tr>
            <th>{t('intentos.col.fecha')}</th><th>{t('intentos.col.tipo')}</th><th>{t('intentos.col.masa')}</th><th>{t('intentos.col.costo')}</th>
            <th>{t('intentos.col.ciencia')}</th><th>{t('intentos.col.datos')}</th><th>{t('intentos.col.orbita')}</th><th>{t('intentos.col.puntaje')}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.i.fecha} className={cls(f)}>
              <td>{fechaCorta(f.i.fecha)}</td>
              <td><span title={f.tipo} aria-label={f.tipo}>{f.icono}</span></td>
              <td>{f.r.masa} kg</td><td>{f.r.costo} M</td><td>{f.r.ciencia} %</td><td>{f.r.datosPerdidos} %</td><td>{f.r.orbita || '—'}</td>
              <td><strong>{f.i.puntaje}</strong> {marcas(f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="in-tarjetas">
        {filas.map((f) => (
          <li key={f.i.fecha} className={cls(f)}>
            <div className="in-t-top"><span>{f.icono} {f.tipo} · {fechaCorta(f.i.fecha)}</span><strong>{f.i.puntaje} {marcas(f)}</strong></div>
            <dl>
              <div><dt>{t('intentos.col.masa')}</dt><dd>{f.r.masa} kg</dd></div>
              <div><dt>{t('intentos.col.costo')}</dt><dd>{f.r.costo} M</dd></div>
              <div><dt>{t('intentos.col.ciencia')}</dt><dd>{f.r.ciencia} %</dd></div>
              <div><dt>{t('intentos.col.datos')}</dt><dd>{f.r.datosPerdidos} %</dd></div>
              <div><dt>{t('intentos.col.orbita')}</dt><dd>{f.r.orbita || '—'}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <button type="button" className="in-borrar" onClick={borrar}>{t('intentos.borrar')}</button>
    </section>
  );
}

export default SimulacionRapida;

import { useEffect, useState } from 'react';
import { recursosHangar, resumenDestinos, listaNodrizas, limitesNodriza, NODRIZA_POR_DEFECTO } from '../motor/recursos.js';
import { useIdioma, useT } from '../i18n/idioma.js';
import './panel-recursos.css';

const ICONOS = {
  costo: './img/icono-fondos.webp',
  masa: './img/icono-masa.webp',
  energia: './img/icono-energia.webp',
  dv: './img/icono-dv.webp',
  datos: './img/icono-datos.webp',
  tiempo: './img/icono-bateria.webp',
  drones: './img/icono-ciencia.webp',
};

const CLASE_VEREDICTO = { viable: 'bien', viable_con_cambios: 'aviso', no_viable: 'mal' };

// Semáforo de cada recurso: rojo/ámbar si no cumple; ámbar también si está al límite (≥ 90 %).
const tono = (f) => (!f.ok ? (f.soloAviso ? 'aviso' : 'mal') : f.fraccion >= 0.9 ? 'aviso' : 'bien');

const estadoClave = (m, t) => {
  const tn = tono(m);
  if (tn === 'bien') return t('recursos.estado.bien');
  if (tn === 'aviso' && m.ok) return t('recursos.estado.aviso');
  const falta = m.id === 'energia' || m.id === 'dv' || m.id === 'datos';
  return t(falta ? 'recursos.estado.falta' : 'recursos.estado.excede');
};

function Anillo({ fraccion, tam = 30, grosor = 3.5, children }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraccion || 0));
  const off = c * (1 - clamped);
  return (
    <span className="pr-anillo" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden="true">
        <circle className="pr-pista" cx={tam / 2} cy={tam / 2} r={r} strokeWidth={grosor} />
        <circle
          className="pr-arco"
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          strokeWidth={grosor}
          transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
          style={{ strokeDasharray: c, strokeDashoffset: off, '--c': c, '--off': off }}
        />
      </svg>
      <span className="pr-centro">{children}</span>
    </span>
  );
}

function useEsMovil() {
  const [movil, setMovil] = useState(() => typeof matchMedia === 'function' && matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const mq = matchMedia('(max-width: 700px)');
    const actualizar = () => setMovil(mq.matches);
    actualizar();
    mq.addEventListener?.('change', actualizar);
    return () => mq.removeEventListener?.('change', actualizar);
  }, []);
  return movil;
}

function veredictoActual(resumen, r, metricas) {
  if (!resumen?.puedeLanzar) return 'no_viable';
  const hayAviso = metricas.some((m) => tono(m) !== 'bien') || r.referencia.some((ref) => !ref.ok);
  return hayAviso ? 'viable_con_cambios' : 'viable';
}

// Panel de métricas del hangar en un solo cuadro fijo (sin pestañas ni selección oculta en escritorio).
// modo: 'flotante' (escena del taller) | 'integrado' (columna derecha de la terminal o Hangar 2D).
export default function PanelRecursos({ resumen, mision, diseno, progreso, modo = 'flotante', nodrizaId: fija }) {
  const t = useT();
  const [idioma] = useIdioma();
  const [elegida, setElegida] = useState(NODRIZA_POR_DEFECTO);
  const [abiertoMovil, setAbiertoMovil] = useState(false);
  const esMovil = useEsMovil();
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString(idioma === 'en' ? 'en-US' : 'es-MX');

  const nodrizaId = fija || elegida;
  const r = recursosHangar({ resumen, mision, diseno, progreso, nodrizaId });

  const metricas = [
    ...r.filas.map((f) => ({
      id: f.id,
      etiqueta: t(`recursos.corto.${f.id}`),
      usado: f.usado,
      disponible: f.disponible,
      unidad: f.unidad,
      ok: f.ok,
      soloAviso: f.soloAviso,
      fraccion: f.fraccion,
    })),
    ...(r.tiempo ? [{
      id: 'tiempo',
      etiqueta: t('recursos.corto.tiempo'),
      usado: r.tiempo.usado,
      disponible: r.tiempo.disponible,
      unidad: t('recursos.unidad.tiempo'),
      ok: r.tiempo.ok,
      soloAviso: false,
      fraccion: r.tiempo.disponible > 0 ? r.tiempo.usado / r.tiempo.disponible : 0,
    }] : []),
    {
      id: 'drones',
      etiqueta: t('recursos.corto.drones'),
      usado: r.drones.usados,
      disponible: r.drones.maximo,
      unidad: '',
      ok: r.drones.ok,
      soloAviso: false,
      fraccion: r.drones.maximo > 0 ? r.drones.usados / r.drones.maximo : 0,
    },
  ];

  const veredictoId = veredictoActual(resumen, r, metricas);
  const claseVer = CLASE_VEREDICTO[veredictoId] || 'aviso';
  const problemas = resumen?.problemas?.length ?? 0;
  const visible = modo === 'integrado' || !esMovil || abiertoMovil;

  if (!visible) {
    return (
      <aside className={`pr-panel pr-cuadro pr-${modo} pr-compacta`} aria-label={t('recursos.aria')}>
        <button
          type="button"
          className="pr-franja"
          onClick={() => setAbiertoMovil(true)}
          aria-expanded={false}
          aria-label={t('recursos.franjaAria')}
        >
          <span className="pr-franja-iconos">
            {metricas.map((m) => (
              <span key={m.id} className={`pr-chip-icono pr-t-${tono(m)}`} title={`${m.etiqueta}: ${fmt(m.usado)} / ${fmt(m.disponible)}`}>
                <img src={ICONOS[m.id]} alt="" draggable="false" />
              </span>
            ))}
          </span>
          <span className={`pr-veredicto-punto pr-t-${claseVer}`} aria-hidden="true" />
          <span className="pr-franja-mas" aria-hidden="true">+</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className={`pr-panel pr-cuadro pr-${modo}`} aria-label={t('recursos.aria')}>
      <div className="pr-cabecera">
        <span className="t-eyebrow">{t('recursos.titulo')}</span>
        {r.fondos !== null && (
          <span className="pr-fondos" title={t('recursos.fondosCampana')}>◆ {fmt(r.fondos)} M</span>
        )}
        {modo === 'flotante' && esMovil && (
          <button
            type="button"
            className="pr-cerrar"
            onClick={() => setAbiertoMovil(false)}
            aria-expanded
            aria-label={t('recursos.contraer')}
          >
            −
          </button>
        )}
      </div>

      <div className="pr-tarjetas">
        {metricas.map((m) => {
          const tn = tono(m);
          const pct = Math.min(100, Math.max(0, Math.round((m.fraccion || 0) * 100)));
          const estado = estadoClave(m, t);
          return (
            <div key={m.id} className={`pr-item pr-t-${tn}`} aria-label={`${m.etiqueta}: ${fmt(m.usado)} / ${fmt(m.disponible)} ${m.unidad} (${estado})`}>
              <div className="pr-item-top">
                <Anillo fraccion={m.fraccion}>
                  <img src={ICONOS[m.id]} alt="" draggable="false" />
                </Anillo>
                <div className="pr-item-info">
                  <div className="pr-item-tit">
                    <span>{m.etiqueta}</span>
                    <em>{estado}</em>
                  </div>
                  <strong className="pr-item-cifra">
                    {fmt(m.usado)}<span>/{fmt(m.disponible)}</span>
                    {m.unidad && <small> {m.unidad}</small>}
                  </strong>
                </div>
              </div>
              {m.id === 'drones' ? (
                <div className="pr-pips" aria-hidden="true">
                  {Array.from({ length: Math.max(r.drones.maximo, r.drones.usados) }, (_, i) => (
                    <i key={i} className={i < r.drones.usados ? 'lleno' : ''} />
                  ))}
                </div>
              ) : (
                <div className="pr-barra" aria-hidden="true">
                  <i style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`pr-veredicto pr-t-${claseVer}`}>
        <div className="pr-veredicto-izq">
          <span className="pr-veredicto-etq">{t('recursos.veredictoEtiqueta')}</span>
          <strong>{t(`recursos.veredicto.${veredictoId}`)}</strong>
        </div>
        <small>{problemas > 0 ? t('recursos.problemas', { n: problemas }) : t('recursos.listo')}</small>
      </div>

      {fija === undefined && modo === 'integrado' && (
        <div className="pr-bahia-ref">
          <span className="t-eyebrow">{t('recursos.bahia')}</span>
          <select aria-label={t('recursos.nodriza.aria')} value={elegida} onChange={(e) => setElegida(e.target.value)}>
            {listaNodrizas().map((n) => <option key={n.id} value={n.id}>{n.codigo || n.nombre}</option>)}
          </select>
        </div>
      )}
    </aside>
  );
}

// Versión para el Garage Nodriza: mismas clases nx-* que sus paneles.
export function PanelRecursosNodriza({ modeloId, drones = 0 }) {
  const t = useT();
  const [idioma] = useIdioma();
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString(idioma === 'en' ? 'en-US' : 'es-MX');
  const n = limitesNodriza(modeloId);
  const destinos = resumenDestinos(modeloId);
  const pct = Math.min(100, n.maxDrones ? (drones / n.maxDrones) * 100 : 0);
  return (
    <section className="nx-panel" aria-label={t('recursos.nodriza.aria')}>
      <h2 className="nx-panel-titulo">{t('recursos.nodriza.titulo')}</h2>
      <div className="nx-barras-rendimiento">
        <div className="nx-barra-item">
          <span>{t('recursos.nodriza.bahia')}</span>
          <strong>{drones} / {n.maxDrones}</strong>
          <div className="nx-barra-riel"><div className="nx-barra-relleno" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
      <dl className="nx-lista-espec">
        <div><dt>{t('recursos.nodriza.rieles')}</dt><dd>{n.slots}</dd></div>
        {n.cargaUtilKg !== null && <div><dt>{t('recursos.nodriza.carga')}</dt><dd>{fmt(n.cargaUtilKg)} kg</dd></div>}
        {destinos.map((d) => (
          <div key={d.id}>
            <dt>{d.nombre}:</dt>
            <dd>
              {d.veredicto ? t(`recursos.veredicto.${d.veredicto}`) : '—'}
              {d.potencia_w !== null && ` · ${fmt(d.potencia_w)}/${fmt(d.requerida_w)} W`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

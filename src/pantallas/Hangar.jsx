// Hangar: el jugador arma la nave por pestañas, empezando por la base (el cohete).
// Las barras se actualizan en vivo y, al pasar el cursor sobre una pieza, muestran cómo cambiarían.
// Al principio hay 2 opciones por categoría: lo demás se desbloquea con los fondos que paga cada misión.
import { useState } from 'react';
import AyudaIO from '../componentes/AyudaIO.jsx';
import Nave from '../componentes/Nave.jsx';
import { Garage } from '../tres/perezoso.jsx';
import { soportaWebGL } from '../tres/webgl.js';
import Parche from '../componentes/Parche.jsx';
import { FONDOS, FORMAS, ICONOS } from '../componentes/parcheOpciones.js';
import { Barra } from '../componentes/comunes.jsx';
import { resumenNave } from '../motor/nave.js';
import { estaDesbloqueado } from '../estado/progreso.js';
import EquipoDrones from '../componentes/EquipoDrones.jsx';
import PanelRecursos from '../componentes/PanelRecursos.jsx';
import EleccionOrbita from '../componentes/EleccionOrbita.jsx';
import Sistemas from '../componentes/Sistemas.jsx';
import { sistemasListos } from '../motor/sistemas.js';
import { orbitasDe } from '../motor/orbita.js';
import { useT } from '../i18n/idioma.js';
import { consejoDe, claseConsejo } from '../componentes/consejoAyuda.js';
import { Insignia, Motivo } from '../componentes/Consejo.jsx';

// Orden lógico: primero la base que te lleva al espacio, luego lo que va encima.
const PESTANAS = [
  { id: 'cohete', titulo: '1 Cohete', paso: 'Elige el cohete (la base).' },
  { id: 'propulsion', titulo: '2 Combustible', paso: 'Elige el tanque de combustible.' },
  { id: 'energia', titulo: '3 Energía', paso: 'Elige la fuente de energía.' },
  { id: 'antena', titulo: '4 Antena', paso: 'Elige la antena.' },
  { id: 'blindaje', titulo: '5 Blindaje', paso: 'Elige el blindaje.' },
  { id: 'instrumentos', titulo: '6 Ciencia', paso: 'Elige los instrumentos.' },
  { id: 'sistemas', titulo: 'Sistemas', paso: null },
  { id: 'orbita', titulo: '7 Órbita', paso: null },
  { id: 'estetica', titulo: 'Estilo', paso: null },
];
const PASOS = PESTANAS.filter((p) => p.paso);
const COLORES = ['#c9d3e6', '#f4c542', '#ff7a1a', '#3ddc97', '#4da3ff', '#d45bff'];
const NOMBRE_FORMA = { circulo: 'Círculo', escudo: 'Escudo', ovalo: 'Óvalo' };
const NOMBRE_ICONO = { planeta: 'Planeta', nave: 'Nave', estrella: 'Estrella', orbita: 'Órbita' };
// La ciencia que sirve es la que se alcanza a transmitir.
const cienciaUtil = (r) => Math.round(r.ciencia.total * r.factorDatos * 100);

function leerGuiaOculta() {
  try { return localStorage.getItem('vdl-guia-oculta') === '1'; } catch { return false; }
}

// Guía: dice el siguiente paso y da una pista de la misión (sin regalar la respuesta).
function Guia({ mision, listo, problemas, puedeLanzar, irA }) {
  const t = useT();
  const [oculta, setOculta] = useState(() => !mision.tutorial && leerGuiaOculta());
  if (oculta) return null;
  const hechos = PASOS.filter((p) => listo(p.id)).length;
  const paso = PASOS.find((p) => !listo(p.id));
  const ocultar = () => { setOculta(true); try { localStorage.setItem('vdl-guia-oculta', '1'); } catch { /* sin almacenamiento */ } };
  let titulo, pista, tipo = 'info';
  if (paso) { titulo = t('hangar.guia.paso', { n: hechos + 1, total: PASOS.length, paso: t(`hangar.pestana.${paso.id}.paso`, null, paso.paso) }); pista = mision.pistas?.[paso.id]; }
  else if (!puedeLanzar) { titulo = t('hangar.guia.rojo'); pista = problemas[0] || t('hangar.guia.revisaBarras'); tipo = 'aviso'; }
  else { titulo = t('hangar.guia.verde'); pista = t('hangar.guia.verdePista'); tipo = 'bien'; }
  return (
    <div className={`guia ${tipo}`} role="status">
      <div className="guia-progreso"><span style={{ width: `${(hechos / PASOS.length) * 100}%` }} /></div>
      <strong>{titulo}</strong> <span className="tenue">{pista}</span>
      <div className="guia-acciones">
        {paso && <button onClick={() => irA(paso.id)}>{t('hangar.guia.irPaso')}</button>}
        {!mision.tutorial && <button className="cerrar" onClick={ocultar}>{t('hangar.guia.ocultar')}</button>}
      </div>
    </div>
  );
}

export default function Hangar({ mision, piezas, cohetes, diseno, setDiseno, estetica, setEstetica, resumen, alLanzar, progreso, alComprar, concepto }) {
  const t = useT();
  const [pestana, setPestana] = useState('cohete');
  const [previa, setPrevia] = useState(null); // diseño hipotético bajo el cursor
  const [dato, setDato] = useState(null);

  const conCambio = (cat, id) => {
    if (cat === 'instrumentos') {
      const ya = diseno.instrumentos.includes(id);
      return { ...diseno, instrumentos: ya ? diseno.instrumentos.filter((x) => x !== id) : [...diseno.instrumentos, id] };
    }
    return { ...diseno, [cat]: id };
  };
  const elegir = (cat, id) => { setDiseno(conCambio(cat, id)); setPrevia(null); };
  const mirar = (cat, p) => { setPrevia(conCambio(cat, p.id)); setDato(p.dato); };
  const rPrevio = previa ? resumenNave(previa, piezas, cohetes, mision) : null;
  const listo = (id) => (id === 'sistemas' ? sistemasListos(resumen, mision) : id === 'instrumentos' ? diseno.instrumentos.length > 0 : id === 'estetica' ? !!estetica.nombre : !!diseno[id]);
  const irA = (id) => { setPestana(id); setPrevia(null); setDato(null); };
  const idx = PESTANAS.findIndex((p) => p.id === pestana);
  const b = resumen.barras;
  const pb = rPrevio?.barras;
  const nombreObjetivo = Object.fromEntries(mision.objetivos.map((o) => [o.id, o.corto || o.nombre]));
  const capacidad = (c) => Math.round(c.capacidad_kg * (mision.capacidad_mult || 1));

  const lista = pestana === 'cohete' ? cohetes
    : pestana === 'instrumentos' ? piezas.filter((p) => p.categoria === 'instrumento' && p.mision === mision.id)
      : piezas.filter((p) => p.categoria === pestana);
  // Primero lo desbloqueado, luego lo que se puede comprar (más barato primero).
  const ordenada = [...lista].sort((a, z) => (estaDesbloqueado(progreso, a) ? 0 : a.precio) - (estaDesbloqueado(progreso, z) ? 0 : z.precio));
  const elegida = (p) => (pestana === 'instrumentos' ? diseno.instrumentos.includes(p.id) : diseno[pestana] === p.id);

  return (
    <div className="rejilla dos hangar-layout">
      <div className="panel">
        <h2>{t('hangar.titulo')}</h2>
        {pestana === 'instrumentos' && <EquipoDrones {...{ diseno, setDiseno, mision }} />}
        <Guia mision={mision} listo={listo} problemas={resumen.problemas} puedeLanzar={resumen.puedeLanzar} irA={irA} />
        <div className="pestanas" role="tablist">
          {PESTANAS.filter((p) => p.id !== 'orbita' || orbitasDe(mision).length > 0).map((p) => (
            <button key={p.id} role="tab" aria-selected={pestana === p.id} className={pestana === p.id ? 'activa' : ''} onClick={() => irA(p.id)}>
              {listo(p.id) ? '✓ ' : ''}{p.id === 'orbita' ? t('orbita.pestana') : p.id === 'sistemas' ? t('sistemas.pestana') : t(`hangar.pestana.${p.id}.titulo`, null, p.titulo)}
            </button>
          ))}
        </div>
        {pestana !== 'sistemas' && pestana !== 'orbita' && <AyudaIO key={pestana} estacion={pestana} dificultad={mision?.dificultad} />}
        {concepto(pestana)}

        {pestana === 'sistemas' ? (
          <Sistemas modo="enLinea" mision={mision} piezas={piezas} setDiseno={setDiseno} resumen={resumen} progreso={progreso} alComprar={alComprar} />
        ) : pestana === 'orbita' ? (
          <EleccionOrbita modo="enLinea" mision={mision} diseno={diseno} setDiseno={setDiseno} resumen={resumen} />
        ) : pestana !== 'estetica' ? (
          <div className="tarjetas" onMouseLeave={() => setPrevia(null)}>
            {ordenada.map((p) => {
              const libre = estaDesbloqueado(progreso, p);
              const alcanza = progreso.fondos >= (p.precio || 0);
              const consejo = consejoDe(p, { mision, diseno, piezas, cohetes, resumen }); // B2b: solo en Principiante
              return (
                <div key={p.id} className={`tarjeta ${elegida(p) ? 'elegido' : ''} ${libre ? '' : 'bloqueada'} ${claseConsejo(consejo)}`}
                  role="button" tabIndex={0}
                  onClick={() => libre && elegir(pestana, p.id)}
                  onKeyDown={(e) => { if (libre && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); elegir(pestana, p.id); } }}
                  onMouseEnter={() => mirar(pestana, p)} onFocus={() => mirar(pestana, p)}>
                  <strong>{!libre && '🔒 '}{elegida(p) && pestana === 'instrumentos' ? '● ' : ''}{p.nombre}<Insignia consejo={consejo} /></strong>
                  <span className="fichas">
                    {p.capacidad_kg && <span>{t('hangar.lleva', { n: capacidad(p).toLocaleString('es-MX'), destino: mision.destino.nombre })}</span>}
                    {p.masa_kg > 0 && <span>{p.masa_kg} kg</span>}
                    <span>{p.costo_musd} M USD</span>
                    {p.potencia_w > 0 && <span>{p.potencia_w} W</span>}
                    {p.datos_mbit_dia && <span>{p.datos_mbit_dia.toLocaleString('es-MX')} {t('hangar.unidad.mbitDia')}</span>}
                    {p.propelente_kg && <span>{t('hangar.propelente', { n: p.propelente_kg.toLocaleString('es-MX') })}</span>}
                    {p.genera_w_1ua && <span>{t('hangar.kwTierra', { n: (p.genera_w_1ua / 1000).toFixed(0) })}</span>}
                    {p.genera_w_fijo && <span>{t('hangar.wSiempre', { n: p.genera_w_fijo })}</span>}
                    {p.blindaje > 0 && <span>{t('hangar.radiacion', { n: p.blindaje * 100 })}</span>}
                    {p.requiere && <span className="aviso">{t('hangar.requiereKa')}</span>}
                    {p.ciencia && Object.entries(p.ciencia).map(([k, v]) => (
                      <span key={k} className="etiqueta-obj">{nombreObjetivo[k] || k} +{v}</span>
                    ))}
                  </span>
                  <Motivo consejo={consejo} />
                  {!libre && (
                    <button className={alcanza ? 'primario comprar' : 'comprar'} disabled={!alcanza}
                      onClick={(e) => { e.stopPropagation(); alComprar(p); }}>
                      {alcanza ? t('hangar.desbloquearPor', { precio: p.precio }) : t('hangar.necesitasFondos', { precio: p.precio, fondos: progreso.fondos })}
                    </button>
                  )}
                </div>
              );
            })}
            {pestana === 'instrumentos' && <p className="tenue">{t('hangar.variosInstrumentos')}</p>}
          </div>
        ) : (
          <Estetica estetica={estetica} setEstetica={setEstetica} mision={mision} />
        )}
        <p className="dato">{dato || t('hangar.pasaCursor')}</p>
        <div className="acciones">
          {idx > 0 && <button onClick={() => irA(PESTANAS[idx - 1].id)}>{t('hangar.anterior')}</button>}
          {idx < PESTANAS.length - 1 && <button className={listo(pestana) ? 'primario' : ''} onClick={() => irA(PESTANAS[idx + 1].id)}>{t('hangar.siguiente')}</button>}
        </div>
      </div>

      <div className="rejilla" style={{ alignContent: 'start' }}>
        <div className="panel" style={{ textAlign: 'center', padding: soportaWebGL() ? 0 : 16, overflow: 'hidden', position: 'relative' }}>
          <div className="visor-cabecera"><span>{t('hangar.visorEnsamblaje')}<strong>{estetica.nombre || t('hangar.tuNavePieza')}</strong></span><span className="visor-estado">● {previa ? t('hangar.vistaPrevia') : t('hangar.enHangar')}</span></div>
          {soportaWebGL() ? <Garage diseno={previa || diseno} estetica={estetica} /> : <Nave diseno={previa || diseno} estetica={estetica} />}
          {soportaWebGL() && <span className="pista-3d">{estetica.nombre ? estetica.nombre.toUpperCase() + ' · ' : ''}{t('hangar.arrastrarRueda')}</span>}
        </div>
        <div className="panel">
          <h3>{t('hangar.presupuestos')}</h3>
          <PanelRecursos modo="integrado" sinBarras resumen={resumen} mision={mision} diseno={diseno} progreso={progreso} />
          <Barra nombre={t('hangar.h.masa')} {...b.masa} previo={pb?.masa} unidad="kg" invertida />
          <Barra nombre={t('hangar.barra.costo')} {...b.costo} previo={pb?.costo} unidad="M USD" invertida />
          <Barra nombre={t('hangar.h.energia', { destino: mision.destino.nombre })} {...b.energia} previo={pb?.energia} unidad="W" />
          <Barra nombre={t('hangar.h.dv')} {...b.dv} previo={pb?.dv} unidad="m/s" />
          <Barra nombre={t('hangar.h.datos')} {...b.datos} previo={pb?.datos} unidad={t('hangar.unidad.mbitDia')} invertida />
          <p className="tenue">
            {t('hangar.cienciaTierra')}: <strong>{cienciaUtil(resumen)} %</strong>
            {rPrevio && cienciaUtil(rPrevio) !== cienciaUtil(resumen) && (
              <strong className={cienciaUtil(rPrevio) > cienciaUtil(resumen) ? 'bien' : 'mal'}> → {cienciaUtil(rPrevio)} %</strong>
            )}
          </p>
          <div className="cobertura">
            {resumen.ciencia.porObjetivo.map((o) => (
              <div key={o.id} className="cobertura-fila" title={o.necesitas}>
                <span>{o.nombre}</span>
                <span className="riel-chico"><span style={{ width: `${o.cobertura * 100}%` }} /></span>
                <strong>{Math.round(o.cobertura * 100)} %</strong>
              </div>
            ))}
          </div>
          {resumen.problemas.length > 0 && (
            <div role="status">
              <strong>{t(resumen.puedeLanzar ? 'tutorial.avisos' : 'tutorial.pendientes')}</strong>
              <ul className="problemas">{resumen.problemas.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <div className="acciones">
            <button className="primario" disabled={!resumen.puedeLanzar} onClick={alLanzar}>{t('hangar.irPlataforma')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Estetica({ estetica, setEstetica, mision }) {
  const t = useT();
  // Actualización funcional: dos clics seguidos no se pisan entre sí.
  const set = (cambios) => setEstetica((e) => ({ ...e, ...cambios }));
  const setParche = (cambios) => setEstetica((e) => ({ ...e, parche: { ...e.parche, ...cambios } }));
  return (
    <div className="rejilla dos">
      <div>
        <h3>{t('hangar.est.nombre')}</h3>
        <input type="text" maxLength={16} placeholder={t('hangar.est.ejemplo')} value={estetica.nombre} onChange={(e) => set({ nombre: e.target.value })} />
        <h3>{t('hangar.est.casco')}</h3>
        <div className="opciones">{COLORES.map((c) => <Muestra key={c} c={c} activa={estetica.casco === c} onClick={() => set({ casco: c })} />)}</div>
        <h3>{t('hangar.est.detalles')}</h3>
        <div className="opciones">{COLORES.map((c) => <Muestra key={c} c={c} activa={estetica.detalle === c} onClick={() => set({ detalle: c })} />)}</div>
        <h3>{t('hangar.est.parcheForma')}</h3>
        <div className="opciones">{FORMAS.map((f) => <button key={f} className={estetica.parche.forma === f ? 'elegido' : ''} onClick={() => setParche({ forma: f })}>{t(`hangar.forma.${f}`, null, NOMBRE_FORMA[f])}</button>)}</div>
        <h3>{t('hangar.est.parcheEmblema')}</h3>
        <div className="opciones">{ICONOS.map((i) => <button key={i} className={estetica.parche.icono === i ? 'elegido' : ''} onClick={() => setParche({ icono: i })}>{t(`hangar.icono.${i}`, null, NOMBRE_ICONO[i])}</button>)}</div>
        <h3>{t('hangar.est.parcheFondo')}</h3>
        <div className="opciones">{FONDOS.map((c) => <Muestra key={c} c={c} activa={estetica.parche.fondo === c} onClick={() => setParche({ fondo: c })} />)}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3>{t('hangar.est.tuParche')}</h3>
        <Parche parche={estetica.parche} nombre={estetica.nombre} destino={mision.destino.nombre.toUpperCase()} color={estetica.detalle} tam={190} />
        <p className="tenue">{t('hangar.est.parcheNota')}</p>
      </div>
    </div>
  );
}

function Muestra({ c, activa, onClick }) {
  const t = useT();
  return <button className="color" aria-label={t('hangar.color', { c })} style={{ background: c, outline: activa ? '2px solid white' : 'none', outlineOffset: 2 }} onClick={onClick} />;
}


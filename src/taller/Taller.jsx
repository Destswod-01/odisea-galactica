import { Component, useCallback, useEffect, useRef, useState } from 'react';
import AyudaIO from '../componentes/AyudaIO.jsx';
import Hangar, { Estetica } from '../pantallas/Hangar.jsx';
import { soportaWebGL } from '../tres/webgl.js';
import { ESTACIONES, ESTACION } from './estaciones.js';
import EscenaTaller, { VisorPieza } from './EscenaTaller.jsx';
import { resumenNave } from '../motor/nave.js';
import { estaDesbloqueado } from '../estado/progreso.js';
import { Barra } from '../componentes/comunes.jsx';
import { sonidos } from '../sonido.js';
import EquipoDrones from '../componentes/EquipoDrones.jsx';
import EleccionOrbita from '../componentes/EleccionOrbita.jsx';
import Sistemas from '../componentes/Sistemas.jsx';
import { sistemasListos } from '../motor/sistemas.js';
import { orbitasDe } from '../motor/orbita.js';
import PanelRecursos from '../componentes/PanelRecursos.jsx';
import { t as tt, useT } from '../i18n/idioma.js';
import { consejoDe, claseConsejo } from '../componentes/consejoAyuda.js';
import { Insignia, Motivo } from '../componentes/Consejo.jsx';
import './taller.css';
import './taller-layout.css';

class Respaldo extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <><p role="status">{tt('hangar.respaldo3d')}</p><Hangar {...this.props.datos} /></> : this.props.children; }
}
export default function Taller(props) {
  return soportaWebGL() ? <Respaldo datos={props}><TallerInterior {...props} /></Respaldo> : <Hangar {...props} />;
}
const ETAPAS = { 'Recogiendo módulo': 'recoger', 'Sujetando pieza': 'sujetar', 'Trasladando al ensamblaje': 'trasladar', 'Alineando conectores': 'alinear', 'Fijando y verificando': 'fijar', 'Retirando brazo': 'retirar' };
function Presupuestos({ resumen, previo }) {
  const t = useT();
  return <div className="t-metricas"><span className="t-eyebrow">{t('hangar.balanceMision')}</span>{[['masa', 'kg', true], ['costo', 'M USD', true], ['energia', 'W', false], ['dv', 'm/s', false], ['datos', 'Mbit/día', true]].map(([id, unidad, invertida]) => <Barra key={id} nombre={t(`hangar.barra.${id}`)} unidad={unidad === 'Mbit/día' ? t('hangar.unidad.mbitDia') : unidad} invertida={invertida} {...resumen.barras[id]} previo={previo?.barras[id]} />)}<div className="t-ciencia"><span>{t('hangar.cienciaTierra')}</span><strong>{Math.round((previo || resumen).ciencia.total * (previo || resumen).factorDatos * 100)}<small>%</small></strong></div></div>;
}
function TallerInterior({ mision, piezas, cohetes, diseno, setDiseno, estetica, setEstetica, resumen, alLanzar, progreso, alComprar, permitidas = null, alVerEstacion = null, alSimular=null }) {
  // Multijugador en red (B12): `permitidas` = estaciones de mis roles; las demás se ven pero no se abren.
  const ajena = (id) => !!permitidas && !permitidas.includes(id);
  const t = useT();
  const nombreEst = (e, campo = 'titulo') => t(`hangar.estacion.${e.id}.${campo}`, null, e[campo]);
  const [fase, setFase] = useState('sala');
  const [estacion, setEstacion] = useState('cohete');
  const [destino, setDestino] = useState('cohete');
  const [borrador, setBorrador] = useState(diseno);
  const [vista, setVista] = useState(null);
  const [trabajo, setTrabajo] = useState(null);
  const [recien, setRecien] = useState(null);
  const [balance, setBalance] = useState(false);
  const [verOrbita, setVerOrbita] = useState(false);
  const [verSistemas, setVerSistemas] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [encuadre, setEncuadre] = useState('taller');
  const [etapa, setEtapa] = useState('Recogiendo módulo');
  const [calidad, setCalidad] = useState('media');
  const [vistaTerminal, setVistaTerminal] = useState('piezas');
  const [reducido, setReducido] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const secuencia = useRef(0), aplicado = useRef(null), enEstacion = useRef('cohete'), trabajoRef = useRef(null);
  const ocupado = ['caminando', 'entrando', 'instalando', 'celebrando'].includes(fase);
  const lista = estacion === 'cohete' ? cohetes : piezas.filter(p => estacion === 'instrumentos' ? p.categoria === 'instrumento' && p.mision === mision.id : p.categoria === estacion);
  const pieza = lista.find(p => p.id === vista);
  const previo = resumenNave(borrador, piezas, cohetes, mision);
  const listo = id => id === 'instrumentos' ? diseno.instrumentos.length > 0 : id === 'estetica' ? !!estetica.nombre : !!diseno[id];
  const siguiente = ESTACIONES.find(e => e.id !== 'estetica' && !listo(e.id));
  const faltanSistemas = !sistemasListos(resumen, mision);
  const completos = ESTACIONES.slice(0, 6).filter(e => listo(e.id)).length;
  const cambiado = JSON.stringify(diseno) !== JSON.stringify(borrador);
  const abrir = id => {
    if (ocupado || fase === 'maquina') return;
    setEstacion(id); setBorrador({ ...diseno, instrumentos: [...diseno.instrumentos] }); setBalance(false); setEncuadre('taller'); setVistaTerminal('piezas');
    const catalogo = id === 'cohete' ? cohetes : piezas.filter(p => id === 'instrumentos' ? p.categoria === 'instrumento' && p.mision === mision.id : p.categoria === id);
    setVista((id === 'instrumentos' ? diseno.instrumentos[0] : diseno[id]) || catalogo[0]?.id || null);
    setFase(enEstacion.current === id ? 'entrando' : 'caminando'); setDestino(id); sonidos.elegir();
  };
  const llegar = () => { enEstacion.current = destino; if (fase === 'caminando') setFase('entrando'); };
  const volver = useCallback(() => setFase('sala'), []);
  useEffect(() => {
    if (fase !== 'entrando' && fase !== 'celebrando') return;
    const timer = setTimeout(() => setFase(fase === 'entrando' ? 'maquina' : 'sala'), reducido ? 100 : fase === 'entrando' ? 1000 : 1600);
    return () => clearTimeout(timer);
  }, [fase, reducido]);
  useEffect(() => {
    const tecla = e => { if (e.key === 'Escape' && fase === 'maquina') volver(); };
    window.addEventListener('keydown', tecla); return () => window.removeEventListener('keydown', tecla);
  }, [fase, volver]);
  const instalar = () => {
    if (!cambiado || fase !== 'maquina') return;
    const agregadas = estacion === 'instrumentos' ? borrador.instrumentos.filter(id => !diseno.instrumentos.includes(id)) : [];
    const id = estacion === 'instrumentos' ? agregadas[0] : borrador[estacion];
    if (!id) { setDiseno(borrador); volver(); return; }
    const tr = { id: ++secuencia.current, categoria: estacion, pieza: id, diseno: borrador };
    trabajoRef.current = tr; setTrabajo(tr); setEtapa('Recogiendo módulo'); setFase('instalando');
  };
  const entregar = useCallback(id => {
    const tr = trabajoRef.current;
    if (!tr || tr.id !== id || aplicado.current === id) return;
    aplicado.current = id; setDiseno(tr.diseno); setRecien(tr);
  }, [setDiseno]);
  const terminar = useCallback(id => {
    const tr = trabajoRef.current;
    if (!tr || tr.id !== id) return;
    entregar(id); setTrabajo(null); trabajoRef.current = null;
    setFase('celebrando'); sonidos.exito();
  }, [entregar]);
  useEffect(() => {
    if (trabajo?.categoria !== 'cohete') return;
    const timer = setTimeout(() => terminar(trabajo.id), reducido ? 100 : 1900); return () => clearTimeout(timer);
  }, [trabajo, reducido, terminar]);
  const elegir = p => {
    setVista(p.id); if (!estaDesbloqueado(progreso, p)) return;
    setBorrador(d => ({ ...d, [estacion]: estacion === 'instrumentos' ? d.instrumentos.includes(p.id) ? d.instrumentos.filter(id => id !== p.id) : [...d.instrumentos, p.id] : p.id })); sonidos.elegir();
  };
  // Presencia (B12): avisa qué estación tengo abierta para que los demás lo vean en la lista de jugadores.
  const abierta = verSistemas ? 'sistemas' : verOrbita ? 'orbita' : estacion;
  useEffect(() => { alVerEstacion?.(abierta); }, [abierta, alVerEstacion]);
  return <section className={`taller t-fase-${fase}`} aria-label={t('hangar.aria.taller')}>
    <div className="t-escena" aria-label={t('hangar.aria.escena')}><EscenaTaller {...{ diseno, estetica, mision, calidad, fase, estacion, destino, trabajo, reducido, recien, zoom, encuadre }} alLlegar={llegar} alEstacion={abrir} alEntregar={entregar} alInstalar={terminar} alEtapa={setEtapa} /></div>
    {fase !== 'maquina' && <>
      <header className="t-cabecera"><div><span className="t-eyebrow">{t('hangar.centro')}</span><h1>{t('hangar.titulo')} <em>{mision.nombre}</em></h1><p>{t('hangar.sistemas', { n: completos })} <span>·</span> {t('hangar.fondosM', { n: progreso.fondos })}</p></div><div className="t-ajustes"><label>{t('hangar.graficos')}<select aria-label={t('hangar.calidad')} value={calidad} onChange={e => setCalidad(e.target.value)}><option value="baja">{t('hangar.calidad.baja')}</option><option value="media">{t('hangar.calidad.media')}</option><option value="alta">{t('hangar.calidad.alta')}</option></select></label><button className="t-balance-toggle" onClick={() => setBalance(!balance)} aria-expanded={balance}>◴ {t('hangar.balance')}</button></div></header>
      {balance && <aside className="t-balance-panel"><button className="t-cerrar" onClick={() => setBalance(false)} aria-label={t('hangar.cerrarTelemetria')}>×</button><Presupuestos resumen={resumen} />{resumen.problemas.length > 0 && <ul>{resumen.problemas.map(p => <li key={p}>{p}</li>)}</ul>}</aside>}
      <PanelRecursos resumen={resumen} mision={mision} diseno={diseno} progreso={progreso} />
      <aside className="t-consejo-sala">
        {alSimular && <button type="button" className="t-sim-movil" onClick={alSimular} aria-label={t('intentos.boton')}>🧪</button>}
        <AyudaIO key={estacion} estacion={estacion} dificultad={mision?.dificultad} />
      </aside>
      <div className="t-camara" aria-label={t('hangar.camara')}><button aria-label={t('hangar.alejar')} disabled={zoom <= .8 || ocupado} onClick={() => setZoom(z => Math.max(.8, z - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label={t('hangar.acercar')} disabled={zoom >= 1.4 || ocupado} onClick={() => setZoom(z => Math.min(1.4, z + .1))}>+</button><button disabled={ocupado} aria-pressed={encuadre === 'montaje'} onClick={() => setEncuadre(e => e === 'taller' ? 'montaje' : 'taller')}>{encuadre === 'taller' ? t('hangar.verMaquina') : t('hangar.verTaller')}</button></div>
      {/* B4 · Modo equipo: quién tiene el dispositivo según la estación abierta. */}
      {/* Sin turnos: en línea cada jugador trabaja a la vez en sus estaciones (la lista de jugadores muestra dónde está cada quien). */}
      <div className="t-estado" role="status"><i />{fase === 'caminando' ? t('hangar.operadorCamino', { estacion: nombreEst(ESTACION[estacion], 'corto') }) : fase === 'entrando' ? t('hangar.conectando') : fase === 'instalando' ? trabajo?.categoria === 'cohete' ? t('hangar.asignando') : t(`hangar.etapa.${ETAPAS[etapa] || 'recoger'}`, null, etapa) : fase === 'celebrando' ? t('hangar.instalado') : t('hangar.operativo')}{fase === 'instalando' && <button onClick={() => terminar(trabajo.id)}>{t('hangar.omitir')}</button>}</div>
      <div className="t-inferior"><div className="t-siguiente"><div><span className="t-eyebrow">{siguiente ? t('hangar.siguientePaso') : t('hangar.revisionVuelo')}</span><strong>{siguiente ? `0${siguiente.n} / ${nombreEst(siguiente)}` : faltanSistemas ? t('sistemas.chip') : resumen.puedeLanzar ? t('hangar.listaVolar') : t('hangar.revisaPresupuestos')}</strong></div>{siguiente ? <button disabled={ocupado} onClick={() => abrir(siguiente.id)}>{t('hangar.visitar')}</button> : <button onClick={() => setBalance(true)}>{t('hangar.verDiagnostico')}</button>}</div>
        <nav className={`t-estaciones t-con-sistemas ${orbitasDe(mision).length ? 't-con-orbita' : ''}`} aria-label={t('hangar.aria.estaciones')}>{ESTACIONES.map(e => <button key={e.id} data-estacion={e.id} disabled={ocupado || ajena(e.id)} title={ajena(e.id) ? t('red.estacionAjena') : undefined} onClick={() => abrir(e.id)} style={{ '--estacion': e.color }} className={estacion === e.id ? 'actual' : ''}><span className="t-num">{listo(e.id) ? '✓' : `0${e.n}`}</span><span>{nombreEst(e, 'corto')}</span><span className="t-estacion-flecha">↗</span></button>)}<button type="button" className="t-sistemas-chip" data-estacion="sistemas" disabled={ocupado || ajena('sistemas')} aria-label={t('sistemas.chipAria')} aria-haspopup="dialog" onClick={() => { setVerSistemas(true); sonidos.elegir(); }}><span className="t-num">{sistemasListos(resumen, mision) ? '✓' : '◇'}</span><span>{t('sistemas.chip')}</span><span className="t-estacion-flecha">↗</span></button>{orbitasDe(mision).length > 0 && <button type="button" className="t-orbita-chip" data-estacion="orbita" disabled={ocupado || ajena('orbita')} aria-label={t('orbita.chipAria')} aria-haspopup="dialog" onClick={() => { setVerOrbita(true); sonidos.elegir(); }}><span className="t-num">{diseno.orbita ? '✓' : '◎'}</span><span>{t('orbita.chip')}</span><span className="t-estacion-flecha">↗</span></button>}</nav>
        <div className="t-pie">
          {resumen.puedeLanzar ? (
            <button className="primario" disabled={ocupado} onClick={alLanzar}>{t('hangar.irLanzamiento')} <span>↗</span></button>
          ) : (
            <button className="t-estado-lanzamiento" type="button" aria-expanded={balance} onClick={() => setBalance(!balance)}>{t('tutorial.pendientes')}</button>
          )}
        </div>
      </div>
    </>}
    {verSistemas && fase !== 'maquina' && <Sistemas mision={mision} piezas={piezas} setDiseno={setDiseno} resumen={resumen} progreso={progreso} alComprar={alComprar} alCerrar={() => setVerSistemas(false)} />}
    {verOrbita && fase !== 'maquina' && <EleccionOrbita mision={mision} diseno={diseno} setDiseno={setDiseno} resumen={resumen} alCerrar={() => setVerOrbita(false)} />}
    {fase === 'maquina' && <div className="t-terminal" role="region" aria-label={t('hangar.terminal', { estacion: nombreEst(ESTACION[estacion]) })}>
      <header className="t-terminal-header"><button onClick={volver}>{t('hangar.volverHangar')}</button><div><span className="t-eyebrow">{t('hangar.estacionN', { n: ESTACION[estacion].n })}</span><h2>{nombreEst(ESTACION[estacion])}</h2></div><div className="t-terminal-tabs" role="group" aria-label={t('hangar.contenidoTerminal')}><button aria-pressed={vistaTerminal === 'piezas'} onClick={() => setVistaTerminal('piezas')}>{estacion === 'estetica' ? t('hangar.estilo') : t('hangar.piezas')}</button><button aria-pressed={vistaTerminal === 'balance'} onClick={() => setVistaTerminal('balance')}>{t('hangar.balance')}</button></div><span className="t-online">{t('hangar.conectado')}</span></header>
      <div className={`t-terminal-body ${estacion === 'estetica' ? 't-estilo' : ''}`} data-vista={vistaTerminal}>
        <aside className="t-catalogo"><span className="t-eyebrow">{estacion === 'estetica' ? t('hangar.identidad') : t('hangar.eligeConfig')}</span>{estacion === 'instrumentos' && <EquipoDrones diseno={borrador} setDiseno={setBorrador} mision={mision} />}{estacion === 'estetica' ? <Estetica {...{ estetica, setEstetica, mision }} /> : lista.map(p => {
          const libre = estaDesbloqueado(progreso, p), seleccionado = estacion === 'instrumentos' ? borrador.instrumentos.includes(p.id) : borrador[estacion] === p.id;
          const consejo = consejoDe(p, { mision, diseno: borrador, piezas, cohetes, resumen: previo }); // B2b: solo en Principiante
          return <div key={p.id} className={`t-opcion ${seleccionado ? 'seleccionada' : ''} ${vista === p.id ? 'vista' : ''} ${claseConsejo(consejo)}`}><button onClick={() => elegir(p)} aria-pressed={seleccionado} data-pieza={p.id}><span className="t-opcion-indice">{seleccionado ? '●' : libre ? '○' : '⊘'}</span><span><strong>{p.nombre}<Insignia consejo={consejo} /></strong><small>{p.capacidad_kg ? t('hangar.kgCapacidad', { n: Math.round(p.capacidad_kg * (mision.capacidad_mult || 1)).toLocaleString('es-MX') }) : `${p.masa_kg || 0} kg`} <span>·</span> {p.costo_musd} M USD</small><Motivo consejo={consejo} /></span></button>{!libre && <button className="t-desbloquear" disabled={progreso.fondos < p.precio} onClick={() => alComprar(p)}>{t('hangar.desbloquearTienes', { precio: p.precio, fondos: progreso.fondos })}</button>}</div>;
        })}{estacion !== 'estetica' && <><button className="t-quitar" onClick={() => setBorrador(d => ({ ...d, [estacion]: estacion === 'instrumentos' ? [] : null }))}>{estacion === 'instrumentos' ? t('hangar.retirarInstrumentos') : t('hangar.retirarPieza')}</button><details className="t-dato-real"><summary>{t('hangar.datoIngenieria')}</summary><p>{pieza?.dato}</p></details></>}</aside>
        <div className="t-preview"><div className="t-preview-nombre"><span className="t-eyebrow">{estacion === 'estetica' ? t('hangar.tuNave') : t('hangar.vistaComponente')}</span><h3>{estacion === 'estetica' ? estetica.nombre || t('hangar.sinNombre') : pieza?.nombre}</h3></div><VisorPieza categoria={estacion} id={vista} {...{ estetica, diseno, calidad, reducido }} /><span className="t-arrastrar">{t('hangar.arrastrar')}</span>
          <aside className="t-consejo-terminal"><AyudaIO estacion={estacion} dificultad={mision?.dificultad} /></aside>
        </div>
        <aside className="t-datos"><Presupuestos resumen={resumen} previo={estacion === 'estetica' ? null : previo} /><details><summary>{t('hangar.revisionDiseno')} {previo.problemas.length ? `· ${previo.problemas.length}` : '✓'}</summary>{previo.problemas.map(p => <p key={p}>{p}</p>)}</details><PanelRecursos modo="integrado" sinBarras resumen={previo} mision={mision} diseno={borrador} progreso={progreso} /></aside>
      </div>
      <footer className="t-terminal-footer"><p><strong>{estacion === 'estetica' ? t('hangar.hazlaTuya') : t('hangar.antesInstalar')}</strong> {pieza?.dato}</p>{estacion === 'estetica' ? <button className="primario" onClick={volver}>{t('hangar.guardarEstilo')}</button> : <button className="primario" disabled={!cambiado} onClick={instalar}>{!cambiado ? listo(estacion) ? t('hangar.configActual') : estacion === 'instrumentos' ? t('hangar.eligeInstrumentos') : t('hangar.eligePieza') : estacion === 'instrumentos' ? t('hangar.aplicarInstrumentos') : borrador[estacion] ? t('hangar.instalarNave') : t('hangar.retirarNave')} ↗</button>}</footer>
    </div>}
    <label className="t-movimiento"><input type="checkbox" checked={reducido} onChange={e => setReducido(e.target.checked)} /> {t('hangar.movReducido')}</label>
  </section>;
}

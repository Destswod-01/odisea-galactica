// Máquina de fases del juego. Cada pantalla recibe lo que necesita y avisa al terminar.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import piezasBase from './datos/piezas.json';
import cohetesBase from './datos/cohetes.json';
import lro from './datos/misiones/lro.json';
import juno from './datos/misiones/juno.json';
import { cohetesLocales, misionLocal, piezasLocales, useIdioma, useT } from './i18n/idioma.js';
import SelectorIdioma from './componentes/SelectorIdioma.jsx';
import RevisionDiseno from './componentes/RevisionDiseno.jsx';
import { ResultadoEquipo, VotacionEquipo } from './componentes/Equipo.jsx';
import { esEquipo, ROLES } from './motor/equipo.js';
import { cambiosDiseno, clavesAjenas, enviar, reanudarSala, salirSala, rolDeClave, useSala } from './red/cliente.js';
import { BarraRed, ResultadoRed, VotacionRed } from './componentes/SalaRed.jsx';
import AvisoEspejo from './componentes/AvisoEspejo.jsx';
import { espejoDeSala } from './red/espejo.js';
import { ETAPAS_ESPEJO, pilotoDeEtapa } from './red/piloto.js';
import { misionConDificultad, nivelValido, NIVEL_POR_DEFECTO } from './motor/dificultad.js';
import { requisitos, resumenRequisitos } from './motor/requisitos.js';
import { resumenNave } from './motor/nave.js';
import { estadoInicial, puntaje } from './motor/mision.js';
import { SimulacionRapida, Comparacion } from './componentes/Intentos.jsx';
import { Clasificacion } from './componentes/Clasificacion.jsx';
import PanelNasa3D from './componentes/PanelNasa3D.jsx';
import { decodificarDiseno } from './motor/compartir.js';
import { cobrarActividadTierra, esperaTierra, cobrar, comprar, guardarProgreso, leerProgreso, reiniciarCampana, PROGRESO_INICIAL } from './estado/progreso.js';
import { borrarPartida, etiquetaFase, guardarPartida, leerPartida } from './estado/partida.js';
import { EntradaTutorial, GuiaIO } from './componentes/TutorialFase.jsx';
import { Menu, Briefing } from './pantallas/Inicio.jsx';
import Lanzamiento from './pantallas/Lanzamiento.jsx';
import Leop from './pantallas/Leop.jsx';
import Crucero from './pantallas/Drones.jsx';
import Llegada from './pantallas/Llegada.jsx';
import Operacion from './pantallas/Operacion.jsx';
import Operacion07 from './pantallas/Operacion07.jsx';
import Extendida from './pantallas/Extendida.jsx';
import Informe from './pantallas/Informe.jsx';
import Espacio from './componentes/Espacio.jsx';
import Cabina from './componentes/Cabina.jsx';
import Recursos from './componentes/Recursos.jsx';
import Version from './componentes/Version.jsx';
import Concepto from './componentes/Concepto.jsx';
import { alternarSilencio, estaSilenciado, instalarClics, sonidos } from './sonido.js';
import { disenoReal } from './motor/nave.js';
import { lazy, Suspense } from 'react';

// Banco de pruebas del taller 3D: ?banco=Cuarto|Maquina|Brazo|Operador|piezas3d (ver docs/TALLER_3D.md).
const Banco = lazy(() => import('./taller/Banco.jsx'));
const Sondas = lazy(() => import('./sondas/VisorSondas.jsx'));
const CentroTierra = lazy(() => import('./pantallas/CentroTierra.jsx'));
const Taller = lazy(() => import('./taller/Taller.jsx'));
const GarageNodriza = lazy(() => import('./nodriza/GarageNodriza.jsx'));

// Datos en español (los originales). Los textos en inglés se aplican encima con misionLocal / piezasLocales.
const MISIONES_BASE = { lro, juno };
// B3: bateria/computadora/orientacion en null = el jugador debe elegirlas (en principiante se eligen solas).
const DISENO_VACIO = { energia: null, antena: null, blindaje: null, propulsion: null, cohete: null, instrumentos: [], bateria: null, computadora: null, orientacion: null };
const ESTETICA_INICIAL = {
  casco: '#c9d3e6', detalle: '#ff7a1a', nombre: '',
  parche: { forma: 'circulo', fondo: '#0b1e4a', icono: 'planeta' },
};

// Modos de prueba (para probar un minijuego sin jugar todo):
//   ?cabina=reinicio|tormenta|antena        → solo ese minijuego de cabina
//   ?probar=lanzamiento|leop|crucero|encuentro|operacion|operacion_clasica&mision=lro|juno → salta directo a esa fase con la nave real
//   ?probar=llegada → inserción orbital (fuera de la campaña: de la red de drones se pasa directo a la etapa 05)
//   ?probar=encuentro&mision=lro|juno&drones=N&objetivo=<id>&semilla=<n> → etapa 05: N drones en la bahía, objetivo (apolo11, lunojod1, fosa, tycho, loki, steeple, pluma) y sitio fijos
//   ?probar=insercion&mision=lro|juno&semilla=<n> → etapa 06: inserción orbital y minisonda (misma semilla = mismos cuerpos)
//   ?probar=operacion&mision=lro|juno&semilla=<n>&fase=1|2|3 → etapa 07: operación científica en 3 fases (fase = saltar a una de ellas); ?probar=operacion_clasica es la operación anterior (pasadas contra la radiación)
//   ?probar=extendida&mision=lro|juno&semilla=<n> → etapa 08: misión extendida «Cuida tu sonda» y disposición final
//   ?nodriza                                → abre directo el Garage Nodriza ASTRION-X
// Pantalla 3D de la etapa 05: se descarga solo al llegar a ella (three + terreno).
const Encuentro = lazy(() => import('./pantallas/Encuentro.jsx'));
// Pantalla 3D de la etapa 06: igual, se descarga solo al llegar a ella.
const Insercion = lazy(() => import('./pantallas/Insercion.jsx'));
const URL_PARAMS = new URLSearchParams(window.location.search);
const MODO_PRUEBAS = URL_PARAMS.get('modo') === 'pruebas';
const PRUEBA_CABINA = URL_PARAMS.get('cabina');
const PROBAR = URL_PARAMS.get('probar');
// B8 · Diseño compartido por enlace (?diseno=<código>): abre el hangar con esa nave y esa misión.
const DISENO_COMPARTIDO = URL_PARAMS.get('diseno') ? decodificarDiseno(URL_PARAMS.get('diseno')) : null;
const PROBAR_MISION = URL_PARAMS.get('mision') === 'juno' ? 'juno' : 'lro';
const SEMILLA_PRUEBA = URL_PARAMS.get('semilla') === null || Number.isNaN(Number(URL_PARAMS.get('semilla'))) ? undefined : Number(URL_PARAMS.get('semilla'));
// Opciones del sitio del encuentro (solo con ?probar=encuentro): objetivo y semilla fijos para repetir una partida.
const OPCIONES_ENCUENTRO = PROBAR === 'encuentro' ? { objetivoId: URL_PARAMS.get('objetivo') || undefined, semilla: SEMILLA_PRUEBA } : {};
// Semilla de los cuerpos de la minisonda (solo con ?probar=insercion).
const OPCIONES_INSERCION = PROBAR === 'insercion' ? { semilla: SEMILLA_PRUEBA } : {};
// Opciones de la operación científica (solo con ?probar=operacion): semilla fija y fase inicial (1, 2 o 3).
const FASE_PRUEBA = ['1', '2', '3'].includes(URL_PARAMS.get('fase')) ? Number(URL_PARAMS.get('fase')) : undefined;
const OPCIONES_OPERACION = PROBAR === 'operacion' ? { semilla: SEMILLA_PRUEBA, fase: FASE_PRUEBA } : {};
// Semilla de los eventos de la misión extendida (solo con ?probar=extendida).
const OPCIONES_EXTENDIDA = PROBAR === 'extendida' ? { semilla: SEMILLA_PRUEBA } : {};
const disenoPrueba = m => ({ ...disenoReal(m, piezasBase), drones: Math.max(0, Math.min(4, Number(URL_PARAMS.get('drones') ?? 3))) });
// El Garage Nodriza ASTRION-X ya no está en la cabecera del juego: solo se abre directo con ?nodriza (pruebas).
const INICIAR_EN_NODRIZA = URL_PARAMS.has('nodriza');
// En cualquier modo de prueba no se guarda ni se recupera el punto de control de la partida.
const SIN_PUNTO_DE_CONTROL = !!PROBAR || MODO_PRUEBAS || !!PRUEBA_CABINA || URL_PARAMS.has('banco') || URL_PARAMS.has('sondas') || INICIAR_EN_NODRIZA || !!DISENO_COMPARTIDO;
// Punto de control válido (y de una misión que existe) para recuperar al cargar o al pulsar «Continuar».
const puntoValido = () => {
  if (SIN_PUNTO_DE_CONTROL) return null;
  const p = leerPartida();
  return p && MISIONES_BASE[p.misionId] ? p : null;
};

export default function App() {
  const [enGarageNodriza, setEnGarageNodriza] = useState(INICIAR_EN_NODRIZA);
  const t = useT();

  if (URL_PARAMS.has('sondas')) {
    return <Suspense fallback={null}><Sondas /></Suspense>;
  }
  if (URL_PARAMS.get('banco')) {
    return <Suspense fallback={null}><Banco modulo={URL_PARAMS.get('banco')} calidad={URL_PARAMS.get('calidad') || 'alta'} /></Suspense>;
  }
  if (PRUEBA_CABINA) {
    return (
      <div className="app">
        <Espacio />
        <Cabina modo={PRUEBA_CABINA} alTerminar={(ok) => console.log('cabina terminada', ok)} />
      </div>
    );
  }
  if (enGarageNodriza) {
    return (
      <Suspense fallback={<div className="panel">{t('app.cargandoNodriza')}</div>}>
        <GarageNodriza alVolver={() => setEnGarageNodriza(false)} />
      </Suspense>
    );
  }
  return <Juego />;
}

function Juego() {
  // Idioma: al cambiarlo se repinta todo el juego con los textos traducidos, sin perder la partida.
  const [idioma] = useIdioma();
  const t = useT();
  // B2 · Dificultad (Principiante / Intermedio): se aplica encima de la misión ya traducida.
  const [dificultad, setDificultad] = useState(() => nivelValido(puntoValido()?.dificultad ?? NIVEL_POR_DEFECTO));
  const MISIONES = useMemo(() => ({
    lro: misionConDificultad(misionLocal(lro, idioma), dificultad),
    juno: misionConDificultad(misionLocal(juno, idioma), dificultad),
  }), [idioma, dificultad]);
  const piezas = useMemo(() => piezasLocales(piezasBase, idioma), [idioma]);
  const cohetes = useMemo(() => cohetesLocales(cohetesBase, idioma), [idioma]);
  // Si se recargó la página a mitad de partida, arrancamos donde había un punto de control (una sola lectura).
  // Al entrar siempre se abre el menú principal; la partida guardada se retoma con «Continuar» del menú (no automáticamente).
  const [recuperada] = useState(null);
  const [avisoRecuperada, setAvisoRecuperada] = useState(!!recuperada);
  const [misionId, setMisionId] = useState(recuperada?.misionId ?? (DISENO_COMPARTIDO ? DISENO_COMPARTIDO.misionId : PROBAR ? PROBAR_MISION : 'lro'));
  const mision = MISIONES[misionId];
  const [fase, setFase] = useState(recuperada?.fase ?? (DISENO_COMPARTIDO ? 'hangar' : PROBAR || 'menu'));
  const [diseno, setDiseno] = useState(() => recuperada?.diseno ?? (DISENO_COMPARTIDO ? { ...DISENO_VACIO, ...DISENO_COMPARTIDO.diseno } : PROBAR ? disenoPrueba(MISIONES[PROBAR_MISION]) : DISENO_VACIO));
  const [silencio, setSilencio] = useState(estaSilenciado);
  instalarClics();
  const [estetica, setEstetica] = useState(() => recuperada?.estetica ?? ESTETICA_INICIAL);
  const [estado, setEstado] = useState(() => {
    if (recuperada) return recuperada.estado ?? null;
    if (!PROBAR) return null;
    const m = MISIONES[PROBAR_MISION];
    const d = disenoPrueba(m);
    // Los drones de la bahía que llegan a la etapa 05 (en la partida real los deja el juego 4).
    return { ...estadoInicial(resumenNave(d, piezas, cohetes, m), m, d), dronesRestantes: d.drones };
  });
  const [extras, setExtras] = useState(() => recuperada?.extras ?? { coincidenciasReales: 0, desorbito: false });
  const [progreso, setProgresoCrudo] = useState(() => MODO_PRUEBAS ? {
    ...PROGRESO_INICIAL, fondos: 9999, desbloqueados: [...piezas, ...cohetes].map(p => p.id),
  } : leerProgreso());
  const [tierraAbierta, setTierraAbierta] = useState(false);
  const [vistos, setVistos] = useState(() => recuperada?.vistos ?? []); // conceptos del tutorial ya leídos
  const setProgreso = (p) => setProgresoCrudo(MODO_PRUEBAS ? p : guardarProgreso(p));

  // Punto de control = foto al ENTRAR a cada fase (así el estado no incluye lo descontado a mitad de etapa
  // y al recargar no se cobra dos veces). En el hangar también se guarda al cambiar la nave. El menú no guarda.
  const enHangar = fase === 'hangar';
  useEffect(() => {
    if (SIN_PUNTO_DE_CONTROL || fase === 'menu') return;
    guardarPartida({ misionId, fase, estado, diseno, estetica, extras, vistos, dificultad, equipo });
    // Solo al cambiar de fase (o, en el hangar, la nave): el resto de dependencias se leen tal como están al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, enHangar ? diseno : null, enHangar ? estetica : null]);
  // El menú ofrece «Continuar» si quedó una partida guardada; se relee cada vez que se vuelve a él.
  const partidaGuardada = fase === 'menu' ? puntoValido() : null;
  const continuar = () => {
    const p = puntoValido();
    if (!p) return;
    setMisionId(p.misionId); setDiseno(p.diseno); setEstetica(p.estetica ?? ESTETICA_INICIAL);
    setEstado(p.estado ?? null); setExtras(p.extras ?? { coincidenciasReales: 0, desorbito: false });
    setVistos(p.vistos ?? []); setDificultad(nivelValido(p.dificultad)); setEquipo(p.equipo ?? null); setFase(p.fase);
  };
  const empezarDeNuevo = () => { borrarPartida(); setAvisoRecuperada(false); setEstado(null); setFase('menu'); };
  useEffect(() => {
    if (!avisoRecuperada) return;
    const id = setTimeout(() => setAvisoRecuperada(false), 6000);
    return () => clearTimeout(id);
  }, [avisoRecuperada]);

  const resumen = resumenNave(diseno, piezas, cohetes, mision);
  // Tarjeta de concepto del tutorial (solo en la misión tutorial, una vez cada una).
  const concepto = (clave) => (
    <Concepto mision={mision} clave={clave} visto={vistos.includes(clave)} alCerrar={() => setVistos((v) => [...v, clave])} />
  );
  // En una partida de equipo en red, todas las piezas están disponibles (como en el modo libre): no depende de la
  // campaña de cada jugador, que puede tener casi todo bloqueado. Se declara aquí porque `ctx` la usa.
  const salaCtx = useSala().sala;
  const enRedCtx = !!salaCtx?.estado && salaCtx.estado.fase !== 'espera';
  const progresoJuego = enRedCtx ? { ...progreso, desbloqueados: [...piezas, ...cohetes].map((p) => p.id) } : progreso;
  const ctx = { mision, piezas, cohetes, diseno, estetica, resumen, estado, setEstado, progreso: progresoJuego, concepto, alHangar: () => setFase('hangar') };

  const elegirMision = (id, equipoInicial = null) => {
    if (red.sala) salirSala();
    entradaRed.current = null;
    borrarPartida(); // misión nueva desde cero: el punto de control anterior ya no vale
    setMisionId(id);
    setDiseno(MODO_PRUEBAS ? disenoReal(MISIONES[id], piezas) : DISENO_VACIO);
    setVistos([]);
    setEquipo(equipoInicial); // El menú ya confirmó el equipo antes del briefing.
    setFase(MODO_PRUEBAS ? 'hangar' : 'briefing');
  };
  // B9 · Revisión de diseño (proceso NASA: cada requisito con su verificación) antes de lanzar.
  const [revisando, setRevisando] = useState(false);
  // B4 · Modo equipo: con 2 o más jugadores, el equipo vota la nave antes de la revisión de diseño.
  const [equipo, setEquipo] = useState(() => puntoValido()?.equipo ?? null);
  const [votando, setVotando] = useState(false);
  // B5 · Simulación rápida en el hangar y comparación de intentos en el informe.
  const [simulando, setSimulando] = useState(false);
  // Menú principal: diálogo abierto ('info' desde la cabecera, 'opciones' o 'ayuda' desde los botones).
  const [vistaMenu, setVistaMenu] = useState(null);
  // B10 · Modo equipo EN RED: salas con código (servidor/sala.mjs). Cada quien juega en su dispositivo.
  const red = useSala();
  useEffect(() => { reanudarSala(); }, []);
  const estRed = red.sala?.estado;
  const enRed = !!estRed && estRed.fase !== 'espera';
  const misRoles = enRed ? (equipo?.jugadores?.find((j) => j.idRed === red.miId)?.roles ?? []) : [];
  const [avisoRed, setAvisoRed] = useState(null);
  // B12 · En red, cada jugador solo abre las estaciones de sus roles y avisa cuál tiene abierta (presencia).
  const permitidas = enRed ? ROLES.filter((r) => misRoles.includes(r.id)).flatMap((r) => r.estaciones) : null;
  const verEstacion = useCallback((estacion) => { if (enRed) enviar({ t: 'presencia', estacion }); }, [enRed]);
  const [rondaVista, setRondaVista] = useState(0);
  // Cuando el anfitrión empieza, todos entran al hangar con la misma misión, dificultad y equipo (una vez por sala).
  const entradaRed = useRef(null);
  useEffect(() => {
    if (red.error !== 'sala_cerrada') return;
    entradaRed.current = null;
    borrarPartida();
    setEquipo(null); setEstado(null); setVistaMenu(null); setFase('menu');
  }, [red.error]);
  useEffect(() => {
    const clavePartida = `${red.sala?.codigo}:${estRed?.partida ?? 0}`; // sala + partida: la siguiente misión en la misma sala también entra
    if (!estRed || estRed.fase !== 'hangar' || entradaRed.current === clavePartida) return;
    if (!['menu', 'briefing', 'hangar'].includes(fase)) return; // si recargó a media misión, no lo regresamos al hangar
    entradaRed.current = clavePartida;
    resultadoEnviado.current = null;
    borrarPartida();
    setMisionId(estRed.misionId); setDificultad(nivelValido(estRed.dificultad)); setEquipo(estRed.equipo);
    setDiseno({ ...DISENO_VACIO, ...(estRed.diseno || {}) }); setVistos([]); setEstado(null);
    setRondaVista(estRed.votacion?.ronda ?? 0); setVistaMenu(null); setFase('hangar');
  }, [estRed, red.sala, fase]);
  // Cambios de la nave que hacen los demás jugadores: se mezclan por pieza.
  const disenoRemoto = JSON.stringify(estRed?.diseno ?? null);
  useEffect(() => {
    if (enRed && estRed?.diseno && fase === 'hangar') setDiseno((d) => ({ ...d, ...estRed.diseno }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disenoRemoto]);
  // En red, cada jugador solo cambia las piezas de sus roles; lo que cambia se manda a los demás.
  const disenoRef = useRef(diseno);
  disenoRef.current = diseno;
  const setDisenoJuego = (nuevo) => {
    if (!enRed) { setDiseno(nuevo); return; }
    const antes = disenoRef.current;
    const despues = typeof nuevo === 'function' ? nuevo(antes) : nuevo;
    const todos = cambiosDiseno(antes, despues);
    const ajenas = clavesAjenas(todos, misRoles);
    // Solo se aplican las piezas de MIS roles. Lo ajeno se ignora: suele venir de una copia vieja de la nave
    // (el taller copia la nave al abrir una estación y otro jugador pudo cambiar algo mientras tanto).
    const cambios = Object.fromEntries(Object.entries(todos).filter(([k]) => !ajenas.includes(k)));
    if (!Object.keys(cambios).length) {
      if (ajenas.length) {
        const rol = rolDeClave(ajenas[0]);
        const dueno = equipo?.jugadores?.find((j) => j.roles.includes(rol));
        setAvisoRed(t('red.noEsTuRol', { nombre: dueno?.nombre ?? '', rol: t(`equipo.rol.${rol}`) }));
        setTimeout(() => setAvisoRed(null), 4000);
      }
      return;
    }
    setDiseno({ ...antes, ...cambios });
    enviar({ t: 'diseno', cambios });
  };
  const votandoRed = enRed && fase === 'hangar' && (!!estRed?.votando || (estRed?.votacion?.ronda ?? 0) > rondaVista);
  // Al terminar la misión, cada jugador manda su puntaje a la sala (una vez por partida).
  const resultadoEnviado = useRef(null);
  useEffect(() => {
    const clave = `${red.sala?.codigo}:${estRed?.partida ?? 0}`;
    if (!enRed || fase !== 'informe' || !estado || resultadoEnviado.current === clave) return;
    resultadoEnviado.current = clave;
    enviar({ t: 'resultado', datos: { puntaje: puntaje(estado, resumen, mision, extras).total, ciencia: Math.min(1, estado.ciencia ?? 0) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, enRed]);
  // Botones del panel «Jugar en equipo» del menú.
  const empezarEquipoLocal = (e) => { setVistaMenu(null); setEquipo(e); };
  const empezarEquipoRed = ({ equipo: eq, dificultad: dif }, id) => {
    if (red.sala?.hostId !== red.miId || red.sala.jugadores.length < 2 || !MISIONES[id]) return;
    enviar({ t: 'estado', parche: { fase: 'hangar', misionId: id, dificultad: dif, equipo: eq, diseno: DISENO_VACIO, partida: Date.now() } });
  };
  const despegar = () => (enRed ? enviar({ t: 'estado', parche: { votando: true } }) : esEquipo(equipo) ? setVotando(true) : setRevisando(true));
  const despegarDeVerdad = () => {
    setRevisando(false);
    setEstado({ ...estadoInicial(resumen, mision, diseno), requisitos: resumenRequisitos(requisitos(mision, resumen, diseno)) });
    setExtras({ coincidenciasReales: 0, desorbito: false });
    setFase('lanzamiento');
  };
  const reintentar = () => { borrarPartida(); setEstado(null); setFase('hangar'); };
  const volverAlMenu = () => { borrarPartida(); setFase('menu'); }; // desde el informe: la partida terminó
  // Si la misión se pierde en cualquier fase, vamos directo al informe.
  const siguiente = (f) => (estado?.perdida ? setFase('informe') : setFase(f));

  // Espejo en línea (ver red/espejo.js): en cada etapa solo maneja el piloto. Cuando el piloto cambia de fase
  // (terminó la etapa) manda a la sala la fase nueva y el estado de la misión; los espectadores los aplican.
  const espejoAhora = espejoDeSala(red.sala, red.miId, fase);
  const faseAnterior = useRef(fase);
  useEffect(() => {
    const previa = faseAnterior.current; faseAnterior.current = fase;
    if (!enRed || previa === fase) return;
    const saliendoHangar = previa === 'hangar' && fase === 'lanzamiento';
    const operacion = previa === 'operacion'; // etapa 07 (Tetris por turnos): quien la cierra primero lleva a todos a la 08
    if (!saliendoHangar && !operacion && !ETAPAS_ESPEJO.includes(previa)) return;
    if (!saliendoHangar && !operacion && pilotoDeEtapa(red.sala.jugadores, previa)?.id !== red.miId) return;
    enviar({ t: 'estado', parche: { etapa: { fase, n: Date.now(), estado: estado ?? null } } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);
  const etapaAplicada = useRef(0);
  const etapaRed = estRed?.etapa;
  useEffect(() => {
    if (!enRed || !etapaRed || etapaRed.n <= etapaAplicada.current) return;
    etapaAplicada.current = etapaRed.n;
    const entrandoDesdeHangar = fase === 'hangar' && etapaRed.fase === 'lanzamiento';
    // Solo arrastra a quien está en una etapa con espejo (o cerrando el hangar para despegar juntos).
    if (etapaRed.fase === fase || (!entrandoDesdeHangar && fase !== 'operacion' && !ETAPAS_ESPEJO.includes(fase))) return;
    setRevisando(false);
    if (etapaRed.estado) setEstado(etapaRed.estado);
    setFase(etapaRed.fase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapaRed?.n]);
  // El espectador ve la partida pero no la toca: se bloquea el teclado antes de que llegue a la pantalla y el CSS quita los clics.
  useEffect(() => {
    if (!espejoAhora.espectador) return undefined;
    const bloquear = (e) => { if (e.target?.matches?.('input[type=text],textarea')) return; e.stopImmediatePropagation(); e.preventDefault(); };
    window.addEventListener('keydown', bloquear, true); window.addEventListener('keyup', bloquear, true);
    document.body.classList.add('espejo-espectador');
    return () => { window.removeEventListener('keydown', bloquear, true); window.removeEventListener('keyup', bloquear, true); document.body.classList.remove('espejo-espectador'); };
  }, [espejoAhora.espectador]);

  return (
    <div className={`app app-juego app-${fase}${fase === 'operacion' ? ' app-operacion07' : fase === 'operacion_clasica' ? ' app-operacion' : ''}`}>
      {/* En el crucero las estrellas pasan más rápido: sensación de viaje. */}
      <Espacio velocidad={fase === 'crucero' ? 6 : fase === 'lanzamiento' ? 3 : 1} />
      <div className="cabecera">
        <button className="marca" aria-label={t('app.volverMenu')} onClick={() => { setTierraAbierta(false); setFase('menu'); }}><span className="marca-simbolo">↗</span><span>ODISEA GALÁCTICA<br />{t('app.programa')}</span></button>
        {fase !== 'menu' && <span>{t('app.mision', { n: mision.numero, nombre: mision.nombre, destino: mision.destino.nombre })}</span>}
        {/* El idioma se cambia fuera de los minijuegos: cambiarlo a media etapa reconfiguraría la etapa. */}
        {['menu', 'briefing', 'hangar', 'informe'].includes(fase) && <SelectorIdioma />}
        <button className="boton-sonido" aria-label={silencio ? t('app.activarSonido') : t('app.silenciar')} onClick={() => setSilencio(alternarSilencio())}>{silencio ? '🔇' : '🔊'}</button>
        {fase === 'menu' && <button type="button" className="boton-info" aria-label={t('menu.info')} title={t('menu.info')} onClick={() => setVistaMenu('info')}>ⓘ</button>}
        {document.documentElement.requestFullscreen && <button className="boton-fullscreen" aria-label={t('app.alternarPantalla')} title={t('app.pantallaCompleta')} onClick={() => { const cambio = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); cambio?.catch(() => {}); }}>⛶</button>}
      </div>
      {avisoRecuperada && (
        <div className="aviso-partida" role="status">
          <span>{t('app.recuperada', { fase: t(`fase.${fase}`, null, etiquetaFase(fase)) })}</span>
          <button onClick={empezarDeNuevo}>{t('app.empezarDeNuevo')}</button>
          <button className="aviso-partida-cerrar" aria-label={t('app.cerrarAviso')} onClick={() => setAvisoRecuperada(false)}>×</button>
        </div>
      )}
      {fase !== 'menu' && fase !== 'hangar' && <Recursos fase={fase} progreso={progreso} mision={mision} resumen={resumen} estado={estado} />}
      {red.error === 'sala_cerrada' && <div className="aviso-partida" role="alert">{t('red.error.sala_cerrada')}</div>}
      <AvisoEspejo red={red} equipo={equipo} fase={fase} />
      <div key={fase} className="entrar pantalla-juego">
      {/* El espectador salta el tutorial de entrada: si no, se queda en el diálogo (no puede tocarlo) y nunca ve el minijuego. */}
      <EntradaTutorial fase={fase} equipo={equipo} misRoles={misRoles} dificultad={dificultad} omitir={espejoAhora.espectador}>
      {fase === 'menu' && tierraAbierta && progreso.completadas.includes('lro') && !red.sala && (
        <Suspense fallback={<div className="panel">{t('tierra.cargando')}</div>}>
          <CentroTierra fondos={progreso.fondos} esperaMs={esperaTierra(progreso)} alSalir={() => setTierraAbierta(false)} alCobrar={(resultado, id) => {
            const nuevo = cobrarActividadTierra(progreso, resultado, id);
            setProgreso(nuevo);
            return nuevo.fondos - progreso.fondos;
          }} />
        </Suspense>
      )}
      {fase === 'menu' && (!tierraAbierta || red.sala || !progreso.completadas.includes('lro')) && (
        <Menu alTierra={() => { setVistaMenu(null); setTierraAbierta(true); }} progreso={progreso} misiones={MISIONES} alElegir={elegirMision} pruebas={MODO_PRUEBAS} vista={vistaMenu} setVista={setVistaMenu} red={red} equipoLocal={equipo} alEquipoLocal={empezarEquipoLocal} alEquipoRed={empezarEquipoRed}
          alReiniciar={() => {
            if (!reiniciarCampana()) return false;
            salirSala();
            const url = new URL(window.location.href);
            url.search = ''; url.hash = ''; url.searchParams.set('lang', idioma);
            window.location.assign(url.href);
            return true;
          }} partidaGuardada={partidaGuardada} alContinuar={continuar} />
      )}
      {fase === 'briefing' && <Briefing mision={mision} alSeguir={() => setFase('hangar')} dificultad={dificultad} setDificultad={enRed ? undefined : setDificultad} />}
      {fase === 'hangar' && (
        <Suspense fallback={<div className="panel">{t('app.preparandoTaller')}</div>}><Taller {...ctx} equipo={equipo} permitidas={permitidas} alVerEstacion={verEstacion} setDiseno={setDisenoJuego} setEstetica={setEstetica} alLanzar={despegar} alSimular={fase === 'hangar' && !revisando && !votando && !votandoRed && !simulando ? () => setSimulando(true) : null}
          alComprar={(pieza) => { sonidos.comprar(); setProgreso(comprar(progreso, pieza)); }} /></Suspense>
      )}
      {fase === 'hangar' && enRed && <BarraRed red={red} equipo={equipo} misRoles={misRoles} aviso={avisoRed} faltan={resumen.faltan ?? []} />}
      {votandoRed && (
        <VotacionRed key={estRed?.ronda ?? 0} red={red} misRoles={misRoles} equipo={equipo} resumen={resumen} requisitos={requisitos(mision, resumen, diseno)} rondaVista={rondaVista}
          alAprobado={() => { setRondaVista(estRed.votacion?.ronda ?? rondaVista); setRevisando(true); }} alCerrar={() => setRondaVista(estRed?.votacion?.ronda ?? rondaVista)} />
      )}
      {fase === 'hangar' && !revisando && !votando && !votandoRed && !simulando && (
        <button type="button" className="boton-simulacion" onClick={() => setSimulando(true)}>{t('intentos.boton')}</button>
      )}
      {fase === 'hangar' && simulando && <SimulacionRapida mision={mision} resumen={resumen} diseno={diseno} alCerrar={() => setSimulando(false)} />}
      {fase === 'hangar' && votando && (
        <VotacionEquipo equipo={equipo} resumen={resumen} requisitos={requisitos(mision, resumen, diseno)}
          alAprobado={(e) => { setEquipo(e); setVotando(false); setRevisando(true); }} alCambios={(e) => { setEquipo(e); setVotando(false); }} />
      )}
      {fase === 'hangar' && revisando && (
        <RevisionDiseno mision={mision} resumen={resumen} diseno={diseno} equipo={equipo} misRoles={misRoles} dificultad={dificultad} alLanzar={despegarDeVerdad} alVolver={() => setRevisando(false)} />
      )}
      {fase === 'lanzamiento' && <Lanzamiento {...ctx} equipo={equipo} misRoles={misRoles} dificultad={dificultad} alTerminar={() => siguiente('leop')} />}
      {fase === 'leop' && <Leop {...ctx} alTerminar={() => siguiente('crucero')} />}
      {/* 04 red de drones → 05 aproximación y encuentro: la nodriza ya está en órbita cuando lanza los drones. */}
      {fase === 'crucero' && <Crucero {...ctx} alTerminar={() => siguiente('encuentro')} />}
      {/* Inserción orbital: fuera de la campaña (solo ?probar=llegada); se conserva para reutilizarla. */}
      {fase === 'llegada' && <Llegada {...ctx} alTerminar={() => siguiente('encuentro')} alPerder={() => setFase('informe')} />}
      {fase === 'encuentro' && (
        <Suspense fallback={<div className="panel">{t('app.preparandoDron')}</div>}>
          <Encuentro {...ctx} opciones={OPCIONES_ENCUENTRO} alTerminar={() => siguiente('insercion')} alPerder={() => setFase('informe')} />
        </Suspense>
      )}
      {/* 06 inserción orbital (minisonda): la nodriza frena sola, queda en órbita y suelta la minisonda. */}
      {fase === 'insercion' && (
        <Suspense fallback={<div className="panel">{t('app.preparandoMinisonda')}</div>}>
          <Insercion {...ctx} opciones={OPCIONES_INSERCION} alTerminar={() => siguiente('operacion')} />
        </Suspense>
      )}
      {/* 07 operación científica en 3 fases (cartografía, espectro y transmisión) → informe. */}
      {fase === 'operacion' && <Operacion07 {...ctx} opciones={OPCIONES_OPERACION} alTerminar={() => siguiente('extendida')} />}
      {/* 08 misión extendida «Cuida tu sonda» y disposición final → informe. */}
      {fase === 'extendida' && <Extendida {...ctx} setExtras={setExtras} opciones={OPCIONES_EXTENDIDA} alTerminar={() => setFase('informe')} />}
      {/* La operación anterior (pasadas contra la radiación) se conserva fuera de la campaña: ?probar=operacion_clasica */}
      {fase === 'operacion_clasica' && (
        <Operacion {...ctx} setExtras={setExtras} alTerminar={() => setFase('informe')} />
      )}
      {fase === 'informe' && (
        <Informe {...ctx} equipo={equipo} misRoles={misRoles} dificultad={dificultad} extras={extras} alReintentar={reintentar} alMenu={volverAlMenu}
          alCobrar={(medalla) => { const r = cobrar(progreso, mision, medalla); setProgreso(r.progreso); return r; }}
          // El informe se organiza en pestañas: estos paneles viven dentro de ellas (antes iban apilados debajo).
          paneles={{
            equipo: enRed
              ? <ResultadoRed red={red} equipo={equipo} resumen={resumen} requisitos={requisitos(mision, resumen, diseno)} cienciaFinal={estado?.ciencia} />
              : esEquipo(equipo) ? <ResultadoEquipo equipo={equipo} resumen={resumen} requisitos={requisitos(mision, resumen, diseno)} cienciaFinal={estado?.ciencia} /> : null,
            nasa: <PanelNasa3D misionId={mision.id} />,
            historial: estado ? <Comparacion misionId={mision.id} actual={{ diseno, resumen, mision, puntaje: puntaje(estado, resumen, mision, extras).total, ciencia: Math.min(1, estado.ciencia ?? 0) }} /> : null,
            ranking: <Clasificacion misionId={mision.id} mision={mision} puntaje={estado ? puntaje(estado, resumen, mision, extras).total : null} diseno={diseno} />,
          }}
          alCerrarPremio={() => setProgreso({ ...progreso, premiosVistos: { ...progreso.premiosVistos, [mision.id]: true } })} />
      )}
      </EntradaTutorial>
      </div>
      <GuiaIO fase={revisando ? 'revision' : fase} equipo={equipo} misRoles={misRoles} dificultad={dificultad} />
      <Version />
    </div>
  );
}

// Motor de la etapa 08 «Misión extendida y disposición final — Cuida tu sonda».
// Funciones puras: misma entrada (y semilla) → mismo resultado. La pantalla solo manda acciones y dibuja el estado.
// Ver docs/FINAL_08.md. Todas las constantes viven en CONFIG_EXTENDIDA.
import { t } from '../i18n/idioma.js';
import { generacionW } from './nave.js';
import { efectosOrbita } from './orbita.js';
import { ajusteMinijuego } from './dificultad.js';

export const CONFIG_EXTENDIDA = {
  ANO_S: 25, // segundos que dura un año de misión
  ANOS: { lro: 6, juno: 5 }, // tope de años por misión
  ANOS_MAX: { lro: 8, juno: 7 }, // tope absoluto aunque se extienda
  EXTENDER_ANOS: 1,
  HORAS_POR_S: 0.5, // horas de misión que pasan en 1 s de juego (convierte W en Wh)
  BATERIA_INICIAL_MIN: 0.5, // fracción mínima de batería al empezar
  // Energía
  ESCALA_SOLAR: { lro: 0.3, juno: 1 }, // aprovechamiento de los paneles (sombras, ángulo)
  DEGRADACION_PANEL: 0.1, // por año
  DEGRADACION_RTG: 0.03, // por año (decaimiento del plutonio y de los termopares)
  ORIENTACION_CIENCIA_GEN: 0.55, // fracción de la generación solar al apuntar a la ciencia
  ORIENTACION_SOL_DATOS: 0.6, // fracción de los datos al apuntar al Sol
  CALENTADOR_W: { lro: 60, juno: 80 },
  // Datos por instrumento encendido (puntos por segundo)
  TASA_BASE: 0.6, TASA_K: 0.9, TASA_REF: 20,
  REF_FRACCION: 0.45, // qué parte de lo posible se considera «misión redonda»
  SALUD_BAJA: 30, FACTOR_SALUD_BAJA: 0.5,
  // Temperatura (°C)
  TEMP_INICIAL: 15, TEMP_MIN: -20, TEMP_MAX: 50, TEMP_TAU_S: 8, TEMP_TOLERANCIA_S: 8, TEMP_DANO: 8,
  TEMP_AMBIENTE: { lro: 8, juno: -22 },
  TEMP_SOL: 4, TEMP_CIENCIA: -4, TEMP_INSTRUMENTOS: { lro: 12, juno: 14 }, TEMP_CALENTADOR: 28, TEMP_RTG: 20, TEMP_ECLIPSE: -30,
  // Órbita
  ALTITUD_INICIAL_KM: 60, ALTITUD_MAX_KM: 110, DECAIMIENTO_KM_S: 1.1, MASCONES: 0.35, CORRECCION_KM: 22, CORRECCION_DV: 6, ALTITUD_CRITICA_KM: 6,
  COMBUSTIBLE_MIN: 30, COMBUSTIBLE_MAX: 600,
  // Radiación y salud
  RADIACION_S: { lro: 0.02, juno: 0.55 }, // % de salud por segundo sin blindaje
  PICO_AVISO_S: 5, PICO_DANO: { lro: 6, juno: 12 }, MICRO_DANO: 3, GIRO_S: 6, ECLIPSE_S: 5,
  // Eventos y modo seguro
  EVENTO_MIN_S: 8, EVENTO_MAX_S: 15, SEGURO_S: 6, SEGURO_SALUD: 3, SEGURO_BATERIA: 0.12,
  // Cartas
  CARTA_EN_S: 12, // segundo del año en que aparece la carta
  // Los últimos datos
  ULTIMOS_S: 10, ULTIMOS_DATOS: 2, ULTIMOS_CONSUMO: 1.8,
  // Cierre
  CIENCIA_MAX: 0.15, SALUD_CUIDADA: 50, SEGUROS_CUIDADA: 1, SALUD_AGOTADA: 12,
};
const C = CONFIG_EXTENDIDA;

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const destinoDe = m => (m?.id === 'juno' ? 'jupiter' : 'luna');

// Azar con semilla (mulberry32): el estado del azar es un número que viaja en `rs`.
function sorteo(n) {
  n.rs = (n.rs + 0x6D2B79F5) >>> 0;
  let t = n.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const tasaDatos = mbitDia => C.TASA_BASE + C.TASA_K * Math.log(1 + (mbitDia || 0) / C.TASA_REF);

// ---------- Cartas ----------
// Cada opción: { texto, efectos, consecuencia, vidaReal?, real? }. Efectos: datos, salud, radiacion (salud × (1 − blindaje)), bateriaPct,
// combustible, altitud, tope, terminarAntes, multDatos, multDesgaste, retirarInstrumento, modoSeguro, banderas.
const CARTAS_COMUNES = {
  viejo: {
    id: 'viejo', icono: '📻', titulo: '¿Apagas un instrumento viejo para ahorrar energía?',
    texto: 'Uno de tus instrumentos rinde cada vez menos y sigue gastando watts. Las naves reales hacen esto para estirar su vida.',
    opciones: [
      { texto: 'Sí, apagarlo para siempre', efectos: { retirarInstrumento: true, bateriaPct: 0.1, banderas: { apagoViejo: true } }, consecuencia: 'El instrumento menos productivo se apaga. Pierdes sus datos, pero ahorras energía cada día.', vidaReal: 'Las Voyager, lanzadas en 1977, han ido apagando instrumentos y calefactores para que su RTG alcance a alimentar los que quedan.' },
      { texto: 'No, seguir con todo', efectos: {}, consecuencia: 'Todo sigue encendido. Más ciencia hoy, pero tu margen de energía se estrecha.', vidaReal: 'Mantener todo encendido da más ciencia ahora, pero acorta la vida de la misión: por eso los equipos de las Voyager apagan cosas con cuidado.' },
    ],
  },
  extender: {
    id: 'extender', icono: '📅', titulo: '¿Extiendes la misión un año más?',
    texto: 'El plan terminaba pronto, pero la sonda aún funciona. Seguir da más datos y más desgaste; parar es seguro.',
    opciones: [
      { texto: 'Sí, un año más (más datos, más desgaste)', efectos: { tope: 1, multDesgaste: 1.4, datos: 20, banderas: { extendio: true } }, consecuencia: 'La NASA aprueba una extensión: tienes un año más, pero los paneles y la electrónica se desgastan más rápido.', vidaReal: 'Casi todas las misiones de la NASA se extienden varias veces mientras la nave siga sana: Juno y LRO ya han pasado su misión principal.' },
      { texto: 'No, terminar antes y a salvo', efectos: { terminarAntes: true, banderas: { termino_antes: true } }, consecuencia: 'Decides cerrar pronto, con la sonda en buen estado y lista para su disposición final.', vidaReal: 'Una misión también puede terminar a tiempo por seguridad: es mejor decidir el final que dejar que la nave falle sola.' },
    ],
  },
};
const CARTAS_LUNA = {
  hielo: {
    id: 'hielo', icono: '🧊', titulo: '¿Buscas hielo en los cráteres oscuros del polo?',
    texto: 'Hay cráteres que nunca reciben luz del Sol. Mirar dentro exige apuntar los instrumentos en la oscuridad y usar energía.',
    opciones: [
      { texto: 'Sí, apuntar los instrumentos al polo', efectos: { datos: 45, bateriaPct: -0.08, banderas: { buscoHielo: true } }, consecuencia: 'Encuentras señales de hielo de agua en la sombra eterna. Un hallazgo valioso, pagado con batería.', vidaReal: 'En 2009 LCROSS chocó con el cráter Cabeus y LRO midió el penacho: había agua helada en la Luna.' },
      { texto: 'No, seguir el mapeo normal', efectos: { datos: 10 }, consecuencia: 'Sigues con el mapa de rutina. Ganas datos seguros, sin sorpresas.', vidaReal: 'Parte del trabajo de LRO fue un mapa cuidadoso de toda la Luna para elegir sitios de aterrizaje.' },
    ],
  },
  bajar: {
    id: 'bajar', icono: '📷', titulo: '¿Bajas la órbita para fotos de más detalle?',
    texto: 'Más cerca del suelo, las fotos son mejores. Pero hay más tirón de los mascones y gastarás combustible.',
    opciones: [
      { texto: 'Sí, bajar la órbita', efectos: { altitud: -18, combustible: -10, multDatos: 1.2, banderas: { orbitaBaja: true } }, consecuencia: 'Las imágenes ganan detalle. La órbita queda más baja y tendrás que corregirla antes.', vidaReal: 'LRO mapeó desde unos 50 km de altura y después pasó a una órbita elíptica para ahorrar combustible.' },
      { texto: 'No, mantener la altura', efectos: {}, consecuencia: 'Mantienes la órbita segura y el combustible intacto.', vidaReal: 'Mantener altura es lo que hacen las misiones cuando el combustible escasea: cada corrección cuenta.' },
    ],
  },
};
const CARTAS_JUPITER = {
  io: {
    id: 'io', icono: '🌋', titulo: '¿Pasas cerca de Ío para estudiar sus volcanes?',
    texto: 'Ío es la luna más volcánica del sistema solar, pero está dentro de los cinturones de radiación más intensos.',
    opciones: [
      { texto: 'Sí, pasar cerca de Ío', efectos: { datos: 60, radiacion: 18, multDatos: 1.15, banderas: { fueIo: true } }, consecuencia: 'Imágenes de volcanes en erupción, a cambio de una dosis fuerte de radiación (el blindaje la reduce).', vidaReal: 'En 2023 y 2024 Juno se acercó a Ío a unos 1 500 km y fotografió sus volcanes, pese a la radiación.' },
      { texto: 'No, mantener la distancia', efectos: {}, consecuencia: 'Evitas la zona más peligrosa y la electrónica respira.', vidaReal: 'Cada pasada cerca de Júpiter acumula daño por radiación: por eso Juno eligió una órbita larga y se acerca poco.' },
    ],
  },
};

// Convierte la decisión real del JSON de la misión en la primera carta del mazo.
function cartaReal(mision) {
  const ev = (mision?.eventos || []).find(e => e.tipo === 'decision_final');
  if (!ev) return null;
  return {
    id: `real_${ev.id}`, fuente: 'real', icono: '🛰️', titulo: ev.titulo, texto: ev.texto,
    opciones: ev.opciones.map(o => {
      if (o.real) return { texto: o.texto, efectos: { banderas: { eligioReal: true } }, consecuencia: o.resultado || o.resultado_ok || '', vidaReal: o.resultado || 'Esto fue lo que hizo la NASA.', real: true };
      const extra = o.efectos?.orbitas_extra || 0, riesgo = o.efectos?.riesgo || 0;
      return {
        texto: o.texto, riesgo, consecuencia: '', vidaReal: 'La NASA eligió otra opción: pesó más el riesgo para la nave que las pasadas extra.',
        efectos: { datos: extra * 8, multDatos: 1 + extra * 0.07 },
        efectosMal: { salud: -12, modoSeguro: 1 },
        textoOk: o.resultado_ok || '', textoMal: o.resultado_mal || '',
      };
    }),
  };
}
export function construirMazo(mision) {
  const real = cartaReal(mision), luna = destinoDe(mision) === 'luna';
  const resto = luna ? [CARTAS_LUNA.hielo, CARTAS_COMUNES.viejo, CARTAS_LUNA.bajar, CARTAS_COMUNES.extender] : [CARTAS_JUPITER.io, CARTAS_COMUNES.viejo, CARTAS_COMUNES.extender];
  return [...(real ? [real] : []), ...resto];
}

// ---------- Disposición final y epílogos ----------
export const FINALES = {
  luna: {
    impacto: { id: 'impacto', texto: 'A. Impacto controlado en la Luna', consecuencia: 'Dirigen la sonda contra una zona despoblada: termina limpia y deja un cráter que otra nave puede estudiar.', vidaReal: 'GRAIL, dos naves gemelas, se estrellaron a propósito contra la Luna en diciembre de 2012.', protege: true },
    orbita: { id: 'orbita', texto: 'B. Dejarla en órbita hasta que se agote', consecuencia: 'Sigue dando datos mientras pueda y se apagará sola, sin molestar a nadie.', vidaReal: 'LRO sigue funcionando más de 15 años después de su lanzamiento.', protege: false },
    choque: { id: 'choque', texto: 'La órbita se acabó: la sonda cae', consecuencia: 'Sin altura ni combustible, la sonda choca con la Luna sin control.', vidaReal: 'Las órbitas bajas de la Luna son inestables por los mascones: sin correcciones, una nave acaba cayendo.', protege: false, forzado: true },
    silencio: { id: 'silencio', texto: 'La sonda dejó de responder', consecuencia: 'La electrónica no resistió: la sonda queda muda en órbita.', vidaReal: 'Muchas naves terminan así: sin comandos, orbitando en silencio hasta que su órbita decae.', protege: false, forzado: true },
  },
  jupiter: {
    hundir: { id: 'hundir', texto: 'A. Hundirla en Júpiter', consecuencia: 'La sonda se sumerge en la atmósfera y se desintegra: Europa queda protegida de los microbios de la Tierra.', vidaReal: 'La NASA planeó hundir Juno en Júpiter para proteger a Europa, como hizo con Galileo en 2003 y Cassini en Saturno en 2017.', protege: true, desorbito: true },
    orbita: { id: 'orbita', texto: 'B. Dejarla en órbita', consecuencia: 'Más datos, pero algún día podría chocar con Europa y contaminarla con microbios de la Tierra.', vidaReal: 'Por la «protección planetaria», las naves que visitan lugares con posible vida no se dejan a la deriva.', protege: false },
    silencio: { id: 'silencio', texto: 'La sonda dejó de responder', consecuencia: 'La radiación venció a la electrónica: ya no se puede maniobrar y queda en su órbita.', vidaReal: 'Júpiter tiene los cinturones de radiación más intensos del sistema solar; por eso Juno lleva una bóveda de titanio.', protege: false, forzado: true },
  },
};
export const EPILOGOS = {
  lro: {
    impacto_alta: { titulo: 'Un último mapa, un cráter nuevo', texto: 'Tu sonda cuidada terminó con un impacto controlado. El cráter nuevo será estudiado por futuras misiones.' },
    impacto_baja: { titulo: 'Un final a tiempo', texto: 'La sonda llegó al final muy desgastada, pero aún pudiste decidir dónde caería. Es mejor que dejarlo al azar.' },
    orbita_alta: { titulo: 'La guardiana de la Luna', texto: 'Tu sonda sigue orbitando y enviando datos para elegir dónde aterrizarán los astronautas.' },
    orbita_baja: { titulo: 'Se apaga en silencio', texto: 'La sonda quedó en órbita, cansada. Dará algún dato más y después callará para siempre.' },
    choque: { titulo: 'Sin altura', texto: 'La órbita se degradó y la sonda chocó con la Luna sin control. Los mascones no perdonan a quien no corrige.' },
    silencio: { titulo: 'Radio apagada', texto: 'La sonda dejó de responder. Sigue en órbita, muda, como tantas naves de la historia.' },
  },
  juno: {
    hundir_alta: { titulo: 'Un salto limpio a Júpiter', texto: 'Tu sonda cuidada se sumergió en Júpiter. Europa queda protegida y tus datos sirven para la ciencia.' },
    hundir_baja: { titulo: 'Un final prudente', texto: 'Llegó muy dañada, pero la hundiste a tiempo: Europa a salvo de los microbios de la Tierra.' },
    orbita_alta: { titulo: 'La mensajera de las tormentas', texto: 'Sigue en órbita y da más datos, pero queda el riesgo de que algún día choque con Europa.' },
    orbita_baja: { titulo: 'A la deriva', texto: 'Sin cuidados y sin hundirla, la sonda queda a la deriva: un riesgo para Europa y su posible vida.' },
    silencio: { titulo: 'Vencida por la radiación', texto: 'La radiación apagó la sonda. Ya no se puede maniobrar y se queda en órbita, sin protección planetaria.' },
  },
};
const cuidada = s => s.salud >= C.SALUD_CUIDADA && s.modosSeguros <= C.SEGUROS_CUIDADA;
// Final posible según el estado: si algo se agotó, solo queda la opción forzada.
export function finalesDisponibles(s) {
  const f = FINALES[s.destino];
  if (s.salud <= 0) return [f.silencio];
  if (s.destino === 'luna' && s.altitud <= 0) return [f.choque];
  return s.destino === 'luna' ? [f.impacto, f.orbita] : [f.hundir, f.orbita];
}
export function epilogoDe(s, final) {
  const m = s.misionId, forzado = final === 'choque' || final === 'silencio';
  const clave = forzado ? final : `${final === 'impacto' ? 'impacto' : final === 'hundir' ? 'hundir' : 'orbita'}_${cuidada(s) ? 'alta' : 'baja'}`;
  const e = EPILOGOS[m][clave] || EPILOGOS[m][Object.keys(EPILOGOS[m])[0]];
  const f = FINALES[s.destino][final];
  const proteccion = f.protege
    ? t('e08.epilogo.protege')
    : (s.destino === 'jupiter' ? t('e08.epilogo.noProtege') : '');
  const aniosTxt = s.ano === 1 ? t('e08.epilogo.ano', { n: s.ano }) : t('e08.epilogo.anos', { n: s.ano });
  const datosTxt = t('e08.epilogo.datos', { n: Math.round(s.datos) });
  const detalle = `${aniosTxt} · ${datosTxt}.${proteccion ? ' ' + proteccion : ''}`.trim();
  const titulo = t(`e08.epilogo.${m}.${clave}.titulo`, null, e.titulo);
  const texto = t(`e08.epilogo.${m}.${clave}.texto`, null, e.texto);
  return { id: clave, titulo, texto, detalle };
}

// ---------- Estado ----------
// La dificultad (B11) ajusta la duración de cada año simulado y la frecuencia de los eventos.
export function crearExtendida(estado, mision, diseno, piezas, { semilla } = {}) {
  const sem = semilla ?? Math.floor(Math.random() * 2 ** 31), id = mision?.id === 'juno' ? 'juno' : 'lro', destino = destinoDe(mision);
  const aj = ajusteMinijuego(mision), anoDur = C.ANO_S * aj.tiempo;
  const porId = x => piezas.find(p => p.id === x);
  const energia = porId(diseno?.energia), antena = porId(diseno?.antena), blind = porId(diseno?.blindaje);
  const instrumentos = (diseno?.instrumentos || []).map(porId).filter(p => p && p.potencia_w > 0).slice(0, 9)
    .map(p => ({ id: p.id, nombre: p.nombre, w: p.potencia_w, datos: p.datos_mbit_dia || 0, tasa: tasaDatos(p.datos_mbit_dia) }));
  const rtg = !!energia?.genera_w_fijo;
  const genBase = rtg ? energia.genera_w_fijo : generacionW(energia, mision?.destino?.distancia_ua || 1, mision?.degradacion_paneles ?? 1) * C.ESCALA_SOLAR[id];
  const max = estado?.bateriaMax || mision?.bateria_wh || 2000;
  // La órbita elegida en el hangar fija los años de misión y cuánta radiación llega (sin órbita = la real, igual que antes).
  const ef = efectosOrbita(mision, diseno);
  const tope = ef.vida_anos == null ? C.ANOS[id] : Math.max(1, Math.min(C.ANOS_MAX[id], Math.round(ef.vida_anos)));
  const tasaMax = instrumentos.reduce((a, i) => a + i.tasa, 0);
  const n = {
    fase: 'ficha', faseAntes: null, misionId: id, destino, semilla: sem, rs: (sem * 7919 + (id === 'juno' ? 2027 : 1969)) >>> 0,
    t: 0, ano: 1, tope, anoS: anoDur, velMult: aj.velocidad, tFin: tope * anoDur, desgaste: 0, multDesgaste: 1,
    instrumentos, encendidos: instrumentos.map(i => i.id), retirados: [],
    rtg, genBase, blindaje: blind?.blindaje || 0, radMult: ef.radiacion, antenaW: antena?.potencia_w || 0, busW: mision?.bus?.consumo_w ?? 150, calW: C.CALENTADOR_W[id],
    calentadores: false, orientacion: 'sol', tGiro: 0, tSeguro: 0, modosSeguros: 0,
    bateriaMax: max, bateria: acotar(estado?.bateria ?? max, max * C.BATERIA_INICIAL_MIN, max), temperatura: C.TEMP_INICIAL, tFuera: 0,
    salud: 100, combustibleMax: 0, combustible: 0, altitud: destino === 'luna' ? C.ALTITUD_INICIAL_KM : null,
    datos: 0, datosTramo: 0, datosRef: Math.round(tasaMax * tope * anoDur * C.REF_FRACCION), multDatos: 1,
    eclipse: 0, eclipseTotal: C.ECLIPSE_S, pico: null, aviso: null, evSeq: 0, eventos: [], proxEvento: 0, tAgotada: null,
    mazo: construirMazo(mision), cartaIdx: 0, cartaAno: 0, carta: null, banderas: {}, coincidenciasReales: 0, registro: [], opcionesFinal: null, final: null, epilogo: null,
  };
  n.combustibleMax = n.combustible = acotar(estado?.dvRestante ?? C.COMBUSTIBLE_MIN, C.COMBUSTIBLE_MIN, C.COMBUSTIBLE_MAX);
  n.proxEvento = (C.EVENTO_MIN_S + sorteo(n) * (C.EVENTO_MAX_S - C.EVENTO_MIN_S)) / n.velMult;
  return n;
}

// ---------- Medidas derivadas ----------
export const enSeguro = s => s.tSeguro > 0;
export const enUltimos = s => s.fase === 'jugando' && s.t >= s.tFin - C.ULTIMOS_S;
export const orientacionEfectiva = s => (enSeguro(s) ? 'sol' : s.orientacion);
export const generacionExt = s => {
  if (s.rtg) return s.genBase * (1 - C.DEGRADACION_RTG) ** s.desgaste;
  if (s.eclipse > 0) return 0;
  return s.genBase * (1 - C.DEGRADACION_PANEL) ** s.desgaste * (orientacionEfectiva(s) === 'sol' ? 1 : C.ORIENTACION_CIENCIA_GEN);
};
export const instrumentosActivos = s => (enSeguro(s) ? [] : s.instrumentos.filter(i => s.encendidos.includes(i.id) && !s.retirados.includes(i.id)));
export const consumoExt = s => {
  const base = s.busW + s.antenaW + instrumentosActivos(s).reduce((a, i) => a + i.w, 0) + (s.calentadores && !enSeguro(s) ? s.calW : 0);
  return base * (enUltimos(s) ? C.ULTIMOS_CONSUMO : 1);
};
export const balanceExt = s => generacionExt(s) - consumoExt(s);
export const tasaDatosExt = s => {
  if (enSeguro(s)) return 0;
  const suma = instrumentosActivos(s).reduce((a, i) => a + i.tasa, 0);
  const orient = orientacionEfectiva(s) === 'sol' ? C.ORIENTACION_SOL_DATOS : 1;
  return suma * orient * (s.salud < C.SALUD_BAJA ? C.FACTOR_SALUD_BAJA : 1) * (enUltimos(s) ? C.ULTIMOS_DATOS : 1) * s.multDatos;
};
export const temperaturaObjetivo = s => {
  const id = s.misionId, frac = s.instrumentos.length ? instrumentosActivos(s).length / s.instrumentos.length : 0;
  return C.TEMP_AMBIENTE[id] + (orientacionEfectiva(s) === 'sol' ? C.TEMP_SOL : C.TEMP_CIENCIA) + C.TEMP_INSTRUMENTOS[id] * frac
    + (s.calentadores && !enSeguro(s) ? C.TEMP_CALENTADOR : 0) + (s.rtg ? C.TEMP_RTG : 0) + (s.eclipse > 0 ? C.TEMP_ECLIPSE : 0);
};
export const temperaturaOk = s => s.temperatura >= C.TEMP_MIN && s.temperatura <= C.TEMP_MAX;
const anoS = n => n.anoS || C.ANO_S;
const fijarFin = n => { n.tFin = n.tAgotada != null ? Math.min(n.tope * anoS(n), n.tAgotada + C.ULTIMOS_S) : n.tope * anoS(n); };
const anotar = (n, texto, tipo = 'info') => { n.registro = [...n.registro, { texto, tipo }]; };

// ---------- Efectos de las cartas ----------
function aplicarEfectos(n, ef = {}) {
  const b = n.blindaje;
  if (ef.datos) n.datos += ef.datos;
  if (ef.salud) n.salud = acotar(n.salud + ef.salud, 0, 100);
  if (ef.radiacion) n.salud = acotar(n.salud - ef.radiacion * (1 - b), 0, 100);
  if (ef.bateriaPct) n.bateria = acotar(n.bateria + ef.bateriaPct * n.bateriaMax, 0, n.bateriaMax);
  if (ef.combustible) n.combustible = acotar(n.combustible + ef.combustible, 0, n.combustibleMax);
  if (ef.altitud && n.altitud != null) n.altitud = acotar(n.altitud + ef.altitud, 1, C.ALTITUD_MAX_KM);
  if (ef.tope) n.tope = Math.min(C.ANOS_MAX[n.misionId], n.tope + ef.tope);
  if (ef.terminarAntes) n.tope = Math.max(n.ano, 1);
  if (ef.multDatos) n.multDatos *= ef.multDatos;
  if (ef.multDesgaste) n.multDesgaste *= ef.multDesgaste;
  if (ef.modoSeguro) entrarSeguro(n);
  if (ef.retirarInstrumento) {
    const vivos = n.instrumentos.filter(i => !n.retirados.includes(i.id));
    if (vivos.length > 1) { const peor = vivos.reduce((a, i) => (i.datos < a.datos ? i : a)); n.retirados = [...n.retirados, peor.id]; n.encendidos = n.encendidos.filter(x => x !== peor.id); }
  }
  if (ef.banderas) n.banderas = { ...n.banderas, ...ef.banderas };
  fijarFin(n);
}
function entrarSeguro(n) {
  n.tSeguro = C.SEGURO_S; n.modosSeguros += 1; n.datos = Math.max(0, n.datos - n.datosTramo); n.datosTramo = 0;
  n.encendidos = []; n.calentadores = false; n.bateria = Math.max(n.bateria, n.bateriaMax * C.SEGURO_BATERIA); n.salud = Math.max(0, n.salud - C.SEGURO_SALUD);
  n.aviso = { id: ++n.evSeq, tipo: 'seguro', texto: t('e08.evento.seguro') };
  n.eventos = [...n.eventos.slice(-19), { id: n.evSeq, tipo: 'seguro', t: n.t }];
}

// ---------- Eventos aleatorios ----------
function lanzarEvento(n) {
  const tipos = n.destino === 'luna' ? ['eclipse', 'eclipse', 'tormenta', 'micro', 'giro'] : ['eclipse', 'pico', 'pico', 'micro', 'giro'];
  const tipo = tipos[Math.floor(sorteo(n) * tipos.length)], textos = {
    eclipse: t('e08.evento.eclipse'),
    tormenta: t('e08.evento.tormenta', { s: C.PICO_AVISO_S }),
    pico: t('e08.evento.pico', { s: C.PICO_AVISO_S }),
    micro: t('e08.evento.micro'),
    giro: t('e08.evento.giro'),
  };
  if (tipo === 'eclipse') { n.eclipse = C.ECLIPSE_S; n.eclipseTotal = C.ECLIPSE_S; }
  else if (tipo === 'tormenta' || tipo === 'pico') n.pico = { t: C.PICO_AVISO_S, tipo };
  else if (tipo === 'micro') n.salud = Math.max(0, n.salud - C.MICRO_DANO);
  else n.tGiro = C.GIRO_S;
  n.aviso = { id: ++n.evSeq, tipo, texto: textos[tipo] };
  n.eventos = [...n.eventos.slice(-19), { id: n.evSeq, tipo, t: n.t }];
}

// ---------- Paso de tiempo ----------
function avanzar(s, dtCrudo) {
  const dt = acotar(dtCrudo, 0, 0.25), n = { ...s };
  n.t = s.t + dt;
  n.desgaste = s.desgaste + (dt / anoS(s)) * s.multDesgaste;
  if (n.tSeguro > 0) n.tSeguro = Math.max(0, n.tSeguro - dt);
  if (n.tGiro > 0) n.tGiro = Math.max(0, n.tGiro - dt);
  if (n.eclipse > 0) n.eclipse = Math.max(0, n.eclipse - dt);
  // Energía y datos
  const bal = balanceExt(s), tasa = tasaDatosExt(s);
  n.bateria = acotar(s.bateria + bal * dt * C.HORAS_POR_S, 0, s.bateriaMax);
  n.datos = s.datos + tasa * dt; n.datosTramo = s.datosTramo + tasa * dt;
  // Temperatura
  n.temperatura = s.temperatura + (temperaturaObjetivo(s) - s.temperatura) * (1 - Math.exp(-dt / C.TEMP_TAU_S));
  if (temperaturaOk(n)) n.tFuera = 0;
  else {
    n.tFuera = s.tFuera + dt;
    if (n.tFuera >= C.TEMP_TOLERANCIA_S) {
      n.salud = Math.max(0, n.salud - C.TEMP_DANO); n.tFuera = 0;
      n.aviso = { id: ++n.evSeq, tipo: 'temp', texto: t('e08.aviso.temp') };
      n.eventos = [...n.eventos.slice(-19), { id: n.evSeq, tipo: 'temp', t: n.t }];
      anotar(n, t('e08.log.temp', { ano: s.ano, dano: C.TEMP_DANO }), 'mal');
    }
  }
  // Radiación
  n.salud = Math.max(0, n.salud - C.RADIACION_S[s.misionId] * (s.radMult ?? 1) * (1 - s.blindaje) * dt);
  if (s.pico) {
    const tPico = s.pico.t - dt;
    if (tPico > 0) n.pico = { ...s.pico, t: tPico };
    else {
      n.pico = null;
      const apagados = s.instrumentos.length - instrumentosActivos(n).length;
      if (apagados * 2 < s.instrumentos.length) { n.salud = Math.max(0, n.salud - C.PICO_DANO[s.misionId] * (1 - s.blindaje)); n.aviso = { id: ++n.evSeq, tipo: 'daño', texto: t('e08.aviso.dano') }; }
      else n.aviso = { id: ++n.evSeq, tipo: 'ok', texto: t('e08.aviso.ok') };
      n.eventos = [...n.eventos.slice(-19), { id: n.evSeq, tipo: n.aviso.tipo, t: n.t }];
    }
  }
  // Órbita lunar: se degrada por los mascones
  if (s.altitud != null) n.altitud = Math.max(0, s.altitud - C.DECAIMIENTO_KM_S * (1 + C.MASCONES * Math.sin(n.t * 0.9)) * dt);
  // Modo seguro por batería
  if (n.bateria <= 0 && n.tSeguro <= 0) { entrarSeguro(n); anotar(n, t('e08.log.seguro', { ano: s.ano }), 'mal'); }
  // Eventos
  if (n.t >= s.proxEvento && n.t < s.tFin - 1) { lanzarEvento(n); n.proxEvento = n.t + (C.EVENTO_MIN_S + sorteo(n) * (C.EVENTO_MAX_S - C.EVENTO_MIN_S)) / (s.velMult || 1); }
  n.ano = Math.min(n.tope, Math.floor(n.t / anoS(s)) + 1);
  if (n.ano !== s.ano) n.datosTramo = 0;
  // Si la sonda está por agotarse, se adelanta el cierre («los últimos datos»)
  if (n.tAgotada == null && (n.salud <= C.SALUD_AGOTADA || (n.altitud != null && n.altitud <= C.ALTITUD_CRITICA_KM && n.combustible < C.CORRECCION_DV))) { n.tAgotada = n.t; fijarFin(n); }
  // ¿Fin o carta?
  if (n.salud <= 0 || (n.altitud != null && n.altitud <= 0) || n.t >= n.tFin) return abrirFinal(n);
  const tAno = n.t - (n.ano - 1) * anoS(s);
  if (n.cartaIdx < n.mazo.length && n.cartaAno < n.ano && n.ano < n.tope && tAno >= C.CARTA_EN_S && !enUltimos(n)) {
    n.cartaAno = n.ano; n.fase = 'carta'; n.carta = { idx: n.cartaIdx, final: false, elegida: null, resultado: null };
  }
  return n;
}
function abrirFinal(n) {
  n.fase = 'carta'; n.opcionesFinal = finalesDisponibles(n).map(f => f.id); n.carta = { idx: -1, final: true, elegida: null, resultado: null };
  n.ano = Math.min(n.tope, Math.max(1, Math.ceil(n.t / C.ANO_S)));
  return n;
}

// ---------- Máquina de acciones ----------
// Acciones: empezar, tiempo{dt}, pausar, reanudar, instrumento{id}, calentadores, orientacion, corregir, elegir{i}, continuar.
export function pasoExtendida(s, a) {
  const jugando = s.fase === 'jugando';
  switch (a.tipo) {
    case 'empezar': return s.fase === 'ficha' ? { ...s, fase: 'jugando' } : s;
    case 'pausar': return jugando ? { ...s, fase: 'pausa' } : s;
    case 'reanudar': return s.fase === 'pausa' ? { ...s, fase: 'jugando' } : s;
    case 'tiempo': return jugando ? avanzar(s, a.dt) : s;
    case 'instrumento': {
      if (!jugando || enSeguro(s) || s.retirados.includes(a.id) || !s.instrumentos.some(i => i.id === a.id)) return s;
      return { ...s, encendidos: s.encendidos.includes(a.id) ? s.encendidos.filter(x => x !== a.id) : [...s.encendidos, a.id] };
    }
    case 'calentadores': return jugando && !enSeguro(s) ? { ...s, calentadores: !s.calentadores } : s;
    case 'orientacion': return jugando && !enSeguro(s) && s.tGiro <= 0 ? { ...s, orientacion: s.orientacion === 'sol' ? 'ciencia' : 'sol' } : s;
    case 'corregir': {
      if (!jugando || s.altitud == null || s.combustible < C.CORRECCION_DV) return s;
      return { ...s, combustible: s.combustible - C.CORRECCION_DV, altitud: Math.min(C.ALTITUD_MAX_KM, s.altitud + C.CORRECCION_KM) };
    }
    case 'elegir': return s.fase === 'carta' && s.carta && s.carta.elegida == null ? elegir(s, a.i) : s;
    case 'continuar': return s.fase === 'carta' && s.carta && s.carta.elegida != null && !s.carta.final ? { ...s, fase: 'jugando', carta: null, cartaIdx: s.cartaIdx + 1 } : s;
    default: return s;
  }
}
function elegir(s, i) {
  const n = { ...s };
  if (s.carta.final) {
    const f = FINALES[s.destino][s.opcionesFinal[i]];
    if (!f) return s;
    n.final = f.id; n.epilogo = epilogoDe(s, f.id); n.fase = 'cierre'; n.carta = { ...s.carta, elegida: i };
    if (f.desorbito) n.banderas = { ...n.banderas, desorbito: true };
    if (f.protege) n.banderas = { ...n.banderas, protegioPlaneta: true };
    const fTexto = t(`e08.final.${f.id}.titulo`, null, f.texto.replace(/^[AB]\. /, ''));
    const fConsecuencia = t(`e08.final.${f.id}.consecuencia`, null, f.consecuencia);
    const fVidaReal = t(`e08.final.${f.id}.vidaReal`, null, f.vidaReal);
    anotar(n, t('e08.log.final', { texto: fTexto, consecuencia: fConsecuencia, vidaReal: fVidaReal }), f.protege ? 'bien' : 'info');
    anotar(n, t('e08.log.epilogo', { titulo: n.epilogo.titulo, texto: n.epilogo.texto }), 'info');
    return n;
  }
  const carta = s.mazo[s.cartaIdx], op = carta?.opciones[i];
  if (!op) return s;
  let efectos = op.efectos, texto = op.consecuencia, tipo = 'info';
  if (op.riesgo != null && op.efectosMal) { // opción arriesgada: se sortea con la semilla
    if (sorteo(n) < op.riesgo) {
      efectos = { ...op.efectosMal, multDatos: undefined, datos: 0 };
      texto = t(`e08.carta.${carta.id}.op.${i}.textoMal`, null, op.textoMal);
      tipo = 'mal';
    } else {
      texto = t(`e08.carta.${carta.id}.op.${i}.textoOk`, null, op.textoOk);
      tipo = 'bien';
    }
  } else {
    texto = t(`e08.carta.${carta.id}.op.${i}.consecuencia`, null, op.consecuencia);
  }
  aplicarEfectos(n, efectos);
  if (op.real) { n.coincidenciasReales += 1; tipo = 'bien'; }
  const cTitulo = t(`e08.carta.${carta.id}.titulo`, null, carta.titulo);
  const opTexto = t(`e08.carta.${carta.id}.op.${i}.texto`, null, op.texto);
  const opVidaReal = t(`e08.carta.${carta.id}.op.${i}.vidaReal`, null, op.vidaReal);
  anotar(n, t('e08.log.carta', { ano: s.ano, titulo: cTitulo, opTexto, texto, vidaReal: opVidaReal }), tipo);
  n.carta = { ...s.carta, elegida: i, resultado: { texto, vidaReal: opVidaReal, real: !!op.real, tipo } };
  if (n.salud <= 0) return abrirFinal(n);
  return n;
}

// ---------- Resultado para la campaña ----------
// Idempotente: si el estado ya tiene `misionExtendida`, no cambia nada. Devuelve el estado nuevo y las banderas para `setExtras`
// como incrementos ({ coincidenciasReales, desorbito }). Nunca pone `perdida`.
export function aplicarExtendida08(estado, s) {
  const nada = { coincidenciasReales: 0, desorbito: false };
  if (!estado || estado.misionExtendida || !s || s.fase !== 'cierre') return { estado, extras: nada };
  const sube = s.datosRef > 0 ? Math.min(C.CIENCIA_MAX, (s.datos / s.datosRef) * C.CIENCIA_MAX) : 0;
  const gastado = Math.max(0, s.combustibleMax - s.combustible);
  return {
    estado: {
      ...estado, ciencia: Math.min(1, (estado.ciencia || 0) + sube), dvRestante: (estado.dvRestante ?? 0) - Math.min(gastado, Math.max(0, estado.dvRestante ?? 0)),
      misionExtendida: { anos: s.ano, datos: Math.round(s.datos), final: s.final, epilogo: s.epilogo?.id || null },
      decisiones: [...(estado.decisiones || []), ...s.registro],
    },
    extras: { coincidenciasReales: s.coincidenciasReales, desorbito: !!s.banderas.desorbito },
  };
}

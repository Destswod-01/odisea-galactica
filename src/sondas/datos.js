import { mezclarTextos } from '../i18n/idioma.js';
// Datos de la familia ASTRION-M compartidos por el visor y por el juego de drones (sin importar three).
export const DATOS_SONDAS = {
  M5: { nombre: 'Exploradora de cuevas', texto: 'Un rover compacto de seis ruedas con trenes laterales extensibles. Su mástil eleva una cámara estéreo y un sensor lidar, mientras dos focos se orientan hacia el frente.', uso: 'Exploración de cuevas y grietas', masa: 'Por definir', autonomia: 'Por definir', piezas: 'Seis ruedas · mástil plegable · cámara estéreo · focos orientables' },
  M8: { nombre: 'Exploradora de hielo', texto: 'Una cápsula alargada con punta térmica desciende desde una estación de superficie. Un carrete mantiene el cable de energía y datos conectado durante la exploración.', uso: 'Exploración bajo el hielo', masa: 'Por definir', autonomia: 'Por definir', piezas: 'Punta térmica · cápsula descendente · carrete · estación de superficie' },

  M1: { nombre: 'Microsonda orbital', texto: 'Un pequeño observatorio autónomo. Estructura modular, alas solares articuladas y antena de telemetría.', uso: 'Mapeo y análisis en órbita', masa: '5–10 kg', autonomia: '1–3 años', piezas: 'Paneles solares · sensores de radiación · magnetómetro' },
  M2: { nombre: 'Sonda de superficie', texto: 'Una plataforma científica de cuatro apoyos. Patas plegables con amortiguadores y cámara elevada sobre el terreno.', uso: 'Análisis de suelo y rocas', masa: '10–25 kg', autonomia: '6+ meses', piezas: 'Tren de aterrizaje · cámara · espectrómetro' },
  M3: { nombre: 'Sonda atmosférica', texto: 'Una cápsula suspendida bajo un paracaídas de dieciséis gajos. Diseñada para explorar durante el descenso.', uso: 'Medición de atmósfera', masa: '15–30 kg', autonomia: '1–2 años', piezas: 'Paracaídas · sensores de temperatura y presión · telemetría' },
  M4: { nombre: 'Sonda saltadora', texto: 'Un núcleo esférico protegido por una jaula. Tres apoyos articulados preparan pequeños saltos sobre mundos de baja gravedad.', uso: 'Exploración de asteroides', masa: 'Por definir', autonomia: 'Por definir', piezas: 'Jaula protectora · apoyos de salto · micropropulsores' },
  M6: { nombre: 'Sonda perforadora', texto: 'Una torre de muestreo con tres patas de anclaje. La broca helicoidal desciende desde el cuerpo para explorar el subsuelo.', uso: 'Muestreo bajo la superficie', masa: 'Por definir', autonomia: 'Por definir', piezas: 'Anclajes plegables · broca extensible · depósito de muestras' },
  M7: { nombre: 'Relé de comunicaciones', texto: 'Un nodo de enlace con núcleo hexagonal. Doce pétalos abren el reflector y dos alas solares alimentan sus instrumentos.', uso: 'Enlace entre nave y sondas', masa: 'Por definir', autonomia: 'Por definir', piezas: 'Reflector articulado · alas solares · receptor de radio' },
};

// Color de interfaz por tipo (chips, glifos del mapa, ícono de respaldo).
export const COLOR_SONDA = { M1: '#38bdf8', M2: '#f59e0b', M3: '#a78bfa', M4: '#34d399', M6: '#fb7185', M7: '#facc15', M5: '#a3e635', M8: '#67e8f9' };
// Nombre corto para chips y etiquetas.
export const NOMBRE_CORTO_SONDA = { M1: 'Orbital', M2: 'Superficie', M3: 'Atmosférica', M4: 'Saltadora', M6: 'Perforadora', M7: 'Relé', M5: 'Cuevas', M8: 'Hielo' };

// Capa en inglés (mezclarTextos: solo cambia los textos; lo que falte se queda en español).
export const DATOS_SONDAS_EN = {
  M5: { nombre: 'Cave explorer', texto: 'A compact six-wheeled rover with extendable side struts. Its mast raises a stereo camera and a lidar sensor, while two lamps aim forward.', uso: 'Cave and crevice exploration', masa: 'To be defined', autonomia: 'To be defined', piezas: 'Six wheels · folding mast · stereo camera · aimable lamps' },
  M8: { nombre: 'Ice explorer', texto: 'An elongated capsule with a thermal tip descends from a surface station. A spool keeps the power and data cable connected during the dive.', uso: 'Exploration beneath the ice', masa: 'To be defined', autonomia: 'To be defined', piezas: 'Thermal tip · descent capsule · spool · surface station' },
  M1: { nombre: 'Orbital microprobe', texto: 'A small autonomous observatory. Modular structure, hinged solar wings and a telemetry antenna.', uso: 'Mapping and analysis in orbit', masa: '5–10 kg', autonomia: '1–3 years', piezas: 'Solar panels · radiation sensors · magnetometer' },
  M2: { nombre: 'Surface probe', texto: 'A scientific platform with four footpads. Folding legs with shock absorbers and a camera raised above the terrain.', uso: 'Soil and rock analysis', masa: '10–25 kg', autonomia: '6+ months', piezas: 'Landing gear · camera · spectrometer' },
  M3: { nombre: 'Atmospheric probe', texto: 'A capsule hanging under a sixteen-gore parachute. Designed to explore during the descent.', uso: 'Atmosphere measurement', masa: '15–30 kg', autonomia: '1–2 years', piezas: 'Parachute · temperature and pressure sensors · telemetry' },
  M4: { nombre: 'Hopper probe', texto: 'A spherical core protected by a cage. Three articulated feet prepare short hops across low-gravity worlds.', uso: 'Asteroid exploration', masa: 'To be defined', autonomia: 'To be defined', piezas: 'Protective cage · hopping feet · micro-thrusters' },
  M6: { nombre: 'Drilling probe', texto: 'A sampling tower with three anchor legs. The helical drill descends from the body to explore the subsurface.', uso: 'Sampling below the surface', masa: 'To be defined', autonomia: 'To be defined', piezas: 'Folding anchors · extendable drill · sample tank' },
  M7: { nombre: 'Communications relay', texto: 'A link node with a hexagonal core. Twelve petals open the reflector and two solar wings power its instruments.', uso: 'Link between ship and probes', masa: 'To be defined', autonomia: 'To be defined', piezas: 'Articulated reflector · solar wings · radio receiver' },
};
export const NOMBRE_CORTO_SONDA_EN = { M1: 'Orbital', M2: 'Surface', M3: 'Atmospheric', M4: 'Hopper', M6: 'Driller', M7: 'Relay', M5: 'Caves', M8: 'Ice' };
/** Datos de una sonda en el idioma pedido ('es' = original). */
export const datosSonda = (tipo, idioma = 'es') => idioma === 'es' ? DATOS_SONDAS[tipo] : mezclarTextos(DATOS_SONDAS[tipo], DATOS_SONDAS_EN[tipo]);
export const nombreCortoSonda = (tipo, idioma = 'es') => (idioma === 'es' ? NOMBRE_CORTO_SONDA : NOMBRE_CORTO_SONDA_EN)[tipo] || NOMBRE_CORTO_SONDA[tipo];

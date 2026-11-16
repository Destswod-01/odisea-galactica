import { t } from '../i18n/idioma.js';
// Catálogo de partes del dron y estadísticas derivadas (ver docs/PROPUESTA_DRONES_HANGAR.md).
// La etapa 05 solo LEE estadísticas: cuando exista el diseñador del hangar, se conecta sin tocar la etapa.

// Estructura común del dron (marco, computadora): se suma a la masa y al costo de las partes.
export const CHASIS_DRON = { masa_kg: 3, costo_musd: .5, potencia_w: .1 };
// Catálogo por ranura. Los campos de efecto son opcionales: lo que no aparece usa el valor base.
//  propulsion: velMax (m/s), aceleracion (m/s²), empujeVertical (m/s de ascenso/descenso máx.), atmosfera (requiere aire)
//  energia: bateria_s (segundos de vuelo) · camara: fovBase (°), zoomMax, sensibilidad (movido), termica
//  luz: foco, radioFoco (m) · navegacion: mantieneAltura (evita choques) · proteccion: blindaje · enlace: alcance_m
export const PARTES_DRON = {
  propulsion: [
    { id: 'gasfrio', nombre: 'Gas frío (N₂)', masa_kg: 3, costo_musd: .3, potencia_w: .2, velMax: 9, aceleracion: 4, empujeVertical: 4, descripcion: 'Suave y confiable, con poca reserva de gas.' },
    { id: 'hidracina', nombre: 'Monopropelente (hidracina)', masa_kg: 4.5, costo_musd: .6, potencia_w: .3, velMax: 12, aceleracion: 6, empujeVertical: 5, descripcion: 'Más rápido y ágil, pero más pesado.' },
    { id: 'rotores', nombre: 'Rotores', masa_kg: 2.5, costo_musd: .4, potencia_w: 3, velMax: 10, aceleracion: 5, empujeVertical: 4, atmosfera: true, descripcion: 'Livianos, pero sin aire las hélices no empujan: solo sirven en Marte o Titán.' }
  ],
  energia: [
    { id: 'bateria', nombre: 'Batería Li-ion', masa_kg: 3, costo_musd: .3, potencia_w: 0, bateria_s: 120, descripcion: 'Dos minutos de vuelo.' },
    { id: 'panel', nombre: 'Batería + panel solar', masa_kg: 3.8, costo_musd: .6, potencia_w: 0, bateria_s: 130, descripcion: 'Recarga entre intentos; en Ío el panel rinde 1/27.' },
    { id: 'rtg', nombre: 'Mini-RTG', masa_kg: 5.5, costo_musd: 1.5, potencia_w: 0, bateria_s: 150, descripcion: 'No depende del Sol; pesado y caro.' }
  ],
  camara: [
    { id: 'granangular', nombre: 'Gran angular', masa_kg: 1.5, costo_musd: .2, potencia_w: .3, fovBase: 60, zoomMax: 4, sensibilidad: 1, descripcion: 'Se encuentra fácil el objetivo, con poco detalle.' },
    { id: 'tele', nombre: 'Teleobjetivo', masa_kg: 2.2, costo_musd: .4, potencia_w: .4, fovBase: 40, zoomMax: 6, sensibilidad: 1.6, descripcion: 'Mucho zoom, pero la foto sale movida con más facilidad.' },
    { id: 'termica', nombre: 'Multiespectral / térmica', masa_kg: 2.8, costo_musd: .8, potencia_w: .6, fovBase: 55, zoomMax: 4, sensibilidad: 1, termica: true, descripcion: 'Ve la lava de Ío y el calor en las sombras.' }
  ],
  luz: [
    { id: 'ninguna', nombre: 'Sin luz', masa_kg: 0, costo_musd: 0, potencia_w: 0, descripcion: 'Un objetivo en sombra queda a oscuras.' },
    { id: 'foco', nombre: 'Foco LED', masa_kg: .4, costo_musd: .1, potencia_w: 8, foco: true, radioFoco: 25, descripcion: 'Ilumina a menos de 25 m y gasta batería.' }
  ],
  navegacion: [
    { id: 'imu', nombre: 'IMU básica', masa_kg: .5, costo_musd: .1, potencia_w: .2, descripcion: 'Deriva con el tiempo; hay que cuidar la altura.' },
    { id: 'camnav', nombre: 'Cámara de navegación', masa_kg: .8, costo_musd: .3, potencia_w: .5, descripcion: 'Mantiene la posición, como Ingenuity.' },
    { id: 'lidar', nombre: 'LIDAR', masa_kg: 1.2, costo_musd: .6, potencia_w: 1.5, mantieneAltura: true, descripcion: 'Mantiene la altura y evita choques contra el suelo.' }
  ],
  proteccion: [
    { id: 'ninguna', nombre: 'Sin protección', masa_kg: 0, costo_musd: 0, potencia_w: 0, descripcion: 'La electrónica queda expuesta.' },
    { id: 'calentadores', nombre: 'Calentadores', masa_kg: .5, costo_musd: .1, potencia_w: 2, descripcion: 'Sobreviven a la noche lunar.' },
    { id: 'blindaje', nombre: 'Blindaje contra radiación', masa_kg: 1.5, costo_musd: .4, potencia_w: 0, blindaje: true, descripcion: 'En Ío la batería ya no se gasta un 30 % más rápido.' }
  ],
  enlace: [
    { id: 'directo', nombre: 'Radio directa', masa_kg: 1, costo_musd: .1, potencia_w: .5, alcance_m: 250, descripcion: 'Se pierde detrás de una loma.' },
    { id: 'rele', nombre: 'Relé (M7)', masa_kg: 1.8, costo_musd: .4, potencia_w: .8, alcance_m: 600, descripcion: 'Llega más lejos y rodea las lomas.' }
  ]
};
// Diseño por defecto: lo que lleva el dron mientras no exista el diseñador.
export const DRON_BASE = { propulsion: 'gasfrio', energia: 'bateria', camara: 'granangular', luz: 'ninguna', navegacion: 'imu', proteccion: 'ninguna', enlace: 'directo' };
// Opción elegida de una ranura (si el id no existe, cae a la del diseño base).
export const parteDron = (ranura, id) => PARTES_DRON[ranura].find(p => p.id === id) || PARTES_DRON[ranura].find(p => p.id === DRON_BASE[ranura]);
const SIN_AIRE = ['luna', 'io'];
// Estadísticas de vuelo y cámara del dron en un destino ('luna' | 'io'). Sin destino no se evalúa el aire ni la radiación.
//  velMax m/s horizontal · aceleracion m/s² · empujeVertical m/s máx. de subida/bajada · bateria_s s de vuelo · fovBase ° ·
//  sensibilidad: multiplicador del movido · factorRadiacion: multiplicador del gasto de batería · masa_kg/costo_musd: dron completo.
export function estadisticasDron(disenoDron = DRON_BASE, destino) {
  const p = Object.fromEntries(Object.keys(PARTES_DRON).map(r => [r, parteDron(r, { ...DRON_BASE, ...disenoDron }[r])]));
  const sinAire = SIN_AIRE.includes(destino), puedeVolar = !(p.propulsion.atmosfera && sinAire);
  const suma = k => CHASIS_DRON[k] + Object.values(p).reduce((a, x) => a + (x[k] || 0), 0);
  return {
    velMax: p.propulsion.velMax, aceleracion: p.propulsion.aceleracion, empujeVertical: p.propulsion.empujeVertical,
    bateria_s: Math.round(p.energia.bateria_s * (p.luz.foco ? .9 : 1)),
    fovBase: p.camara.fovBase, zoomMax: p.camara.zoomMax, sensibilidad: p.camara.sensibilidad, termica: !!p.camara.termica,
    foco: !!p.luz.foco, radioFoco: p.luz.radioFoco || 0, mantieneAltura: !!p.navegacion.mantieneAltura,
    factorRadiacion: destino === 'io' && !p.proteccion.blindaje ? 1.3 : 1,
    puedeVolar, motivoNoVuela: puedeVolar ? null : t('e04.dronDiseno.rotors_need_air_to_produce_thrust', { v0: destino === 'io' ? t('e04.dronDiseno.io') : t('e04.dronDiseno.the_moon') }),
    masa_kg: +suma('masa_kg').toFixed(2), costo_musd: +suma('costo_musd').toFixed(2), potencia_w: +suma('potencia_w').toFixed(2)
  };
}

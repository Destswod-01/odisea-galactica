import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import piezas from '../datos/piezas.json';
import cohetes from '../datos/cohetes.json';
import lro from '../datos/misiones/lro.json';
import { disenoReal, resumenNave } from '../motor/nave.js';
import { PROGRESO_INICIAL } from '../estado/progreso.js';
import es from '../i18n/es/sistemas.js';
import en from '../i18n/en/sistemas.js';
import Sistemas from './Sistemas.jsx';

const pintar = (diseno, modo = 'enLinea') => renderToString(
  <Sistemas modo={modo} piezas={piezas} setDiseno={() => {}} progreso={PROGRESO_INICIAL} resumen={resumenNave(diseno, piezas, cohetes, lro)} />,
);

describe('panel de sistemas', () => {
  it('muestra las 3 categorías con sus 6 opciones, también con un diseño viejo', () => {
    const html = pintar(disenoReal(lro, piezas));
    for (const id of ['bateria_basica', 'bateria_avanzada', 'computadora_estandar', 'computadora_rad_hard', 'orientacion_basica', 'orientacion_precision']) {
      expect(html).toContain(piezas.find((p) => p.id === id).nombre.replace(/&/g, '&amp;'));
    }
    expect(html).toContain('Batería');
  });
  it('en intermedio con los sistemas sin elegir marca «pendiente» y no se rompe', () => {
    const html = pintar({ ...disenoReal(lro, piezas), bateria: null, computadora: null, orientacion: null }, 'panel');
    expect(html).toContain('Pendiente de elegir');
    expect(html).toContain('role="dialog"');
  });
  it('las claves en español y en inglés son idénticas y empiezan con sistemas.', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    expect(Object.keys(es).every((k) => k.startsWith('sistemas.'))).toBe(true);
  });
});

import { expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Menu } from './Inicio.jsx';
import lro from '../datos/misiones/lro.json';
import { PROGRESO_INICIAL } from '../estado/progreso.js';
vi.mock('../tres/webgl.js', () => ({ soportaWebGL: () => false }));
it('una sala activa permite abrir el panel desde el botón principal y no muestra un checkpoint individual antiguo', () => {
  const html = renderToString(<Menu progreso={PROGRESO_INICIAL} misiones={{ lro }} red={{ sala: { jugadores: [{nombre:'Ana'}, {nombre:'Beto'}] } }} partidaGuardada={{misionId:'juno', fase:'hangar'}} alContinuar={() => {}} />);
  expect(html).toMatch(/class="mp-jugar"(?! disabled)/);
  expect(html).toContain('Volver a la sala');
  expect(html).not.toContain('mp-continuar');
});

it('las actividades de Tierra solo aparecen tras LRO y no se juegan dentro de una sala', () => {
 const pintar = (progreso,red=null) => renderToString(<Menu progreso={progreso} misiones={{lro}} red={red} alTierra={() => {}} />);
 expect(pintar(PROGRESO_INICIAL)).not.toContain('mp-tierra');
 const p={...PROGRESO_INICIAL,completadas:['lro']};
 expect(pintar(p)).toMatch(/class="mp-tierra"(?! disabled)/);
 expect(pintar(p,{sala:{jugadores:[]}})).toContain('class="mp-tierra" disabled');
});

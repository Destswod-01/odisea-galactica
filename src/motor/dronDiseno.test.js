import { describe, it, expect } from 'vitest';
import { PARTES_DRON, DRON_BASE, estadisticasDron, parteDron } from './dronDiseno.js';

describe('diseño del dron', () => {
  it('el diseño base usa una opción existente de cada ranura y da las estadísticas base', () => {
    for (const [r, id] of Object.entries(DRON_BASE)) expect(PARTES_DRON[r].some(p => p.id === id)).toBe(true);
    for (const op of Object.values(PARTES_DRON).flat()) for (const k of ['id', 'nombre', 'masa_kg', 'costo_musd', 'potencia_w', 'descripcion']) expect(op[k]).toBeDefined();
    const e = estadisticasDron(undefined, 'luna');
    expect(e).toMatchObject({ velMax: 9, aceleracion: 4, bateria_s: 120, fovBase: 60, zoomMax: 4, sensibilidad: 1, foco: false, mantieneAltura: false, factorRadiacion: 1, puedeVolar: true, motivoNoVuela: null });
    expect(e.masa_kg).toBeCloseTo(12); expect(e.costo_musd).toBeGreaterThan(0);
  });
  it('los rotores no vuelan sin atmósfera (Luna e Ío) y explican por qué', () => {
    for (const d of ['luna', 'io']) { const e = estadisticasDron({ ...DRON_BASE, propulsion: 'rotores' }, d); expect(e.puedeVolar).toBe(false); expect(e.motivoNoVuela).toMatch(/aire|atm/i); }
    expect(estadisticasDron({ ...DRON_BASE, propulsion: 'rotores' }).puedeVolar).toBe(true);
  });
  it('la radiación de Ío cuesta 1,3 sin blindaje y 1 con blindaje; en la Luna siempre 1', () => {
    expect(estadisticasDron(DRON_BASE, 'io').factorRadiacion).toBe(1.3);
    expect(estadisticasDron({ ...DRON_BASE, proteccion: 'blindaje' }, 'io').factorRadiacion).toBe(1);
    expect(estadisticasDron(DRON_BASE, 'luna').factorRadiacion).toBe(1);
  });
  it('las partes cambian las estadísticas: hidracina, tele, foco, LIDAR y RTG', () => {
    const b = estadisticasDron(DRON_BASE, 'luna'), h = estadisticasDron({ ...DRON_BASE, propulsion: 'hidracina' }, 'luna');
    expect(h.velMax).toBeGreaterThan(b.velMax); expect(h.masa_kg).toBeGreaterThan(b.masa_kg);
    const t = estadisticasDron({ ...DRON_BASE, camara: 'tele' }, 'luna'); expect(t.zoomMax).toBe(6); expect(t.sensibilidad).toBeGreaterThan(1);
    const f = estadisticasDron({ ...DRON_BASE, luz: 'foco' }, 'luna'); expect(f.foco).toBe(true); expect(f.radioFoco).toBe(25); expect(f.bateria_s).toBeLessThan(b.bateria_s);
    expect(estadisticasDron({ ...DRON_BASE, navegacion: 'lidar' }, 'luna').mantieneAltura).toBe(true);
    expect(estadisticasDron({ ...DRON_BASE, energia: 'rtg' }, 'luna').bateria_s).toBeGreaterThan(b.bateria_s);
  });
  it('un diseño parcial o con ids desconocidos cae al diseño base', () => {
    expect(estadisticasDron({ camara: 'tele' }, 'luna').velMax).toBe(9);
    expect(parteDron('camara', 'noexiste').id).toBe('granangular');
  });
});

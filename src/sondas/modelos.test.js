import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { crearSonda } from './modelos.js';

describe('familia ASTRION', () => {
  for (const tipo of ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']) {
    it(`${tipo} mantiene geometría válida en todo el despliegue`, () => {
      const sonda = crearSonda(tipo);
      try {
        for (const t of [0, .25, .5, .75, 1]) {
          sonda.desplegar(t);
          sonda.objeto.updateMatrixWorld(true);
          const bounds = new Box3().setFromObject(sonda.objeto);
          expect(bounds.isEmpty()).toBe(false);
          expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
          sonda.objeto.traverse(o => {
            if (!o.isMesh) return;
            const positions = o.geometry.attributes.position;
            expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
            if (o.geometry.index) expect(Math.max(...o.geometry.index.array)).toBeLessThan(positions.count);
          });
        }
      } finally { sonda.liberar(); }
    });
  }
  for (const [tipo, nombre, campo, eje] of [
    ['M8', 'capsula_termica_m8', 'position', 'y'],
    ['M8', 'carrete_m8', 'rotation', 'z'],
    ['M8', 'bisagra_hielo_0', 'rotation', 'z'],
    ['M4', 'bisagra_salto_0', 'rotation', 'z'],
    ['M5', 'bisagra_mastil_m5', 'rotation', 'x'],
    ['M5', 'tren_lateral_1', 'position', 'x'],
    ['M5', 'foco_orientable_1', 'rotation', 'y'],
    ['M6', 'carro_taladro', 'position', 'y'],
    ['M7', 'petalo_reflector_0', 'rotation', 'z'],
    ['M7', 'bisagra_rele_1', 'rotation', 'z'],
  ]) {
    it(`${tipo}: ${nombre} se despliega, revierte y limita su recorrido`, () => {
      const sonda = crearSonda(tipo), pieza = sonda.objeto.getObjectByName(nombre);
      try {
        sonda.desplegar(0); const cerrado = pieza[campo][eje];
        sonda.desplegar(1); const abierto = pieza[campo][eje];
        expect(abierto).not.toBe(cerrado);
        sonda.desplegar(.5); expect(pieza[campo][eje]).toBeCloseTo((cerrado + abierto) / 2);
        sonda.desplegar(-1); expect(pieza[campo][eje]).toBe(cerrado);
        sonda.desplegar(2); expect(pieza[campo][eje]).toBe(abierto);
      } finally { sonda.liberar(); }
    });
  }
  it('M8 mantiene el cable conectado a la guía y a la cápsula', () => {
    const sonda = crearSonda('M8');
    try {
      const cable = sonda.objeto.getObjectByName('cable_descenso_m8');
      const capsula = sonda.objeto.getObjectByName('capsula_termica_m8');
      for (const t of [0, .25, .5, .75, 1, .5, 0]) {
        sonda.desplegar(t);
        expect(cable.position.y + cable.scale.y / 2).toBeCloseTo(.62);
        expect(cable.position.y - cable.scale.y / 2).toBeCloseTo(capsula.position.y + .24);
        expect(cable.scale.y).toBeGreaterThan(0);
      }
    } finally { sonda.liberar(); }
  });
  it('rechaza identificadores sin modelo', () => { expect(() => crearSonda('M9')).toThrow('Sonda desconocida'); });
});

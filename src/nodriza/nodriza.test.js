import { describe, expect, it } from 'vitest';
import catalogoNodrizas from '../datos/nodrizas.json';
import datosPaisajes from '../datos/paisajesNasa.json';

describe('Catálogo y especificaciones de Naves Nodrizas (ASTRION-X)', () => {
  it('incluye exactamente 3 modelos de naves nodrizas con geometría 3D y métricas completas', () => {
    expect(catalogoNodrizas.modelos).toHaveLength(3);
    const ids = catalogoNodrizas.modelos.map((m) => m.id);
    expect(ids).toEqual(['astrion_x', 'astrion_v', 'astrion_s']);

    for (const m of catalogoNodrizas.modelos) {
      expect(m.especificaciones.diametro_m).toBeGreaterThan(0);
      expect(m.especificaciones.altura_m).toBeGreaterThan(0);
      expect(m.especificaciones.masa_kg).toBeGreaterThan(0);
      expect(m.especificaciones.carga_util_kg).toBeGreaterThan(0);
      expect(m.configuracion_3d.numPaneles).toBeGreaterThanOrEqual(4);
      expect(m.metricas.bahia_slots).toBeGreaterThan(0);
    }
  });

  it('conserva las especificaciones exactas del póster oficial para ASTRION-X', () => {
    const astrionX = catalogoNodrizas.modelos.find((m) => m.id === 'astrion_x');
    expect(astrionX.especificaciones).toMatchObject({
      diametro: '18 m',
      altura: '3.5 m',
      masa_total: '2,500 kg',
      carga_util: '400 kg',
      autonomia: '10+ años',
      propulsion: 'Iónica + Química',
      energia: 'Solar + RTG + Baterías',
      alcance: 'Sistema Solar y más',
    });
  });

  it('incluye las 6 tecnologías clave, 5 sistemas principales, 5 pasos de misión y 4 ventajas clave', () => {
    expect(catalogoNodrizas.tecnologias_clave).toHaveLength(6);
    expect(catalogoNodrizas.sistemas_principales).toHaveLength(5);
    expect(catalogoNodrizas.ciclo_mision).toHaveLength(5);
    expect(catalogoNodrizas.ventajas_clave).toHaveLength(4);
  });

  it('incluye las 5 fases de vuelo, 6 planetas orbitales HD, 6 campos de terreno 3D y 6 escenarios de crucero', () => {
    expect(datosPaisajes.fases_secuencia).toHaveLength(5);
    expect(datosPaisajes.planetas_orbitales).toHaveLength(6);
    expect(datosPaisajes.campos_terreno).toHaveLength(6);
    expect(datosPaisajes.escenarios_crucero).toHaveLength(6);
  });
});

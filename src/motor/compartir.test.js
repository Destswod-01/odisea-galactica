import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  borrarClasificacion,
  CLAVE_CLASIFICACION,
  codificarDiseno,
  decodificarDiseno,
  leerClasificacion,
  MAX_CLASIFICACION,
  registrarResultado,
} from './compartir.js';
import { disenoReal } from './nave.js';
import piezas from '../datos/piezas.json';
import lro from '../datos/misiones/lro.json';
import juno from '../datos/misiones/juno.json';

const crearMemoria = () => {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
};

describe('compartir: codificación y decodificación de diseños', () => {
  it('diseño vacío o mínimo (todos los campos null o array vacío)', () => {
    const disenoVacio = {
      energia: null,
      antena: null,
      blindaje: null,
      propulsion: null,
      cohete: null,
      instrumentos: [],
      bateria: null,
      computadora: null,
      orientacion: null,
    };
    const codigo = codificarDiseno('lro', disenoVacio);
    expect(typeof codigo).toBe('string');
    expect(codigo.length).toBeGreaterThan(0);
    // Base64URL sin +, / ni =
    expect(codigo).not.toMatch(/[+/=]/);

    const decodificado = decodificarDiseno(codigo);
    expect(decodificado).not.toBeNull();
    expect(decodificado.misionId).toBe('lro');
    expect(decodificado.diseno).toEqual(disenoVacio);
  });

  it('diseño completo de LRO con órbita, sistemas y drones', () => {
    const dReal = disenoReal(lro, piezas);
    const disenoCompleto = {
      ...dReal,
      bateria: 'bateria_avanzada',
      computadora: 'computadora_rad_hard',
      orientacion: 'orientacion_precision',
      orbita: 'polar_50',
      drones: 3,
    };

    const codigo = codificarDiseno('lro', disenoCompleto);
    expect(typeof codigo).toBe('string');
    expect(codigo).not.toMatch(/[+/=]/);

    const decodificado = decodificarDiseno(codigo);
    expect(decodificado).not.toBeNull();
    expect(decodificado.misionId).toBe('lro');
    expect(decodificado.diseno).toEqual(disenoCompleto);
  });

  it('diseño completo de Juno con órbita joviana y drones', () => {
    const dReal = disenoReal(juno, piezas);
    const disenoCompleto = {
      ...dReal,
      bateria: 'bateria_basica',
      computadora: 'computadora_estandar',
      orientacion: 'orientacion_basica',
      orbita: 'polar_53d',
      drones: 2,
    };

    const codigo = codificarDiseno('juno', disenoCompleto);
    const decodificado = decodificarDiseno(codigo);
    expect(decodificado).not.toBeNull();
    expect(decodificado.misionId).toBe('juno');
    expect(decodificado.diseno).toEqual(disenoCompleto);
  });

  it('permite drones con cantidad 0 y preserva array de drones si viene como arreglo', () => {
    const dReal = disenoReal(lro, piezas);
    const conCeroDrones = { ...dReal, drones: 0 };
    const codCero = codificarDiseno('lro', conCeroDrones);
    expect(decodificarDiseno(codCero).diseno.drones).toBe(0);

    const conArrayDrones = { ...dReal, drones: ['M1', 'M2'] };
    const codArray = codificarDiseno('lro', conArrayDrones);
    expect(decodificarDiseno(codArray).diseno.drones).toEqual(['M1', 'M2']);
  });

  it('rechaza entradas malformadas, nulas o corruptas sin lanzar errores', () => {
    expect(decodificarDiseno(null)).toBeNull();
    expect(decodificarDiseno(undefined)).toBeNull();
    expect(decodificarDiseno(12345)).toBeNull();
    expect(decodificarDiseno('')).toBeNull();
    expect(decodificarDiseno('   ')).toBeNull();
    expect(decodificarDiseno('token-invalido-!@#$')).toBeNull();
    expect(decodificarDiseno('eyJpbnZhbGlkIjogSlNPTn0')).toBeNull(); // base64 de JSON sin misión ni estructura
    expect(decodificarDiseno('WzEsIDIsIDNd')).toBeNull(); // base64 de [1, 2, 3]
  });

  it('rechaza piezas desconocidas, trucadas o de categoría errónea', () => {
    const dReal = disenoReal(lro, piezas);

    // Misión inventada
    expect(codificarDiseno('marte', dReal)).toBeNull();

    // Pieza de energía inventada
    expect(codificarDiseno('lro', { ...dReal, energia: 'panel_krypton' })).toBeNull();

    // Pieza en categoría equivocada (propulsión en energía)
    expect(codificarDiseno('lro', { ...dReal, energia: 'tanque_chico' })).toBeNull();

    // Cohete inexistente
    expect(codificarDiseno('lro', { ...dReal, cohete: 'saturno_v' })).toBeNull();

    // Instrumento que no pertenece a LRO (JIRAM es de Juno)
    expect(codificarDiseno('lro', { ...dReal, instrumentos: ['jiram'] })).toBeNull();

    // Instrumentos duplicados
    expect(codificarDiseno('lro', { ...dReal, instrumentos: ['lroc', 'lroc'] })).toBeNull();

    // Órbita que no pertenece a la misión (polar_53d es de Juno, no de LRO)
    expect(codificarDiseno('lro', { ...dReal, orbita: 'polar_53d' })).toBeNull();

    // Órbita inexistente
    expect(codificarDiseno('lro', { ...dReal, orbita: 'orbita_solar' })).toBeNull();

    // Drones fuera de rango
    expect(codificarDiseno('lro', { ...dReal, drones: -1 })).toBeNull();
    expect(codificarDiseno('lro', { ...dReal, drones: 10 })).toBeNull();
    expect(codificarDiseno('lro', { ...dReal, drones: 'dos' })).toBeNull();
  });
});

describe('compartir: tabla de clasificación local', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', crearMemoria());
  });

  it('empieza vacía para una misión nueva', () => {
    expect(leerClasificacion('lro')).toEqual([]);
    expect(leerClasificacion('juno')).toEqual([]);
  });

  it('registra y ordena descendentemente por puntaje', () => {
    registrarResultado({ misionId: 'lro', puntaje: 50, nombre: 'Piloto 1' });
    registrarResultado({ misionId: 'lro', puntaje: 95, nombre: 'Piloto 2' });
    registrarResultado({ misionId: 'lro', puntaje: 75, nombre: 'Piloto 3' });

    const top = leerClasificacion('lro');
    expect(top.length).toBe(3);
    expect(top[0].puntaje).toBe(95);
    expect(top[0].nombre).toBe('Piloto 2');
    expect(top[1].puntaje).toBe(75);
    expect(top[2].puntaje).toBe(50);
  });

  it('desempata limpiamente por fecha (más reciente primero)', () => {
    registrarResultado({ misionId: 'lro', puntaje: 80, nombre: 'Antiguo', fecha: 1000 });
    registrarResultado({ misionId: 'lro', puntaje: 80, nombre: 'Nuevo', fecha: 2000 });

    const top = leerClasificacion('lro');
    expect(top[0].nombre).toBe('Nuevo');
    expect(top[1].nombre).toBe('Antiguo');
  });

  it('guarda como máximo 10 registros por misión', () => {
    for (let i = 1; i <= 15; i++) {
      registrarResultado({ misionId: 'lro', puntaje: i * 5, nombre: `Jugador ${i}`, fecha: i });
    }
    const top = leerClasificacion('lro');
    expect(top.length).toBe(MAX_CLASIFICACION);
    expect(top[0].puntaje).toBe(75); // 15 * 5
    expect(top[top.length - 1].puntaje).toBe(30); // 6 * 5
  });

  it('recorta nombres largos a máx. 18 caracteres y usa valor por defecto si está en blanco', () => {
    registrarResultado({ misionId: 'lro', puntaje: 60, nombre: 'Comandante Supremos Del Espacio Infinito' });
    const top1 = leerClasificacion('lro');
    expect(top1[0].nombre.length).toBe(18);
    expect(top1[0].nombre).toBe('Comandante Supremo');

    registrarResultado({ misionId: 'lro', puntaje: 70, nombre: '   ' });
    const top2 = leerClasificacion('lro');
    expect(top2[0].nombre).toBe('Comandante');

    registrarResultado({ misionId: 'lro', puntaje: 80, nombre: null });
    const top3 = leerClasificacion('lro');
    expect(top3[0].nombre).toBe('Comandante');
  });

  it('mantiene clasificaciones separadas por misión y permite borrarlas', () => {
    registrarResultado({ misionId: 'lro', puntaje: 85, nombre: 'Piloto LRO' });
    registrarResultado({ misionId: 'juno', puntaje: 90, nombre: 'Piloto Juno' });

    expect(leerClasificacion('lro').length).toBe(1);
    expect(leerClasificacion('juno').length).toBe(1);
    expect(leerClasificacion('lro')[0].nombre).toBe('Piloto LRO');
    expect(leerClasificacion('juno')[0].nombre).toBe('Piloto Juno');

    borrarClasificacion('lro');
    expect(leerClasificacion('lro')).toEqual([]);
    expect(leerClasificacion('juno').length).toBe(1);
  });

  it('funciona de manera segura si localStorage no existe o arroja error', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => leerClasificacion('lro')).not.toThrow();
    expect(leerClasificacion('lro')).toEqual([]);
    expect(() => registrarResultado({ misionId: 'lro', puntaje: 88, nombre: 'SinStorage' })).not.toThrow();
    expect(() => borrarClasificacion('lro')).not.toThrow();

    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('QuotaExceeded / SecurityError'); },
      setItem: () => { throw new Error('QuotaExceeded / SecurityError'); },
    });
    expect(() => leerClasificacion('lro')).not.toThrow();
    expect(() => registrarResultado({ misionId: 'lro', puntaje: 88, nombre: 'ConError' })).not.toThrow();
  });
});

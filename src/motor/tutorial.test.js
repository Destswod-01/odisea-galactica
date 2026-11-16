import { describe, it, expect, beforeEach } from 'vitest';
import {
  CLAVE_SIN_CONSEJOS,
  configConsejosDificultad,
  destinatarioFase,
  esModoProbar,
  guardarSinConsejos,
  leerSinConsejos,
  paginasDeFase,
} from './tutorial.js';

describe('tutorial de misión según roles, dificultad y ocultar', () => {
  beforeEach(() => {
    try { localStorage.removeItem(CLAVE_SIN_CONSEJOS); } catch { /* sin almacenamiento */ }
  });

  it('ordena en hangar primero los consejos de misRoles en línea', () => {
    const base = paginasDeFase('hangar', []);
    expect(base.map((p) => p.num)).toEqual([1, 2, 3, 4, 5, 6]);

    const cienciaPrimero = paginasDeFase('hangar', ['ciencia']);
    // Reparto equitativo: ciencia también ve primero la página del blindaje (2).
    expect(cienciaPrimero.slice(0, 3).map((p) => p.num)).toEqual([2, 4, 6]);

    const direccionPrimero = paginasDeFase('hangar', ['direccion']);
    // Dirección ahora elige el cohete (página 1) y la órbita (página 5).
    expect(direccionPrimero.slice(0, 3).map((p) => p.num)).toEqual([1, 5, 6]);
  });

  it('en experto limita las páginas al consejo de entrada de cada etapa', () => {
    expect(paginasDeFase('hangar', [], 'experto')).toHaveLength(1);
    expect(paginasDeFase('lanzamiento', [], 'experto')).toHaveLength(1);
    expect(paginasDeFase('lanzamiento', [], 'intermedio')).toHaveLength(2);
    expect(paginasDeFase('lanzamiento', [], 'principiante')).toHaveLength(2);
  });

  it('adapta pistas e IO según los 3 niveles de dificultad', () => {
    const novato = configConsejosDificultad('principiante');
    const conocedor = configConsejosDificultad('intermedio');
    const experto = configConsejosDificultad('experto');

    expect(novato.mostrarPista).toBe(true);
    expect(novato.ioModo).toBe('seguido');
    expect(novato.ioIntervaloMs).toBeGreaterThan(0);

    expect(conocedor.mostrarPista).toBe(false);
    expect(conocedor.ioModo).toBe('normal');

    expect(experto.soloEntrada).toBe(true);
    expect(experto.ioModo).toBe('ninguno');
  });

  it('dirige el mensaje al jugador del rol de la fase y detecta roles propios en red', () => {
    const equipo = {
      jugadores: [
        { nombre: 'Caro', roles: ['ciencia', 'recursos'] },
        { nombre: 'Beto', roles: ['ingenieria', 'direccion'] },
      ],
    };
    const dCiencia = destinatarioFase('encuentro', equipo, ['ciencia', 'recursos']);
    expect(dCiencia).toMatchObject({ nombre: 'Caro', rol: 'ciencia', esMio: true, enEquipo: true });

    const dOtro = destinatarioFase('encuentro', equipo, ['ingenieria']);
    // En línea con espejo manda el piloto de la etapa, no el dueño de la estación.
    const piloto = { id: 'h', nombre: 'Hello', roles: ['recursos'] };
    expect(destinatarioFase('encuentro', equipo, ['direccion'], 'X', piloto, false)).toMatchObject({ nombre: 'Hello', esMio: false, rolLocal: 'direccion' });
    expect(destinatarioFase('encuentro', equipo, ['recursos'], 'X', piloto, true)).toMatchObject({ nombre: 'Hello', esMio: true, rolLocal: null });
    expect(dOtro).toMatchObject({
      nombre: 'Caro',
      rol: 'ciencia',
      esMio: false,
      rolLocal: 'ingenieria',
      nombreLocal: 'Beto',
    });
  });

  it('oculta los consejos en ?probar= y no falla sin almacenamiento, y guarda preferencia si hay localStorage', () => {
    expect(esModoProbar('?probar=lanzamiento&lang=en')).toBe(true);
    expect(esModoProbar('?lang=en')).toBe(false);

    // En entorno Node sin localStorage, no debe fallar y devuelve false
    expect(() => guardarSinConsejos(true)).not.toThrow();
    expect(leerSinConsejos()).toBe(false);

    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    try {
      guardarSinConsejos(true);
      expect(leerSinConsejos()).toBe(true);
      guardarSinConsejos(false);
      expect(leerSinConsejos()).toBe(false);
    } finally {
      delete globalThis.localStorage;
    }
  });
});

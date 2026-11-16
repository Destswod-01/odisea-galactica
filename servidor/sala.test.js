import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import { crearRegistro, crearServidor, RUTA } from './sala.mjs';

describe('partida nueva en la misma sala', () => {
  it('limpia votos, ronda, etapa y resultados de la misión anterior', () => {
    const r = crearRegistro();
    const s = r.crear('Ana');
    const { codigo, hostId } = s.sala ?? s;
    const sala = r.salas.get(codigo);
    sala.estado = { ...sala.estado, fase: 'hangar', partida: 1, ronda: 2, votos: { direccion: true }, votacion: { ronda: 2 }, resultados: { x: {} }, etapa: { fase: 'leop', n: 5 }, votando: true };
    r.estado(codigo, hostId, { fase: 'hangar', partida: 2, misionId: 'juno' });
    expect(sala.estado).toMatchObject({ partida: 2, ronda: 0, votos: {}, votacion: null, resultados: {}, etapa: null, votando: false, misionId: 'juno' });
  });
});

describe('salas: lógica pura', () => {
  it('crear, unirse (máx. 4), código de 5 letras sin O/0/I/1', () => {
    const r = crearRegistro();
    const a = r.crear('Ana');
    expect(a.sala.codigo).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
    for (const n of ['Beto', 'Caro', 'Dani']) expect(r.unirse(a.sala.codigo.toLowerCase(), n).sala).toBeTruthy();
    expect(r.unirse(a.sala.codigo, 'Eva').error).toBe('llena');
    expect(r.unirse('ZZZZZ', 'Eva').error).toBe('no_existe');
  });

  it('no se entra a una partida empezada, pero sí se reconecta', () => {
    const r = crearRegistro();
    const a = r.crear('Ana');
    const b = r.unirse(a.sala.codigo, 'Beto');
    r.estado(a.sala.codigo, a.id, { fase: 'hangar', misionId: 'lro' });
    expect(r.unirse(a.sala.codigo, 'Caro').error).toBe('empezada');
    r.desconectar(a.sala.codigo, b.id);
    expect(r.salas.get(a.sala.codigo).jugadores[1].conectado).toBe(false);
    expect(r.reconectar(a.sala.codigo, b.id).sala.jugadores[1].conectado).toBe(true);
  });

  it('los cambios de nave se mezclan por clave y los nombres se limpian', () => {
    const r = crearRegistro();
    const a = r.crear('  <b>Ana</b> con un nombre larguísimo ');
    expect(a.sala.jugadores[0].nombre.length).toBeLessThanOrEqual(18);
    expect(a.sala.jugadores[0].nombre).not.toMatch(/[<>]/);
    r.diseno(a.sala.codigo, a.id, { cohete: 'atlas_v_401' });
    r.diseno(a.sala.codigo, a.id, { energia: 'panel_chico' });
    expect(r.salas.get(a.sala.codigo).estado.diseno).toEqual({ cohete: 'atlas_v_401', energia: 'panel_chico' });
  });

  it('la ronda de votos se cierra cuando votan los 4 roles', () => {
    const r = crearRegistro();
    const a = r.crear('Ana');
    const c = a.sala.codigo;
    r.voto(c, a.id, { direccion: 'aprueba', ingenieria: 'cambio' });
    expect(r.salas.get(c).estado.votacion).toBeFalsy();
    r.voto(c, a.id, { ciencia: 'aprueba', recursos: 'aprueba' });
    expect(r.salas.get(c).estado.votacion).toMatchObject({ ronda: 1, aprobado: false, vetos: 1 });
    expect(r.salas.get(c).estado.votos).toEqual({});
    r.voto(c, a.id, { direccion: 'aprueba', ingenieria: 'aprueba', ciencia: 'aprueba', recursos: 'aprueba' });
    expect(r.salas.get(c).estado.votacion).toMatchObject({ ronda: 2, aprobado: true, vetos: 0 });
  });

  it('la presencia guarda la estación abierta de cada jugador', () => {
    const r = crearRegistro();
    const a = r.crear('Ana');
    r.presencia(a.sala.codigo, a.id, 'instrumentos');
    expect(r.salas.get(a.sala.codigo).estado.presencia[a.id]).toBe('instrumentos');
    expect(r.presencia(a.sala.codigo, 'intruso', 'cohete')).toBeNull();
  });

  it('también elimina la sala cuando el anfitrión sale durante la misión', () => {
    const r = crearRegistro(); const a = r.crear('Ana');
    r.unirse(a.sala.codigo, 'Beto');
    r.estado(a.sala.codigo, a.id, { fase: 'hangar', misionId: 'lro' });
    expect(r.salir(a.sala.codigo, a.id)).toBeNull();
    expect(r.salas.has(a.sala.codigo)).toBe(false);
  });

  it('si el anfitrión sale, elimina la sala y nadie puede reconectar', () => {
    const r = crearRegistro();
    const a = r.crear('Ana');
    const b = r.unirse(a.sala.codigo, 'Beto');
    expect(r.salir(a.sala.codigo, a.id)).toBeNull();
    expect(r.reconectar(a.sala.codigo, b.id).error).toBe('no_existe');
    expect(r.salir(a.sala.codigo, b.id)).toBeNull();
    expect(r.salas.size).toBe(0);
  });
});

describe('salas: servidor real (WebSocket + proxy HTTP)', () => {
  let estatico, servidor, puerto;
  beforeAll(async () => {
    estatico = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end(`estatico:${req.url}`); });
    await new Promise((ok) => estatico.listen(0, '127.0.0.1', ok));
    servidor = crearServidor({ estatico: { host: '127.0.0.1', port: estatico.address().port } });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    puerto = servidor.address().port;
  });
  afterAll(() => { servidor.close(); estatico.close(); });

  const conectar = () => new Promise((ok, mal) => {
    const ws = new WebSocket(`ws://127.0.0.1:${puerto}${RUTA}`);
    const cola = [];
    const esperando = [];
    ws.onmessage = (e) => { const m = JSON.parse(e.data); const w = esperando.findIndex((x) => x.f(m)); if (w >= 0) esperando.splice(w, 1)[0].ok(m); else cola.push(m); };
    ws.siguiente = (f = () => true) => new Promise((r) => { const i = cola.findIndex(f); if (i >= 0) r(cola.splice(i, 1)[0]); else esperando.push({ f, ok: r }); });
    ws.onopen = () => ok(ws);
    ws.onerror = mal;
  });

  it('avisa a los invitados al cerrar el anfitrión e invalida el código', async () => {
    const a = await conectar();
    a.send(JSON.stringify({ t: 'crear', nombre: 'Ana' }));
    const hola = await a.siguiente(m => m.t === 'hola');
    const b = await conectar();
    b.send(JSON.stringify({ t: 'unirse', codigo: hola.codigo, nombre: 'Beto' }));
    await b.siguiente(m => m.t === 'hola');
    a.send(JSON.stringify({ t: 'salir' }));
    expect(await b.siguiente(m => m.t === 'cerrada')).toMatchObject({ motivo: 'anfitrion_salio' });
    const c = await conectar();
    c.send(JSON.stringify({ t: 'unirse', codigo: hola.codigo, nombre: 'Caro' }));
    expect(await c.siguiente(m => m.t === 'error')).toMatchObject({ motivo: 'no_existe' });
    c.close(); b.close(); a.close();
  });

  it('el HTTP normal se reenvía al servidor estático', async () => {
    const r = await fetch(`http://127.0.0.1:${puerto}/orbita-2/index.html`);
    expect(await r.text()).toBe('estatico:/orbita-2/index.html');
  });

  it('dos jugadores: crear, unirse con el código y ver los cambios del otro', async () => {
    const a = await conectar();
    a.send(JSON.stringify({ t: 'crear', nombre: 'Ana' }));
    const hola = await a.siguiente((m) => m.t === 'hola');
    const { sala } = await a.siguiente((m) => m.t === 'sala');
    expect(sala.jugadores).toHaveLength(1);

    const b = await conectar();
    b.send(JSON.stringify({ t: 'unirse', codigo: hola.codigo, nombre: 'Beto' }));
    await b.siguiente((m) => m.t === 'hola');
    const enA = await a.siguiente((m) => m.t === 'sala' && m.sala.jugadores.length === 2);
    expect(enA.sala.jugadores.map((j) => j.nombre)).toEqual(['Ana', 'Beto']);

    b.send(JSON.stringify({ t: 'diseno', cambios: { cohete: 'atlas_v_401' } }));
    const cambio = await a.siguiente((m) => m.t === 'sala' && m.sala.estado.diseno?.cohete);
    expect(cambio.sala.estado.diseno.cohete).toBe('atlas_v_401');

    b.close();
    const sinB = await a.siguiente((m) => m.t === 'sala' && m.sala.jugadores[1]?.conectado === false);
    expect(sinB.sala.jugadores[1].nombre).toBe('Beto');
    a.close();
  });

  it('si el mismo jugador abre otra conexión (recarga) y la vieja se cierra después, sigue conectado', async () => {
    const a = await conectar();
    a.send(JSON.stringify({ t: 'crear', nombre: 'Ana' }));
    const hola = await a.siguiente((m) => m.t === 'hola');
    const a2 = await conectar();
    a2.send(JSON.stringify({ t: 'reconectar', codigo: hola.codigo, id: hola.id }));
    await a2.siguiente((m) => m.t === 'sala');
    a.close();
    a2.send(JSON.stringify({ t: 'estado', parche: { misionId: 'lro' } }));
    const s = await a2.siguiente((m) => m.t === 'sala' && m.sala.estado.misionId === 'lro');
    expect(s.sala.jugadores[0].conectado).toBe(true);
    a2.close();
  });

  it('un código que no existe da error', async () => {
    const c = await conectar();
    c.send(JSON.stringify({ t: 'unirse', codigo: 'QQQQQ', nombre: 'X' }));
    expect(await c.siguiente((m) => m.t === 'error')).toEqual({ t: 'error', motivo: 'no_existe' });
    c.close();
  });

  it('espejo: retransmite instantáneas solo a los demás, entrega la última al pedirla y respeta el tope', async () => {
    const a = await conectar();
    a.send(JSON.stringify({ t: 'crear', nombre: 'Ana' }));
    const holaA = await a.siguiente((m) => m.t === 'hola');
    await a.siguiente((m) => m.t === 'sala');

    const b = await conectar();
    b.send(JSON.stringify({ t: 'unirse', codigo: holaA.codigo, nombre: 'Beto' }));
    await b.siguiente((m) => m.t === 'hola');
    await b.siguiente((m) => m.t === 'sala');

    a.send(JSON.stringify({ t: 'espejo', fase: 'leop', s: { fase: 'entrada', ronda: 1 } }));
    const esp = await b.siguiente((m) => m.t === 'espejo');
    expect(esp).toEqual({ t: 'espejo', de: holaA.id, fase: 'leop', s: { fase: 'entrada', ronda: 1 } });

    // Quien reconecta o entra después recibe la última instantánea al pedirla (y el piloto no).
    b.send(JSON.stringify({ t: 'espejo_pedir' }));
    const pedida = await b.siguiente((m) => m.t === 'espejo');
    expect(pedida.s).toEqual({ fase: 'entrada', ronda: 1 });
    a.send(JSON.stringify({ t: 'espejo_pedir' }));

    // Instantánea gigante se descarta sin cortar la conexión.
    a.send(JSON.stringify({ t: 'espejo', fase: 'encuentro', s: { relleno: 'x'.repeat(55000) } }));
    a.send(JSON.stringify({ t: 'espejo', fase: 'leop', s: { fase: 'exito' } }));
    const sig = await b.siguiente((m) => m.t === 'espejo');
    expect(sig.s).toEqual({ fase: 'exito' });

    a.close(); b.close();
  });
  it('voto08: retransmite el voto a TODA la sala (también a quien lo manda) y descarta lo inválido', async () => {
    const a = await conectar();
    a.send(JSON.stringify({ t: 'crear', nombre: 'Ana' }));
    const holaA = await a.siguiente((m) => m.t === 'hola');
    await a.siguiente((m) => m.t === 'sala');
    const b = await conectar();
    b.send(JSON.stringify({ t: 'unirse', codigo: holaA.codigo, nombre: 'Beto' }));
    const holaB = await b.siguiente((m) => m.t === 'hola');
    await b.siguiente((m) => m.t === 'sala');

    b.send(JSON.stringify({ t: 'voto08', carta: 3, opcion: 1, basura: 'x' }));
    const enA = await a.siguiente((m) => m.t === 'voto08');
    expect(enA).toEqual({ t: 'voto08', de: holaB.id, carta: 3, opcion: 1 });
    const enB = await b.siguiente((m) => m.t === 'voto08');
    expect(enB).toEqual(enA);

    // Inválidos (opción rara, carta fuera de rango) se ignoran; avanzar y final pasan.
    b.send(JSON.stringify({ t: 'voto08', carta: 3, opcion: 7 }));
    b.send(JSON.stringify({ t: 'voto08', carta: -1, opcion: 0 }));
    b.send(JSON.stringify({ t: 'voto08', carta: 4, avanzar: true }));
    expect(await a.siguiente((m) => m.t === 'voto08')).toEqual({ t: 'voto08', de: holaB.id, carta: 4, avanzar: true });
    b.send(JSON.stringify({ t: 'voto08', carta: 'final', opcion: 0 }));
    expect(await a.siguiente((m) => m.t === 'voto08')).toEqual({ t: 'voto08', de: holaB.id, carta: 'final', opcion: 0 });

    a.close(); b.close();
  });
});

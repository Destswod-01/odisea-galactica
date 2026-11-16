import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('react', () => ({ useSyncExternalStore: (_suscribir, foto) => foto() }));
let cliente, sockets;
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); sockets = [];
  const memoria = new Map();
  vi.stubGlobal('sessionStorage', { getItem: k => memoria.get(k) ?? null, setItem: (k,v) => memoria.set(k,v), removeItem: k => memoria.delete(k) });
  vi.stubGlobal('window', { location: { protocol: 'http:', host: 'localhost' } });
  vi.stubGlobal('WebSocket', class {
    readyState = 0; enviados = [];
    constructor() { sockets.push(this); }
    send(m) { this.enviados.push(JSON.parse(m)); }
    close() { this.readyState = 3; }
    abrir() { this.readyState = 1; this.onopen(); }
    recibir(m) { this.onmessage({ data: JSON.stringify(m) }); }
  });
  cliente = await import('./cliente.js');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function entrar(socket, codigo) {
  socket.abrir(); socket.recibir({ t: 'hola', codigo, id: codigo });
  socket.recibir({ t: 'sala', sala: { codigo, hostId: codigo, jugadores: [] } });
}
it('salir y crear inmediatamente: el cierre y mensajes viejos no dañan la nueva sala', () => {
  cliente.crearSala('Ana'); const vieja = sockets[0]; entrar(vieja, 'AAAAA');
  cliente.salirSala(); cliente.crearSala('Ana'); const nueva = sockets[1]; entrar(nueva, 'BBBBB');
  vieja.onclose(); vieja.recibir({ t: 'sala', sala: { codigo: 'AAAAA' } });
  vi.runAllTimers(); cliente.enviar({ t: 'ping' });
  expect(sockets).toHaveLength(2);
  expect(cliente.useSala()).toMatchObject({ estado: 'en_sala', sala: { codigo: 'BBBBB' }, error: null });
  expect(nueva.enviados.at(-1)).toEqual({ t: 'ping' });
});
it('al cerrar el anfitrión elimina la sesión y no intenta reconectar', () => {
  cliente.crearSala('Ana'); const socket = sockets[0]; entrar(socket, 'AAAAA');
  socket.recibir({ t: 'cerrada', motivo: 'anfitrion_salio' }); socket.onclose(); vi.runAllTimers();
  expect(cliente.useSala()).toMatchObject({ sala: null, miId: null, error: 'sala_cerrada' });
  expect(sessionStorage.getItem('odisea-sala')).toBeNull(); expect(sockets).toHaveLength(1);
});
it('reconectar a una sala eliminada limpia también la sala que había en pantalla', () => {
  cliente.crearSala('Ana'); const socket = sockets[0]; entrar(socket, 'AAAAA');
  socket.onclose(); vi.runAllTimers(); const nueva = sockets[1]; nueva.abrir();
  nueva.recibir({ t: 'error', motivo: 'no_existe' }); nueva.onclose(); vi.runAllTimers();
  expect(cliente.useSala()).toMatchObject({ sala: null, error: 'sala_cerrada' }); expect(sockets).toHaveLength(2);
});

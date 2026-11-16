// Servidor de salas de Odisea Galáctica (modo equipo en red).
//
// Un solo proceso de Node, sin dependencias:
//   - WebSocket en RUTA (/orbita-2/sala): salas con código de 5 letras, hasta 4 jugadores.
//   - Todo lo demás (HTTP normal) se reenvía tal cual al servidor estático (ESTATICO), así el sitio sigue igual.
//
// Variables de entorno: PUERTO (3240), ESTATICO_PUERTO (3242), ESTATICO_HOST (127.0.0.1).
// Protocolo (JSON por mensaje; ver src/red/cliente.js):
//   cliente → servidor: {t:'crear', nombre} · {t:'unirse', codigo, nombre} · {t:'reconectar', codigo, id}
//                       {t:'estado', parche} · {t:'diseno', cambios} · {t:'voto', votos} · {t:'resultado', datos} · {t:'salir'}
//                       {t:'espejo', fase, s} (piloto → los demás) · {t:'espejo_pedir'} · {t:'voto08', carta, opcion|avanzar} (etapa 08, a toda la sala)
//   servidor → cliente: {t:'hola', id} · {t:'sala', sala} · {t:'error', motivo} · {t:'espejo', de, fase, s} · {t:'voto08', de, carta, opcion|avanzar}
import http from 'node:http';
import crypto from 'node:crypto';

export const RUTA = '/orbita-2/sala';
export const MAX_JUGADORES = 4;
export const ROLES = ['direccion', 'ingenieria', 'ciencia', 'recursos'];
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para que el código se dicte fácil
const MAX_MENSAJE = 64 * 1024;
export const MAX_ESPEJO = 48 * 1024; // tope de una instantánea del espejo (cabe en un mensaje)
const MAX_SALAS = 500;
const VIDA_SALA_MS = 3 * 60 * 60 * 1000; // una sala sin nadie conectado se borra a las 3 h
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// ---------- Salas (lógica pura, probada en servidor/sala.test.js) ----------

export function crearRegistro({ ahora = () => Date.now(), azar = Math.random } = {}) {
  const salas = new Map();
  const nuevoCodigo = () => {
    for (let i = 0; i < 50; i++) {
      const c = Array.from({ length: 5 }, () => LETRAS[Math.floor(azar() * LETRAS.length)]).join('');
      if (!salas.has(c)) return c;
    }
    return null;
  };
  const limpiarNombre = (n) => String(n ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18) || 'Jugador';
  const publica = (s) => ({ codigo: s.codigo, hostId: s.hostId, jugadores: s.jugadores.map(({ id, nombre, conectado }) => ({ id, nombre, conectado })), estado: s.estado, version: s.version });
  const tocar = (s) => { s.version += 1; s.actividad = ahora(); };

  return {
    salas,
    publica,
    crear(nombre) {
      if (salas.size >= MAX_SALAS) return { error: 'servidor_lleno' };
      const codigo = nuevoCodigo();
      if (!codigo) return { error: 'servidor_lleno' };
      const id = crypto.randomUUID();
      const s = { codigo, hostId: id, jugadores: [{ id, nombre: limpiarNombre(nombre), conectado: true }], estado: { fase: 'espera', votos: {}, ronda: 0, resultados: {} }, version: 1, actividad: ahora() };
      salas.set(codigo, s);
      return { sala: s, id };
    },
    unirse(codigo, nombre) {
      const s = salas.get(String(codigo ?? '').toUpperCase().trim());
      if (!s) return { error: 'no_existe' };
      if (s.estado.fase !== 'espera') return { error: 'empezada' };
      if (s.jugadores.length >= MAX_JUGADORES) return { error: 'llena' };
      const id = crypto.randomUUID();
      s.jugadores.push({ id, nombre: limpiarNombre(nombre), conectado: true });
      tocar(s);
      return { sala: s, id };
    },
    reconectar(codigo, id) {
      const s = salas.get(String(codigo ?? '').toUpperCase().trim());
      const j = s?.jugadores.find((x) => x.id === id);
      if (!j) return { error: 'no_existe' };
      j.conectado = true; tocar(s);
      return { sala: s, id };
    },
    desconectar(codigo, id) {
      const s = salas.get(codigo);
      const j = s?.jugadores.find((x) => x.id === id);
      if (!j) return null;
      j.conectado = false; tocar(s);
      return s;
    },
    salir(codigo, id) {
      const s = salas.get(codigo);
      if (!s) return null;
      if (s.hostId === id) { salas.delete(codigo); return null; }
      // En la sala de espera se libera el lugar; ya empezada la misión, el jugador solo queda desconectado.
      if (s.estado.fase === 'espera') s.jugadores = s.jugadores.filter((x) => x.id !== id);
      else { const j = s.jugadores.find((x) => x.id === id); if (j) j.conectado = false; }
      if (s.jugadores.length === 0) { salas.delete(codigo); return null; }
      tocar(s);
      return s;
    },
    // Parche al estado compartido (fase, misión, dificultad, equipo, votando…). Solo claves conocidas.
    estado(codigo, id, parche) {
      const s = salas.get(codigo);
      if (!s || !s.jugadores.some((x) => x.id === id) || !parche || typeof parche !== 'object') return null;
      const permitidas = ['fase', 'misionId', 'dificultad', 'equipo', 'votando', 'diseno', 'orbita', 'etapa', 'partida'];
      // Siguiente misión en la MISMA sala: `partida` nueva → se olvida la votación, la etapa y los resultados de la anterior.
      if ('partida' in parche && parche.partida !== s.estado.partida) {
        s.estado.votos = {}; s.estado.votacion = null; s.estado.ronda = 0; s.estado.resultados = {}; s.estado.etapa = null; s.estado.votando = false;
      }
      for (const k of permitidas) if (k in parche) s.estado[k] = parche[k];
      if (parche.fase === 'hangar' && s.estado.ronda === 0) { s.estado.votos = {}; s.estado.votacion = null; }
      tocar(s);
      return s;
    },
    // Cambios a la nave: se mezclan por clave (cada rol cambia sus piezas sin pisar las de los demás).
    diseno(codigo, id, cambios) {
      const s = salas.get(codigo);
      if (!s || !s.jugadores.some((x) => x.id === id) || !cambios || typeof cambios !== 'object') return null;
      s.estado.diseno = { ...(s.estado.diseno || {}), ...cambios };
      tocar(s);
      return s;
    },
    // Votos por rol. Cuando votan los 4 roles se cierra la ronda: aprobada si nadie pidió cambios.
    voto(codigo, id, votos) {
      const s = salas.get(codigo);
      if (!s || !s.jugadores.some((x) => x.id === id) || !votos || typeof votos !== 'object') return null;
      for (const r of ROLES) if (votos[r] === 'aprueba' || votos[r] === 'cambio') s.estado.votos[r] = votos[r];
      if (ROLES.every((r) => s.estado.votos[r])) {
        const vetos = ROLES.filter((r) => s.estado.votos[r] === 'cambio').length;
        s.estado.ronda += 1;
        s.estado.vetosTotal = (s.estado.vetosTotal || 0) + vetos;
        s.estado.votacion = { ronda: s.estado.ronda, aprobado: vetos === 0, vetos, votos: { ...s.estado.votos } };
        s.estado.votos = {};
        s.estado.votando = false;
      }
      tocar(s);
      return s;
    },
    // Presencia (B12): estación del hangar que cada jugador tiene abierta, para que todos lo vean en vivo.
    presencia(codigo, id, estacion) {
      const s = salas.get(codigo);
      if (!s || !s.jugadores.some((x) => x.id === id)) return null;
      s.estado.presencia = { ...(s.estado.presencia || {}), [id]: String(estacion ?? '').slice(0, 24) };
      tocar(s);
      return s;
    },
    // Voto de la etapa 08 (no se guarda ni toca la versión): valida y devuelve el mensaje limpio a retransmitir.
    voto08(codigo, id, m) {
      const s = salas.get(codigo);
      if (!s || !s.jugadores.some((x) => x.id === id) || !m || typeof m !== 'object') return null;
      const carta = m.carta === 'final' ? 'final' : Number.isInteger(m.carta) && m.carta >= 0 && m.carta < 64 ? m.carta : null;
      if (carta === null) return null;
      if (m.avanzar === true) return { carta, avanzar: true };
      if (m.opcion !== 0 && m.opcion !== 1) return null;
      return { carta, opcion: m.opcion };
    },
    // Espejo (piloto → espectadores): última instantánea de la etapa que maneja el piloto. No va dentro de stado
    // (se manda a 10 Hz y no debe inflar cada difusión de la sala); se guarda aparte para quien entra o reconecta.
    espejo(codigo, id, fase, datos) {
      const s = salas.get(codigo);
      if (!s || !s.jugadores.some((x) => x.id === id) || typeof fase !== 'string' || fase.length > 24 || !datos || typeof datos !== 'object') return null;
      let largo = 0;
      try { largo = JSON.stringify(datos).length; } catch { return null; }
      if (largo > MAX_ESPEJO) return null;
      s.espejoUlt = { de: id, fase, s: datos };
      s.actividad = ahora();
      return s;
    },
    resultado(codigo, id, datos) {
      const s = salas.get(codigo);
      if (!s || !s.jugadores.some((x) => x.id === id) || !datos || typeof datos !== 'object') return null;
      const n = (x) => (Number.isFinite(Number(x)) ? Math.round(Number(x) * 1000) / 1000 : null);
      s.estado.resultados[id] = { puntaje: n(datos.puntaje), ciencia: n(datos.ciencia), medalla: String(datos.medalla ?? '').slice(0, 20) };
      tocar(s);
      return s;
    },
    barrer() {
      const t = ahora();
      for (const [c, s] of salas) if (!s.jugadores.some((j) => j.conectado) && t - s.actividad > VIDA_SALA_MS) salas.delete(c);
    },
  };
}

// ---------- WebSocket mínimo (RFC 6455: texto, ping/pong y cierre) ----------

function marco(texto, opcode = 1) {
  const datos = Buffer.from(texto);
  const n = datos.length;
  const cabeza = n < 126 ? Buffer.from([0x80 | opcode, n]) : n < 65536 ? Buffer.from([0x80 | opcode, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | opcode; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
  return Buffer.concat([cabeza, datos]);
}

function conectarWS(req, socket, alMensaje, alCerrar) {
  const clave = req.headers['sec-websocket-key'];
  if (!clave) { socket.destroy(); return null; }
  const acepta = crypto.createHash('sha1').update(clave + GUID).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acepta}\r\n\r\n`);
  socket.setNoDelay(true);
  let buffer = Buffer.alloc(0);
  let cerrado = false;
  const ws = {
    enviar(obj) { if (!cerrado) socket.write(marco(JSON.stringify(obj))); },
    cerrar() { if (!cerrado) { cerrado = true; try { socket.write(Buffer.from([0x88, 0])); } catch { /* ya cerrado */ } socket.end(); } },
  };
  socket.on('data', (trozo) => {
    buffer = Buffer.concat([buffer, trozo]);
    if (buffer.length > MAX_MENSAJE + 14) { ws.cerrar(); return; }
    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      const enmascarado = (buffer[1] & 0x80) !== 0;
      let largo = buffer[1] & 0x7f, pos = 2;
      if (largo === 126) { if (buffer.length < 4) return; largo = buffer.readUInt16BE(2); pos = 4; }
      else if (largo === 127) { if (buffer.length < 10) return; largo = Number(buffer.readBigUInt64BE(2)); pos = 10; }
      if (largo > MAX_MENSAJE) { ws.cerrar(); return; }
      const fin = pos + (enmascarado ? 4 : 0) + largo;
      if (buffer.length < fin) return;
      let datos = buffer.subarray(pos + (enmascarado ? 4 : 0), fin);
      if (enmascarado) { const m = buffer.subarray(pos, pos + 4); datos = Buffer.from(datos.map((b, i) => b ^ m[i % 4])); }
      buffer = buffer.subarray(fin);
      if (opcode === 8) { ws.cerrar(); return; }
      if (opcode === 9) { socket.write(marco(datos.toString(), 10)); continue; }
      if (opcode === 1) alMensaje(datos.toString('utf8'));
    }
  });
  const fin = () => { if (!cerrado) { cerrado = true; } alCerrar(); };
  socket.on('close', fin);
  socket.on('error', () => socket.destroy());
  return ws;
}

// ---------- Servidor HTTP: proxy al estático + WebSocket de salas ----------

export function crearServidor({ estatico = { host: '127.0.0.1', port: 3242 }, registro = crearRegistro() } = {}) {
  const conexiones = new Map(); // codigo → Set(ws)
  const difundir = (s) => {
    if (!s) return;
    const msg = { t: 'sala', sala: registro.publica(s) };
    for (const ws of conexiones.get(s.codigo) ?? []) ws.enviar(msg);
  };

  const servidor = http.createServer((req, res) => {
    // Reenvía al servidor estático (el sitio queda exactamente igual que antes).
    const sub = http.request({ host: estatico.host, port: estatico.port, method: req.method, path: req.url, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    sub.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' }); res.end('servidor estatico no disponible'); });
    req.pipe(sub);
  });

  servidor.on('upgrade', (req, socket) => {
    const ruta = (req.url || '').split('?')[0];
    if (ruta !== RUTA) { socket.destroy(); return; }
    let codigo = null, id = null;
    const ws = conectarWS(req, socket, (texto) => {
      let m;
      try { m = JSON.parse(texto); } catch { return; }
      if (!m || typeof m !== 'object') return;
      const entrar = (r) => {
        if (r.error) { ws.enviar({ t: 'error', motivo: r.error }); return; }
        codigo = r.sala.codigo; id = r.id; ws.jugadorId = r.id;
        if (!conexiones.has(codigo)) conexiones.set(codigo, new Set());
        conexiones.get(codigo).add(ws);
        ws.enviar({ t: 'hola', id, codigo });
        difundir(r.sala);
      };
      switch (m.t) {
        case 'crear': return entrar(registro.crear(m.nombre));
        case 'unirse': return entrar(registro.unirse(m.codigo, m.nombre));
        case 'reconectar': return entrar(registro.reconectar(m.codigo, m.id));
        case 'estado': return difundir(registro.estado(codigo, id, m.parche));
        case 'diseno': return difundir(registro.diseno(codigo, id, m.cambios));
        case 'voto': return difundir(registro.voto(codigo, id, m.votos));
        case 'resultado': return difundir(registro.resultado(codigo, id, m.datos));
        case 'presencia': return difundir(registro.presencia(codigo, id, m.estacion));
        case 'espejo': { // retransmite a los DEMÁS de la sala (sin tocar la versión ni difundir sala)
          const s = registro.espejo(codigo, id, m.fase, m.s);
          if (!s) return undefined;
          for (const otro of conexiones.get(codigo) ?? []) if (otro !== ws && otro.jugadorId !== id) otro.enviar({ t: 'espejo', de: id, fase: m.fase, s: m.s });
          return undefined;
        }
        case 'voto08': { // etapa 08 en equipo: voto/avance/final, retransmitido a TODA la sala (incluido quien lo manda)
          const v = registro.voto08(codigo, id, m);
          if (!v) return undefined;
          for (const otro of conexiones.get(codigo) ?? []) otro.enviar({ t: 'voto08', de: id, ...v });
          return undefined;
        }
        case 'espejo_pedir': { // quien reconecta o llega tarde a la etapa pide la última instantánea
          const u = registro.salas.get(codigo)?.espejoUlt;
          if (u && u.de !== id) ws.enviar({ t: 'espejo', de: u.de, fase: u.fase, s: u.s });
          return undefined;
        }
        case 'salir': {
          const anfitrion = registro.salas.get(codigo)?.hostId === id;
          const s = registro.salir(codigo, id);
          if (anfitrion) {
            const miembros = conexiones.get(codigo);
            conexiones.delete(codigo);
            for (const otro of miembros ?? []) {
              otro.enviar({ t: 'cerrada', motivo: 'anfitrion_salio' });
              otro.cerrar();
            }
          } else conexiones.get(codigo)?.delete(ws);
          codigo = null; id = null; difundir(s); return ws.cerrar();
        }
        case 'ping': return ws.enviar({ t: 'pong' });
        default: return undefined;
      }
    }, () => {
      if (!codigo) return;
      const abiertas = conexiones.get(codigo);
      abiertas?.delete(ws);
      // Al recargar, la conexión vieja puede cerrarse DESPUÉS de que entró la nueva: solo queda «desconectado» si no le queda ninguna.
      if ([...(abiertas ?? [])].some((x) => x.jugadorId === id)) return;
      difundir(registro.desconectar(codigo, id));
    });
    if (!ws) socket.destroy();
  });

  const barrido = setInterval(() => registro.barrer(), 10 * 60 * 1000);
  barrido.unref?.();
  servidor.on('close', () => clearInterval(barrido));
  return servidor;
}

// Arranque directo: node servidor/sala.mjs
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sala.mjs')) {
  const puerto = Number(process.env.PUERTO) || 3240;
  const estatico = { host: process.env.ESTATICO_HOST || '127.0.0.1', port: Number(process.env.ESTATICO_PUERTO) || 3242 };
  crearServidor({ estatico }).listen(puerto, '127.0.0.1', () => console.log(`Odisea Galáctica · salas en ws://127.0.0.1:${puerto}${RUTA}, estático en ${estatico.host}:${estatico.port}`));
}

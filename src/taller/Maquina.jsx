// Módulo B del taller 3D: la máquina de selección de piezas (una por estación).
// Ver docs/TALLER_3D.md §5. Consola de 3,0 × 3,6 × 1,4; frente = +Z local; origen = centro de la base en el piso.
// Sin red: todas las texturas (rótulo, icono, pantalla animada, brillo) se dibujan en <canvas> aquí mismo.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ESTACIONES } from './estaciones.js';
import { t as tr, useT } from '../i18n/idioma.js';

const VERDE = '#79dfb1';
const TAU = Math.PI * 2;

/* ───────────────────────── utilidades de canvas ───────────────────────── */

function lienzo(ancho, alto) {
  const c = document.createElement('canvas');
  c.width = ancho * 2;
  c.height = alto * 2;
  c.getContext('2d').scale(2, 2);
  return c;
}

function aTextura(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// '#rrggbb' → 'rgba(r,g,b,a)'
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const CACHE = new Map();
function cacheado(clave, fabrica) {
  if (!CACHE.has(clave)) CACHE.set(clave, fabrica());
  return CACHE.get(clave);
}

// Icono dibujado a trazos dentro de un cuadro de `tam` px centrado en (cx, cy).
function dibujarIcono(ctx, icono, cx, cy, tam, color, grosor = 0.09) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(tam / 2, tam / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (icono) {
    case 'cohete':
      ctx.moveTo(0, -0.95);
      ctx.bezierCurveTo(0.5, -0.55, 0.5, 0.1, 0.32, 0.5);
      ctx.lineTo(-0.32, 0.5);
      ctx.bezierCurveTo(-0.5, 0.1, -0.5, -0.55, 0, -0.95);
      ctx.moveTo(0.34, 0.15); ctx.lineTo(0.7, 0.7); ctx.lineTo(0.32, 0.5);
      ctx.moveTo(-0.34, 0.15); ctx.lineTo(-0.7, 0.7); ctx.lineTo(-0.32, 0.5);
      ctx.moveTo(-0.14, 0.72); ctx.lineTo(0, 0.98); ctx.lineTo(0.14, 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -0.2, 0.15, 0, TAU);
      break;
    case 'tanque':
      ctx.moveTo(-0.42, -0.42);
      ctx.arc(0, -0.42, 0.42, Math.PI, 0);
      ctx.lineTo(0.42, 0.42);
      ctx.arc(0, 0.42, 0.42, 0, Math.PI);
      ctx.closePath();
      ctx.moveTo(-0.42, -0.12); ctx.lineTo(0.42, -0.12);
      ctx.moveTo(-0.42, 0.22); ctx.lineTo(0.42, 0.22);
      ctx.moveTo(0, -0.84); ctx.lineTo(0, -1);
      ctx.moveTo(-0.16, -1); ctx.lineTo(0.16, -1);
      break;
    case 'rayo':
      ctx.moveTo(0.15, -0.95); ctx.lineTo(-0.5, 0.1); ctx.lineTo(-0.05, 0.1);
      ctx.lineTo(-0.2, 0.95); ctx.lineTo(0.5, -0.15); ctx.lineTo(0.05, -0.15);
      ctx.closePath();
      break;
    case 'antena':
      ctx.moveTo(-0.38, 0.95); ctx.lineTo(0, -0.2); ctx.lineTo(0.38, 0.95);
      ctx.moveTo(-0.24, 0.55); ctx.lineTo(0.24, 0.55);
      ctx.moveTo(-0.14, 0.2); ctx.lineTo(0.14, 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -0.35, 0.1, 0, TAU);
      ctx.moveTo(0.38, -0.35); ctx.arc(0, -0.35, 0.38, 0, 0.0001);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -0.35, 0.42, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -0.35, 0.78, Math.PI * 1.22, Math.PI * 1.78);
      break;
    case 'escudo':
      ctx.moveTo(0, -0.95);
      ctx.lineTo(0.78, -0.62);
      ctx.bezierCurveTo(0.8, 0.2, 0.4, 0.7, 0, 0.97);
      ctx.bezierCurveTo(-0.4, 0.7, -0.8, 0.2, -0.78, -0.62);
      ctx.closePath();
      ctx.moveTo(-0.3, 0); ctx.lineTo(-0.08, 0.25); ctx.lineTo(0.32, -0.25);
      break;
    case 'lupa':
      ctx.arc(-0.15, -0.15, 0.58, 0, TAU);
      ctx.moveTo(0.27, 0.27); ctx.lineTo(0.92, 0.92);
      break;
    case 'pincel':
      ctx.rotate(Math.PI / 4);
      ctx.moveTo(-0.12, -0.95); ctx.lineTo(0.12, -0.95); ctx.lineTo(0.12, -0.2); ctx.lineTo(-0.12, -0.2);
      ctx.closePath();
      ctx.moveTo(-0.2, -0.2); ctx.lineTo(0.2, -0.2); ctx.lineTo(0.2, 0.05); ctx.lineTo(-0.2, 0.05);
      ctx.closePath();
      ctx.moveTo(-0.2, 0.05);
      ctx.bezierCurveTo(-0.3, 0.45, -0.1, 0.75, 0, 0.95);
      ctx.bezierCurveTo(0.1, 0.75, 0.3, 0.45, 0.2, 0.05);
      break;
    default:
      ctx.arc(0, 0, 0.8, 0, TAU);
  }
  ctx.stroke();
  ctx.restore();
}

// Ajusta el tamaño de la fuente hasta que el texto quepa en `maxAncho`.
function ajustarFuente(ctx, texto, peso, tamMax, maxAncho) {
  let tam = tamMax;
  ctx.font = `${peso} ${tam}px Inter, 'Segoe UI', sans-serif`;
  while (ctx.measureText(texto).width > maxAncho && tam > 14) {
    tam -= 2;
    ctx.font = `${peso} ${tam}px Inter, 'Segoe UI', sans-serif`;
  }
  return tam;
}

// Rótulo del letrero: icono + nombre corto (se usa como mapa emisivo, el fondo oscuro no brilla).
function texturaRotuloLocal(texto, color, icono) {
  return cacheado(`rotulo|${icono}|${texto}|${color}`, () => {
    const c = lienzo(1040, 200);
    const x = c.getContext('2d');
    x.fillStyle = '#070c12';
    x.fillRect(0, 0, 1040, 200);
    const g = x.createLinearGradient(0, 0, 1040, 0);
    g.addColorStop(0, rgba(color, 0.32));
    g.addColorStop(0.5, rgba(color, 0.07));
    g.addColorStop(1, rgba(color, 0.32));
    x.fillStyle = g;
    x.fillRect(0, 0, 1040, 200);
    x.strokeStyle = color;
    x.lineWidth = 6;
    x.strokeRect(10, 10, 1020, 180);
    x.lineWidth = 2;
    x.strokeStyle = rgba(color, 0.5);
    x.strokeRect(22, 22, 996, 156);
    dibujarIcono(x, icono, 120, 100, 124, color, 0.09);
    x.fillStyle = '#edf4fa';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const t = texto.toUpperCase();
    ajustarFuente(x, t, 600, 96, 760);
    x.fillText(t, 600, 108);
    return aTextura(c);
  });
}

// Reflejo diagonal para el vidrio de la pantalla (se pinta aditivo).
function texturaBrillo() {
  return cacheado('brillo', () => {
    const c = lienzo(256, 150);
    const x = c.getContext('2d');
    x.fillStyle = '#000';
    x.fillRect(0, 0, 256, 150);
    x.save();
    x.transform(1, 0, -0.55, 1, 70, 0);
    const g = x.createLinearGradient(0, 0, 70, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 70, 150);
    x.fillRect(80, 0, 22, 150);
    x.restore();
    return aTextura(c);
  });
}

// Degradado vertical para el cono holográfico (opaco abajo, transparente arriba).
function texturaDegradado() {
  return cacheado('degradado', () => {
    const c = lienzo(8, 128);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#000');
    g.addColorStop(1, '#fff');
    x.fillStyle = g;
    x.fillRect(0, 0, 8, 128);
    const t = new THREE.CanvasTexture(c);
    return t;
  });
}

// Celdas solares para el accesorio de energía.
function texturaSolar() {
  return cacheado('solar', () => {
    const c = lienzo(256, 160);
    const x = c.getContext('2d');
    x.fillStyle = '#0d2a4f';
    x.fillRect(0, 0, 256, 160);
    x.strokeStyle = '#5a86b8';
    x.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { x.moveTo(i * 32, 0); x.lineTo(i * 32, 160); }
    for (let j = 0; j <= 5; j++) { x.moveTo(0, j * 32); x.lineTo(256, j * 32); }
    x.stroke();
    x.strokeStyle = 'rgba(200,220,255,0.35)';
    x.lineWidth = 1;
    for (let i = 0; i < 8; i++) { x.moveTo(i * 32 + 16, 0); x.lineTo(i * 32 + 16, 160); }
    x.stroke();
    return aTextura(c);
  });
}

// Insignia de «completada»: disco verde con palomita blanca.
function texturaInsignia() {
  return cacheado('insignia', () => {
    const c = lienzo(128, 128);
    const x = c.getContext('2d');
    x.fillStyle = VERDE;
    x.beginPath();
    x.arc(64, 64, 58, 0, TAU);
    x.fill();
    x.strokeStyle = '#0b3a26';
    x.lineWidth = 6;
    x.beginPath();
    x.arc(64, 64, 50, 0, TAU);
    x.stroke();
    x.strokeStyle = '#fff';
    x.lineWidth = 12;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(38, 66); x.lineTo(56, 84); x.lineTo(92, 44);
    x.stroke();
    return aTextura(c);
  });
}

/* ───────────────────────── pantalla animada ───────────────────────── */

const PW = 640;
const PH = 376;

function crearPantalla() {
  const canvas = lienzo(PW, PH);
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, tex: aTextura(canvas) };
}

// Redibuja la pantalla completa. `t` en segundos (0 = cuadro estático).
function dibujarPantalla(ctx, p, t) {
  const { color, titulo, icono, estado, completa, n } = p;
  ctx.fillStyle = '#050a10';
  ctx.fillRect(0, 0, PW, PH);
  const g = ctx.createRadialGradient(PW / 2, PH * 0.45, 10, PW / 2, PH * 0.45, PW * 0.62);
  g.addColorStop(0, rgba(color, 0.3));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);

  // rejilla tenue
  ctx.strokeStyle = rgba(color, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= PW; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, PH); }
  for (let y = 0; y <= PH; y += 40) { ctx.moveTo(0, y); ctx.lineTo(PW, y); }
  ctx.stroke();

  // cabecera
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba(color, 0.9);
  ctx.font = "600 22px Inter, 'Segoe UI', sans-serif";
  ctx.fillText(tr('hangar.maq.n', { n }), 28, 34);
  ctx.textAlign = 'right';
  const etiqueta = completa ? tr('hangar.maq.completa') : estado === 'activa' ? tr('hangar.maq.enUso') : estado === 'siguiente' ? tr('hangar.maq.siguiente') : tr('hangar.maq.espera');
  ctx.fillStyle = completa ? VERDE : '#95a8ba';
  ctx.fillText(etiqueta, PW - 52, 34);
  ctx.fillStyle = completa ? VERDE : estado === 'reposo' ? '#4a5c6c' : color;
  ctx.beginPath();
  ctx.arc(PW - 30, 34, 8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.4);
  ctx.beginPath();
  ctx.moveTo(24, 62); ctx.lineTo(PW - 24, 62);
  ctx.stroke();

  // icono y título
  const pulso = estado === 'reposo' ? 1 : 1 + 0.05 * Math.sin(t * 4);
  dibujarIcono(ctx, icono, 150, 180, 150 * pulso, color, 0.08);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#edf4fa';
  ajustarFuente(ctx, titulo, 600, 54, 340);
  ctx.fillText(titulo, 264, 160);
  ctx.fillStyle = '#95a8ba';
  ctx.font = "500 22px Inter, 'Segoe UI', sans-serif";
  ctx.fillText(estado === 'activa' ? tr('hangar.maq.eligiendo') : tr('hangar.maq.seleccion'), 264, 204);

  // barras de datos (se mueven solo en uso)
  if (estado === 'activa') {
    for (let i = 0; i < 5; i++) {
      const v = 0.35 + 0.55 * Math.abs(Math.sin(t * 1.7 + i * 1.3));
      ctx.fillStyle = rgba(color, 0.25);
      ctx.fillRect(264, 226 + i * 14, 300, 8);
      ctx.fillStyle = color;
      ctx.fillRect(264, 226 + i * 14, 300 * v, 8);
    }
  }

  // pie
  if (estado === 'siguiente') {
    const a = 0.55 + 0.45 * Math.sin(t * 5);
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(color, a);
    ctx.font = "700 34px Inter, 'Segoe UI', sans-serif";
    ctx.fillText(tr('hangar.maq.toca'), PW / 2, 318);
  }

  // barrido de líneas
  if (estado !== 'reposo') {
    const y = ((t * 0.4) % 1) * (PH + 80) - 40;
    const b = ctx.createLinearGradient(0, y - 40, 0, y + 40);
    b.addColorStop(0, rgba(color, 0));
    b.addColorStop(0.5, rgba(color, 0.22));
    b.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = b;
    ctx.fillRect(0, y - 40, PW, 80);
  }

  // líneas de trama y marco
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 1; y < PH; y += 4) { ctx.moveTo(0, y); ctx.lineTo(PW, y); }
  ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.65);
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, PW - 4, PH - 4);
}

function reducirMovimiento() {
  return typeof window !== 'undefined' && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ───────────────────────── materiales y geometrías compartidos ───────────────────────── */

const est = (opc) => new THREE.MeshStandardMaterial(opc);
const MAT = {
  blanco: est({ color: '#e9eef2', roughness: 0.42, metalness: 0.1 }),
  panel: est({ color: '#c3ccd5', roughness: 0.5, metalness: 0.25 }),
  oscuro: est({ color: '#1a232d', roughness: 0.5, metalness: 0.3 }),
  carbon: est({ color: '#0d1319', roughness: 0.55, metalness: 0.35 }),
  mesa: est({ color: '#2b3744', roughness: 0.38, metalness: 0.55 }),
  acero: est({ color: '#8d9aa6', roughness: 0.32, metalness: 0.85 }),
  aluminio: est({ color: '#bcc6cf', roughness: 0.42, metalness: 0.9 }),
  cobre: est({ color: '#c8763a', roughness: 0.33, metalness: 0.9, side: THREE.DoubleSide }),
  oro: est({ color: '#d9b45a', roughness: 0.3, metalness: 1 }),
  goma: est({ color: '#0b0f14', roughness: 0.85, metalness: 0.05 }),
  naranja: est({ color: '#f08a3c', roughness: 0.5, metalness: 0.2 }),
  rojo: est({ color: '#d8453b', roughness: 0.45, metalness: 0.2 }),
  ledAmbar: est({ color: '#1a1208', emissive: '#efbe76', emissiveIntensity: 1.6 }),
  vidrio: new THREE.MeshStandardMaterial({
    color: '#0a1016', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.16, depthWrite: false,
  }),
  invisible: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
};

// Materiales emisivos del color de una estación (compartidos entre piezas del mismo color).
function acentoMat(color, intensidad = 1.2) {
  return cacheado(`acento|${color}|${intensidad}`, () => new THREE.MeshStandardMaterial({
    color: '#10161d', emissive: color, emissiveIntensity: intensidad, roughness: 0.5,
  }));
}

const G = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  cil: new THREE.CylinderGeometry(1, 1, 1, 12),
  tornillo: new THREE.CylinderGeometry(0.022, 0.022, 0.016, 8).rotateX(Math.PI / 2),
  cono: new THREE.CylinderGeometry(0.2, 0.52, 1.6, 32, 1, true),
  pantalla: new THREE.PlaneGeometry(2.3, 1.35),
  rotulo: new THREE.PlaneGeometry(2.6, 0.5),
};

// Base trapezoidal: perfil lateral (u = z, v = y) extruido a lo ancho; el frente baja inclinado.
G.base = (() => {
  const forma = new THREE.Shape();
  forma.moveTo(-0.7, 0.4);
  forma.lineTo(0.68, 0.4);
  forma.lineTo(0.48, 1.05);
  forma.lineTo(-0.7, 1.05);
  forma.closePath();
  const prof = 2.44;
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: prof, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(prof / 2, 0, 0);
  return geo;
})();

// Mesa de control: placa con muesca semicircular al frente para que el disco holográfico no la atraviese.
G.mesa = (() => {
  const forma = new THREE.Shape();
  const r = 0.66;
  const cz = 0.62;
  const a = Math.asin((0.5 - cz) / r); // ángulo donde el círculo corta el borde frontal (z = 0,5)
  forma.moveTo(-1.25, -0.55);
  forma.lineTo(1.25, -0.55);
  forma.lineTo(1.25, 0.5);
  forma.lineTo(Math.cos(a) * r, 0.5);
  forma.absarc(0, cz, r, a, Math.PI - a, true);
  forma.lineTo(-1.25, 0.5);
  forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 24,
  });
  geo.rotateX(Math.PI / 2); // y de la forma → z; el espesor baja desde la cara superior
  return geo;
})();

// Cables: de la máquina a la mesa lateral y de la máquina a la columna del holograma.
const tubo = (puntos) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p))), 48, 0.028, 6, false);
G.cableA = tubo([[1.25, 0.32, 0.5], [1.4, 0.12, 0.8], [1.65, 0.03, 0.9], [1.9, 0.03, 0.7], [1.95, 0.1, 0.55], [1.95, 0.4, 0.5]]);
G.cableB = tubo([[-1.5, 1.0, 0.1], [-1.72, 0.7, 0.3], [-1.8, 0.25, 0.6], [-1.6, 0.03, 0.95], [-1.1, 0.03, 1.1], [-0.5, 0.03, 1.0], [-0.2, 0.05, 0.95]]);

// Toberas del accesorio «cohete» (superficie de revolución con espesor).
G.tobera = new THREE.LatheGeometry([
  [0.07, 0], [0.085, -0.06], [0.12, -0.14], [0.17, -0.23], [0.22, -0.3], [0.24, -0.33],
  [0.225, -0.33], [0.205, -0.3], [0.155, -0.23], [0.105, -0.14], [0.07, -0.06], [0.055, 0],
].map(([r, y]) => new THREE.Vector2(r, y)), 32);

// Platillo de la antena (casquete esférico abierto).
G.platillo = new THREE.SphereGeometry(0.36, 32, 10, 0, TAU, 0, 0.95);

/* ───────────────────────── datos de instancias (constantes) ───────────────────────── */
// Cada fila: [x, y, z, rotX, rotY, rotZ, escX, escY, escZ]

const TECLAS = [];
for (let j = 0; j < 4; j++) {
  for (let i = 0; i < 10; i++) TECLAS.push([-0.25 + (i - 4.5) * 0.14, 0.05, -0.47 + j * 0.1, 0, 0, 0, 0.105, 0.05, 0.085]);
}

const TORNILLOS_GEN = [];
for (const sx of [-1, 1]) {
  for (const y of [0.5, 1.4, 2.3, 3.2]) TORNILLOS_GEN.push([sx * 1.35, y, 0.385]);
  for (const y of [3.1, 3.52]) TORNILLOS_GEN.push([sx * 1.43, y, 0.13]);
}
const TORNILLOS_BISEL = [[-1.22, 0.74, 0.012], [1.22, 0.74, 0.012], [-1.22, -0.74, 0.012], [1.22, -0.74, 0.012]];
const TORNILLOS_PANEL = [[-0.58, 0.14, 0.02], [0.58, 0.14, 0.02], [-0.58, -0.14, 0.02], [0.58, -0.14, 0.02]];

const PATAS_TALLO = [];
const PATAS_PIE = [];
for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) {
    PATAS_TALLO.push([sx * 1.15, 0.12, sz * 0.55, 0, 0, 0, 0.05, 0.16, 0.05]);
    PATAS_PIE.push([sx * 1.15, 0.02, sz * 0.55, 0, 0, 0, 0.1, 0.04, 0.1]);
  }
}

const REJILLAS = [];
for (const sx of [-1, 1]) {
  for (let k = 0; k < 6; k++) REJILLAS.push([sx * 1.515, 0.5 + k * 0.1, -0.1, 0, 0, 0, 0.03, 0.04, 0.45]);
}
const REJILLA_FRENTE = [];
for (let k = 0; k < 5; k++) REJILLA_FRENTE.push([-0.3, -0.12 + k * 0.06, 0.02, 0, 0, 0, 0.55, 0.02, 0.012]);

// Matrices de una lista de instancias (se aplica a un InstancedMesh con geometría y material compartidos).
function Instancias({ geometria, material, datos, sombra = false }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const malla = ref.current;
    const o = new THREE.Object3D();
    datos.forEach((d, i) => {
      o.position.set(d[0], d[1], d[2]);
      o.rotation.set(d[3] || 0, d[4] || 0, d[5] || 0);
      o.scale.set(d[6] ?? 1, d[7] ?? 1, d[8] ?? 1);
      o.updateMatrix();
      malla.setMatrixAt(i, o.matrix);
    });
    malla.instanceMatrix.needsUpdate = true;
  }, [datos]);
  return <instancedMesh ref={ref} args={[null, null, datos.length]} geometry={geometria} material={material} frustumCulled={false} castShadow={sombra} />;
}

// Caja con bisel (RoundedBox) con valores por omisión del taller.
function Caja({ tam, pos, rot, material, radio = 0.04, suav = 3, sombra = false }) {
  return <RoundedBox args={tam} radius={radio} smoothness={suav} position={pos} rotation={rot} material={material} castShadow={sombra} receiveShadow={sombra} />;
}

// Caja simple (sin bisel) reutilizando una geometría unitaria.
function Bloque({ tam, pos, rot, material }) {
  return <mesh geometry={G.caja} scale={tam} position={pos} rotation={rot} material={material} />;
}

function Cilindro({ r, h, pos, rot, material, seg }) {
  return <mesh geometry={G.cil} scale={[r, h, r]} position={pos} rotation={rot} material={material} {...(seg ? {} : {})} />;
}

/* ───────────────────────── accesorios por estación ───────────────────────── */
// Cada accesorio se dibuja con y = 0 en la cara superior de la mesa lateral.

function AccCohete({ acento }) {
  return (
    <group>
      <Cilindro r={0.3} h={0.04} pos={[0, 0.02, 0]} material={MAT.acero} />
      <Bloque tam={[0.03, 0.5, 0.03]} pos={[-0.17, 0.29, 0]} material={MAT.acero} />
      <Bloque tam={[0.03, 0.5, 0.03]} pos={[0.17, 0.29, 0]} material={MAT.acero} />
      <mesh position={[0, 0.47, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.acero}>
        <torusGeometry args={[0.18, 0.018, 8, 24]} />
      </mesh>
      <Cilindro r={0.13} h={0.26} pos={[0, 0.5, 0]} material={MAT.aluminio} />
      <mesh position={[0, 0.63, 0]} scale={[1, 0.6, 1]} material={MAT.oro}>
        <sphereGeometry args={[0.13, 16, 10]} />
      </mesh>
      <Cilindro r={0.035} h={0.08} pos={[0, 0.74, 0]} material={MAT.acero} />
      <mesh position={[0, 0.4, 0]} geometry={G.tobera} material={MAT.cobre} />
      <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} material={acento}>
        <torusGeometry args={[0.235, 0.01, 6, 32]} />
      </mesh>
    </group>
  );
}

function AccPropulsion({ acento }) {
  return (
    <group>
      <Cilindro r={0.13} h={0.1} pos={[-0.15, 0.05, 0]} material={MAT.oscuro} />
      <Cilindro r={0.1} h={0.1} pos={[0.2, 0.05, 0.05]} material={MAT.oscuro} />
      <mesh position={[-0.15, 0.31, 0]} material={MAT.aluminio}><sphereGeometry args={[0.21, 24, 16]} /></mesh>
      <mesh position={[-0.15, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.acero}><torusGeometry args={[0.212, 0.014, 6, 32]} /></mesh>
      <mesh position={[0.2, 0.25, 0.05]} material={MAT.aluminio}><sphereGeometry args={[0.16, 24, 16]} /></mesh>
      <mesh position={[0.2, 0.25, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={acento}><torusGeometry args={[0.162, 0.01, 6, 32]} /></mesh>
      {/* tubería entre tanques */}
      <Cilindro r={0.015} h={0.35} pos={[0.02, 0.58, 0.03]} rot={[0, 0, Math.PI / 2]} material={MAT.acero} />
      <Cilindro r={0.015} h={0.16} pos={[-0.15, 0.51, 0]} material={MAT.acero} />
      <Cilindro r={0.015} h={0.28} pos={[0.2, 0.46, 0.05]} material={MAT.acero} />
      {/* manómetro */}
      <Cilindro r={0.075} h={0.03} pos={[-0.15, 0.62, 0.03]} rot={[Math.PI / 2, 0, 0]} material={MAT.carbon} />
      <mesh position={[-0.15, 0.62, 0.047]} material={MAT.ledAmbar}><circleGeometry args={[0.058, 20]} /></mesh>
      <Bloque tam={[0.008, 0.045, 0.004]} pos={[-0.15, 0.64, 0.05]} rot={[0, 0, -0.6]} material={MAT.goma} />
    </group>
  );
}

function AccEnergia({ acento }) {
  const solar = useMemo(() => new THREE.MeshStandardMaterial({ map: texturaSolar(), roughness: 0.25, metalness: 0.6 }), []);
  useEffect(() => () => solar.dispose(), [solar]);
  return (
    <group>
      <Cilindro r={0.22} h={0.04} pos={[0, 0.02, 0]} material={MAT.acero} />
      <Cilindro r={0.03} h={0.5} pos={[0, 0.29, 0]} material={MAT.aluminio} />
      <mesh position={[0, 0.55, 0]} material={MAT.acero}><sphereGeometry args={[0.055, 12, 8]} /></mesh>
      <group position={[0, 0.58, 0]} rotation={[0.6, 0, 0]}>
        <Bloque tam={[0.78, 0.02, 0.5]} pos={[0, 0, 0]} material={MAT.blanco} />
        <mesh position={[0, 0.0115, 0]} rotation={[-Math.PI / 2, 0, 0]} material={solar}><planeGeometry args={[0.72, 0.44]} /></mesh>
      </group>
      <Bloque tam={[0.16, 0.12, 0.12]} pos={[0.28, 0.1, 0.1]} material={MAT.oscuro} />
      <Bloque tam={[0.03, 0.03, 0.01]} pos={[0.28, 0.12, 0.165]} material={acento} />
    </group>
  );
}

function AccAntena({ acento, giro }) {
  return (
    <group>
      <Cilindro r={0.2} h={0.04} pos={[0, 0.02, 0]} material={MAT.acero} />
      <Cilindro r={0.035} h={0.34} pos={[0, 0.21, 0]} material={MAT.aluminio} />
      <group ref={giro} position={[0, 0.42, 0]}>
        <Bloque tam={[0.18, 0.04, 0.06]} pos={[0, 0.02, 0]} material={MAT.acero} />
        <group position={[0, 0.2, 0]} rotation={[Math.PI + 0.7, 0, 0]}>
          <mesh geometry={G.platillo} material={MAT.blanco} side={THREE.DoubleSide} />
          <Cilindro r={0.011} h={0.3} pos={[0, 0.21, 0]} material={MAT.acero} />
          <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]} material={acento}><coneGeometry args={[0.035, 0.06, 10]} /></mesh>
        </group>
      </group>
    </group>
  );
}

function AccBlindaje({ acento }) {
  const placas = [[-0.22, MAT.acero], [0, MAT.aluminio], [0.22, MAT.oscuro]];
  return (
    <group>
      <Bloque tam={[0.8, 0.05, 0.46]} pos={[0, 0.025, 0]} material={MAT.oscuro} />
      {[-0.37, 0.37].map((x) => [-0.2, 0.2].map((z) => (
        <Bloque key={`${x}${z}`} tam={[0.03, 0.55, 0.03]} pos={[x, 0.32, z]} material={MAT.acero} />
      )))}
      <Bloque tam={[0.8, 0.03, 0.03]} pos={[0, 0.6, 0.2]} material={MAT.acero} />
      <Bloque tam={[0.8, 0.03, 0.03]} pos={[0, 0.6, -0.2]} material={MAT.acero} />
      {placas.map(([x, mat], i) => (
        <group key={i} position={[x, 0.31, 0]}>
          <Caja tam={[0.05, 0.46, 0.36]} radio={0.015} suav={2} material={mat} />
          <Bloque tam={[0.056, 0.02, 0.3]} pos={[0, 0.2, 0]} material={acento} />
        </group>
      ))}
    </group>
  );
}

function AccInstrumentos({ acento }) {
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = i * 2.094 + 0.5;
        return (
          <Cilindro key={i} r={0.013} h={0.54} pos={[Math.sin(a) * 0.13, 0.26, Math.cos(a) * 0.13]}
            rot={[-Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28]} material={MAT.acero} />
        );
      })}
      <mesh position={[0, 0.52, 0]} material={MAT.acero}><sphereGeometry args={[0.05, 12, 8]} /></mesh>
      <group position={[0, 0.54, 0]} rotation={[0.9, 0, 0]}>
        <Cilindro r={0.055} h={0.5} pos={[0, 0.12, 0]} material={MAT.blanco} />
        <Cilindro r={0.075} h={0.08} pos={[0, 0.38, 0]} material={MAT.panel} />
        <mesh position={[0, 0.425, 0]} rotation={[Math.PI / 2, 0, 0]} material={acento}><torusGeometry args={[0.072, 0.01, 6, 24]} /></mesh>
        <mesh position={[0, 0.428, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.carbon}><circleGeometry args={[0.066, 20]} /></mesh>
        <Cilindro r={0.035} h={0.14} pos={[0, -0.2, 0]} material={MAT.goma} />
        <Cilindro r={0.02} h={0.25} pos={[0.09, 0.1, 0]} material={MAT.oscuro} />
      </group>
    </group>
  );
}

const LATAS = [['#ff7ab6', -0.27, 0.12], ['#5cc8ff', -0.03, 0.17], ['#ffd166', -0.2, -0.16]];

function AccEstetica() {
  return (
    <group>
      {LATAS.map(([c, x, z]) => (
        <group key={c} position={[x, 0, z]}>
          <Cilindro r={0.09} h={0.15} pos={[0, 0.075, 0]} material={MAT.aluminio} />
          <Cilindro r={0.0925} h={0.045} pos={[0, 0.07, 0]} material={acentoMat(c, 0.35)} />
          <mesh position={[0, 0.152, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.acero}><torusGeometry args={[0.09, 0.008, 6, 20]} /></mesh>
          <Cilindro r={0.07} h={0.01} pos={[0, 0.153, 0]} material={acentoMat(c, 0.5)} />
        </group>
      ))}
      <group position={[0.22, 0.06, 0.12]} rotation={[0, 0.6, 0]}>
        <Cilindro r={0.05} h={0.26} rot={[0, 0, Math.PI / 2]} material={MAT.blanco} />
        <Cilindro r={0.052} h={0.09} pos={[-0.06, 0, 0]} rot={[0, 0, Math.PI / 2]} material={acentoMat('#ff7ab6', 0.5)} />
        <Cilindro r={0.008} h={0.14} pos={[0.14, 0.07, 0]} material={MAT.acero} />
        <Cilindro r={0.02} h={0.16} pos={[0.14, 0.14, 0.07]} rot={[Math.PI / 2, 0, 0]} material={MAT.goma} />
      </group>
    </group>
  );
}

function Accesorio({ id, acento, giro }) {
  switch (id) {
    case 'cohete': return <AccCohete acento={acento} />;
    case 'propulsion': return <AccPropulsion acento={acento} />;
    case 'energia': return <AccEnergia acento={acento} />;
    case 'antena': return <AccAntena acento={acento} giro={giro} />;
    case 'blindaje': return <AccBlindaje acento={acento} />;
    case 'instrumentos': return <AccInstrumentos acento={acento} />;
    case 'estetica': return <AccEstetica />;
    default: return null;
  }
}

/* ───────────────────────── la máquina ───────────────────────── */

export default function Maquina({ estacion, estado = 'reposo', completa = false, calidad = 'alta', alPulsar, children }) {
  const t = useT();
  const { id, n, color, icono } = estacion;
  const titulo = t(`hangar.estacion.${id}.titulo`, null, estacion.titulo);
  const corto = t(`hangar.estacion.${id}.corto`, null, estacion.corto);
  const colorLed = completa ? VERDE : color;
  const sombra = calidad !== 'baja';
  const suav = calidad === 'alta' ? 4 : 2;
  const reducido = useMemo(reducirMovimiento, []);

  const pantalla = useMemo(crearPantalla, []);
  const led = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0c1218', emissive: colorLed, emissiveIntensity: 1.8, roughness: 0.4,
  }), [colorLed]);
  const mt = useMemo(() => ({
    pantalla: new THREE.MeshStandardMaterial({
      color: '#04070b', emissive: '#ffffff', emissiveMap: pantalla.tex, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0,
    }),
    rotulo: new THREE.MeshStandardMaterial({
      color: '#04070b', emissive: '#ffffff', emissiveMap: texturaRotuloLocal(corto, color, icono), emissiveIntensity: 0.9, roughness: 0.4,
    }),
    tecla: new THREE.MeshStandardMaterial({ color: '#202c38', emissive: color, emissiveIntensity: 0.1, roughness: 0.5, metalness: 0.2 }),
    teclado: new THREE.MeshStandardMaterial({ color: '#06090d', emissive: color, emissiveIntensity: 0.6, roughness: 0.6 }),
    anillo: new THREE.MeshStandardMaterial({ color: '#06090d', emissive: color, emissiveIntensity: 2.2, roughness: 0.4 }),
    brillo: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false }),
    cono: new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.3, alphaMap: texturaDegradado(), blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
    destello: new THREE.MeshBasicMaterial({
      map: texturaBrillo(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    insignia: new THREE.MeshBasicMaterial({ map: texturaInsignia(), transparent: true, toneMapped: false }),
  }), [pantalla, corto, color, icono]);
  const acento = useMemo(() => acentoMat(color, 1.2), [color]);

  useEffect(() => () => pantalla.tex.dispose(), [pantalla]);
  useEffect(() => () => led.dispose(), [led]);
  useEffect(() => () => Object.values(mt).forEach((m) => m.dispose()), [mt]);

  // Pantalla estática en reposo: se pinta una vez al cambiar algo; animada solo en siguiente/activa (10 Hz).
  useEffect(() => {
    dibujarPantalla(pantalla.ctx, { color, titulo, icono, estado, completa, n }, 0);
    pantalla.tex.needsUpdate = true;
  }, [pantalla, color, titulo, icono, estado, completa, n]);

  const hover = useRef(false);
  const hv = useRef(0);
  const ultimo = useRef(0);
  const holo = useRef();
  const antena = useRef();

  useEffect(() => () => { if (hover.current) document.body.style.cursor = 'auto'; }, []);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    hv.current += ((hover.current ? 1 : 0) - hv.current) * Math.min(1, dt * 10);
    const h = 1 + 0.2 * hv.current;
    let base = 0.35;
    if (estado === 'siguiente') base = 0.9 * (reducido ? 1 : 0.8 + 0.2 * Math.sin(t * 4.2));
    else if (estado === 'activa') base = 1.4;
    mt.pantalla.emissiveIntensity = base * h;
    mt.rotulo.emissiveIntensity = 0.9 * h;
    mt.anillo.emissiveIntensity = 2.2 * h;
    mt.teclado.emissiveIntensity = 0.6 * h;
    led.emissiveIntensity = 1.8 * h;
    if (estado !== 'reposo' && !reducido && t - ultimo.current >= 0.1) {
      ultimo.current = t;
      dibujarPantalla(pantalla.ctx, { color, titulo, icono, estado, completa, n }, t);
      pantalla.tex.needsUpdate = true;
    }
    if (!reducido) {
      if (holo.current) holo.current.rotation.y += dt * 0.5;
      if (antena.current) antena.current.rotation.y += dt * 0.8;
    }
  });

  const intensidadLuz = estado === 'activa' ? 10 : estado === 'siguiente' ? 6 : 4;
  const chispas = calidad === 'alta' ? 12 : calidad === 'media' ? 6 : 0;

  return (
    <group position={estacion.pos} rotation={[0, estacion.rotY, 0]}>
      {/* ── base: zócalo, cuerpo trapezoidal, patas ── */}
      <Caja tam={[2.7, 0.2, 1.5]} pos={[0, 0.3, 0]} material={MAT.oscuro} radio={0.04} suav={suav} sombra={sombra} />
      <mesh geometry={G.base} material={MAT.blanco} castShadow={sombra} receiveShadow={sombra} />
      <Instancias geometria={G.cil} material={MAT.acero} datos={PATAS_TALLO} />
      <Instancias geometria={G.cil} material={MAT.goma} datos={PATAS_PIE} />

      {/* panel frontal inclinado con rejilla, luces de estado y tornillos */}
      <group position={[0, 0.74, 0.595]} rotation={[-0.298, 0, 0]}>
        <Caja tam={[1.3, 0.34, 0.03]} radio={0.01} suav={2} material={MAT.panel} />
        <Instancias geometria={G.caja} material={MAT.carbon} datos={REJILLA_FRENTE} />
        <Bloque tam={[0.1, 0.1, 0.014]} pos={[0.3, 0, 0.02]} material={led} />
        <Bloque tam={[0.1, 0.1, 0.014]} pos={[0.45, 0, 0.02]} material={MAT.ledAmbar} />
        <Bloque tam={[0.05, 0.05, 0.014]} pos={[0.3, -0.12, 0.02]} material={acento} />
        <Instancias geometria={G.tornillo} material={MAT.acero} datos={TORNILLOS_PANEL.map(([x, y, z]) => [x * 1.05, y, z])} />
      </group>

      {/* ── espina trasera, pilares con tira LED, viga con letrero ── */}
      <Caja tam={[2.2, 2.0, 0.5]} pos={[0, 2.05, -0.45]} material={MAT.blanco} radio={0.06} suav={suav} sombra={sombra} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Caja tam={[0.3, 3.25, 0.95]} pos={[sx * 1.35, 1.825, -0.1]} material={MAT.blanco} radio={0.06} suav={suav} sombra={sombra} />
          <mesh geometry={G.caja} scale={[0.06, 2.4, 0.03]} position={[sx * 1.35, 1.9, 0.39]} material={led} />
          <Bloque tam={[0.1, 0.04, 0.04]} pos={[sx * 1.35, 3.1, 0.385]} material={led} />
        </group>
      ))}
      <Instancias geometria={G.caja} material={MAT.carbon} datos={REJILLAS} />
      <Caja tam={[3.0, 0.56, 0.34]} pos={[0, 3.32, -0.05]} material={MAT.oscuro} radio={0.06} suav={suav} sombra={sombra} />
      <mesh geometry={G.rotulo} material={mt.rotulo} position={[0, 3.32, 0.125]} />
      <Bloque tam={[2.6, 0.02, 0.01]} pos={[0, 3.06, 0.122]} material={led} />
      <Instancias geometria={G.tornillo} material={MAT.acero} datos={TORNILLOS_GEN.map(([x, y, z]) => [x, y, z])} />

      {/* insignia de completada */}
      <group visible={completa} position={[1.0, 3.85, 0.02]} rotation={[-0.25, 0, 0]}>
        <Bloque tam={[0.06, 0.28, 0.06]} pos={[0, -0.16, -0.02]} material={MAT.oscuro} />
        <Cilindro r={0.23} h={0.05} pos={[0, 0, -0.03]} rot={[Math.PI / 2, 0, 0]} material={MAT.carbon} />
        <mesh material={mt.insignia}><circleGeometry args={[0.21, 24]} /></mesh>
      </group>

      {/* ── pantalla: bisel, cristal, contenido animado y reflejo ── */}
      <group position={[0, 2.3, -0.02]} rotation={[-0.14, 0, 0]}>
        <Caja tam={[2.58, 1.62, 0.2]} pos={[0, 0, -0.1]} material={MAT.carbon} radio={0.07} suav={suav} />
        <mesh geometry={G.pantalla} material={mt.pantalla} position={[0, 0, 0.004]} />
        <mesh geometry={G.pantalla} material={MAT.vidrio} position={[0, 0, 0.012]} />
        <mesh geometry={G.pantalla} material={mt.destello} position={[0, 0, 0.016]} />
        <Bloque tam={[2.3, 0.016, 0.01]} pos={[0, -0.7, 0.008]} material={led} />
        <Instancias geometria={G.tornillo} material={MAT.acero} datos={TORNILLOS_BISEL} />
      </group>

      {/* ── mesa de control inclinada: teclado, perillas, palanca, lector ── */}
      <group position={[0, 1.12, 0.3]} rotation={[0.314, 0, 0]}>
        <mesh geometry={G.mesa} material={MAT.mesa} castShadow={sombra} />
        <Bloque tam={[1.45, 0.012, 0.46]} pos={[-0.25, 0.02, -0.32]} material={mt.teclado} />
        <Instancias geometria={G.caja} material={mt.tecla} datos={TECLAS} />
        {[0.8, 1.02].map((x) => (
          <group key={x} position={[x, 0, -0.3]}>
            <Cilindro r={0.075} h={0.1} pos={[0, 0.05, 0]} material={MAT.aluminio} />
            <Bloque tam={[0.014, 0.012, 0.06]} pos={[0, 0.102, -0.02]} material={acento} />
          </group>
        ))}
        <group position={[0.95, 0.02, 0.15]}>
          <Cilindro r={0.07} h={0.04} pos={[0, 0.02, 0]} material={MAT.acero} />
          <Cilindro r={0.018} h={0.22} pos={[0.03, 0.14, 0]} rot={[0, 0, -0.25]} material={MAT.aluminio} />
          <mesh position={[0.06, 0.25, 0]} material={MAT.rojo}><sphereGeometry args={[0.045, 12, 8]} /></mesh>
        </group>
        <Caja tam={[0.34, 0.05, 0.2]} pos={[-0.95, 0.045, 0.25]} material={MAT.carbon} radio={0.015} suav={2} />
        <Bloque tam={[0.26, 0.012, 0.02]} pos={[-0.95, 0.072, 0.25]} material={led} />
        <Bloque tam={[0.03, 0.012, 0.03]} pos={[-0.84, 0.072, 0.31]} material={MAT.ledAmbar} />
      </group>

      {/* ── plataforma holográfica ── */}
      <Cilindro r={0.3} h={0.06} pos={[0, 0.03, 0.95]} material={MAT.oscuro} />
      <Cilindro r={0.12} h={1.1} pos={[0, 0.55, 0.95]} material={MAT.mesa} />
      <Cilindro r={0.55} h={0.06} pos={[0, 1.12, 0.95]} material={MAT.carbon} />
      <mesh position={[0, 1.157, 0.95]} rotation={[Math.PI / 2, 0, 0]} material={mt.anillo}>
        <torusGeometry args={[0.55, 0.022, 8, 48]} />
      </mesh>
      <mesh position={[0, 1.153, 0.95]} rotation={[-Math.PI / 2, 0, 0]} material={mt.brillo}>
        <circleGeometry args={[0.5, 40]} />
      </mesh>
      <mesh geometry={G.cono} material={mt.cono} position={[0, 1.95, 0.95]} />
      {chispas > 0 && !reducido && (
        <Sparkles count={chispas} scale={[1.1, 1.7, 1.1]} size={3} speed={0.5} color={color} position={[0, 1.95, 0.95]} />
      )}
      <group ref={holo} position={[0, 1.95, 0.95]}>{children}</group>

      {/* ── mesa lateral con el accesorio de la estación ── */}
      <group position={[1.95, 0, 0.25]}>
        <Bloque tam={[0.7, 0.05, 0.6]} pos={[0, 0.025, 0.0]} material={MAT.goma} />
        <Caja tam={[0.5, 0.95, 0.5]} pos={[0, 0.5, 0]} material={MAT.oscuro} radio={0.03} suav={2} sombra={sombra} />
        <Caja tam={[0.85, 0.06, 0.7]} pos={[0, 1.0, 0]} material={MAT.mesa} radio={0.02} suav={2} sombra={sombra} />
        <group position={[0, 1.03, 0]}>
          <Accesorio id={id} acento={acento} giro={antena} />
        </group>
      </group>

      {/* cables */}
      <mesh geometry={G.cableA} material={MAT.goma} />
      <mesh geometry={G.cableB} material={MAT.goma} />

      {/* luz propia sobre la mesa */}
      <pointLight position={[0, 2.0, 1.1]} color={color} intensity={intensidadLuz} distance={6} decay={2} />

      {/* caja invisible de interacción que cubre toda la máquina */}
      <mesh
        position={[0.5, 2.1, 0.1]}
        material={MAT.invisible}
        onClick={(e) => { e.stopPropagation(); if (alPulsar) alPulsar(id); }}
        onPointerOver={(e) => { e.stopPropagation(); hover.current = true; document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { hover.current = false; document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[4.6, 4.2, 1.8]} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── banco de pruebas ───────────────────────── */

export function Demo({ calidad = 'alta' }) {
  const [activa, setActiva] = useState(1);
  useEffect(() => {
    const i = setInterval(() => setActiva((a) => (a % 6) + 1), 3000);
    return () => clearInterval(i);
  }, []);
  const siguiente = (activa % 6) + 1;
  // En el banco se ignoran pos/rotY reales: las 7 máquinas en fila, separadas 4 unidades.
  const filas = useMemo(() => ESTACIONES.map((e, i) => ({ ...e, pos: [0, 0, 0], rotY: 0, x: (i - 3) * 4 })), []);

  return (
    <group>
      <ambientLight intensity={0.5} color="#8fa9c4" />
      <directionalLight position={[6, 12, 9]} intensity={2} color="#fff1dc" />
      <hemisphereLight args={['#8fa9c4', '#131c26', 0.35]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0.5]}>
        <planeGeometry args={[40, 14]} />
        <meshStandardMaterial color="#131c26" roughness={0.4} metalness={0.4} />
      </mesh>
      {filas.map((e, i) => {
        const estado = i === activa ? 'activa' : i === siguiente ? 'siguiente' : 'reposo';
        return (
          <group key={e.id} position={[e.x, 0, 0]}>
            <Maquina estacion={e} estado={estado} completa={i === 0} calidad={calidad}>
              {estado === 'activa' && (
                <mesh>
                  <sphereGeometry args={[0.4, 32, 20]} />
                  <meshStandardMaterial color={e.color} metalness={0.7} roughness={0.25} emissive={e.color} emissiveIntensity={0.25} />
                </mesh>
              )}
            </Maquina>
          </group>
        );
      })}
    </group>
  );
}

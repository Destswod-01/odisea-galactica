// Texturas generadas por código (sin descargar imágenes): bandas de Júpiter y celdas solares.
import * as THREE from 'three';

const cache = {};

export function texturaJupiter() {
  if (cache.jupiter) return cache.jupiter;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  // Bandas finas con colores cercanos: zonas claras y cinturones oscuros, con turbulencia en los bordes.
  const colores = ['#efe2c8', '#e2c9a4', '#d4ad82', '#c99a6c', '#e8d6b6', '#b98458', '#f2e6cf', '#d8b88f', '#c08d60', '#e6d0ac'];
  let y = 0;
  let i = 0;
  while (y < 512) {
    const h = 8 + ((i * 29) % 22);
    g.fillStyle = colores[i % colores.length];
    g.fillRect(0, y, 1024, h + 2);
    for (let x = 0; x < 1024; x += 4) {
      const o = Math.sin(x * 0.02 + i * 1.7) * 3 + Math.sin(x * 0.09 + i) * 1.5;
      g.fillStyle = colores[(i + 1) % colores.length];
      g.globalAlpha = 0.6;
      g.fillRect(x, y + h - 2 + o, 4, 4);
      g.globalAlpha = 1;
    }
    y += h;
    i++;
  }
  // Ruido fino para que no se vea plano.
  for (let k = 0; k < 6000; k++) {
    g.fillStyle = `rgba(${k % 2 ? '255,255,255' : '90,50,20'},0.05)`;
    g.fillRect((k * 7919) % 1024, (k * 104729) % 512, 3, 1);
  }
  // Remolinos pequeños.
  for (let k = 0; k < 120; k++) {
    g.fillStyle = `rgba(255,255,255,${0.04 + (k % 5) * 0.02})`;
    g.beginPath();
    g.ellipse((k * 211) % 1024, (k * 97) % 512, 6 + (k % 7) * 3, 2 + (k % 3), 0, 0, Math.PI * 2);
    g.fill();
  }
  // Gran Mancha Roja.
  const grd = g.createRadialGradient(640, 330, 3, 640, 330, 32);
  grd.addColorStop(0, '#c2512f'); grd.addColorStop(0.6, '#b5452f'); grd.addColorStop(1, 'rgba(181,69,47,0)');
  g.fillStyle = grd;
  g.beginPath(); g.ellipse(640, 330, 34, 17, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return (cache.jupiter = t);
}

export function texturaCeldas() {
  if (cache.celdas) return cache.celdas;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#0d1f4d';
  g.fillRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x += 16) {
    for (let y = 0; y < 64; y += 16) {
      g.fillStyle = (x + y) % 32 ? '#152a49' : '#1b3455';
      g.fillRect(x + 1, y + 1, 14, 14);
    }
  }
  g.strokeStyle = '#7fb0ff';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, 255, 63);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (cache.celdas = t);
}

export function texturaTierra() {
  if (cache.tierra) return cache.tierra;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1f5fbf';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#3f8a3a';
  for (let k = 0; k < 18; k++) {
    g.beginPath();
    g.ellipse((k * 131) % 512, 50 + ((k * 71) % 160), 20 + (k % 5) * 12, 10 + (k % 4) * 8, k, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (let k = 0; k < 40; k++) {
    g.beginPath();
    g.ellipse((k * 89) % 512, (k * 53) % 256, 18 + (k % 4) * 8, 3 + (k % 3), 0.3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (cache.tierra = t);
}

export function texturaLuna() {
  if (cache.luna) return cache.luna;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9a9a9a';
  g.fillRect(0, 0, 1024, 512);
  // «Mares» oscuros y cráteres con borde claro.
  g.fillStyle = 'rgba(70,70,75,.55)';
  for (let k = 0; k < 9; k++) {
    g.beginPath();
    g.ellipse((k * 233) % 1024, 120 + ((k * 97) % 260), 60 + (k % 4) * 30, 40 + (k % 3) * 20, k, 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 260; k++) {
    const x = (k * 7919) % 1024, y = (k * 104729) % 512, r = 2 + (k % 9) * 1.6;
    g.fillStyle = 'rgba(60,60,60,.35)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(220,220,220,.35)';
    g.beginPath(); g.arc(x - 0.5, y - 0.5, r, Math.PI, Math.PI * 1.8); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (cache.luna = t);
}

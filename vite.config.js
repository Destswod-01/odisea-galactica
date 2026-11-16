import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import version from './version.json'

// https://vite.dev/config/
// Modo equipo en red: en desarrollo y en vista previa, /orbita-2/sala va al servidor de salas local (node servidor/sala.mjs).
const proxySala = { '/orbita-2/sala': { target: `ws://127.0.0.1:${process.env.SALA_PUERTO || 3240}`, ws: true } }

export default defineConfig({
  base: './',
  server: { proxy: proxySala },
  preview: { proxy: proxySala },
  plugins: [react(), {
    name: 'version-publica',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(version) }); },
  }],
})

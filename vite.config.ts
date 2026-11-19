import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    // The preview only exposes this port, so forward API calls to the local backend.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
})

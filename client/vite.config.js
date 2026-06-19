import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_API_URL can be set in .env.local to point the dev proxy at a non-default
// backend (e.g. a staging server). In production this file is irrelevant —
// the built client uses import.meta.env.VITE_API_URL at runtime.
const backendUrl = process.env.VITE_API_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendUrl,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

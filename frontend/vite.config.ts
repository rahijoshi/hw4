import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The FastAPI backend's documented default is :8000 (see README.md). Proxying
// /api and /images through the dev server means the front end only ever uses
// same-origin relative URLs, so there is no CORS to think about and no
// hard-coded host in the application code. Override with VITE_API_TARGET if
// 8000 is already taken on this machine.
const API = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/images': { target: API, changeOrigin: true },
    },
  },
})

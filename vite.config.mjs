import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMAX chat-viewer prototype. Self-contained: no imports from the surrounding
// repo. /api and /static proxy to the mock enrichment service layer
// (server.js), which stands in for the production enrichment services — the SPA only
// ever sees production-shaped JSON, so cutover is a config change.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    proxy: {
      '/api': 'http://localhost:5177',
      '/static': 'http://localhost:5177'
    }
  },
  build: {
    sourcemap: true
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // AI generation goes through the helper server (holds the API key)
      '/api': 'http://localhost:8787',
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/commands',
      '@codemirror/autocomplete',
      '@codemirror/search',
      '@codemirror/lint',
    ],
  },
  optimizeDeps: {
    // Escludiamo questi pacchetti dal pre-bundling di Vite: così entrambi usano
    // direttamente l'unico @codemirror/state in node_modules invece di averne
    // ognuno una copia inline (causa del "multiple instances of @codemirror/state")
    exclude: ['@uiw/react-codemirror', '@codemirror/lang-json'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})

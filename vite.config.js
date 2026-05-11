import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separa CodeMirror in un chunk distinto per il caching del browser.
        // Non si usa React.lazy() perché @uiw/react-codemirror (CJS) e
        // @codemirror/lang-json (ESM) creano due istanze di @codemirror/state
        // sui boundary CJS/ESM di Vite, rompendo gli instanceof check.
        manualChunks: {
          codemirror: [
            '@uiw/react-codemirror',
            '@codemirror/lang-json',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/commands',
            '@codemirror/autocomplete',
            '@codemirror/search',
            '@codemirror/lint',
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})

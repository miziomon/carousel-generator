import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['@codemirror/state', '@codemirror/view', '@codemirror/language'],
  },
  optimizeDeps: {
    // @codemirror/state deve essere un entry separato: così @uiw/react-codemirror
    // e @codemirror/lang-json lo importano come modulo esterno condiviso invece
    // di bundlarlo ognuno per conto proprio (causa del "multiple instances" error)
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@uiw/react-codemirror',
      '@codemirror/lang-json',
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})

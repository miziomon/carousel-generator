import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Librerie async-only: restano nel chunk lazy che le importa
          if (id.includes('jszip') || id.includes('html-to-image') || id.includes('jspdf')) return
          // react-markdown + ecosistema unified/remark: usato solo dall'AI Generator (lazy)
          // — lasciato nel chunk lazy così non appare nel bundle iniziale
          if (
            id.includes('react-markdown') ||
            id.includes('/unified/') ||
            id.includes('/remark') ||
            id.includes('/rehype') ||
            id.includes('/micromark') ||
            id.includes('/hast') ||
            id.includes('/mdast') ||
            id.includes('/vfile') ||
            id.includes('/bail') ||
            id.includes('/trough') ||
            id.includes('/extend-')
          ) return
          // React core: chunk dedicato per separarlo dal resto dei vendor
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) return 'vendor-react'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('@dnd-kit')) return 'vendor-dnd'
          if (id.includes('zod')) return 'vendor-zod'
          // lucide-react in chunk dedicato: evita che gonfi vendor bloccando il tree-shaking
          if (id.includes('lucide-react')) return 'vendor-icons'
          // Resto dei vendor (clsx, nanoid, color2k, file-saver, react-colorful…)
          return 'vendor'
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Lascia come async chunks separati (importati dinamicamente)
          if (id.includes('jszip') || id.includes('html-to-image')) return
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('@dnd-kit')) return 'vendor-dnd'
          if (id.includes('zod')) return 'vendor-zod'
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

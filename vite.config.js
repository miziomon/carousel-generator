import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Tailwind v4 si integra come plugin Vite (nessun postcss.config separato)
    tailwindcss(),
    // PWA: installabile, con avviso di nuova versione (vedi src/hooks/usePwaUpdate.js).
    // registerType 'prompt' (non 'autoUpdate'): mai un reload silenzioso, l'utente
    // sceglie quando aggiornare (una generazione AI o un export potrebbero essere in corso).
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Slide-orama — Generatore di caroselli',
        short_name: 'Slide-orama',
        description: 'Crea, modifica ed esporta caroselli per i social, anche con l\'aiuto dell\'AI.',
        lang: 'it',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'design'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          // Maschera separata: la «S» sta nell'80% centrale (safe zone maskable)
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache solo dell'app shell (js, css, html, icone). I font in public/fonts
        // pesano ~11 MB: non vanno scaricati all'installazione, si cachano a runtime.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // SPA: ogni navigazione ricade sull'app shell
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Font dell'editor: immutabili, serviti dalla cache dopo il primo uso
            urlPattern: ({ url }) => url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carosello-fonts',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Le chiamate al backend (cross-origin) non hanno una route registrata:
        // restano sempre live, mai in cache (dati, login e generazione AI).
      },
    }),
  ],
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

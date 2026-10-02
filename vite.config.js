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
    // Vite 8 usa Rolldown: il chunking si configura con codeSplitting.groups
    // (manualChunks è deprecato). Solo le librerie necessarie all'avvio entrano
    // in chunk vendor dedicati; tutto il resto NON è elencato, quindi il bundler
    // lo lascia nel chunk lazy che lo importa: jsPDF con le sue dipendenze
    // (html2canvas, canvg, dompurify…) solo all'export PDF, JSZip all'export ZIP,
    // html-to-image al primo export PNG, react-markdown con l'ecosistema
    // unified/remark solo nella modale AI. Così nel bundle iniziale non entra
    // codice che l'utente potrebbe non usare mai.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // React core: cambia raramente, ottimo per il caching a lungo termine
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 5 },
            { name: 'vendor-motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 4 },
            { name: 'vendor-dnd', test: /node_modules[\\/]@dnd-kit[\\/]/, priority: 3 },
            { name: 'vendor-zod', test: /node_modules[\\/]zod[\\/]/, priority: 3 },
            // lucide-react in chunk dedicato: non gonfia vendor e si aggiorna da solo
            { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 3 },
            // Piccole librerie sempre usate all'avvio
            {
              name: 'vendor',
              test: /node_modules[\\/](axios|zustand|@mavida[\\/]hub-auth|nanoid|clsx|color2k|react-colorful)[\\/]/,
              priority: 1,
            },
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

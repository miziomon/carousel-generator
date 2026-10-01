# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server (Vite, porta 5173)
npm run build        # build produzione in dist/
npm run preview      # serve il build di produzione (porta 4173)
npm test             # vitest run (singola esecuzione)
npm run test:watch   # vitest in modalità watch
npm run lint         # ESLint su src/
npm run format       # Prettier su src/

# Eseguire un singolo test file
npx vitest run src/__tests__/schema.test.js
```

## Architettura

### Stato globale: `useCarouselStore`

`src/hooks/useCarouselStore.js` è l'unica fonte di verità. Lo stato vive in uno store **zustand** globale (singleton di modulo) e viene aggiornato da un **reducer** puro (`reducer`, esportato): ogni azione passa da `dispatch(action)`, che calcola il nuovo stato col reducer e, se il reducer restituisce lo stesso oggetto (azione ignorata), non provoca re-render. L'hook `useCarouselStore()` espone stato + azioni (definite una sola volta a livello di modulo, quindi con identità stabile) e viene istanziato in `App.jsx`: le azioni vengono passate come props verso il basso. Nuove azioni si aggiungono come `case` nel reducer + una funzione `dispatch({ type, payload })` + la chiave nel `return` dell'hook. `resetCarouselStore()` riporta lo store allo stato iniziale (serve ai test, perché lo store è un singleton).

Lo stato ha 4 sezioni: `carousel` (dati), `ui` (tab attiva, slide in edit), `history` (stack undo/redo, max 50 snapshot), `meta` (isDirty, lastSavedAt).

**Identità delle slide**: ogni slide ha due identificatori distinti:
- `id` — nanoid stabile, usato come chiave React e per DnD. **Non viene persistito** nel localStorage né nell'export JSON.
- `num` — sequenziale 1..N, derivato sempre dalla posizione nell'array via `renumber()`. **Appare nel JSON** e nel footer delle slide.

`injectIds()` aggiunge `id` a ogni slide al momento del caricamento. `renumber()` ricalcola `num` dopo ogni operazione strutturale (add/delete/duplicate/reorder).

**Sticker globali**: `theme.global_stickers` è un array di oggetti `StickerSchema`. Ogni sticker ha un `id` nanoid stabile che **viene persistito** nel localStorage (a differenza degli id slide) — serve come chiave di riferimento per il sistema di override per-slide. Le quattro action per il tema sono `ADD_THEME_STICKER`, `UPDATE_THEME_STICKER` (patch parziale), `REMOVE_THEME_STICKER`, `REORDER_THEME_STICKER`. `normalizeMinimal.js` migra automaticamente il campo legacy `global_sticker` (singolare) verso l'array. `injectGlobalStickerIds()` nello store assicura che i draft vecchi (salvati prima che gli id venissero preservati) ricevano id al caricamento. L'array viene renderizzato in ordine inverso (`[...stickers].reverse()`) così lo Sticker 1 è sempre il layer più in alto visivamente.

**Sticker per-slide**: ogni slide può sovrascrivere o estendere la lista globale tramite quattro campi opzionali in `SlideBaseFields`:
- `stickers` — array di sticker locali alla slide (id `local-xxx` stabile, persiste nel JSON e nel draft).
- `sticker_overrides` — `{ [globalStickerId]: StickerSchema.partial() }` — patch parziali applicate agli sticker globali solo in questa slide.
- `hidden_stickers` — `string[]` — id di sticker globali nascosti solo in questa slide.
- `sticker_order` — `string[]` — ordine custom dell'intera pila (globali visibili + locali); assente = ordine default.

La logica di risoluzione è centralizzata in `src/lib/resolveSlideStickers.js` (`resolveSlideStickers(slide, theme)`) — selettore puro usato sia da `SlideRenderer` che da `SlideStickerPanel`. `REMOVE_THEME_STICKER` pulisce automaticamente i riferimenti orfani in tutte le slide. Le sei action per-slide sono `ADD/UPDATE/REMOVE/REORDER_SLIDE_STICKER`, `RESET_SLIDE_STICKER_OVERRIDE`, `RESTORE_SLIDE_STICKER`. La UI è nel tab "Sticker" dell'`EditModal` (`src/components/edit-modal/SlideStickerPanel.jsx`) — opera sul draft locale, committato solo al salvataggio.

### Chiamate al backend: `lib/http.js` (axios)

Tutte le chiamate HTTP passano da `src/lib/http.js`: `http` è un'istanza axios con `baseURL = VITE_API_BASE_URL` e gli interceptor di `hubAuth.installAxiosInterceptors()` (Bearer della sessione letto a ogni richiesta, su 401 `hubAuth.handleUnauthorized(token)`); `publicHttp` è la stessa istanza senza interceptor, per gli endpoint pubblici (scambio magic link). `apiRequest(config)` restituisce direttamente il body (204 → `null`) e trasforma gli errori HTTP in `Error` con `message` (`message` → `error` → `Errore N`) e `status`; la usano `lib/carousel/api.js` e `lib/uploads/api.js`. `generateCarousel` e `exchangeAccessLink` usano `validateStatus: () => true` per mappare da sé gli stati di errore (`ApiError`, messaggi leggibili). Nessun timeout: la generazione AI può durare a lungo. **Non usare `fetch` direttamente.** Nei test si usa `src/__tests__/helpers/mockHttp.js` (sostituisce l'adapter di axios) e `fakeHubAuth.js`.

### PWA e avviso di nuova versione

L'app è una PWA (`vite-plugin-pwa`, `registerType: 'prompt'`, config in `vite.config.js`): manifest e icone in `public/` (`pwa-*.png`, `favicon.svg`, `apple-touch-icon.png`; monogramma «S» neon su navy). Il precache contiene solo l'app shell (js/css/html/icone, ~1,9 MB); i font in `public/fonts` (~11 MB) si cachano a runtime (`CacheFirst`, cache `carosello-fonts`). Le chiamate al backend non hanno route nel service worker: restano sempre live. `PwaUpdateNotice` (montato in `main.jsx`, anche sul login) usa `usePwaUpdate` (`src/hooks/usePwaUpdate.js`) che controlla nuove versioni ogni ora e al ritorno in primo piano (min. 5 minuti tra due controlli) e mostra `UpdateToast` ("Nuova versione disponibile" / "Aggiorna ora" / chiudi): mai un reload automatico, il draft comunque è già salvato dall'autosave. Il service worker gira solo nel build (`npm run preview` o produzione), non in `npm run dev`. Attenzione: sulla stessa origine `localhost:PORTA` un service worker registrato da un altro progetto continua a servire il suo contenuto; per provare la PWA usa una porta libera.

### Rendering slide: `SlideRenderer`

`src/slide-renderer/SlideRenderer.jsx` è il cuore visivo. Renderizza a dimensioni native del formato scelto (1080×1080 square, 1080×1350 portrait, 1080×566 landscape) — il caller applica `transform: scale(N)` su un wrapper per ridimensionare (es. preview card a 280px).

Le variabili CSS della palette (`--slide-bg`, `--slide-fg`, `--slide-accent`, `--slide-muted`, `--slide-line`) vengono iniettate come stile inline sulla radice `.slide`. **`slide-renderer.css` non va modificato**: contiene il CSS visivo verbatim dal brief.

`mode="export"` è pensato per disabilitare animazioni durante l'export; `mode="preview"` è il default.

### Tag inline: `inlineTags.jsx`

`src/slide-renderer/inlineTags.jsx` — parser state-machine che converte le stringhe con tag (`[hl]`, `[soft]`, `[c]`, `[u]`, `[em]`) in React nodes. **Mai `dangerouslySetInnerHTML`**. Sotto test in `src/__tests__/inlineTags.test.js`.

**Righe e separatore** (`parseLines`): ogni riga di `lines` è renderizzata in uno `<span class="slide-row slide_NN_row_MM">` (NN = `slide.num`, MM = posizione nell'array, entrambi con zero-padding a 2 cifre; righe vuote e separatori contano). La voce sentinella `"[sep]"` (`SEPARATOR_TOKEN`, `isSeparator()`) è un separatore: uno `<span>` block (spacer) alto `--slide-separator-size`, che `buildBodyStyle` imposta a `slide.separator_size_override` (px) oppure, se assente, a metà del `finalSize` calibrato. Il separatore non ha `<br>` adiacenti. `parseLines(lines, keyPrefix, classMap, aligns, slideNum)` richiede `slideNum` per generare le classi posizionali; la classe del separatore viene da `classMap.sep` (`editorial__separator` / `bold__separator`). La quote editorial con `lines_align` ha un proprio path di render (virgolette sulla prima/ultima riga non-separatore).

### Schema Zod: `schema.js`

`src/lib/schema.js` — discriminatedUnion su `type`. Importante: i vincoli cross-campo (cover→1 riga, divider→1-2 righe) sono in `CarouselSchema.superRefine()`, **non** negli schemi individuali — questo perché `z.discriminatedUnion` richiede `ZodObject` puri, e `.superRefine()` restituisce `ZodEffects`.

### Normalizzazione e validazione JSON: `normalizeMinimal.js`

`src/lib/migrations/normalizeMinimal.js` converte un JSON minimalista (solo i campi obbligatori) in un carosello completo con tutti i default. Fa parte del flusso di import/validazione in `validateJson.js`. Gestisce anche la migrazione del campo legacy `global_sticker` (singolare) → `global_stickers` (array). Da non confondere con `migrateCarousel.js` (step-based migrations per versioni del draft).

### Export PNG / ZIP / PDF

Il render per l'export è centralizzato in `src/lib/renderSlideAsPng.jsx` (`renderSlideAsPng(slide, theme, total, options)`): renderizza nel portal `#export-root` (off-screen in `index.html`), usa `flushSync` + `createRoot` per il render sincrono, poi `await document.fonts.ready` + doppio `requestAnimationFrame` prima di `html-to-image.toPng({ pixelRatio })`. I font usano `font-display: block` in `src/index.css` per evitare FOUT.

`src/lib/exportPng.jsx` è un thin wrapper che chiama `renderSlideAsPng` con `pixelRatio: 2` (retina). Lo usano `SlideCard` (export singola slide) e `exportZip.js`.

`src/lib/exportZip.js` chiama `exportSlideToPng` in loop seriale (non parallelo, per non sovraccaricare il DOM) e include `carosello.json` senza i campi `id`.

`src/lib/exportPdf.js` chiama `renderSlideAsPng` con `pixelRatio: 1` (peso ridotto) e assembla un PDF multi-pagina con `jsPDF` ottimizzato per LinkedIn. L'`ExportPanel` mostra una barra di progresso con stima MB durante la generazione.

### Auto-save

`src/hooks/useAutoSave.js` — debounce 800ms, chiave localStorage `carosello.draft.v1`. Il draft viene salvato rimuovendo gli `id` runtime delle **slide** (top-level `slide.id`). Gli id degli sticker globali (`theme.global_stickers[].id`) vengono **preservati** nel draft perché servono come chiavi stabili per `sticker_overrides` e `sticker_order` per-slide. Gli id degli sticker locali per-slide (`slide.stickers[].id`, prefisso `local-xxx`) sono anchessi stabili e vengono preservati. Al caricamento, `buildInitialState()` tenta prima il draft, poi cade su `defaultCarousel`; `injectGlobalStickerIds()` assicura che eventuali sticker senza id ricevano un nanoid.

### Convenzioni CSS

- **Tailwind** (v4, plugin `@tailwindcss/vite`, nessun `tailwind.config.js`/`postcss.config.js`): solo per layout dell'app shell (flex, gap, overflow, padding). `src/index.css` contiene due regole di compatibilità v3→v4 (colore bordi di default e `cursor: pointer` sui bottoni).
- **BEM con CSS dedicato per componente**: ogni componente ha il suo `.css` accanto al `.jsx`. L'identità visiva dei componenti non va mai espressa con classi Tailwind.
- Il CSS delle slide (`slide-renderer.css`) è intoccabile.

### Hook ausiliari

Hook usati in `App.jsx` o nei componenti, non documentati altrove:

| Hook | File | Scopo |
|---|---|---|
| `useAuth` | `src/hooks/useAuth.js` | Stato di autenticazione utente (token, userId) |
| `useMagicLinkLogin` | `src/hooks/useMagicLinkLogin.js` | Flusso OTP / magic-link verso `wp-draft-generator` |
| `useUndoRedo` | `src/hooks/useUndoRedo.js` | Espone `undo`/`redo` e `canUndo`/`canRedo` dallo history stack |
| `useHotkeys` | `src/hooks/useHotkeys.js` | Bind tastiera (Ctrl+Z, Ctrl+Y, ecc.) |
| `useMediaQuery` | `src/hooks/useMediaQuery.js` | Responsive breakpoints |
| `useAppTheme` | `src/hooks/useAppTheme.js` | Tema UI (dark/light) |
| `useCarouselCount` | `src/hooks/useCarouselCount.js` | Numero caroselli salvati sul server |
| `useContrastCheck` | `src/hooks/useContrastCheck.js` | Verifica contrasto WCAG palette |
| `useDebouncedCallback` | `src/hooks/useDebouncedCallback.js` | Utility debounce generico |
| `usePaletteLibraryPersistence` | `src/hooks/usePaletteLibraryPersistence.js` | Salvataggio palette custom nel localStorage |
| `useUiPreferences` | `src/hooks/useUiPreferences.js` | Stato sidebar (aperta/chiusa, sezioni espanse) |
| `usePwaUpdate` | `src/hooks/usePwaUpdate.js` | Registra il service worker, controlla nuove versioni (ogni ora / al ritorno in primo piano) ed espone `needRefresh`/`reload`/`dismiss` |

### Lazy loading

`JsonTab` (CodeMirror, ~424KB) è lazy-loaded con `React.lazy()` + `Suspense` in `App.jsx`. Non importarlo direttamente.

### localStorage

| Chiave | Contenuto |
|--------|-----------|
| `carosello.draft.v1` | Carousel completo senza `id` runtime delle slide; gli id sticker (globali e locali) **sono** inclusi perché servono come chiavi stabili per il sistema override per-slide — bump la versione se cambia lo schema |
| `carosello.ui-preferences` | Stato sidebar (aperta/chiusa, sezioni espanse) — gestito da `useUiPreferences.js` |

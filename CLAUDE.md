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

`src/hooks/useCarouselStore.js` è l'unica fonte di verità. Usa `useReducer` (niente Context globale, niente Zustand): il hook viene istanziato in `App.jsx` e le azioni vengono passate come props verso il basso.

Lo stato ha 4 sezioni: `carousel` (dati), `ui` (tab attiva, slide in edit), `history` (stack undo/redo, max 50 snapshot), `meta` (isDirty, lastSavedAt).

**Identità delle slide**: ogni slide ha due identificatori distinti:
- `id` — nanoid stabile, usato come chiave React e per DnD. **Non viene persistito** nel localStorage né nell'export JSON.
- `num` — sequenziale 1..N, derivato sempre dalla posizione nell'array via `renumber()`. **Appare nel JSON** e nel footer delle slide.

`injectIds()` aggiunge `id` a ogni slide al momento del caricamento. `renumber()` ricalcola `num` dopo ogni operazione strutturale (add/delete/duplicate/reorder).

### Rendering slide: `SlideRenderer`

`src/slide-renderer/SlideRenderer.jsx` è il cuore visivo. Renderizza sempre a **1080×1080px nativi** — il caller applica `transform: scale(N)` su un wrapper per ridimensionare (es. preview card a 280px).

Le variabili CSS della palette (`--slide-bg`, `--slide-fg`, `--slide-accent`, `--slide-muted`, `--slide-line`) vengono iniettate come stile inline sulla radice `.slide`. **`slide-renderer.css` non va modificato**: contiene il CSS visivo verbatim dal brief.

`mode="export"` è pensato per disabilitare animazioni durante l'export PNG; `mode="preview"` è il default.

### Tag inline: `inlineTags.jsx`

`src/slide-renderer/inlineTags.jsx` — parser state-machine che converte le stringhe con tag (`[hl]`, `[soft]`, `[c]`, `[u]`, `[em]`) in React nodes. **Mai `dangerouslySetInnerHTML`**. Sotto test in `src/__tests__/inlineTags.test.js`.

### Schema Zod: `schema.js`

`src/lib/schema.js` — discriminatedUnion su `type`. Importante: i vincoli cross-campo (cover→1 riga, divider→1-2 righe) sono in `CarouselSchema.superRefine()`, **non** negli schemi individuali — questo perché `z.discriminatedUnion` richiede `ZodObject` puri, e `.superRefine()` restituisce `ZodEffects`.

### Export PNG/ZIP

`src/lib/exportPng.jsx` renderizza nel portal `#export-root` (off-screen in `index.html`), usa `flushSync` + `createRoot` per il render sincrono, poi `await document.fonts.ready` prima di `html-to-image.toPng({ pixelRatio: 2 })`. I font usano `font-display: block` in `src/index.css` per evitare FOUT durante l'export.

`src/lib/exportZip.js` chiama `exportSlideToPng` in loop seriale (non parallelo, per non sovraccaricare il DOM) e include `carosello.json` senza i campi `id`.

### Auto-save

`src/hooks/useAutoSave.js` — debounce 800ms, chiave localStorage `carosello.draft.v1`. Il draft viene salvato **senza** i campi `id` runtime. Al caricamento, `buildInitialState()` tenta prima il draft, poi cade su `defaultCarousel`.

### Convenzioni CSS

- **Tailwind**: solo per layout dell'app shell (flex, gap, overflow, padding).
- **BEM con CSS dedicato per componente**: ogni componente ha il suo `.css` accanto al `.jsx`. L'identità visiva dei componenti non va mai espressa con classi Tailwind.
- Il CSS delle slide (`slide-renderer.css`) è intoccabile.

### Lazy loading

`JsonTab` (CodeMirror, ~424KB) è lazy-loaded con `React.lazy()` + `Suspense` in `App.jsx`. Non importarlo direttamente.

### localStorage

| Chiave | Contenuto |
|--------|-----------|
| `carosello.draft.v1` | Carousel completo senza `id` — bump la versione se cambia lo schema |
| `carosello.ui-preferences` | Stato sidebar (aperta/chiusa, sezioni espanse) — gestito da `useUiPreferences.js` |

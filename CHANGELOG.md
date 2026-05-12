# Changelog

## [1.4.0] — 2026-05-12

### Added
- Toggle **"Mostra numerazione (es. 03 / 12)"** anche nella sezione **Header slide** della ThemeTab (prima esisteva solo nel footer).
  - Nuovo campo `theme.header.show_meta_number` (boolean), indipendente da `theme.footer.show_meta_number`.
  - Default `true` per i caroselli esistenti (retrocompatibilità: comportamento attuale preservato).
  - Quando OFF nasconde l'intero blocco `slide__num` in alto a sinistra.

### Changed
- `_SlideHeader.jsx` renderizza condizionalmente `slide__num` in base al nuovo toggle (check `!== false` per gestire JSON legacy senza il campo).

---

## [1.3.0] — 2026-05-12

### Added
- **Nuovo tipo slide `quote`** — citazioni/aforismi con layout "Inline Editorial":
  - Testo in font primario (Archivo Black / Fraunces selezionabile) con virgolette tipografiche `“ ”` in accent color come delimitatori inline.
  - Tag inline `[hl]`, `[soft]`, `[c]`, `[u]`, `[em]` supportati come per le slide standard.
  - Dimensioni `xl` / `lg` / `md` selezionabili (stesso registro delle slide standard).
  - Attribuzione opzionale: campo `author` (max 80 char) preceduto da em-dash `—`, e campo `source` (max 120 char) in corsivo Fraunces sotto l'autore. Se entrambi assenti, l'intero blocco di attribuzione non viene renderizzato.
  - Smart quotes: i caratteri `"` e `'` in `author` / `source` vengono convertiti automaticamente nei corrispettivi tipografici curvi (`“ ” ‘ ’`).
- Voce "Citazione" nel menu "Aggiungi slide" dell'header e nel selettore tipo dell'EditModal.
- Preset `src/assets/presets/quote.json` per i nuovi slide quote.
- `migrateToType` in EditModal gestisce la conversione da/verso `quote` con backup dei campi incompatibili in `_note_autore`.
- `normalizeMinimalCarousel` riempie i default per slide quote (author/source → null se assenti, size → "lg").
- `docs/quote-slide-preview.html`: pagina di anteprima visuale dei 3 layout candidati (Classic, Inline, Asymmetric); è stato implementato Inline Editorial.

### Changed
- M10 (warning leggibilità) si applica automaticamente anche alle slide quote: usa gli stessi `CHAR_LIMITS` (xl: 80, lg: 120, md: 200).

---

## [1.2.0] — 2026-05-12

### Added
- **Import JSON minimale**: i JSON esterni possono ora contenere solo i campi essenziali; tutti gli altri vengono completati con default sensati prima della validazione Zod.
  - Slide `standard`/`cover`/`divider`: unico campo obbligatorio = `lines`.
  - Slide `cta`: case dedicato — obbligatorio `cta_items` al posto di `lines`.
  - `theme`, `title`, `num`, `kicker`, `font`, `size`, `palette_id`, `divider_number`, `show_swipe_arrow` ecc. → tutti opzionali, riempiti da `defaultCarousel` o euristiche.
  - Se `theme.palette_id` punta a una palette built-in ma la `palette` è parziale o assente, vengono usati i colori della built-in come base (override applicati sopra).
- `src/lib/migrations/normalizeMinimal.js`: nuovo step di normalizzazione (idempotente, tollerante a input malformato), eseguito prima di `migrateCarousel` in `validateJson.js`.
- `src/lib/filename.js`: helper `slugifyTitle()` per generare nomi file safe dal titolo del progetto.

### Changed
- **Nome file export**: ZIP, JSON (header), JSON (tab JSON) e JSON interno allo ZIP ora usano il titolo del progetto (`carousel.title`) come base, non più il nome dell'autore (`theme.footer.name`).
  - Es. progetto "Pensieri in pillole" → `pensieri-in-pillole.zip` / `pensieri-in-pillole.json`.
  - Fallback su `carosello` se il titolo è vuoto o non slugificabile.

---

## [1.1.0] — 2026-05-12

### Added
- 3 nuove palette di sistema in `builtinPalettes.js`:
  - **Midnight Indigo** (`system-midnight-indigo`) — indigo notturno con accento viola elettrico
  - **Mocha Gold** (`system-mocha-gold`) — marrone scuro caldo con accento ocra-oro
  - **Cloud Cobalt** (`system-cloud-cobalt`) — crema Pantone 2026 con accento cobalto
- `docs/palette-preview.html`: pagina di anteprima visuale delle palette candidate (5 proposte iniziali, 3 selezionate)

---

## [1.0.0] — 2026-05-11

### Added
- **Fase 4 completata: sistema palette v1.0 production-ready**
- Toast notifications per tutte le azioni palette: applica, crea, modifica, duplica, elimina, importa, esporta, ri-sincronizza
- Hotkeys: Esc chiude dropdown `PaletteSelector` e menu ⋮ `PaletteRow`; Esc chiude i modal (già gestito da `Modal.jsx`)
- Hotkey Cmd/Ctrl+Enter salva il form in `PaletteEditModal` (tramite `useCallback` per dependency stabile)
- Animazione badge `PaletteStatusBadge` con `AnimatePresence mode="wait"` — transizione opacity+scale tra stati in-sync/modificata/custom
- Animazione dropdown `PaletteSelector` con slide-down (`AnimatePresence` + `motion.div`, `y: -6 → 0`)
- Fade-in del contenuto `PaletteManagerModal` all'apertura (`motion.div opacity: 0 → 1`)
- Messaggi di errore import palette completamente localizzati in italiano con mapping per codici Zod (`invalid_type`, `too_small`, `too_big`, `invalid_string`)
- Gestione difensiva `palette_id` dangling verificata (PaletteSelector mostra "— Nessuna palette —")
- Reset form `PaletteEditModal` verificato: dipendenze `[open, mode, initialData]` già corrette

---

## [0.4.0] — 2026-05-11

### Added
- Fase 3: modale "Gestisci palette" completo con CRUD palette utente
- Crea, modifica, duplica, elimina palette con dialog di conferma
- Import palette da file JSON (formato singolo o wrapper `_type: carosello-palette`)
- Export palette come file JSON (`palette-{slug}.json`)
- `PaletteEditModal`: form nome/descrizione + 6 color picker + ContrastChecker + anteprima live mini-slide 280px
- `PaletteRow` con menu ⋮ contestuale (Duplica/Modifica/Esporta/Elimina)
- Coerenza referenziale: eliminare una palette user attiva azzera `palette_id` nel carosello senza toccare i colori
- Nuove azioni store: `CREATE_PALETTE`, `UPDATE_PALETTE`, `DUPLICATE_PALETTE`, `DELETE_PALETTE`, `IMPORT_PALETTE`, `OPEN/CLOSE_EDIT_PALETTE`
- Palette system non mostrano mai "Modifica" né "Elimina" (assenti, non disabled)

---

## [0.3.0] — 2026-05-11

### Added
- **Sistema palette — Fase 2**: selettore palette con combobox+thumbnail, badge di stato, verifica contrasto WCAG 2.1, azioni store palette
- `PaletteSelector`: dropdown custom con anteprima 6 quadratini (`PaletteThumbnail`), sezioni separate per palette system e user
- `PaletteStatusBadge`: badge visivo con tre stati — `in-sync` (verde), `modificata` (giallo), `custom` (neutro)
- `ContrastChecker`: verifica live WCAG 2.1 per le coppie Testo/Sfondo, Accento/Sfondo, Testo/Superficie con livelli AAA/AA/AA-large/Fail
- `PaletteThumbnail`: componente riutilizzabile con 6 swatch colorati (riusato in Fase 3 nel manager)
- `PaletteManagerModal`: placeholder Fase 2, implementazione completa prevista in Fase 3
- `usePaletteLibraryPersistence`: hook debounced (800ms) che salva su `carosello.palettes.v1` solo le palette `origin: "user"`
- `useContrastCheck`: hook memoizzato che calcola i rapporti di contrasto WCAG per le 3 coppie chiave
- Nuove azioni store: `APPLY_PALETTE`, `RESYNC_PALETTE`, `UPDATE_PALETTE_INLINE`, `OPEN_PALETTE_MANAGER`, `CLOSE_PALETTE_MANAGER`
- `Button`: aggiunto size `xs` (`px-2 py-1 text-xs`) per i bottoni compatti nella palette header
- `useCarouselStore`: `paletteLibrary` nello stato globale, costruita da `mergePaletteLibrary` (built-in immutabili in cima + user palette da localStorage)

### Changed
- **`ThemeTab.jsx`**: riscritto completamente — integra PaletteSelector, PaletteStatusBadge, ContrastChecker; ogni modifica colore via `UPDATE_PALETTE_INLINE` (setta `palette_id: null`); header/footer/font invariati via `UPDATE_THEME`
- **`App.jsx`**: passa le 5 nuove props palette a `ThemeTab`; registra `usePaletteLibraryPersistence`; monta `PaletteManagerModal`
- **`useCarouselStore`**: stato iniziale esteso con `paletteLibrary` e nuovi campi `ui` (`paletteManagerOpen`, `editingPaletteId`)

---

## [0.2.0] — 2026-05-11

### Added
- **Sistema palette — Fase 1**: modello dati, palette built-in, migrazione retrocompatibile
- `src/lib/palettes/builtinPalettes.js`: palette `system-tech-dark` e `system-warm-neutral` immutabili con 6 slot colore; lookup O(1) via Map interna
- `src/lib/palettes/colorUtils.js`: wrapper su `color2k` per `parseColor`, `colorsEqual` (tolleranza +-1), `inferSurface`, `contrastRatio` WCAG 2.1
- `src/lib/palettes/matchBuiltin.js`: matching a 6 colori contro le palette built-in; usato dalla migrazione
- `src/lib/migrations/migrateCarousel.js`: migrazione pura e idempotente — gestisce 4 casi (5 colori senza palette_id, 6 colori senza palette_id, palette_id valido, palette_id dangling)
- `src/lib/storage.js`: funzioni `loadPalettes`, `savePalettes`, `clearPalettes` per la libreria palette utente (`carosello.palettes.v1`)
- Dipendenza `color2k` per parsing e manipolazione colori

### Changed
- **Schema**: `PaletteColorsSchema` aggiunto slot `surface` (6° colore per blocchi `hl-soft`); `ThemeSchema` aggiunto `palette_id` (nullable, default null); nuovo `PaletteSchema` (entita libreria) e `PaletteLibrarySchema` esportati da `schema.js`
- **`defaultCarousel.js`**: palette allineata a `system-tech-dark` — aggiunto `surface: '#1a1e2a'` e `palette_id: 'system-tech-dark'`
- **`validateJson.js`**: `migrateCarousel` applicata prima della validazione Zod — i JSON vecchio formato vengono accettati e aggiornati automaticamente
- **`useCarouselStore.js`**: `migrateCarousel` applicata in `buildInitialState` (caricamento draft) e in `LOAD_CAROUSEL` (import JSON)
- **`ThemeTab.jsx`**: aggiunto ColorPicker per `surface` (6° slot); label palette aggiornate (`Spento`, `Linea`); placeholder TODO Fase 2 per `PaletteSelector` e `PaletteStatusBadge`

---

## [0.1.2] — 2026-05-11

### Changed
- Tab JSON: sostituito CodeMirror con una textarea+overlay nativa con syntax highlighting CSS minimale (chiavi blu, stringhe verdi, numeri rosa, boolean viola). Rimosse le dipendenze `@uiw/react-codemirror` e `@codemirror/lang-json` (-20 pacchetti, -140KB gzip).
- Il JSON nella tab si aggiorna dinamicamente a ogni modifica dello store (slide, tema, undo/redo, import), mantenendo le modifiche locali non ancora applicate.
- `vite.config.js` ripulito dai workaround CodeMirror.

---

## [0.1.1] — 2026-05-11

### Fixed
- Tab JSON: errore "multiple instances of @codemirror/state" risolto aggiungendo `resolve.dedupe` e `optimizeDeps.include` in `vite.config.js`
- Menu "Esporta" nell'header: si apriva verso l'alto uscendo dallo schermo; ora si apre verso il basso

### Changed
- Header: logo aggiornato a "Carousel Generator" con numero di versione affianco
- Header: nome progetto ora è un campo editabile; la modifica aggiorna `theme.footer.name` e viene auto-salvata
- Header: pulsante "Aggiungi slide" spostato dall'area flottante in basso all'header, affianco a "Nuovo"

### Removed
- Pulsante flottante "+ Aggiungi slide" in basso a destra nella griglia slide

---

## [0.1.0] — 2026-05-11

### Added
- Release iniziale — Carosello Builder completo
- Renderer slide 1080×1080 con 4 tipi: cover, standard, divider, cta
- Parser tag inline: `[hl]`, `[soft]`, `[c]`, `[u]`, `[em]`
- Griglia con anteprime live e drag&drop di riordino
- Edit modal con anteprima live e toolbar tag inline
- Theme tab con color picker per tutta la palette
- Tab JSON con CodeMirror e validazione schema Zod
- Undo/Redo (max 50 step) con Ctrl+Z / Ctrl+Shift+Z
- Auto-save in localStorage (`carosello.draft.v1`)
- Export PNG singolo 2160×2160px
- Export ZIP (tutti i PNG + `carosello.json`)
- Vista mobile (griglia a colonna singola)
- Warning leggibilità M10 sulle card
- Font self-hosted: Archivo Black, Fraunces Variable, JetBrains Mono

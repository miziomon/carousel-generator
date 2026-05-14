# Changelog

## [1.11.0] — 2026-05-14

### Added
- **ThemeSidebar** — il pannello Tema diventa una sidebar collassabile a sinistra
  - 6 sezioni espandibili in modo indipendente: Template, Palette, Header, Footer, Font, Reset
  - Rail verticale sempre visibile con icone delle sezioni, cliccabili anche da sidebar chiusa
  - `ThemeSidebarHeader` con pulsante collapse + indicatore sezione aperta
  - Toggle dalla sidebar stessa, dal bottone `PanelLeft` nell'header e da shortcut `Ctrl+B`
  - Preferenze UI (stato open/closed + sezioni espanse) persistite in `localStorage` alla chiave `carosello.ui-preferences`
  - Comportamento responsive: su schermi `< 1024px` la sidebar si sovrappone al contenuto (overlay)
  - `useUiPreferences()` hook per load/save preferenze con debounce
  - `useMediaQuery()` hook per breakpoint reattivo
  - `useDebouncedCallback()` hook utility

### Changed
- Tab "Tema" rimossa dalla `TabBar` — il tema si gestisce ora esclusivamente dalla sidebar
- `Header` riceve `sidebarOpen` + `onToggleSidebar` per sincronizzare il bottone toggle
- `App.jsx` ristrutturato con layout a due colonne (`flex flex-1 overflow-hidden`): sidebar a sinistra, contenuto principale a destra
- `ThemeTab` rimosso (sostituito integralmente da `ThemeSidebar` con le sue sezioni)

---

## [1.10.0] — 2026-05-13

### Added
- **Integrazione API generazione AI** — il bottone "Genera carosello" diventa funzionante
  - Chiamata `POST /chat/completions` (sincrona, stateless) con `force_json_response: true`
  - URL derivato da `VITE_API_BASE_URL` + `'chat/completions'`; token via nuova variabile `VITE_AI_API_TOKEN`
  - Se le variabili d'ambiente mancano, il bottone resta disabilitato con tooltip dedicato (app funziona comunque per editing manuale)
  - **Few-shot dinamico**: il carosello corrente viene iniettato nel system prompt come esempio di stile (soglia minima 3 slide); strip automatico di `_note_autore`, `_ai_generation`, `id` prima della serializzazione
  - `user_id` dell'utente loggato incluso nel payload per logging/billing lato backend
  - Payload completo: `message`, `system_prompt`, `force_json_response`, `user_id`, `metadata` (`source`, `slide_count_requested`, `has_extra_instructions`, `input_chars`, `generation_id`)
  - **Loading state**: spinner nel bottone + 5 messaggi rotanti ogni 3.5s con framer-motion `AnimatePresence`; tutti i campi del form disabilitati durante la generazione; la X del modale resta cliccabile
  - **Validazione zod** della risposta: `GeneratedCarouselSchema` con `SlideSchema` esistente + vincoli cross-campo replicati (cover→1 riga, divider→≤2 righe, `num` unici)
  - **Modale di conferma** "Sostituire il carosello attuale?" con metadati (numero slide, modello, token usati, JSON repair) + tasto Enter per confermare / Esc per annullare
  - **Sostituzione con undo**: azione `REPLACE_CAROUSEL_FROM_AI` in `useCarouselStore` — preserva il theme corrente (palette, template, header, footer, font), rinumera le slide con `renumber` + `injectIds`, salva in history (Ctrl+Z funzionante)
  - **Metadati `_ai_generation`** salvati nel carosello: `model`, `timestamp`, `input_chars`, `input_summary`, `usage`, `json_repaired`, `generation_id` — sopravvivono a export JSON e undo/redo
  - **Blocco errore** con classificazione UX per tutti i codici HTTP (400/401/413/422/429/500) + errore rete + validazione schema fallita; `<details>` espandibili con dati tecnici; bottone Riprova per errori retentabili
  - Toast di conferma "Carosello generato. Ctrl+Z per annullare." dopo sostituzione
  - `AiGenerationSchema` opzionale aggiunto a `CarouselSchema` in `schema.js` per import/export backward-compatible

### New files
- `src/lib/ai/config.js` — `getAiConfig()`, `isAiConfigured()`
- `src/lib/ai/errors.js` — `ApiError`, `mapHttpErrorToApiError`, `RETRYABLE_CODES`
- `src/lib/ai/buildSystemPrompt.js` — iniezione few-shot nel template
- `src/lib/ai/generateCarousel.js` — chiamata HTTP + parsing risposta
- `src/lib/ai/validateGenerated.js` — validazione zod del carosello generato
- `src/components/ai-generator/AiLoadingStatus.jsx` — messaggi rotanti durante la generazione
- `src/components/ai-generator/AiErrorDisplay.jsx` — blocco errore con dettagli espandibili e Riprova
- `src/components/ai-generator/AiConfirmReplaceModal.jsx` — modale di conferma con metadati
- `src/__tests__/ai-errors.test.js` (14 test), `ai-buildSystemPrompt.test.js` (7 test), `ai-generateCarousel.test.js` (9 test), `ai-validateGenerated.test.js` (7 test)

---

## [1.9.0] — 2026-05-13

### Added
- **Sistema di autenticazione OTP** — login wall completo (passwordless, senza JWT né cookie)
  - Flusso: email → codice a 6 cifre inviato via backend → verifica → accesso
  - `LoginScreen` full-screen sostituisce l'intera app per gli utenti non autenticati (gate a livello di root)
  - `EmailStep`: input email con validazione regex client-side + chiamata `POST /otp-request`
  - `OtpStep`: 6 input separati con auto-focus campo successivo, incolla da clipboard, reinvia codice
  - Sessione persistita in `localStorage` alla chiave `carosello:user_session` (JSON `{ email, userId, role, plan }`)
  - Profile fetch in background (non bloccante): `GET /profile/{userId}` aggiorna `role` e `plan`; fallisce silenziosamente
  - Logout conserva la bozza del carosello (`carosello.draft.v1`) — rimuove solo la chiave di sessione
  - `useAuth()` hook con `useReducer` indipendente dallo store carousel
  - `AuthenticatedApp` estratto come componente separato per rispettare le regole dei hook React con il gate di autenticazione
  - Bottone logout + email utente troncata nell'header (icona `LogOut` da lucide-react)
  - `.env.example` con i placeholder per `VITE_API_BASE_URL` e `VITE_API_AUTH_TOKEN`
  - Test: `auth-storage.test.js` (8 test) e `useAuth.test.js` (8 test) con mock localStorage via `vi.stubGlobal`
- `docs/auth-system.md`: specifica tecnica del sistema OTP portato da Wandly

---

## [1.8.0] — 2026-05-13

### Added
- **Generatore AI** — UI completa (scaffolding senza chiamate API attive)
  - Bottone "Genera con AI" nell'header con icona Sparkles e stile verde accento (`.btn-generate-ai`)
  - `AiGeneratorModal`: modale `size="lg"` con due tab — "Genera" e "Avanzate"
  - Tab **Genera**:
    - Textarea testo sorgente con auto-grow (min 12 righe, max ~20) e contatore caratteri con soglie cromatiche (< 800 muted, 800-3000 normale, > 3000 giallo warning)
    - Slider numero slide 8-18 + toggle "Auto" (valore `'auto'`)
    - Textarea istruzioni aggiuntive (opzionale)
    - Info banner few-shot con conteggio caroselli di esempio nella libreria
  - Tab **Avanzate**: system prompt letto come asset raw (`?raw`) e reso con `react-markdown`; bottone "Copia negli appunti"
  - Stato del form resettato a ogni apertura (componente smontato al close — render condizionale)
  - Bottone "Genera carosello" sempre disabilitato (integrazione backend prevista in fase successiva)
- `src/lib/ai/system-prompt.md`: copia del system prompt in `src/` per risoluzione affidabile con Vite `?raw`
- `docs/ai-ui-scaffolding-prompt.md`: brief di design dell'interfaccia AI
- Dipendenza: `react-markdown`

---

## [1.7.0] — 2026-05-13

### Added
- **UI selettore template** nella ThemeTab, sopra la sezione palette
  - `TemplateSelector`: dropdown con nome e descrizione di ogni template disponibile
  - `TemplateManagerModal`: modale con lista template di sistema, badge "Attivo", bottone Applica (disabilitato se già attivo)
  - Al cambio template: se la palette predefinita del template differisce da quella corrente, appare un toast con action button "Applica" per cambiare palette in un click
  - Il cambio template è incluso nello stack undo/redo
- **Toast con action button**: `toast(msg, type, { label, onClick })` — quando è presente una action il toast ha durata 6000ms (vs 3500ms standard) e mostra un bottone inline che esegue il callback e chiude il toast

### Changed
- `ThemeTab.jsx`: aggiunta sezione "Template" con `TemplateSelector` + link "Gestisci template…"
- `useCarouselStore.js`: nuove azioni `APPLY_TEMPLATE`, `OPEN_TEMPLATE_MANAGER`, `CLOSE_TEMPLATE_MANAGER`; stato UI esteso con `templateManagerOpen`

---

## [1.6.0] — 2026-05-13

### Added
- **Nuovo template `system-bold-corner`** — layout manifesto con mood diretto e impattante
  - Namespace CSS `.bold__*`
  - Angolo decorativo top-right con `clip-path: polygon(100% 0, 0 0, 100% 100%)` in `var(--slide-bg)` su `var(--slide-accent)`
  - Tipografia Archivo Black uppercase dominante; trattino obliquo (`/`) in accent color come separatore visivo
  - Box numero slide a sfondo accent; attribuzione quote con prefisso `—` in accent
  - Tutti i 5 tipi slide supportati: cover, standard, divider, cta, quote
- **Nuova palette `system-bold-yellow`** (`builtinPalettes.js`) — giallo acceso `#FFE135` su nero `#0A0A0A`; palette predefinita del template Bold Corner

---

## [1.5.0] — 2026-05-13

### Added
- **Architettura template** — refactor strutturale del renderer slide (app pixel-identica alla v1.4.1)
  - `src/slide-renderer/templates/registry.js`: registry centralizzato con `getTemplate(id)`, `DEFAULT_TEMPLATE_ID`, fallback a `system-editorial-mark` per id sconosciuti (warn in console)
  - `src/slide-renderer/templates/editorial-mark/`: manifest, router `EditorialMark.jsx`, 5 componenti slide, header/footer, CSS con namespace `.editorial__*`
  - `inlineTags.jsx` parametrizzato: `parseInlineTags(text, classMap, keyPrefix)` con `DEFAULT_CLASS_MAP` come default retrocompatibile
  - `SlideRenderer.jsx`: risolve il template via registry, inietta `--slide-surface` nelle CSS vars, aggiunge `data-template` sul root `.slide`
  - `slide-renderer.css` ridotto a: container `.slide`, `@font-face`, selettori `[data-mode]`, variabili CSS base; tutto il resto è nel CSS del template
  - Schema: `ThemeSchema` aggiunge `template_id: z.string().min(1).default('system-editorial-mark')`
  - Migration: step idempotente che aggiunge `template_id: 'system-editorial-mark'` ai caroselli legacy; fallback per id sconosciuti
  - `defaultCarousel.js`: aggiunto `theme.template_id: 'system-editorial-mark'`
  - Glow `.editorial__dot` usa `color-mix(in srgb, var(--slide-accent) 50%, transparent)` invece del valore hardcoded `rgba(0,255,170,0.5)`
- **Nuovi test**: `migrateCarousel.test.js` (7 test); aggiornati `schema.test.js` e `inlineTags.test.js` per le nuove API

### Changed
- `src/slide-renderer/slideTypes/` **eliminata**: componenti spostati nel template Editorial Mark (nessun cambiamento visivo)
- `src/components/edit-modal/EditModal.jsx`: `PREVIEW_SCALE` da 0.38 a 0.36 per migliore adattamento al layout modale

---

## [1.4.1] — 2026-05-12

### Changed
- Modale di modifica slide: aggiunto `padding-right: 16px` all'anteprima per simmetria con il padding sinistro del form — l'anteprima non è più a ridosso del bordo destro della modale.
- Textarea ridimensionabili verticalmente (`resize: vertical`) in:
  - `LinesEditor` (righe del testo slide) con `min-h: 2.5rem`
  - `_note_autore` (note autore) con `min-h: 3rem`

  Permette di leggere/scrivere testi lunghi senza dipendere dallo scroll interno della textarea.

---

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

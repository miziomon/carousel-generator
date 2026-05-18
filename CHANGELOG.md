# Changelog

## [1.22.0] — 2026-05-18

### Added
- **Overlay hover slide migliorato**: il passaggio del mouse sulla thumbnail mostra ora due bottoni distinti con overlay scuro `rgba(0,0,0,0.62)` — "Modifica" (accent colorato) e "Anteprima" (bianco traslucido) con transizione opacity fluida
- **Modal Anteprima slide**: bottone "Anteprima" nell'overlay apre una `Modal size="lg"` che mostra la slide scalata fino a 600×560px mantenendo l'aspect ratio del formato corrente (quadrato / portrait / landscape)

### Changed
- **`slide-card__thumbnail-wrap`**: rimosso `onClick` diretto; il clic su "Modifica" nel nuovo overlay chiama `onEdit`
- **CSS**: rimosso pseudo-elemento `::after` con testo "Modifica" sostituito da `.slide-card__hover-overlay` + `.slide-card__hover-btn` (React DOM, non CSS puro) — permette bottoni cliccabili nell'overlay

## [1.21.0] — 2026-05-18

### Added
- **Titolo dinamico**: il tag `<title>` mostra ora `SLIDE-ORAMA — v{versione}` (versione presa da `package.json`)
- **Sistema tema chiaro/scuro**: l'app supporta ora tre modalità — Automatico (segue `prefers-color-scheme`), Scuro, Chiaro (warm off-white editoriale: sfondo `#faf9f7`, testo `#1c1917`, accent `#00a86b`)
- **Preferenze utente**: nuova voce "Preferenze" nel menu utente che apre `AppPreferencesModal` — toggle grafico tre-opzioni (Auto / Scuro / Chiaro) con swatch visivi e descrizione
- **`useAppTheme.js`**: hook che gestisce la preferenza tema (`auto | dark | light`), la persiste in `localStorage` (chiave `app-theme`), applica `[data-theme="light"]` su `<html>` e si aggiorna quando cambia `prefers-color-scheme` (solo in modalità auto)
- **Variabili CSS globali**: sistema `--app-*` in `:root` (dark default) con override `[data-theme="light"]` per bg-panel, bg-card, bg-popup, bg-deep, fg, fg-rgb, accent, accent-rgb, danger
- `src/components/header/AppPreferencesModal.jsx` + `app-preferences-modal.css` — modal preferenze con swatch e toggle tema

### Changed
- **`.header__logo`**: invariato per design constraint (JetBrains Mono, colore `#00ffaa`)
- **CSS componenti**: tutti i file CSS dell'UI shell (`header.css`, `theme-sidebar.css`, `tab-bar.css`, `slide-grid.css`, `edit-modal.css`, `carousel-library.css`) refactorizzati per usare variabili `--app-*` invece di colori hardcoded
- **`Modal.jsx`**: convertito da classi Tailwind `bg-slate-*` a stili inline con variabili CSS, compatibile con entrambi i temi
- **`UserMenu.jsx`**: aggiunta voce "Preferenze" con icona `Settings` nel menu dropdown utente
- **`Header.jsx`**: accetta e propaga nuova prop `onOpenPreferences`
- **`App.jsx`**: importa `useAppTheme` e `pkg.version`; imposta il titolo via `useEffect`; passa `appTheme` ad `AuthenticatedApp` e renderizza `AppPreferencesModal`
- **`body` in `index.css`**: usa `var(--app-bg)` / `var(--app-fg)` + `transition: background-color 0.2s ease, color 0.2s ease`

## [1.20.0] — 2026-05-18

### Added
- **Slider dimensione font per slot**: nella sidebar → sezione Fonts, sotto ogni dropdown font (Primario, Secondario, Monospace) è ora presente uno slider 8–120 px che imposta la **dimensione base** del testo per quello slot. Il valore è il base size da cui i template derivano le dimensioni per ogni preset (xl/lg/md) tramite ratio
- **Override tipografia per-slide**: l'EditModal ora ha un terzo tab "Tipografia" che permette di sovrascrivere, solo per quella slide, tre parametri: slot font (primary/secondary/mono), famiglia specifica (override), dimensione in px (override). Le impostazioni per-slide hanno la precedenza su quelle globali del tema
- **Custom CSS globale**: nuova sezione "Custom CSS" nella sidebar (sotto Immagine, prima di Reset). Il CSS scritto in questa textarea viene applicato a tutte le slide tramite un `<style>` globale nell'`<head>`. Debounced per non saturare la history; persistito nel JSON e nel draft
- **`resolveSlideFont`**: nuovo helper in `src/lib/fonts/resolveFont.js` che fonde lo slot, il font override e il size override per-slide in un unico set di CSS variables
- **`--font-size-base`**: nuova CSS variable esposta da `resolveFontVars` e `resolveSlideFont`, usata dai template per scalare il testo rispetto al base size del tema

### Changed
- **Template slides** (editorial-mark e bold-corner): `Standard`, `Cover`, `Divider`, `Quote` ora calcolano `finalSize` come `base × ratio × fontSizeMultiplier` invece di `calibration.px × multiplier`. Il ratio è derivato dalle calibrazioni del template (xl/lg/md rispetto a md). Compatibilità garantita: con i default (68px) il rendering visivo è identico alla versione precedente per editorial-mark
- **Tab "Contenuto" EditModal**: il radio "Font" (slot) è stato spostato nel nuovo tab "Tipografia"
- `theme.fonts` ora include sotto-oggetto `sizes: { primary, secondary, mono }` (default 68/68/18 px)
- `theme.customCss` aggiunto al ThemeSchema (stringa, max 20.000 caratteri, default '')
- `slide.font_id_override` e `slide.font_size_override` aggiunti agli SlideBaseFields come campi opzionali
- Migrazione retrocompatibile: `migrateCarousel` aggiunge automaticamente `fonts.sizes` e `customCss` ai caroselli più vecchi
- `useUiPreferences.js`: aggiunta sezione `customCss` nelle preferenze sidebar
- 9 nuovi test unitari (resolveSlideFont: 6; migrazione sizes: 3; migrazione customCss: 2)

### Files created
- `src/components/theme-sidebar/sections/FontSizeSlider.jsx` + `.css`
- `src/components/theme-sidebar/sections/CustomCssSection.jsx` + `.css`
- `src/components/edit-modal/TypographyPanel.jsx` + `.css`
- `src/__tests__/resolveSlideFont.test.js`

---

## [1.19.0] — 2026-05-18

### Added
- **Immagine di sfondo globale**: nuova sezione "Immagine globale" nella sidebar tema (subito dopo Fonts). L'immagine si applica a tutte le slide; ogni slide può ereditarla, personalizzarla o forzare "Nessuno sfondo" tramite override esplicito (`background_image: null`)
- **Override slide per immagine**: nella tab "Sfondo" del modal di modifica singola slide, tre nuovi stati — "eredita globale" (con bottoni _Personalizza_ e _Nessuno sfondo_), "nessuno sfondo forzato" (con bottone _Ripristina eredità_), più il comportamento originale per slide con immagine custom

### Changed
- **Tag `<title>`**: rinominato da "Carosello Builder" a "SLIDE-ORAMA"
- **Font singola slide — 3 opzioni**: i valori legacy `archivo` / `fraunces` sostituiti con `primary` / `secondary` / `mono` (label: Primario / Secondario / Monospace); ora il cambio font si applica realmente al rendering
- `src/lib/schema.js` — `slide.font` esteso a `z.enum(['primary','secondary','mono'])`; `theme.background_image` aggiunto come campo opzionale nullable; `BackgroundImageSchema` spostato prima di `ThemeSchema` per rispettare l'ordine di dichiarazione

### Fixed
- **Bug font singola slide**: qualunque opzione scelta (Archivo Black o Fraunces) produceva sempre Archivo Black perché i valori `archivo`/`fraunces` non corrispondevano ai 3 slot semantici del sistema font

### Notes
- I caroselli salvati con `slide.font: 'mono'` vengono ora preservati dalla migrazione (`migrateSlideFont` aggiornato)
- `normalizeMinimal.js` propaga `theme.background_image` nell'import di JSON minimali
- `BlankSlide.jsx` aggiornato per mappare correttamente il terzo slot mono

---

## [1.18.0] — 2026-05-18

### Changed
- **Logo**: rinominato "Carousel Generator" in "SLIDE-ORAMA"
- **Header — ordine azioni**: SyncIndicator spostato come prima voce (prima di Undo/Redo); "Nuovo" spostato dopo "Aggiungi slide"; "Apri" e "Salva" spostati prima di "Importa" con separatore dinamico (sparisce automaticamente quando non loggato)
- **Bottoni "Esporta" e "Salva"**: rimosso background (`variant secondary` → `ghost`), allineati visivamente agli altri bottoni dell'header
- **Export ZIP**: i PNG dentro lo ZIP ora usano il titolo del progetto come prefisso (`nome-progetto-01.png` invece di `slide-01.png`); fallback `carosello` se il titolo è vuoto

---

## [1.17.0] — 2026-05-17

### Added
- **Sistema font espanso (2 → 12 font)**: Archivo Black, Bebas Neue, Anton, Oswald (display); Inter, DM Sans, Plus Jakarta Sans, Manrope (sans); Fraunces, Playfair Display, DM Serif Display, Lora (serif); JetBrains Mono (mono). Tutti self-hosted come `.woff2` in `public/fonts/`
- **Font slot semantici**: `slide.font` passa da `'archivo'|'fraunces'` a `'primary'|'secondary'`; i template sono ora agnostici al font reale
- **Modulo `src/lib/fonts/`**: `registry.js`, `categories.js`, `compensations.js`, `presets.js`, `resolveFont.js`, `preload.js` — architettura completa con compensazioni tipografiche per-font (letter-spacing, line-height multiplier, weight, size multiplier, text-transform, font-variation-settings)
- **5 preset di pairing**: Editorial Classic, Tech Modern, Bold Statement, Minimal Sober, Warm Narrative, ciascuno con label + descrizione
- **UI sidebar Fonts**: `FontDropdown` con categorie, anteprima nel font stesso, checkmark sull'attivo, badge ⚠ per font fuori-ruolo; `FontPresetSelector` per applicare i 5 preset in un click; toggle "Mostra tutti i font"
- **Live preview hover**: passando il mouse su un'opzione font le slide si aggiornano in tempo reale; leaving ripristina il font corrente (stato `fontPreview` fuori dalla history)
- **Preload font on demand**: `preloadAllFonts()` chiamata alla prima apertura di un FontDropdown — FOUT eliminato nelle preview
- **Migrazione retrocompatibile**: i JSON storici con `slide.font: "archivo"` o `"fraunces"` vengono migrati silenziosamente a `"primary"` / `"secondary"`; font ID sconosciuti nel theme ricadono sui default per categoria

### Changed
- `src/lib/schema.js` — `slide.font` è ora `z.enum(['primary','secondary'])`, `theme.fonts.*` è `z.enum([...FONT_IDS])`
- `src/lib/migrations/migrateCarousel.js` — aggiunto `migrateSlideFont` e `migrateThemeFonts`
- `src/lib/ai/system-prompt.md` — aggiornati tutti i valori ammessi per `slide.font`
- `src/lib/defaultCarousel.js` — tutti i preset slide aggiornati a `font: 'primary'`
- 8 template JSX (editorial-mark + bold-corner): tutti usano `resolveFontVars(slide.font, theme)` e CSS vars inline invece di classi `--archivo` / `--fraunces`
- `src/slide-renderer/templates/editorial-mark/editorial-mark.css` e `bold-corner.css` — rimossi blocchi `--archivo` / `--fraunces`, aggiunto rule unificata con `font-family: var(--font-family)`
- `src/slide-renderer/SlideRenderer.jsx` — supporto prop `fontPreview` per live preview; inietta CSS vars slot `--slot-primary-*`, `--slot-secondary-*`, `--slot-mono-*`
- `src/slide-renderer/BlankSlide.jsx` — la caption usa `var(--slot-primary-family)` / `var(--slot-secondary-family)` invece dell'hardcode
- `src/hooks/useCarouselStore.js` — aggiunte action `APPLY_FONT`, `APPLY_FONT_PRESET`, `PREVIEW_FONT_CHANGE`, `CLEAR_FONT_PREVIEW`; stato `fontPreview` fuori da history
- `src/hooks/useUiPreferences.js` — aggiunto `fontShowAll: false`
- `src/components/theme-sidebar/sections/FontsSection.jsx` — completamente riscritta (era 3 TextInput liberi)
- `src/index.css` — aggiunti 13 blocchi `@font-face` con `font-display: block`

### Tests
- Nuovo `src/__tests__/migrateFonts.test.js` — 12 test coprono `migrateSlideFont` (archivo/fraunces/sconosciuto) e `migrateThemeFonts` (id valido/invalido/mancante)
- `src/__tests__/schema.test.js` e `src/__tests__/ai-validateGenerated.test.js` aggiornati ai nuovi enum

### Notes
- 3 variable font (Inter, Lora, Manrope) vanno scaricati manualmente da [google-webfonts-helper](https://gwfh.mranftl.com/fonts) e salvati come `Inter-Variable.woff2`, `Lora-Variable.woff2`, `Manrope-Variable.woff2` in `public/fonts/`

---

## [1.16.0] — 2026-05-16

### Added
- **Export PDF per LinkedIn**: nuovo formato di esportazione che genera un PDF multi-pagina con tutte le slide del carosello, ottimizzato per la pubblicazione su LinkedIn
- **Voce "Esporta PDF (LinkedIn)"** nel dropdown Esporta, con icona `FileText` e badge warning ⚠ se il formato attivo è landscape
- **Dialog di warning landscape**: se il formato è landscape, prima dell'export appare un dialog che informa l'utente dello scarso rendering nel feed mobile LinkedIn, con opzione di procedere comunque
- **Modal di progresso PDF**: mostra slide corrente/totale, progress bar percentuale e dimensione stimata in MB calcolata in tempo reale
- **Gestione errori PDF**: in caso di errore il modal rimane aperto con il messaggio di errore e un bottone Chiudi
- **Naming automatico**: il file ha sempre la forma `{slug-titolo}-linkedin.pdf`
- **Metadata PDF embedded**: title, author, subject, creator valorizzati dai dati del carosello
- `src/lib/renderSlideAsPng.jsx` — funzione di rendering condivisa con `pixelRatio` parametrizzabile (1× per PDF, 2× retina per PNG/ZIP)
- `src/lib/exportPdf.js` — pipeline export PDF con import dinamico di `jspdf`
- `src/components/export-panel/ExportPdfLandscapeWarning.jsx` — dialog conferma formato landscape

### Changed
- `src/components/export-panel/ExportPanel.jsx` — aggiunta voce PDF + progress modal PDF + gestione warning landscape
- `src/components/export-panel/export-panel.css` — separatore menu, badge warning, stili modal PDF, dialog landscape
- `vite.config.js` — aggiunto `jspdf` alla lista dei chunk dinamici (lazy, non bundlato in vendor)

### Dependencies
- Aggiunto `jspdf` ^4.x (lazy-loaded, ~112KB gzip, caricato solo all'uso)

---

## [1.15.0] — 2026-05-15

### Added
- **Immagini di sfondo per le slide**: ogni slide può avere un'immagine opzionale con controlli di opacità, sfocatura (blur), posizione (9-grid) e overlay (scuro / chiaro / palette)
- **Tipo slide "Blank"**: canvas privo di header/footer, mostra solo l'immagine di sfondo con didascalia opzionale (posizione configurabile: top / center / bottom)
- **Tab nell'EditModal**: la form è divisa in due tab — "Contenuto" (tipo, testo, campi specifici) e "Sfondo" (gestione completa immagine)
- **BackgroundImageLayer**: layer DOM a 3 livelli (`z-index` 0 bg, 1 overlay, 2 contenuto) nel renderer delle slide
- `src/components/edit-modal/BackgroundImageSection.jsx` — orchestratore stato upload/editor
- `src/components/edit-modal/BackgroundImageEditor.jsx` — editor con anteprima, slider opacità/blur, 9-grid posizione, overlay
- `src/components/edit-modal/BackgroundImageUpload.jsx` — area upload con drag & drop
- `src/components/edit-modal/BackgroundImagePreview.jsx` — mini-anteprima rispettosa del formato
- `src/components/edit-modal/PositionGrid.jsx` — selettore posizione 3×3
- `src/slide-renderer/BackgroundImageLayer.jsx` — layer bg + overlay nel renderer
- `src/slide-renderer/BlankSlide.jsx` — componente slide blank con caption opzionale
- `src/lib/images/processImage.js` — pipeline resize (max 1080px) + JPEG 0.85
- `src/lib/images/estimateSize.js` — stima dimensione carosello con warning a 4 MB
- `src/lib/color/normalize.js` — helper `hexToRgb`
- `src/assets/presets/blank.json` — preset slide blank

### Changed
- **EditModal**: anteprima rispetta l'aspect ratio del formato (portrait/landscape/square)
- **Schema Zod**: aggiunto `BackgroundImageSchema` e `BlankSlideSchema`
- `slide-renderer.css`: aggiunto `isolation: isolate` su `.slide` per clip corretto del blur

---

## [1.14.0] — 2026-05-15

### Added
- **Libreria caroselli**: salvataggio, apertura, rinomina ed eliminazione dei caroselli su DB tramite API REST
- **Bottone "Salva carosello"**: primo salvataggio via modale con anteprima thumbnail, sovrascrittura diretta o "Salva come nuovo" via popup
- **Bottone "Apri carosello"**: libreria con ricerca debounced, ordinamento (6 opzioni), lista scrollabile con thumbnail e badge AI
- **SyncIndicator**: indicatore di stato sync nel header (nuovo / modifiche non salvate / sincronizzato / salvataggio in corso)
- **UserMenu**: dropdown sull'email utente con voci "I tuoi caroselli" e "Logout"
- **Tier e limiti**: utenti `free` fino a 10 caroselli, `pro`/`admin` illimitati; bottone disabilitato a limite raggiunto
- **Thumbnail**: generazione automatica PNG della prima slide al salvataggio
- `src/lib/carousel/api.js` — client REST per tutti gli endpoint `/carousel/*`
- `src/lib/carousel/generateThumbnail.js` — render off-screen slide 1
- `src/lib/carousel/suggestTitle.js` — suggerimento titolo automatico
- `src/lib/utils/timeAgo.js` — formatter tempo relativo in italiano
- `src/lib/auth/tier.js` — derivazione tier da `role`/`plan`, helper `canSaveCarousel`
- `src/hooks/useCarouselCount.js` — contatore caroselli salvati con `refresh()`
- Nuove azioni store: `SET_DOCUMENT_IDENTITY`, `SET_IS_SAVING`, `LOAD_FROM_DB`, `CLEAR_DOCUMENT_IDENTITY`, `UPDATE_DOCUMENT_TITLE`

### Fixed
- **Formato JSON ignorato all'import**: `normalizeMinimalCarousel` non preservava `format` e `template_id` — il carosello importato tornava sempre a 1:1
- **Warning `flushSync`**: `generateThumbnail` chiamato da `useEffect` causava "flushSync called from inside a lifecycle method"; risolto con `setTimeout(0)`
- **`user_id` assente nel body API**: `App.jsx` leggeva `auth.user?.id` invece di `auth.user?.userId`, causando un `ValidationError` dal backend

---

## [1.13.0] — 2026-05-13

### Added
- Thumbnail griglia nella preview slide
- Readability warning per formato non quadrato
- Sezione Formato nella sidebar Tema

### Changed
- Calibrazioni tipografiche per format Editorial e Bold
- Container slide parametrizzato via CSS variables
- Registry formati con migrazione retrocompat e action `APPLY_FORMAT`

---

## [1.12.1] — 2026-05-10

### Fixed
- Ripristino padding slide invertito da import `TEMPLATES` in `App.jsx`

---

## [1.12.0] — 2026-05-10

### Added
- Template selector apre la modale direttamente

---

## [1.11.0] — 2026-05-09

### Added
- ThemeSidebar: pannello Tema diventa sidebar collassabile

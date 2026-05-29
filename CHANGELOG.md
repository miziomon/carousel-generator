# Changelog

## [Unreleased]

### Added
- **Sticker globale** (sidebar → sezione "Sticker globale"): nuova sezione del tema per applicare un'immagine in sovraimpressione sopra il contenuto di tutte le slide. Controlli: dimensione 25–250 px (default 150 px, lato maggiore con aspect ratio preservato), rotazione −180°/+180°, opacità 0–100%, posizione tramite slider X/Y 0–100% e area interattiva cliccabile/trascinabile che rispetta l'aspect ratio del formato slide corrente. Selezione immagine via drag & drop / upload diretto (base64, trasparenza PNG preservata) o dalla libreria immagini remota. Il layer sticker (`z-index: 3`) è renderizzato sopra testo e overlay. Il campo `theme.global_sticker` è predisposto per futuri override per-slide senza migrazioni distruttive

### Changed
- **`processImage.js`** — nuova utility `processImageFilePreserveAlpha()` per upload immagini che preserva la trasparenza PNG (usata dallo `StickerEditor`)
- **Schema** — aggiunti `StickerSchema` e `StickerPositionSchema` in `src/lib/schema.js`; `ThemeSchema` espone `global_sticker: StickerSchema.nullable().optional()`
- **Store** — nuova action `APPLY_THEME_STICKER` in `useCarouselStore.js` con dispatcher `applyThemeSticker(sticker)` (oggetto = imposta, `null` = forza nessuno, `undefined` = rimuovi il campo dal theme)
- **Migrazioni** — `normalizeMinimal.js` propaga `theme.global_sticker` applicando i default ai campi mancanti (`size: 150`, `rotation: 0`, `opacity: 1`, `position: { x: 50, y: 50 }`)
- **Renderer** — nuovo `StickerLayer` (`src/slide-renderer/StickerLayer.jsx`) montato in `SlideRenderer` dopo il contenuto della slide; regole CSS `.slide__sticker` aggiunte a `slide-renderer.css`

## [1.29.1] — 2026-05-29

### Changed
- **Template Bold Corner**: sostituiti il testo decorativo `// //` e il box numerazione con un numero slide diretto (`N/TOT`) sovrapposto al triangolo angolare (classe CSS `bold__corner-num`). Rimossi `.bold__slash` e `.bold__num-box` non più necessari

## [1.29.0] — 2026-05-27

### Added
- **Freccia scorri globale** (sidebar → sezione Footer): il toggle "Mostra freccia scorri" è stato spostato da opzione per-slide della cover a impostazione globale del tema. Nuovi controlli: select "Mostra su" (Solo cover / Tutte tranne l'ultima / Tutte le slide), slider posizione Y (0–400 px), slider dimensione font (8–48 px). Migrazione automatica dei JSON esistenti con `show_swipe_arrow: true`
- **Colore testo per-slide** (EditModal → tab Tipografia): checkbox "Personalizza colore body" + `ColorPicker` che sovrascrive `--slide-fg` solo sul testo principale (header, footer e kicker restano sulla palette del tema)
- **Ombreggiatura testo per-slide** (EditModal → tab Tipografia): selettore a 6 preset visivi ("Aa") — Nessuna, Soft, Soft ampia, Drop, Hard sottile, Hard marcata — con color picker dedicato per il colore dell'ombra. Rimuovere con preset "Nessuna"
- **Tipografia funzionante nella slide Blank**: font, dimensione, interlinea, colore body e ombra ora vengono applicati correttamente alla didascalia della slide blank (prima erano ignorati)

### Changed
- **Helper condivisi** `src/slide-renderer/templates/_shared/`: estratta la logica duplicata presente in tutti i 10 componenti slide (`bodyFont.js`, `bodyStyle.js`, `textShadowPresets.js`, `SwipeArrow.jsx`). I nuovi template potranno riusare questi helper senza duplicare codice
- **`BlankSlide`**: riceve ora anche `theme` da `SlideRenderer` e usa `resolveSlideFont` + `buildBodyStyle` per applicare tutti gli override per-slide
- **Schema**: `theme.footer.swipe` (oggetto con `enabled`, `scope`, `position_y`, `font_size`) sostituisce il campo `show_swipe_arrow` per-slide; `SlideBaseFields` aggiunge `color_override` (stringa hex/rgba, opzionale) e `text_shadow` (oggetto `{ preset, color }`, opzionale)

### Removed
- Campo `show_swipe_arrow` dalle slide di tipo `cover` (migrato automaticamente a `theme.footer.swipe`)

## [1.28.0] — 2026-05-27

### Added
- **Libreria immagini**: sistema di gestione immagini remoto basato sull'endpoint `/uploads` del backend (Supabase Storage). Le immagini caricate vengono salvate sul server e referenziate tramite `public_url` remoto nel JSON del carosello (niente più base64 per le nuove immagini)
- **`src/lib/uploads/api.js`**: client API per `POST /uploads` (upload multipart), `GET /uploads` (lista con filtro utente + pubbliche), `PATCH /uploads/{id}` (aggiornamento metadati)
- **`src/components/image-library/ImageLibraryPanel.jsx`**: pannello libreria riutilizzabile con toolbar (upload, filtro Tutte/Mie/Pubbliche, ricerca per titolo), griglia thumbnail lazy, stati loading/empty/error e cache TTL 15s
- **`src/components/image-library/ImageLibraryModal.jsx`**: wrapper modale standalone per la libreria (usato dalla sidebar)
- **Pulsante "Sfoglia libreria" nella sidebar** (sezione Immagine globale): apre la modale libreria; la selezione applica l'immagine come sfondo globale del carosello
- **Toggle libreria nella tab Sfondo dell'EditModal**: cliccando "Sfoglia libreria" la colonna anteprima destra (42%) si trasforma in pannello libreria compatto; la selezione applica lo sfondo alla slide e ripristina l'anteprima
- **`processImageToBlob()`** in `processImage.js`: variante della pipeline resize/compress (max 1080px, JPEG q0.85) che restituisce un `File` per l'upload multipart invece del data URL

### Changed
- **`BackgroundImageUpload`** e **`BackgroundImageEditor`**: accettano prop opzionale `onBrowseLibrary` per mostrare il pulsante "Sfoglia libreria" quando integrati in un contesto con libreria disponibile
- **`BackgroundImageSection`**: propaga `onBrowseLibrary` ai componenti figli
- **`EditModal`**: aggiunta prop `userId` e stato `showLibrary` per il toggle pannello; cambio tab chiude la libreria se aperta
- **`ThemeSidebar`** e **`ImageSection`**: aggiunta prop `userId` per abilitare la libreria immagini

### Retrocompatibilità
- I caroselli esistenti con immagini base64 continuano a funzionare senza modifiche: il renderer `BackgroundImageLayer` tratta `bgImage.data` come `url(...)` sia per base64 sia per URL remoti

## [1.27.0] — 2026-05-27

### Added
- **Magic link (Agent Session)**: login passwordless tramite link temporaneo generato dall'admin. Se l'URL contiene `#access_token=<token>`, l'app scambia automaticamente il token con il backend (`POST /access-links/exchange`), recupera il profilo utente e autentica la sessione senza OTP. Il flusso OTP esistente rimane invariato come alternativa
- **Scadenza automatica sessione agent-link**: se la sessione agent-link è scaduta al momento del caricamento o durante l'uso, l'utente viene disconnesso automaticamente con un messaggio esplicativo
- **Banner errore link**: se l'exchange fallisce (link non valido, revocato, servizio non disponibile), viene mostrato un banner rosso nella schermata di login con il messaggio d'errore specifico
- **`src/lib/auth/agentSession.js`**: modulo dedicato con `exchangeAccessLink()`, `readAccessTokenFromUrl()` (priorità hash → query) e `stripAccessTokenFromUrl()` (rimozione sicura via `history.replaceState`)
- **`src/hooks/useMagicLinkLogin.js`**: hook di bootstrap che orchestra il flusso di exchange all'avvio dell'app

### Changed
- **`useAuth`**: aggiunto stato `expiredLinkMessage`, azione `LINK_EXPIRED` e timer di scadenza automatica per sessioni agent-link
- **`LoginScreen`**: accetta prop `linkError` e legge `auth.expiredLinkMessage` per mostrare il banner d'errore
- **`App`**: mostra uno spinner "Accesso in corso…" durante l'exchange prima di decidere fra login e app autenticata

## [1.26.0] — 2026-05-20

### Fixed
- **Freccia destra (→) apriva sempre la preview**: il listener `keydown` per la navigazione slide veniva registrato anche a modale chiusa. Ora è attivo solo quando la preview è aperta
- **Toggle "pallino" disallineato**: aggiunto `left-0` esplicito allo span assoluto nel componente `Toggle` di `FieldGroup.jsx` per garantire allineamento corretto in tutti i browser

### Added
- **Interlinea globale** (`theme.lineHeight`, default `1`): slider nel pannello "Fonts" della sidebar (range 0.6×–2.5×). Agisce come moltiplicatore sul `line_height` delle calibrazioni del template per tutti i tipi di slide (body + CTA)
- **Interlinea per-slide** (`slide.line_height_override`): checkbox + slider nella tab "Tipografia" dell'EditModal. Se impostato sovrascrive il moltiplicatore globale per quella singola slide
- **Dimensione immagine di sfondo** (`background_image.size`, default `'cover'`): selettore con i valori `cover`, `contain`, `auto` e un valore personalizzato in percentuale (slider 10%–200%). Disponibile sia per l'immagine globale del tema sia per le immagini per-slide

### Changed
- `BackgroundImageSchema` (e `SlideBackgroundImageSchema`): nuovo campo `size: string` con default `'cover'`
- `ThemeSchema`: nuovo campo `lineHeight: number` (0.6–2.5, default `1`)
- `SlideBaseFields`: nuovo campo `line_height_override: number` opzionale
- Tutti i template slide (8 file body + 2 container CTA): moltiplicano `finalLH` o `cta_item.line_height` per il moltiplicatore utente

## [1.25.1] — 2026-05-19

### Added
- **Indicatore peso payload e compressione in `SaveOrNewPopup`**: il popup "Sovrascrivi/Salva come nuovo" mostra ora lo stesso badge dimensione + pulsanti di compressione già presenti nella modale di primo salvataggio. Il carosello compresso (se applicato) viene passato a `handleOverwrite` prima dell'invio API

### Changed
- **`SaveOrNewPopup`**: aggiunto prop `carousel`, stato interno `compressedCarousel`/`compressing`, blocco size con `.save-carousel-modal__size-*` (classi riusate). Box allargato da 380px a 440px per contenere il blocco aggiuntivo
- **`handleOverwrite(compressedCarousel?)`** in `App.jsx`: accetta ora il carosello compresso opzionale passato dal popup

## [1.25.0] — 2026-05-19

### Added
- **Indicatore peso payload nella modale di salvataggio**: badge colorato (verde / giallo / rosso) con la dimensione stimata del `content_json`. Soglie: OK < 700KB, warning 700KB–1.5MB, errore > 1.5MB
- **Compressione immagini nella modale di salvataggio**: due pulsanti "Qualità 85%" e "Qualità 75%" ricomprimono tutte le immagini di sfondo (globali e per-slide) tramite Canvas API. Dopo la compressione viene mostrato il delta rispetto all'originale (es. "↓ 32%, era 1.1 MB"). "Ripristina originale" annulla la compressione
- **`src/lib/images/recompressImages.js`**: utility `recompressCarouselImages(carousel, quality)` e `carouselHasImages(carousel)`. Usa Canvas API (browser-only)

### Changed
- **`buildContentJson(sourceCarousel?)` in `App.jsx`**: accetta ora un carosello sorgente opzionale. `handleDbSave` passa il carosello compresso dalla modale se disponibile, altrimenti usa lo store
- **`SaveCarouselModal`**: interfaccia `onSave(title, thumbnail, compressedCarousel?)` — il terzo parametro è opzionale e usato solo quando l'utente ha applicato la compressione

## [1.24.0] — 2026-05-19

### Added
- **Check dimensione payload prima del salvataggio**: prima di `createCarousel` e `updateCarousel`, viene calcolata la dimensione del `content_json`. Warning toast a 700KB, errore bloccante a 1.5MB. Costanti `API_SIZE_WARNING_THRESHOLD` / `API_SIZE_ERROR_THRESHOLD` in `estimateSize.js`
- **`SlideBackgroundImageSchema`**: nuovo schema Zod con `data` opzionale per le slide. Permette override impostazioni (opacity, blur, position, overlay) senza duplicare il base64 dell'immagine globale

### Fixed
- **Duplicazione immagine globale**: "Personalizza per questa slide" copiava l'intero base64 nella slide (`{ ...globalImage }`), raddoppiando la dimensione del JSON per ogni slide personalizzata. Ora copia solo le impostazioni (opacity, blur, position, overlay) e la slide usa automaticamente il `data` del tema globale
- **Deduplicazione in `buildContentJson()`**: se una slide ha `background_image.data === theme.background_image.data` (legacy carouselli già duplicati), il `data` viene rimosso dalla slide prima dell'invio — riduce il payload senza perdita informazioni

### Changed
- **`SlideRenderer.jsx`**: quando una slide ha `background_image` senza `data` proprio, risolve il data dal `theme.background_image` prima di passarlo a `BackgroundImageLayer` — zero cambiamenti visivi, ma consente lo storage compresso
- **`BackgroundImageSection.jsx`**: nuovo stato `hasSettingsOverride` — mostra `BackgroundImageEditor` con anteprima dell'immagine globale + settings slide-specifici, senza duplicare il base64. Il bottone "Rimuovi" in questo stato rimuove la personalizzazione (slide torna a ereditare completamente)

## [1.23.0] — 2026-05-19

### Added
- **Navigazione slide nel modal Anteprima**: il modal di anteprima (aperto dall'overlay hover) ora mostra frecce prev/next ai lati della slide per scorrere tutto il carosello senza chiudere il modal. Supporto tasto tastiera ← → per navigare, contatore "N / TOTAL" centrato sotto la slide

### Fixed
- **Errore HTTP 400 al salvataggio**: la procedura `handleOverwrite` (sovrascrittura carosello esistente) generava un errore backend `thumbnail: Input should be a valid string` perché inviava `thumbnail: null`. Ora la thumbnail viene ricalcolata prima dell'invio tramite `generateThumbnail`

### Changed
- **Navigazione anteprima spostata in `SlideGrid`**: lo state `previewId` è ora nel componente padre `SlideGrid` (invece che in ogni `SlideCard`) per permettere la navigazione fra slide; `SlideCard` riceve la prop `onPreview(id)` e non gestisce più il modal internamente
- **Refactor colori hardcoded `ai-generator.css`**: sostituiti tutti i valori `rgba(232,232,232,...)` con `rgba(var(--app-fg-rgb),...)`, `rgba(255,255,255,...)` con `rgba(var(--app-fg-rgb),...)`, `#00ffaa` / `rgba(0,255,170,...)` con `var(--app-accent)` / `rgba(var(--app-accent-rgb),...)` — il modulo AI è ora pienamente compatibile con entrambi i temi
- **Refactor colori hardcoded `background-image-section.css`**: sostituiti `rgba(100,116,139,...)` (slate), `rgba(203,213,225,...)`, `rgba(148,163,184,...)`, `rgba(99,102,241,...)` (indigo) con variabili CSS `--app-fg-rgb` e `--app-accent-rgb` — i controlli immagine di sfondo sono ora compatibili con tema chiaro/scuro
- Rimosse le override `[data-theme="light"]` su `btn-generate-ai` (ora innecessarie, usa già le variabili globali)

## [1.22.2] — 2026-05-18

### Fixed
- **Bottoni Sostituisci/Rimuovi immagine nella sidebar**: spostati da affianco all'anteprima (layout row) a sotto di essa (layout column), larghezza piena — erano nascosti/inaccessibili nella sidebar stretta

## [1.22.1] — 2026-05-18

### Fixed
- **Overlay hover slide**: CTA "Modifica" e "Anteprima" disposte in colonna verticale centrata invece di affiancate

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

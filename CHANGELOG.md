# Changelog

## [1.42.0] - 2026-10-09

Richiede hub >= 0.220.0 per `GET /me/usage`: con un hub più vecchio il blocco "Caroselli questo mese" nel menu utente non compare.

### Added
- **Utilizzo mensile nel menu utente**: cliccando sull'email in alto a destra, sotto l'indirizzo compare "Caroselli questo mese" con numero e barra (`carousels_per_month`, gialla dal 70%, rossa dal 90%; "illimitati" senza barra, anche per gli admin). Riletto a ogni apertura del menu da `GET /me/usage`.
- **SEO/GEO della pagina di login**: titolo e descrizione in italiano, canonical, `meta author` Mavida, Open Graph e Twitter con immagine 1200x630, dati strutturati JSON-LD, testo statico dentro `#root`; `public/llms.txt`, `robots.txt`, `sitemap.xml`, `og-image.jpg`.

### Changed
- Il titolo della scheda con la versione si imposta solo dopo il login; la pagina di accesso mantiene il titolo SEO.
- Il login e la schermata di verifica mostrano "Slide-orama" al posto di "Carousel Generator".

## [1.41.0] - 2026-10-09

### Changed
- **hub-auth 1.7.0**: l'informativa privacy nella modale di registrazione si mostra in Markdown (titoli, elenchi, tabelle, link) quando hub la invia in quel formato (hub >= 0.219.0, testo modificabile dalla tab Privacy di admin-dashboard); con un hub più vecchio resta il testo semplice. Nessuna modifica al codice dell'app, solo la libreria.

## [1.40.0] - 2026-10-09

### Changed
- **hub-auth 1.6.0**: nel passo del codice il testo diventa neutro ("Se l'indirizzo è registrato, riceverai un codice via email", perché hub non rivela se l'indirizzo esiste) e, quando la registrazione è abilitata, compare il link "Non hai un account? Registrati", con l'email già scritta nel form. Nessuna modifica al codice dell'app, solo la libreria.

## [1.39.0] - 2026-10-09

### Changed
- **hub-auth 1.5.0**: nel form di registrazione il testo dell'informativa privacy non è più sotto il form ma in una modale, che si apre dal link "informativa sulla privacy" nella frase del consenso o dal pulsante "Visualizza il testo completo dell'informativa". Nessuna modifica al codice dell'app, solo la libreria.

## [1.38.0] - 2026-10-09

### Changed
- **hub-auth 1.4.1**: schermata di login a due metà con larghezza massima di 1200px (su monitor molto larghi pannello e login restano vicini), icona dell'app e descrizione più estesa del tool nel pannello (da hub) e, se la registrazione è abilitata, informativa privacy sotto il form.
- Il login passa il `logo` (`/favicon.svg`) a `LoginScreen`, così l'icona compare nel pannello laterale.
- La CI esegue `npm run lint` prima della build: un errore di lint blocca il deploy.
- **Lint pulito**: ESLint non analizza più `dist/` e `public/` (erano la quasi totalità dei 1.400 errori); corrette le segnalazioni reali (variabili inutilizzate, apostrofo non escapato, un `eslint-disable` inutile e la dipendenza voluta dell'effetto in `EditModal`).

### Fixed
- **Email di esito deploy**: mittente `[Mavida] Claud.ia` come le altre app (prima "Carousel Generator").

## [1.37.0] - 2026-10-09

### Changed
- **hub-auth 1.3.1**: schermata di login a due metà quando il tool ha una descrizione o un avviso su hub (pannello a sinistra, login a destra; sotto i 900px il login passa sopra) e registrazione self-service se abilitata per il tool dalla scheda Tools di admin.mavida.com (nome, email, privacy; esito deciso dalla scheda Registrazioni). Nessuna modifica al codice dell'app, solo la libreria. Richiede hub ≥ 0.216.0.

## [1.36.0] - 2026-10-06

### Added
- **Font Atkinson Hyperlegible Next** (Braille Institute, licenza OFL, variabile 200-800 con corsivo): file in `public/fonts`, `@font-face` in `src/index.css`, voce in `src/lib/fonts/registry.js` e compensazioni dedicate in `compensations.js`.
- **PDF LinkedIn più accessibile** (`src/lib/exportPdf.js`): ogni pagina porta un livello di testo reale ma invisibile (`renderingMode: 'invisible'`) con il testo della slide in ordine di lettura, lingua del documento (`/Lang it`), `DisplayDocTitle` e un segnalibro per slide. Non è un PDF taggato (jsPDF non genera la struttura), quindi non è PDF/UA.
- **Copia testo accessibile** nel menu Esporta: copia negli appunti il testo di tutte le slide, da incollare nella didascalia o nel primo commento (LinkedIn non supporta l'alt text nei documenti). Estrattore in `src/lib/slideText.js` con test.

## [1.35.2] - 2026-10-02

### Changed
- **Icona dell'app**: il monogramma «S» verde neon lascia il posto all'icona `GalleryHorizontal` di lucide (la stessa della dashboard di signup) in bianco su verde `#10B981`, in favicon e icone PWA, generate da `__docs/presentazione/_sorgenti/build_icons.js` (set unico di icone e colori dell'ecosistema, condiviso con signup, la colonna `icon` di hub e la presentazione).
- `theme_color` del manifest e `<meta name="theme-color">` da `#0f172a` a `#10b981`; `background_color` resta scuro.

## [1.35.1] — 2026-10-02

### Changed
- **`createHubAuth({ tool: 'carousel-generator' })`**: l'app dichiara il proprio tool. Login, scambio SSO e `adoptSession` (link condiviso, che rifà `GET /me?tool=`) danno 403 `ToolNotEnabled` a chi non ha il tool nel piano o negli override; gli admin sono esenti. Richiede hub >= 0.192.5 (migration 137).

## [1.35.0] — 2026-10-02

### Changed
- **SSO tra le app** (`@mavida/hub-auth` 1.2.0, `createHubAuth({ sso: true })` in `src/auth.js`): il login fatto su un'altra app apre anche questa senza OTP e il logout (`Header.jsx`) esce da tutte le app. Il magic link dell'email OTP è gestito dalla libreria (nuova notice `link_invalid` nella `LoginScreen`). Il flusso del link condiviso (`useMagicLinkLogin` → `hubAuth.adoptSession`) è invariato.
- `VITE_API_BASE_URL` passa a `https://hub.mavida.com/api/v1/` (host canonico di hub, serve all'SSO). Il secret GitHub `VITE_API_BASE_URL` è stato aggiornato di conseguenza.
- Richiede hub >= 0.192.0 con `https://slideorama.mavida.com` in `SSO_ALLOWED_ORIGINS`.

## [1.34.2] — 2026-10-02

### Changed
- **GitHub Action di deploy aggiornata**: `actions/checkout` v4 → v7 e `actions/setup-node` v4 → v7 (girano nativamente su Node 24: scompare l'avviso di deprecazione di Node 20).
- **`.env.example`**: `VITE_API_BASE_URL` ora indica l'host canonico di hub, `https://hub.mavida.com/api/v1/` (alias Caddy di `/wp-draft-generator/v1/`, stesso backend di `chat.mavida.com`). Verificato che il nuovo host risponda e accetti l'origine di slideorama.mavida.com (CORS). Il valore usato dal deploy è nel GitHub Secret `VITE_API_BASE_URL`.

## [1.34.1] — 2026-10-02

### Changed
- **Chunking del build ottimizzato per Vite 8 / Rolldown**: la configurazione passa da `manualChunks` (deprecato) a `build.rolldownOptions.output.codeSplitting.groups`. Nei chunk vendor dedicati entrano solo le librerie necessarie all'avvio (`vendor-react`, `vendor-motion`, `vendor-dnd`, `vendor-zod`, `vendor-icons` e un `vendor` con axios, zustand, hub-auth e le librerie piccole); tutto il resto resta nel chunk lazy che lo importa. Prima il chunk `vendor` era un contenitore da 664 kB che includeva anche jsPDF con html2canvas, canvg, dompurify, fast-png e core-js, scaricati anche da chi non esportava mai un PDF. Risultato sul codice caricato all'avvio: **1338 kB → 865 kB (−35%), gzip 382 kB → 245 kB**; l'avviso "chunk > 500 kB" del build è sparito. Gli export PDF, ZIP, PNG e la modale AI si caricano solo al primo uso (jsPDF 390 kB e html2canvas 195 kB in chunk separati).
- Vite è già alla 8.3.2, l'ultima 8.x disponibile.

### Removed
- **Sistemi di deploy manuale, ora sostituiti dalla GitHub Action** (`.github/workflows/deploy.yml`, deploy automatico ad ogni push su `main`): `deploy.sh`, `scripts/run-deploy.js`, gli script npm `deploy` e `deploy:skip-build` e le variabili `DEPLOY_*` da `.env.example`. Le credenziali di deploy vivono nei GitHub Secrets.

## [1.34.0] — 2026-10-01

### Added
- **L'app ora è una PWA installabile** (`vite-plugin-pwa`, stesso approccio di Wandly e wp-fleet-manager): manifest, icone (192, 512, maskable, apple-touch, favicon SVG con il monogramma «S» neon su navy) e service worker. Il precache contiene solo l'app shell (~1,9 MB); i font di `public/fonts` (~11 MB) si cachano a runtime solo quando servono. Le chiamate al backend restano sempre live, mai in cache.
- **Avviso "Nuova versione disponibile"** (`usePwaUpdate`, `UpdateToast`, `PwaUpdateNotice`): l'app controlla se è uscita una nuova versione ogni ora e quando la scheda torna in primo piano (al massimo ogni 5 minuti); l'utente sceglie quando ricaricare ("Aggiorna ora" / "Più tardi"), nessun reload automatico. Montato a livello radice, quindi visibile anche sulla schermata di login. Il draft non si perde: è già salvato dall'autosave.
- **Test**: reducer del carosello (45 casi di caratterizzazione), API pubblica e stabilità dell'hook `useCarouselStore`, API carosello (`carousel-api.test.js`), integrazione di `lib/http.js` con hub-auth reale (`http.test.js`), controllo aggiornamenti PWA e `UpdateToast`. Helper condivisi `mockHttp.js` e `fakeHubAuth.js`.

### Changed
- **React 18 → 19**, **Vite 6 → 8**, **`@vitejs/plugin-react` 4 → 6**, **Vitest 3 → 5**, **framer-motion 11 → 12**. Il build passa da ~20 s a ~1 s (Rolldown).
- **Tailwind CSS 3 → 4** (plugin `@tailwindcss/vite`; rimossi `tailwind.config.js`, `postcss.config.js`, `autoprefixer`). Classi rinominate dallo strumento ufficiale (`rounded` → `rounded-sm`, `shadow` → `shadow-sm`, `outline-none` → `outline-hidden`, `flex-shrink-0` → `shrink-0`) e due regole di compatibilità in `src/index.css` (colore dei bordi di default e `cursor: pointer` sui bottoni). Verificato confrontando gli stili calcolati di tutti gli elementi prima e dopo (vista principale e 4 tab della modale): nessuna differenza visiva, tranne 2 px di padding in meno nei `<option>` delle select.
- **Stato del carosello su zustand**: `useCarouselStore` usa uno store globale invece di `useReducer`. Il reducer (tutte le azioni) è invariato ed esportato; l'API dell'hook è identica, quindi `App.jsx` e i componenti non cambiano. Le azioni ignorate dal reducer non provocano più re-render. Nuova `resetCarouselStore()` per i test.
- **Chiamate HTTP su axios** (`src/lib/http.js`): `lib/carousel/api.js`, `lib/uploads/api.js`, `lib/ai/generateCarousel.js` e `lib/auth/agentSession.js` non usano più `fetch`. Gli interceptor sono quelli di `hubAuth.installAxiosInterceptors()` (Bearer letto a ogni richiesta, logout su 401); gli endpoint pubblici usano un'istanza senza credenziali. Comportamento invariato (errori con `message` e `status`, 204 → `null`, mappatura `ApiError`); in assenza di sessione non viene più inviato `Authorization: Bearer null`.
- **`src/__tests__/setup.js`**: se manca un `localStorage` funzionante (Node 25+ ne espone uno sperimentale che oscura quello di jsdom) ne installa uno in memoria, così i test sono uguali su ogni versione di Node.

### Docs
- `CLAUDE.md` e `README.md` allineati: store zustand, `lib/http.js`, sezione PWA, Tailwind 4, nuovo hook `usePwaUpdate`.

## [1.33.0] — 2026-10-01

### Added
- **Separatore tra le righe** (EditModal → tab Contenuto, bottone "Aggiungi separatore" accanto a "Riga vuota (spazio)"): inserisce nell'array `lines` la voce sentinella `"[sep]"`, resa come spazio verticale vuoto alto per default metà della dimensione del testo della slide (più fine della riga vuota, che occupa un'intera riga). Nell'editor appare come riga compatta non editabile.
- **Altezza separatore per-slide** (EditModal → tab Tipografia, sezione "Separatore"): checkbox + slider/campo numerico 0–120 px. Nuovo campo opzionale `separator_size_override` in `SlideBaseFields` (`src/lib/schema.js`); assente = metà della dimensione testo. Propagato da `normalizeMinimal.js` nell'import JSON. Variabile CSS `--slide-separator-size` impostata da `buildBodyStyle`.
- **Classi BEM per ogni riga**: ogni riga delle slide è in uno `<span class="slide-row slide_NN_row_MM">` (es. `slide_01_row_01`, `slide_02_row_03`). La numerazione è posizionale sull'array `lines`: righe vuote e separatori contano.
- **Nuovi test**: classi per-riga e separatore in `inlineTags.test.js`, `bodyStyle.test.js` (nuovo), `separator_size_override` in `schema.test.js`.

### Changed
- **`parseLines`** (`src/slide-renderer/inlineTags.jsx`) — nuovo quinto parametro `slideNum`; ogni riga è wrappata in uno `<span>` (nel path con `aligns` dentro il `<div>` di allineamento). Esportati `SEPARATOR_TOKEN`, `isSeparator`, `rowClassName`.
- **Template editorial-mark e bold-corner** — passano `slide.num` a `parseLines`; aggiunta la classe `sep` ai `*_CLASS_MAP` e la regola CSS `.editorial__separator` / `.bold__separator`. La quote editorial con allineamento per-riga ha le virgolette sulla prima/ultima riga non-separatore.

## [1.32.0] — 2026-09-28

### Security
- **Rimosso il Bearer statico `VITE_API_AUTH_TOKEN`, compilato nel bundle pubblico e condiviso da tutti gli utenti**: le chiamate a `/carousel`, `/uploads` e `/chat/completions` (generazione AI) usavano questo token invece del `session_token` per-utente emesso dal login. Chiunque apriva la console del browser poteva estrarlo e usarlo per operare come qualunque altro utente (identità determinata solo dallo `user_id` passato nel body/query). Ora ogni chiamata usa il `session_token` della sessione autenticata (OTP o magic link), gestito da `@mavida/hub-auth`.

### Changed
- **Login OTP e magic link migrati a `@mavida/hub-auth`** (libreria condivisa dei progetti hub, `mavidasnc/hub-auth` v1.1.0): sostituisce l'implementazione locale (`hooks/useAuth.js` a `useReducer`, `lib/auth/{api,storage}.js`, `components/auth/{EmailStep,OtpStep,LoginScreen}.jsx`), ora rimossa. La sessione salvata dalla vecchia versione (`carosello:user_session`) viene recuperata in automatico e ripulita, senza sloggare nessuno — incluse le sessioni da magic link, il cui `sessionToken` la vecchia versione salvava ma non usava mai come Bearer (era di fatto il bug di sicurezza sopra: l'app girava solo sul token statico).
  - `hub-auth` v1.1.0 aggiunge `adoptSession({token, user})`, usata dal magic link (`hooks/useMagicLinkLogin.js`) per adottare la sessione ottenuta da `POST /access-links/exchange` con lo stesso trattamento di un login OTP riuscito (persistenza, guardia sul 401, refresh da `GET /me`). La scadenza del link non è più un timer lato client basato su `expiresAt`, ma la scadenza reale della sessione lato server.
  - `App.jsx`: la guardia manuale (`!auth.isLoggedIn`) mostra ora anche uno stato di caricamento durante la validazione della sessione al boot (`auth.isChecking`), prima assente.
  - `hooks/useAuth.js` resta come wrapper di compatibilità (stessa forma pubblica: `user.userId`, `tier`, `isLoggedIn`, `logout`) per non toccare `App.jsx`/`Header.jsx` oltre il minimo.
  - `lib/carousel/api.js`, `lib/uploads/api.js`, `lib/ai/config.js`: leggono il token da `hubAuth.getToken()` ad ogni chiamata invece che da una costante di modulo, e notificano `hubAuth.handleUnauthorized()` sui 401.
  - `docs/auth-system.md`: sostituito con un rimando alla nuova architettura (descriveva l'implementazione locale ora rimossa).
  - Verificato end-to-end contro hub in produzione: login OTP (editor, menu utente), logout. Il magic link è verificato via i test della libreria (`adoptSession`) e la revisione del codice, non con un link reale generato in produzione.

## [1.31.0] — 2026-06-18

### Added
- **Allineamento orizzontale per-riga** (EditModal → sezione "Testo (righe)"): ogni riga delle slide testuali (`cover`, `standard`, `divider`, `quote`) può essere allineata in modo indipendente a sinistra, al centro o a destra tramite tre bottoni sempre visibili accanto a ciascuna riga. Nuovo campo opzionale `lines_align` in `SlideBaseFields` (`src/lib/schema.js`): array di `'left'|'center'|'right'` parallelo a `lines`. Il campo viene omesso quando tutte le righe sono allineate a sinistra, garantendo JSON pulito e piena retrocompatibilità con i caroselli esistenti
- **Font variabile Google Sans** (`src/lib/fonts/registry.js` + `src/index.css`): nuovo font sans-serif con varianti normale e italica (assi variabili `wght`, `opsz`, `GRAD`), disponibile per gli slot primario e secondario
- **Nuovi test**: copertura di `parseLines` con allineamento per-riga (`inlineTags.test.js`), validazione `lines_align` e conservazione nel flusso di normalizzazione import (`schema.test.js`)

### Changed
- **`parseLines`** (`src/slide-renderer/inlineTags.jsx`) — accetta un quarto parametro opzionale `aligns`: quando presente wrappa ogni riga in un `<div>` con `text-align` inline (necessario perché `text-align` non agisce su nodi inline); quando assente mantiene invariato il comportamento con `<br>`, evitando regressioni sulle slide esistenti
- **Template editorial-mark e bold-corner** — gli otto componenti slide con righe propagano `slide.lines_align` a `parseLines`. La quote di editorial-mark mantiene le virgolette tipografiche attaccate al testo inserendole nel primo/ultimo blocco-riga
- **`normalizeMinimal.js`** — `normalizeSlide` propaga il campo `lines_align` (ricostruisce le slide campo per campo, quindi senza questo intervento il campo andrebbe perso nell'import JSON)

## [1.30.2] — 2026-05-29

### Added
- **Sistema di deploy** (`deploy.sh`, `scripts/run-deploy.js`): script bash con guardie git (branch main/master, working tree pulito, allineamento con origin), creazione tag annotato `v<version>` da `package.json`, build di produzione, scrittura `dist/version.json` con versione/tag/commit/data, upload via `sshpass+rsync` → fallback `pscp/plink` (PuTTY) → fallback interattivo. Wrapper Node `scripts/run-deploy.js` per trovare Git Bash su Windows. Aggiornati `package.json` (`deploy`, `deploy:skip-build`) e `.env.example` con le variabili `DEPLOY_*`

## [1.30.1] — 2026-05-29

### Changed
- **`exportPng.jsx`** — ridotto a thin wrapper su `renderSlideAsPng` (elimina la duplicazione della logica di render; `pixelRatio` fisso a 2 come prima)

### Docs
- **CLAUDE.md** — allineato allo stato reale del codice: fix dimensioni SlideRenderer (format-aware, non solo 1080×1080), aggiunta sezione Export PDF, documentata `renderSlideAsPng.jsx` come nucleo condiviso del render, aggiunta sezione `normalizeMinimal.js`, aggiunta tabella hook ausiliari

## [1.30.0] — 2026-05-29

### Added
- **Tab "Sticker" per-slide** (EditModal → tab tra Sfondo e Tipografia): ogni slide può personalizzare la propria pila di sticker indipendentemente dal tema globale. Funzionalità disponibili: riordino up/down, override di uno sticker globale solo per quella slide (badge "Globale (modif.)" + pulsante ripristina), nascondi uno sticker globale solo per quella slide (sezione "Nascosti" con ripristino), aggiungi uno sticker locale visibile solo in quella slide (badge "Solo qui"). Le modifiche vivono nel draft locale dell'EditModal e vengono committate al salvataggio, senza effetto sulle altre slide
- **`src/lib/resolveSlideStickers.js`**: selettore puro `resolveSlideStickers(slide, theme)` che calcola la pila effettiva di sticker per una slide applicando override (`sticker_overrides`), nascosti (`hidden_stickers`) e ordine custom (`sticker_order`). Esporta anche `materializeOrder(slide, theme)` per materializzare l'ordine al momento del primo riordino. Usato sia da `SlideRenderer` che da `SlideStickerPanel`
- **`src/components/edit-modal/SlideStickerPanel.jsx`** + `slide-sticker-panel.css`: pannello tab per la gestione sticker per-slide. Accordion esclusivo, badge per tipo sticker (Globale / Globale modificato / Solo qui), riusa `StickerEditor` esistente per il corpo
- **Quattro nuovi campi** in `SlideBaseFields` (`src/lib/schema.js`): `stickers` (array sticker locali), `sticker_overrides` (patch parziali per id globale), `hidden_stickers` (id globali nascosti in questa slide), `sticker_order` (ordine custom della pila)
- **Sei nuove action store** in `useCarouselStore.js`: `ADD_SLIDE_STICKER`, `UPDATE_SLIDE_STICKER`, `REMOVE_SLIDE_STICKER`, `REORDER_SLIDE_STICKER`, `RESET_SLIDE_STICKER_OVERRIDE`, `RESTORE_SLIDE_STICKER` — con relativi action creator esposti dal hook
- **22 nuovi test**: `src/__tests__/resolveSlideStickers.test.js` (12 test) e `src/__tests__/slideStickers.test.js` (10 test — campi schema + logica cleanup)
- **Sticker globali multipli** (sidebar → sezione "Sticker globali"): la sezione ora gestisce un array di sticker applicati a tutte le slide. Ogni sticker ha i controlli precedenti (dimensione 25–250 px, rotazione −180°/+180°, opacità 0–100%, posizione X/Y con picker interattivo) più upload diretto / drag & drop / selezione dalla libreria immagini per-sticker
- **`StickerRow`** (`src/components/theme-sidebar/sections/StickerRow.jsx`): componente accordion per singolo sticker — header con thumbnail 32 px (o icona placeholder), label "Sticker N", frecce su/giù per il riordino, pulsante di rimozione; corpo espanso con `StickerEditor`
- **Accordion esclusivo**: un solo `StickerRow` può essere espanso alla volta; aprirne uno chiude automaticamente il precedente
- **Pulsante "+ Aggiungi sticker"**: crea un nuovo sticker vuoto e lo apre automaticamente in accordion
- **`processImageFilePreserveAlpha()`** in `processImage.js`: utility per upload immagini che preserva la trasparenza PNG (usata da `StickerEditor`)

### Changed
- **`REMOVE_THEME_STICKER`** (store) — ora ripulisce automaticamente `sticker_overrides`, `hidden_stickers` e `sticker_order` in tutte le slide quando un global sticker viene eliminato dal tema, evitando riferimenti orfani
- **`SlideRenderer`** — usa `resolveSlideStickers(slide, effectiveTheme)` invece di leggere direttamente `effectiveTheme.global_stickers`; le slide con override/hide/locali mostrano la pila corretta in preview e in export
- **`useAutoSave`** — gli id degli sticker globali vengono ora **preservati** nel draft (prima erano strippati). Necessario perché `sticker_overrides` e `sticker_order` per-slide li usano come chiavi stabili. Gli id slide (top-level) continuano a essere rimossi
- **`normalizeMinimal.js`** — `normalizeSlide` propaga i nuovi campi sticker per-slide (`stickers`, `sticker_overrides`, `hidden_stickers`, `sticker_order`); inietta id `local-xxx` agli sticker locali privi di id. `STICKER_DEFAULTS` spostato a scope di modulo (condiviso tra `normalizeTheme` e `normalizeSlide`)
- **Schema** — `StickerSchema` aggiunge campo `id: string` (opzionale, runtime) e rende `data` opzionale (sticker appena creato, in attesa di upload); `ThemeSchema` sostituisce `global_sticker: StickerSchema.nullable().optional()` con `global_stickers: z.array(StickerSchema).default([])`
- **Store** — le action `ADD_THEME_STICKER`, `UPDATE_THEME_STICKER`, `REMOVE_THEME_STICKER`, `REORDER_THEME_STICKER` sostituiscono `APPLY_THEME_STICKER`; tutti e quattro i dispatcher sono esposti dal hook
- **Migrazioni** — `normalizeMinimal.js` migra automaticamente JSON legacy con `theme.global_sticker` (oggetto singolo) verso `theme.global_stickers: [{ ...defaults, id }]`; i JSON già con `global_stickers` ricevono gli eventuali `id` mancanti
- **Renderer** — `SlideRenderer` itera su `global_stickers[]` renderizzando un `StickerLayer` per ciascuno; l'array viene invertito prima del render così lo Sticker 1 (primo in lista) è sempre il layer più in alto visivamente
- **`StickerEditor`** — `onChange` emette ora patch parziali (non più l'oggetto completo); il pulsante "Sfoglia libreria" è spostato dentro l'editor (per-sticker) e non più nella sezione esterna; "Rimuovi immagine" cancella solo il `data`, mantenendo lo sticker con i suoi parametri
- **`StickerSection`** — completamente riscritta come lista di `StickerRow` con stato locale `expandedId`
- **ESLint config** — aggiunto `varsIgnorePattern: "^_"` alla regola `no-unused-vars` per il pattern `{ id: _id, ...rest }` già usato in tutto il progetto

### Fixed
- **Riordino sticker bloccato su draft pre-esistenti** — `buildInitialState` e `LOAD_FROM_DB` ora chiamano `injectGlobalStickerIds(theme)` che assegna un nanoid a qualsiasi sticker globale privo di `id`. I draft salvati con il vecchio autosave (che strippava gli id) causavano `order.indexOf(undefined) = 0` per tutti gli sticker, rendendo impossibile il riordino e producendo visualizzazioni duplicate

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

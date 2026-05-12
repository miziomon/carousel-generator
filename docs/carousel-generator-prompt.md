# Carosello Builder — Specifica completa per Claude Code

> **Per Claude Code**: questo è un brief denso, da leggere tutto prima di iniziare. La sezione 14 ("Workflow consigliato") spiega come affrontarlo a fasi. Non saltare a scrivere codice subito: prima leggi tutto, fammi domande se servono, poi parti dalla **Fase 1** della roadmap.

---

## 1. Contesto e obiettivo

Costruiamo una **single-page app React** che permette di progettare caroselli Instagram a partire da un file JSON strutturato. L'utente carica un JSON con tema e slide, vede una griglia di anteprime live, modifica i contenuti tramite modale, riordina con drag-and-drop, ed esporta in PNG (singole o ZIP).

L'utente di riferimento è un creator/professionista (PHP/JavaScript senior) che produce contenuti seriali per Instagram e vuole **autonomia totale** rispetto a un flusso di chat. L'app sostituisce un workflow attuale dove le slide vengono generate via Python+Playwright rendendole rigide e poco iterabili.

**Caso d'uso specifico (questo MVP):** una serie chiamata *Pensieri in pillole* — caroselli editoriali su temi tech/AI con identità visiva precisa (sfondo blu notte, accento verde fluo, tipografia bold).

**Importante:** lo schema JSON e lo stile visivo sono fissati. Non vanno reinventati. L'app deve essere fedele allo schema (sezione 4) e al CSS della libreria (sezione 5).

---

## 2. Stack tecnico (vincoli stretti)

| Area | Tecnologia | Note |
|---|---|---|
| Framework | **React 18** + **Vite** | JavaScript (non TypeScript) |
| Styling | **Tailwind CSS** | Per UI dell'app, NON per le slide |
| CSS slide | CSS puro (variabili + classi) | Identico al sistema descritto in §5 |
| Naming convenzioni | **BEM** per i componenti dell'app | block__element--modifier |
| Icone | **lucide-react** | |
| Animazioni | **framer-motion** | Modali, transizioni, feedback bottoni |
| Drag & Drop | **@dnd-kit/core** + **@dnd-kit/sortable** | Standard moderno |
| Export PNG | **html-to-image** | Render del DOM in canvas → blob |
| ZIP | **jszip** + **file-saver** | Per export multiplo |
| Validazione | **zod** | Schema JSON come fonte di verità |
| Editor codice | **@uiw/react-codemirror** + linguaggio JSON | Per la tab "JSON view" |
| Persistenza | **localStorage** | MVP. IndexedDB più avanti |
| Undo/Redo | implementazione manuale con `useReducer` + history stack | Niente librerie esterne |

**Non usare:** TypeScript, Redux, Zustand, styled-components, emotion, classnames (usa template literal o `clsx` se necessario).

---

## 3. Struttura del progetto

```
carosello-builder/
├── public/
│   └── fonts/                       # Font self-hosted (no Google Fonts CDN)
│       ├── archivo-black.woff2
│       ├── fraunces-variable.woff2
│       └── jetbrains-mono.woff2
├── src/
│   ├── main.jsx
│   ├── App.jsx                      # Layout principale, gestione tab
│   ├── index.css                    # Tailwind + reset
│   │
│   ├── components/                  # Componenti React (UI dell'app)
│   │   ├── header/
│   │   │   ├── Header.jsx
│   │   │   └── header.css           # BEM: .header, .header__logo, .header__actions
│   │   ├── tabs/
│   │   │   ├── TabBar.jsx
│   │   │   └── tab-bar.css
│   │   ├── slide-grid/
│   │   │   ├── SlideGrid.jsx        # Griglia con drag&drop
│   │   │   ├── SlideCard.jsx        # Singola card con thumbnail + azioni
│   │   │   └── slide-grid.css
│   │   ├── edit-modal/
│   │   │   ├── EditModal.jsx        # Modale smart, campi dinamici per tipo
│   │   │   ├── LinesEditor.jsx      # Textarea + toolbar tag al cursore
│   │   │   ├── CtaItemsEditor.jsx   # Per slide tipo "cta"
│   │   │   ├── FieldGroup.jsx       # Wrapper riusabile per campo+label+help
│   │   │   └── edit-modal.css
│   │   ├── theme-tab/
│   │   │   ├── ThemeTab.jsx         # Editor del theme.* del JSON
│   │   │   ├── ColorPicker.jsx
│   │   │   └── theme-tab.css
│   │   ├── json-tab/
│   │   │   ├── JsonTab.jsx          # CodeMirror per JSON crudo
│   │   │   └── json-tab.css
│   │   ├── export-panel/
│   │   │   ├── ExportPanel.jsx      # Bottoni export singolo/tutto
│   │   │   └── export-panel.css
│   │   └── ui/                      # Primitive UI riusabili
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       ├── Toast.jsx
│   │       └── ConfirmDialog.jsx
│   │
│   ├── slide-renderer/              # Cuore del rendering delle slide
│   │   ├── SlideRenderer.jsx        # Componente che renderizza UNA slide
│   │   ├── slide-renderer.css       # Il CSS della libreria (§5)
│   │   ├── inlineTags.js            # Parser tag [hl] [soft] [c] [u] [em] → HTML
│   │   └── slideTypes/
│   │       ├── CoverSlide.jsx
│   │       ├── StandardSlide.jsx
│   │       ├── DividerSlide.jsx
│   │       └── CtaSlide.jsx
│   │
│   ├── hooks/
│   │   ├── useCarouselStore.js      # Hook centrale: stato + azioni + history
│   │   ├── useAutoSave.js           # Salvataggio automatico localStorage
│   │   ├── useUndoRedo.js           # Cmd+Z / Cmd+Shift+Z
│   │   └── useHotkeys.js            # Scorciatoie tastiera
│   │
│   ├── lib/
│   │   ├── schema.js                # Schema zod
│   │   ├── validateJson.js          # Validazione + error reporting
│   │   ├── exportPng.js             # html-to-image wrapper
│   │   ├── exportZip.js             # Batch export → ZIP
│   │   ├── defaultCarousel.js       # JSON di default per nuovo progetto
│   │   ├── storage.js               # localStorage helpers
│   │   └── cn.js                    # Utility per concatenare className
│   │
│   └── assets/
│       └── presets/                 # Slide-preset per tipo (skeleton)
│           ├── cover.json
│           ├── standard.json
│           ├── divider.json
│           └── cta.json
│
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## 4. JSON Schema (fonte di verità)

Ecco lo schema completo. Usalo per definire lo zod schema e per generare il JSON di default.

```json
{
  "_schema": {
    "version": "1.0",
    "description": "Schema del carosello..."
  },

  "theme": {
    "palette": {
      "background": "#0a0e1a",
      "foreground": "#e8e8e8",
      "accent": "#00ffaa",
      "muted": "rgba(232,232,232,0.45)",
      "line": "rgba(232,232,232,0.18)"
    },
    "header": {
      "kicker_default": "Pensieri in pillole",
      "show_topline": true,
      "show_dot": true
    },
    "footer": {
      "name": "Maurizio Pelizzone",
      "show_separator_line": true,
      "show_meta_number": true
    },
    "fonts": {
      "primary": "Archivo Black",
      "secondary": "Fraunces",
      "mono": "JetBrains Mono"
    }
  },

  "slides": [
    {
      "num": 1,
      "type": "cover" | "standard" | "divider" | "cta",
      "kicker": "string | null",
      "font": "archivo" | "fraunces",
      "size": "cover" | "xl" | "lg" | "md" | null,
      "lines": ["array di stringhe (NON per type=cta)"],
      "cta_items": ["array (SOLO per type=cta)"],
      "show_swipe_arrow": true,                  // solo per cover
      "divider_number": "01",                    // solo per divider
      "divider_label": "string | null",          // solo per divider
      "_note_autore": "string"
    }
  ]
}
```

### Tag inline (sintassi dentro `lines`)

| Tag | Render HTML | Uso |
|---|---|---|
| `[hl]testo[/hl]` | `<span class="hl-block">testo</span>` | Blocco verde pieno |
| `[soft]testo[/soft]` | `<span class="hl-soft">testo</span>` | Blocco crema pieno |
| `[c]testo[/c]` | `<span class="hl-color">testo</span>` | Solo testo verde |
| `[u]testo[/u]` | `<span class="hl-under">testo</span>` | Sottolineatura verde spessa |
| `[em]testo[/em]` | `<em>testo</em>` | Corsivo |

### Regole di rendering delle `lines`

- Ogni elemento dell'array `lines` è una riga
- Tra una riga e l'altra: `<br>`
- Una stringa vuota `""` produce un `<br>` aggiuntivo (= paragrafo / spazio extra)
- L'ultima riga **non** ha `<br>` finale

Esempio: `["Riga 1", "", "Riga 3"]` → `Riga 1<br><br>Riga 3`

### Vincoli per tipo di slide

- **cover**: una sola riga in `lines`, `size="cover"`, può avere `show_swipe_arrow: true`
- **standard**: 1+ righe in `lines`, `size` ∈ {xl, lg, md}
- **divider**: 1-2 righe in `lines`, deve avere `divider_number` (stringa "01", "02"...)
- **cta**: NON ha `lines`, ha `cta_items` (array di stringhe brevi)

---

## 5. CSS della libreria visiva

Questo è il CSS esatto che le slide devono usare. **Copialo verbatim** in `src/slide-renderer/slide-renderer.css`. NON modificarlo per "migliorarlo". Le scelte tipografiche e i numeri sono il risultato di iterazioni di design già fatte.

```css
/* === RESET LOCALE PER IL CONTENITORE SLIDE === */
.slide * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* === SLIDE CONTAINER === */
.slide {
  /* Dimensioni native — il preview userà transform: scale() per ridurre */
  width: 1080px;
  height: 1080px;
  background: var(--slide-bg);
  color: var(--slide-fg);
  padding: 90px 80px 70px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  /* Le variabili vengono iniettate inline dal componente
     in base al theme.palette del JSON corrente */
}

/* === HEADER === */
.slide__topline {
  position: absolute;
  top: 60px; left: 80px; right: 80px;
  height: 1px;
  background: var(--slide-line);
}
.slide__dot {
  position: absolute;
  top: 54px; right: 80px;
  width: 14px; height: 14px;
  background: var(--slide-accent);
  box-shadow: 0 0 12px rgba(0,255,170,0.5);
}
.slide__num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  letter-spacing: 0.2em;
  color: var(--slide-muted);
  padding-top: 18px;
}
.slide__kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--slide-accent);
  margin-top: 32px;
}

/* === FOOTER === */
.slide__foot {
  margin-top: auto;
  padding-top: 30px;
  border-top: 1px solid var(--slide-line);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.slide__foot-name {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.18em;
  color: var(--slide-fg);
  text-transform: uppercase;
}
.slide__foot-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  letter-spacing: 0.2em;
  color: var(--slide-accent);
  text-transform: uppercase;
}

/* === BODY ARCHIVO === */
.slide__body--archivo {
  font-family: 'Archivo Black', sans-serif;
  letter-spacing: -0.03em;
  margin-top: auto;
  margin-bottom: auto;
}
.slide__body--archivo.slide__body--cover { font-size: 118px; line-height: 0.98; }
.slide__body--archivo.slide__body--xl    { font-size: 96px;  line-height: 1.00; }
.slide__body--archivo.slide__body--lg    { font-size: 82px;  line-height: 1.05; }
.slide__body--archivo.slide__body--md    { font-size: 68px;  line-height: 1.10; }

/* === BODY FRAUNCES === */
.slide__body--fraunces {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-variation-settings: "opsz" 144;
  letter-spacing: -0.025em;
  margin-top: auto;
  margin-bottom: auto;
  line-height: 1.05;
}
.slide__body--fraunces.slide__body--xl { font-size: 92px; }
.slide__body--fraunces.slide__body--lg { font-size: 78px; }

/* === HIGHLIGHT INLINE === */
.hl-block { background: var(--slide-accent); color: var(--slide-bg); padding: 0 14px; display: inline-block; margin: 0 -2px; }
.hl-soft  { background: var(--slide-fg);     color: var(--slide-bg); padding: 0 14px; display: inline-block; margin: 0 -2px; }
.hl-color { color: var(--slide-accent); }
.hl-under {
  background-image: linear-gradient(var(--slide-accent), var(--slide-accent));
  background-size: 100% 8px;
  background-repeat: no-repeat;
  background-position: 0 92%;
  padding: 0 2px;
}
.slide__body--fraunces .hl-under { background-size: 100% 10px; }

/* === ELEMENTI SPECIALI === */
.slide__swipe-mini {
  position: absolute;
  bottom: 130px; right: 80px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--slide-accent);
  letter-spacing: 0.3em;
  opacity: 0.7;
}
.slide__divider-num {
  font-family: 'Archivo Black', sans-serif;
  font-size: 340px;
  line-height: 0.85;
  letter-spacing: -0.04em;
  color: var(--slide-accent);
  position: absolute;
  top: 160px; right: 60px;
  opacity: 0.12;
  pointer-events: none;
}

/* === CTA === */
.slide__cta-row {
  display: flex; flex-direction: column;
  gap: 18px;
  margin-top: auto;
  margin-bottom: 30px;
}
.slide__cta-item {
  font-family: 'Archivo Black', sans-serif;
  font-size: 88px;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.slide__cta-item-arrow {
  color: var(--slide-accent);
  margin-right: 18px;
}
```

### Font self-hosted

Scarica i font da Google Fonts (versione `latin` + `latin-ext` per accenti italiani) e mettili in `public/fonts/`. Declarali in `index.css` con `@font-face` e `font-display: block`. **Importante**: `font-display: block` (non `swap`) per evitare FOUT durante l'export PNG.

```css
@font-face {
  font-family: 'Archivo Black';
  src: url('/fonts/archivo-black.woff2') format('woff2');
  font-weight: 400;
  font-display: block;
}
/* Stesso pattern per Fraunces (variable) e JetBrains Mono */
```

### Variabili CSS iniettate

Il componente `SlideRenderer` deve passare le variabili CSS inline tramite `style={{}}`:

```jsx
<div className="slide" style={{
  '--slide-bg': theme.palette.background,
  '--slide-fg': theme.palette.foreground,
  '--slide-accent': theme.palette.accent,
  '--slide-muted': theme.palette.muted,
  '--slide-line': theme.palette.line,
}}>
```

---

## 6. Architettura dello stato

**Stato globale unico**, gestito da un hook custom `useCarouselStore` basato su `useReducer`. Niente Context inutile (lo passi per props dove serve, è una SPA piccola).

```js
// Forma dello stato
{
  carousel: {
    _schema: {...},
    theme: {...},
    slides: [...]
  },
  ui: {
    activeTab: 'slides' | 'theme' | 'json',
    editingSlideNum: null | number,    // null = modale chiusa
    selectedSlideNums: [],              // per future multi-select
  },
  history: {
    past: [...],     // stack di stati precedenti per undo
    future: [...]    // stack di stati per redo
  },
  meta: {
    lastSavedAt: timestamp | null,
    isDirty: boolean
  }
}
```

### Azioni del reducer (lista non esaustiva)

- `LOAD_CAROUSEL` — carica JSON validato
- `UPDATE_THEME` — modifica `theme.*`
- `UPDATE_SLIDE` — modifica una slide (per `num`)
- `REORDER_SLIDES` — riordina dopo drag&drop (rinumera automaticamente i `num` da 1 a N)
- `ADD_SLIDE` — aggiunge una slide dopo una specifica posizione, da preset
- `DUPLICATE_SLIDE` — duplica una slide esistente
- `DELETE_SLIDE` — elimina una slide
- `SET_ACTIVE_TAB`
- `OPEN_EDIT_MODAL` / `CLOSE_EDIT_MODAL`
- `UNDO` / `REDO`

### History (undo/redo)

Lo stack `past`/`future` memorizza **snapshot del `carousel`** (non dell'`ui`/`meta`). Ogni azione che modifica `carousel` pusha lo stato corrente in `past` e svuota `future`. Limite stack: 50 entry. Cmd+Z / Cmd+Shift+Z (o Ctrl su Windows/Linux).

### Persistenza

`useAutoSave` con debounce di 800ms scrive su `localStorage` la chiave `carosello.draft`. Al boot dell'app, se la chiave esiste, l'app la carica.

Chiave separata `carosello.preferences` per UI prefs (es. tab attiva).

**Importante:** la history NON va persistita su localStorage (è in-memory).

---

## 7. Specifica dettagliata dei componenti

### 7.1 `App.jsx`

Layout a 3 zone:
- **Header** (fisso in alto, ~64px): logo "Carosello Builder", nome del progetto editabile, bottoni `[Import JSON]` `[Export JSON]` `[Export ZIP]` `[Undo]` `[Redo]`, indicatore "Salvato Xs fa"
- **TabBar** (sotto header): `Slide` | `Tema` | `JSON`
- **Contenuto della tab attiva**

### 7.2 `SlideGrid.jsx` (tab "Slide")

- Griglia responsive: 1 colonna mobile, 2 tablet, 3 desktop
- Ogni card è una `SlideCard`
- Drag & drop con `@dnd-kit/sortable`
- Bottone flottante in basso a destra `[+ Aggiungi slide]` → apre un mini-menu per scegliere il `type` (cover/standard/divider/cta), poi inserisce la slide alla fine partendo dal preset corrispondente
- Drop zone "tra" le card per inserire in mezzo (opzionale, nice-to-have)

### 7.3 `SlideCard.jsx`

Layout della card:
- **Thumbnail**: `SlideRenderer` ridimensionato a ~280×280 con `transform: scale(0.26)` e `transform-origin: top left`, dentro un wrapper a dimensioni fisse 280×280 con `overflow: hidden`
- **Footer della card** (sopra la thumbnail, con sfondo Tailwind):
  - Numero slide (`#01`)
  - Tipo slide (badge: "cover", "standard", ecc.)
  - Azioni: `[✏️ Modifica]` `[📋 Duplica]` `[⬇️ PNG]` `[🗑️ Elimina]` (icone Lucide)
- Drag handle (icona `GripVertical` di Lucide) sul lato sinistro
- Indicatore "rischio leggibilità" (M10): se la slide ha troppo testo, mostra un piccolo badge giallo "⚠ testo lungo" con tooltip

**Regola di calcolo "rischio leggibilità"** (euristica semplice):
- Per ogni size, esiste un limite di caratteri totali (somma di tutte le lines):
  - `cover`: 60 char
  - `xl`: 80 char
  - `lg`: 120 char
  - `md`: 200 char
- Se supera, mostra warning. Se supera del 50%, mostra warning rosso "❌ testo troppo lungo".

### 7.4 `EditModal.jsx` (modale smart)

Si apre cliccando "Modifica" su una `SlideCard`. Layout interno:

- **Header del modale**: titolo `Slide #N (tipo)`, bottone chiudi
- **Area sinistra (60%)**: form con campi dinamici per `type`
- **Area destra (40%)**: anteprima live a ~480×480 (scale 0.45) che si aggiorna mentre modifichi

### Campi per tipo

Tutti i tipi hanno questi campi base:
- `type` (select: cover | standard | divider | cta) — **attenzione**: cambiare tipo deve trasformare i campi seguenti senza perdere dati incompatibili (es. passare da standard a cta: salva `lines` in `_note_autore` come backup)
- `kicker` (input text, opzionale con toggle)
- `font` (radio: archivo | fraunces)
- `_note_autore` (textarea piccola)

**Solo cover/standard/divider:**
- `size` (radio o select)
- `lines` (array di stringhe — usa `LinesEditor`, vedi 7.5)

**Solo cover:**
- `show_swipe_arrow` (checkbox)

**Solo divider:**
- `divider_number` (input text, default "01")
- `divider_label` (input text, opzionale)

**Solo cta:**
- `cta_items` (array — usa `CtaItemsEditor`, simile a LinesEditor ma più semplice, niente tag inline)

Footer del modale: `[Annulla]` `[Salva]`. Salva chiude il modale e applica le modifiche. Annulla scarta. Cmd+Enter = Salva, Esc = Annulla.

### 7.5 `LinesEditor.jsx` (cuore dell'editing testo)

Componente per editare l'array `lines`. Vincoli:
- Una textarea per riga, riordinabili (drag handle a sinistra di ogni riga)
- Bottone `[+ Aggiungi riga]` in fondo
- Bottone `[Aggiungi riga vuota (spazio)]` che inserisce `""` (spaziatura paragrafo)
- Per ogni riga: bottone `[🗑️]` per eliminarla
- **Toolbar di formattazione sopra ogni textarea attiva**:
  - `[Verde pieno]` → inserisce `[hl][/hl]` attorno alla selezione (o al cursore se niente selezionato)
  - `[Crema pieno]` → `[soft][/soft]`
  - `[Solo colore]` → `[c][/c]`
  - `[Sottolineato]` → `[u][/u]`
  - `[Corsivo]` → `[em][/em]`
- La toolbar appare quando la textarea ha il focus
- Scorciatoie: Cmd+B = `[hl]`, Cmd+I = `[em]`, ecc.

**Tip implementativo**: usa `useRef` su ogni textarea, gestisci la selezione con `selectionStart`/`selectionEnd`. Reinserisci il cursore dopo l'insert.

### 7.6 `ThemeTab.jsx`

Form per modificare l'oggetto `theme` del JSON. Sezioni:

- **Palette** (con `ColorPicker` per ogni campo)
  - background, foreground, accent, muted, line
  - Anteprima di una slide-esempio a destra che si aggiorna live
- **Header**: kicker_default (input), show_topline (toggle), show_dot (toggle)
- **Footer**: name (input), show_separator_line (toggle), show_meta_number (toggle)
- **Fonts**: primary (select tra Archivo Black, Fraunces — per ora solo questi due), secondary, mono

Bottone in fondo `[Reset al default]` con conferma.

### 7.7 `JsonTab.jsx`

CodeMirror con highlight JSON. L'utente può modificare il JSON crudo. Pulsante `[Applica modifiche]` valida con zod e se OK aggiorna lo stato. Se errori, mostra inline gli errori sotto l'editor (linea + messaggio).

Bottone `[Esporta JSON]` scarica il file.

### 7.8 `ExportPanel.jsx`

Non è una tab, è un menu dropdown nell'header. Conterrà:
- `[Esporta JSON]` — scarica il JSON corrente
- `[Esporta tutte le slide come ZIP]` — vedi §9

L'export di una singola slide è il bottone `[⬇️ PNG]` su ogni `SlideCard`.

---

## 8. Sistema di rendering (`SlideRenderer`)

### Principio

Un **unico componente** `SlideRenderer` che prende `slide` + `theme` + `total` + `mode` come props. Renderizza la slide come HTML/CSS reale a dimensioni native 1080×1080.

Il caller può applicare `transform: scale(N)` su un wrapper per ridimensionarla (thumbnail, anteprima modale, ecc.).

### `mode` prop

- `mode="preview"`: rendering normale, può avere transizioni
- `mode="export"`: rendering "freezato" per html-to-image, niente animazioni, fonts già caricati

### Sottocomponenti per tipo

`SlideRenderer` smista a `CoverSlide`, `StandardSlide`, `DividerSlide`, `CtaSlide`. Ogni sottocomponente sa come comporre il proprio body (gli altri elementi — header con num/kicker, footer con name/num — sono condivisi via `<SlideHeader>` e `<SlideFooter>` interni).

### Parser tag inline (`inlineTags.js`)

Funzione `parseInlineTags(text)` che prende una stringa con tag `[hl]...[/hl]` e ritorna un array di React nodes (no `dangerouslySetInnerHTML`, per sicurezza e per non perdere capacità di test).

Implementazione: tokenizer regex-based che produce sequenze di `<span className="hl-block">testo</span>`, `<em>testo</em>`, ecc.

Funzione `parseLines(lines)` che applica `parseInlineTags` a ogni riga e intercala `<br>` (con stringhe vuote → `<br><br>`).

---

## 9. Export PNG e ZIP

### Singola slide

Quando l'utente clicca `[⬇️ PNG]` su una card:
1. Renderizza in un nodo nascosto (off-screen, `position: absolute; left: -99999px`) la slide a dimensioni native 1080×1080
2. Aspetta che i font siano caricati (`document.fonts.ready`)
3. `htmlToImage.toPng(node, { pixelRatio: 2 })` → blob
4. `saveAs(blob, 'carosello-NN.png')`

Mostra un toast: "Slide #N esportata"

### Tutte le slide come ZIP

1. Apri un modal di progress "Esportando 15 slide..."
2. Per ogni slide (serialmente, non parallelo — evita memory spike):
   - Render off-screen
   - `htmlToImage.toPng`
   - Aggiungi al `jszip` (`zip.file('NN.png', blob)`)
   - Aggiorna progress bar
3. Aggiungi anche il `carosello.json` al ZIP
4. `zip.generateAsync({ type: 'blob' })` → `saveAs(blob, 'carosello.zip')`
5. Chiudi modal

### Caveat tecnici importanti per `html-to-image`

- I font self-hosted **devono essere già caricati** prima di chiamare `toPng`. Usa `await document.fonts.ready`.
- Le `box-shadow` con `rgba` possono dare problemi con alcuni browser. Testa il dot verde.
- Imposta `cacheBust: true` se ci sono problemi di cache.
- Se appaiono bordi neri attorno alla PNG, è perché il nodo non ha dimensione fissa. Forza `width: 1080px; height: 1080px` con stile inline.

---

## 10. Validazione JSON con zod

```js
// src/lib/schema.js (esempio, da completare)
import { z } from 'zod';

const PaletteSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  accent: z.string(),
  muted: z.string(),
  line: z.string(),
});

const ThemeSchema = z.object({
  palette: PaletteSchema,
  header: z.object({ /* ... */ }),
  footer: z.object({ /* ... */ }),
  fonts: z.object({ /* ... */ }),
});

const SlideBaseSchema = z.object({
  num: z.number().int().positive(),
  type: z.enum(['cover', 'standard', 'divider', 'cta']),
  kicker: z.string().nullable(),
  font: z.enum(['archivo', 'fraunces']),
  _note_autore: z.string().optional(),
});

// Schema condizionali per tipo (z.discriminatedUnion)
// ...

export const CarouselSchema = z.object({
  _schema: z.object({ /* opzionale */ }).optional(),
  theme: ThemeSchema,
  slides: z.array(/* unione discriminata */).min(1),
});
```

`validateJson(raw)` ritorna `{ ok: true, data }` o `{ ok: false, errors: [{ path, message }] }`. Gli errori vanno mostrati all'utente in modo chiaro (path nel JSON + messaggio leggibile in italiano).

---

## 11. Convenzioni BEM

Per ogni componente, un file CSS dedicato. Naming:

```
.slide-card { /* block */ }
.slide-card__thumbnail { /* element */ }
.slide-card__thumbnail--scaled { /* modifier */ }
.slide-card__actions { /* element */ }
.slide-card__action { /* element */ }
.slide-card__action--danger { /* modifier */ }
```

Tailwind è permesso per layout/utility (`flex`, `gap`, `p-4`, `text-sm`, ecc.) ma **mai** per dare identità a un componente. Il "look" del componente sta nel suo file CSS BEM.

Esempio corretto:

```jsx
<div className="slide-card flex flex-col gap-2 p-4">
  <div className="slide-card__thumbnail">
    {/* ... */}
  </div>
</div>
```

Esempio sbagliato (Tailwind diventa identità):

```jsx
<div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
```

---

## 12. Comportamenti chiave (UX)

### Auto-save
- Debounce 800ms dopo ogni modifica di `carousel`
- Salva su `localStorage` chiave `carosello.draft`
- Indicatore "Salvato Xs fa" nell'header (aggiornato ogni 5s)

### Undo/Redo
- Cmd+Z (Mac) / Ctrl+Z (Win/Linux) per undo
- Cmd+Shift+Z / Ctrl+Shift+Z per redo
- Bottoni nell'header con stato disabled se stack vuoto
- Tooltip con anteprima di cosa si sta annullando ("Annulla: modifica slide #7")

### Drag & drop
- Animazione fluida (framer-motion + dnd-kit)
- Ghost della card durante il drag
- Snap a posizione di destinazione
- Su drop: rinumera tutti i `num` da 1 a N

### Validazione live nel modale di edit
- Quando l'utente modifica un campo, valida solo quel campo (non tutto)
- Errori mostrati inline sotto il campo
- Bottone "Salva" disabled se ci sono errori
- Quando l'utente inserisce un tag malformato in `lines` (es. `[hl]testo[/hi]`), mostra warning inline

### Reset / Nuovo progetto
- Bottone "Nuovo progetto" → conferma → carica `defaultCarousel.js` (uno scheletro di 3 slide)
- `defaultCarousel.js` deve essere uno scheletro **non vuoto** ma istruttivo (es. una cover, una standard, una cta)

### Import JSON
- Bottone `[Import JSON]` → file picker (.json)
- Parsing → validazione zod → se ok, sostituisce lo stato; se errore, modal con dettagli
- Conferma se c'è già un progetto non salvato

### Anteprima mobile (M9)
- Toggle nell'header `[Desktop view | Mobile view]`
- Modalità mobile: griglia a 1 colonna, card a dimensione "telefono" (380px), thumbnail più piccola
- Utile per verificare leggibilità

---

## 13. Anti-pattern da evitare

- ❌ **Non** usare `dangerouslySetInnerHTML` per il rendering dei tag inline. Parsa in React nodes.
- ❌ **Non** salvare le PNG renderizzate su localStorage (sono grandi, basta il JSON)
- ❌ **Non** fare il drag&drop con HTML5 API native (usa @dnd-kit)
- ❌ **Non** ri-renderizzare l'intera griglia ad ogni keystroke nell'editor. Memoizza le `SlideCard` con `React.memo` e passa props stabili.
- ❌ **Non** usare Context per lo stato del carousel. Passa props o usa un hook che ritorna lo stato.
- ❌ **Non** fetchare i font da Google Fonts CDN (rallenta export, può fallire offline)
- ❌ **Non** mescolare la logica di rendering slide con la logica UI dell'app. Tieni `slide-renderer/` separato e auto-contenuto.
- ❌ **Non** assumere che `num` sia l'indice dell'array. Usa sempre `slides.find(s => s.num === N)`. (Anche se in pratica li manteniamo allineati dopo reorder, è più robusto.)
- ❌ **Non** consentire di salvare un JSON con `num` duplicati. Rinumera automaticamente dopo ogni operazione strutturale.
- ❌ **Non** chiamare `htmlToImage` su un nodo visibile, ma sempre su un nodo off-screen apposito.

---

## 14. Workflow consigliato (a fasi)

Affronta il progetto in **5 fasi**. Dopo ogni fase, fermati e chiedi una validazione prima di proseguire. Non scrivere tutto in un colpo.

### Fase 1 — Fondamenta (8-12 ore)
- Setup Vite + React + Tailwind + dipendenze
- Struttura cartelle (§3)
- Font self-hosted (download Archivo Black, Fraunces variable, JetBrains Mono)
- `lib/schema.js` (zod schema completo)
- `lib/defaultCarousel.js` (scheletro di 3 slide)
- `slide-renderer/` completo: SlideRenderer + tutti i sottotipi + inlineTags.js + CSS
- Verifica: una pagina di test che renderizza il default carousel in una griglia statica, senza interazioni. Le slide devono essere identiche al sistema visivo descritto in §5.

**Criterio di accettazione Fase 1:** apro la pagina, vedo 3 slide renderizzate correttamente, con i font giusti, gli highlight giusti, il footer giusto. Niente bottoni, niente modali, niente stato.

### Fase 2 — Stato e CRUD base (8-12 ore)
- `useCarouselStore` con reducer e history
- Import JSON, validazione zod, error reporting
- `App.jsx` con header e tab base
- `SlideGrid` (no drag&drop ancora) con `SlideCard`
- Azioni: aggiungi, duplica, elimina slide
- Auto-save su localStorage
- Indicatore "salvato"

**Criterio di accettazione Fase 2:** importo un JSON, vedo la griglia, posso aggiungere/duplicare/eliminare slide, ricarico la pagina, ritrovo tutto.

### Fase 3 — Edit modal + theme tab (12-16 ore)
- `EditModal` con tutti i campi dinamici per tipo
- `LinesEditor` con toolbar tag
- `CtaItemsEditor`
- `ThemeTab` con form completo
- Anteprima live nei modali

**Criterio di accettazione Fase 3:** posso modificare qualunque attributo di una slide e vederlo aggiornato live. Posso modificare il theme e vedere tutte le slide aggiornarsi.

### Fase 4 — Drag&drop + undo/redo + JSON tab (6-8 ore)
- @dnd-kit/sortable integrato in `SlideGrid`
- Rinumerazione automatica dopo reorder
- Undo/Redo con scorciatoie
- `JsonTab` con CodeMirror e validazione

**Criterio di accettazione Fase 4:** posso riordinare le slide, Cmd+Z funziona, posso aprire la tab JSON e modificare a mano il sorgente.

### Fase 5 — Export (6-8 ore)
- Export PNG singolo
- Export ZIP con tutte le slide + JSON
- Modal di progresso per export multiplo
- Test su iPhone reale dell'output PNG su Instagram

**Criterio di accettazione Fase 5:** posso esportare una singola PNG, può esportare uno ZIP, le PNG visualizzate su Instagram sono **identiche** all'anteprima nell'app.

---

## 15. Criteri di qualità finale (checklist)

- [ ] Le PNG esportate sono **identiche pixel-per-pixel** all'anteprima nel browser (a meno di antialiasing dei font)
- [ ] L'app funziona offline (font self-hosted, nessuna dipendenza CDN al runtime)
- [ ] Reload della pagina = ritrovo il mio progetto
- [ ] Cmd+Z funziona almeno per le ultime 50 azioni
- [ ] Import di un JSON corrotto mostra errori chiari, non crasha
- [ ] Drag&drop fluido a 60fps anche con 30+ slide
- [ ] L'export di 20 slide richiede meno di 30 secondi
- [ ] Tutti i componenti hanno il proprio file CSS BEM, niente "Tailwind che diventa identità"
- [ ] Niente warning React in console
- [ ] Niente errori CSP/CORS in console
- [ ] Responsive: usabile su tablet (iPad landscape), accettabile su mobile (con avviso "esperienza ottimale su desktop")

---

## 16. Note finali

- L'utente è un dev senior PHP/JS con 20+ anni di esperienza. Non spiegare cose ovvie nel codice, ma commenta scelte non scontate (es. perché `font-display: block` invece di `swap`).
- Tutti i testi UI dell'app sono in **italiano**.
- Non aggiungere feature non richieste. Se hai dubbi su qualcosa, **chiedi prima di implementare**.
- Quando finisci una fase, scrivi un breve resoconto: cosa hai fatto, cosa è rimasto fuori, cosa ti ha sorpreso. Questo aiuta a calibrare la fase successiva.

---

**Inizia leggendo questo documento per intero. Poi, prima di scrivere una riga di codice, dimmi se hai dubbi su qualche scelta, o se vedi anti-pattern che vorresti correggere. Solo dopo questo allineamento, parti con la Fase 1.**

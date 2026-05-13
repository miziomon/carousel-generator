# Carosello Builder — Sistema templates + nuova palette Bold Yellow

> **Per Claude Code**: questo prompt estende l'app Carosello Builder con (1) un sistema di gestione **templates** parallelo a quello delle palette, (2) un secondo template built-in "Bold Corner", e (3) una terza palette built-in "Bold Yellow". Presuppone che l'app esista già con i sistemi descritti nei brief precedenti (carosello base + palette manager). Leggi tutto il documento prima di iniziare. La sezione 13 ("Workflow consigliato") spiega come affrontarlo a fasi. Prima di scrivere codice, leggi e fai domande se servono.

---

## 1. Contesto e obiettivo

L'app oggi gestisce un sistema di **palette** (colori) ben fatto: built-in + custom, modale di gestione, snapshot, migrazione retrocompatibile. Il template grafico delle slide invece è **uno solo, hardcoded**: l'attuale stile "editoriale" con linea sottile in alto, dot accent in alto a destra, numerazione monospace, footer con separatore.

Vogliamo introdurre:

1. Un **sistema di templates** parallelo a quello delle palette, ma con un'importante differenza: i **template sono codice**, non dati. Esistono come componenti React + CSS dedicati. L'utente li applica ma non li modifica (lo farà uno sviluppatore quando vorrà aggiungerne).
2. Un **secondo template built-in "Bold Corner"** (mood manifesto, angolo nero, tipografia uppercase aggressiva)
3. Una **terza palette built-in "Bold Yellow"** (giallo + nero) che è il companion naturale del Bold Corner

**Principio architetturale chiave: separazione tra palette e template.**

- **Palette** = i colori (background, surface, foreground, accent, muted, line). Sono dati editabili dall'utente, vivono nella loro libreria, sono indipendenti dal template.
- **Template** = layout, decorazioni grafiche, scelte tipografiche, stile degli highlight. Sono codice. Lo stesso JSON di slide può essere renderizzato da template diversi producendo output visivamente diversi.

Una palette deve poter essere applicata a qualunque template senza rompersi. Un template deve funzionare con qualunque palette, declinando le proprie decorazioni nei colori della palette attiva.

---

## 2. Modello dati

### 2.1 Entità `Template`

I template sono **definiti in codice**, non in JSON. Non c'è "libreria utente" come per le palette. C'è una lista di template registrati al boot dell'app.

Ogni template è un oggetto JS che combina **metadata** (nome, descrizione, suggerimenti) + **componenti** (React + CSS):

```js
// src/lib/templates/types.js (documentazione, non codice eseguibile)
{
  id: "system-editorial-mark",
  name: "Editorial Mark",
  description: "Linea editoriale con dot e numerazione monospace. Tono autorevole, riflessivo.",
  origin: "system",                    // tutti i template per ora sono "system"
  default_palette_id: "system-tech-dark",  // suggerimento, non vincolo

  // Componenti che lo implementano (vedi §4)
  components: {
    CoverSlide: <ReactComponent>,
    StandardSlide: <ReactComponent>,
    DividerSlide: <ReactComponent>,
    CtaSlide: <ReactComponent>
  },

  // CSS dedicato (vedi §4)
  styles: "url-or-import-to-css-file"
}
```

**Importante**: non c'è "origin: user" per i template (nell'MVP). Tutti i template sono system, definiti in codice. Quando in futuro vorremo template custom, sarà un'estensione che valuteremo. Per ora **i template sono codice, le palette sono dati**.

### 2.2 Modifiche allo schema del carosello

L'oggetto `theme` del JSON diventa:

```json
{
  "theme": {
    "template_id": "system-editorial-mark" | "system-bold-corner",
    "palette_id": "system-tech-dark" | null,
    "palette": { /* 6 colori, snapshot */ },
    "header": { /* configurazioni invariate */ },
    "footer": { /* configurazioni invariate */ },
    "fonts":  { /* configurazioni invariate */ }
  }
}
```

**Note**:
- `template_id` è una stringa, MAI null. Se non specificato nel JSON importato, viene migrato a `system-editorial-mark` (vedi §3)
- I campi `header`, `footer`, `fonts` restano dove sono. Sono **configurazioni applicate dall'utente** che il template rispetta (es. il footer name "Maurizio Pelizzone" è una scelta dell'utente, qualunque template la rispetterà)
- Quando l'utente "applica un template" dalla libreria, l'app fa: `theme.template_id = X.id`. Non c'è snapshot del template (è codice, non dati): basta il riferimento

### 2.3 Cosa NON cambia tra template

Per garantire interoperabilità totale tra template, queste cose restano invariate:

- **Schema dei tag inline**: `[hl]`, `[soft]`, `[c]`, `[u]`, `[em]` esistono in TUTTI i template. Ogni template decide come renderizzarli graficamente, ma il loro **significato semantico è universale**:
  - `hl` = evidenza forte (primaria)
  - `soft` = evidenza tono minore / negazione visiva
  - `c` = colore accent (leggera)
  - `u` = sottolineato/dato
  - `em` = corsivo/sfumatura
- **Tipi di slide**: `cover`, `standard`, `divider`, `cta` esistono in tutti i template
- **Size disponibili**: `cover`, `xl`, `lg`, `md` (più `null` per cta)
- **Variabili CSS della palette**: ogni template usa `--slide-bg`, `--slide-surface`, ecc. Nomi standardizzati

### 2.4 Cosa PUÒ cambiare tra template

- Layout completo dell'header (posizione numerazione, presenza dot/linea/angolo decorativo, ecc.)
- Layout completo del footer (con/senza separatore, posizione nome, ecc.)
- Font scelti (Archivo Black, Fraunces, ecc.)
- Scale tipografiche per ogni size (es. Editorial usa 118px per cover, Bold Corner potrebbe usare 130px per maggiore aggressività)
- Stile concreto degli highlight (un blocco pieno nel template A, un blocco con bordo doppio nel template B, ecc.)
- Decorazioni grafiche extra (angoli, simboli, swipe indicator)
- Trattamento delle slide divider (numerone in trasparenza in un caso, box pieno in un altro)
- Posizione e stile dello swipe indicator
- Stile dei CTA items (icona freccia, posizione, dimensione)

---

## 3. Migrazione retrocompatibile

Stesso pattern usato per le palette. La funzione `migrateCarousel` esistente (in `src/lib/migrateCarousel.js`) viene estesa per gestire anche `template_id`.

### Casi possibili

| Caso | JSON di input | Azione |
|---|---|---|
| A | Nessun `template_id` | Inietta `template_id: "system-editorial-mark"` (l'unico che esisteva storicamente) |
| B | `template_id` presente, template registrato in app | Nessuna azione |
| C | `template_id` presente, template NON registrato | Fallback a `system-editorial-mark` + toast warning all'utente: "Template '{id}' non trovato. Applicato Editorial Mark." |

La migrazione resta **per-documento, non bulk** (come da §13 del prompt palette).

---

## 4. Architettura dei template come codice

Ogni template è una struttura su file separati. Pattern:

```
src/slide-renderer/
├── SlideRenderer.jsx                  # AGGIORNATO: smista al template corretto
├── inlineTags.js                      # invariato
│
└── templates/
    ├── registry.js                    # NUOVO: lista template disponibili
    │
    ├── editorial-mark/                # template 1
    │   ├── manifest.js                # NUOVO: metadata
    │   ├── EditorialMark.jsx          # NUOVO: il componente "router" dentro al template
    │   ├── EditorialCoverSlide.jsx
    │   ├── EditorialStandardSlide.jsx
    │   ├── EditorialDividerSlide.jsx
    │   ├── EditorialCtaSlide.jsx
    │   ├── EditorialHeader.jsx        # componente condiviso all'interno del template
    │   ├── EditorialFooter.jsx
    │   └── editorial-mark.css         # CSS specifico template
    │
    └── bold-corner/                   # template 2
        ├── manifest.js
        ├── BoldCorner.jsx
        ├── BoldCoverSlide.jsx
        ├── BoldStandardSlide.jsx
        ├── BoldDividerSlide.jsx
        ├── BoldCtaSlide.jsx
        ├── BoldHeader.jsx
        ├── BoldFooter.jsx
        └── bold-corner.css
```

### 4.1 `registry.js`

```js
import { editorialMarkManifest } from './editorial-mark/manifest.js';
import { boldCornerManifest } from './bold-corner/manifest.js';

// Lista di template registrati. Aggiungere un template = aggiungere una riga qui.
export const TEMPLATES = [
  editorialMarkManifest,
  boldCornerManifest,
];

export function getTemplate(id) {
  return TEMPLATES.find(t => t.id === id) || null;
}

export function getDefaultTemplate() {
  return TEMPLATES[0];  // editorial-mark
}
```

### 4.2 `manifest.js` di ogni template

```js
// es. editorial-mark/manifest.js
import { EditorialMark } from './EditorialMark.jsx';
import './editorial-mark.css';

export const editorialMarkManifest = {
  id: 'system-editorial-mark',
  name: 'Editorial Mark',
  description: 'Linea editoriale con dot e numerazione monospace. Tono autorevole, riflessivo.',
  origin: 'system',
  default_palette_id: 'system-tech-dark',

  // Il "router" del template che smista per tipo di slide
  Component: EditorialMark,
};
```

### 4.3 Il componente "router" del template

```jsx
// EditorialMark.jsx
import { EditorialCoverSlide } from './EditorialCoverSlide.jsx';
import { EditorialStandardSlide } from './EditorialStandardSlide.jsx';
import { EditorialDividerSlide } from './EditorialDividerSlide.jsx';
import { EditorialCtaSlide } from './EditorialCtaSlide.jsx';

export function EditorialMark({ slide, theme, total, mode }) {
  switch (slide.type) {
    case 'cover':    return <EditorialCoverSlide {...{slide, theme, total, mode}} />;
    case 'standard': return <EditorialStandardSlide {...{slide, theme, total, mode}} />;
    case 'divider':  return <EditorialDividerSlide {...{slide, theme, total, mode}} />;
    case 'cta':      return <EditorialCtaSlide {...{slide, theme, total, mode}} />;
    default: return null;
  }
}
```

### 4.4 SlideRenderer aggiornato

```jsx
// SlideRenderer.jsx
import { getTemplate, getDefaultTemplate } from './templates/registry.js';

export function SlideRenderer({ slide, theme, total, mode = 'preview' }) {
  const template = getTemplate(theme.template_id) || getDefaultTemplate();
  const TemplateComponent = template.Component;

  return (
    <div
      className="slide"
      style={{
        '--slide-bg': theme.palette.background,
        '--slide-surface': theme.palette.surface,
        '--slide-fg': theme.palette.foreground,
        '--slide-accent': theme.palette.accent,
        '--slide-muted': theme.palette.muted,
        '--slide-line': theme.palette.line,
      }}
    >
      <TemplateComponent {...{slide, theme, total, mode}} />
    </div>
  );
}
```

### 4.5 Convenzione importante: CSS scoped

Ogni template ha il suo file CSS. Per evitare collisioni, **tutte le classi BEM del template iniziano con un namespace**:

```css
/* editorial-mark.css */
.editorial { /* container */ }
.editorial__topline { /* ... */ }
.editorial__dot { /* ... */ }
.editorial__num { /* ... */ }
.editorial__kicker { /* ... */ }
.editorial__body--archivo { /* ... */ }
.editorial__hl-block { /* sostituisce .hl-block globale */ }
/* ecc. */

/* bold-corner.css */
.bold { /* container */ }
.bold__corner { /* l'angolo nero */ }
.bold__slash { /* il // // */ }
.bold__num-box { /* numerazione su sfondo */ }
.bold__body--archivo { /* ... */ }
.bold__hl-block { /* stile bold-specifico */ }
```

**Le classi globali `.hl-block`, `.hl-soft`, `.hl-color`, `.hl-under` NON esistono più nel CSS globale**. Sono diventate classi locali del template, perché ogni template decide il suo stile per gli highlight. Vedi §5.4 per il pattern del parser inline.

### 4.6 Il container `.slide` resta nel CSS globale

L'unico CSS globale per le slide resta:

```css
/* src/slide-renderer/slide-renderer.css (CSS condiviso minimo) */
.slide * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.slide {
  width: 1080px;
  height: 1080px;
  background: var(--slide-bg);
  color: var(--slide-fg);
  position: relative;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Tutto il resto (padding interno, header, footer, body) è definito dal template specifico.

---

## 5. Template 1: Editorial Mark (refactoring del corrente)

Sposta il CSS attuale in `editorial-mark.css` con il namespace `.editorial`. Le specifiche grafiche restano IDENTICHE a quelle del template attuale (descritte nel brief originale §5). Tutto rinominato sotto il namespace.

### 5.1 Tabella di rinomina classi

| Classe globale attuale | Nuova classe nel template |
|---|---|
| `.slide__topline` | `.editorial__topline` |
| `.slide__dot` | `.editorial__dot` |
| `.slide__num` | `.editorial__num` |
| `.slide__kicker` | `.editorial__kicker` |
| `.slide__foot` | `.editorial__foot` |
| `.slide__foot-name` | `.editorial__foot-name` |
| `.slide__foot-meta` | `.editorial__foot-meta` |
| `.slide__body--archivo` | `.editorial__body--archivo` |
| `.slide__body--fraunces` | `.editorial__body--fraunces` |
| `.slide__body--cover` | `.editorial__body--cover` |
| `.slide__body--xl/lg/md` | `.editorial__body--xl/lg/md` |
| `.slide__swipe-mini` | `.editorial__swipe-mini` |
| `.slide__divider-num` | `.editorial__divider-num` |
| `.slide__cta-row` | `.editorial__cta-row` |
| `.slide__cta-item` | `.editorial__cta-item` |
| `.slide__cta-item-arrow` | `.editorial__cta-item-arrow` |
| `.hl-block` | `.editorial__hl-block` |
| `.hl-soft` | `.editorial__hl-soft` |
| `.hl-color` | `.editorial__hl-color` |
| `.hl-under` | `.editorial__hl-under` |

### 5.2 Il parser inline `parseInlineTags` deve essere parametrizzato

Oggi parseInlineTags ritorna `<span className="hl-block">...</span>`. Va cambiato in modo che ogni template possa specificare le proprie classi.

```js
// inlineTags.js
const DEFAULT_CLASS_MAP = {
  hl: 'hl-block',
  soft: 'hl-soft',
  c: 'hl-color',
  u: 'hl-under',
};

export function parseInlineTags(text, classMap = DEFAULT_CLASS_MAP) {
  // [hl]testo[/hl] → <span className={classMap.hl}>testo</span>
  // [em]testo[/em] → <em>testo</em>   (sempre, indipendente da classMap)
  // ...
}

// Helper per usarlo nel template
export function parseLines(lines, classMap) {
  // ...
}
```

Ogni template definirà la sua classMap e la passerà al parser:

```js
// editorial-mark/EditorialStandardSlide.jsx
const CLASS_MAP = {
  hl: 'editorial__hl-block',
  soft: 'editorial__hl-soft',
  c: 'editorial__hl-color',
  u: 'editorial__hl-under',
};

export function EditorialStandardSlide({ slide, theme, total }) {
  const body = parseLines(slide.lines, CLASS_MAP);
  return <div className="editorial">{/* ... */}</div>;
}
```

---

## 6. Template 2: Bold Corner (nuovo)

### 6.1 Specifiche grafiche

| Elemento | Specifica |
|---|---|
| Container | Padding interno: `90px 80px 70px` (come editorial). Niente linea separatrice. |
| Angolo decorativo | Triangolo rettangolo in alto a destra. `clip-path: polygon(100% 0, 0 0, 100% 100%);`. Dimensione 240×240px. Colore: `var(--slide-fg)` (cioè il testo principale; nelle palette chiare diventa scuro). |
| Decorazione "// //" | Posizione: dentro l'angolo, top: 25px, right: 30px. Font: Archivo Black, 36px. Colore: `var(--slide-bg)` (cioè inverso del foreground, leggibile sull'angolo). |
| Numerazione | Box pieno in alto a sinistra. Font monospace, 24px, weight 600, letter-spacing 0.15em. Padding 10px 20px. Background: `var(--slide-fg)`. Color: `var(--slide-bg)`. Formato "NN / TOT". |
| Kicker | Posizione: sotto la numerazione, ~20px di gap. Stile: monospace 18px, uppercase, letter-spacing 0.3em, color `var(--slide-fg)` con opacity 0.7. |
| Body uppercase | TUTTI i body sono `text-transform: uppercase`. Font primario: Archivo Black. Letter-spacing: -0.03em. |
| Body size cover | 110px, line-height 0.95 |
| Body size xl | 92px, line-height 0.98 |
| Body size lg | 80px, line-height 1.0 |
| Body size md | 64px, line-height 1.05 |
| Body Fraunces | Anche in Bold Corner supportiamo Fraunces. Non uppercase, font-weight 900, font-size XL 86px / LG 72px. Mantiene il carattere "letterario" anche dentro questo template. |
| Highlight `[hl]` | Blocco pieno: background `var(--slide-accent)`, color `var(--slide-bg)`, padding `0 16px`, display inline-block, margin `0 -2px`. Più aggressivo dell'editorial (padding maggiore). |
| Highlight `[soft]` | Blocco pieno: background `var(--slide-fg)`, color `var(--slide-bg)`, padding `0 16px`, display inline-block, margin `0 -2px`. È il "negativo" del corpo testo. |
| Highlight `[c]` | Color: `var(--slide-accent)`. Identico al pattern editorial. |
| Highlight `[u]` | Sottolineatura spessa via background-image. Spessore 10px, color `var(--slide-accent)`. |
| Footer | Linea separatrice in alto (1px), padding-top 30px. Layout flex space-between. Nome a sinistra, numerazione a destra. Font monospace 20-22px. |
| Footer name | font-size 22px, font-weight 600, uppercase, letter-spacing 0.2em, color `var(--slide-fg)`. |
| Footer meta | font-size 16px, uppercase, letter-spacing 0.2em, color `var(--slide-accent)`. |
| Swipe indicator (cover) | Posizione bottom: 130px, right: 80px. Testo: "→ SWIPE". Font monospace 14px, uppercase, color `var(--slide-accent)`, letter-spacing 0.3em. |
| Divider slide | Numerone gigantesco (`divider_number`) in alto destra, sotto l'angolo nero. Font: Archivo Black, 340px, line-height 0.85, color `var(--slide-fg)` con opacity 0.15. Position: absolute, top 280px (sotto l'angolo), right 60px. |
| CTA items | Stessa logica editorial: lista verticale con freccia "→" + testo. Freccia color `var(--slide-accent)`, testo uppercase, font Archivo Black 80px (un po' più piccolo dell'editorial perché uppercase è già pesante). Gap 22px tra items. |

### 6.2 Esempio CSS per il template Bold Corner

```css
/* bold-corner.css */
.bold {
  width: 100%;
  height: 100%;
  padding: 90px 80px 70px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.bold__corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 240px;
  height: 240px;
  background: var(--slide-fg);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  pointer-events: none;
}

.bold__slash {
  position: absolute;
  top: 25px;
  right: 30px;
  font-family: 'Archivo Black', sans-serif;
  font-size: 36px;
  color: var(--slide-bg);
  z-index: 2;
}

.bold__num-box {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.15em;
  background: var(--slide-fg);
  color: var(--slide-bg);
  padding: 10px 20px;
  align-self: flex-start;
}

.bold__kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--slide-fg);
  opacity: 0.7;
  margin-top: 20px;
}

.bold__body--archivo {
  font-family: 'Archivo Black', sans-serif;
  text-transform: uppercase;
  letter-spacing: -0.03em;
  margin-top: auto;
  margin-bottom: auto;
}
.bold__body--archivo.bold__body--cover { font-size: 110px; line-height: 0.95; }
.bold__body--archivo.bold__body--xl    { font-size: 92px;  line-height: 0.98; }
.bold__body--archivo.bold__body--lg    { font-size: 80px;  line-height: 1.00; }
.bold__body--archivo.bold__body--md    { font-size: 64px;  line-height: 1.05; }

.bold__body--fraunces {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-variation-settings: "opsz" 144;
  letter-spacing: -0.025em;
  line-height: 1.05;
  margin-top: auto;
  margin-bottom: auto;
  /* Note: niente uppercase per Fraunces, mantiene la qualità letteraria */
}
.bold__body--fraunces.bold__body--xl { font-size: 86px; }
.bold__body--fraunces.bold__body--lg { font-size: 72px; }

.bold__hl-block {
  background: var(--slide-accent);
  color: var(--slide-bg);
  padding: 0 16px;
  display: inline-block;
  margin: 0 -2px;
}
.bold__hl-soft {
  background: var(--slide-fg);
  color: var(--slide-bg);
  padding: 0 16px;
  display: inline-block;
  margin: 0 -2px;
}
.bold__hl-color {
  color: var(--slide-accent);
}
.bold__hl-under {
  background-image: linear-gradient(var(--slide-accent), var(--slide-accent));
  background-size: 100% 10px;
  background-repeat: no-repeat;
  background-position: 0 92%;
  padding: 0 2px;
}
.bold__body--fraunces .bold__hl-under { background-size: 100% 12px; }

.bold__swipe-mini {
  position: absolute;
  bottom: 130px;
  right: 80px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--slide-accent);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  opacity: 0.9;
}

.bold__divider-num {
  font-family: 'Archivo Black', sans-serif;
  font-size: 340px;
  line-height: 0.85;
  letter-spacing: -0.04em;
  color: var(--slide-fg);
  opacity: 0.15;
  position: absolute;
  top: 280px;
  right: 60px;
  pointer-events: none;
}

.bold__foot {
  margin-top: auto;
  padding-top: 30px;
  border-top: 1px solid var(--slide-line);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.bold__foot-name {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.2em;
  color: var(--slide-fg);
  text-transform: uppercase;
}
.bold__foot-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  letter-spacing: 0.2em;
  color: var(--slide-accent);
  text-transform: uppercase;
}

.bold__cta-row {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: auto;
  margin-bottom: 30px;
}
.bold__cta-item {
  font-family: 'Archivo Black', sans-serif;
  font-size: 80px;
  line-height: 1.05;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}
.bold__cta-item-arrow {
  color: var(--slide-accent);
  margin-right: 18px;
}
```

### 6.3 Compatibilità con la palette Bold Yellow

Quando il template Bold Corner viene usato con la palette Bold Yellow:
- `background: #f5e544` (giallo)
- `foreground: #0a0a0a` (nero) → angolo, num-box, kicker, footer-name
- `accent: #ffffff` (bianco) → dot, highlight `hl-block`, frecce CTA, swipe indicator
- L'angolo in alto a destra è nero (foreground), e il "// //" dentro l'angolo è giallo (background)
- Il box numerazione in alto a sinistra è nero su giallo (numerazione in giallo dentro un box nero)
- L'highlight `[hl]` è bianco con testo giallo (fa esplodere visivamente le parole chiave)

Questa configurazione è il "manifesto" puro. Funziona anche con altre palette: in Tech Dark, ad esempio, l'angolo diventa chiaro (foreground = #e8e8e8) e il "//" diventa scuro. Funziona, anche se meno potente.

---

## 7. Nuova palette built-in: Bold Yellow

In `src/lib/palettes/builtins.js`, aggiungi:

```js
export const BOLD_YELLOW = {
  id: "system-bold-yellow",
  name: "Bold Yellow",
  description: "Giallo + nero con accento bianco. Manifesto, massima visibilità, scroll-stopper.",
  origin: "system",
  colors: {
    background: "#f5e544",
    surface:    "#ede037",
    foreground: "#0a0a0a",
    accent:     "#ffffff",
    muted:      "rgba(10,10,10,0.5)",
    line:       "rgba(10,10,10,0.25)"
  }
};

export const BUILTIN_PALETTES = [TECH_DARK, WARM_NEUTRAL, BOLD_YELLOW];
```

**Importante**: la palette Bold Yellow ha `accent: #ffffff` (bianco). È la prima palette dove `accent` non è un colore di "evidenza calda" (terracotta, verde fluo) ma un puro neutro per creare contrasto sul giallo. Il sistema deve gestire questo senza problemi: il dot in alto a destra (template Editorial) diventa bianco; nel template Bold Corner il dot non c'è ma le decorazioni che usano `accent` (frecce CTA, `hl-block`) diventano bianche su giallo, leggibili.

### 7.1 Verifica contrasto WCAG

Quando l'utente carica la palette Bold Yellow:
- foreground/background = nero/giallo → contrasto ~16:1 → AAA pieno
- accent/background = bianco/giallo → contrasto ~1.65:1 → **fail WCAG**

Il sistema mostrerà un warning nel ContrastChecker. Va bene: il bianco su giallo NON è usato per il testo principale ma per **decorazioni** (dot, freccia, blocchi pieni). Il warning è informativo, non bloccante. L'utente capisce dal context che è una scelta estetica intenzionale.

---

## 8. UI: nuova sezione "Template" nella tab Tema

Layout aggiornato della tab Tema. La struttura diventa:

```
┌─────────────────────────────────────────────┐
│ TEMPLATE                                    │
│ ┌──────────────────────────────────────┐    │
│ │ [thumbnail] Editorial Mark        ▼ │    │
│ └──────────────────────────────────────┘    │
│  [Gestisci template...]                     │
├─────────────────────────────────────────────┤
│ PALETTE                                     │
│ (sezione esistente, invariata)              │
├─────────────────────────────────────────────┤
│ HEADER                                      │
│ kicker_default: [...]                       │
│ ☑ show_topline                              │
│ ☑ show_dot                                  │
├─────────────────────────────────────────────┤
│ FOOTER                                      │
│ name: [...]                                 │
│ ☑ show_separator_line                       │
│ ☑ show_meta_number                          │
├─────────────────────────────────────────────┤
│ FONTS                                       │
│ (sezione esistente, invariata)              │
└─────────────────────────────────────────────┘
```

La sezione **Template è sopra Palette** perché logicamente "scelgo prima la forma, poi i colori".

### 8.1 Component `TemplateSelector.jsx`

Combobox custom con:
- Trigger che mostra una **mini-thumbnail** del template + nome
- Dropdown con tutti i template disponibili (per ora 2)
- Per ogni opzione: thumbnail più grande + nome + descrizione breve
- Selezione → trigger `APPLY_TEMPLATE`

```jsx
// pseudocodice
<TemplateSelector
  selectedTemplateId={theme.template_id}
  templates={TEMPLATES}
  onChange={(templateId) => dispatch({ type: 'APPLY_TEMPLATE', templateId })}
/>
```

### 8.2 Behavior on apply

Quando l'utente sceglie un nuovo template:
1. Dispatch `APPLY_TEMPLATE` con il nuovo `template_id`
2. Toast: "Template '{name}' applicato"
3. La griglia delle slide si aggiorna automaticamente (re-render con il nuovo template)
4. Nessun wizard, nessuna conferma. Se l'utente è scontento, Cmd+Z riporta indietro.

**Caso speciale: suggerimento palette**
Se il nuovo template ha un `default_palette_id` e la palette corrente è diversa, mostra un **secondo toast** non bloccante:
> "Il template '{template name}' è ottimizzato per la palette '{default palette name}'. [Applica anche la palette]"

Cliccando il link nel toast, viene applicata anche la palette. È un suggerimento, non un'imposizione.

### 8.3 Component `TemplateThumbnail.jsx`

Renderizza una micro-anteprima del template usando un dataset di slide-tipo. Per ogni template:
- Mostra una slide **standard** di esempio con testo placeholder ("Anteprima template")
- Usa la palette default del template per la thumbnail
- Dimensione: 80×80 px nel trigger, 200×200 px nel dropdown e nel modale di gestione

Implementazione: chiama `SlideRenderer` con uno slide-tipo predefinito + il theme costruito col `template_id` e la palette default. Wrappa in `<div>` con `transform: scale(0.074)` per il trigger (ottenere 80px da 1080px), `scale(0.185)` per il dropdown.

---

## 9. UI: modale "Gestisci template"

Bottone `[Gestisci template...]` apre un modale a piena pagina (parallelo a "Gestisci palette"). Layout:

```
┌──────────────────────────────────────────────────────────┐
│ Gestisci template                                   [X]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ System ───────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  ┌────────┐  Editorial Mark                        │  │
│  │  │ [prev] │  Linea editoriale con dot e            │  │
│  │  │ stand. │  numerazione monospace. Autorevole.    │  │
│  │  └────────┘  Palette default: Tech Dark            │  │
│  │              [Applica] [Anteprima completa]        │  │
│  │ ──────────────────────────────────────────────     │  │
│  │  ┌────────┐  Bold Corner                           │  │
│  │  │ [prev] │  Mood manifesto, angolo nero,          │  │
│  │  │ stand. │  tipografia uppercase aggressiva.      │  │
│  │  └────────┘  Palette default: Bold Yellow          │  │
│  │              [Applica] [Anteprima completa]        │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Per aggiungere altri template, contatta lo sviluppatore. │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 9.1 Behavior

- **[Applica]**: applica il template, chiude il modale, torna alla tab Tema
- **[Anteprima completa]**: apre un sotto-modale che mostra 4 thumbnail (cover, standard, divider, cta) renderizzate con il template + sua palette default. Per dare un'idea completa di come si comporta il template sui diversi tipi di slide. Sotto le thumbnail: bottone `[Applica questo template]` + `[Chiudi]`.

### 9.2 Nessuna gestione user dei template

Il modale di template NON ha (rispetto a quello delle palette):
- Bottone "+ Nuovo template"
- Bottone "Importa template"
- Menu azioni "Duplica / Modifica / Elimina"

I template sono codice, non dati. L'utente non può crearli/modificarli/eliminarli. La nota "Per aggiungere altri template, contatta lo sviluppatore" è esplicita.

---

## 10. Stato globale e azioni

### 10.1 Estensione di `useCarouselStore`

Aggiungi:

```js
{
  carousel: { ... },
  paletteLibrary: [...],
  ui: {
    activeTab: 'slides' | 'theme' | 'json',
    editingSlideNum: null | number,
    paletteManagerOpen: false,
    editingPaletteId: null,
    templateManagerOpen: false,         // ← nuovo
    templatePreviewId: null              // ← per modale "Anteprima completa"
  },
  history: { ... },
  meta: { ... }
}
```

**Importante**: la lista dei template NON va in stato globale, viene importata da `registry.js` direttamente nei componenti che ne hanno bisogno. È costante, non muta a runtime.

### 10.2 Nuove azioni del reducer

| Azione | Payload | Effetto |
|---|---|---|
| `APPLY_TEMPLATE` | `{ templateId }` | Setta `theme.template_id`. Storicizza per undo |
| `OPEN_TEMPLATE_MANAGER` / `CLOSE_TEMPLATE_MANAGER` | | UI |
| `OPEN_TEMPLATE_PREVIEW` / `CLOSE_TEMPLATE_PREVIEW` | `{ templateId }` | Apre/chiude il sotto-modale "Anteprima completa" |

### 10.3 Aggiornamento `migrateCarousel.js`

Aggiungi la migrazione del `template_id` come da §3. Pattern idempotente come per le palette.

### 10.4 Aggiornamento schema zod

```js
// src/lib/schema.js
const ThemeSchema = z.object({
  template_id: z.string().min(1),       // ← nuovo, obbligatorio
  palette_id: z.string().nullable(),
  palette: PaletteColorsSchema,
  header: /* invariato */,
  footer: /* invariato */,
  fonts:  /* invariato */
});
```

La migrazione garantisce che `template_id` sia sempre presente prima della validazione zod. Lo schema può essere strict.

---

## 11. Aggiornamento del JSON di default

In `src/lib/defaultCarousel.js`, aggiungi `template_id` al theme:

```js
export const DEFAULT_CAROUSEL = {
  _schema: { /* ... */ },
  theme: {
    template_id: "system-editorial-mark",
    palette_id: "system-tech-dark",
    palette: { /* ... colori Tech Dark ... */ },
    header: { /* ... */ },
    footer: { /* ... */ },
    fonts: { /* ... */ }
  },
  slides: [ /* ... */ ]
};
```

---

## 12. Anti-pattern da evitare

- ❌ **Non** creare un registro dei template in localStorage. I template sono codice, vivono in `registry.js`.
- ❌ **Non** consentire all'utente di "modificare" o "creare" template via UI. I template hanno menu azioni limitato ad "Applica" e "Anteprima". Niente Duplica/Modifica/Elimina/Importa/Esporta sui template (a differenza delle palette).
- ❌ **Non** mantenere classi CSS globali per gli highlight (`.hl-block`, ecc.). Devono essere namespaced per template (`.editorial__hl-block`, `.bold__hl-block`).
- ❌ **Non** rendere `template_id` opzionale o nullable. Sempre presente, sempre valorizzato. La migrazione garantisce questo.
- ❌ **Non** assumere che il template_id punti a un template registrato. Fallback a default su template non trovato (vedi §3 caso C), con toast.
- ❌ **Non** rompere la migrazione esistente delle palette. Estendi `migrateCarousel`, non riscriverla.
- ❌ **Non** persistere il `templateManagerOpen` / `templatePreviewId` nello storage. Sono solo UI runtime.
- ❌ **Non** ricaricare il CSS del template ad ogni cambio template. Il CSS viene importato dal manifest dei template (statico, già caricato dal bundler).
- ❌ **Non** scrivere logica di rendering del tipo `if (template === 'editorial')` nei componenti dell'app. La logica è incapsulata nel template stesso, l'app smista solo via SlideRenderer.
- ❌ **Non** aggiungere campi al `theme` che siano specifici di un template. Tutti i campi del theme sono universali (rispettati da tutti i template). Decorazioni specifiche di template vivono nel codice del template.
- ❌ **Non** chiamare `APPLY_TEMPLATE` durante il rendering. È un'azione esplicita dell'utente (click su Applica). Mai automatica al boot.

---

## 13. Workflow consigliato (a fasi)

Affronta il progetto in **4 fasi**. Dopo ogni fase, fermati per validazione prima di proseguire.

### Fase 1 — Refactoring del template Editorial Mark (6-8 ore)

L'obiettivo è preparare l'architettura senza ancora aggiungere niente di nuovo:
- Crea la struttura cartelle `templates/editorial-mark/`
- Sposta il CSS attuale in `editorial-mark.css` con il namespace `.editorial__*`
- Spezza il `SlideRenderer` esistente nei sotto-componenti del template (`EditorialCoverSlide`, `EditorialStandardSlide`, ecc.)
- Crea `registry.js` con solo Editorial Mark dentro
- Aggiorna `SlideRenderer` per usare il registry
- Parametrizza `parseInlineTags` con classMap (vedi §5.2)
- Aggiorna `migrateCarousel` per iniettare `template_id: "system-editorial-mark"` quando manca
- Aggiorna lo schema zod per richiedere `template_id`
- Aggiorna `defaultCarousel.js`

**Criterio di accettazione Fase 1**: caricando un JSON storico (senza `template_id`), l'app lo migra e lo renderizza identico a prima. Niente regressioni visive. Tutti i caroselli esistenti continuano a funzionare.

### Fase 2 — Template Bold Corner + Palette Bold Yellow (8-10 ore)

- Crea la struttura `templates/bold-corner/`
- Implementa tutti i componenti del template (Cover, Standard, Divider, Cta)
- Implementa `bold-corner.css` come da §6
- Aggiungi `BOLD_YELLOW` a `builtins.js`
- Registra il template in `registry.js`
- Test manuale: applica Bold Corner + Bold Yellow al carosello Pensieri in pillole #02 (Jevons). Verifica che il rendering sia coerente con le specifiche.

**Criterio di accettazione Fase 2**: posso scegliere il template Bold Corner dal selettore (anche se la UI completa arriva in Fase 3). Le 4 tipologie di slide (cover, standard, divider, cta) si renderizzano correttamente con il template Bold Corner. Funziona sia con la palette Bold Yellow (combinazione naturale) sia con Tech Dark e Warm Neutral (test cross-palette).

### Fase 3 — UI: selettore template + modale di gestione (6-8 ore)

- Crea `TemplateSelector` nella tab Tema (sopra il selettore palette)
- Crea `TemplateThumbnail`
- Crea `TemplateManagerModal`
- Crea sotto-modale `TemplatePreviewModal` per "Anteprima completa"
- Implementa il toast di suggerimento palette al cambio template
- Estendi le azioni del reducer

**Criterio di accettazione Fase 3**: posso navigare nella tab Tema, vedere il template attivo, cambiare template dal selettore, aprire il modale di gestione, vedere le anteprime, applicare. Il suggerimento palette appare e funziona.

### Fase 4 — Test cross-palette e rifiniture (3-5 ore)

- Test sistematico: ogni template × ogni palette = 6 combinazioni. Verifica che nessuna combinazione produca rendering rotti (sovrapposizioni, testi illeggibili, overflow).
- Test del contrasto WCAG: con Bold Yellow + Bold Corner, il warning sul contrasto bianco/giallo va mostrato ma non bloccare l'utente.
- Hotkeys: Esc chiude i modali di template
- Animazioni framer-motion per il cambio template (transizione fluida tra le slide)
- Toast notifications per: template applicato, suggerimento palette, errori
- Test export PNG con template Bold Corner: verifica che html-to-image renderizzi correttamente il clip-path dell'angolo nero
- Test export ZIP con un carosello in Bold Corner

**Criterio di accettazione Fase 4**: l'app è fluida, niente regressioni, tutte le combinazioni palette × template funzionano. L'export PNG funziona perfettamente anche per Bold Corner (l'angolo nero è cruciale, va verificato).

---

## 14. Criteri di qualità finale (checklist)

- [ ] Il sistema di template è strutturato come `registry.js` + cartelle per template. Aggiungere un template = creare una cartella + una riga nel registry
- [ ] Lo schema dei template è codice, non dati. Niente template "user" creabili da UI
- [ ] L'aggiunta di un template Bold Corner non rompe il template Editorial Mark esistente
- [ ] I JSON storici (senza `template_id`) si caricano correttamente grazie alla migrazione
- [ ] Posso cambiare template e vedere le 15 slide riadattate immediatamente
- [ ] Posso combinare Bold Corner + Tech Dark: funziona, anche se meno potente
- [ ] Posso combinare Editorial Mark + Bold Yellow: funziona, anche se inusuale
- [ ] La palette Bold Yellow è applicabile a ogni template
- [ ] Il suggerimento palette appare quando applico un template e la palette non è il default suggerito
- [ ] Cmd+Z annulla il cambio template (è in history)
- [ ] L'export PNG funziona per entrambi i template (verifica visiva del clip-path dell'angolo Bold Corner)
- [ ] Niente warning React in console
- [ ] Tutte le combinazioni palette × template sono visualizzabili senza overflow o sovrapposizioni
- [ ] Il contrasto WCAG si calcola correttamente per Bold Yellow e mostra warning non bloccante
- [ ] Il CSS dei template è isolato (niente collisioni di classi)
- [ ] Tutti i testi UI sono in italiano

---

## 15. Note finali

- L'utente è uno sviluppatore senior PHP/JS. Niente spiegazioni ovvie nei commenti, ma commenta scelte non scontate (es. perché `parseInlineTags` accetta una classMap, perché i template sono codice e le palette dati).
- Tutti i testi UI sono in **italiano**.
- Non aggiungere feature non richieste. Se hai dubbi su qualcosa, **chiedi prima di implementare**.
- Quando finisci una fase, scrivi un breve resoconto: cosa hai fatto, cosa è rimasto fuori, cosa ti ha sorpreso.
- Mantieni allineamento con le convenzioni dei brief precedenti (BEM, hooks pattern, struttura cartelle, no TypeScript).

---

**Inizia leggendo questo documento per intero. Poi, prima di scrivere una riga di codice, dimmi se hai dubbi su qualche scelta, o se vedi anti-pattern che vorresti correggere. Solo dopo questo allineamento, parti con la Fase 1.**

# Carosello Builder — Supporto formati multipli (1:1, 4:5, 1.91:1)

> **Per Claude Code**: questo prompt aggiunge il supporto a 3 formati Instagram (quadrato, portrait, landscape) come opzione configurabile per ogni carosello. Le slide oggi sono hardcoded a 1080×1080. Diventano parametrizzate. Leggi tutto, fai domande se serve, poi parti dalla Fase 1.

---

## 0. Scope esplicito

### Cosa COPRE questo prompt

- Definizione di un nuovo concetto **"formato"** (aspect ratio + dimensioni in pixel)
- Aggiunta del campo `theme.format` al modello dati del carosello
- Migrazione retrocompatibile: caroselli esistenti diventano `1:1` quadrato
- 3 formati built-in: `square` (1:1), `portrait` (4:5), `landscape` (1.91:1)
- Calibrazioni tipografiche per formato dentro ogni template
- Nuova sezione "Formato" nella sidebar Tema
- Aggiornamento del rendering, del thumbnail, dell'export PNG per supportare tutti i formati
- Aggiornamento della validazione zod
- Indicazione visiva per l'utente del formato "consigliato" (4:5)

### Cosa NON copre

- Conversione automatica dei contenuti tra formati (es. "ottimizza il testo per il portrait"). Questo è un lavoro editoriale che resta dell'utente.
- Editing di formati custom (gli utenti non possono creare nuovi formati)
- Anteprima nella griglia di slide a formato diverso da quello del carosello (la griglia mostra sempre il formato attivo)
- Suggerimenti automatici di adattamento testo

---

## 1. Contesto e principio architetturale

L'app oggi assume implicitamente che tutte le slide siano 1080×1080. Questa assunzione vive in molti posti:
- Il CSS del container `.slide` (`width: 1080px; height: 1080px`)
- Il `transform: scale()` delle thumbnail nella griglia (calibrato per 1:1)
- Il viewport di Playwright/html-to-image per l'export PNG
- Le scale tipografiche di ogni template (calibrate per il quadrato)

**Principio guida**: il formato non è una proprietà della singola slide, è una proprietà del **carosello intero**. Tutte le slide del carosello hanno lo stesso formato. Cambiare formato significa ri-renderizzare TUTTE le slide.

Questo è coerente con come Instagram funziona: l'aspect ratio del carosello è determinato dalla prima slide, e tutte le slide successive vengono croppate per matchare il primo formato. Quindi mixare formati non ha senso a livello di prodotto.

---

## 2. Modello dati

### 2.1 Entità "formato"

I formati sono **definiti in codice**, non in JSON. Stesso pattern dei template: l'utente li applica ma non li modifica. C'è una lista chiusa di 3 formati registrati al boot dell'app.

```js
// src/lib/formats/registry.js (concept)
{
  id: "square",        // identificatore stabile
  name: "Quadrato",
  description: "Classico Instagram. Stessa altezza e larghezza, perfetto per profile grid simmetrica.",
  aspect_label: "1:1",
  width: 1080,
  height: 1080,
  recommended: false,
}
```

### 2.2 I 3 formati built-in

```js
export const FORMAT_SQUARE = {
  id: "square",
  name: "Quadrato",
  description: "Classico Instagram. Stessa altezza e larghezza, perfetto per profile grid simmetrica.",
  aspect_label: "1:1",
  width: 1080,
  height: 1080,
  recommended: false,
};

export const FORMAT_PORTRAIT = {
  id: "portrait",
  name: "Portrait",
  description: "Formato consigliato da Meta nel 2026. Occupa il 35% in più di spazio verticale rispetto al quadrato, migliora reach ed engagement.",
  aspect_label: "4:5",
  width: 1080,
  height: 1350,
  recommended: true,
};

export const FORMAT_LANDSCAPE = {
  id: "landscape",
  name: "Landscape",
  description: "Formato orizzontale. Sconsigliato per slide con molto testo, adatto a contenuti grafici/illustrazioni.",
  aspect_label: "1.91:1",
  width: 1080,
  height: 566,
  recommended: false,
};

export const FORMATS = [FORMAT_SQUARE, FORMAT_PORTRAIT, FORMAT_LANDSCAPE];
```

### 2.3 Modifica allo schema del carosello

```json
{
  "theme": {
    "format": "square" | "portrait" | "landscape",  ← NUOVO, obbligatorio
    "template_id": "system-editorial-mark",
    "palette_id": "system-tech-dark",
    "palette": { /* ... */ },
    "header": { /* ... */ },
    "footer": { /* ... */ },
    "fonts": { /* ... */ }
  }
}
```

`theme.format` è una stringa, MAI null. Se non specificato nel JSON importato, viene migrato a `"square"` (vedi §3).

---

## 3. Migrazione retrocompatibile

Stesso pattern usato per `template_id` e `palette_id`. Estendi `migrateCarousel.js`:

| Caso | JSON di input | Azione |
|---|---|---|
| A | Nessun `theme.format` | Inietta `theme.format: "square"` (l'unico formato che esisteva storicamente) |
| B | `theme.format` presente, valore valido | Nessuna azione |
| C | `theme.format` presente, valore NON registrato | Fallback a `"square"` + toast warning: "Formato '{id}' non riconosciuto. Applicato Quadrato." |

---

## 4. Schema zod aggiornato

```js
const ThemeSchema = z.object({
  format: z.enum(["square", "portrait", "landscape"]),  // NUOVO, obbligatorio
  template_id: z.string().min(1),
  palette_id: z.string().nullable(),
  palette: PaletteColorsSchema,
  header: /* ... */,
  footer: /* ... */,
  fonts:  /* ... */
});
```

La migrazione garantisce `format` sempre presente. Schema strict.

---

## 5. CALIBRAZIONI TIPOGRAFICHE PER FORMATO (riferimento critico)

Questa è la sezione più importante del prompt. Le calibrazioni sono il frutto di test visivi e NON vanno modificate "a buon senso". Implementale verbatim.

### 5.1 Filosofia

Per ogni formato, ogni template definisce le proprie costanti tipografiche e di layout. Il sistema deve permettere a un template di sapere "sto renderizzando in formato X" e applicare i numeri giusti.

### 5.2 Calibrazioni verificate per il template `Editorial Mark`

| Proprietà | square (1:1) | portrait (4:5) | landscape (1.91:1) |
|---|---|---|---|
| `padding` (top/sides/bottom) | `90px 80px 70px` | `120px 80px 100px` | `55px 80px 45px` |
| `.topline` top position | `60px` | `75px` | `30px` |
| `.dot` top position | `54px` | `69px` | `24px` |
| `.num` padding-top | `18px` | `24px` | `10px` |
| `.foot` padding-top | `30px` | `32px` | `16px` |
| `.foot-name` font-size | `22px` | `22px` | `16px` |
| `.foot-meta` font-size | `16px` | `16px` | `12px` |
| `.num` font-size | `20px` | `20px` | `16px` |
| `.kicker` font-size | `18px` | `18px` | `13px` |
| `.swipe-mini` bottom | `130px` | `160px` | `80px` |
| Body **cover** size | `118px` / lh `0.98` | `128px` / lh `0.95` | `72px` / lh `1.0` |
| Body **xl** size | `96px` / lh `1.00` | `104px` / lh `1.0` | `60px` / lh `1.05` |
| Body **lg** size | `82px` / lh `1.05` | `88px` / lh `1.08` | `52px` / lh `1.05` |
| Body **md** size | `68px` / lh `1.10` | `74px` / lh `1.12` | `44px` / lh `1.10` |
| Body Fraunces **xl** | `92px` | `100px` | `58px` |
| Body Fraunces **lg** | `78px` | `84px` | `50px` |
| Divider numerone | `340px` / top `160px` | `380px` / top `200px` | `180px` / top `80px` |
| CTA item font-size | `88px` / lh `1.05` / gap `18px` | `94px` / lh `1.05` / gap `22px` | `54px` / lh `1.05` / gap `12px` |

### 5.3 Calibrazioni verificate per il template `Bold Corner`

Il Bold Corner ha decorazioni grafiche che vanno calibrate al formato.

| Proprietà | square (1:1) | portrait (4:5) | landscape (1.91:1) |
|---|---|---|---|
| `padding` | `90px 80px 70px` | `120px 80px 100px` | `55px 80px 45px` |
| `.bold__corner` (angolo nero) dimensioni | `240×240px` | `280×280px` | `180×180px` |
| `.bold__slash` (// //) font-size | `36px` | `40px` | `26px` |
| `.bold__slash` top | `25px` | `30px` | `18px` |
| `.bold__num-box` font-size | `24px` | `26px` | `18px` |
| `.bold__num-box` padding | `10px 20px` | `12px 22px` | `7px 14px` |
| `.bold__kicker` font-size | `18px` | `20px` | `13px` |
| Body cover size | `110px` / lh `0.95` | `120px` / lh `0.95` | `68px` / lh `1.0` |
| Body xl size | `92px` / lh `0.98` | `100px` / lh `1.0` | `58px` / lh `1.05` |
| Body lg size | `80px` / lh `1.00` | `86px` / lh `1.05` | `50px` / lh `1.05` |
| Body md size | `64px` / lh `1.05` | `70px` / lh `1.10` | `42px` / lh `1.10` |
| Body Fraunces xl | `86px` | `94px` | `54px` |
| Body Fraunces lg | `72px` | `80px` | `48px` |
| `.bold__divider-num` font-size / top | `340px` / `280px` | `380px` / `320px` | `180px` / `100px` |
| `.bold__cta-item` font-size / gap | `80px` / `22px` | `86px` / `26px` | `48px` / `14px` |
| Footer name / meta sizes | come Editorial | come Editorial | come Editorial |

### 5.4 Pattern di implementazione

Ogni template ha un oggetto di calibrazione:

```js
// src/slide-renderer/templates/editorial-mark/calibrations.js
export const EDITORIAL_CALIBRATIONS = {
  square: {
    padding: "90px 80px 70px",
    topline_top: "60px",
    dot_top: "54px",
    num_padding_top: "18px",
    // ... etc
    body_archivo: {
      cover: { size: 118, line_height: 0.98 },
      xl:    { size: 96,  line_height: 1.00 },
      lg:    { size: 82,  line_height: 1.05 },
      md:    { size: 68,  line_height: 1.10 },
    },
    body_fraunces: {
      xl: { size: 92, line_height: 1.05 },
      lg: { size: 78, line_height: 1.05 },
    },
    divider_num: { size: 340, top: 160 },
    cta_item: { size: 88, gap: 18, line_height: 1.05 },
    // ... etc
  },
  portrait: { /* ... */ },
  landscape: { /* ... */ },
};
```

Il componente template legge la calibrazione corretta in base a `theme.format`:

```js
function EditorialStandardSlide({ slide, theme, total }) {
  const calib = EDITORIAL_CALIBRATIONS[theme.format];
  // applica calib.body_archivo[slide.size] al body
  // applica calib.padding al container
  // etc.
}
```

### 5.5 Implementazione delle calibrazioni nel CSS

Le calibrazioni vanno applicate via **variabili CSS inline** sul container della slide, non via classi CSS condizionali. Pattern:

```jsx
const calib = EDITORIAL_CALIBRATIONS[theme.format];
const bodySize = calib.body_archivo[slide.size];

<div
  className="editorial"
  style={{
    '--editorial-padding': calib.padding,
    '--editorial-topline-top': calib.topline_top,
    '--editorial-dot-top': calib.dot_top,
    '--editorial-num-padding-top': calib.num_padding_top,
    '--editorial-body-size': `${bodySize.size}px`,
    '--editorial-body-line-height': bodySize.line_height,
    // ...
  }}
>
```

Nel CSS:

```css
.editorial {
  padding: var(--editorial-padding);
}
.editorial__topline {
  top: var(--editorial-topline-top);
}
.editorial__body--archivo {
  font-size: var(--editorial-body-size);
  line-height: var(--editorial-body-line-height);
}
```

Questo pattern:
- Mantiene il CSS pulito (un solo blocco per regola)
- Permette di cambiare formato a runtime senza ricaricare CSS
- È coerente con come già passiamo i colori della palette

---

## 6. Container `.slide` parametrizzato

Il CSS globale `slide-renderer.css`:

```css
.slide {
  width: var(--slide-width);
  height: var(--slide-height);
  background: var(--slide-bg);
  color: var(--slide-fg);
  position: relative;
  overflow: hidden;
  /* ... */
}
```

`SlideRenderer.jsx` setta le variabili:

```jsx
import { getFormat } from '@/lib/formats/registry.js';

export function SlideRenderer({ slide, theme, total, mode = 'preview' }) {
  const format = getFormat(theme.format);  // { id, width, height, ... }
  const template = getTemplate(theme.template_id);

  return (
    <div
      className="slide"
      style={{
        '--slide-width': `${format.width}px`,
        '--slide-height': `${format.height}px`,
        // colori palette esistenti
        '--slide-bg': theme.palette.background,
        '--slide-surface': theme.palette.surface,
        '--slide-fg': theme.palette.foreground,
        '--slide-accent': theme.palette.accent,
        '--slide-muted': theme.palette.muted,
        '--slide-line': theme.palette.line,
      }}
    >
      <template.Component {...{slide, theme, total, mode}} />
    </div>
  );
}
```

---

## 7. Thumbnail nella griglia

Le `SlideCard` mostrano una thumbnail della slide. Oggi è 280×280 con `transform: scale(0.26)`. Va parametrizzata.

```js
const THUMBNAIL_TARGET_WIDTH = 280; // larghezza target del thumbnail in px

function getThumbnailScale(format) {
  return THUMBNAIL_TARGET_WIDTH / format.width;
}

function getThumbnailDimensions(format) {
  const scale = getThumbnailScale(format);
  return {
    width: format.width * scale,    // sempre 280 perché width è sempre 1080
    height: format.height * scale,  // varia in base al formato
  };
}
```

| Formato | Thumbnail (280px width) |
|---|---|
| `square` | 280 × 280 |
| `portrait` | 280 × 350 |
| `landscape` | 280 × 147 |

La griglia delle thumbnail si **adatta visivamente** al cambio formato. Tutte le card hanno la stessa larghezza ma altezza variabile. Su mobile responsive idem, riproporzionato.

---

## 8. Export PNG aggiornato

In `exportPng.js`:

```js
export async function exportSlideAsPng(slideElement, format) {
  await document.fonts.ready;

  return await htmlToImage.toPng(slideElement, {
    width: format.width,
    height: format.height,
    pixelRatio: 2,  // retina
    style: {
      width: `${format.width}px`,
      height: `${format.height}px`,
    },
    cacheBust: true,
  });
}
```

Lo stesso vale per l'export ZIP: ogni slide viene esportata con le dimensioni del formato del carosello.

---

## 9. UI: nuova sezione "Formato" nella sidebar Tema

Aggiungi una **sesta sezione** nella sidebar Tema. Posizionala in cima, sopra "Template", perché concettualmente "scelgo prima la tela, poi cosa ci disegno sopra".

Ordine finale delle sezioni:
1. **Formato** (NUOVA, espansa di default)
2. Template
3. Palette
4. Header
5. Footer
6. Fonts

### 9.1 Componente `FormatSection.jsx`

Layout:

```
┌──────────────────────────────────────┐
│ ▼ FORMATO                            │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │  ◯ Quadrato                  │    │
│  │     1:1 — 1080×1080          │    │
│  │     Classico Instagram       │    │
│  ├──────────────────────────────┤    │
│  │  ● Portrait        [consigliato] │
│  │     4:5 — 1080×1350          │    │
│  │     Massimo engagement       │    │
│  ├──────────────────────────────┤    │
│  │  ◯ Landscape                 │    │
│  │     1.91:1 — 1080×566        │    │
│  │     ⚠ Sconsigliato per testo │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### 9.2 Specifiche del selettore

- Lista verticale di 3 opzioni, una sotto l'altra (NON dropdown — la lista è breve e va vista a colpo d'occhio)
- Ogni opzione mostra:
  - Radio button (cerchio pieno per selezionato, vuoto per non selezionato)
  - Nome del formato (es. "Portrait")
  - Etichetta dimensioni (es. "4:5 — 1080×1350"), monospace, font più piccolo
  - Descrizione (1 riga, font ancora più piccolo, color muted)
- Badge "consigliato" sul portrait, stilato come badge oro/accent
- Badge warning ⚠ sul landscape: "Sconsigliato per testo"
- Click su un'opzione applica il formato (vedi §10)
- L'opzione corrente è evidenziata con sfondo leggero `var(--app-surface-hover)` o equivalente

### 9.3 BEM classes

```
.format-selector
.format-selector__option
.format-selector__option--active
.format-selector__radio
.format-selector__info
.format-selector__name
.format-selector__dimensions
.format-selector__description
.format-selector__badge
.format-selector__badge--recommended
.format-selector__badge--warning
```

---

## 10. Comportamento al cambio formato

Quando l'utente clicca un formato diverso da quello corrente:

1. **Dispatch azione `APPLY_FORMAT`** al reducer, payload `{ formatId }`
2. **L'azione modifica `state.carousel.theme.format`**
3. **Tutte le slide si re-renderizzano** con le nuove dimensioni e calibrazioni
4. **Toast di conferma**: "Formato applicato. Le slide sono state riadattate."
5. **Cmd+Z** può annullare il cambio (è in history)

### 10.1 Nessuna conferma prima del cambio

A differenza del cambio template (che era "sostituzione totale", quindi un toast suggeriva la palette compatibile), il cambio formato è meno invasivo:
- Le slide restano identiche nei contenuti
- Solo le dimensioni cambiano
- È facile annullare con Cmd+Z

Quindi: **niente modale di conferma**. Click → applica → toast.

### 10.2 Azione del reducer

```js
case 'APPLY_FORMAT': {
  const { formatId } = action.payload;
  return pushHistory(state, {
    ...state,
    carousel: {
      ...state.carousel,
      theme: {
        ...state.carousel.theme,
        format: formatId,
      },
    },
  });
}
```

---

## 11. Avvertimento sul cambio formato e ridimensionamento testo

Cambiare formato non rifa il testo. Una slide che aveva 5 righe nel quadrato potrebbe averne 7 nel portrait (perché il container è più stretto in proporzione al font). Questo è **un comportamento intenzionale**, non un bug.

### 11.1 Indicatore di "rischio overflow" già esistente

Nelle `SlideCard` c'è già un indicatore "rischio leggibilità" (warning giallo per testi troppo lunghi). Esiste già la funzione `assessReadabilityRisk(slide)`. Va estesa per considerare il formato:

```js
const LIMITS_BY_FORMAT_AND_SIZE = {
  square: {
    cover: 60,
    xl: 80,
    lg: 120,
    md: 200,
  },
  portrait: {
    cover: 70,    // un po' più spazio
    xl: 95,
    lg: 145,
    md: 240,
  },
  landscape: {
    cover: 35,    // molto meno spazio
    xl: 50,
    lg: 75,
    md: 120,
  },
};
```

Il warning si attiverà più frequentemente passando a landscape.

---

## 12. Componenti dei template: aggiornamento

Tutti i template (Editorial Mark, Bold Corner) vanno aggiornati per leggere `theme.format` e applicare le calibrazioni corrette.

### 12.1 Refactoring necessario

Per ogni template:
1. Crea il file `calibrations.js` con la tabella delle calibrazioni (vedi §5.4)
2. Importa nelle slide del template
3. Sostituisci i valori hardcoded con `calib[size]`
4. Passa le variabili CSS al container

Non riscrivere la logica del template. È solo un'estrazione delle costanti in un oggetto leggibile.

### 12.2 Esempio di refactoring (Editorial Mark)

Prima:

```jsx
// EditorialStandardSlide.jsx (versione attuale, hardcoded)
<div className="editorial">
  <div className="editorial__topline" />
  <div className="editorial__dot" />
  <div className="editorial__num">07 / 13</div>
  <div className="editorial__body editorial__body--archivo editorial__body--lg">
    {parsedLines}
  </div>
</div>
```

E nel CSS:
```css
.editorial__body--lg { font-size: 82px; line-height: 1.05; }
```

Dopo:

```jsx
// EditorialStandardSlide.jsx (parametrizzato)
import { EDITORIAL_CALIBRATIONS } from './calibrations.js';

export function EditorialStandardSlide({ slide, theme, total }) {
  const calib = EDITORIAL_CALIBRATIONS[theme.format];
  const bodyCalib = calib.body_archivo[slide.size] || calib.body_archivo.md;

  return (
    <div
      className="editorial"
      style={{
        '--editorial-padding': calib.padding,
        '--editorial-topline-top': calib.topline_top,
        '--editorial-dot-top': calib.dot_top,
        '--editorial-num-padding-top': calib.num_padding_top,
        '--editorial-num-size': calib.num_size,
        '--editorial-kicker-size': calib.kicker_size,
        '--editorial-foot-padding-top': calib.foot_padding_top,
        '--editorial-foot-name-size': calib.foot_name_size,
        '--editorial-foot-meta-size': calib.foot_meta_size,
        '--editorial-body-size': `${bodyCalib.size}px`,
        '--editorial-body-line-height': bodyCalib.line_height,
      }}
    >
      <div className="editorial__topline" />
      <div className="editorial__dot" />
      <div className="editorial__num">{/* ... */}</div>
      <div className="editorial__body editorial__body--archivo">
        {parsedLines}
      </div>
    </div>
  );
}
```

E nel CSS le regole usano le variabili:
```css
.editorial { padding: var(--editorial-padding); }
.editorial__topline { top: var(--editorial-topline-top); }
.editorial__body--archivo {
  font-size: var(--editorial-body-size);
  line-height: var(--editorial-body-line-height);
}
```

---

## 13. Struttura file da aggiungere/modificare

```
src/
├── lib/
│   ├── formats/                          # NUOVO MODULO
│   │   ├── registry.js                   # FORMATS = [SQUARE, PORTRAIT, LANDSCAPE]
│   │   ├── builtins.js                   # le 3 definizioni
│   │   └── getFormat.js                  # helper getFormat(id)
│   │
│   ├── schema.js                         # AGGIORNATO: format obbligatorio nel ThemeSchema
│   ├── migrateCarousel.js                # AGGIORNATO: inietta format se mancante
│   └── exportPng.js                      # AGGIORNATO: usa format.width/height
│
├── slide-renderer/
│   ├── SlideRenderer.jsx                 # AGGIORNATO: --slide-width/height variabili
│   ├── slide-renderer.css                # AGGIORNATO: container parametrizzato
│   │
│   └── templates/
│       ├── editorial-mark/
│       │   ├── calibrations.js           # NUOVO
│       │   ├── EditorialCoverSlide.jsx   # AGGIORNATO
│       │   ├── EditorialStandardSlide.jsx # AGGIORNATO
│       │   ├── EditorialDividerSlide.jsx # AGGIORNATO
│       │   ├── EditorialCtaSlide.jsx     # AGGIORNATO
│       │   └── editorial-mark.css        # AGGIORNATO: usa CSS variables
│       │
│       └── bold-corner/
│           ├── calibrations.js           # NUOVO
│           ├── BoldCoverSlide.jsx        # AGGIORNATO
│           ├── BoldStandardSlide.jsx     # AGGIORNATO
│           ├── BoldDividerSlide.jsx      # AGGIORNATO
│           ├── BoldCtaSlide.jsx          # AGGIORNATO
│           └── bold-corner.css           # AGGIORNATO
│
├── components/
│   ├── theme-sidebar/
│   │   ├── sections/
│   │   │   └── FormatSection.jsx         # NUOVO
│   │   └── ThemeSidebar.jsx              # AGGIORNATO: ordina sezioni con Formato in cima
│   │
│   └── slide-grid/
│       └── SlideCard.jsx                 # AGGIORNATO: thumbnail dimensions dinamiche
│
└── hooks/
    └── useCarouselStore.js               # AGGIORNATO: azione APPLY_FORMAT
```

---

## 14. Convenzioni BEM specifiche

```
.format-selector
.format-selector__option
.format-selector__option--active
.format-selector__radio
.format-selector__info
.format-selector__name
.format-selector__dimensions
.format-selector__description
.format-selector__badge
.format-selector__badge--recommended
.format-selector__badge--warning
```

---

## 15. Anti-pattern da evitare

- ❌ **Non** modificare i CSS dei template inserendo nuove media queries `@media` per formato. Usa le variabili CSS impostate inline da React.
- ❌ **Non** creare classi CSS condizionali tipo `.editorial--portrait` o `.editorial--landscape`. Una sola classe, variabili dinamiche.
- ❌ **Non** salvare il formato come dato della slide. È una proprietà del carosello/theme.
- ❌ **Non** modificare le calibrazioni "per buon senso" durante l'implementazione. Sono il frutto di test visivi. Implementale verbatim. Se vedi un caso che ti sembra sbagliato, segnalalo nel resoconto finale.
- ❌ **Non** rendere editabili i formati dall'utente (no "crea formato custom"). Sono codice, come i template.
- ❌ **Non** mostrare un wizard "vuoi convertire le slide al nuovo formato?" — niente conversione automatica del contenuto, solo cambio dimensioni.
- ❌ **Non** assumere che cambiare formato sia un'operazione rara. Le thumbnail della griglia devono riadattarsi fluidamente al cambio formato.
- ❌ **Non** dimenticare di aggiornare la sezione di rendering off-screen per l'export PNG (le dimensioni devono matchare il formato).
- ❌ **Non** assumere che `format` esista in tutti i theme. Usa sempre fallback `theme.format ?? 'square'` se accedi prima della migrazione.
- ❌ **Non** rompere `_ai_generation` esistente. Il modello AI non genera `theme.format` (genera `theme: null`); il formato viene preservato dal carosello corrente al momento della sostituzione (vedi §16).

---

## 16. Interazione con la generazione AI

Quando l'utente genera un nuovo carosello via AI:
- L'AI restituisce `theme: null` (come specificato nel system prompt)
- L'app preserva `theme.format` del carosello corrente al momento della sostituzione, **insieme** a `template_id`, `palette_id`, `palette`, header, footer, fonts (come già fa oggi)

Quindi: chi genera un carosello in formato portrait, riceve un nuovo carosello in formato portrait. Niente effetti collaterali.

---

## 17. Workflow consigliato (a fasi)

### Fase 1 — Modello dati e migrazione (2-3 ore)

- Crea `src/lib/formats/builtins.js` con i 3 formati
- Crea `src/lib/formats/registry.js` e `getFormat.js`
- Aggiorna `schema.js` con `format` obbligatorio
- Aggiorna `migrateCarousel.js` per iniettare `"square"` se mancante
- Aggiorna `defaultCarousel.js` (default = `"square"` per retrocompatibilità)
- Aggiungi l'azione `APPLY_FORMAT` al reducer

**Criterio di accettazione Fase 1**: caricando un JSON storico (senza `theme.format`), l'app lo migra a `square`. Caricando un JSON manualmente modificato con `format: "portrait"`, viene rispettato.

### Fase 2 — Container slide parametrizzato (2-3 ore)

- Aggiorna `SlideRenderer.jsx` per leggere `format` dal theme e passare `--slide-width/height` come variabili CSS
- Aggiorna `slide-renderer.css` per usare le variabili
- Aggiorna `exportPng.js` per usare le dimensioni del formato

**Criterio di accettazione Fase 2**: cambiando manualmente `theme.format` nel JSON tab e applicando, le slide cambiano dimensioni nella griglia. L'export PNG produce immagini delle dimensioni giuste.

### Fase 3 — Calibrazioni per template (4-5 ore)

- Crea `calibrations.js` per Editorial Mark (verbatim dalle tabelle §5.2)
- Refactoring dei 4 componenti del template per leggere le calibrazioni
- Aggiorna `editorial-mark.css` per usare le variabili CSS
- Stesso lavoro per Bold Corner (calibrazioni §5.3)

**Criterio di accettazione Fase 3**: cambiando `format` da quadrato a portrait, le slide cambiano dimensione E tipografia. Niente sovrapposizioni, niente overflow. Le slide di entrambi i template funzionano bene in tutti e 3 i formati.

### Fase 4 — UI: sezione Formato nella sidebar (2-3 ore)

- Crea `FormatSection.jsx`
- Posizionala in cima alla sidebar Tema (sopra Template)
- Implementa il selettore visivo con i 3 formati, badge "consigliato" e ⚠
- Cambia stato delle sezioni di default: Formato espansa, Palette espansa, Template chiuso, Header/Footer/Fonts chiuse
- Toast di conferma al cambio formato

**Criterio di accettazione Fase 4**: posso cambiare formato dalla sidebar, vedo immediatamente le slide adattate. Il badge "consigliato" appare sul portrait. Il warning ⚠ appare sul landscape.

### Fase 5 — Thumbnail griglia e rifiniture (2-3 ore)

- Aggiorna `SlideCard.jsx` per calcolare le dimensioni thumbnail in base al formato
- Verifica che la griglia delle slide si adatti correttamente (CSS grid o flex)
- Aggiorna `assessReadabilityRisk()` con i nuovi limiti per formato (vedi §11.1)
- Test cross-template: ogni template × ogni formato = 6 combinazioni → verifica visiva
- Test export PNG nei 3 formati per entrambi i template

**Criterio di accettazione Fase 5**: 6 combinazioni testate, nessuna rotta. Le thumbnail nella griglia si riproporzionano. Il warning leggibilità si aggiorna in base al formato.

---

## 18. Criteri di qualità finale (checklist)

- [ ] Il JSON include `theme.format` con valore `square` | `portrait` | `landscape`
- [ ] Lo schema zod richiede `theme.format`
- [ ] I JSON storici (senza `format`) si caricano correttamente, migrati a `square`
- [ ] La sidebar Tema ha una nuova sezione "Formato" in cima, espansa di default
- [ ] Il selettore mostra i 3 formati con nome, dimensioni, descrizione, badge "consigliato"/"warning"
- [ ] Cambiando formato dal selettore, tutte le slide della griglia si adattano fluidamente
- [ ] Il template Editorial Mark funziona correttamente nei 3 formati
- [ ] Il template Bold Corner funziona correttamente nei 3 formati
- [ ] Le calibrazioni tipografiche sono implementate verbatim dalle tabelle §5.2 e §5.3
- [ ] L'export PNG produce immagini delle dimensioni corrette per il formato attivo
- [ ] L'export ZIP funziona nei 3 formati
- [ ] Le thumbnail della griglia si adattano (280×280 per square, 280×350 per portrait, 280×147 per landscape)
- [ ] Cmd+Z annulla il cambio formato (è in history)
- [ ] Il warning "leggibilità rischio" si aggiorna con i nuovi limiti per formato
- [ ] La generazione AI preserva il formato del carosello corrente
- [ ] Niente warning React in console
- [ ] Niente regressioni su template, palette, generazione AI, export

---

## 19. Note finali

- L'utente è uno sviluppatore senior. Niente commento del codice ovvio.
- Tutti i testi UI sono in **italiano**.
- Quando incontri un caso ambiguo, **chiedi** prima di implementare.
- Le calibrazioni delle tabelle §5.2 e §5.3 sono il risultato di test visivi. NON ottimizzarle "a buon senso". Implementale verbatim.
- Quando finisci una fase, scrivi un breve resoconto: cosa hai costruito, cosa ti ha sorpreso, eventuali compromessi tecnici.
- Mantieni allineamento con le convenzioni del progetto: BEM, hooks pattern, no TypeScript.

---

**Ricorda**: il formato è una proprietà del carosello (livello theme), non delle slide. Le calibrazioni sono il cuore del lavoro: implementale verbatim. La UI è solo l'interruttore che le attiva.

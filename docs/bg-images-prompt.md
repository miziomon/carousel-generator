# Carosello Builder — Supporto immagini di sfondo per slide

> **Per Claude Code**: questo prompt aggiunge il supporto a immagini di sfondo per le singole slide del carosello. È una feature opzionale: la maggior parte delle slide resterà senza immagine; quando l'utente carica un'immagine, può configurare opacità, blur, posizione e overlay. Leggi tutto, fai domande se servono, poi parti dalla Fase 1.

---

## 0. Scope esplicito

### Cosa COPRE questo prompt

- Nuovo campo `background_image` opzionale nello schema della singola slide
- 6 parametri di trattamento dell'immagine (vedi §3)
- Upload con resize automatico a max 1080px lato lungo + compressione JPG 0.85
- Storage base64 inline nel JSON
- UI nell'edit modal della slide: sezione "Sfondo immagine" con upload/anteprima/rimozione
- Rendering dell'immagine + overlay in tutti i template esistenti (Editorial Mark, Bold Corner)
- Compatibilità garantita con tutti i 3 formati (square, portrait, landscape)
- Aggiornamento delle thumbnail nella SlideCard per mostrare l'immagine reale
- Aggiornamento dell'export PNG per produrre l'immagine finale corretta
- Aggiornamento dell'export ZIP

### Cosa NON copre

- Crop manuale dell'immagine prima dell'upload (l'utente usa una foto pre-croppata o accetta il `background-size: cover`)
- Filtri colore avanzati oltre opacità/blur/overlay (es. saturation, contrast, hue-rotate)
- Galleria di immagini riusabili o "libreria" interna
- Stock photo integration (Unsplash, Pexels, ecc.)
- AI image generation
- Editing delle immagini in-app (rotazione, ritaglio, ecc.)
- Migrazione di immagini esterne via URL (solo upload locale)

---

## 1. Contesto e principio architetturale

Le immagini di sfondo sono una proprietà della **singola slide**, non del carosello né del theme. Questo è coerente con come funzionano i caroselli editoriali reali: solo alcune slide hanno immagine (tipicamente cover e slide-pugno), le altre restano sul colore di sfondo della palette.

**Principio guida**: l'immagine è un layer **opzionale** che si interpone tra il container `.slide` (sfondo palette) e il contenuto della slide. Se assente, niente cambia rispetto a oggi. Se presente, viene renderizzata sotto al contenuto con i parametri scelti.

L'immagine vive nello schema in modo **completamente isolato**: niente di esistente cambia comportamento se la slide non ha immagine. È una pura estensione, non un refactoring.

---

## 2. Modello dati

### 2.1 Nuovo campo `background_image` nello schema slide

```json
{
  "num": 1,
  "type": "standard",
  "kicker": "La Terza Legge",
  "font": "archivo",
  "size": "lg",
  "lines": ["La tecnologia avanzata è indistinguibile dalla [hl]magia[/hl]."],
  "background_image": {
    "data": "data:image/jpeg;base64,...",
    "opacity": 1.0,
    "blur": 0,
    "position": "center",
    "overlay": {
      "enabled": true,
      "type": "palette",
      "intensity": 0.7
    }
  }
}
```

Quando `background_image` è assente (default), la slide funziona esattamente come oggi.

### 2.2 Specifica dei 6 parametri

| Campo | Tipo | Valori | Default | Note |
|---|---|---|---|---|
| `data` | `string` | Data URL JPG/PNG base64 | — | Obbligatorio se presente l'oggetto. Vedi §4 per processing |
| `opacity` | `number` | `0.0` – `1.0` | `1.0` | Opacità dell'immagine (non dell'overlay) |
| `blur` | `number` | `0` – `20` | `0` | Blur in pixel applicato all'immagine |
| `position` | `string` enum | vedi sotto | `"center"` | Posizione CSS `background-position` |
| `overlay.enabled` | `boolean` | `true`/`false` | `false` | Toggle overlay |
| `overlay.type` | `string` enum | `"dark"` / `"light"` / `"palette"` | `"palette"` | Tipo di overlay |
| `overlay.intensity` | `number` | `0.0` – `1.0` | `0.5` | Intensità dell'overlay |

Valori validi per `position` (9-grid):
```
top-left      top      top-right
left          center   right
bottom-left   bottom   bottom-right
```

### 2.3 Schema zod aggiornato

```js
const BackgroundImageSchema = z.object({
  data: z.string().startsWith('data:image/'),
  opacity: z.number().min(0).max(1).default(1),
  blur: z.number().min(0).max(20).default(0),
  position: z.enum([
    'top-left', 'top', 'top-right',
    'left', 'center', 'right',
    'bottom-left', 'bottom', 'bottom-right'
  ]).default('center'),
  overlay: z.object({
    enabled: z.boolean().default(false),
    type: z.enum(['dark', 'light', 'palette']).default('palette'),
    intensity: z.number().min(0).max(1).default(0.5),
  }).optional().default({
    enabled: false,
    type: 'palette',
    intensity: 0.5,
  }),
});

// Lo SlideSchema esistente aggiunge il campo opzionale:
const SlideSchema = z.object({
  // ... campi esistenti
  background_image: BackgroundImageSchema.optional(),
});
```

### 2.4 Migrazione retrocompatibile

Banale: il campo è opzionale. JSON storici senza `background_image` continuano a funzionare senza modifiche al validator. Nessuna logica di migrazione necessaria.

---

## 3. Pipeline di processing dell'immagine

Quando l'utente carica un'immagine dall'edit modal, applica questa pipeline **prima** di salvare nel JSON:

### 3.1 Step della pipeline

```
1. File input → File object (JPG/PNG accettati)
2. Validazione: MIME type, dimensioni file (max 10MB pre-resize)
3. Lettura come ImageBitmap o Image
4. Resize: max 1080px lato lungo (mantieni aspect ratio)
5. Re-encoding come JPEG quality 0.85 (anche se input era PNG)
6. Output: data URL base64
7. Salva nel campo slide.background_image.data
```

### 3.2 Implementazione

Crea `src/lib/images/processImage.js`:

```js
/**
 * Processa un File caricato dall'utente: resize a max 1080px lato lungo,
 * compressione JPEG quality 0.85, output base64 data URL.
 *
 * @param {File} file
 * @returns {Promise<string>} Data URL JPEG
 * @throws Error se MIME non supportato o file troppo grande
 */
export async function processImageFile(file) {
  const MAX_DIMENSION = 1080;
  const QUALITY = 0.85;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Validazione
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato non supportato. Usa JPG, PNG o WebP.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File troppo grande. Massimo 10MB.');
  }

  // Carica come ImageBitmap
  const bitmap = await createImageBitmap(file);

  // Calcola dimensioni target
  const { width: srcW, height: srcH } = bitmap;
  let targetW = srcW;
  let targetH = srcH;
  if (Math.max(srcW, srcH) > MAX_DIMENSION) {
    const ratio = MAX_DIMENSION / Math.max(srcW, srcH);
    targetW = Math.round(srcW * ratio);
    targetH = Math.round(srcH * ratio);
  }

  // Renderizza su canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // Output JPEG quality 0.85
  return canvas.toDataURL('image/jpeg', QUALITY);
}
```

### 3.3 Limite pratico al numero di immagini

Una JPG 1080×1350 quality 0.85 pesa ~150-300KB. Base64 aggiunge ~33% di overhead → ~200-400KB per slide con immagine. 

Limite localStorage browser: ~5MB. Quindi al massimo ~15-20 slide con immagine prima di rischiare overflow. Per l'MVP è sufficiente: la maggior parte dei caroselli avrà immagini solo su 2-5 slide.

**Quando la dimensione totale del carosello in localStorage supera i 4MB**, mostra un warning non bloccante:

> "Il carosello è grande (4.2MB). Considera di ridurre il numero di slide con immagine per migliorare le performance."

Calcola la dimensione facendo `new Blob([JSON.stringify(carousel)]).size`.

---

## 4. CSS per il rendering

### 4.1 Struttura DOM target

Quando una slide ha `background_image`, il DOM diventa:

```html
<div class="slide" style="--slide-bg: #...; ...">
  <div class="slide__bg-image" style="..."></div>      <!-- immagine -->
  <div class="slide__bg-overlay" style="..."></div>    <!-- overlay opzionale -->
  <div class="slide__content">                          <!-- contenuto template -->
    <!-- Componenti template (editorial, bold, ecc.) -->
  </div>
</div>
```

I 3 layer hanno z-index espliciti: `bg-image: 0`, `bg-overlay: 1`, `content: 2`.

### 4.2 CSS globale per i layer immagine

Aggiungi al CSS globale `slide-renderer.css`:

```css
/* Layer immagine: applicato solo se background-image è settato */
.slide__bg-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: cover;
  background-repeat: no-repeat;
  pointer-events: none;
  /* La proprietà background-image viene applicata inline da React */
  /* La proprietà background-position viene applicata inline da React */
  /* La proprietà opacity viene applicata inline da React */
  /* La proprietà filter (blur) viene applicata inline da React */
}

/* Wrapper di layer con blur: il blur va applicato all'immagine sotto */
.slide__bg-image--blurred {
  /* Quando si applica blur, l'immagine deve essere ingrandita per evitare bordi */
  transform: scale(1.05);
}

/* Layer overlay: applicato solo se overlay è enabled */
.slide__bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  /* background viene applicato inline */
}

/* Layer contenuto: deve essere sopra immagine e overlay */
.slide__content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
}
```

### 4.3 Aggiornamento di `SlideRenderer.jsx`

Il componente principale wrappa il template in una struttura 3-layer quando c'è un'immagine:

```jsx
export function SlideRenderer({ slide, theme, total, mode = 'preview' }) {
  const format = getFormat(theme.format);
  const template = getTemplate(theme.template_id);
  const bgImage = slide.background_image;

  return (
    <div
      className="slide"
      style={{
        '--slide-width': `${format.width}px`,
        '--slide-height': `${format.height}px`,
        '--slide-bg': theme.palette.background,
        '--slide-surface': theme.palette.surface,
        '--slide-fg': theme.palette.foreground,
        '--slide-accent': theme.palette.accent,
        '--slide-muted': theme.palette.muted,
        '--slide-line': theme.palette.line,
      }}
    >
      {bgImage && <BackgroundImageLayer bgImage={bgImage} theme={theme} />}
      <div className="slide__content">
        <template.Component slide={slide} theme={theme} total={total} mode={mode} />
      </div>
    </div>
  );
}
```

### 4.4 Componente `BackgroundImageLayer.jsx`

```jsx
// src/slide-renderer/BackgroundImageLayer.jsx

export function BackgroundImageLayer({ bgImage, theme }) {
  const imageStyle = {
    backgroundImage: `url("${bgImage.data}")`,
    backgroundPosition: bgImage.position,
    opacity: bgImage.opacity,
    filter: bgImage.blur > 0 ? `blur(${bgImage.blur}px)` : 'none',
  };

  const imageClass = bgImage.blur > 0
    ? 'slide__bg-image slide__bg-image--blurred'
    : 'slide__bg-image';

  const overlayBg = computeOverlayBackground(bgImage.overlay, theme);

  return (
    <>
      <div className={imageClass} style={imageStyle} />
      {bgImage.overlay?.enabled && overlayBg && (
        <div
          className="slide__bg-overlay"
          style={{ background: overlayBg }}
        />
      )}
    </>
  );
}

function computeOverlayBackground(overlay, theme) {
  if (!overlay || !overlay.enabled) return null;
  const { type, intensity } = overlay;

  switch (type) {
    case 'dark':
      return `rgba(0, 0, 0, ${intensity})`;
    case 'light':
      return `rgba(255, 255, 255, ${intensity})`;
    case 'palette': {
      // Usa il colore background della palette come overlay
      const bgHex = theme.palette.background;
      // Converti hex a rgba
      const { r, g, b } = hexToRgb(bgHex);
      return `rgba(${r}, ${g}, ${b}, ${intensity})`;
    }
    default:
      return null;
  }
}
```

### 4.5 Helper `hexToRgb`

In `src/lib/color/normalize.js` aggiungi (se non esiste):

```js
export function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const fullHex = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}
```

---

## 5. UI nell'EditModal della slide

Aggiungi una nuova **sezione "Sfondo immagine"** dentro `EditModal.jsx`, **prima** dei campi esistenti (font, size, kicker, lines). Logica: lo sfondo è la "tela" della slide, va decisa prima del contenuto.

### 5.1 Layout della sezione

**Caso A — Nessuna immagine attualmente impostata:**

```
┌─────────────────────────────────────────────────────┐
│ Sfondo immagine                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │  [+]  Carica immagine                     │      │
│  │       JPG, PNG o WebP fino a 10MB         │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Caso B — Immagine caricata, controlli espansi:**

```
┌─────────────────────────────────────────────────────┐
│ Sfondo immagine                       [Rimuovi]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │ [thumbnail anteprima con effetti applicati]      │
│  │                                            │      │
│  │  [Sostituisci immagine]                   │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  Opacità                                            │
│  [════════════●════]  100%                          │
│                                                     │
│  Sfocatura (blur)                                   │
│  [●═══════════════]   0px                           │
│                                                     │
│  Posizione                                          │
│  ┌──┬──┬──┐                                         │
│  │  │  │  │  (9-grid clickable)                     │
│  ├──┼──┼──┤                                         │
│  │  │● │  │                                         │
│  ├──┼──┼──┤                                         │
│  │  │  │  │                                         │
│  └──┴──┴──┘                                         │
│                                                     │
│  Overlay                                            │
│  ☐ Attiva overlay                                   │
│                                                     │
│  Quando attivo:                                     │
│  Tipo:  ◯ Scuro  ● Palette  ◯ Chiaro                │
│  Intensità                                          │
│  [════════●═══════]  50%                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 Specifiche dei controlli

**Upload area (caso A)**:
- Click apre file picker nativo
- Drag & drop accettato
- Icona `ImagePlus` (Lucide) sulla sinistra
- Testo principale "Carica immagine" + testo secondario "JPG, PNG o WebP fino a 10MB"
- Border dashed, hover effect (cambia colore border + background leggero)

**Thumbnail di anteprima (caso B)**:
- Mostra **l'immagine con TUTTI gli effetti applicati live** (opacity, blur, posizione, overlay)
- Aspect ratio della thumbnail = aspect ratio del formato del carosello (square / portrait / landscape)
- Larghezza fissa che si adatta al modal (~280px), altezza variabile
- Renderizzata con lo stesso pattern di `BackgroundImageLayer` ma in piccolo
- Sotto la thumbnail, bottone secondario "Sostituisci immagine" che riapre il file picker

**Bottone "Rimuovi"** (top-right della sezione):
- Conferma rapida con `window.confirm` (oppure mini-popover): "Rimuovere l'immagine di sfondo da questa slide?"
- Se confermato, setta `slide.background_image = undefined` (rimuove il campo)
- Mostra subito il caso A

**Slider opacità**:
- Range 0-100% (internamente 0-1.0)
- Step 1%
- Display del valore corrente a destra dello slider
- Reset al default (100%) con piccolo bottone "Reset" o doppio-click sullo slider

**Slider blur**:
- Range 0-20px
- Step 1px
- Stesso pattern dell'opacità

**9-grid position**:
- 9 quadratini in una griglia 3×3 (~32px ciascuno)
- Quello selezionato evidenziato (sfondo accent, contenuto vuoto)
- Hover su quelli non selezionati mostra preview-name del posizionamento
- Click cambia la posizione

**Toggle overlay**:
- Checkbox standard con label "Attiva overlay"
- Quando spento, i campi sotto (tipo + intensità) sono disabled (opacità ridotta)
- Quando acceso, i campi diventano attivi

**Radio overlay type**:
- 3 opzioni in linea orizzontale: Scuro, Palette, Chiaro
- "Palette" è il default raccomandato (usa il background del tema)

**Slider intensità overlay**:
- Range 0-100% (internamente 0-1.0)
- Default 50%

### 5.3 Comportamento real-time

**Critico**: ogni modifica a uno qualunque dei 6 parametri deve aggiornare istantaneamente:
1. La thumbnail di anteprima dentro l'edit modal
2. La SlideCard corrispondente nella griglia sottostante (vedi §6)

Non c'è bisogno di "Salva". Le modifiche dispatchano direttamente al reducer dell'app.

**Debounce per slider**: opacity, blur, intensità sono input continui. Applica debounce 80ms come per i color picker della sidebar Tema, per evitare di re-renderizzare la griglia 60 volte al secondo.

### 5.4 Componenti React da creare

```
src/components/edit-modal/
├── BackgroundImageSection.jsx          # Sezione principale
├── BackgroundImageUpload.jsx           # Caso A — upload vuoto
├── BackgroundImageEditor.jsx           # Caso B — controlli completi
├── BackgroundImagePreview.jsx          # Mini-anteprima
├── PositionGrid.jsx                    # 9-grid selector
└── background-image-section.css
```

---

## 6. Aggiornamento `SlideCard` per anteprime con immagine

Le SlideCard nella griglia mostrano già una thumbnail della slide via `transform: scale()`. Il pattern non cambia: il `SlideRenderer` interno alla thumbnail rispetta automaticamente `background_image` e mostra l'immagine.

**Nessuna modifica strutturale** alle SlideCard. Funziona out of the box.

### 6.1 Indicatore visivo (opzionale)

Non aggiungere indicatori "questa slide ha immagine" sulla card. L'immagine stessa è l'indicatore: la card mostra la slide com'è davvero. Pattern WYSIWYG.

### 6.2 Considerazione performance

Le thumbnail con immagine sono più costose da renderizzare (devono decoder il base64 → bitmap). Su griglia di 20 slide con immagini, il primo render può richiedere 500ms-1s. È accettabile come trade-off MVP.

Se diventa un problema, in v2 si valuta una cache di thumbnail pre-renderizzate.

---

## 7. Export PNG aggiornato

L'export PNG usa già `html-to-image` con il `SlideRenderer` come root. Niente cambia strutturalmente: `html-to-image` cattura il DOM completo, comprese le immagini in data URL.

### 7.1 Caveat tecnici

- I data URL base64 vengono renderizzati senza problemi
- L'opzione `useCORS: true` di html-to-image non è necessaria per data URL
- Il `filter: blur()` viene catturato correttamente
- L'overlay viene catturato correttamente

### 7.2 Verifica manuale al termine

Quando finisci l'implementazione, verifica che l'export di una slide con immagine produce un PNG identico all'anteprima nel browser:
1. Carica un'immagine di test sulla slide 1
2. Configura blur 8px, opacity 80%, overlay palette 60%
3. Click [⬇️ PNG] sulla card
4. Apri il PNG scaricato e confronta con l'anteprima nella griglia

Se differiscono, è un bug (probabile causa: ordine z-index o timing dei font).

---

## 8. Aggiornamento export ZIP

Stesso principio dell'export PNG. Nessun cambiamento strutturale: il loop di esportazione esegue `htmlToImage.toPng` su ciascuna slide.

**Attenzione**: caroselli con molte immagini base64 nello ZIP saranno grandi. Aggiungi un indicatore nel modal di progress dell'export ZIP:

```
"Esportando 15 slide..."
"Dimensione stimata: ~3.5 MB"
```

Calcola la stima così: somma delle dimensioni di tutte le `slide.background_image.data` (lunghezza stringa base64 × 0.75 ≈ byte) + ~50KB per slide senza immagine (PNG renderizzato del solo testo).

---

## 9. Generazione AI: cosa fa il modello con le immagini?

Il system prompt attuale non conosce `background_image`. Quando l'AI genera un nuovo carosello, **NON aggiunge mai** il campo. Le slide generate avranno solo il testo, niente immagini.

Questo è il comportamento corretto e desiderato. Le immagini sono una scelta editoriale dell'utente, non qualcosa che l'AI può inventare.

### 9.1 Sostituzione del carosello da AI

Quando l'utente sostituisce un carosello esistente con uno AI-generated (action `REPLACE_CAROUSEL_FROM_AI`):
- Le **immagini di sfondo del carosello precedente vengono perse** (il nuovo carosello non le ha)
- Questo è il comportamento intenzionale: il nuovo contenuto è diverso, le immagini scelte per il vecchio non ha senso preservarle

Nessuna modifica al system prompt necessaria. Nessuna modifica al codice di gestione AI necessaria.

---

## 10. Struttura file da aggiungere/modificare

```
src/
├── lib/
│   ├── images/                                   # NUOVO MODULO
│   │   ├── processImage.js                       # Resize + compression
│   │   └── estimateSize.js                       # Stima dimensione carosello
│   │
│   ├── schema.js                                 # AGGIORNATO: BackgroundImageSchema
│   └── color/
│       └── normalize.js                          # AGGIORNATO: aggiunge hexToRgb se manca
│
├── slide-renderer/
│   ├── SlideRenderer.jsx                         # AGGIORNATO: 3 layer
│   ├── BackgroundImageLayer.jsx                  # NUOVO
│   └── slide-renderer.css                        # AGGIORNATO: classi __bg-image, __bg-overlay, __content
│
└── components/
    └── edit-modal/
        ├── EditModal.jsx                         # AGGIORNATO: aggiunge sezione
        ├── BackgroundImageSection.jsx            # NUOVO
        ├── BackgroundImageUpload.jsx             # NUOVO
        ├── BackgroundImageEditor.jsx             # NUOVO
        ├── BackgroundImagePreview.jsx            # NUOVO
        ├── PositionGrid.jsx                      # NUOVO
        └── background-image-section.css          # NUOVO
```

---

## 11. Convenzioni BEM specifiche

```
.slide__bg-image
.slide__bg-image--blurred
.slide__bg-overlay
.slide__content

.bg-image-section
.bg-image-section__header
.bg-image-section__remove-btn

.bg-image-upload
.bg-image-upload__icon
.bg-image-upload__primary-text
.bg-image-upload__secondary-text
.bg-image-upload--drag-over

.bg-image-editor
.bg-image-editor__preview
.bg-image-editor__replace-btn
.bg-image-editor__controls
.bg-image-editor__slider-row
.bg-image-editor__slider-label
.bg-image-editor__slider-value

.position-grid
.position-grid__cell
.position-grid__cell--active

.bg-overlay-controls
.bg-overlay-controls--disabled
.bg-overlay-controls__type-options
.bg-overlay-controls__type-option
.bg-overlay-controls__type-option--active
```

---

## 12. Anti-pattern da evitare

- ❌ **Non** salvare l'immagine originale (pre-resize). Conserva solo la versione processata.
- ❌ **Non** consentire dimensioni di immagine non standard (es. 2160px) "per qualità superiore". Il limite 1080px è coerente con la dimensione massima delle slide; immagini più grandi sprecano spazio senza migliorare il rendering.
- ❌ **Non** usare PNG come formato di output del processing (è ~10x più pesante di JPG quality 0.85 a parità di qualità visiva per foto reali).
- ❌ **Non** consentire upload sincroni che bloccano la UI. La pipeline `processImageFile` è async; mostra uno spinner durante il processing.
- ❌ **Non** persistere le immagini fuori dal JSON. Stanno in base64 nel `localStorage` come tutto il resto.
- ❌ **Non** rendere l'overlay obbligatorio quando si carica un'immagine. Default `enabled: false`.
- ❌ **Non** aggiungere il campo `background_image` nelle slide generate dall'AI.
- ❌ **Non** modificare il system prompt AI per insegnargli a generare immagini.
- ❌ **Non** consentire URL esterni come `data` (solo data URL base64). Pattern di sicurezza: niente fetch a domini terzi.
- ❌ **Non** preservare l'aspect ratio dell'immagine nel layer DOM. Il container è il rettangolo della slide; l'immagine viene croppata con `background-size: cover`.
- ❌ **Non** mostrare l'immagine nel template "router" (es. `EditorialMark`). Vive a livello di `SlideRenderer`, comune a tutti i template.
- ❌ **Non** aggiungere "Apply to all slides" come bottone. È una proprietà di singola slide, deliberatamente.

---

## 13. Workflow consigliato (a fasi)

### Fase 1 — Modello dati e pipeline immagini (3-4 ore)

- Aggiorna `schema.js` con `BackgroundImageSchema`
- Crea `processImageFile.js` con la pipeline di resize+compression
- Crea `hexToRgb` in `normalize.js` se manca
- Crea `estimateSize.js` per il calcolo dimensione carosello
- Test manuale: dal JSON tab, aggiungi manualmente un `background_image` a una slide con un'immagine base64 esistente. Verifica che zod la accetti.

**Criterio di accettazione Fase 1**: lo schema accetta il nuovo campo. La funzione `processImageFile` produce data URL JPG dalla pipeline di resize. Niente UI ancora.

### Fase 2 — Rendering layer immagine (3-4 ore)

- Aggiorna `SlideRenderer.jsx` per supportare i 3 layer
- Crea `BackgroundImageLayer.jsx`
- Aggiorna `slide-renderer.css` con le nuove classi
- Test manuale: carica un JSON modificato con `background_image` in una slide, verifica che renderizzi correttamente nella griglia in tutti i template (Editorial + Bold) e in tutti i formati (square, portrait, landscape)

**Criterio di accettazione Fase 2**: caroselli con `background_image` nel JSON si renderizzano correttamente. Cambio template/formato non rompe nulla. Niente UI di editing ancora.

### Fase 3 — UI nell'EditModal (5-6 ore)

- Crea `BackgroundImageSection.jsx` con i due stati (vuoto/popolato)
- Crea `BackgroundImageUpload.jsx` (drag & drop + click)
- Crea `BackgroundImageEditor.jsx` con tutti i 6 controlli
- Crea `BackgroundImagePreview.jsx` per la mini-anteprima
- Crea `PositionGrid.jsx`
- Aggiungi la sezione all'inizio del form in `EditModal.jsx`
- Implementa il debounce sugli slider continui

**Criterio di accettazione Fase 3**: posso caricare un'immagine dalla edit modal di una slide, vederla anteprima, modificare opacità/blur/posizione/overlay, vedere l'aggiornamento live nella griglia, salvare. Posso rimuovere l'immagine con conferma. Posso sostituirla.

### Fase 4 — Export e rifiniture (2-3 ore)

- Verifica export PNG con immagine (visualmente identico all'anteprima)
- Verifica export ZIP con caroselli che hanno immagini
- Aggiungi stima dimensione nel modal di export ZIP
- Aggiungi warning quando il carosello supera 4MB in localStorage
- Test cross-template e cross-formato: 6 combinazioni (2 template × 3 formati) tutte con immagine. Nessuna deve rompersi.

**Criterio di accettazione Fase 4**: export PNG identico all'anteprima. Export ZIP funzionante. Niente regressioni su template, palette, formati, generazione AI.

---

## 14. Criteri di qualità finale (checklist)

- [ ] Il campo `background_image` è opzionale nello schema
- [ ] JSON storici (senza il campo) si caricano senza problemi
- [ ] La pipeline di processing produce JPG quality 0.85, max 1080px lato lungo
- [ ] L'upload accetta JPG, PNG e WebP (max 10MB pre-resize)
- [ ] L'errore "file troppo grande" o "formato non supportato" viene mostrato chiaramente all'utente
- [ ] Lo slider opacity da 0 a 100% funziona live
- [ ] Lo slider blur da 0 a 20px funziona live
- [ ] La 9-grid posizione cambia il `background-position` immediatamente
- [ ] Il toggle overlay abilita/disabilita i campi sotto
- [ ] I 3 tipi di overlay (scuro / chiaro / palette) producono risultati visualmente distinti
- [ ] Lo slider intensità overlay da 0 a 100% funziona live
- [ ] La mini-anteprima nell'EditModal mostra TUTTI gli effetti applicati live
- [ ] La SlideCard nella griglia mostra l'immagine con tutti gli effetti
- [ ] Il bottone "Rimuovi" chiede conferma e poi rimuove il campo dalla slide
- [ ] Il bottone "Sostituisci immagine" riapre il file picker preservando i parametri (opacità, blur, posizione, overlay)
- [ ] L'export PNG produce immagine identica all'anteprima
- [ ] L'export ZIP funziona per caroselli con immagini
- [ ] Quando il carosello supera 4MB, mostra warning non bloccante
- [ ] Niente regressioni su template, palette, formato, generazione AI
- [ ] Niente warning React in console
- [ ] Niente errori di console legati a CORS o data URL
- [ ] Funziona con tutti e 3 i formati (square, portrait, landscape)
- [ ] Funziona con entrambi i template (Editorial Mark, Bold Corner)

---

## 15. Note finali

- L'utente è uno sviluppatore senior PHP/JS. Niente over-commento del codice ovvio.
- Tutti i testi UI sono in **italiano**.
- Quando incontri ambiguità, **chiedi** prima di implementare.
- Quando finisci una fase, scrivi un breve resoconto: cosa hai costruito, cosa ti ha sorpreso, eventuali compromessi tecnici (es. performance con N>15 slide con immagini).
- Mantieni allineamento con le convenzioni del progetto: BEM, hooks pattern, no TypeScript.

---

**Ricorda**: l'immagine è una proprietà opzionale di **singola slide**, non del carosello. Il rendering è 3-layer (immagine / overlay / contenuto). I parametri sono 6: data, opacity, blur, position, overlay.enabled, overlay.type, overlay.intensity. Implementa, testa cross-template e cross-formato, valida che l'export PNG matchi l'anteprima.

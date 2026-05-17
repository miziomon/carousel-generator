# Carosello Builder — Espansione sistema font (12 font + UI rifatta)

> **Per Claude Code**: questo prompt amplia il sistema font da 2 valori hardcoded (Archivo Black, Fraunces) a 12 font scelti da Google Fonts, organizzati per ruolo, con dropdown a sezioni, live preview, compensazioni tipografiche per-font, e preset di abbinamento. Comporta una migrazione breaking del campo `slide.font` (da hardcoded a semantico). Leggi tutto, fai domande se servono, poi parti dalla Fase 1.

---

## 0. Scope esplicito

### Cosa COPRE questo prompt

- Espansione da 2 a 12 font, self-hosted, organizzati in 4 categorie (display, sans, serif, mono)
- **Migrazione breaking** del campo `slide.font`: da `"archivo" | "fraunces"` a `"primary" | "secondary"` semantici
- Migrazione retrocompatibile dei JSON storici
- Nuova UI di selezione font: dropdown a sezioni con preview di ogni font
- Toggle "mostra tutti i font" per disattivare il filtro di ruolo (B con override)
- 4-5 preset di abbinamento font ("Editorial Classic", "Tech Modern", ecc.) applicabili con un click
- Sistema di "compensazioni tipografiche per-font": ogni font può definire override di letter-spacing, line-height, font-weight rispetto al default del template
- Live preview al hover su un font nella dropdown (cambio temporaneo sulle slide)
- Aggiornamento dei template (Editorial Mark, Bold Corner) per usare i font dinamici via CSS variables

### Cosa NON copre

- Editing custom dei font (gli utenti non possono caricare font esterni)
- Personalizzazione dei pesi (ogni font ha 1-2 pesi predefiniti, non scelti dall'utente)
- Anteprima visiva del preset prima dell'applicazione (l'utente applica e vede direttamente, può fare Cmd+Z)
- Variabili come axes (opsz, slnt, wght) modificabili dall'utente — usiamo solo valori predefiniti
- Generazione automatica di pairing tramite AI
- Importazione di font dal computer dell'utente

---

## 1. Contesto e principio architetturale

L'app oggi usa 3 slot font nel theme:

```json
"fonts": {
  "primary":   "Archivo Black",
  "secondary": "Fraunces",
  "mono":      "JetBrains Mono"
}
```

E nelle slide:

```json
{ "font": "archivo" | "fraunces" }
```

Il valore `"archivo"` o `"fraunces"` è hardcoded e mappa indirettamente al theme. Questo limita il sistema: aggiungere un nuovo font significa cambiare l'enum del campo `font` in ogni slide.

**Principio guida**: il campo `font` nella slide diventa **semantico** (`primary` | `secondary`). Punta al ruolo nel theme, non al nome specifico del font. Cambiare i font del theme cambia automaticamente la resa visiva di tutte le slide che usano `"primary"` o `"secondary"`.

Questo è il pattern già usato per `palette` e `template`: nel theme stai i valori "concreti", nelle slide stanno i riferimenti "logici".

---

## 2. Modello dati

### 2.1 Lista dei 12 font

| Categoria | ID Font (Google) | Etichetta UI | Note tipografiche |
|---|---|---|---|
| **display** | `Archivo Black` | Archivo Black | ⭐ già presente, peso 900 fisso |
| **display** | `Bebas Neue` | Bebas Neue | All-caps, condensed, single-weight |
| **display** | `Anton` | Anton | Condensed, alto-contrasto, single-weight |
| **display** | `Oswald` | Oswald | Condensed, supporta lowercase, weight 700 |
| **sans** | `Inter` | Inter | Variable, screen-optimized, neutral |
| **sans** | `DM Sans` | DM Sans | Geometrico, weight 500+700 |
| **sans** | `Plus Jakarta Sans` | Plus Jakarta Sans | Moderno, weight 600+700 |
| **sans** | `Manrope` | Manrope | Variable, neutrale-rotondo |
| **serif** | `Fraunces` | Fraunces | ⭐ già presente, variable opsz+wght |
| **serif** | `Playfair Display` | Playfair Display | Alto-contrasto, weight 700 + italic |
| **serif** | `DM Serif Display` | DM Serif Display | Editoriale moderno, weight 400 |
| **serif** | `Lora` | Lora | Variable, narrativo, weight 500+700 |
| **mono** | `JetBrains Mono` | JetBrains Mono | ⭐ già presente, weight 400+600 |

I 3 font marcati ⭐ sono già installati. Nuovi da aggiungere: **10 font**.

### 2.2 Categorie ufficiali

```js
// src/lib/fonts/categories.js
export const FONT_CATEGORIES = {
  display: { label: 'Display / Heading', roles: ['primary'] },
  sans:    { label: 'Sans-serif',         roles: ['primary', 'secondary'] },
  serif:   { label: 'Serif editoriali',   roles: ['secondary'] },
  mono:    { label: 'Monospace',          roles: ['mono'] },
};
```

`roles` indica per quali slot del theme un font di quella categoria è "nativo". Lo usa il filtro UI.

### 2.3 Registry dei font

```js
// src/lib/fonts/registry.js
export const FONTS = [
  {
    id: 'Archivo Black',
    category: 'display',
    label: 'Archivo Black',
    css_family: '"Archivo Black", sans-serif',
    weights: [900],
    italic: false,
    is_variable: false,
    files: ['ArchivoBlack-Regular.woff2'],
  },
  {
    id: 'Bebas Neue',
    category: 'display',
    label: 'Bebas Neue',
    css_family: '"Bebas Neue", sans-serif',
    weights: [400],
    italic: false,
    is_variable: false,
    files: ['BebasNeue-Regular.woff2'],
    notes: 'All-caps only',
  },
  // ... 10 altri font
];

export function getFont(id) {
  return FONTS.find(f => f.id === id) ?? FONTS[0];
}

export function getFontsForRole(role) {
  return FONTS.filter(f => FONT_CATEGORIES[f.category].roles.includes(role));
}
```

### 2.4 Pesi e file da scaricare

Strategia "minimo necessario": per ogni font, scarica solo i pesi effettivamente usati dai template.

| Font | Pesi/Stili da includere | Approx. peso file |
|---|---|---|
| Archivo Black | 900 Regular | 50 KB |
| Bebas Neue | 400 Regular | 35 KB |
| Anton | 400 Regular | 45 KB |
| Oswald | 700 Bold | 50 KB |
| Inter | Variable (wght 400-900) | 110 KB |
| DM Sans | 500 + 700 | 70 KB |
| Plus Jakarta Sans | 600 + 700 | 75 KB |
| Manrope | Variable (wght 400-800) | 90 KB |
| Fraunces | Variable (opsz+wght) | 140 KB |
| Playfair Display | 700 + 700 Italic | 90 KB |
| DM Serif Display | 400 Regular | 45 KB |
| Lora | Variable (wght 400-700) | 75 KB |
| JetBrains Mono | 400 + 600 | 60 KB |

**Totale**: ~935 KB, ma caricati on-demand grazie a `font-display: block`.

### 2.5 Schema del campo `theme.fonts`

Resta identico nello shape, ma i valori ora pescano dall'enum dei 12 font:

```json
"fonts": {
  "primary":   "Archivo Black",       // ID di un font in FONTS
  "secondary": "Fraunces",
  "mono":      "JetBrains Mono"
}
```

Vincolo zod: ogni valore deve essere un id presente in `FONTS`. Fallback a un default sensato se l'id non è valido (per gestire JSON storici con font non più registrati).

### 2.6 Schema del campo `slide.font` (BREAKING CHANGE)

**PRIMA**:
```json
{ "font": "archivo" | "fraunces" }
```

**DOPO**:
```json
{ "font": "primary" | "secondary" }
```

Migrazione automatica in `migrateCarousel.js`:
- `"archivo"` → `"primary"`
- `"fraunces"` → `"secondary"`
- Qualunque altro valore o assenza → `"primary"` (fallback safe)

Schema zod aggiornato:

```js
const SlideSchema = z.object({
  // ...
  font: z.enum(['primary', 'secondary']).default('primary'),
});
```

### 2.7 Compensazioni tipografiche per-font

Sistema parallelo alle calibrazioni dei template (già esistenti per format square/portrait/landscape). Per ogni font, definiamo le **differenze rispetto al default del template**.

```js
// src/lib/fonts/compensations.js
export const FONT_COMPENSATIONS = {
  'Archivo Black': {
    // Nessuna compensazione: è il default di calibrazione
    letter_spacing: '-0.03em',
    line_height_multiplier: 1.0,
    weight: 900,
    text_transform: 'none',
  },
  'Bebas Neue': {
    letter_spacing: '0.01em',           // condensed, niente tracking negativo
    line_height_multiplier: 0.95,       // condensed, line-height più stretto
    weight: 400,                         // single-weight
    text_transform: 'uppercase',        // all-caps obbligatorio
    font_size_multiplier: 1.15,         // più piccolo otticamente, va aumentato
  },
  'Anton': {
    letter_spacing: '0.005em',
    line_height_multiplier: 0.92,
    weight: 400,
    text_transform: 'none',
    font_size_multiplier: 1.08,
  },
  'Oswald': {
    letter_spacing: '0',
    line_height_multiplier: 0.98,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 1.05,
  },
  'Inter': {
    letter_spacing: '-0.025em',
    line_height_multiplier: 1.05,       // ha più aria verticale
    weight: 800,                         // useremo il bold per gli heading
    text_transform: 'none',
    font_size_multiplier: 0.92,
  },
  'DM Sans': {
    letter_spacing: '-0.02em',
    line_height_multiplier: 1.02,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.96,
  },
  'Plus Jakarta Sans': {
    letter_spacing: '-0.025em',
    line_height_multiplier: 1.03,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.94,
  },
  'Manrope': {
    letter_spacing: '-0.02em',
    line_height_multiplier: 1.04,
    weight: 800,
    text_transform: 'none',
    font_size_multiplier: 0.94,
  },
  'Fraunces': {
    letter_spacing: '-0.02em',
    line_height_multiplier: 1.05,
    weight: 900,
    text_transform: 'none',
    font_size_multiplier: 0.97,
    font_variation_settings: '"opsz" 144',
  },
  'Playfair Display': {
    letter_spacing: '-0.015em',
    line_height_multiplier: 1.02,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.94,
  },
  'DM Serif Display': {
    letter_spacing: '-0.01em',
    line_height_multiplier: 1.0,
    weight: 400,
    text_transform: 'none',
    font_size_multiplier: 0.92,
  },
  'Lora': {
    letter_spacing: '-0.01em',
    line_height_multiplier: 1.08,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.96,
  },
  'JetBrains Mono': {
    letter_spacing: '0.18em',
    line_height_multiplier: 1.0,
    weight: 600,
    text_transform: 'uppercase',
    font_size_multiplier: 1.0,
  },
};

export function getCompensation(fontId) {
  return FONT_COMPENSATIONS[fontId] ?? FONT_COMPENSATIONS['Archivo Black'];
}
```

**Importante**: questi valori sono **stime ragionate** per partire. Vanno verificati visivamente nei test cross-formato. È normale che alcuni richiedano un piccolo tuning. Il sistema permette di farlo modificando solo `compensations.js`, senza toccare i template.

### 2.8 Preset di abbinamento font

```js
// src/lib/fonts/presets.js
export const FONT_PRESETS = [
  {
    id: 'editorial-classic',
    label: 'Editorial Classic',
    description: 'Display peso massimo + serif letterario. Per riflessioni e citazioni.',
    fonts: {
      primary: 'Archivo Black',
      secondary: 'Fraunces',
      mono: 'JetBrains Mono',
    },
  },
  {
    id: 'tech-modern',
    label: 'Tech Modern',
    description: 'Sans geometrico + serif neutrale. Per contenuti tecnici e prodotti.',
    fonts: {
      primary: 'Inter',
      secondary: 'Lora',
      mono: 'JetBrains Mono',
    },
  },
  {
    id: 'bold-statement',
    label: 'Bold Statement',
    description: 'Display condensed massimo impatto + serif drammatico. Per slogan e manifesti.',
    fonts: {
      primary: 'Bebas Neue',
      secondary: 'Playfair Display',
      mono: 'JetBrains Mono',
    },
  },
  {
    id: 'minimal-sober',
    label: 'Minimal Sober',
    description: 'Sans neutrale + serif moderno. Per business e thought leadership.',
    fonts: {
      primary: 'Plus Jakarta Sans',
      secondary: 'DM Serif Display',
      mono: 'JetBrains Mono',
    },
  },
  {
    id: 'warm-narrative',
    label: 'Warm Narrative',
    description: 'Display autorevole + serif caldo. Per storie e contenuti emozionali.',
    fonts: {
      primary: 'Anton',
      secondary: 'Lora',
      mono: 'JetBrains Mono',
    },
  },
];
```

5 preset, copertura ampia di registri editoriali. Click su un preset → dispatch `APPLY_FONT_PRESET` → applica i 3 slot in un'azione singola (Cmd+Z annulla).

---

## 3. Self-hosting dei nuovi font

### 3.1 Procedura per ogni font

Per ognuno dei 10 font nuovi:

1. Vai su [google-webfonts-helper](https://gwfh.mranftl.com/fonts) (strumento di terze parti che produce i file `.woff2` self-hosted insieme al CSS `@font-face`)
2. Cerca il font, seleziona character set "latin" + "latin-ext"
3. Seleziona solo i pesi/stili richiesti dalla tabella §2.4
4. Per i font variabili, prendi il file variable (es. `Inter[opsz,wght].woff2`)
5. Scarica i `.woff2` e li metti in `public/fonts/`
6. Copia il CSS `@font-face` generato e aggiungilo a `src/index.css`

### 3.2 Struttura cartella `public/fonts/`

```
public/fonts/
├── ArchivoBlack-Regular.woff2          # già presente
├── Anton-Regular.woff2                  # NUOVO
├── BebasNeue-Regular.woff2              # NUOVO
├── DMSans-500.woff2                     # NUOVO
├── DMSans-700.woff2                     # NUOVO
├── DMSerifDisplay-Regular.woff2         # NUOVO
├── Fraunces-VariableFont.woff2          # già presente
├── Inter-Variable.woff2                 # NUOVO
├── JetBrainsMono-400.woff2              # già presente
├── JetBrainsMono-600.woff2              # già presente
├── Lora-Variable.woff2                  # NUOVO
├── Manrope-Variable.woff2               # NUOVO
├── Oswald-700.woff2                     # NUOVO
├── PlayfairDisplay-700.woff2            # NUOVO
├── PlayfairDisplay-700-Italic.woff2     # NUOVO
└── PlusJakartaSans-600.woff2            # NUOVO
└── PlusJakartaSans-700.woff2            # NUOVO
```

### 3.3 Pattern `@font-face` da seguire

```css
/* src/index.css — aggiungi un blocco @font-face per ogni font/peso */

@font-face {
  font-family: 'Bebas Neue';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url('/fonts/BebasNeue-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;                /* variable */
  font-display: block;
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
}

/* ...analoghi per ogni font... */
```

**Importante**: `font-display: block` è critico per evitare FOUT durante l'export PNG. Lascialo così, non passare a `swap`.

### 3.4 Note pratiche

- Una volta scaricati, **non rinominare** i file in modi diversi da quelli in §3.2 (riferimenti hardcoded nei CSS @font-face)
- Per i font variabili, usare lo **stesso file** può servire sia per pesi diversi che per axes diversi (es. Fraunces usa `opsz` + `wght`)
- Per Playfair Display, c'è bisogno di 2 file separati (italic è un file dedicato, non un axes)

---

## 4. Migrazione retrocompatibile

### 4.1 Migrazione del campo `slide.font`

```js
// src/lib/migrateCarousel.js
function migrateSlideFont(slide) {
  if (slide.font === 'archivo') return { ...slide, font: 'primary' };
  if (slide.font === 'fraunces') return { ...slide, font: 'secondary' };
  if (slide.font === 'primary' || slide.font === 'secondary') return slide;
  return { ...slide, font: 'primary' };  // fallback safe
}
```

### 4.2 Migrazione del campo `theme.fonts`

```js
function migrateThemeFonts(theme) {
  const fonts = theme.fonts ?? {};
  const validIds = FONTS.map(f => f.id);

  return {
    primary:   validIds.includes(fonts.primary)   ? fonts.primary   : 'Archivo Black',
    secondary: validIds.includes(fonts.secondary) ? fonts.secondary : 'Fraunces',
    mono:      validIds.includes(fonts.mono)      ? fonts.mono      : 'JetBrains Mono',
  };
}
```

Per ogni JSON caricato:
1. Se `slide.font` è in vecchio formato, migra
2. Se `theme.fonts.X` punta a un font non più registrato, fallback al default di quella categoria

**Niente warning visivi all'utente** per le migrazioni: avvengono silenziosamente. È un caso edge.

---

## 5. Rendering: come i template usano i font

Oggi i template applicano i font come classi CSS hardcoded:

```css
.editorial__body--archivo { font-family: 'Archivo Black', sans-serif; ... }
.editorial__body--fraunces { font-family: 'Fraunces', serif; ... }
```

Va cambiato. Il template legge `theme.fonts` e `slide.font`, calcola il font ID effettivo, e passa le proprietà tramite **CSS variables inline** (lo stesso pattern già usato per palette e formati).

### 5.1 Helper di risoluzione

```js
// src/lib/fonts/resolveFont.js
import { getFont } from './registry.js';
import { getCompensation } from './compensations.js';

/**
 * Risolve il font effettivo per una slide, in base allo slot semantico.
 * Restituisce CSS variables pronte per essere applicate inline.
 *
 * @param {string} slot - 'primary' | 'secondary' | 'mono'
 * @param {object} theme - Il theme del carosello
 * @returns {object} CSS variables { '--font-family', '--font-weight', ... }
 */
export function resolveFontVars(slot, theme) {
  const fontId = theme.fonts[slot];
  const font = getFont(fontId);
  const comp = getCompensation(fontId);

  return {
    '--font-family': font.css_family,
    '--font-weight': comp.weight,
    '--font-letter-spacing': comp.letter_spacing,
    '--font-line-height-multiplier': comp.line_height_multiplier,
    '--font-size-multiplier': comp.font_size_multiplier ?? 1,
    '--font-text-transform': comp.text_transform,
    '--font-variation-settings': comp.font_variation_settings ?? 'normal',
  };
}
```

### 5.2 Pattern di applicazione nel template

```jsx
// EditorialStandardSlide.jsx (parametrizzato)
import { resolveFontVars } from '@/lib/fonts/resolveFont.js';

export function EditorialStandardSlide({ slide, theme, total }) {
  const calib = EDITORIAL_CALIBRATIONS[theme.format];
  const bodyCalib = calib.body_by_size[slide.size] ?? calib.body_by_size.md;
  const fontVars = resolveFontVars(slide.font, theme);

  // Calcolo del font-size finale considerando il moltiplicatore
  const finalFontSize = bodyCalib.size * (fontVars['--font-size-multiplier']);
  const finalLineHeight = bodyCalib.line_height * (fontVars['--font-line-height-multiplier']);

  return (
    <div
      className="editorial"
      style={{
        '--editorial-padding': calib.padding,
        '--editorial-body-size': `${finalFontSize}px`,
        '--editorial-body-line-height': finalLineHeight,
        ...fontVars,  // tutte le var del font
      }}
    >
      {/* ... */}
      <div className="editorial__body">
        {parsedLines}
      </div>
    </div>
  );
}
```

E nel CSS:

```css
.editorial__body {
  font-family: var(--font-family);
  font-weight: var(--font-weight);
  letter-spacing: var(--font-letter-spacing);
  font-size: var(--editorial-body-size);
  line-height: var(--editorial-body-line-height);
  text-transform: var(--font-text-transform, none);
  font-variation-settings: var(--font-variation-settings, normal);
}
```

### 5.3 Cleanup delle classi hardcoded

Rimuovi tutte le classi tipo `.editorial__body--archivo`, `.bold__body--fraunces`, ecc. Sono sostituite dal pattern variabili. Cerca con `grep` riferimenti a "archivo" e "fraunces" negli CSS dei template e nei JSX, e rimpiazzali.

### 5.4 Casi speciali

- **`mono` slot**: usato per kicker, footer, numerazione. Il `text-transform: uppercase` di JetBrains Mono è già nel comp. Niente cambia.
- **Fraunces variabile**: il `font-variation-settings` con `"opsz" 144` è applicato sempre per Fraunces. Massimizza il contrasto a grandi dimensioni. Va testato visivamente.
- **Inter variabile**: usiamo `wght 800` come "bold for headings". Il file variable supporta 100-900, ma noi mappiamo solo a 800 per uniformità.

---

## 6. UI: nuova sezione "Fonts" nella sidebar Tema

Sostituisce l'attuale sezione fonts (probabilmente input testo o dropdown semplici).

### 6.1 Layout

```
┌────────────────────────────────────────┐
│ ▼ FONTS                                │
├────────────────────────────────────────┤
│                                        │
│  Preset di abbinamento                 │
│  ┌────────────────────────────────┐    │
│  │ Editorial Classic            ▼ │    │
│  └────────────────────────────────┘    │
│                                        │
│  ──────────────────────────────────    │
│                                        │
│  Primary (display/heading)             │
│  ┌────────────────────────────────┐    │
│  │ 𝗔𝗿𝗰𝗵𝗶𝘃𝗼 𝗕𝗹𝗮𝗰𝗸               ▼ │    │
│  └────────────────────────────────┘    │
│                                        │
│  Secondary (corsivo/citazione)         │
│  ┌────────────────────────────────┐    │
│  │ 𝐹𝓇𝒶𝓊𝓃𝒸𝑒𝓈                     ▼ │    │
│  └────────────────────────────────┘    │
│                                        │
│  Mono (numerazione/kicker)             │
│  ┌────────────────────────────────┐    │
│  │ JetBrains Mono                ▼ │    │
│  └────────────────────────────────┘    │
│                                        │
│  ☐ Mostra tutti i font (anche fuori    │
│    ruolo)                              │
│                                        │
└────────────────────────────────────────┘
```

### 6.2 Selettore di preset

In alto, dropdown semplice con i 5 preset. Selezionando un preset:
1. Dispatch `APPLY_FONT_PRESET` con `presetId`
2. I 3 slot del theme si aggiornano in una sola azione (atomica per Cmd+Z)
3. Le 3 dropdown sotto si aggiornano per riflettere i nuovi valori
4. Toast "Preset 'Editorial Classic' applicato"

### 6.3 Selettore singolo font (per ogni slot)

Componente `FontDropdown.jsx`. Pattern:

```
┌────────────────────────────────────────┐
│ 𝗔𝗿𝗰𝗵𝗶𝘃𝗼 𝗕𝗹𝗮𝗰𝗸                       ▼ │
└────────────────────────────────────────┘
       ↓ click apre
┌────────────────────────────────────────┐
│ ─── DISPLAY / HEADING ───              │
│   𝗔𝗿𝗰𝗵𝗶𝘃𝗼 𝗕𝗹𝗮𝗰𝗸                  ✓    │
│   𝐁𝐄𝐁𝐀𝐒 𝐍𝐄𝐔𝐄                         │
│   𝐀𝐧𝐭𝐨𝐧                              │
│   𝐎𝐬𝐰𝐚𝐥𝐝                             │
│                                        │
│ ─── SANS-SERIF ───                     │
│   Inter                                │
│   DM Sans                              │
│   Plus Jakarta Sans                    │
│   Manrope                              │
│                                        │
│ ─── SERIF ───                          │
│   𝐹𝓇𝒶𝓊𝓃𝒸𝑒𝓈                          │
│   𝐏𝐥𝐚𝐲𝐟𝐚𝐢𝐫 𝐃𝐢𝐬𝐩𝐥𝐚𝐲                  │
│   𝐃𝐌 𝐒𝐞𝐫𝐢𝐟 𝐃𝐢𝐬𝐩𝐥𝐚𝐲                   │
│   Lora                                 │
│                                        │
│ ⚠ Font non nativo del ruolo            │
└────────────────────────────────────────┘
```

Specifiche dettagliate:

- Ogni opzione mostra il **nome del font renderizzato nel font stesso** (es. "Bebas Neue" scritto in Bebas Neue). Pattern Figma/Canva.
- Le sezioni hanno **header in caps** con linee divisorie (`─── DISPLAY ───`).
- Il font correntemente selezionato ha checkmark a destra.
- Quando il filtro "Mostra tutti" è OFF (default), il dropdown del slot mostra **solo i font con `roles.includes(slot)`**:
  - Primary: display + sans
  - Secondary: sans + serif
  - Mono: mono (uno solo, in pratica)
- Quando "Mostra tutti" è ON, il dropdown mostra tutti i 12 font, e i font fuori ruolo hanno un **piccolo badge ⚠** accanto al nome.
- In fondo al dropdown, quando ci sono font fuori ruolo visibili, un piccolo testo informativo:
  > "⚠ Font non nativo del ruolo"

### 6.4 Live preview al hover

Quando l'utente passa il mouse sopra un'opzione del dropdown (senza ancora cliccare):
1. Dispatch temporaneo `PREVIEW_FONT_CHANGE` con `{ slot, fontId }` (NON in history, NON aggiunge a undo)
2. Lo store applica temporaneamente quel font allo slot indicato
3. Le slide nella griglia si re-renderizzano con il font temporaneo

Quando il mouse esce dall'opzione o il dropdown si chiude:
1. Dispatch `CLEAR_FONT_PREVIEW`
2. Lo store ripristina lo stato originale

Click su un'opzione:
1. Dispatch `APPLY_FONT` (questo SÌ in history)
2. Il font diventa quello scelto

Pattern UX: live feedback senza commit, fino al click. **Niente debounce** al hover: l'utente deve vedere il cambio istantaneo.

### 6.5 Toggle "Mostra tutti i font"

Checkbox sotto i 3 selettori. Stato persistito in `useUiPreferences` (chiave `carosello.ui-preferences`):

```js
{
  // ... altri campi esistenti
  fontShowAll: false,
}
```

Default: `false` (filtro attivo). Quando l'utente attiva il toggle, è una preferenza UI che dura tra sessioni (come l'apertura della sidebar).

### 6.6 Caricamento lazy dei preview

Non tutti i font sono caricati al boot dell'app — sarebbe spreco. Sono caricati nelle slide solo se usati. Ma il dropdown deve mostrarli al primo apertura.

**Strategia**: quando l'utente apre per la prima volta un `FontDropdown`:
1. Itera sui 12 font
2. Per ognuno non ancora caricato, crea un elemento `<link rel="preload" as="font">` invisibile
3. Aspetta `document.fonts.load(...)` per i font in lista
4. Renderizza il dropdown

Implementazione:

```js
// src/lib/fonts/preload.js
let preloadStarted = false;

export async function preloadAllFonts() {
  if (preloadStarted) return;
  preloadStarted = true;

  const promises = FONTS.map(font => {
    const family = font.id;
    return document.fonts.load(`16px "${family}"`);
  });

  await Promise.all(promises);
}
```

E nel componente:

```jsx
const [fontsReady, setFontsReady] = useState(false);

useEffect(() => {
  if (isOpen && !fontsReady) {
    preloadAllFonts().then(() => setFontsReady(true));
  }
}, [isOpen]);
```

Mentre i font caricano, mostra un piccolo spinner nel dropdown.

---

## 7. Azioni del reducer

### 7.1 Nuove azioni

```js
case 'APPLY_FONT': {
  const { slot, fontId } = action.payload;
  return pushHistory(state, {
    ...state,
    carousel: {
      ...state.carousel,
      theme: {
        ...state.carousel.theme,
        fonts: {
          ...state.carousel.theme.fonts,
          [slot]: fontId,
        },
      },
    },
  });
}

case 'APPLY_FONT_PRESET': {
  const { presetId } = action.payload;
  const preset = FONT_PRESETS.find(p => p.id === presetId);
  if (!preset) return state;

  return pushHistory(state, {
    ...state,
    carousel: {
      ...state.carousel,
      theme: {
        ...state.carousel.theme,
        fonts: { ...preset.fonts },
      },
    },
  });
}

case 'PREVIEW_FONT_CHANGE': {
  // NON in history, NON modifica carousel definitivamente
  // Modifica solo lo stato "preview" che il SlideRenderer consulta prima del theme reale
  return {
    ...state,
    fontPreview: action.payload,  // { slot, fontId }
  };
}

case 'CLEAR_FONT_PREVIEW': {
  return {
    ...state,
    fontPreview: null,
  };
}
```

### 7.2 Stato preview nel renderer

Il `SlideRenderer` legge da `state.fontPreview` se presente, altrimenti dal theme:

```js
function effectiveFonts(theme, fontPreview) {
  if (!fontPreview) return theme.fonts;
  return { ...theme.fonts, [fontPreview.slot]: fontPreview.fontId };
}
```

Tutto il resto del rendering passa per `resolveFontVars` con i font "effettivi".

---

## 8. Struttura file da aggiungere/modificare

```
public/
├── fonts/                                      # 10 nuovi .woff2
│
src/
├── lib/
│   ├── fonts/                                  # NUOVO MODULO
│   │   ├── registry.js                         # Lista 12 font
│   │   ├── categories.js                       # Categorie + ruoli
│   │   ├── compensations.js                    # Compensazioni per-font
│   │   ├── presets.js                          # 5 preset di pairing
│   │   ├── resolveFont.js                      # Helper CSS variables
│   │   └── preload.js                          # Lazy load all fonts
│   │
│   └── migrateCarousel.js                      # AGGIORNATO: migra slide.font + theme.fonts
│
├── components/
│   ├── theme-sidebar/
│   │   └── sections/
│   │       ├── FontsSection.jsx                # AGGIORNATO completamente
│   │       ├── FontPresetSelector.jsx          # NUOVO
│   │       └── FontDropdown.jsx                # NUOVO
│   │
│   └── theme-sidebar/sections/fonts/fonts-section.css   # AGGIORNATO
│
├── slide-renderer/
│   └── templates/
│       ├── editorial-mark/
│       │   ├── EditorialStandardSlide.jsx       # AGGIORNATO: usa resolveFontVars
│       │   ├── EditorialCoverSlide.jsx          # AGGIORNATO
│       │   ├── EditorialDividerSlide.jsx        # AGGIORNATO
│       │   ├── EditorialCtaSlide.jsx            # AGGIORNATO
│       │   └── editorial-mark.css               # AGGIORNATO: rimuove classi --archivo --fraunces
│       │
│       └── bold-corner/
│           └── ... (analoghi aggiornamenti)
│
├── hooks/
│   └── useUiPreferences.js                     # AGGIORNATO: aggiunge fontShowAll
│
└── index.css                                    # AGGIORNATO: @font-face per i 10 nuovi font
```

---

## 9. Convenzioni BEM specifiche

```
.fonts-section
.fonts-section__preset-row
.fonts-section__slot-row
.fonts-section__slot-label
.fonts-section__toggle-all

.font-dropdown
.font-dropdown__trigger
.font-dropdown__trigger-label
.font-dropdown__trigger-chevron
.font-dropdown__menu
.font-dropdown__category-header
.font-dropdown__option
.font-dropdown__option--active
.font-dropdown__option--non-native
.font-dropdown__option-label
.font-dropdown__option-check
.font-dropdown__option-badge
.font-dropdown__footer-warning

.font-preset-selector
.font-preset-selector__trigger
.font-preset-selector__menu
.font-preset-selector__option
.font-preset-selector__option-title
.font-preset-selector__option-description
```

---

## 10. Anti-pattern da evitare

- ❌ **Non** lasciare classi CSS hardcoded `.editorial__body--archivo` o `.bold__body--fraunces`. Pulisci.
- ❌ **Non** caricare tutti i 12 font al boot dell'app. Lazy load tramite `preloadAllFonts` quando un dropdown si apre.
- ❌ **Non** persistere il `fontPreview` in localStorage. È volatile.
- ❌ **Non** mettere `fontPreview` in history (undo/redo). Solo il commit definitivo va in history.
- ❌ **Non** consentire al `mono` slot di ricevere font non-mono dal preset (i preset hanno sempre `mono: 'JetBrains Mono'`).
- ❌ **Non** chiamare le compensazioni "calibrazioni" — sono concetti distinti: le calibrazioni dipendono dal formato e dal template, le compensazioni dipendono dal font. Tienili separati architetturalmente.
- ❌ **Non** modificare il numero o struttura delle compensazioni "a buon senso". I valori in §2.7 sono stime iniziali e vanno testati visivamente, ma rispettano un pattern preciso.
- ❌ **Non** rendere editabili le compensazioni dall'utente. Sono dati di sistema.
- ❌ **Non** assumere che tutti i font abbiano `font-variation-settings`. Solo quelli variabili. Usa fallback `'normal'`.
- ❌ **Non** mostrare il filtro "fuori ruolo" come errore. È un warning informativo, non un blocco.
- ❌ **Non** modificare lo schema JSON dei caroselli storici se hanno `theme.fonts` con valori a stringa che corrispondono già a `FONTS[].id`. Solo migra se non corrispondono.
- ❌ **Non** dimenticare di aggiornare il system prompt AI per riflettere i nuovi valori di `slide.font` (`primary`/`secondary` invece di `archivo`/`fraunces`). Lo trovi in `src/lib/ai/systemPrompt.js`. Aggiornalo con i nuovi valori semantici.

---

## 11. Workflow consigliato (a fasi)

### Fase 1 — Setup font self-hosted (2-3 ore)

- Scarica i 10 nuovi font da google-webfonts-helper con i pesi richiesti
- Mettili in `public/fonts/`
- Aggiungi i `@font-face` in `src/index.css`
- Crea `src/lib/fonts/registry.js`, `categories.js`, `compensations.js`, `presets.js`
- Crea `resolveFont.js` e `preload.js`

**Criterio di accettazione Fase 1**: posso ispezionare la pagina e vedere che i font sono dichiarati. Posso caricarli dalla console con `document.fonts.load('16px "Bebas Neue"').then(...)` e funziona.

### Fase 2 — Migrazione modello dati + rendering (3-4 ore)

- Aggiorna `migrateCarousel.js` per migrare `slide.font` e `theme.fonts`
- Aggiorna `schema.js` con i nuovi enum
- Refactoring dei 4 componenti di Editorial Mark per usare `resolveFontVars`
- Aggiorna `editorial-mark.css` rimuovendo classi `--archivo` e `--fraunces`, usando solo CSS vars
- Stesso lavoro per Bold Corner
- Aggiorna il system prompt AI con i nuovi valori semantici

**Criterio di accettazione Fase 2**: i caroselli storici si caricano e renderizzano correttamente. Le slide con `"font": "primary"` mostrano il font corretto da `theme.fonts.primary`. Niente classi `--archivo` rimaste nel codice.

### Fase 3 — UI sidebar (4-5 ore)

- Crea `FontDropdown.jsx` con categorie, preview, selezione
- Crea `FontPresetSelector.jsx`
- Aggiorna `FontsSection.jsx` con il nuovo layout
- Aggiungi `fontShowAll` a `useUiPreferences`
- Implementa lazy preload dei font all'apertura del dropdown
- Implementa il toggle "Mostra tutti i font"

**Criterio di accettazione Fase 3**: posso aprire la sezione Fonts nella sidebar, vedere le 3 dropdown, selezionare un font per ognuna. Posso applicare un preset e vedere i 3 slot aggiornati insieme. Il toggle "Mostra tutti" funziona.

### Fase 4 — Live preview hover (2-3 ore)

- Aggiungi `fontPreview` allo stato (fuori history)
- Aggiorna `SlideRenderer` per leggere preview se presente
- Aggiungi azioni `PREVIEW_FONT_CHANGE` e `CLEAR_FONT_PREVIEW`
- Wire del hover nel `FontDropdown`

**Criterio di accettazione Fase 4**: passando il mouse sopra un'opzione del dropdown, le slide si aggiornano in real-time. Uscendo dall'opzione o chiudendo il dropdown, torna al font originale. Click commetta definitivamente.

### Fase 5 — Test cross-tutto + cleanup (2-3 ore)

- Test ogni font in ognuno dei 3 formati (square, portrait, landscape)
- Test ogni font in entrambi i template (Editorial Mark, Bold Corner)
- Test export PNG, ZIP, PDF con font diversi (specialmente i nuovi)
- Verifica visiva delle compensazioni: alcuni font potrebbero richiedere tuning
- Rimuovi codice morto (classi CSS `--archivo`, `--fraunces` legacy)
- Verifica che `font-display: block` impedisca FOUT nell'export PNG

**Criterio di accettazione Fase 5**: posso usare qualunque combinazione di 12 font in qualunque combinazione di template/formato, e l'export è visivamente perfetto. Niente regressioni su salvataggio DB, generazione AI, sidebar tema, immagini di sfondo.

---

## 12. Criteri di qualità finale (checklist)

- [ ] I 12 font sono dichiarati in `index.css` con `@font-face` self-hosted
- [ ] Il registry `FONTS` contiene tutti i 12 font con metadata corretta
- [ ] Le compensazioni sono presenti per tutti i 12 font
- [ ] I 5 preset sono applicabili e funzionanti
- [ ] Il campo `slide.font` accetta solo `"primary"` o `"secondary"` (con zod)
- [ ] I JSON storici con `"font": "archivo"` si caricano migrati a `"primary"`
- [ ] I JSON storici con `"font": "fraunces"` si caricano migrati a `"secondary"`
- [ ] Theme con font non più registrati si caricano con fallback ai default
- [ ] La sidebar Fonts mostra 3 dropdown + 1 preset + 1 toggle
- [ ] Cliccando un preset, i 3 slot si aggiornano in una sola azione (un solo Cmd+Z annulla)
- [ ] I dropdown mostrano i font raggruppati per categoria
- [ ] Ogni opzione del dropdown è renderizzata nel font stesso (preview)
- [ ] Il toggle "Mostra tutti i font" funziona e persiste tra sessioni
- [ ] I font fuori ruolo (con toggle on) hanno badge ⚠
- [ ] Hover su un'opzione mostra live preview sulle slide
- [ ] Uscire dall'opzione o chiudere il dropdown annulla la preview
- [ ] Click commette definitivamente il font selezionato
- [ ] Le compensazioni vengono applicate correttamente (visual check)
- [ ] Niente classi CSS `--archivo` o `--fraunces` rimaste nel codice
- [ ] System prompt AI aggiornato con `"primary"`/`"secondary"`
- [ ] Export PNG/ZIP/PDF funzionano con tutti i nuovi font
- [ ] Niente FOUT visibile nell'export PNG (verificare con `font-display: block`)
- [ ] Niente warning React in console
- [ ] Niente regressioni su template, palette, formati, immagini di sfondo, salvataggio DB

---

## 13. Note finali

- L'utente è uno sviluppatore senior. Niente over-commento del codice ovvio.
- Tutti i testi UI sono in **italiano**.
- Quando incontri ambiguità (specialmente nelle compensazioni se un font sembra sbagliato), **chiedi** prima di modificare i numeri.
- Al termine, scrivi un breve resoconto: cosa hai costruito, eventuali compensazioni che hai dovuto modificare rispetto al prompt (con motivazione visiva), eventuali quirks di font (es. Bebas Neue che renderizza solo all-caps anche se il `text-transform` non è settato).
- Mantieni allineamento con le convenzioni del progetto: BEM, hooks pattern, no TypeScript.

---

**Ricorda**: questo è un upgrade del sistema font con ramificazioni in vari posti. Il principio guida è "il font è dato, non codice". Aggiungere un 13° font in futuro deve essere: 1 entry nel registry + 1 file `.woff2` + 1 `@font-face` + 1 entry nelle compensazioni. Niente codice template da toccare.

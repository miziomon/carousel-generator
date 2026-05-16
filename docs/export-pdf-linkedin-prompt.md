# Carosello Builder — Export PDF per LinkedIn

> **Per Claude Code**: questo prompt aggiunge un terzo formato di export — PDF multi-pagina — per consentire la pubblicazione dei caroselli su LinkedIn (che non supporta caroselli-immagini come Instagram ma richiede un singolo PDF). Riusa al 100% il rendering PNG esistente: niente nuovo template, niente nuovo schema dati, niente nuovo sistema di rendering. Solo un wrapper PDF attorno alle PNG già generate. Leggi tutto, fai domande se servono, poi parti dalla Fase 1.

---

## 0. Scope esplicito

### Cosa COPRE questo prompt

- Generazione di un PDF multi-pagina che contiene tutte le slide del carosello come PNG embedded
- Nuovo bottone "Esporta PDF" accanto agli esistenti "Esporta PNG" / "Esporta ZIP"
- Compressione fissa quality 0.85 per le PNG embedded nel PDF
- Warning specifico se il formato attivo è landscape (sconsigliato per LinkedIn)
- Naming del file `{titolo-carosello}-linkedin.pdf`
- Metadata PDF embedded (titolo, autore)
- Modal di progress durante l'export multi-pagina

### Cosa NON copre

- Modifiche al rendering delle slide (resta tutto identico, si riusa l'export PNG esistente)
- Versione vettoriale del PDF (testo selezionabile, link cliccabili): è esplicitamente fuori scope come da decisione precedente
- Pulsante "Esporta per IG + LinkedIn insieme" (uno ZIP con PNG + PDF): rimandato a una versione futura
- Hint sul numero di slide consigliato per LinkedIn (7-10): esplicitamente escluso
- Suggerimenti per ridurre il file size sotto i 10MB: il backend LinkedIn accetta fino a 100MB, vale la pena solo a posteriori
- Anteprima del PDF prima del download: nessun viewer interno, il download è diretto

---

## 1. Contesto e principio architetturale

L'app oggi ha due bottoni di export:
- `[Esporta PNG]` su ogni `SlideCard` → genera una singola PNG e la scarica
- `[Esporta ZIP]` nell'header → genera tutte le PNG + il JSON, le impacchetta in uno ZIP

Aggiungiamo un terzo bottone:
- `[Esporta PDF]` nell'header → genera tutte le PNG (una per slide) e le impacchetta in un PDF multi-pagina

**Principio di riuso**: la pipeline di rendering PNG esistente NON viene toccata. La nuova funzione `exportCarouselAsPdf` chiama internamente la stessa logica di `htmlToImage.toPng` slide per slide, e poi usa `jsPDF` per impacchettare il risultato.

Questo garantisce:
- Output visivamente identico tra PNG, ZIP e PDF (è lo stesso rendering sotto)
- Manutenzione semplificata: una modifica al rendering propaga automaticamente a tutti gli export
- Zero refactoring del codice esistente

---

## 2. Specifica tecnica della pipeline

### 2.1 Pseudocodice

```js
async function exportCarouselAsPdf(carousel, theme) {
  const format = getFormat(theme.format);  // { width, height }
  const { width, height } = format;

  // Creazione PDF con pagine = dimensioni native delle slide
  const pdf = new jsPDF({
    unit: 'px',
    format: [width, height],
    orientation: width > height ? 'landscape' : 'portrait',
    hotfixes: ['px_scaling'],  // fix noto per dimensioni precise in px
  });

  // Metadata embedded
  pdf.setProperties({
    title: carousel.title ?? 'Carosello',
    author: theme.footer?.name ?? '',
    subject: carousel._ai_generation?.input_summary ?? '',
    creator: 'Carosello Builder',
  });

  for (let i = 0; i < carousel.slides.length; i++) {
    // Render slide come PNG (RIUSO della funzione esistente)
    const pngDataUrl = await renderSlideAsPng(carousel.slides[i], theme, {
      pixelRatio: 1,           // niente 2x retina per il PDF (riduce peso)
      quality: 0.85,           // compressione fissa
    });

    // Aggiunge pagina (la prima è già pronta, le successive vanno create)
    if (i > 0) {
      pdf.addPage([width, height], width > height ? 'landscape' : 'portrait');
    }

    // Inserisce PNG come immagine a piena pagina
    pdf.addImage(pngDataUrl, 'JPEG', 0, 0, width, height, undefined, 'FAST');
    // ↑ 'JPEG' come format anche se è PNG: jsPDF accetta entrambi, e il
    //   compression 'FAST' produce file più piccoli con buona qualità.

    onProgress?.(i + 1, carousel.slides.length);
  }

  // Output blob + download
  const blob = pdf.output('blob');
  const filename = buildFilename(carousel);
  saveAs(blob, filename);
}
```

### 2.2 Nota su `quality` 0.85 e `pixelRatio` 1

Decisione di design:
- Il rendering PNG attuale per l'export ZIP usa `pixelRatio: 2` (retina). Per il PDF usiamo `pixelRatio: 1` perché il PDF è già "vettoriale-friendly" sui visualizzatori (zoom senza pixelazione del container), e ridurre il pixel ratio dimezza il peso file.
- `quality: 0.85` è un compromesso fisso (come da decisione utente). Non implementare compressione adattiva.

Risultato atteso: un carosello da 14 slide in formato portrait pesa ~3-5MB in PDF, ben sotto i limiti LinkedIn.

### 2.3 Rendering off-screen identico all'export PNG

Riusa l'infrastruttura esistente di rendering off-screen (il nodo nascosto in `position: absolute; left: -99999px`). Per ogni slide:

1. Monta il `SlideRenderer` nel nodo off-screen con la slide corrente
2. `await document.fonts.ready` (essenziale per evitare FOUT)
3. `htmlToImage.toPng(node, options)` → data URL
4. Smonta il componente

Tutto questo è già implementato per l'export ZIP. La nuova funzione PDF usa **la stessa esatta funzione**, non duplica il pattern.

### 2.4 Naming del file

```js
function buildFilename(carousel) {
  const baseName = carousel.title?.trim() || 'carosello';
  const safe = slugify(baseName);  // es. "pensieri-in-pillole-02"
  return `${safe}-linkedin.pdf`;
}
```

Helper `slugify`:

```js
// src/lib/utils/slugify.js
export function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // rimuovi accenti
    .replace(/[^a-z0-9\s-]/g, '')                       // solo alfanumerici e spazi
    .trim()
    .replace(/\s+/g, '-')                               // spazi → dash
    .replace(/-+/g, '-')                                // dash multipli → singolo
    .slice(0, 80);                                       // max 80 char
}
```

Lo stesso `slugify` può essere riusato per `Esporta ZIP` se non lo è già. Se lo è già da altra parte, importa quello esistente.

---

## 3. Dipendenze da aggiungere

```bash
npm install jspdf
```

`jspdf` è ~150KB minified gzipped. Lazy load opzionale se vuoi ridurre l'initial bundle: importa dinamicamente solo quando l'utente clicca "Esporta PDF":

```js
async function exportCarouselAsPdf(...) {
  const { jsPDF } = await import('jspdf');
  // ...
}
```

Suggerito sì, perché un utente che non esporta mai PDF non scarica i 150KB.

`file-saver` (per `saveAs`) è probabilmente già nelle dipendenze per l'export ZIP. Riusalo.

---

## 4. UI: nuovo bottone "Esporta PDF"

### 4.1 Posizione

Nell'header dell'app, accanto agli esistenti `[Esporta PNG]` (se presente in header) / `[Esporta ZIP]`.

Layout target:

```
┌───────────────────────────────────────────────────────────────┐
│ Logo  Progetto  [...]  [⬇ ZIP]  [⬇ PDF]  [↶][↷]  [👤 User]    │
└───────────────────────────────────────────────────────────────┘
```

Etichetta semantica: il bottone si chiama "Esporta PDF" con icona Lucide `FileText` (per distinguerlo da `Download` / `Archive` usati altrove).

### 4.2 Comportamento del bottone

| Stato | Comportamento |
|---|---|
| Idle (default) | Bottone enabled. Tooltip al hover: "Esporta come PDF per LinkedIn" |
| Disabled | Disabled se `carousel.slides.length === 0`. Tooltip: "Nessuna slide da esportare" |
| Format = landscape | Bottone enabled, ma con piccolo badge ⚠ giallo. Click apre dialog warning (vedi §4.4) |
| Loading (in corso) | Spinner inline + testo "Generazione PDF... (3/14)". Bottone disabled |

### 4.3 BEM class names

```
.export-pdf-btn
.export-pdf-btn__icon
.export-pdf-btn__label
.export-pdf-btn__warning-badge
.export-pdf-btn--loading
```

### 4.4 Dialog di warning per landscape

Se `theme.format === 'landscape'`, il click sul bottone NON parte direttamente l'export. Apre un dialog di conferma:

```
┌────────────────────────────────────────────────────────────┐
│ ⚠ Formato landscape sconsigliato per LinkedIn        [X]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Hai selezionato il formato landscape (1.91:1).            │
│  Su LinkedIn i documenti landscape si visualizzano         │
│  molto piccoli nel feed mobile e perdono visibilità.       │
│                                                            │
│  Per LinkedIn ti consigliamo:                              │
│  • Portrait (1080×1350) — massimo engagement               │
│  • Square (1080×1080) — buon compromesso                   │
│                                                            │
│  Vuoi procedere comunque?                                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│        [Annulla]    [Procedi con landscape]                │
└────────────────────────────────────────────────────────────┘
```

- "Annulla" o `Esc` o `[X]` → chiude il dialog senza azione
- "Procedi con landscape" → chiude il dialog e parte l'export PDF normalmente
- Niente checkbox "non mostrare più questo avviso" (per ora — pattern semplice)

Componente: `ExportPdfLandscapeWarning.jsx`.

### 4.5 Modal di progress

Durante l'export, mostra un modale di progress (riusa il pattern del modale di progress dell'export ZIP, se esiste).

```
┌────────────────────────────────────────────────────────────┐
│ Esportazione PDF in corso                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Generazione slide 7 di 14...                              │
│  ████████████░░░░░░░░░░░░░░░░░  50%                        │
│                                                            │
│  Dimensione stimata: ~3.2 MB                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Note:
- Non chiudibile durante l'export (niente [X])
- Mostra il numero corrente di slide elaborate
- Mostra una progress bar
- "Dimensione stimata" è opzionale: calcola la dimensione cumulativa dei data URL PNG già generati e moltiplica per il rapporto stimato (è approssimativo, va bene così)
- Al termine: chiude automaticamente e parte il download del PDF
- Se errore: modale resta aperto, mostra messaggio errore + bottone "Chiudi"

Componente: `ExportPdfProgressModal.jsx`.

---

## 5. Pipeline tecnica completa

### 5.1 Struttura cartelle aggiunte

```
src/
├── lib/
│   ├── export/
│   │   ├── exportPng.js                    # ESISTE GIÀ — non toccare
│   │   ├── exportZip.js                    # ESISTE GIÀ — non toccare
│   │   ├── exportPdf.js                    # NUOVO
│   │   └── renderSlideAsPng.js             # se non c'è già, estraine la funzione comune
│   └── utils/
│       └── slugify.js                      # NUOVO (se non esiste già)
│
└── components/
    └── header/
        ├── ExportPdfButton.jsx              # NUOVO
        ├── ExportPdfLandscapeWarning.jsx    # NUOVO
        ├── ExportPdfProgressModal.jsx       # NUOVO
        └── header.css                       # AGGIORNATO con .export-pdf-btn
```

### 5.2 Refactoring suggerito (se necessario)

Se la funzione di "rendering slide a PNG" è oggi inline dentro `exportPng.js` o `exportZip.js`, estraila in un modulo condiviso `renderSlideAsPng.js`:

```js
// src/lib/export/renderSlideAsPng.js

/**
 * Renderizza una singola slide come PNG data URL.
 * Funzione condivisa tra tutti gli export (single PNG, ZIP, PDF).
 *
 * @param {object} slide
 * @param {object} theme
 * @param {object} options
 * @param {number} options.pixelRatio   - 1 per PDF, 2 per PNG/ZIP retina
 * @param {number} options.quality      - 0.0-1.0 per JPEG-like (PNG ignora ma jsPDF la usa)
 * @returns {Promise<string>} Data URL PNG
 */
export async function renderSlideAsPng(slide, theme, options = {}) {
  // Implementazione esistente o estratta da exportPng/exportZip
  // ...
}
```

Se invece il codice è già strutturato così, riusalo senza modifiche.

### 5.3 `exportPdf.js`

```js
// src/lib/export/exportPdf.js
import { saveAs } from 'file-saver';
import { renderSlideAsPng } from './renderSlideAsPng.js';
import { getFormat } from '@/lib/formats/registry.js';
import { slugify } from '@/lib/utils/slugify.js';

/**
 * Esporta il carosello come PDF multi-pagina per LinkedIn.
 *
 * @param {object} carousel    - Il carosello corrente
 * @param {object} theme       - Il theme (per format e palette)
 * @param {Function} onProgress - Callback (current, total) => void
 * @returns {Promise<{ filename: string, sizeBytes: number }>}
 */
export async function exportCarouselAsPdf(carousel, theme, onProgress) {
  // Lazy import per ridurre l'initial bundle
  const { jsPDF } = await import('jspdf');

  const format = getFormat(theme.format);
  const { width, height } = format;
  const orientation = width > height ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    unit: 'px',
    format: [width, height],
    orientation,
    hotfixes: ['px_scaling'],
  });

  pdf.setProperties({
    title: carousel.title ?? 'Carosello',
    author: theme.footer?.name ?? '',
    subject: carousel._ai_generation?.input_summary ?? '',
    creator: 'Carosello Builder',
  });

  for (let i = 0; i < carousel.slides.length; i++) {
    const pngDataUrl = await renderSlideAsPng(carousel.slides[i], theme, {
      pixelRatio: 1,
      quality: 0.85,
    });

    if (i > 0) {
      pdf.addPage([width, height], orientation);
    }
    pdf.addImage(pngDataUrl, 'JPEG', 0, 0, width, height, undefined, 'FAST');

    onProgress?.(i + 1, carousel.slides.length);
  }

  const blob = pdf.output('blob');
  const filename = `${slugify(carousel.title || 'carosello')}-linkedin.pdf`;
  saveAs(blob, filename);

  return {
    filename,
    sizeBytes: blob.size,
  };
}
```

### 5.4 `ExportPdfButton.jsx`

```jsx
// pseudocodice — adattare al pattern esistente del progetto
import { useState } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { exportCarouselAsPdf } from '@/lib/export/exportPdf.js';
import { ExportPdfLandscapeWarning } from './ExportPdfLandscapeWarning.jsx';
import { ExportPdfProgressModal } from './ExportPdfProgressModal.jsx';

export function ExportPdfButton({ carousel, theme }) {
  const [showLandscapeWarning, setShowLandscapeWarning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const isLandscape = theme.format === 'landscape';
  const isDisabled = !carousel.slides?.length || isExporting;

  const handleClick = () => {
    if (isDisabled) return;
    if (isLandscape) {
      setShowLandscapeWarning(true);
    } else {
      startExport();
    }
  };

  const startExport = async () => {
    setIsExporting(true);
    setError(null);
    setProgress({ current: 0, total: carousel.slides.length });

    try {
      await exportCarouselAsPdf(carousel, theme, (current, total) => {
        setProgress({ current, total });
      });
    } catch (err) {
      setError(err.message ?? 'Errore durante la generazione del PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        className="export-pdf-btn"
        onClick={handleClick}
        disabled={isDisabled}
        title="Esporta come PDF per LinkedIn"
      >
        <FileText className="export-pdf-btn__icon" />
        <span className="export-pdf-btn__label">Esporta PDF</span>
        {isLandscape && (
          <AlertTriangle className="export-pdf-btn__warning-badge" />
        )}
      </button>

      {showLandscapeWarning && (
        <ExportPdfLandscapeWarning
          onCancel={() => setShowLandscapeWarning(false)}
          onConfirm={() => {
            setShowLandscapeWarning(false);
            startExport();
          }}
        />
      )}

      {isExporting && (
        <ExportPdfProgressModal
          current={progress.current}
          total={progress.total}
          error={error}
          onClose={() => setError(null) || setIsExporting(false)}
        />
      )}
    </>
  );
}
```

---

## 6. Compatibilità con feature esistenti

Verifica esplicita di non rompere nulla:

- **Export PNG singolo** (bottone su `SlideCard`): nessuna modifica
- **Export ZIP**: nessuna modifica al codice esistente
- **Generazione AI**: nessuna modifica
- **Salvataggio DB**: nessuna modifica (il PDF non viene mai salvato in DB, è solo download client)
- **Template + palette + formati**: nessuna modifica, il PDF riusa il rendering attuale
- **Immagini di sfondo**: vengono catturate dall'export PNG, quindi finiscono naturalmente nel PDF

Test cross-feature da fare al termine:
- Esporta PDF di un carosello con palette Tech Dark + Editorial Mark + Portrait + immagini di sfondo
- Verifica che le immagini di sfondo siano nel PDF
- Verifica che i font siano renderizzati correttamente (no FOUT)
- Verifica che il PDF apra correttamente su Acrobat Reader, Preview macOS, Firefox PDF viewer

---

## 7. Anti-pattern da evitare

- ❌ **Non** modificare `exportPng.js` o `exportZip.js`. Sono indipendenti, devono restarci.
- ❌ **Non** ri-implementare il rendering delle slide in PDF (testo, palette, ecc.). Solo PNG embedded.
- ❌ **Non** usare `pixelRatio: 2` per il PDF. Raddoppia il peso senza beneficio visivo apprezzabile.
- ❌ **Non** validare la dimensione finale del PDF prima del download. Se il PDF supera 100MB (estremamente improbabile), il download avviene comunque e LinkedIn lo rifiuterà. L'utente vedrà l'errore quando carica.
- ❌ **Non** mostrare hint sul numero di slide (esplicitamente escluso dall'utente)
- ❌ **Non** salvare il PDF in `localStorage`. Solo download diretto.
- ❌ **Non** preservare il PDF tra reload (è un export, non un dato persistente)
- ❌ **Non** offrire export "PDF + ZIP insieme" o "PDF + PNG insieme" in questo prompt. Rimandato.
- ❌ **Non** rendere lazy l'import di `jsPDF` se la libreria è già usata altrove (controlla prima)
- ❌ **Non** aggiungere link cliccabili nel PDF anche se "sarebbe facile". Out of scope.
- ❌ **Non** aggiungere selezione del testo nel PDF. Le slide sono raster, è atteso.
- ❌ **Non** chiudere automaticamente il dialog di warning landscape. L'utente decide.

---

## 8. Workflow consigliato (a fasi)

Lavoro compatto, una fase sola. Stima totale: 5-7 ore.

### Fase 1 — Implementazione completa (5-7 ore)

- Installa `jspdf` (e verifica che `file-saver` sia già presente)
- Estrai `renderSlideAsPng` in modulo condiviso se non lo è già
- Crea `slugify.js` (se non esiste)
- Crea `exportPdf.js` con `exportCarouselAsPdf`
- Crea `ExportPdfButton.jsx` con la logica di stati
- Crea `ExportPdfLandscapeWarning.jsx`
- Crea `ExportPdfProgressModal.jsx`
- Integra il bottone nell'header dell'app
- Test cross-template, cross-formato, cross-palette
- Test cross-browser (Chrome, Firefox, Safari)

**Criterio di accettazione**: posso esportare un PDF da qualunque carosello in qualunque combinazione palette/template/formato. Il PDF apre correttamente su Acrobat e su LinkedIn. Le slide nel PDF sono visualmente identiche all'export PNG. Il filename ha la forma `{slug}-linkedin.pdf`. Esportando un carosello in formato landscape, il dialog di warning appare prima dell'export.

---

## 9. Criteri di qualità finale (checklist)

- [ ] Il bottone "Esporta PDF" è visibile nell'header
- [ ] Il bottone è disabled se il carosello non ha slide
- [ ] Click sul bottone con format ≠ landscape parte direttamente l'export
- [ ] Click sul bottone con format = landscape apre il dialog di warning prima
- [ ] Il dialog di warning ha 2 opzioni: Annulla e Procedi
- [ ] Durante l'export, il bottone è disabled e mostra spinner
- [ ] Il modal di progress mostra "Generazione slide X di Y" + progress bar
- [ ] Al termine dell'export, il file viene scaricato automaticamente
- [ ] Il filename ha la forma `{slug-titolo}-linkedin.pdf`
- [ ] Il PDF generato apre correttamente in Acrobat Reader
- [ ] Il PDF generato apre correttamente in Preview macOS
- [ ] Il PDF ha metadata corrette (title, author, subject)
- [ ] Il PDF è multi-pagina, una pagina per slide, dimensioni corrette
- [ ] Le pagine del PDF hanno aspect ratio coerente con il formato del carosello
- [ ] Le slide nel PDF sono visualmente identiche all'export PNG (stesso rendering)
- [ ] Le immagini di sfondo sono presenti nel PDF
- [ ] I font sono renderizzati correttamente (no FOUT)
- [ ] L'export di 15 slide completa in meno di 60 secondi
- [ ] Il file PDF pesa meno di 10MB per un carosello tipico (14 slide portrait)
- [ ] L'export PNG singolo continua a funzionare identicamente
- [ ] L'export ZIP continua a funzionare identicamente
- [ ] Niente warning React in console
- [ ] Niente regressioni su template, palette, formati, generazione AI, salvataggio DB

---

## 10. Note finali

- L'utente è uno sviluppatore senior. Niente over-commento del codice ovvio.
- Tutti i testi UI sono in **italiano**.
- Quando incontri ambiguità, **chiedi** prima di implementare.
- Al termine, scrivi un breve resoconto: cosa hai costruito, eventuali compromessi tecnici, dimensione media dei PDF prodotti nei tuoi test, tempi di generazione, eventuali quirks dei browser scoperti durante i test.
- Mantieni allineamento con le convenzioni del progetto: BEM, hooks pattern, no TypeScript.

---

**Ricorda**: il PDF è solo un wrapper attorno alle PNG già generate. Il rendering delle slide non cambia. Una feature ortogonale, compatta, isolata. Non rifare quello che già funziona.

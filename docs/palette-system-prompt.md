# Carosello Builder — Sistema di gestione palette colori

> **Per Claude Code**: questo prompt estende l'app Carosello Builder con un sistema di gestione palette. Presuppone che l'app esista già con la struttura definita nel brief originale. Leggi tutto il documento prima di iniziare. La sezione 11 ("Workflow consigliato") spiega come affrontarlo a fasi. Prima di scrivere codice, leggi e fai domande se servono.

---

## 1. Contesto e obiettivo

Oggi l'app gestisce un **singolo `theme.palette`** inline nel JSON del carosello. L'utente può modificare i 5-6 colori uno per uno nella tab Tema, ma non c'è alcun concetto di "palette riusabile".

Vogliamo introdurre una **libreria di palette colori** con queste caratteristiche:

- L'app ha **palette built-in** (system) read-only, che l'utente può applicare a un carosello ma non modificare direttamente
- L'utente può **duplicare** una palette (system o custom) e modificare la copia
- L'utente può **creare** palette da zero
- Ogni carosello applica una palette tramite **snapshot**: i colori vengono copiati nel `theme.palette` del carosello. Modifiche successive alla palette in libreria NON si propagano automaticamente (esiste un'azione esplicita "Ri-sincronizza" per farlo)
- Il carosello mantiene un riferimento `theme.palette_id` per sapere da quale palette deriva (utile per il bottone di ri-sincronizzazione)
- La libreria delle palette è **globale** (vale per tutti i caroselli dell'utente), persistita su `localStorage` con chiave separata
- I JSON di caroselli esistenti (senza `palette_id` né `surface`) devono continuare a funzionare grazie a una migrazione trasparente

**Importante**: questa è un'estensione, non un rewrite. Tocca solo le aree necessarie e mantieni la coerenza con il resto dell'app (BEM, hook patterns, struttura cartelle esistenti).

---

## 2. Modello dati

### 2.1 Entità `Palette`

```js
{
  id: "system-tech-dark",       // slug stabile, vedi §2.2
  name: "Tech Dark",            // nome leggibile, max 40 char
  description: "string?",        // opzionale, max 200 char
  origin: "system" | "user",     // discriminante per UI/permessi
  colors: {
    background: "#0a0e1a",
    surface:    "#1a1e2a",      // ← nuovo slot (vedi §3 per migrazione)
    foreground: "#e8e8e8",
    accent:     "#00ffaa",
    muted:      "rgba(232,232,232,0.45)",
    line:       "rgba(232,232,232,0.18)"
  },
  createdAt: 1715000000000,      // timestamp ms (solo per origin="user")
  updatedAt: 1715000000000       // timestamp ms (solo per origin="user")
}
```

**Regole**:
- `id` immutabile dopo creazione
- `origin: "system"` → tutta l'entità è read-only nella UI
- `origin: "user"` → tutto editabile tranne `id` e `origin`
- Sei slot colore: `background`, `surface`, `foreground`, `accent`, `muted`, `line`. Tutti obbligatori, tutti stringhe non vuote
- I valori dei colori sono stringhe CSS valide: hex (`#RRGGBB`, `#RRGGBBAA`) o `rgba(...)`. Niente altri formati nell'MVP

### 2.2 Convenzione di naming degli `id`

| Origine | Pattern | Esempio |
|---|---|---|
| `system` | `system-{slug}` | `system-tech-dark`, `system-warm-neutral` |
| `user` | `user-{nanoid8}` | `user-a1b2c3d4` |

Per gli ID user, usa `nanoid` (libreria già leggera). Niente UUID v4 (overkill, lunghi).

### 2.3 Le 2 palette built-in iniziali

Definiscile in `src/lib/palettes/builtins.js` come costanti esportate. **Devono essere identiche a questi valori** (sono il risultato di iterazioni di design già fatte, non modificarle).

```js
export const TECH_DARK = {
  id: "system-tech-dark",
  name: "Tech Dark",
  description: "Sfondo blu notte con accento verde fluo. Identità tech, alto contrasto, leggibile su mobile.",
  origin: "system",
  colors: {
    background: "#0a0e1a",
    surface:    "#1a1e2a",
    foreground: "#e8e8e8",
    accent:     "#00ffaa",
    muted:      "rgba(232,232,232,0.45)",
    line:       "rgba(232,232,232,0.18)"
  }
};

export const WARM_NEUTRAL = {
  id: "system-warm-neutral",
  name: "Warm Neutral",
  description: "Toni terra-Piemonte, sfondo crema caldo con accento terracotta. Editoriale, riflessivo.",
  origin: "system",
  colors: {
    background: "#FAF8F5",
    surface:    "#F0EDE8",
    foreground: "#2C2825",
    accent:     "#B8602A",
    muted:      "#8A837A",
    line:       "#D4CFC7"
  }
};

export const BUILTIN_PALETTES = [TECH_DARK, WARM_NEUTRAL];
```

### 2.4 Modifiche allo schema del carosello

L'oggetto `theme` del JSON diventa:

```json
{
  "theme": {
    "palette_id": "system-tech-dark" | null,
    "palette": {
      "background": "...",
      "surface": "...",
      "foreground": "...",
      "accent": "...",
      "muted": "...",
      "line": "..."
    },
    "header": { /* invariato */ },
    "footer": { /* invariato */ },
    "fonts":  { /* invariato */ }
  }
}
```

**Note**:
- `palette_id` è **nullable**: se `null`, significa che la palette del carosello è completamente custom (non collegata a nessuna palette in libreria). Capita quando l'utente edita i colori senza partire da una palette esistente, o quando importa un JSON "vecchio"
- `palette` è **sempre presente e completo** (6 colori). È lo snapshot di lavoro
- Quando l'utente "applica" una palette dalla libreria, l'app fa: `theme.palette_id = X.id; theme.palette = { ...X.colors }`

---

## 3. Migrazione retrocompatibile

Quando l'app importa un JSON, deve gestire i seguenti casi:

### 3.1 Casi possibili e azioni

| Caso | Stato del JSON | Azione |
|---|---|---|
| A | `theme.palette` ha 5 colori (manca `surface`) e nessun `palette_id` | Calcola un `surface` di fallback (vedi §3.2). Tenta il matching con palette built-in (vedi §3.3) |
| B | `theme.palette` ha 6 colori e nessun `palette_id` | Tenta il matching con palette built-in |
| C | `theme.palette_id` presente, palette in libreria esistente | Nessuna azione, JSON già conforme |
| D | `theme.palette_id` presente, palette in libreria NON esistente | Lascia `palette_id: null` (la palette di riferimento non esiste più) |

### 3.2 Fallback per il colore `surface`

Calcolo: `surface = lighten(background, 5%)` se `background` è scuro, `darken(background, 3%)` se è chiaro. Usa `color2k` per la manipolazione.

Pseudocodice:

```js
import { lighten, darken, getLuminance } from "color2k";

function inferSurface(background) {
  const lum = getLuminance(background);
  return lum < 0.5 ? lighten(background, 0.05) : darken(background, 0.03);
}
```

Questo è un fallback "buono abbastanza" — se l'utente vuole un colore specifico per `surface`, lo può poi editare manualmente.

### 3.3 Matching automatico con palette built-in

Per ogni palette built-in, confronta `colors.background`, `colors.foreground`, `colors.accent` con quelli del JSON importato (case-insensitive, normalizzando il formato hex). Se **tutti e tre** matchano, assegna `palette_id` a quella built-in. Altrimenti `palette_id = null`.

Non confrontiamo `muted`, `line`, `surface` perché potrebbero essere stati modificati o assenti.

### 3.4 Dove vive la migrazione

Crea `src/lib/migrateCarousel.js` con una funzione pura:

```js
export function migrateCarousel(rawCarousel) {
  // Ritorna sempre un oggetto carosello conforme alla versione corrente
  // Idempotente: se già migrato, lo restituisce identico
  // ...
}
```

Chiama `migrateCarousel` **subito dopo** il parse del JSON e **prima** della validazione zod. La validazione zod può quindi essere strict (`surface` obbligatorio).

### 3.5 Esportazione

Quando l'utente esporta un carosello (sia singolo JSON che dentro lo ZIP), esporta nella forma **corrente** (con `palette_id` e `surface`). Niente compatibilità all'indietro in export: andiamo sempre avanti.

---

## 4. Schema zod aggiornato

In `src/lib/schema.js`:

```js
const PaletteColorsSchema = z.object({
  background: z.string().min(1),
  surface:    z.string().min(1),
  foreground: z.string().min(1),
  accent:     z.string().min(1),
  muted:      z.string().min(1),
  line:       z.string().min(1)
});

const PaletteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  description: z.string().max(200).optional(),
  origin: z.enum(["system", "user"]),
  colors: PaletteColorsSchema,
  createdAt: z.number().optional(),
  updatedAt: z.number().optional()
});

const ThemeSchema = z.object({
  palette_id: z.string().nullable(),
  palette: PaletteColorsSchema,
  header: /* invariato */,
  footer: /* invariato */,
  fonts:  /* invariato */
});

export const PaletteLibrarySchema = z.array(PaletteSchema);
```

---

## 5. Stato globale e azioni

### 5.1 Estensione di `useCarouselStore`

Lo stato globale acquisisce un nuovo ramo `paletteLibrary`:

```js
{
  carousel: { ... },
  paletteLibrary: [Palette, Palette, ...],  // include sia system che user
  ui: {
    activeTab: 'slides' | 'theme' | 'json',
    editingSlideNum: null | number,
    paletteManagerOpen: false,                // ← nuovo
    editingPaletteId: null                    // ← per il modale "modifica palette"
  },
  history: { ... },
  meta: { ... }
}
```

**Inizializzazione**:
- All'avvio dell'app, `paletteLibrary` viene letta da `localStorage` (chiave `carosello.palettes`)
- Se la chiave non esiste, viene inizializzata con le 2 palette built-in
- Se la chiave esiste, le palette built-in vengono **comunque** garantite in cima alla lista (idempotenza: se l'utente ha cancellato accidentalmente una system, viene ricreata)

### 5.2 Nuove azioni del reducer

| Azione | Payload | Effetto |
|---|---|---|
| `APPLY_PALETTE` | `{ paletteId }` | Snapshot dei colori della palette nel `theme.palette` del carosello + setta `theme.palette_id`. Storicizza per undo |
| `RESYNC_PALETTE` | nessuno | Ri-applica la palette identificata da `theme.palette_id` (snapshot dei valori correnti). Disabled se `palette_id` è null o se la palette non esiste in libreria |
| `UPDATE_PALETTE_INLINE` | `{ key, value }` | Modifica un singolo colore in `theme.palette`. Setta `palette_id` a null (il carosello diventa custom rispetto alla palette di origine, perché ha divergato) |
| `CREATE_PALETTE` | `{ palette }` | Aggiunge una palette user alla libreria |
| `UPDATE_PALETTE` | `{ paletteId, patch }` | Modifica una palette user. **Errore** se `paletteId` è system |
| `DUPLICATE_PALETTE` | `{ paletteId, newName? }` | Crea una nuova palette user copiando i colori da `paletteId`. Genera nuovo `id`, `origin: "user"`, nome con suffisso "(copia)" se non specificato |
| `DELETE_PALETTE` | `{ paletteId }` | Rimuove una palette user. **Errore** se system. Se la palette eliminata era riferita da `carousel.theme.palette_id`, setta il riferimento a null (ma NON tocca i colori del carosello) |
| `IMPORT_PALETTE` | `{ palette }` | Importa una palette esterna (validata). Genera nuovo id user, anche se l'origine era system |
| `OPEN_PALETTE_MANAGER` / `CLOSE_PALETTE_MANAGER` | | UI |

### 5.3 Persistenza palette library

`useAutoSave` (esistente) salva `carosello.draft`. Aggiungi un secondo hook `usePaletteLibraryPersistence` che salva `paletteLibrary` su `carosello.palettes` con stesso pattern (debounce 800ms).

**Importante**: NON includere `paletteLibrary` nell'history (undo/redo). Le palette sono entità globali, non parte del documento di lavoro. Modifiche/creazioni di palette non finiscono nello stack di undo.

### 5.4 Coerenza referenziale

Quando si elimina una palette user che è correntemente applicata al carosello (`theme.palette_id === paletteId`):
- I colori del carosello restano invariati (snapshot)
- `theme.palette_id` viene settato a `null`
- Mostra un toast: "Palette eliminata. Il carosello mantiene i colori correnti."

---

## 6. UI: tab Tema (modifica)

Layout aggiornato della tab Tema. Lascia invariate le sezioni Header / Footer / Fonts. Sostituisci la sezione "Palette" con questa:

### 6.1 Selettore palette

In cima alla sezione Palette, una `<select>` o un `<combobox>` (preferisci combobox custom con preview):

```
┌─────────────────────────────────────────────┐
│ Palette attiva:                             │
│ ┌──────────────────────────────────────┐    │
│ │ ⬛⬛⬛⬛⬛⬛  Tech Dark (system)   ▼ │    │
│ └──────────────────────────────────────┘    │
│  • Stato: "in sync" / "modificata"          │
│  [Ri-sincronizza] [Gestisci palette...]     │
└─────────────────────────────────────────────┘
```

**Comportamento**:
- Il combobox mostra le palette della libreria con thumbnail (6 quadratini con i colori)
- Selezione → trigger `APPLY_PALETTE`
- Sotto il combobox, indicatore di stato:
  - **"in sync"** (badge verde) — i colori del carosello sono identici alla palette di riferimento
  - **"modificata"** (badge giallo) — i colori sono divergi dalla palette di origine
  - **"custom"** (badge grigio) — nessuna palette di riferimento (`palette_id: null`)
- Bottone `[Ri-sincronizza]` disabled se status ≠ "modificata"
- Bottone `[Gestisci palette...]` apre il modale (vedi §7)

### 6.2 Editor inline dei 6 colori

Sotto il selettore, i 6 color picker per i colori del `theme.palette` corrente, con i label semantici aggiornati:

| Label visualizzato | Slot tecnico | Help text |
|---|---|---|
| Sfondo | background | "Colore di sfondo principale di ogni slide" |
| Superficie | surface | "Sfondo di blocchi/highlight in tono minore (hl-soft)" |
| Testo | foreground | "Colore principale del testo" |
| Accento | accent | "Colore di evidenza: dot, kicker, highlight forti (hl-block)" |
| Spento | muted | "Testo secondario: numerazione, dettagli" |
| Linea | line | "Separatori sottili e bordi" |

Ogni modifica scatena `UPDATE_PALETTE_INLINE` (che mette `palette_id` a null se era valorizzato).

### 6.3 Validazione contrasto WCAG inline

Sotto i color picker, una piccola sezione "Verifica contrasto":

```
┌─────────────────────────────────────────────┐
│ Contrasto                                   │
│ ✓ Testo su Sfondo:    14.2 : 1  (AAA)       │
│ ⚠ Accento su Sfondo:  3.8 : 1   (AA solo grandi) │
│ ✓ hl-block leggibile: 12.1 : 1  (AAA)       │
└─────────────────────────────────────────────┘
```

Usa `wcag-contrast` o calcolo manuale via `color2k`. Categorie:
- **AAA**: ≥ 7.0
- **AA**: ≥ 4.5 (≥ 3.0 per testo grande)
- **Fail**: < 4.5

Mostra warning solo se uno dei contrasti chiave (Testo su Sfondo, hl-block) è sotto AA. Per Accento su Sfondo, basta segnalare AA-solo-grandi (siamo su testo grande comunque).

---

## 7. UI: modale "Gestisci palette"

Modal a piena pagina (overlay coprente l'area di lavoro). Layout:

```
┌──────────────────────────────────────────────────────────┐
│ Gestisci palette                                    [X]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [+ Nuova palette]  [Importa palette...]                 │
│                                                          │
│ ┌─ system ────────────────────────────────────────────┐  │
│ │ ⬛⬛⬛⬛⬛⬛  Tech Dark               [Applica][⋮]   │  │
│ │ Sfondo blu notte con accento verde fluo...          │  │
│ │ ────────────────────────────────────────────────    │  │
│ │ ⬛⬛⬛⬛⬛⬛  Warm Neutral            [Applica][⋮]   │  │
│ │ Toni terra-Piemonte, sfondo crema caldo...          │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌─ Le mie palette ─────────────────────────────────────┐ │
│ │ ⬛⬛⬛⬛⬛⬛  Tech Dark (copia)        [Applica][⋮]   │ │
│ │ ────────────────────────────────────────────────    │ │
│ │ (nessun'altra palette personalizzata)                │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 7.1 Comportamento per riga

**Per ogni palette**:
- Thumbnail (6 quadratini, 24px ciascuno)
- Nome + description (se presente)
- Badge `System` (oro/dorato) o `Custom` (grigio)
- Bottone `[Applica]` → `APPLY_PALETTE`, chiude il modale, torna alla tab Tema
- Menu `[⋮]` con azioni:
  - **Duplica** (sempre disponibile)
  - **Modifica** (solo per `origin: "user"`, apre modal §7.2)
  - **Esporta** (sempre disponibile, scarica JSON della singola palette)
  - **Elimina** (solo per `origin: "user"`, con conferma)

### 7.2 Modal "Modifica/Crea palette"

Sotto-modale che si apre sopra il manager. Form con:
- Nome (input text, required, max 40 char)
- Description (textarea, max 200 char, opzionale)
- 6 color picker (uguali a quelli della tab Tema)
- Verifica contrasto (uguale a §6.3)
- Anteprima live: una mini-slide a destra (~280×280) renderizzata con i colori correnti, contenente un testo placeholder ("Anteprima palette") con tutti gli stati (testo normale, accent, hl-block, hl-soft, line)
- Footer: `[Annulla]` `[Salva]`

**Comportamento**:
- "Modifica" → form precompilato con la palette esistente, salva con `UPDATE_PALETTE`
- "Crea da zero" → form vuoto con valori di default (es. copia di Tech Dark), salva con `CREATE_PALETTE`
- "Duplica" → form precompilato con la palette da copiare, salva con `CREATE_PALETTE` e nome suggerito "{originale} (copia)"

### 7.3 Importa palette

Bottone `[Importa palette...]` → file picker `.json`. Il file deve contenere un singolo oggetto Palette valido (o un array — supportiamo entrambi). Validazione zod, errori chiari se il file è malformato.

Importa sempre come `origin: "user"` con nuovo `id`, anche se il file originale aveva `origin: "system"`. Il nome importato viene mantenuto, con suffisso "(importata)" se esiste già una palette con lo stesso nome in libreria.

### 7.4 Esporta palette

Esporta come JSON singolo, schema standalone:

```json
{
  "_type": "carosello-palette",
  "_version": "1.0",
  "palette": {
    "id": "system-tech-dark",
    "name": "Tech Dark",
    "description": "...",
    "origin": "system",
    "colors": { ... }
  }
}
```

Il nome del file: `palette-{slug-del-nome}.json` (es. `palette-tech-dark.json`).

---

## 8. Struttura cartelle aggiunte/modificate

```
src/
├── components/
│   ├── theme-tab/
│   │   ├── ThemeTab.jsx                 # AGGIORNATO con selettore palette
│   │   ├── PaletteSelector.jsx          # NUOVO: combobox con thumbnail
│   │   ├── PaletteStatusBadge.jsx       # NUOVO: in-sync / modificata / custom
│   │   ├── ContrastChecker.jsx          # NUOVO: verifica WCAG
│   │   ├── ColorPicker.jsx              # esistente, lievi tweak
│   │   └── theme-tab.css
│   │
│   ├── palette-manager/                 # NUOVO MODULO
│   │   ├── PaletteManagerModal.jsx
│   │   ├── PaletteList.jsx
│   │   ├── PaletteRow.jsx
│   │   ├── PaletteEditModal.jsx
│   │   ├── PalettePreview.jsx           # mini-slide di anteprima
│   │   ├── PaletteThumbnail.jsx         # 6 quadratini
│   │   └── palette-manager.css
│
├── hooks/
│   ├── useCarouselStore.js              # AGGIORNATO
│   ├── usePaletteLibrary.js             # NUOVO: getter/azioni palette
│   ├── usePaletteLibraryPersistence.js  # NUOVO: autosave su localStorage
│   └── useContrastCheck.js              # NUOVO: calcoli WCAG memoizzati
│
├── lib/
│   ├── schema.js                        # AGGIORNATO
│   ├── migrateCarousel.js               # NUOVO
│   ├── palettes/
│   │   ├── builtins.js                  # NUOVO: TECH_DARK, WARM_NEUTRAL
│   │   ├── matchBuiltin.js              # NUOVO: matching per migrazione
│   │   ├── inferSurface.js              # NUOVO: fallback surface
│   │   └── exportPalette.js             # NUOVO: download singola palette
│   └── color/
│       ├── normalize.js                 # NUOVO: normalizzazione hex
│       └── contrast.js                  # NUOVO: WCAG ratio
```

---

## 9. Convenzioni BEM specifiche per i nuovi componenti

Esempi delle classi principali (mantieni questo stile):

```
.palette-selector
.palette-selector__trigger
.palette-selector__dropdown
.palette-selector__option
.palette-selector__option--system
.palette-selector__option--active
.palette-selector__thumbnail

.palette-status-badge
.palette-status-badge--in-sync
.palette-status-badge--modified
.palette-status-badge--custom

.palette-manager
.palette-manager__section
.palette-manager__section-header
.palette-row
.palette-row__thumbnail
.palette-row__info
.palette-row__name
.palette-row__description
.palette-row__badge
.palette-row__badge--system
.palette-row__badge--user
.palette-row__actions

.palette-edit-modal
.palette-edit-modal__form
.palette-edit-modal__preview
.palette-edit-modal__colors-grid

.contrast-checker
.contrast-checker__row
.contrast-checker__row--pass
.contrast-checker__row--warn
.contrast-checker__row--fail
.contrast-checker__ratio
.contrast-checker__label
```

---

## 10. Anti-pattern da evitare

- ❌ **Non** persistere `paletteLibrary` dentro `carosello.draft`. Sono entità separate.
- ❌ **Non** mettere le modifiche/creazioni di palette nell'history di undo/redo. Le palette sono globali, non documenti di lavoro.
- ❌ **Non** modificare in-place gli oggetti `BUILTIN_PALETTES`. Sono read-only, devono restare immutabili. Se un componente le riceve, niente `obj.colors.background = "x"` mai.
- ❌ **Non** assumere che `palette_id` punti sempre a una palette esistente. Può essere `null` o riferire una palette eliminata. UI sempre difensiva.
- ❌ **Non** usare il `name` della palette come chiave di identificazione. SOLO l'`id`.
- ❌ **Non** fare deep-clone delle palette ad ogni render. Memoizza (`useMemo`) le strutture derivate, soprattutto la thumbnail render.
- ❌ **Non** chiamare `APPLY_PALETTE` durante il rendering. È un'azione esplicita dell'utente (click su Applica). Mai automatica.
- ❌ **Non** consentire di salvare una palette con campi vuoti o colori invalidi. Validazione zod sempre prima del salvataggio.
- ❌ **Non** mostrare il bottone "Modifica" su una palette system. Non disabled, **non mostrato**. Disabled è ambiguo, l'assenza è chiara.
- ❌ **Non** rompere il drop del JSON nella tab JSON: deve poter accettare JSON con o senza `palette_id` (la migrazione fa il suo lavoro).
- ❌ **Non** scrivere migrazione retroattiva ON-BOOT su tutti i caroselli salvati. La migrazione si applica solo al caricamento di un singolo carosello (import o load da localStorage). Tener questo a mente per quando passeremo a Supabase.

---

## 11. Workflow consigliato (a fasi)

Affronta il progetto in **4 fasi**. Dopo ogni fase, fermati per validazione prima di proseguire.

### Fase 1 — Modello dati e migrazione (4-6 ore)

- Definisci `BUILTIN_PALETTES` in `src/lib/palettes/builtins.js`
- Aggiorna `src/lib/schema.js` con `PaletteSchema`, `PaletteColorsSchema`, e modifica `ThemeSchema` per includere `palette_id`
- Crea `migrateCarousel.js` con la logica di §3
- Crea `inferSurface.js` e `matchBuiltin.js`
- Crea `usePaletteLibrary` (solo state + loading da localStorage, senza UI ancora)
- Crea `usePaletteLibraryPersistence`
- Aggiungi le nuove azioni al reducer di `useCarouselStore`
- Scrivi un piccolo test manuale: importa un vecchio JSON (senza `surface` e senza `palette_id`), verifica che si carichi correttamente con la migrazione

**Criterio di accettazione Fase 1**: importo un JSON storico, l'app lo carica senza errori, vedo i colori corretti, il `theme.palette_id` viene assegnato correttamente se il JSON matcha una palette built-in.

### Fase 2 — Tab Tema rinnovata (6-8 ore)

- Crea `PaletteSelector` con dropdown + thumbnail
- Crea `PaletteStatusBadge`
- Crea `ContrastChecker` (con `useContrastCheck` hook)
- Aggiorna `ThemeTab` con il nuovo layout (selettore in cima + editor inline + contrasto)
- Bottoni "Ri-sincronizza" e "Gestisci palette..." (quest'ultimo per ora apre un modale vuoto/placeholder)
- Logica del badge "in sync / modificata / custom"

**Criterio di accettazione Fase 2**: posso cambiare palette dal selettore, vedo lo status aggiornato, modifico un colore e il badge passa a "modificata", clicco "Ri-sincronizza" e torna "in sync". L'indicatore di contrasto WCAG funziona correttamente.

### Fase 3 — Modale Gestione palette (8-10 ore)

- Crea `PaletteManagerModal` con sezioni system/user
- Crea `PaletteRow` con menu azioni
- Crea `PaletteEditModal` (form + preview live)
- Crea `PalettePreview` (mini-slide di anteprima)
- Implementa duplica, modifica, elimina con conferme
- Implementa importa/esporta

**Criterio di accettazione Fase 3**: posso creare una palette da zero, duplicare una system, modificare una mia, eliminarla con conferma, esportarla come JSON e re-importarla. Il modale è chiaro e veloce.

### Fase 4 — Rifiniture e robustezza (3-5 ore)

- Hotkeys: Esc chiude i modali, Cmd+Enter salva la palette in editing
- Animazioni framer-motion sui modali e sui badge di status
- Toast notifications per: palette applicata, palette eliminata, palette importata, errori di validazione
- Test di coerenza referenziale: elimina una palette correntemente applicata, verifica che `palette_id` diventi null senza rompere nulla
- Test di import di JSON malformati: errori chiari, niente crash

**Criterio di accettazione Fase 4**: l'app è fluida, niente regressioni sulle feature esistenti, tutti i casi limite gestiti.

---

## 12. Criteri di qualità finale (checklist)

- [ ] Le 2 palette built-in (Tech Dark, Warm Neutral) sono presenti e immutabili
- [ ] Un JSON vecchio (senza `surface` né `palette_id`) si carica correttamente grazie alla migrazione
- [ ] Il matching automatico con palette built-in funziona (importo un carosello tech-dark senza palette_id, viene riconosciuto)
- [ ] Posso applicare una palette, modificare un colore, vedere il badge "modificata", e ri-sincronizzare
- [ ] Posso duplicare una palette system → diventa una palette user editabile
- [ ] Posso eliminare una palette user correntemente applicata: il carosello sopravvive con `palette_id: null` e i colori intatti
- [ ] L'export di un carosello include `palette_id` (se valorizzato) e `surface` (sempre)
- [ ] L'export di una palette singola produce un JSON re-importabile
- [ ] Il contrasto WCAG si aggiorna live durante l'editing
- [ ] Le palette built-in non hanno bottone "Modifica" né "Elimina" (assenti, non disabled)
- [ ] Niente warning React in console
- [ ] `localStorage` ha due chiavi separate: `carosello.draft` e `carosello.palettes`
- [ ] Le modifiche alla libreria palette NON popolano lo stack di undo/redo
- [ ] Reload della pagina: la libreria palette è preservata, niente palette duplicate, le system sono sempre garantite

---

## 13. Note finali

- L'utente è uno sviluppatore senior PHP/JS. Niente spiegazioni ovvie nei commenti, ma commenta scelte non scontate (es. perché il matching automatico non confronta `muted`/`line`/`surface`).
- Tutti i testi UI sono in **italiano**.
- Non aggiungere feature non richieste. Se hai dubbi su qualcosa, **chiedi prima di implementare**.
- Quando finisci una fase, scrivi un breve resoconto: cosa hai fatto, cosa è rimasto fuori, cosa ti ha sorpreso. Questo aiuta a calibrare la fase successiva.
- Mantieni allineamento con le convenzioni del brief originale (BEM per stile, Tailwind solo per layout/utility, hooks pattern, struttura cartelle, niente TypeScript).

---

**Inizia leggendo questo documento per intero. Poi, prima di scrivere una riga di codice, dimmi se hai dubbi su qualche scelta, o se vedi anti-pattern che vorresti correggere. Solo dopo questo allineamento, parti con la Fase 1.**

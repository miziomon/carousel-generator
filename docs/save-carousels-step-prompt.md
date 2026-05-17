# Carosello Builder — STEP B: Libreria caroselli + persistenza DB

> **Per Claude Code**: questo è il **secondo di due prompt** per il salvataggio dei caroselli su database. Lo **Step A** ha già introdotto l'auth, l'estensione dello store con `documentId`/`isDirty`, e i bottoni "Salva carosello" / "Apri carosello" come placeholder. Questo Step B li rende funzionanti, aggiungendo la UI completa della libreria. Leggi tutto, fai domande se servono, poi parti dalla Fase 1.

---

## 0. Scope esplicito

### Cosa COPRE questo prompt

- Endpoint REST `/carousel/*` (chiamate al backend con `authenticatedFetch` dello Step A)
- Tabella di riferimento backend: `generations_carousel`
- Generazione thumbnail PNG della slide 1 al momento del salvataggio
- Modale "Salva carosello" con titolo auto-suggerito dalla prima slide, modificabile
- Modale "I tuoi caroselli" con lista, search, ordinamento
- Apertura di un carosello dalla libreria (sostituisce il documento corrente con conferma se dirty)
- Eliminazione di un carosello dalla libreria con conferma
- Rinomina veloce del titolo
- Sovrascrittura di un carosello esistente vs salvataggio come nuovo
- Indicatori "X/Y caroselli salvati" per utenti `free`
- Gestione del limite per tier

### Cosa NON copre

- Pagina/Home dedicata (resta tutto modale, da editor)
- Folders/tags/categorie (lista piatta)
- Versioning (ogni save sovrascrive)
- Condivisione dei caroselli con altri utenti
- Export/import di caroselli verso altri account
- Sync automatico in background
- Ricerca full-text avanzata (Postgres tsvector) — useremo `ILIKE` per ora
- Migrazione automatica dei caroselli locali al login (la migrazione avviene solo quando l'utente clicca "Salva" su un carosello in locale)

---

## 1. Contesto e principio architetturale

Lo Step A ha aggiunto:
- Auth utente con tier (`anonymous`/`free`/`pro`/`admin`)
- `useAuth` hook centralizzato
- Lo store del carosello ha `meta.documentId`, `meta.isDirty`, `meta.documentTitle`, `meta.lastSavedToDbAt`, `meta.isSaving`
- Bottoni "Salva carosello" e "Apri carosello" placeholder (oggi mostrano toast "in arrivo")
- Sistema di permessi (`canSaveCarousel`, `getMaxCarousels`)

In questo Step B:
- I bottoni diventano funzionanti
- Aggiungiamo la UI della libreria
- Aggiungiamo il backend client per `/carousel/*`

**Principio guida**: il carosello in localStorage resta sempre il "documento corrente di lavoro". Il DB è la "libreria", un secondo posto dove l'utente può "mettere via" un documento. Il save e il load sono operazioni **esplicite**, mai automatiche.

---

## 2. Documenti di riferimento

In `/docs` del progetto:
- `db_user_auth_schema.md` — auth e tier (già usato nello Step A)
- `db_carousel_schema.md` — **NUOVO** — schema della tabella `generations_carousel` ed endpoint `/carousel/*`

Se il documento `db_carousel_schema.md` non esiste ancora, **non procedere**. Chiedi all'utente di fornirlo. Le specifiche degli endpoint backend sono critiche per questo prompt.

In assenza del documento, assumo (e tu **devi verificare con l'utente**) i seguenti endpoint:

```
POST   /carousel              - Crea nuovo carosello
PUT    /carousel/{id}         - Aggiorna carosello esistente
GET    /carousel/{id}         - Recupera carosello completo per ID
DELETE /carousel/{id}         - Elimina carosello
GET    /carousel              - Lista caroselli dell'utente (con search/sort/pagination)
```

E i seguenti campi di base in `generations_carousel`:

```
id            (uuid, PK)
user_id       (uuid, FK)
title         (string)
content_json  (jsonb) - il JSON completo del carosello
thumbnail     (text) - data URL PNG della slide 1
slide_count   (int) - per filtri/ordinamento
ai_generated  (boolean) - flag se generato con AI
created_at    (timestamp)
updated_at    (timestamp)
```

**Se le specifiche reali differiscono, chiedi conferma all'utente prima di iniziare.**

---

## 3. Pipeline di salvataggio: dalla UI al DB

### 3.1 Flusso utente "Salva carosello"

```
1. Utente clicca "Salva carosello" nell'header (bottone già esistente da Step A)

2. CASO A — meta.documentId è null (carosello mai salvato):
   → Apre modale "Salva carosello"
   → Genera titolo auto-suggerito dalla prima slide
   → Utente conferma o modifica titolo
   → Click "Salva" nel modale:
     a. Genera thumbnail PNG della slide 1
     b. Costruisce payload (title, content_json, thumbnail, slide_count, ai_generated)
     c. POST /carousel
     d. Successo → dispatch SET_DOCUMENT_IDENTITY con id, title, createdAt
     e. Toast "Carosello salvato"
     f. Chiude modale

3. CASO B — meta.documentId esiste (carosello già salvato in passato):
   → Mostra mini-popup con 2 opzioni:
     "Sovrascrivi 'Pensieri in pillole #02'"
     "Salva come nuovo carosello"
   → Sovrascrivi: PUT /carousel/{id}, dispatch SET_DOCUMENT_IDENTITY (id resta uguale)
   → Salva come nuovo: apre modale di nuovo salvataggio con titolo "Copia di X"
```

### 3.2 Generazione thumbnail

Al momento del salvataggio, l'app genera una **thumbnail PNG della slide 1** usando lo stesso pattern dell'export ma con dimensioni ridotte.

```js
// src/lib/carousel/generateThumbnail.js
import * as htmlToImage from 'html-to-image';

const THUMBNAIL_MAX_DIMENSION = 540; // metà della native 1080

/**
 * Genera una thumbnail PNG della slide 1.
 * @param {HTMLElement} slideElement - Il DOM della slide renderizzata
 * @param {object} format - { width, height } in pixel native (1080×...)
 * @returns {Promise<string>} Data URL PNG
 */
export async function generateThumbnail(slideElement, format) {
  await document.fonts.ready;

  // Calcola le dimensioni della thumbnail mantenendo aspect ratio
  const ratio = THUMBNAIL_MAX_DIMENSION / Math.max(format.width, format.height);
  const thumbW = Math.round(format.width * ratio);
  const thumbH = Math.round(format.height * ratio);

  return await htmlToImage.toPng(slideElement, {
    width: format.width,
    height: format.height,
    canvasWidth: thumbW,
    canvasHeight: thumbH,
    pixelRatio: 1,  // niente retina per la thumbnail (riduce peso)
    style: {
      width: `${format.width}px`,
      height: `${format.height}px`,
    },
    cacheBust: true,
  });
}
```

La thumbnail PNG pesa tipicamente 30-80KB. Salvata in base64 nel campo `thumbnail` del DB.

**Importante**: il rendering della slide 1 va fatto in un nodo **off-screen** (non visibile all'utente), come già si fa per l'export PNG. Riusa la stessa infrastruttura di rendering off-screen esistente.

### 3.3 Titolo auto-suggerito dalla prima slide

Helper per estrarre un titolo dalla prima slide:

```js
// src/lib/carousel/suggestTitle.js
export function suggestTitleFromCarousel(carousel) {
  // Caso 1: ha già un titolo, usalo
  if (carousel.title?.trim()) return carousel.title.trim();

  // Caso 2: c'è _ai_generation.input_summary, usalo
  if (carousel._ai_generation?.input_summary?.trim()) {
    return carousel._ai_generation.input_summary.trim().slice(0, 80);
  }

  // Caso 3: estrae dalla prima slide
  const firstSlide = carousel.slides?.[0];
  if (firstSlide?.lines?.length) {
    // Concatena le lines, rimuove i tag inline, normalizza spazi
    const raw = firstSlide.lines.join(' ');
    const cleaned = raw
      .replace(/\[\/?(hl|soft|c|u|em)\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > 0) return cleaned.slice(0, 80);
  }

  // Fallback: data
  const now = new Date();
  return `Carosello del ${now.toLocaleDateString('it-IT')}`;
}
```

L'utente vede questo titolo nel campo input della modale e può modificarlo prima di confermare.

---

## 4. Client API per `/carousel/*`

### 4.1 Modulo `src/lib/carousel/api.js`

```js
import { authenticatedFetch } from '@/lib/auth/client.js';
import { getAuthConfig } from '@/lib/auth/config.js';

const baseUrl = () => getAuthConfig().apiBaseUrl;

/**
 * Crea nuovo carosello.
 * @returns {Promise<{id, title, created_at, updated_at}>}
 */
export async function createCarousel({ title, content_json, thumbnail, slide_count, ai_generated }) {
  const res = await authenticatedFetch(`${baseUrl()}/carousel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content_json, thumbnail, slide_count, ai_generated }),
  });
  if (!res.ok) throw await buildApiError(res);
  return res.json();
}

/**
 * Aggiorna carosello esistente.
 */
export async function updateCarousel(id, { title, content_json, thumbnail, slide_count, ai_generated }) {
  const res = await authenticatedFetch(`${baseUrl()}/carousel/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content_json, thumbnail, slide_count, ai_generated }),
  });
  if (!res.ok) throw await buildApiError(res);
  return res.json();
}

/**
 * Recupera carosello completo per id.
 */
export async function fetchCarousel(id) {
  const res = await authenticatedFetch(`${baseUrl()}/carousel/${id}`);
  if (!res.ok) throw await buildApiError(res);
  return res.json();
}

/**
 * Elimina carosello.
 */
export async function deleteCarousel(id) {
  const res = await authenticatedFetch(`${baseUrl()}/carousel/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await buildApiError(res);
}

/**
 * Lista caroselli con filtri.
 * @param {object} params
 * @param {string} params.search - testo per ILIKE su title o content_json
 * @param {string} params.sort - 'title' | 'created_at' | 'updated_at' | 'slide_count'
 * @param {string} params.order - 'asc' | 'desc'
 * @param {number} params.limit
 * @param {number} params.offset
 */
export async function listCarousels({ search = '', sort = 'updated_at', order = 'desc', limit = 50, offset = 0 } = {}) {
  const url = new URL(`${baseUrl()}/carousel`);
  if (search) url.searchParams.set('search', search);
  url.searchParams.set('sort', sort);
  url.searchParams.set('order', order);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  const res = await authenticatedFetch(url.toString());
  if (!res.ok) throw await buildApiError(res);
  return res.json();
  // Formato atteso: { items: [{id, title, thumbnail, slide_count, ai_generated, created_at, updated_at}], total: N }
}

async function buildApiError(res) {
  const body = await res.json().catch(() => null);
  return new Error(body?.message ?? `Errore HTTP ${res.status}`);
}
```

---

## 5. Modale "Salva carosello"

Componente `SaveCarouselModal.jsx`.

### 5.1 Trigger

Si apre dal click sul bottone "Salva carosello" nell'header, quando:
- l'utente è autenticato
- `meta.documentId === null` (mai salvato prima) **oppure**
- l'utente ha cliccato "Salva come nuovo carosello" dal popup di scelta (vedi §6)

### 5.2 Layout

```
┌─────────────────────────────────────────────────┐
│ Salva carosello                            [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────┐                             │
│  │                │  Titolo                     │
│  │  [thumbnail    │  [────────────────────]     │
│  │   della slide  │                             │
│  │   01]          │  ✓ 4/10 caroselli salvati   │
│  │                │  (solo per tier free)       │
│  └────────────────┘                             │
│                                                 │
│  ⚠ Errore generale se presente                  │
│                                                 │
├─────────────────────────────────────────────────┤
│                       [Annulla]    [Salva]      │
└─────────────────────────────────────────────────┘
```

### 5.3 Specifiche

- **Thumbnail**: generata al volo all'apertura del modale (vedi §3.2). Mentre la generazione è in corso, mostra uno spinner al posto.
- **Titolo**: input pre-compilato con `suggestTitleFromCarousel`, focus automatico, selezione completa del testo (così l'utente può iniziare a digitare per sovrascrivere)
- **Contatore tier free**: visibile solo se `tier === 'free'`. Formato: "4/10 caroselli salvati"
- **Bottone Salva**: disabled se titolo vuoto, o se sta avvenendo il salvataggio
- **Enter** dentro la textarea = Submit
- **Esc** = chiude modale (se non in saving)

### 5.4 Comportamento al submit

```js
const handleSave = async () => {
  setIsSaving(true);
  setError(null);
  try {
    // 1. Genera thumbnail della slide 1
    const thumbnail = await generateThumbnailForSlide(currentCarousel, 0);

    // 2. Costruisci payload
    const payload = {
      title: titleInput.trim(),
      content_json: { ...currentCarousel, title: titleInput.trim() },
      thumbnail,
      slide_count: currentCarousel.slides.length,
      ai_generated: Boolean(currentCarousel._ai_generation),
    };

    // 3. POST o PUT
    const result = meta.documentId
      ? await updateCarousel(meta.documentId, payload)
      : await createCarousel(payload);

    // 4. Aggiorna store
    dispatch({
      type: 'SET_DOCUMENT_IDENTITY',
      payload: { documentId: result.id, title: result.title, createdAt: result.created_at },
    });

    toast.success('Carosello salvato');
    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setIsSaving(false);
  }
};
```

### 5.5 Errore "limite raggiunto" (tier free)

Se il backend risponde con un errore tipo "Hai raggiunto il limite di caroselli" (codice/messaggio da concordare):
- Mostra l'errore in modo amichevole nel modale
- Aggiungi un link/bottone "Scopri di più su Pro" (per ora link vuoto/disabled)
- Bottone "Salva" resta disabled

---

## 6. Popup di scelta sovrascrittura / nuovo

Quando l'utente clicca "Salva carosello" e `meta.documentId` esiste (carosello già salvato in passato), mostra un piccolo popup di scelta prima di aprire la modale principale:

```
┌──────────────────────────────────────────┐
│ Vuoi sovrascrivere il carosello esistente? │
│                                          │
│ "Pensieri in pillole #02"                │
│ Ultimo salvataggio: 2 ore fa             │
│                                          │
│ [Salva come nuovo]   [Sovrascrivi]       │
└──────────────────────────────────────────┘
```

- **Sovrascrivi**: chiude il popup, chiama direttamente `updateCarousel(meta.documentId, payload)` con il titolo corrente (`meta.documentTitle`) — NO modale, save diretto + toast
- **Salva come nuovo**: chiude il popup, apre la modale `SaveCarouselModal` con titolo pre-compilato "Copia di {original title}"
- **X / Esc**: annulla l'operazione

---

## 7. Modale "I tuoi caroselli"

Componente `CarouselLibraryModal.jsx`.

### 7.1 Trigger

Si apre dal click sul bottone "Apri carosello" nell'header, oppure dalla voce "Caroselli salvati" nel UserMenu (entrambe già esistenti da Step A come placeholder, ora diventano funzionanti).

### 7.2 Layout

```
┌────────────────────────────────────────────────────────────┐
│ I tuoi caroselli                                      [X]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [🔍 Cerca per titolo o contenuto...]                      │
│                                                            │
│  Ordina per: [Più recenti ▾]   8 caroselli                 │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  ┌──────┐  Pensieri in pillole #02                   │  │
│  │  │ [th] │  14 slide • Salvato 2 ore fa • AI-generated│  │
│  │  │      │                                            │  │
│  │  └──────┘  [Apri]  [Rinomina]  [Elimina]             │  │
│  │                                                      │  │
│  │  ┌──────┐  Magia                                     │  │
│  │  │ [th] │  6 slide • Salvato ieri • AI-generated     │  │
│  │  └──────┘  [Apri]  [Rinomina]  [Elimina]             │  │
│  │                                                      │  │
│  │  ┌──────┐  L'AI è democratica solo a parole          │  │
│  │  │ [th] │  15 slide • Salvato 3 giorni fa            │  │
│  │  └──────┘  [Apri]  [Rinomina]  [Elimina]             │  │
│  │                                                      │  │
│  │  (...scroll for more)                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                          [Chiudi]          │
└────────────────────────────────────────────────────────────┘
```

### 7.3 Componenti

```
src/components/carousel-library/
├── CarouselLibraryModal.jsx       # container
├── CarouselSearchBar.jsx          # input search con debounce
├── CarouselSortSelector.jsx       # dropdown ordinamento
├── CarouselList.jsx               # lista scrollabile
├── CarouselListItem.jsx           # singola card della lista
├── CarouselListItemActions.jsx    # bottoni inline (Apri/Rinomina/Elimina)
├── RenameCarouselDialog.jsx       # dialog inline per rinominare
├── DeleteCarouselConfirm.jsx      # dialog di conferma eliminazione
└── carousel-library.css
```

### 7.4 Comportamento della search

- Input testo con placeholder "Cerca per titolo o contenuto..."
- **Debounce 300ms** prima di triggerare la chiamata API
- Il backend cerca con `ILIKE %query%` su `title` e su `content_json::text` (cast a text per la search base)
- Risultati aggiornati live
- Icona "X" per cancellare la search

### 7.5 Ordinamenti supportati

Dropdown con 6 opzioni:

| Opzione | Sort | Order |
|---|---|---|
| Più recenti | updated_at | desc |
| Meno recenti | updated_at | asc |
| Titolo A→Z | title | asc |
| Titolo Z→A | title | desc |
| Più slide | slide_count | desc |
| Meno slide | slide_count | asc |

Default: "Più recenti".

### 7.6 Card del singolo carosello

Layout di ogni `CarouselListItem`:

- **Thumbnail** a sinistra (~120×150px, aspect ratio adattato al formato del carosello — leggibile dal `content_json.theme.format`)
- **Info** a destra:
  - Titolo (font medium, troncato con `...` se troppo lungo)
  - Riga metadata: `{N} slide • Salvato {time ago} • [AI-generated badge se presente]`
  - Bottoni: `[Apri]` `[Rinomina]` `[Elimina]`
- **Hover**: leggero highlight di background
- Bottone `[Apri]` è il bottone primario della card

### 7.7 Time ago

Helper per il formato leggibile:

```js
// src/lib/utils/timeAgo.js
export function timeAgo(date) {
  const now = Date.now();
  const ts = new Date(date).getTime();
  const diff = now - ts;

  if (diff < 60_000) return 'Adesso';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ore fa`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} giorni fa`;

  // Per date più vecchie, mostra la data formattata
  return new Date(date).toLocaleDateString('it-IT', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}
```

### 7.8 Stati vuoti

- **Nessun carosello mai salvato**: mostra un placeholder centrato:
  ```
  📂  Non hai ancora caroselli salvati
       Clicca "Salva carosello" mentre lavori per crearne uno.
  ```
- **Search senza risultati**: 
  ```
  🔍  Nessun carosello trovato per "{query}"
       Prova con un altro termine.
  ```
- **Loading iniziale**: spinner centrato
- **Errore di caricamento**: messaggio + bottone "Riprova"

---

## 8. Apertura di un carosello dalla libreria

Quando l'utente clicca "Apri" su una card:

### 8.1 Caso A: `meta.isDirty === false`

Nessuna modifica non salvata. L'apertura è immediata:
1. `GET /carousel/{id}` → riceve `content_json`
2. Dispatch `LOAD_FROM_DB` con payload `{ carousel: content_json, documentId, title, createdAt }`
3. Lo store sostituisce il carosello corrente, setta `meta.documentId/Title/CreatedAt`, setta `meta.isDirty: false`
4. Pulisce l'history (`past: []`, `future: []`)
5. Chiude la modale libreria
6. Toast: "Aperto: {title}"

### 8.2 Caso B: `meta.isDirty === true`

Modifiche non salvate. Mostra un sotto-popup di conferma:

```
┌──────────────────────────────────────────┐
│ ⚠ Modifiche non salvate                  │
│                                          │
│ Il carosello corrente ha modifiche       │
│ non salvate. Continuando, le perderai.   │
│                                          │
│ [Annulla]   [Continua senza salvare]     │
└──────────────────────────────────────────┘
```

- **Annulla**: chiude solo questo popup, la modale libreria resta aperta
- **Continua senza salvare**: procede come Caso A (perdite incluse)

**Niente opzione "Salva e poi apri"** in questo MVP — è più semplice da spiegare e da implementare. L'utente sa già come salvare.

### 8.3 Nuova azione del reducer

```js
case 'LOAD_FROM_DB': {
  const { carousel, documentId, title, createdAt } = action.payload;
  return {
    ...state,
    carousel,
    meta: {
      ...state.meta,
      documentId,
      documentTitle: title,
      documentCreatedAt: createdAt,
      isDirty: false,
      isSaving: false,
      lastSavedToDbAt: Date.now(),
    },
    history: { past: [], future: [] },
    ui: { ...state.ui, /* eventualmente reset */ },
  };
}
```

L'history (`past`, `future`) viene resettata: aprire un nuovo documento è come iniziare da capo, non ha senso poter "annullare" l'apertura.

---

## 9. Rinomina di un carosello

Click su `[Rinomina]` apre un dialog inline (`RenameCarouselDialog`):

```
┌──────────────────────────────────────────┐
│ Rinomina carosello                  [X]  │
├──────────────────────────────────────────┤
│ Nuovo titolo                             │
│ [─────────────────────────────────]      │
│                                          │
├──────────────────────────────────────────┤
│              [Annulla]    [Rinomina]     │
└──────────────────────────────────────────┘
```

- Input pre-compilato con il titolo corrente
- Click "Rinomina":
  1. `PUT /carousel/{id}` con SOLO il nuovo titolo (mantenendo `content_json`, `thumbnail`, ecc. invariati nel payload — oppure usa una `PATCH` se il backend la supporta)
  2. Aggiorna la card nella lista
  3. Se il carosello rinominato è quello correntemente caricato (`meta.documentId === id`), aggiorna anche `meta.documentTitle`
  4. Toast: "Titolo aggiornato"

---

## 10. Eliminazione di un carosello

Click su `[Elimina]` apre un confirm dialog:

```
┌──────────────────────────────────────────┐
│ ⚠ Eliminare il carosello?                │
│                                          │
│ "Pensieri in pillole #02"                │
│                                          │
│ Questa operazione è irreversibile.       │
│                                          │
├──────────────────────────────────────────┤
│           [Annulla]    [Elimina]         │
└──────────────────────────────────────────┘
```

- Confermando → `DELETE /carousel/{id}`
- Rimuove la card dalla lista
- Se il carosello eliminato è quello correntemente caricato (`meta.documentId === id`):
  - Setta `meta.documentId = null`
  - Setta `meta.documentTitle = null`
  - Setta `meta.documentCreatedAt = null`
  - Lascia il `carousel` invariato (l'utente sta ancora lavorando su quei contenuti, semplicemente non sono più associati a un record DB)
  - Toast: "Carosello eliminato. Il documento corrente non è più collegato al cloud."

---

## 11. Aggiornamenti allo store (azioni nuove)

In aggiunta a `LOAD_FROM_DB` (§8.3), aggiungi:

```js
case 'CLEAR_DOCUMENT_IDENTITY':
  // Usato quando il carosello DB viene eliminato ma il documento di lavoro resta
  return {
    ...state,
    meta: {
      ...state.meta,
      documentId: null,
      documentTitle: null,
      documentCreatedAt: null,
      lastSavedToDbAt: null,
    },
  };

case 'UPDATE_DOCUMENT_TITLE':
  // Usato dopo rinomina
  return {
    ...state,
    meta: {
      ...state.meta,
      documentTitle: action.payload.title,
    },
  };
```

---

## 12. Indicatori in tempo reale dopo Step B

L'indicatore di sync nell'header (creato in Step A) ora ha più stati funzionali:

| Condizione | Visualizzazione | Note |
|---|---|---|
| `isAnonymous` | (niente) | come Step A |
| `documentId === null` && `isDirty` | "Non salvato nel cloud" | come Step A, ora cliccabile → apre Save modal |
| `documentId === null` && `!isDirty` | "Nuovo carosello" | come Step A |
| `documentId !== null` && `isDirty` | "Modifiche non salvate • Salva ora" | il "Salva ora" è cliccabile, salva direttamente con UPDATE (no modale) |
| `documentId !== null` && `!isDirty` | "Sincronizzato • {X min fa}" | come Step A |
| `isSaving` | "Salvataggio..." con spinner | come Step A |

L'indicatore diventa un **bottone azione** invece di un puro indicatore.

---

## 13. Caroselli AI-generated: il flag `ai_generated`

Quando si salva un carosello, il payload include:

```js
ai_generated: Boolean(currentCarousel._ai_generation)
```

Questo flag viene usato per:
- Mostrare il badge "AI-generated" nelle card della libreria
- (Opzionale, in v2) filtrare i caroselli generati da AI in cerca/ordinamento

Il `_ai_generation` resta dentro `content_json`. È duplicato come campo `ai_generated` solo per evitare query JSON costose lato DB.

---

## 14. Permission gating aggiornato

I bottoni "Salva" e "Apri" (già presenti come placeholder da Step A) ora hanno comportamento reale:

| Condizione | "Salva" | "Apri" |
|---|---|---|
| `isAnonymous` | disabled (tooltip "Accedi per salvare") | disabled (tooltip "Accedi per accedere ai tuoi caroselli") |
| `free` con limite raggiunto | disabled (tooltip "Limite raggiunto: 10/10") + dialog "Upgrade a Pro" al click | enabled |
| `free` con quota disponibile | enabled | enabled |
| `pro` / `admin` | enabled | enabled |

Per il check del limite raggiunto, l'app deve sapere quanti caroselli ha l'utente. Due strategie:

**A. Polling al boot**: chiama `listCarousels({ limit: 1 })` al boot dell'app per ottenere il `total` e cacheare il count
**B. Reattivo**: dopo ogni save/delete, aggiorna il count locale

Per l'MVP suggerisco **A** semplice: al boot dell'app, se autenticato e tier `free`, chiama una volta `listCarousels({ limit: 1 })` per ottenere il count. Lo metti in stato. Lo aggiorni dopo save/delete.

Estendi `useAuth` o crea un hook dedicato `useCarouselCount`:

```js
// src/hooks/useCarouselCount.js
export function useCarouselCount() {
  const { isAuthenticated, tier } = useAuth();
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await listCarousels({ limit: 1 });
      setCount(data.total);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  return { count, loading, refresh };
}
```

Esponi `refresh()` perché va richiamato dopo save (POST nuovo) e delete.

---

## 15. Anti-pattern da evitare

- ❌ **Non** salvare in DB automaticamente. Ogni save è esplicito.
- ❌ **Non** caricare in DB la cronologia (undo/redo). Solo lo stato corrente.
- ❌ **Non** consentire all'utente di vedere i caroselli di altri utenti. Lo scopo del filtro `user_id` lato backend deve essere garantito.
- ❌ **Non** persistere la lista dei caroselli in localStorage. Solo i fetch sul DB, sempre live.
- ❌ **Non** rifare il fetch della lista ad ogni apertura della modale libreria se i dati sono freschi (es. <30s). Mantieni una piccola cache in stato.
- ❌ **Non** inviare l'intero `content_json` nelle chiamate `listCarousels`. Il backend deve restituire solo `{id, title, thumbnail, slide_count, ai_generated, created_at, updated_at}`.
- ❌ **Non** mostrare badge "AI-generated" nella libreria se il backend non restituisce il flag (gestione difensiva).
- ❌ **Non** consentire titoli vuoti. Validazione client + backend.
- ❌ **Non** consentire titoli > 200 caratteri (limite ragionevole).
- ❌ **Non** lasciare in stato carouselId stale dopo eliminazione. Pulisci sempre lo store quando il documento corrente viene eliminato dal DB.
- ❌ **Non** rompere la generazione AI. Il flusso AI esistente continua a funzionare senza modifiche.

---

## 16. Workflow consigliato (a fasi)

### Fase 1 — Client API + helpers (3-4 ore)

- Modulo `src/lib/carousel/api.js` con `createCarousel`, `updateCarousel`, `fetchCarousel`, `deleteCarousel`, `listCarousels`
- `src/lib/carousel/generateThumbnail.js`
- `src/lib/carousel/suggestTitle.js`
- `src/lib/utils/timeAgo.js`
- Hook `useCarouselCount`
- Nuove azioni del reducer: `LOAD_FROM_DB`, `CLEAR_DOCUMENT_IDENTITY`, `UPDATE_DOCUMENT_TITLE`

**Criterio di accettazione Fase 1**: dalla console posso chiamare le funzioni API e ottenere risposte. Le nuove azioni del reducer funzionano (testabili manualmente con dispatch da devtools).

### Fase 2 — Modale "Salva carosello" (4-5 ore)

- `SaveCarouselModal.jsx` con thumbnail preview, titolo auto-suggerito, contatore tier free
- Generazione thumbnail off-screen al volo
- Popup di scelta "Sovrascrivi vs Nuovo" per `documentId` esistente
- Aggiornamento del bottone "Salva carosello" nell'header per aprire la modale
- Toast di conferma/errore

**Criterio di accettazione Fase 2**: posso salvare un nuovo carosello, vederlo nel DB (verifica manuale via API o backend dashboard). Posso sovrascriverne uno esistente. Posso "Salva come nuovo" e ne ottengo una copia.

### Fase 3 — Modale "I tuoi caroselli" (5-6 ore)

- `CarouselLibraryModal.jsx`, `CarouselSearchBar`, `CarouselSortSelector`, `CarouselList`, `CarouselListItem`
- Fetch e display della lista con search/sort
- Time ago, badge AI, conteggio slide
- Stati vuoti: nessun salvato, search senza risultati, loading, errore
- Aggiornamento del bottone "Apri carosello" nell'header per aprire la modale

**Criterio di accettazione Fase 3**: vedo la lista dei miei caroselli, posso cercare per titolo, posso ordinare. Le thumbnail si caricano correttamente.

### Fase 4 — Apri, Rinomina, Elimina (3-4 ore)

- Apertura di un carosello con gestione `isDirty` confirm
- `RenameCarouselDialog` con aggiornamento titolo
- `DeleteCarouselConfirm` con gestione `documentId` corrente
- Pulizia store quando il documento corrente viene eliminato

**Criterio di accettazione Fase 4**: posso aprire un carosello, modificarlo, salvarlo. Posso rinominare e l'header si aggiorna. Posso eliminare e l'app gestisce coerentemente lo stato del documento corrente.

### Fase 5 — Indicatori "live" e gating finale (2-3 ore)

- SyncIndicator nell'header diventa cliccabile ("Salva ora" quando dirty con id esistente)
- Hook `useCarouselCount` integrato per il gating
- Tooltip dinamici per i bottoni (es. "9/10 caroselli salvati")
- Dialog "Upgrade a Pro" placeholder al raggiungimento del limite
- Test cross-tier completo

**Criterio di accettazione Fase 5**: l'app si comporta correttamente per anonymous, free (con e senza quota), pro. Niente regressioni su generazione AI, export, editing.

---

## 17. Criteri di qualità finale (checklist)

- [ ] Posso salvare un nuovo carosello con titolo auto-suggerito modificabile
- [ ] La thumbnail della slide 1 viene generata e salvata
- [ ] Per un carosello già salvato, il popup chiede "Sovrascrivi vs Nuovo"
- [ ] La modale "I tuoi caroselli" mostra tutti i miei caroselli
- [ ] Search per titolo funziona con debounce
- [ ] Tutti i 6 ordinamenti funzionano
- [ ] Posso aprire un carosello dalla libreria
- [ ] Apertura con `isDirty: true` mostra conferma "perderai modifiche"
- [ ] Apertura con `isDirty: false` è immediata
- [ ] Posso rinominare un carosello, l'header si aggiorna se è quello corrente
- [ ] Posso eliminare un carosello, con conferma; lo store viene pulito coerentemente se era quello corrente
- [ ] Indicatore di sync nell'header riflette correttamente tutti gli stati
- [ ] "Salva ora" nell'indicatore funziona quando dirty con id esistente
- [ ] Tier `free`: contatore "N/10" visibile; bottone "Salva" disabilitato a 10/10
- [ ] Tier `pro`: nessun contatore, nessun limite
- [ ] Le funzionalità esistenti (anonymous experience, generazione AI, export) restano identiche
- [ ] Niente warning React in console
- [ ] Niente errori CORS/auth in console
- [ ] L'eliminazione di un carosello rimuove istantaneamente la card dalla lista
- [ ] Il count `useCarouselCount` si aggiorna dopo save/delete

---

## 18. Note finali

- L'utente è uno sviluppatore senior. Niente over-commento del codice ovvio.
- Tutti i testi UI sono in **italiano**.
- Quando incontri ambiguità sul backend (endpoints o response shapes), **chiedi prima all'utente** invece di andare di fantasia.
- Le specifiche del backend in §2 sono **assunzioni**. Vanno verificate con l'utente prima dell'implementazione.
- Quando finisci, scrivi un breve resoconto: cosa hai costruito, quali endpoint hai dovuto adattare rispetto alle specifiche assunte, eventuali compromessi tecnici.
- Mantieni allineamento con le convenzioni del progetto: BEM, hooks pattern, no TypeScript.

---

**Ricorda**: lo Step A ha già preparato il terreno. Questo step costruisce sopra. Niente refactoring grosso dello store, niente nuovo sistema di auth. Solo: client API + 2 modali principali + logica di permissions reale.

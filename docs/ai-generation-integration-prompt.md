# Carosello Builder — Integrazione API generazione AI

> **Per Claude Code**: questo prompt collega la UI già esistente (modale "Genera con AI" con form e tab Avanzate) all'endpoint backend `POST /chat/completions`. Trasforma il bottone "Genera carosello" da disabled a funzionante. Leggi tutto, fai domande se servono, poi implementa.
>
> **Documenti di riferimento disponibili in `/docs`** del progetto:
> - `docs/chat_completions_spec.md` — specifica completa dell'endpoint REST
> - `docs/system-prompt-carosello.md` — system prompt template da inviare al modello AI
>
> Consultali quando hai bisogno di dettagli tecnici. Questo prompt non li ripete.

---

## 0. Scope esplicito

### Cosa COPRE questo prompt

- Chiamata HTTP all'endpoint `POST /chat/completions`
- Composizione del payload: `system_prompt`, `message`, `context`, `metadata`
- Iniezione del few-shot (ultimo carosello presente) nel system prompt
- Loading state durante la chiamata
- Gestione di tutti i codici di errore HTTP definiti dalla specifica
- Modale di conferma "Sostituire il carosello attuale?"
- Validazione zod del JSON ricevuto
- Sostituzione del carosello corrente con entry in history per undo
- Salvataggio di metadati `_ai_generation` nel JSON del carosello sostituito

### Cosa NON copre

- Preview/diff dei risultati prima della sostituzione (verrà valutata in un prompt successivo)
- Storico dei caroselli generati (oggi gestiamo solo il carosello corrente)
- Tab "Impostazioni" con campi configurabili (URL/token vengono da `.env`)
- "Rigenera solo questa slide" (M8)
- Streaming della risposta
- Abort della chiamata in corso

Se incontri esigenze fuori scope, **lascia il codice essenziale e nota in commento** che la feature arriverà dopo. Non costruire stub o placeholder che dovremo poi smontare.

---

## 1. Contesto

La modale "Genera con AI" è già scaffoldata. Il form raccoglie:
- `postText` (textarea, obbligatorio)
- `slideCount` (slider 8-18 + bottone "Auto", default 12)
- `extraInstructions` (textarea, opzionale)
- Tab "Avanzate" mostra il system prompt come read-only

Il bottone "Genera carosello" nel footer è oggi **disabled con tooltip**. In questo step diventa funzionante.

L'endpoint da chiamare è descritto in `docs/chat_completions_spec.md`. È sincrono, stateless, restituisce JSON. Il backend gestisce già la validazione/repair del JSON con pipeline interna (LLM-side e local repair). Il client riceve sempre o un JSON valido o un errore 422 con `raw_response` nel body.

---

## 2. Configurazione (.env)

L'app legge da variabili Vite:

```env
# .env (o .env.local)
VITE_AI_API_URL=https://api.example.com/wp-draft-generator/v1/chat/completions
VITE_AI_API_TOKEN=il_bearer_token_dell_endpoint
```

Crea anche un file `.env.example` con le stesse chiavi ma vuote (per documentazione).

Al boot dell'app, verifica che entrambe le variabili siano valorizzate. Se mancano:
- Niente errore bloccante (l'app funziona comunque per editing manuale)
- Il bottone "Genera carosello" dentro la modale resta disabled con tooltip diverso: "API non configurata. Verifica VITE_AI_API_URL e VITE_AI_API_TOKEN nel file .env"

Esponi una funzione utility:

```js
// src/lib/ai/config.js
export function getAiConfig() {
  return {
    url: import.meta.env.VITE_AI_API_URL,
    token: import.meta.env.VITE_AI_API_TOKEN,
  };
}

export function isAiConfigured() {
  const { url, token } = getAiConfig();
  return Boolean(url && token);
}
```

---

## 3. Few-shot: l'ultimo carosello presente

### 3.1 Principio

Il system prompt template (in `src/lib/ai/systemPrompt.js`) contiene un placeholder `{{USER_PAST_CAROUSELS_JSON}}`. Lo sostituiamo a runtime con il **carosello correntemente caricato nell'app**, prima di inviare la chiamata.

Questo è il "few-shot dinamico": l'AI vede l'ultimo lavoro dell'utente come esempio del suo stile.

**Caveat noto**: stiamo passando come esempio il carosello che sta per essere sostituito. Funziona perché l'utente di solito ha lavorato a lungo su quel carosello, è il suo riferimento più recente di stile. In futuro, quando avremo uno storico, useremo altri caroselli; per ora questo è sufficiente.

### 3.2 Implementazione

Crea `src/lib/ai/buildSystemPrompt.js`:

```js
import { SYSTEM_PROMPT_TEMPLATE } from './systemPrompt.js';

/**
 * Compone il system prompt finale da inviare al modello AI.
 * Inietta come few-shot l'ultimo carosello presente (se esiste e ha contenuto significativo).
 *
 * @param {object} currentCarousel - Il carosello correntemente nello store
 * @returns {string} System prompt completo, pronto per essere inviato
 */
export function buildSystemPrompt(currentCarousel) {
  const fewShotBlock = formatFewShotBlock(currentCarousel);
  return SYSTEM_PROMPT_TEMPLATE.replace(
    '{{USER_PAST_CAROUSELS_JSON}}',
    fewShotBlock
  );
}

function formatFewShotBlock(carousel) {
  // Se non c'è un carosello significativo, restituisci stringa vuota (il placeholder sparisce)
  if (!carousel || !carousel.slides || carousel.slides.length < 3) {
    return '(nessun carosello passato disponibile)';
  }

  // Serializza il carosello come JSON formattato per leggibilità del modello
  // Rimuovi campi tecnici non rilevanti per il few-shot
  const cleaned = {
    slides: carousel.slides.map(s => {
      const { _note_autore, ...rest } = s;
      return rest;
    })
  };

  return `Ecco l'ultimo carosello prodotto dall'utente (usalo come riferimento di stile):

\`\`\`json
${JSON.stringify(cleaned, null, 2)}
\`\`\``;
}
```

**Nota**: ho rimosso `_note_autore` perché era un campo di servizio nostro, non un dato di stile per il modello. Tieni `_ai_generation` se presente (è informativo per il modello sapere che il carosello passato era a sua volta AI-generated, eventualmente).

### 3.3 Soglia minima di "carosello significativo"

Se il carosello corrente ha meno di 3 slide, lo consideriamo "non significativo" (probabilmente è il default scheletro). In quel caso, il placeholder viene riempito con `(nessun carosello passato disponibile)` — il system prompt gestisce già questa condizione.

---

## 4. Costruzione del payload della chiamata

Crea `src/lib/ai/generateCarousel.js`:

```js
import { getAiConfig } from './config.js';
import { buildSystemPrompt } from './buildSystemPrompt.js';

/**
 * Chiama l'endpoint AI per generare un carosello dal testo.
 *
 * @param {object} params
 * @param {string} params.postText - Testo del post (obbligatorio)
 * @param {number|'auto'} params.slideCount - Numero slide target o 'auto'
 * @param {string} params.extraInstructions - Istruzioni extra opzionali
 * @param {object} params.currentCarousel - Carosello corrente (per few-shot)
 * @returns {Promise<{response: object, model: string, usage: object, raw: object}>}
 * @throws {ApiError} - Errori di rete, HTTP, parsing
 */
export async function generateCarousel({
  postText,
  slideCount,
  extraInstructions,
  currentCarousel,
}) {
  const { url, token } = getAiConfig();

  if (!url || !token) {
    throw new ApiError('Configurazione API mancante', 'CONFIG_MISSING', null);
  }

  const systemPrompt = buildSystemPrompt(currentCarousel);
  const message = buildUserMessage(postText, slideCount, extraInstructions);

  const body = {
    message,
    system_prompt: systemPrompt,
    force_json_response: true,
    metadata: {
      source: 'carosello-builder',
      slide_count_requested: slideCount === 'auto' ? null : slideCount,
      has_extra_instructions: Boolean(extraInstructions?.trim()),
      input_chars: postText.length,
      generation_id: crypto.randomUUID(),
    },
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Errore di rete (no connection, CORS, timeout)
    throw new ApiError('Errore di rete', 'NETWORK_ERROR', null, err);
  }

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    // Errori HTTP gestiti per codice (vedi §6)
    throw mapHttpErrorToApiError(response.status, responseBody);
  }

  // 200 OK — parsifica il JSON nel campo `response`
  let generatedCarousel;
  try {
    generatedCarousel = JSON.parse(responseBody.response);
  } catch (err) {
    throw new ApiError(
      'La risposta non è JSON valido',
      'INVALID_JSON_RESPONSE',
      responseBody.response,
      err
    );
  }

  return {
    carousel: generatedCarousel,
    model: responseBody.model,
    usage: responseBody.usage,
    jsonRepaired: responseBody.json_repaired,
    rawResponseBody: responseBody, // utile per debug, da loggare se serve
  };
}

function buildUserMessage(postText, slideCount, extraInstructions) {
  const parts = [postText.trim()];

  if (slideCount !== 'auto') {
    parts.push(`\n[Numero target di slide: ${slideCount}]`);
  }

  if (extraInstructions?.trim()) {
    parts.push(`\n[Istruzioni extra dell'utente: ${extraInstructions.trim()}]`);
  }

  return parts.join('\n');
}
```

### 4.1 Mappatura errori HTTP

```js
// src/lib/ai/errors.js

export class ApiError extends Error {
  constructor(message, code, payload = null, cause = null) {
    super(message);
    this.code = code;       // identificatore programmatico
    this.payload = payload; // body raw del backend, se disponibile
    this.cause = cause;
  }
}

export function mapHttpErrorToApiError(status, body) {
  switch (status) {
    case 400:
      return new ApiError(
        body?.error === 'ValidationError'
          ? 'Dati della richiesta non validi'
          : 'Richiesta non valida',
        'BAD_REQUEST',
        body
      );
    case 401:
      return new ApiError(
        'Token di autenticazione non valido. Verifica VITE_AI_API_TOKEN nel file .env',
        'UNAUTHORIZED',
        body
      );
    case 413:
      return new ApiError(
        'Testo troppo grande per essere processato',
        'PAYLOAD_TOO_LARGE',
        body
      );
    case 422:
      return new ApiError(
        'Il modello AI ha generato una risposta non valida. Riprova.',
        'JSON_VALIDATION_FAILED',
        body  // contiene raw_response
      );
    case 429:
      return new ApiError(
        'Hai generato troppi caroselli in poco tempo. Riprova tra un minuto.',
        'RATE_LIMITED',
        body
      );
    case 500:
      return new ApiError(
        body?.error === 'ConfigError'
          ? 'Errore di configurazione del backend AI'
          : 'Errore interno del servizio AI',
        'SERVER_ERROR',
        body
      );
    default:
      return new ApiError(
        `Errore HTTP ${status}`,
        'UNKNOWN_HTTP',
        body
      );
  }
}
```

---

## 5. UI: bottone "Genera carosello" funzionante

Modifica `AiGeneratorModal.jsx` (o il componente equivalente del modale) per:

### 5.1 Stato interno

```js
const [isGenerating, setIsGenerating] = useState(false);
const [generationError, setGenerationError] = useState(null);
const [pendingResult, setPendingResult] = useState(null); // per la conferma
```

### 5.2 Logica click bottone "Genera carosello"

```js
const handleGenerate = async () => {
  if (isGenerating) return; // protezione doppio-click

  setGenerationError(null);
  setIsGenerating(true);

  try {
    const result = await generateCarousel({
      postText,
      slideCount,
      extraInstructions,
      currentCarousel: carouselFromStore,
    });

    // Validazione zod del carosello ricevuto
    const validation = validateCarouselForReplacement(result.carousel);
    if (!validation.ok) {
      throw new ApiError(
        'Il carosello generato non rispetta lo schema atteso',
        'SCHEMA_VALIDATION_FAILED',
        { zodErrors: validation.errors, generated: result.carousel }
      );
    }

    // Passa alla fase di conferma (vedi §6)
    setPendingResult({
      carousel: validation.data,
      meta: {
        model: result.model,
        usage: result.usage,
        jsonRepaired: result.jsonRepaired,
        generationId: /* riprendi da metadata */,
      },
    });
  } catch (err) {
    setGenerationError(err);
  } finally {
    setIsGenerating(false);
  }
};
```

### 5.3 Validazione zod parziale

Il carosello generato non avrà `theme.template_id` né `theme.palette_id` (l'AI non genera questi campi). Questi vengono presi dal carosello corrente al momento della sostituzione.

Crea `src/lib/ai/validateGenerated.js`:

```js
import { z } from 'zod';
// Riusa gli schemi esistenti per `slides`

const GeneratedCarouselSchema = z.object({
  _ai_generation: z.object({
    model: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).nullable().optional(),
    input_chars: z.number().nullable().optional(),
    input_summary: z.string().optional(),
  }).optional(),
  theme: z.null().optional(),  // l'AI restituisce sempre null o omette
  slides: z.array(SlideSchema).min(1),
});

export function validateCarouselForReplacement(rawCarousel) {
  const result = GeneratedCarouselSchema.safeParse(rawCarousel);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    };
  }
  return { ok: true, data: result.data };
}
```

### 5.4 Pattern del bottone

```jsx
<button
  className={cn(
    'ai-modal__btn-generate',
    isGenerating && 'ai-modal__btn-generate--loading',
    !canGenerate && 'ai-modal__btn-generate--disabled',
  )}
  onClick={handleGenerate}
  disabled={!canGenerate || isGenerating}
  title={!isAiConfigured() ? 'API non configurata. Verifica .env' : undefined}
>
  {isGenerating ? (
    <>
      <Spinner />
      <span>Generazione in corso…</span>
    </>
  ) : (
    'Genera carosello'
  )}
</button>
```

Dove `canGenerate = isAiConfigured() && postText.trim().length > 0`.

---

## 6. Loading state con sotto-testo dinamico

Mentre la chiamata è in corso (può durare 5-15 secondi), mostra un sotto-testo che cambia ogni 3-4 secondi. Pattern:

```js
// dentro il componente
const LOADING_MESSAGES = [
  'Analisi del testo in corso…',
  'Identificazione della struttura argomentativa…',
  'Costruzione delle slide…',
  'Applicazione degli highlight…',
  'Validazione della risposta…',
];

const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

useEffect(() => {
  if (!isGenerating) {
    setLoadingMessageIndex(0);
    return;
  }
  const interval = setInterval(() => {
    setLoadingMessageIndex(i => Math.min(i + 1, LOADING_MESSAGES.length - 1));
  }, 3500);
  return () => clearInterval(interval);
}, [isGenerating]);
```

Sotto al bottone, durante il loading, mostra:

```jsx
{isGenerating && (
  <div className="ai-modal__loading-status">
    <span className="ai-modal__loading-message">
      {LOADING_MESSAGES[loadingMessageIndex]}
    </span>
  </div>
)}
```

Stile: testo muted, allineato a sinistra, animazione di fade-in al cambio. Usa framer-motion `AnimatePresence` con key sull'index.

### 6.1 Disabilita tutti i campi durante il loading

Tutte le textarea, lo slider, e il bottone "Annulla" devono essere disabled durante `isGenerating`. Eccezione: la "X" in alto per chiudere il modale resta funzionante — chiudere il modale interrompe il flusso visivo, ma la chiamata API continua in background (non è abortable per ora). Documenta questo comportamento in un commento.

---

## 7. Modale di conferma "Sostituire il carosello attuale?"

Quando `pendingResult` è valorizzato (chiamata riuscita, validazione passata), mostra un **secondo modale sopra il primo** chiedendo conferma esplicita.

### 7.1 Componente `AiConfirmReplaceModal.jsx`

```
┌────────────────────────────────────────────────────┐
│ Sostituire il carosello attuale?              [X]  │
├────────────────────────────────────────────────────┤
│                                                    │
│  Il carosello generato contiene {N} slide.        │
│                                                    │
│  Questa operazione sostituirà completamente il     │
│  carosello corrente. Potrai annullare con Cmd+Z.  │
│                                                    │
│  ┌──────────────────────────────────────────┐     │
│  │ Tema: {input_summary se presente}        │     │
│  │ Modello: {model}                          │     │
│  │ Token: {usage.total_tokens}               │     │
│  │ JSON repair: {jsonRepaired}              │     │
│  └──────────────────────────────────────────┘     │
│                                                    │
├────────────────────────────────────────────────────┤
│            [Annulla]    [Sostituisci carosello]    │
└────────────────────────────────────────────────────┘
```

### 7.2 Bottoni

- `[Annulla]`: scarta `pendingResult`, torna alla modale di generazione (i campi del form sono ancora compilati)
- `[Sostituisci carosello]`: applica la sostituzione (vedi §8), chiude entrambe le modali

### 7.3 Tasti

- `Esc`: scarta il `pendingResult` (equivalente ad Annulla)
- `Enter`: applica la sostituzione

---

## 8. Sostituzione del carosello con entry in history

### 8.1 Azione reducer

Aggiungi una nuova azione a `useCarouselStore`:

```js
case 'REPLACE_CAROUSEL_FROM_AI': {
  const { generated, meta } = action.payload;

  // Costruisci il carosello finale fondendo:
  // - le slide generate (dall'AI)
  // - il theme corrente (palette, template, header, footer, fonts)
  // - metadati AI
  const newCarousel = {
    _schema: state.carousel._schema, // mantieni se presente
    theme: state.carousel.theme,     // mantieni completamente
    _ai_generation: {
      model: meta.model,
      timestamp: Date.now(),
      input_chars: meta.inputChars ?? null,
      input_summary: generated._ai_generation?.input_summary ?? null,
      usage: meta.usage ?? null,
      json_repaired: meta.jsonRepaired ?? null,
      generation_id: meta.generationId,
    },
    slides: renumberSlides(generated.slides),
  };

  return pushHistory(state, {
    ...state,
    carousel: newCarousel,
  });
}
```

### 8.2 Rinumerazione automatica delle slide

L'AI potrebbe restituire slide con `num` non sequenziale. Forza la rinumerazione:

```js
function renumberSlides(slides) {
  return slides.map((s, i) => ({ ...s, num: i + 1 }));
}
```

### 8.3 Toast di conferma

Dopo la sostituzione, mostra un toast non bloccante:

```
✓ Carosello generato e applicato. Cmd+Z per annullare.
```

---

## 9. Visualizzazione errori

Quando `generationError` è valorizzato, mostralo dentro la modale di generazione, sopra il footer, in un blocco di errore.

### 9.1 Componente `AiErrorDisplay.jsx`

Layout base:

```
┌────────────────────────────────────────────────────┐
│ ⚠ {error.message}                                  │
│                                                    │
│ [Mostra dettagli tecnici ▼]                        │
└────────────────────────────────────────────────────┘
```

Cliccando "Mostra dettagli tecnici", espande un blocco `<details>` con:
- Codice errore (`error.code`)
- Per errori 422 (`JSON_VALIDATION_FAILED`): il campo `raw_response` del body, in un blocco scrollabile, font monospace
- Per errori `SCHEMA_VALIDATION_FAILED`: la lista degli errori zod (path + message) + il JSON generato
- Per errori di rete: il messaggio della `cause`

Bottone secondario in fondo all'errore: `[Riprova]` — richiama `handleGenerate()` con gli stessi parametri del form. Visibile solo per errori "retentabili" (non per 401 o config mancante).

### 9.2 Classificazione errori per UX

| Codice | Messaggio utente | Mostra dettagli | Mostra retry |
|---|---|---|---|
| `CONFIG_MISSING` | Configurazione API mancante. Verifica `.env`. | No | No |
| `UNAUTHORIZED` | Token API non valido. Verifica `.env`. | Sì (raw body) | No |
| `BAD_REQUEST` | Dati della richiesta non validi. | Sì | No |
| `PAYLOAD_TOO_LARGE` | Testo troppo lungo per essere processato. | No | No |
| `JSON_VALIDATION_FAILED` (422) | Il modello ha generato JSON non valido. Riprova. | Sì (raw_response) | Sì |
| `SCHEMA_VALIDATION_FAILED` | JSON non conforme allo schema atteso. | Sì (zod errors + JSON) | Sì |
| `RATE_LIMITED` (429) | Troppi caroselli in poco tempo. Riprova tra un minuto. | No | No |
| `SERVER_ERROR` (500) | Errore del servizio AI. Riprova. | Sì | Sì |
| `NETWORK_ERROR` | Errore di rete. Verifica la connessione. | Sì (cause) | Sì |
| `INVALID_JSON_RESPONSE` | Risposta del modello non parsabile. | Sì (raw response) | Sì |

---

## 10. Struttura file da aggiungere

```
src/
├── lib/
│   └── ai/
│       ├── systemPrompt.js              # ESISTE GIÀ
│       ├── config.js                    # NUOVO: getAiConfig, isAiConfigured
│       ├── buildSystemPrompt.js         # NUOVO: iniezione few-shot
│       ├── generateCarousel.js          # NUOVO: chiamata API + parsing
│       ├── errors.js                    # NUOVO: ApiError + mapHttpErrorToApiError
│       └── validateGenerated.js         # NUOVO: zod validation del carosello ricevuto
│
├── components/
│   ├── ai-generator/
│   │   ├── AiGeneratorModal.jsx         # AGGIORNATO: logica click + stato
│   │   ├── AiLoadingStatus.jsx          # NUOVO: sotto-testo dinamico
│   │   ├── AiErrorDisplay.jsx           # NUOVO: blocco errore + dettagli
│   │   ├── AiConfirmReplaceModal.jsx    # NUOVO: modale di conferma
│   │   └── ai-generator.css             # AGGIORNATO
│
└── hooks/
    └── useCarouselStore.js              # AGGIORNATO: azione REPLACE_CAROUSEL_FROM_AI
```

---

## 11. Metadati `_ai_generation` salvati nel carosello

Quando il carosello viene sostituito, salva i metadati AI nel suo schema:

```json
{
  "_schema": { /* ... */ },
  "_ai_generation": {
    "model": "gemini-2.5-flash",
    "timestamp": 1715000000000,
    "input_chars": 1834,
    "input_summary": "L'AI come amplificatore di disuguaglianza...",
    "usage": {
      "prompt_tokens": 5234,
      "completion_tokens": 2103,
      "total_tokens": 7337
    },
    "json_repaired": "none",
    "generation_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "theme": { /* invariato dal precedente */ },
  "slides": [ /* nuove dall'AI */ ]
}
```

Quando l'utente modifica manualmente una slide dopo la generazione, **non rimuovere** `_ai_generation` (è uno storico di provenienza). Sopravvive anche all'export. È un dato di provenance utile.

### Aggiornamento schema zod del carosello

```js
const AiGenerationSchema = z.object({
  model: z.string().optional(),
  timestamp: z.number().optional(),
  input_chars: z.number().nullable().optional(),
  input_summary: z.string().nullable().optional(),
  usage: z.any().nullable().optional(),
  json_repaired: z.enum(['none', 'local', 'llm']).nullable().optional(),
  generation_id: z.string().optional(),
}).optional();

const CarouselSchema = z.object({
  _schema: z.object({ /* ... */ }).optional(),
  _ai_generation: AiGenerationSchema,  // ← nuovo campo opzionale
  theme: ThemeSchema,
  slides: z.array(SlideSchema).min(1),
});
```

---

## 12. Anti-pattern da evitare

- ❌ **Non** abortare la chiamata in corso quando l'utente chiude il modale. La chiamata API continua, il risultato viene scartato. Documenta questo comportamento.
- ❌ **Non** persistere `pendingResult` su localStorage. È volatile.
- ❌ **Non** loggare il bearer token in console o in eventuali console.error.
- ❌ **Non** mostrare al modello `_ai_generation` del carosello precedente nel few-shot. È un metadato tecnico, può confondere.
- ❌ **Non** validare il `system_prompt` o `message` lato client (es. lunghezza minima). Lascia al backend questo controllo.
- ❌ **Non** spegnere la conferma di sostituzione "perché è fastidiosa". È esplicita per design — è la garanzia che l'utente sia consapevole.
- ❌ **Non** preservare il vecchio `_ai_generation` quando arriva un nuovo carosello AI-generated. Sostituiscilo.
- ❌ **Non** assumere che `responseBody.response` sia sempre un JSON. Wrappa il `JSON.parse` in try/catch (anche se il backend dovrebbe garantirlo, defense in depth).
- ❌ **Non** mostrare il `_ai_generation.generation_id` nella UI utente. È solo per debug interno.
- ❌ **Non** chiudere automaticamente la modale di errore dopo X secondi. L'utente la chiude quando vuole.

---

## 13. Criteri di accettazione

- [ ] `.env.example` documenta `VITE_AI_API_URL` e `VITE_AI_API_TOKEN`
- [ ] Se `.env` non configurato, il bottone "Genera carosello" è disabled con tooltip esplicito
- [ ] Il bottone "Genera carosello" è enabled solo se: API configurata + postText non vuoto + non isGenerating
- [ ] Cliccando "Genera carosello" parte la chiamata API
- [ ] Il system prompt inviato contiene il few-shot dell'ultimo carosello (se ≥3 slide) o il placeholder vuoto
- [ ] Il body della chiamata contiene `system_prompt`, `message`, `force_json_response: true`, `metadata`
- [ ] Durante la chiamata: bottone diventa loading, tutti i campi del form disabled
- [ ] Sotto al bottone, durante il loading, appare un messaggio che cambia ogni 3-4 secondi
- [ ] La modale può essere chiusa con [X] durante il loading (la chiamata continua in background)
- [ ] Risposta 200 → validazione zod → modale di conferma "Sostituire il carosello attuale?"
- [ ] Conferma → REPLACE_CAROUSEL_FROM_AI viene dispatchato
- [ ] Il theme corrente (palette, template, header, footer) è preservato
- [ ] Le slide vengono rinumerate sequenzialmente da 1 a N
- [ ] `_ai_generation` viene salvato nel carosello
- [ ] Toast di conferma "Carosello generato. Cmd+Z per annullare."
- [ ] Cmd+Z riporta al carosello precedente
- [ ] 401 → messaggio "Token non valido. Verifica .env" + dettagli tecnici espandibili
- [ ] 422 → messaggio "Il modello ha generato JSON non valido" + raw_response nei dettagli
- [ ] 429 → messaggio "Troppi caroselli in poco tempo. Riprova tra un minuto"
- [ ] 500 → messaggio amichevole + bottone Riprova
- [ ] Errore di rete → messaggio "Errore di rete" + Riprova
- [ ] Errore di validazione schema (post-200) → mostra dettagli zod + JSON generato
- [ ] Doppio click sul bottone non scatena doppia chiamata
- [ ] Niente warning React in console
- [ ] Niente regressioni su altre feature

---

## 14. Note finali

- L'utente è uno sviluppatore senior. Niente sovra-commento del codice ovvio.
- Tutti i testi UI sono in **italiano**.
- Quando incontri un caso ambiguo non descritto nel prompt, **chiedi** prima di implementare.
- Quando finisci, scrivi un breve resoconto: cosa hai costruito, cosa hai dovuto improvvisare, cosa è uscito diverso da come atteso, su quali errori HTTP non hai potuto fare test reali.
- Mantieni allineamento con le convenzioni del progetto: BEM, hooks pattern, no TypeScript.

---

**Ricorda**: questo step copre solo la chiamata API e la sostituzione del carosello con conferma. Niente preview/diff, niente storico, niente abort. Una feature ben fatta alla volta.

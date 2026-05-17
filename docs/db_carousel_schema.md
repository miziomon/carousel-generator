# Specifica tecnica — Tabella `generations_carousel` e endpoint `/carousel/*`

> Versione: **0.1.0** — Aggiornato: 2026-05-14

---

## Scopo

Questa specifica documenta la **persistenza dei caroselli editoriali** prodotti tramite l'app frontend Carosello Builder. Definisce:

- Lo schema della tabella `generations_carousel` (PostgreSQL)
- Gli endpoint REST per CRUD + listing
- Le regole di authorization in base ai tier utente
- I limiti operativi e le validazioni
- Le considerazioni di sicurezza

I caroselli sono **documenti utente** persistenti, con titolo, thumbnail, contenuto JSON completo (slide, theme, palette, template) e metadati derivati per query veloci. Sono scollegati dal flusso di generazione AI (`/chat/completions`): un carosello può essere stato generato con AI, ma una volta salvato è gestito come qualunque altro documento utente.

**Differenze rispetto a `/chat/completions` e `generations_draft`:**

| Aspetto | `/chat/completions` | `generations_draft` | `generations_carousel` |
|---|---|---|---|
| Stateful (DB writes) | No | Sì (sessioni + messaggi) | Sì (carosello + metadata) |
| Tipo di contenuto | Testo qualsiasi | Articoli WordPress draft | Caroselli Instagram strutturati |
| Schema del payload | Libero | Articolo (title + body) | Carosello (theme + slides + AI metadata) |
| Owner | Per chiamata (stateless) | `user_id` | `user_id` |
| Limite per tier free | Rate limit IP | Drafts totali | **10 caroselli totali** |
| Validazione strutturale | force_json_response | Schema articolo | **Nessuna** (JSON valido + size) |

---

## Contesto operativo

### Flussi utente principali

Le operazioni client → backend seguono questi pattern:

```
1. Salvataggio "nuovo" (documento mai salvato prima)
   Client genera thumbnail PNG slide 1 → POST /carousel → response { id, ... }
   → Client memorizza id come "documentId" locale.

2. Salvataggio "sovrascrivi" (documento già esistente)
   Client rigenera thumbnail → PUT /carousel/{id} con payload completo
   → Response { updated_at }. Stesso id.

3. Rinomina veloce (solo titolo, no save completo)
   Client → PATCH /carousel/{id} body { "title": "nuovo titolo" }
   → Response { updated_at }.

4. Apertura di un carosello dalla libreria
   Client → GET /carousel/{id} → riceve content_json + metadata
   → Sostituisce documento locale.

5. Listing nella modale libreria
   Client → GET /carousel?search=...&sort=...&order=... → riceve items + total
   → Renderizza lista con thumbnail. Non include content_json.

6. Eliminazione
   Client → DELETE /carousel/{id} → 204 No Content
   → Client rimuove dalla lista. Se il documento corrente coincide, scollega l'id.
```

### Pattern stateful

A differenza di `/chat/completions`, ogni operazione su `generations_carousel`:
- Richiede autenticazione (JWT Bearer)
- È filtrata per `user_id` (gli utenti vedono solo i propri caroselli)
- Modifica lo stato persistente del DB
- È soggetta a limiti per tier (vedi sezione **Limiti per tier**)

---

## Schema della tabella `generations_carousel`

### Campi

| Campo | Tipo | Vincoli | Descrizione |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Identificatore univoco, generato dal server |
| `user_id` | `uuid` | FK → `generations_user.id`, NOT NULL, ON DELETE CASCADE | Proprietario del carosello |
| `title` | `varchar(200)` | NOT NULL, CHECK (`length(trim(title)) > 0`) | Titolo leggibile, mostrato nella libreria |
| `content_json` | `jsonb` | NOT NULL | Documento completo del carosello (theme, slides, ai_generation, ecc.) |
| `thumbnail` | `text` | NOT NULL | Data URL PNG della slide 1, base64 (~30-80KB tipico) |
| `slide_count` | `int` | NOT NULL, CHECK (slide_count > 0) | Numero di slide, derivato da `content_json.slides.length`, salvato per query veloci |
| `ai_generated` | `boolean` | NOT NULL, default false | True se il carosello è stato generato via AI (`content_json._ai_generation` presente) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Timestamp di creazione, immutabile |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Timestamp ultima modifica, aggiornato a ogni UPDATE |

### Vincoli e regole

- `id` è server-generated. Il client NON deve inviare l'id in POST.
- `user_id` viene impostato dal backend a partire dal JWT del chiamante. Il client NON deve mai inviare `user_id` nel payload (eventuali campi in body vengono ignorati).
- `title` viene normalizzato (trim) lato backend prima del save.
- `slide_count` e `ai_generated` sono **campi derivati**: il backend li ricalcola a partire da `content_json` ad ogni save (POST/PUT). Eventuali valori inviati dal client vengono ignorati.
- `created_at` è immutabile dopo il primo INSERT.
- `updated_at` viene aggiornato automaticamente via trigger su ogni UPDATE.

### Indici

```sql
CREATE INDEX idx_carousel_user_updated ON generations_carousel(user_id, updated_at DESC);
CREATE INDEX idx_carousel_user_title ON generations_carousel(user_id, title);
CREATE INDEX idx_carousel_user_ai ON generations_carousel(user_id, ai_generated);

-- Per la search ILIKE su content_json::text, considerare in futuro un indice GIN
-- su tsvector o pg_trgm. Per MVP nessun indice dedicato sulla search (full table scan
-- accettabile con < 10k caroselli per utente).
```

### Trigger `updated_at`

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_carousel_updated_at
BEFORE UPDATE ON generations_carousel
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Endpoints

Tutti gli endpoint:
- Sono prefissati con `/wp-draft-generator/v1`
- Richiedono `Authorization: Bearer <JWT>` con token utente valido
- Restituiscono `401 Unauthorized` se token assente o invalido
- Filtrano automaticamente per `user_id` derivato dal JWT
- Validano che la risorsa appartenga all'utente chiamante (se non appartiene → `404 NotFound`)

### `POST /carousel` — Crea nuovo carosello

#### Request body (application/json)

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|:---:|---|
| `title` | `string` | ✓ | 1-200 char, trimmato lato backend |
| `content_json` | `object` | ✓ | JSON completo del carosello (vedi vincoli sotto) |
| `thumbnail` | `string` | ✓ | Data URL PNG: `data:image/png;base64,...`. Max 200KB decodificato |

Campi opzionali in body vengono **ignorati silenziosamente** (incluso `id`, `user_id`, `slide_count`, `ai_generated`, `created_at`, `updated_at`).

#### Validazione

1. JSON parsabile → altrimenti `400 InvalidBody`
2. Tutti i campi obbligatori presenti → altrimenti `400 ValidationError`
3. `title` rispetta i vincoli → altrimenti `400 ValidationError`
4. `thumbnail` ha prefisso `data:image/png;base64,` → altrimenti `400 InvalidThumbnail`
5. `content_json` è un oggetto JSON valido con campo `slides` (array non vuoto) → altrimenti `400 InvalidContent`
6. Dimensione totale payload ≤ `MAX_CAROUSEL_PAYLOAD_MB` (default 15MB) → altrimenti `413 PayloadTooLarge`
7. **Controllo limite per tier**: se `tier == 'free'` e count caroselli utente ≥ 10 → `403 CarouselLimitReached`

Il backend NON valida la struttura interna di `content_json` (theme, slide types, palette, ecc.). È compito del client garantire la conformità.

#### Campi derivati al save

Il backend ricalcola e salva:

- `slide_count = jsonb_array_length(content_json->'slides')`
- `ai_generated = (content_json ? '_ai_generation' AND content_json->'_ai_generation' IS NOT NULL)`

#### Response 201 Created

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Pensieri in pillole #02",
  "slide_count": 14,
  "ai_generated": true,
  "created_at": "2026-05-14T10:30:00Z",
  "updated_at": "2026-05-14T10:30:00Z"
}
```

`content_json` e `thumbnail` NON sono inclusi nella response del POST: il client li ha già in memoria. Riduce la response a pochi KB.

---

### `PUT /carousel/{id}` — Sovrascrivi totale

Aggiorna **tutti** i campi modificabili di un carosello esistente. Usato per i save "Sovrascrivi" dall'editor.

#### Request body

Identico al POST (`title`, `content_json`, `thumbnail`).

#### Validazione

Identica al POST, eccetto:
- **Non si applica** il controllo del limite per tier (l'utente sta aggiornando un carosello esistente, non creandone uno nuovo)
- Se `id` non esiste o non appartiene all'utente → `404 NotFound`

#### Response 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Pensieri in pillole #02",
  "slide_count": 14,
  "ai_generated": true,
  "created_at": "2026-05-14T10:30:00Z",
  "updated_at": "2026-05-14T11:45:00Z"
}
```

---

### `PATCH /carousel/{id}` — Aggiornamento parziale

Aggiorna **uno o più campi** specifici. Usato principalmente per la **rinomina veloce** (solo `title`) senza dover inviare l'intero JSON.

#### Request body

Tutti i campi sono opzionali. Almeno uno deve essere presente.

| Campo | Tipo | Descrizione |
|---|---|---|
| `title` | `string` | Aggiorna solo il titolo |
| `content_json` | `object` | Aggiorna content_json (con ricalcolo di slide_count, ai_generated) |
| `thumbnail` | `string` | Aggiorna solo la thumbnail |

#### Validazione

- Body è oggetto JSON valido → altrimenti `400 InvalidBody`
- Almeno un campo aggiornabile presente → altrimenti `400 ValidationError` con messaggio "Nessun campo da aggiornare"
- I campi presenti rispettano i propri vincoli (vedi POST)
- Se `id` non esiste o non appartiene all'utente → `404 NotFound`
- Se `content_json` è presente, `slide_count` e `ai_generated` vengono ricalcolati
- `created_at` non è modificabile

#### Response 200 OK

Identica al PUT.

#### Esempio rinomina

```http
PATCH /carousel/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ "title": "Pensieri in pillole #02 - V2" }
```

---

### `GET /carousel/{id}` — Recupera singolo carosello

Recupera un carosello completo, incluso `content_json` e `thumbnail`. Usato per "Apri carosello" dalla libreria.

#### Response 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Pensieri in pillole #02",
  "content_json": { /* ... documento completo del carosello ... */ },
  "thumbnail": "data:image/png;base64,iVBORw0KGgo...",
  "slide_count": 14,
  "ai_generated": true,
  "created_at": "2026-05-14T10:30:00Z",
  "updated_at": "2026-05-14T11:45:00Z"
}
```

#### Errori

- `404 NotFound` se `id` non esiste o non appartiene all'utente

---

### `GET /carousel` — Lista caroselli dell'utente

Lista paginata, ordinabile, con search. Usata per il modale "I tuoi caroselli".

**Importante**: `content_json` NON è incluso nei risultati (sarebbe pesante; per la lista basta il preview con thumbnail). Per il contenuto completo serve `GET /carousel/{id}`.

#### Query parameters

| Param | Tipo | Default | Descrizione |
|---|---|---|---|
| `search` | `string` | — | Cerca con ILIKE su `title` E su `content_json::text` (concatenati con OR). Case-insensitive. |
| `sort` | `string` | `updated_at` | Campo di ordinamento. Valori ammessi: `title`, `created_at`, `updated_at`, `slide_count` |
| `order` | `string` | `desc` | Direzione. Valori ammessi: `asc`, `desc` |
| `limit` | `int` | `50` | Numero massimo di item. Min 1, Max 100 |
| `offset` | `int` | `0` | Offset per pagination |
| `ai_generated` | `bool` | — | Filtro opzionale: se `true` solo AI-generated, se `false` solo manuali |

#### Validazione

- `sort` non in lista → `400 ValidationError`
- `order` non in `[asc, desc]` → `400 ValidationError`
- `limit` o `offset` fuori range → `400 ValidationError`

#### Response 200 OK

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Pensieri in pillole #02",
      "thumbnail": "data:image/png;base64,iVBORw0KGgo...",
      "slide_count": 14,
      "ai_generated": true,
      "created_at": "2026-05-14T10:30:00Z",
      "updated_at": "2026-05-14T11:45:00Z"
    },
    {
      "id": "...",
      "title": "Magia",
      "thumbnail": "data:image/png;base64,...",
      "slide_count": 6,
      "ai_generated": true,
      "created_at": "2026-05-12T14:20:00Z",
      "updated_at": "2026-05-13T09:10:00Z"
    }
  ],
  "total": 8,
  "limit": 50,
  "offset": 0
}
```

| Campo response | Tipo | Descrizione |
|---|---|---|
| `items` | `array` | Lista dei caroselli (senza `content_json`) |
| `total` | `int` | Numero totale di caroselli dell'utente che matchano i filtri (utile per pagination) |
| `limit` | `int` | Limit applicato |
| `offset` | `int` | Offset applicato |

#### Performance note

Per ridurre la dimensione della response (le thumbnail base64 dominano), valutare in v2:
- Endpoint dedicato `GET /carousel/{id}/thumbnail` con cache headers aggressivi
- Compressione gzip della response (transparent per il client)
- Etag/Last-Modified per cache HTTP

Per MVP: niente ottimizzazione, response gzippata via reverse proxy (nginx/cloudflare) è sufficiente.

---

### `DELETE /carousel/{id}` — Elimina carosello

Hard-delete del record. Operazione irreversibile.

#### Response 204 No Content

Body vuoto. Eventuali response body sono ignorate dal client.

#### Errori

- `404 NotFound` se `id` non esiste o non appartiene all'utente

---

## Authorization e permessi per tier

| Endpoint | `anonymous` | `free` | `pro` | `admin` |
|---|:---:|:---:|:---:|:---:|
| `POST /carousel` | ❌ 401 | ✅ se count < 10 | ✅ | ✅ |
| `PUT /carousel/{id}` | ❌ 401 | ✅ | ✅ | ✅ |
| `PATCH /carousel/{id}` | ❌ 401 | ✅ | ✅ | ✅ |
| `GET /carousel/{id}` | ❌ 401 | ✅ | ✅ | ✅ |
| `GET /carousel` | ❌ 401 | ✅ | ✅ | ✅ |
| `DELETE /carousel/{id}` | ❌ 401 | ✅ | ✅ | ✅ |

**Note**:

- Gli utenti `anonymous` non hanno JWT valido → 401 su tutti gli endpoint
- Il limite di 10 caroselli per `free` si applica **solo al POST** (cioè alla creazione di nuovi). PUT/PATCH/DELETE sui propri caroselli esistenti funzionano sempre, anche se l'utente fosse temporaneamente "oltre il limite" (es. tier downgradato da pro a free).
- `admin` opera con gli stessi permessi di `pro`. Eventuali endpoint admin-specific (es. visualizzare caroselli di altri utenti) sono fuori scope di questa specifica.

### Calcolo del count per limite

```sql
SELECT COUNT(*) FROM generations_carousel WHERE user_id = $current_user_id;
```

Eseguito **prima** dell'INSERT al POST. Se `count >= 10` e `tier == 'free'` → `403 CarouselLimitReached`.

---

## Limiti operativi

| Limite | Default | Configurabile via | Note |
|---|---|---|---|
| Caroselli totali per `free` | 10 | `CAROUSEL_LIMIT_FREE` (env) | Hard limit al POST |
| Caroselli totali per `pro` | illimitato | — | Nessun check |
| Dimensione payload carosello | 15 MB | `MAX_CAROUSEL_PAYLOAD_MB` (env) | Response 413 se superato |
| Dimensione thumbnail | 200 KB decodificati | `MAX_THUMBNAIL_KB` (env) | Response 400 InvalidThumbnail se superato |
| Lunghezza `title` | 1-200 char | hardcoded | Vincolo DB CHECK + validazione |
| Slide minime per carosello | 1 | hardcoded | Vincolo CHECK su `slide_count > 0` |
| Rate limit per IP | 30 op/min | `RATE_LIMIT_CAROUSEL_PER_MIN` (env) | Condiviso tra tutti gli endpoint `/carousel/*` |
| `limit` default su GET /carousel | 50 | hardcoded | Configurabile da client |
| `limit` max su GET /carousel | 100 | hardcoded | Client che chiede di più → 400 |

---

## Errori HTTP

Tutti gli errori seguono il formato:

```json
{
  "error": "ErrorCode",
  "message": "Messaggio leggibile in italiano (UI-ready)",
  "details": { /* opzionale, info aggiuntive */ }
}
```

### Tabella codici

| HTTP | `error` | Causa | Body extra | Reazione client |
|---|---|---|---|---|
| `400` | `InvalidBody` | Body non parsabile come JSON | — | Mostra "Errore nella richiesta" |
| `400` | `ValidationError` | Campi mancanti o non validi (title vuoto, sort invalido, ecc.) | `details.fields` con elenco campi | Mostra messaggi inline sui campi |
| `400` | `InvalidThumbnail` | Thumbnail non è PNG base64 o supera 200KB | — | Rigenera thumbnail (ridimensiona o ricomprimi) |
| `400` | `InvalidContent` | `content_json` non è oggetto JSON valido o manca `slides` | — | Errore interno: il client dovrebbe garantire la struttura |
| `401` | — | Token JWT assente, scaduto o invalido | — | Trigger flow di refresh; se fallisce, logout |
| `403` | `CarouselLimitReached` | Tier `free` al limite (10 caroselli) | `details.current_count: 10`, `details.limit: 10` | Mostra modale upgrade a Pro |
| `404` | `NotFound` | Risorsa non esiste o non appartiene all'utente | — | Mostra "Carosello non trovato"; refresh della lista |
| `413` | `PayloadTooLarge` | Payload > MAX_CAROUSEL_PAYLOAD_MB | `details.max_mb: 15` | Suggerisce di ridurre immagini di sfondo |
| `429` | `RateLimitExceeded` | Più di RATE_LIMIT_CAROUSEL_PER_MIN op/min | `details.retry_after_seconds` | Mostra "Riprova tra X secondi" |
| `500` | `DatabaseError` | Errore DB lato server | — | Mostra "Errore interno, riprova" + bottone retry |
| `500` | `ConfigError` | Configurazione backend invalida (es. env mancante) | — | Errore di sistema, segnalare al backend team |

### Esempio response 403 (limite raggiunto)

```json
{
  "error": "CarouselLimitReached",
  "message": "Hai raggiunto il limite di 10 caroselli salvati. Effettua l'upgrade a Pro per salvarne illimitati.",
  "details": {
    "current_count": 10,
    "limit": 10,
    "tier": "free"
  }
}
```

### Esempio response 400 (ValidationError)

```json
{
  "error": "ValidationError",
  "message": "Alcuni campi non sono validi",
  "details": {
    "fields": [
      { "field": "title", "message": "Il titolo non può essere vuoto" },
      { "field": "thumbnail", "message": "Formato non riconosciuto" }
    ]
  }
}
```

---

## Variabili d'ambiente

Nuove env da aggiungere al backend:

| Variabile | Default | Descrizione |
|---|---|---|
| `CAROUSEL_LIMIT_FREE` | `10` | Numero massimo di caroselli per tier `free` |
| `MAX_CAROUSEL_PAYLOAD_MB` | `15` | Dimensione massima del payload JSON (in MB) |
| `MAX_THUMBNAIL_KB` | `200` | Dimensione massima della thumbnail dopo decoding base64 (in KB) |
| `RATE_LIMIT_CAROUSEL_PER_MIN` | `30` | Rate limit per IP, condiviso fra tutti gli endpoint `/carousel/*` |

Riusare quando possibile le variabili già esistenti (`DATABASE_URL`, `JWT_SECRET`, ecc.) — niente duplicazione.

---

## Considerazioni di sicurezza

### Isolamento per `user_id`

**Principio non negoziabile**: ogni query SQL deve includere il filtro `WHERE user_id = $current_user_id`. Mai eccezioni.

```sql
-- ✅ CORRETTO
SELECT * FROM generations_carousel WHERE id = $1 AND user_id = $2;

-- ❌ SBAGLIATO (permette l'accesso a caroselli altrui se conosci l'id)
SELECT * FROM generations_carousel WHERE id = $1;
```

Implementare ai livelli:
- ORM/query builder (es. tutti i metodi del repository accettano `user_id` obbligatorio)
- Layer API (estrae `user_id` dal JWT prima della query)
- Test integrati che verificano l'isolamento

### SQL injection

Tutte le query devono usare **parametri preparati** (prepared statements). Mai concatenazione di stringhe. In particolare la search ILIKE:

```sql
-- ✅ CORRETTO
WHERE (title ILIKE $1 OR content_json::text ILIKE $1)
-- $1 = '%' || sanitized_search || '%'

-- ❌ SBAGLIATO
WHERE title ILIKE '%${search}%'
```

### Validazione thumbnail

Il campo `thumbnail` arriva come `data:image/png;base64,...`. Il backend deve:

1. Verificare che inizi con `data:image/png;base64,` (prefisso esatto, nessun altro MIME accettato)
2. Estrarre la parte base64
3. Validare che decodifichi senza errori
4. Verificare che la dimensione decodificata sia ≤ `MAX_THUMBNAIL_KB * 1024`
5. (Opzionale, raccomandato) Verificare che i magic bytes siano `89 50 4E 47 0D 0A 1A 0A` (PNG header)

Senza queste validazioni, il client potrebbe inviare payload arbitrari (es. JavaScript come data URL) che potrebbero causare problemi a chi visualizza la thumbnail in un context HTML.

### Content-Type

Tutti gli endpoint accettano **solo** `application/json`. Multipart non supportato (le thumbnail e immagini di sfondo sono già inline base64 nel JSON).

### Dimensione massima request

Configurare il reverse proxy (nginx, traefik) per accettare body fino a `MAX_CAROUSEL_PAYLOAD_MB + 1MB` di overhead. Default sicuro: 20MB.

### CORS

L'endpoint deve accettare richieste dal dominio del frontend Carosello Builder. Tipica config:

```
Access-Control-Allow-Origin: https://carosello.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

---

## Migrazione database

### Migration SQL completa

```sql
-- === Migration: create_generations_carousel ===
-- Versione: 0.1.0
-- Data: 2026-05-14

BEGIN;

-- Tabella principale
CREATE TABLE generations_carousel (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES generations_user(id) ON DELETE CASCADE,
  title          varchar(200) NOT NULL CHECK (length(trim(title)) > 0),
  content_json   jsonb NOT NULL,
  thumbnail      text NOT NULL,
  slide_count    int NOT NULL CHECK (slide_count > 0),
  ai_generated   boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Indici per performance query frequenti
CREATE INDEX idx_carousel_user_updated ON generations_carousel(user_id, updated_at DESC);
CREATE INDEX idx_carousel_user_title ON generations_carousel(user_id, title);
CREATE INDEX idx_carousel_user_ai ON generations_carousel(user_id, ai_generated);

-- Trigger per updated_at automatico
-- Se la funzione set_updated_at() non esiste già nello schema, crearla:
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_carousel_updated_at
BEFORE UPDATE ON generations_carousel
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
```

### Rollback

```sql
BEGIN;
DROP TRIGGER IF EXISTS trg_carousel_updated_at ON generations_carousel;
DROP TABLE IF EXISTS generations_carousel;
-- Non rimuoviamo set_updated_at(): potrebbe essere usata da altre tabelle
COMMIT;
```

---

## Esempi cURL

### 1. Creare un nuovo carosello

```bash
curl -X POST https://api.example.com/wp-draft-generator/v1/carousel \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pensieri in pillole #02",
    "content_json": {
      "_schema": { "version": "1.0" },
      "theme": { "format": "portrait", "template_id": "system-editorial-mark", "palette_id": "system-tech-dark", "palette": {} },
      "slides": [
        { "num": 1, "type": "cover", "lines": ["L'\''AI è democratica solo a parole."] }
      ],
      "_ai_generation": { "model": "gemini-2.5-flash", "timestamp": 1715000000000 }
    },
    "thumbnail": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  }'
```

Response 201:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Pensieri in pillole #02",
  "slide_count": 1,
  "ai_generated": true,
  "created_at": "2026-05-14T10:30:00Z",
  "updated_at": "2026-05-14T10:30:00Z"
}
```

### 2. Sovrascrivere totalmente un carosello esistente

```bash
curl -X PUT https://api.example.com/wp-draft-generator/v1/carousel/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pensieri in pillole #02 (v2)",
    "content_json": { /* JSON aggiornato completo */ },
    "thumbnail": "data:image/png;base64,..."
  }'
```

### 3. Rinominare velocemente (PATCH)

```bash
curl -X PATCH https://api.example.com/wp-draft-generator/v1/carousel/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Nuovo titolo" }'
```

### 4. Recuperare carosello completo

```bash
curl -X GET https://api.example.com/wp-draft-generator/v1/carousel/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 5. Lista con search e ordinamento

```bash
# I 20 più recenti
curl -X GET "https://api.example.com/wp-draft-generator/v1/carousel?sort=updated_at&order=desc&limit=20" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Search per "pillole", ordinati per titolo A→Z
curl -X GET "https://api.example.com/wp-draft-generator/v1/carousel?search=pillole&sort=title&order=asc" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Solo AI-generated
curl -X GET "https://api.example.com/wp-draft-generator/v1/carousel?ai_generated=true" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 6. Eliminare un carosello

```bash
curl -X DELETE https://api.example.com/wp-draft-generator/v1/carousel/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Response 204 No Content.

---

## File coinvolti (lato backend)

Estensione consigliata della struttura esistente:

| File | Ruolo |
|---|---|
| `app/blueprints/v1/carousel_routes.py` | **NUOVO** — Route handlers per `/carousel/*` |
| `app/blueprints/v1/schemas.py` | Aggiunta di `CarouselCreateSchema`, `CarouselUpdateSchema`, `CarouselPatchSchema`, `CarouselListQuerySchema` |
| `app/blueprints/v1/routes.py` | Registrazione del blueprint `carousel_routes` |
| `app/repositories/carousel_repo.py` | **NUOVO** — Repository per query DB (create, update, get, list, delete) |
| `app/services/carousel_service.py` | **NUOVO** — Business logic (controllo limiti tier, calcolo derived fields, validazione thumbnail) |
| `migrations/YYYYMMDD_create_generations_carousel.sql` | **NUOVO** — Migration SQL |
| `app/config.py` | Aggiunta delle nuove env (`CAROUSEL_LIMIT_FREE`, `MAX_CAROUSEL_PAYLOAD_MB`, ecc.) |

---

## Compatibilità con altri endpoint

### `/chat/completions` (esistente)

**Nessuna interazione**. L'endpoint AI è stateless e non scrive su `generations_carousel`. Quando il client genera un carosello via AI, il backend AI restituisce solo JSON. Sarà il client a fare un successivo `POST /carousel` se l'utente decide di salvarlo.

### `/messages` e `generations_session` / `generations_message` (esistenti)

Nessuna interazione. Sono per il flusso chat WordPress draft, separati.

### `generations_draft` (esistente)

`generations_carousel` è una tabella **dedicata e separata**. Non riusa `generations_draft` per i seguenti motivi:

1. Schema diverso (carosello ha thumbnail dedicata, slide_count, ai_generated)
2. Limiti per tier diversi (10 caroselli vs N drafts articolo)
3. Endpoints separati per chiarezza concettuale
4. Possibilità di evolvere indipendentemente

---

## Note operative

### Performance attesa

- `GET /carousel/{id}` con `content_json` da ~200KB: < 50ms
- `GET /carousel` con 50 item, ognuno con thumbnail ~50KB: ~3-4MB response, < 200ms (raccomandata compressione gzip)
- `POST /carousel`: < 100ms (inclusa validazione thumbnail)
- `PUT /carousel/{id}`: < 100ms
- `PATCH /carousel/{id}` con solo title: < 30ms

### Monitoraggio

Loggare a livello INFO:
- Ogni POST/PUT/DELETE riuscita (incluso `user_id`, `carousel_id`, dimensione payload)
- Ogni 403 CarouselLimitReached (utile per metriche conversion free → pro)
- Ogni 413 PayloadTooLarge (potenziale problema di sizing client-side)

A livello ERROR:
- Errori DB
- Eventi di 500 ConfigError

### Backup e retention

I caroselli sono dati utente preziosi. Backup giornaliero del DB raccomandato (probabilmente già in atto per le altre tabelle).

Hard-delete è permanente: nessun cestino, nessun recupero. Se in futuro servirà "ripristina carosello eliminato", introdurre soft-delete con migration dedicata.

---

## Changelog

| Versione | Data | Modifiche |
|---|---|---|
| 0.1.0 | 2026-05-14 | Versione iniziale: schema tabella, 6 endpoint, limiti per tier free |

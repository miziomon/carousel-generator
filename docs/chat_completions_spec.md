# Specifica tecnica — `POST /chat/completions`

> Versione: **0.44.0** — Aggiornato: 2026-05-13

---

## Scopo

Endpoint sincrono e **stateless** per completamenti LLM generici. Non effettua nessuna scrittura su database: nessuna sessione, nessun messaggio salvato, nessun token tracking. Adatto per integrazioni esterne che gestiscono la persistenza in proprio.

**Differenze principali rispetto a `POST /messages`:**

| Aspetto | `/messages` | `/chat/completions` |
|---|---|---|
| `system_prompt` | Opzionale (fallback DB → file) | **Obbligatorio** nel body |
| DB writes | Sessioni + messaggi + token | **Nessuno** |
| `session_id` | Opzionale (crea sessione) | Non presente |
| `history` | Non presente | Opzionale (multi-turn) |
| `metadata` | Non presente | Opzionale (pass-through) |
| `usage` in response | Non presente | Presente (token aggregati) |
| Email notifica | `MAIL_DEBUG_MESSAGES` (opt-in) | `MAIL_NOTIFICATION` (se impostato) |

---

## Endpoint

```
POST /wp-draft-generator/v1/chat/completions
Content-Type: application/json
Authorization: Bearer <API_AUTH_TOKEN>
```

---

## Request Body

### Campi obbligatori

| Campo | Tipo | Vincoli | Descrizione |
|---|---|---|---|
| `message` | `string` | min 1 char | Messaggio utente corrente |
| `system_prompt` | `string` | min 1 char | Istruzioni di sistema. Nessun fallback al DB né al file di default. |

### Campi opzionali

| Campo | Tipo | Default | Descrizione |
|---|---|---|---|
| `context` | `string` | `null` | Testo aggiuntivo preposto al messaggio: `Contesto: {context}\n\n{message}` |
| `user_id` | `string (UUID)` | `null` | UUID utente per override credenziali Gemini. Nessuna scrittura su DB. |
| `force_json_response` | `boolean` | `true` | Se `true`, attiva la pipeline di validazione/repair JSON sulla risposta Gemini. |
| `metadata` | `object` | `null` | Oggetto arbitrario del client (pass-through). Incluso nell'email di notifica, ignorato dal backend. |
| `history` | `array[HistoryItem]` | `null` | Storico conversazione per chiamate multi-turn. Vedi sezione **History**. |

### Schema `HistoryItem`

```json
{"role": "user" | "assistant", "content": "string (min 1 char)"}
```

| Campo | Tipo | Valori | Descrizione |
|---|---|---|---|
| `role` | `string` | `"user"` \| `"assistant"` | Ruolo del turno |
| `content` | `string` | min 1 char | Testo del turno |

> Il role `"assistant"` viene mappato a `"model"` internamente prima della chiamata Gemini SDK.

---

## Request — multipart/form-data (file allegato)

Quando si allega un file, la richiesta deve essere `multipart/form-data`.  
**Nota**: i campi `metadata` e `history` non sono disponibili in multipart (solo JSON).

```
POST /wp-draft-generator/v1/chat/completions
Content-Type: multipart/form-data
Authorization: Bearer <API_AUTH_TOKEN>
```

| Campo form | Tipo | Obbligatorio | Descrizione |
|---|---|:---:|---|
| `message` | `string` | ✓ | Messaggio corrente |
| `system_prompt` | `string` | ✓ | Istruzioni di sistema |
| `file` | `binary` | — | File allegato |
| `context` | `string` | — | Contesto aggiuntivo |
| `user_id` | `uuid` | — | UUID utente |
| `force_json_response` | `string` | — | `"true"` / `"false"` (default `"true"`) |

**MIME ammessi:**

| MIME type | Consegna a Gemini |
|---|---|
| `text/plain`, `text/markdown`, `text/csv` | binario (`Part.from_bytes`) |
| `application/pdf` | binario |
| `image/jpeg`, `image/png`, `image/webp` | binario |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | **testo estratto** (`Part(text=...)`) |

MIME non in lista → `400 UnsupportedMediaType`.  
File > `MAX_UPLOAD_MB` (default 20 MB) → `413 PayloadTooLarge`.

**Gestione `.docx`**: il testo viene estratto via `python-docx` (paragrafi + celle tabella separate da ` | `) e passato a Gemini racchiuso nei marker:

```
[DOCUMENTO ALLEGATO: <filename>]
{testo estratto}
[FINE DOCUMENTO]
```

File corrotto → `400 InvalidDocx`. Nessun testo estraibile → `400 EmptyDocx`.

---

## History — conversazioni multi-turn

Il campo `history` consente di passare i turni precedenti della conversazione.  
Deve contenere i turni in **ordine cronologico** (il più vecchio prima).

```json
"history": [
  {"role": "user",      "content": "Qual è la differenza tra SEO on-page e off-page?"},
  {"role": "assistant", "content": "L'SEO on-page riguarda gli elementi interni al sito come titoli, meta tag e contenuti ottimizzati..."},
  {"role": "user",      "content": "Puoi darmi un esempio pratico di SEO off-page?"}
]
```

Il backend costruisce il `contents` Gemini antepondo i turni precedenti al messaggio corrente:

```
[types.Content(role='user',  parts=[Part(text='Qual è la differenza...')]),
 types.Content(role='model', parts=[Part(text='L\'SEO on-page...')]),
 types.Content(role='user',  parts=[Part(text='Puoi darmi un esempio...')])]
               ↑ current message
```

Il `system_prompt` va sempre nel `config.system_instruction`, separato dal `contents`.

---

## Flusso completo

```
1. Parsing body: multipart/form-data (con file opzionale) oppure application/json
2. Validazione con ChatCompletionSchema (Pydantic)
   → 400 ValidationError se message o system_prompt mancanti/non validi
3. Validazione file allegato (se presente)
   → 400 UnsupportedMediaType se MIME non ammesso
   → 413 PayloadTooLarge se > MAX_UPLOAD_MB
4. Rate limit: chiave messages:ratelimit:ip:{ip}, finestra 60s
   → 429 se superato RATE_LIMIT_MESSAGES_PER_MIN
5. Credenziali Gemini: override da profilo utente (se user_id) → fallback .env
   → 500 ConfigError se GEMINI_API_KEY mancante
6. Costruzione contenuto effettivo:
   a. context preposto al message (se presente)
   b. file: .docx → estrazione testo + markers; altri MIME → Part.from_bytes
   c. history: mapping assistant→model + build types.Content[]
7. Chiamata call_gemini(api_key, model, system_prompt, content,
                        return_metadata=True, response_json=force_json_response,
                        history=gemini_history)
   → 500 LLMError se errore Gemini
8. Pipeline force_json_response (solo se true):
   a. validate_and_repair_json(response_text) → repair locale (fences/trim/extract)
   b. Se fallisce → repair LLM (seconda call_gemini con _JSON_REPAIR_SYSTEM_PROMPT)
   c. Se fallisce → 422 JsonValidationFailed (body grezzo in raw_response)
9. Email di notifica a MAIL_NOTIFICATION (non bloccante, se impostato)
10. Return 200 con response, model, characters, usage, [json_validated, json_repaired]
```

---

## Credenziali Gemini — priorità

| Priorità | Sorgente | Condizione |
|---|---|---|
| 1 | `generations_user.gemini_api_key` / `gemini_model` | `user_id` fornito e campo valorizzato |
| 2 | Variabili `.env`: `GEMINI_API_KEY`, `GEMINI_MODEL` | Sempre come fallback |

**Solo lettura**: la richiesta non crea né aggiorna nessun record in DB.

---

## Validazione/repair JSON

Pipeline attivata solo se `force_json_response=true` (default):

```
1. call_gemini con response_mime_type="application/json" (SDK-level)
2. validate_and_repair_json(text):
   → json.loads diretto → OK (json_repaired: "none")
   → strip fences ```json...``` → OK (json_repaired: "local")
   → extract prima { ... ultima } oppure [ ... ] → OK (json_repaired: "local")
   → fallimento locale
3. Repair LLM: seconda call_gemini(_JSON_REPAIR_SYSTEM_PROMPT, response_text)
   → validate_and_repair_json(repair_text) → OK (json_repaired: "llm")
   → fallimento → 422 JsonValidationFailed
```

Quando il repair ha successo, `response` contiene la versione riparata.  
La versione originale Gemini è inclusa in `raw_response` nel body del 422.

---

## Response 200

```json
{
  "response":       "Un esempio pratico di SEO off-page è ottenere backlink da siti autorevoli...",
  "model":          "gemini-2.5-flash",
  "characters":     520,
  "usage": {
    "prompt_tokens":     210,
    "completion_tokens": 130,
    "total_tokens":      340
  },
  "json_validated": true,
  "json_repaired":  "none"
}
```

| Campo | Tipo | Condizione | Descrizione |
|---|---|---|---|
| `response` | `string` | sempre | Testo della risposta (eventualmente riparato) |
| `model` | `string` | sempre | Modello Gemini effettivamente usato |
| `characters` | `int` | sempre | Numero di caratteri della risposta |
| `usage` | `object\|null` | sempre | Token consumati. `null` se Gemini non restituisce usage. Include i token di eventuali chiamate di repair. |
| `usage.prompt_tokens` | `int\|null` | in `usage` | Token nel prompt (prima chiamata) |
| `usage.completion_tokens` | `int\|null` | in `usage` | Token nella risposta (prima chiamata) |
| `usage.total_tokens` | `int\|null` | in `usage` | Totale token — somma di tutte le chiamate (incluso repair LLM) |
| `json_validated` | `bool` | solo se `force_json_response=true` | Sempre `true` |
| `json_repaired` | `string` | solo se `force_json_response=true` | `"none"` / `"local"` / `"llm"` |

---

## Errori

| HTTP | `error` | Causa |
|---|---|---|
| `400` | `ValidationError` | `message` o `system_prompt` mancanti, UUID `user_id` non valido, `history` malformata |
| `400` | `InvalidBody` | Body non parsabile come JSON |
| `400` | `UnsupportedMediaType` | MIME del file non in allowlist |
| `400` | `InvalidDocx` | File `.docx` corrotto o impossibile da leggere |
| `400` | `EmptyDocx` | `.docx` senza testo estraibile |
| `401` | — | Bearer token assente o non valido |
| `413` | `PayloadTooLarge` | File > `MAX_UPLOAD_MB` MB |
| `422` | `JsonValidationFailed` | `force_json_response=true` e risposta non è JSON valido dopo tutti i tentativi. Body: `{"error":…,"raw_response":"…"}` |
| `429` | `RateLimitExceeded` | Rate limit IP superato |
| `500` | `ConfigError` | `GEMINI_API_KEY` mancante nel `.env` |
| `500` | `LLMError` | Errore chiamata Gemini |

---

## Variabili d'ambiente

| Variabile | Default | Descrizione |
|---|---|---|
| `GEMINI_API_KEY` | — | Chiave API Gemini (obbligatoria) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modello di default |
| `GEMINI_API_KEY_BACKUP` | *(vuoto)* | Chiave di backup usata automaticamente in caso di rate limit (429) sulla primaria |
| `RATE_LIMIT_MESSAGES_PER_MIN` | `5` | Max richieste per IP al minuto (condiviso con `/messages`) |
| `MAX_UPLOAD_MB` | `20` | Limite dimensione file allegato (MB) |
| `MAIL_NOTIFICATION` | *(vuoto)* | Se impostato, invia email di notifica non-bloccante con payload completo in entrata (system_prompt, context, history, parts, metadata) e risposta in uscita (response, model, token, json_repaired) |

---

## Email di notifica

Inviata a `MAIL_NOTIFICATION` per ogni chiamata riuscita (anche in caso di repair JSON).  
Non bloccante: un errore SMTP non interrompe la risposta al client.

**Soggetto**: `[chat/completions] {primi 80 char del message}`

**Corpo** (sezioni in ordine):
1. Informazioni utente (se `user_id`: username, email da `get_user_profile`, user_id)
2. Modello + `force_json_response`
3. `metadata` (se presente)
4. System prompt
5. Context (se presente)
6. History (se presente, troncata a 200 char/turno)
7. Content parts (testo o indicazione `(binary part)`)
8. Risposta Gemini (troncata a 1500 char)
9. Token usage
10. `json_repaired` (se `force_json_response=true`)

---

## Esempi curl

### Completamento semplice (JSON)

```bash
curl -X POST https://api.example.com/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message":       "Riassumi i vantaggi del cloud computing in 3 bullet point",
    "system_prompt": "Sei un consulente IT. Rispondi sempre in JSON con la struttura {\"summary\": [\"...\", \"...\", \"...\"]}.",
    "metadata":      {"source": "myapp", "user_ref": "U123"}
  }'
```

### Conversazione multi-turn

```bash
curl -X POST https://api.example.com/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message":             "Approfondisci il terzo punto",
    "system_prompt":       "Sei un esperto di marketing digitale. Rispondi in italiano.",
    "force_json_response": false,
    "history": [
      {"role": "user",      "content": "Elenca 3 strategie di marketing digitale"},
      {"role": "assistant", "content": "1. SEO  2. Email marketing  3. Social media advertising"}
    ]
  }'
```

### Con file PDF (multipart)

```bash
curl -X POST https://api.example.com/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -F "message=Analizza questo documento e identifica i punti critici" \
  -F "system_prompt=Sei un analista. Rispondi in JSON con {\"critical_points\": [...]}." \
  -F "file=@report.pdf;type=application/pdf"
```

### Con file Word .docx

```bash
curl -X POST https://api.example.com/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -F "message=Riassumi il documento allegato" \
  -F "system_prompt=Sei un assistente di sintesi. Rispondi in JSON con {\"summary\": \"...\"}" \
  -F "file=@documento.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
```

### Con override credenziali utente

```bash
curl -X POST https://api.example.com/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message":       "Cosa è il machine learning?",
    "system_prompt": "Rispondi in modo conciso e tecnico.",
    "user_id":       "550e8400-e29b-41d4-a716-446655440000",
    "metadata":      {"app": "wandly", "feature": "chat"}
  }'
```

---

## File coinvolti

| File | Ruolo |
|---|---|
| `app/blueprints/v1/chat_routes.py` | Route handler `POST /chat/completions` |
| `app/blueprints/v1/schemas.py` | `ChatCompletionSchema` + `HistoryItem` |
| `app/blueprints/v1/routes.py` | Import `chat_routes` per registrazione blueprint |
| `services.py` | `call_gemini` (esteso con `history`), `validate_and_repair_json`, `extract_docx_text`, `get_user_profile` |
| `tasks/notifications.py` | `send_deploy_notification_email` per email notifica |

# WP Draft Generator — API Reference

Versione corrente: **0.44.0**

---

## Introduzione

**WP Draft Generator** è una REST API asincrona per generare bozze di post WordPress tramite Gemini AI. Riceve un prompt testuale (o un messaggio vocale via Telegram), genera un articolo con immagine di copertina usando Gemini, e lo pubblica come bozza su WordPress.

### Endpoint disponibili

| Metodo | URL | Autenticazione | Descrizione |
|--------|-----|----------------|-------------|
| `GET` | `/health` | nessuna | Health check — verifica connessione Redis |
| `POST` | `/wp-draft-generator/v1/create` | Bearer token | Crea task di generazione asincrono |
| `GET` | `/wp-draft-generator/v1/status/{task_id}` | Bearer token | Controlla stato di un task |
| `POST` | `/wp-draft-generator/v1/send/{blog_id}` | Bearer token | Invia titolo e contenuto a WordPress (sincrono) |
| `POST` | `/wp-draft-generator/v1/telegram` | Secret token header (opzionale) | Webhook bot Telegram |
| `POST` | `/wp-draft-generator/v1/update` | Bearer token | Deploy automatico via GitHub Actions |
| `POST` | `/wp-draft-generator/v1/otp-request` | nessuna | Richiesta OTP per login passwordless (Wandly) |
| `POST` | `/wp-draft-generator/v1/otp-verify` | nessuna | Verifica OTP e restituisce user_id (Wandly) |
| `GET` | `/wp-draft-generator/v1/blogs/{user_id}` | nessuna / Bearer token | Elenco blog attivi (pubblico o autenticato con credenziali) |
| `POST` | `/wp-draft-generator/v1/blogs/{user_id}` | Bearer token | Crea nuovo blog per l'utente |
| `GET` | `/wp-draft-generator/v1/blogs/{user_id}/{blog_id}` | Bearer token | Dettaglio blog con credenziali |
| `PATCH` | `/wp-draft-generator/v1/blogs/{user_id}/{blog_id}` | Bearer token | Aggiorna campi blog |
| `PATCH` | `/wp-draft-generator/v1/blogs/{user_id}/{blog_id}/default` | Bearer token | Imposta blog come predefinito |
| `DELETE` | `/wp-draft-generator/v1/blogs/{user_id}/{blog_id}` | Bearer token | Soft delete blog |
| `GET` | `/wp-draft-generator/v1/profile/{user_id}` | Bearer token | Profilo utente (id, chat_id, username, email, status, role) |
| `PATCH` | `/wp-draft-generator/v1/profile/{user_id}` | Bearer token | Aggiorna username e/o email |
| `GET` | `/wp-draft-generator/v1/users` | Bearer token + X-Admin-User-Id (admin) | Lista tutti gli utenti con filtri opzionali |
| `POST` | `/wp-draft-generator/v1/users` | Bearer token + X-Admin-User-Id (admin) | Crea nuovo utente |
| `GET` | `/wp-draft-generator/v1/users/{user_id}` | Bearer token + X-Admin-User-Id (admin) | Dettaglio singolo utente |
| `PATCH` | `/wp-draft-generator/v1/users/{user_id}` | Bearer token + X-Admin-User-Id (admin) | Aggiorna utente (inclusi status, role, plan) |
| `DELETE` | `/wp-draft-generator/v1/users/{user_id}` | Bearer token + X-Admin-User-Id (admin) | Soft delete utente (status='inactive') |
| `POST` | `/wp-draft-generator/v1/messages` | Bearer token | Proxy sincrono LLM con salvataggio sessione opzionale |
| `GET` | `/wp-draft-generator/v1/sessions` | Bearer token | Lista sessioni di chat dell'utente |
| `GET` | `/wp-draft-generator/v1/sessions/{session_id}` | Bearer token | Dettaglio sessione con messaggi |
| `PATCH` | `/wp-draft-generator/v1/sessions/{session_id}` | Bearer token | Aggiorna titolo sessione |
| `GET` | `/wp-draft-generator/v1/prompts/{user_id}` | Bearer token | Lista system prompt attivi dell'utente |
| `POST` | `/wp-draft-generator/v1/prompts/{user_id}` | Bearer token | Crea nuovo system prompt |
| `PUT` | `/wp-draft-generator/v1/prompts/{user_id}/{prompt_id}` | Bearer token | Aggiorna label/testo prompt |
| `PATCH` | `/wp-draft-generator/v1/prompts/{user_id}/{prompt_id}/default` | Bearer token | Imposta prompt come predefinito |
| `DELETE` | `/wp-draft-generator/v1/prompts/{user_id}/{prompt_id}` | Bearer token | Soft delete prompt |

### Base URL

```
http://localhost:5000
```

Gli endpoint versioned (`/create`, `/status`, `/telegram`) sono sotto:

```
http://localhost:5000/wp-draft-generator/v1
```

### Flusso tipico

```
1. POST /create  →  202 Accepted  {"task_id": "..."}
2. GET  /status/{task_id}  →  {"status": "processing"...}
3. GET  /status/{task_id}  →  {"status": "completed", "post_link": "..."}
```

Via Telegram:

```
Messaggio bot  →  POST /telegram (webhook automatico)  →  Pipeline avviata
                                                          Notifiche step-by-step in chat
```

---

## Autenticazione

> **Nota:** `GET /health` e `POST /telegram` **non** richiedono Bearer token. `POST /update` usa lo stesso Bearer token di `/create`.

Tutti gli altri endpoint richiedono un Bearer token nell'header `Authorization`:

```
Authorization: Bearer <API_AUTH_TOKEN>
```

Il token viene configurato nel file `.env` del server tramite `API_AUTH_TOKEN`.
Richieste senza token o con token non valido ricevono `401 Unauthorized`.

---

## Rate Limiting

### Endpoint `/create` (Bearer token)

Il limite è applicato per **Bearer token** (non per IP), quindi ogni client ha la propria quota separata.

- Default: **3 richieste per ora** per token
- Configurabile nel server tramite `RATE_LIMIT_PER_HOUR` nel `.env`
- Al superamento del limite: `429 Too Many Requests`

### Endpoint `/telegram` (chat_id via Redis)

Il webhook Telegram usa un rate limiting separato basato sul **chat_id**, implementato via Redis (non Flask-Limiter):

- **Al minuto**: max `RATE_LIMIT_PER_MIN` richieste per chat_id (default: **1/min**)
- **Giornaliero**: max `RATE_LIMIT_DAILY_TELEGRAM` generazioni per chat_id per 24h (default: **3/giorno**)
- I messaggi rifiutati per validazione preliminare (comandi `/`, testo corto, vocale breve) **non** consumano quota
- Al superamento: risposta `200 OK` con messaggio informativo in chat (requisito Telegram)

---

## Endpoint

### `GET /health`

Health check dell'applicazione. Verifica la connessione a Redis. Non richiede autenticazione.

#### Request

```
GET /health
```

#### Response

**200 OK** — tutti i servizi raggiungibili:

```json
{
  "status": "ok",
  "version": "0.13.0",
  "checks": {
    "redis": "ok"
  }
}
```

**503 Service Unavailable** — uno o più servizi non raggiungibili:

```json
{
  "status": "degraded",
  "version": "0.13.0",
  "checks": {
    "redis": "error: Connection refused."
  }
}
```

---

### `POST /create`

Crea un nuovo task di generazione in modo **asincrono**. Risponde immediatamente `202 Accepted` e processa in background con Celery.

#### Request

```
POST /wp-draft-generator/v1/create
Content-Type: application/json
Authorization: Bearer <token>
```

#### Parametri Body (JSON)

##### Obbligatori

| Campo | Tipo | Vincolo | Descrizione |
|---|---|---|---|
| `GEMINI_API_KEY` | `string` | min 20 caratteri | API key Google AI (da [aistudio.google.com](https://aistudio.google.com)) |
| `WP_URL` | `string` | URL valido `https://...` | URL base del sito WordPress (es. `https://miosito.com`) |
| `WP_USERNAME` | `string` | min 1 carattere | Username WordPress |
| `WP_APP_PASSWORD` | `string` | min 20 caratteri | Application Password WordPress (formato: `xxxx xxxx xxxx xxxx xxxx`) |
| `PROMPT` | `string` | min 10 caratteri | Argomento o testo sorgente da trasformare in articolo |

##### Opzionali — modelli AI

Se omessi vengono usati i modelli di default.

| Campo | Default | Descrizione |
|---|---|---|
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modello Gemini per generazione testo articolo |
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash-image` | Modello Gemini per generazione immagine copertina |

##### Opzionali — prompt di sistema

Se omessi, il worker legge i file `.txt` nella root del server. Se il file è mancante **e** il campo non è fornito, il task fallisce con errore `ConfigError`.

| Campo | Default (file server) | Descrizione |
|---|---|---|
| `SYSTEM_PROMPT` | `system_prompt.txt` | Istruzioni per Gemini: stile, formato, struttura dell'articolo |
| `SYSTEM_PROMPT_IMAGE` | `system_prompt_image_generator.txt` | Istruzioni per Gemini: come descrivere l'immagine di copertina |

##### Opzionali — override notifiche

Sovrascrivono i valori `MAIL_NOTIFICATION` e `TELEGRAM_CHAT_ID` configurati nel `.env` del server, limitatamente a questa singola richiesta.

| Campo | Descrizione |
|---|---|
| `MAIL_NOTIFICATION` | Email destinatario notifica completamento (sovrascrive `.env`) |
| `TELEGRAM_CHAT_ID` | Chat ID Telegram destinatario (sovrascrive `.env`) |

#### Response

**202 Accepted** — task creato, elaborazione avviata

```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "accepted"
}
```

Usa `task_id` per monitorare l'avanzamento con `GET /status/{task_id}`.

#### Errori

| Codice | Causa |
|---|---|
| `400 Bad Request` | JSON malformato o validazione Pydantic fallita |
| `401 Unauthorized` | Token assente o non valido |
| `429 Too Many Requests` | Superato il limite orario per questo token |

---

### `GET /status/{task_id}`

Recupera lo stato di avanzamento o il risultato di un task.

#### Request

```
GET /wp-draft-generator/v1/status/{task_id}
Authorization: Bearer <token>
```

#### Response

**200 OK** — task trovato (uno dei quattro stati)

**accepted** — in coda, non ancora avviato:
```json
{
  "status": "accepted",
  "created_at": "2026-02-17T10:00:00Z"
}
```

**processing** — in elaborazione:
```json
{
  "status": "processing",
  "started_at": "2026-02-17T10:00:05Z"
}
```

**completed** — completato con successo:
```json
{
  "status": "completed",
  "post_id": 42,
  "post_link": "https://miosito.com/?p=42",
  "media_id": 99,
  "completed_at": "2026-02-17T10:02:30Z"
}
```

**failed** — fallito (definitivo o in attesa di retry Celery):
```json
{
  "status": "failed",
  "error_type": "GeminiError",
  "error": "Descrizione errore",
  "failed_at": "2026-02-17T10:01:10Z"
}
```

**404 Not Found** — task non esistente o scaduto (TTL 24h):
```json
{
  "error": "Task not found",
  "message": "Il task <id> non esiste o è scaduto (TTL 24h)"
}
```

---

### `POST /send/{blog_id}`

Invia titolo e contenuto a WordPress in modo **sincrono**, usando le credenziali del blog specificato. Non usa Celery né Redis: risponde direttamente con l'esito della chiamata WordPress.

Utile per integrazioni che già dispongono del contenuto (es. output di un modello AI esterno) e vogliono solo pubblicarlo su WordPress senza passare per la pipeline completa di generazione.

#### Request

```
POST /wp-draft-generator/v1/send/{blog_id}
Content-Type: application/json
Authorization: Bearer <token>
```

#### Parametri Path

| Campo | Tipo | Descrizione |
|---|---|---|
| `blog_id` | `string (UUID)` | UUID del blog su cui pubblicare (`generations_user_blogs.id`) |

#### Parametri Body (JSON)

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `user_id` | `string (UUID)` | sì | UUID utente (`generations_user.id`) — verifica ownership del blog |
| `title` | `string` | sì | Titolo del post WordPress (max 500 caratteri) |
| `content` | `string` | sì | Contenuto HTML del post |
| `status` | `string` | no (default: `"draft"`) | Stato del post: `draft` \| `publish` \| `pending` \| `private` |
| `excerpt` | `string` | no | Estratto/sommario del post (tag `<p>` accettato) |
| `categories` | `array` | no | Categorie WordPress: lista di ID interi **oppure** nomi/slug stringa. Le stringhe vengono risolte in ID via WP REST API (auto-create se non esistono). Es: `[3, "Cucina italiana"]` (v0.42.0) |
| `tags` | `array` | no | Tag WordPress: lista di ID interi **oppure** nomi/slug stringa. Stessa logica di `categories`. Es: `["pasta", 12, "carbonara"]` (v0.42.0) |
| `session_id` | `string (UUID)` | no | UUID sessione che ha generato il contenuto. Se fornito, dopo il publish con successo la sessione viene marcata pubblicata in `generations_sessions` (`published_at`, `published_blog_id`). (v0.39.0) |
| `message_id` | `integer` | no | BIGINT id del messaggio assistant (`generations_messages.id`). Se fornito assieme a `session_id` viene salvato come `published_message_id`. (v0.39.0) |

#### Esempio Request

```bash
curl -X POST https://tuoserver.com/wp-draft-generator/v1/send/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Come fare la pasta carbonara autentica",
    "content": "<p>La carbonara è uno dei piatti più amati della cucina romana...</p>",
    "status": "draft",
    "excerpt": "Guida definitiva alla carbonara tradizionale romana.",
    "categories": [3, "Ricette"],
    "tags": ["pasta", "carbonara", 42],
    "session_id": "660e8400-e29b-41d4-a716-446655440001",
    "message_id": 42
  }'
```

#### Response

**200 OK** — post creato con successo:

```json
{
  "post_id": 42,
  "post_url": "https://miosito.com/?p=42",
  "status": "draft",
  "resolved_categories": [3, 7],
  "resolved_tags": [12, 45, 99],
  "session_published": true
}
```

> `resolved_categories` e `resolved_tags` sono presenti solo se i rispettivi campi erano nel body; contengono gli ID WP interi usati al momento del publish (v0.42.1).  
> `session_published` è presente solo se `session_id` era nel body. `true` se la sessione è stata marcata correttamente, `false` se la verifica di ownership è fallita o l'aggiornamento Supabase è fallito (non bloccante).

#### Errori

| Codice | Causa |
|---|---|
| `400 Bad Request` | `blog_id` non è un UUID valido, o body non conforme (campo mancante, `status` non valido, elemento non int/string in `categories`/`tags`) |
| `401 Unauthorized` | Token assente o non valido |
| `404 Not Found` | Blog non trovato, non attivo, o `user_id` non è il proprietario |
| `502 Bad Gateway` | Errore nella comunicazione con WordPress: connessione, timeout, HTTP error durante la pubblicazione del post **oppure** durante la risoluzione/creazione di categorie e tag (richiede che l'utente WP abbia capability `manage_categories`) |

---

### `POST /telegram`

Webhook per bot Telegram. Riceve aggiornamenti dall'API Telegram e avvia la pipeline di generazione contenuti usando le **credenziali WordPress del blog predefinito** lette da Supabase (`generations_user_blogs`). Le credenziali Gemini vengono risolte con priorità: (1) override per-utente da `generations_user` (`gemini_api_key`, `gemini_model`), (2) `.env` del server (v0.32.0).

Non richiede Bearer token. Autenticazione opzionale tramite header `X-Telegram-Bot-Api-Secret-Token`.

#### Configurazione webhook su Telegram

Registra l'URL del webhook tramite l'API Telegram (eseguire una volta):

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_API>/setWebhook" \
  -d "url=https://tuoserver.com/wp-draft-generator/v1/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

#### Request

```
POST /wp-draft-generator/v1/telegram
Content-Type: application/json
X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>   ← opzionale
```

Il body è l'oggetto `Update` standard dell'API Telegram, inviato automaticamente da Telegram.

#### Ordine dei controlli

Il webhook esegue i controlli in questo ordine. I passi 1-3 non consumano quota rate limit.

| # | Controllo | Risposta se non supera |
|---|---|---|
| 1 | Validazione `X-Telegram-Bot-Api-Secret-Token` | `401 Unauthorized` |
| 2 | Parse JSON + estrazione `chat_id`, `username` | `200 OK` (silenzioso) |
| 3 | **Verifica utente abilitato in Supabase** (vedi sotto) | `200 OK` + "🚫 Utente non abilitato..." |
| 4 | **Validazioni messaggio** (vedi sotto) | `200 OK` + messaggio informativo |
| 5 | Rate limit al minuto per `chat_id` | `200 OK` + "⏱️ Attendi un momento..." |
| 6 | Rate limit giornaliero per `chat_id` | `200 OK` + "📅 Hai raggiunto il limite..." |
| 7 | Task attivo per `chat_id` (una pipeline alla volta) | `200 OK` + "⏳ C'è già una pipeline..." |
| 8 | Verifica `GEMINI_API_KEY` nel `.env` | `200 OK` + "❌ Configurazione incompleta" |
| 9 | Download e trascrizione audio (solo vocali) | `200 OK` + "❌ Errore elaborazione" |
| 10 | Dispatch Celery + registrazione task attivo Redis | `200 OK` + "🚀 Generazione avviata" |

#### Verifica utente abilitato (passo 3)

Prima di qualsiasi altra elaborazione, il webhook esegue una verifica in due passi:

**Passo 3a — Verifica utente** (`generations_user`):

**Auto-inserimento al primo contatto:** se il `chat_id` non è presente nella tabella, il webhook lo inserisce automaticamente con `chat_id` e `username` (non-bloccante). L'admin trova la riga pronta e deve aggiungere un blog in `generations_user_blogs` per abilitare l'utente.

Il webhook blocca l'utente se:

- Il `chat_id` **non esiste** nella tabella (viene comunque auto-inserito per l'admin)
- Il campo `status` è diverso da `'active'`

In questo caso il webhook risponde con:

```
🚫 Utente non abilitato. Contattare l'amministratore del sistema.
```

**Passo 3b — Verifica blog predefinito** (`generations_user_blogs`):

Dopo la verifica utente, il webhook recupera il **blog predefinito** dell'utente (`is_default = true AND is_active = true`) dalla tabella `generations_user_blogs`. Se non trovato:

```
🚫 Nessun blog configurato. Contattare l'amministratore del sistema.
```

Se la verifica ha successo, le credenziali WordPress (`wp_url`, `wp_username`, `wp_app_password`) vengono lette dal blog predefinito in `generations_user_blogs` e usate per la pipeline, anziché dal `.env` del server.

#### Validazioni preliminari (passo 4)

| Tipo messaggio | Condizione | Risposta |
|---|---|---|
| Testo | Inizia con `/` (comando bot) | Risposta dedicata per comando (vedi tabella comandi) |
| Testo | Lunghezza < 50 caratteri | `📝 Il prompt è troppo corto, prova con qualcosa di più specifico` |
| Vocale | Durata < 3 secondi | `🎤 Il vocale che hai mandato è molto breve, prova con qualcosa di più specifico` |
| Altro tipo | Foto, documenti, sticker, ecc. | `ℹ️ Invia un messaggio di testo o un vocale` |

#### Comandi bot Telegram (passo 4 — non consumano quota)

I comandi vengono gestiti dopo la verifica utente (passo 3), quindi `user_opts` è disponibile. Non consumano il rate limit.

| Comando | Comportamento |
|---|---|
| `/start`, `/help` | Istruzioni uso bot con template prompt di esempio |
| `/info` | Mostra username, status, blog predefinito (label + URL), email dell'utente |
| `/history` | Ultime 3 generazioni: data, prompt (troncato a 80 chars), link, stato (da `generations`) |
| `/last` | Ultimo prompt inviato (troncato a 300 chars, da `generations`) |
| `/blog` | Keyboard dinamica con i blog reali dell'utente (da `generations_user_blogs`). Il blog predefinito è marcato con ★. |
| `/onboard` | Flusso guidato multi-step: selezione blog → selezione system prompt (state machine Redis) |
| `/system_prompt` | Inline keyboard per selezione system prompt. I `callback_query` vengono gestiti. |
| `/setup`, `/add`, `/init` | "⚙️ Funzione non ancora implementata." |
| Comando sconosciuto | "❓ Comando non riconosciuto. Usa /help per le istruzioni." |

Per registrare i comandi sul bot (menu comandi Telegram): `python scripts/set_telegram_commands.py` (11 comandi totali)

#### Gestione `callback_query` (v0.15.0)

Quando l'utente preme un pulsante di una inline keyboard, Telegram invia un `callback_query` (non un `message`). Il webhook ora gestisce questi aggiornamenti prima del blocco messaggi normali:

| Scenario | Comportamento |
|---|---|
| `callback_data == 'null'` (Annulla) | Cancella stato onboard Redis + "❌ Operazione annullata." |
| Onboard attivo, step `awaiting_blog` | Salva blog selezionato, avanza a `awaiting_system_prompt`, invia keyboard `/system_prompt` |
| Onboard attivo, step `awaiting_system_prompt` | Completa flusso, invia "✅ Configurazione completata!" + riepilogo |
| Nessun onboard attivo | Echo: "✅ Hai selezionato: `{cb_data}`" |

`answerCallbackQuery` viene sempre chiamata per chiudere l'animazione di caricamento del pulsante.

**Redis state machine `/onboard`:** `telegram:onboard:{chat_id}` → `{"step": "awaiting_blog"|"awaiting_system_prompt", "blog_selection": "..."}`, TTL 1800s.

#### Tipi di messaggio gestiti

| Tipo Telegram | Comportamento |
|---|---|
| `message.text` | Il testo viene usato direttamente come `PROMPT` per la pipeline (min 50 caratteri) |
| `message.voice` | Scarica il file OGG, trascrive con `gemini-2.5-flash`, usa la trascrizione come `PROMPT` (min 3s) |
| Altri tipi (foto, documenti, sticker, ecc.) | Risponde con messaggio di istruzione, nessun task avviato |

#### Prevenzione pipeline concorrenti

Un solo task per `chat_id` alla volta. La chiave Redis `telegram:active_task:{chat_id}` (TTL 2 ore) blocca nuove richieste finché la pipeline non è completata (successo o fallimento). Il cleanup avviene automaticamente al completamento del worker Celery.

#### Variabili `.env` richieste (server-side)

Le credenziali Gemini vengono risolte con priorità: (1) override per-utente da `generations_user` (`gemini_api_key`, `gemini_model`), (2) `.env` del server. Le credenziali WordPress (**`WP_URL`, `WP_USERNAME`, `WP_APP_PASSWORD`**) vengono lette per-utente da Supabase (`generations_user_blogs`) — non servono nel `.env` per il webhook Telegram.

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `GEMINI_API_KEY` | **sì** | API key Google AI per trascrizione audio e pipeline |
| `GEMINI_MODEL` | no | Modello Gemini testo (default: `gemini-2.5-flash`) |
| `GEMINI_IMAGE_MODEL` | no | Modello Gemini immagini (default: `gemini-2.5-flash-image`) |
| `TELEGRAM_BOT_API` | **sì** | Token bot Telegram (per download audio e notifiche) |
| `TELEGRAM_CHAT_ID` | no | Chat ID canale notifiche (notifica "richiesta ricevuta") |
| `TELEGRAM_WEBHOOK_SECRET` | no (consigliata) | Secret token per validazione header Telegram |
| `RATE_LIMIT_PER_MIN` | no | Rate limit al minuto per chat_id (default: `1`) |
| `RATE_LIMIT_DAILY_TELEGRAM` | no | Rate limit giornaliero per chat_id (default: `3`) |

#### Credenziali WordPress per-utente (Supabase)

Le credenziali WordPress vengono lette dalla tabella `generations_user` in base al `chat_id` del mittente:

| Campo Supabase | Descrizione |
|---|---|
| `wp_url` | URL base WordPress (es. `https://miosito.com`) |
| `wp_username` | Username WordPress |
| `wp_app_password` | Application Password WordPress |

Tutti e tre i campi devono essere valorizzati e `status` deve essere `'active'` affinché il webhook accetti la richiesta.

#### Flusso messaggi vocali

```
Telegram → POST /telegram
               │
               ├─ Validazione secret token (se configurato)
               ├─ Parse update JSON + estrazione chat_id, username
               ├─ Verifica utente abilitato in Supabase (generations_user)
               │   └─ Se non abilitato → "🚫 Utente non abilitato..."
               ├─ Identifica voice message
               ├─ Validazione durata (< 3s → rifiuto senza consumo quota)
               ├─ Rate limit minuto + giornaliero per chat_id
               ├─ Controllo task attivo per chat_id
               ├─ Verifica GEMINI_API_KEY nel .env
               ├─ Notifica mittente: "🎤 Vocale ricevuto, trascrizione in corso..."
               ├─ Download file OGG da Telegram (getFile + download)
               ├─ Trascrizione con Gemini (audio inline → testo)
               ├─ Notifica mittente: "📝 Trascrizione completata: ..."
               ├─ Notifica canale .env: "📨 Richiesta ricevuta via webhook Telegram"
               ├─ Salva params in Redis (WP creds da Supabase, Gemini da .env, PROMPT = trascrizione)
               ├─ Registra task attivo: telegram:active_task:{chat_id} (TTL 2h)
               ├─ Dispatch task Celery
               └─ Notifica mittente: "🚀 Generazione avviata, Task: <id>"
                          │
                          ▼
               Pipeline standard (come /create):
               Gemini → WordPress → immagine → notifiche step-by-step al mittente
                          │
                          ▼
               Al completamento (successo o fallimento):
               Rimozione automatica telegram:active_task:{chat_id} da Redis
```

#### Notifiche al mittente

Le notifiche step-by-step della pipeline (⚙️ 📝 ✅ 🎨 🖼️ 📤 🎉 ❌) vengono inviate **al chat del mittente** (non al canale `.env`), perché il `TELEGRAM_CHAT_ID` viene automaticamente sovrascritto con il `chat_id` del messaggio ricevuto.

#### Response

**200 OK** — sempre (Telegram richiede risposta entro 60 secondi)

```json
{"ok": true}
```

**401 Unauthorized** — solo se `TELEGRAM_WEBHOOK_SECRET` è configurato e l'header non corrisponde

```json
{"error": "Unauthorized"}
```

#### Errori gestiti (non bloccanti)

In caso di errore, il webhook risponde comunque `200 OK` e invia un messaggio di errore al mittente:

| Situazione | Messaggio mittente |
|---|---|
| Variabili `.env` mancanti | `❌ Configurazione server incompleta` |
| Errore download file audio | `❌ Errore elaborazione vocale` |
| Errore trascrizione Gemini | `❌ Errore trascrizione vocale` |

---

## System Prompt personalizzati

Ogni utente può configurare uno o più **system prompt** personalizzati, con uno impostato come predefinito. Il prompt predefinito viene usato automaticamente:
- **Pipeline Telegram**: sostituisce `prompts/system_prompt.txt`
- **POST /messages**: se `system_prompt` non è fornito nel body e `user_id` è presente

Tutti gli endpoint richiedono autenticazione Bearer token.

---

### GET /prompts/{user_id}

Restituisce la lista dei system prompt attivi dell'utente, ordinata per default → data creazione.

**Autenticazione**: Bearer token (header `Authorization: Bearer <token>`)
**CORS**: abilitato

```
GET /wp-draft-generator/v1/prompts/{user_id}
```

**Risposta 200 OK**

```json
{
  "prompts": [
    {
      "id": "uuid",
      "label": "Articoli Blog",
      "prompt_text": "Sei un copywriter esperto...",
      "is_default": true,
      "created_at": "2026-03-26T10:00:00Z",
      "updated_at": "2026-03-26T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST /prompts/{user_id}

Crea un nuovo system prompt per l'utente.

**Autenticazione**: Bearer token
**CORS**: abilitato

```
POST /wp-draft-generator/v1/prompts/{user_id}
Content-Type: application/json
```

**Request Body**

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|-------------|-------------|
| `label` | string | ✅ | Etichetta descrittiva (max 100 chars) |
| `prompt_text` | string | ✅ | Contenuto del system prompt (min 10 chars) |
| `is_default` | boolean | ❌ | Se `true`, imposta come predefinito (default: `false`) |

```json
{
  "label": "Articoli SEO",
  "prompt_text": "Sei un esperto SEO. Scrivi articoli ottimizzati per i motori di ricerca...",
  "is_default": true
}
```

**Risposta 201 Created**

```json
{
  "prompt": {
    "id": "uuid",
    "label": "Articoli SEO",
    "is_default": true,
    "created_at": "2026-03-26T10:00:00Z"
  }
}
```

**Risposta 400 Bad Request** — validazione fallita

```json
{
  "error": "Validation failed",
  "message": "I dati forniti non sono validi",
  "details": [...]
}
```

**Risposta 500 Internal Server Error** — errore Supabase

```json
{
  "error": "DatabaseError",
  "message": "Errore durante la creazione del prompt"
}
```

---

### PUT /prompts/{user_id}/{prompt_id}

Aggiorna `label` e/o `prompt_text` di un prompt esistente. Almeno uno dei due campi deve essere presente.

**Autenticazione**: Bearer token
**CORS**: abilitato

```
PUT /wp-draft-generator/v1/prompts/{user_id}/{prompt_id}
Content-Type: application/json
```

**Request Body**

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|-------------|-------------|
| `label` | string | ❌ | Nuova etichetta (almeno uno tra label e prompt_text) |
| `prompt_text` | string | ❌ | Nuovo contenuto (almeno uno tra label e prompt_text) |

**Risposta 200 OK**

```json
{"status": "updated", "prompt_id": "uuid"}
```

**Risposta 404 Not Found**

```json
{"error": "NotFound", "message": "Prompt non trovato o non autorizzato"}
```

---

### PATCH /prompts/{user_id}/{prompt_id}/default

Imposta un prompt come predefinito per l'utente. Azzera automaticamente il default precedente.

**Autenticazione**: Bearer token
**CORS**: abilitato

```
PATCH /wp-draft-generator/v1/prompts/{user_id}/{prompt_id}/default
```

**Risposta 200 OK**

```json
{"status": "default_set", "prompt_id": "uuid"}
```

**Risposta 404 Not Found**

```json
{"error": "NotFound", "message": "Prompt non trovato o non autorizzato"}
```

---

### DELETE /prompts/{user_id}/{prompt_id}

Soft delete del prompt (`is_active=False`). Il record rimane in DB ma non è più visibile né usabile.

**Autenticazione**: Bearer token
**CORS**: abilitato

```
DELETE /wp-draft-generator/v1/prompts/{user_id}/{prompt_id}
```

**Risposta 200 OK**

```json
{"status": "deleted", "prompt_id": "uuid"}
```

**Risposta 404 Not Found**

```json
{"error": "NotFound", "message": "Prompt non trovato o già disattivato"}
```

---

### Integrazione con POST /messages

Se `system_prompt` non è fornito nel body ma `user_id` è presente, il backend carica automaticamente il prompt predefinito dell'utente:

| Priorità | Sorgente | Campo response |
|----------|----------|---------------|
| 1 | Body `system_prompt` | `"system_prompt_source": "request"` |
| 2 | Prompt default utente (DB) | `"system_prompt_source": "user_default"` |
| 3 | `prompts/system_prompt.txt` | `"system_prompt_source": "file_default"` |

La risposta di `/messages` include ora il campo `system_prompt_source` per trasparenza.

---

## Esempi

### Health check (curl)

```bash
curl http://localhost:5000/health
```

### Richiesta minima (5 campi)

```json
POST /wp-draft-generator/v1/create
Authorization: Bearer il_mio_token

{
  "GEMINI_API_KEY": "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
  "WP_URL": "https://miosito.com",
  "WP_USERNAME": "admin",
  "WP_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx",
  "PROMPT": "Scrivi un articolo sulla carbonara autentica romana: storia, ingredienti, procedimento."
}
```

I prompt di sistema vengono letti automaticamente da `system_prompt.txt` e `system_prompt_image_generator.txt` sul server.

---

### Richiesta completa

```json
POST /wp-draft-generator/v1/create
Authorization: Bearer il_mio_token

{
  "GEMINI_API_KEY": "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
  "GEMINI_MODEL": "gemini-2.5-flash",
  "GEMINI_IMAGE_MODEL": "gemini-2.5-flash-image",
  "WP_URL": "https://miosito.com",
  "WP_USERNAME": "admin",
  "WP_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx",
  "PROMPT": "Scrivi un articolo sulla carbonara autentica romana.",
  "SYSTEM_PROMPT": "Sei un copywriter esperto di cucina italiana. Genera un articolo completo con titolo nella prima riga e contenuto in HTML. Usa un tono professionale ma accessibile.",
  "SYSTEM_PROMPT_IMAGE": "Sei un esperto di food photography. Genera una descrizione dettagliata per un'immagine appetitosa: illuminazione, composizione, presentazione.",
  "MAIL_NOTIFICATION": "mio@email.com",
  "TELEGRAM_CHAT_ID": "123456789"
}
```

---

### Polling stato (JavaScript)

```javascript
async function waitForTask(taskId, token, intervalMs = 5000) {
  const url = `http://localhost:5000/wp-draft-generator/v1/status/${taskId}`;
  const headers = { Authorization: `Bearer ${token}` };

  while (true) {
    const res = await fetch(url, { headers });
    const data = await res.json();

    if (data.status === 'completed') {
      console.log('Post pubblicato:', data.post_link);
      return data;
    }
    if (data.status === 'failed') {
      throw new Error(`Task fallito: ${data.error_type} — ${data.error}`);
    }

    // accepted o processing: riprova tra intervalMs
    await new Promise(r => setTimeout(r, intervalMs));
  }
}
```

---

### Curl completo

```bash
# 1. Health check
curl http://localhost:5000/health

# 2. Crea task
RESPONSE=$(curl -s -X POST http://localhost:5000/wp-draft-generator/v1/create \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "GEMINI_API_KEY": "'$GEMINI_API_KEY'",
    "WP_URL": "'$WP_URL'",
    "WP_USERNAME": "'$WP_USERNAME'",
    "WP_APP_PASSWORD": "'$WP_APP_PASSWORD'",
    "PROMPT": "Scrivi un articolo sulla carbonara autentica romana."
  }')

TASK_ID=$(echo $RESPONSE | python -c "import sys,json; print(json.load(sys.stdin)['task_id'])")
echo "Task ID: $TASK_ID"

# 3. Controlla stato
curl -s http://localhost:5000/wp-draft-generator/v1/status/$TASK_ID \
  -H "Authorization: Bearer $API_AUTH_TOKEN" | python -m json.tool
```

---

## Flusso Pipeline

```
POST /create (202)
       │
       ▼
  Redis: salva params
  Redis: status = "accepted"
       │
       ▼
  Celery worker avviato
  Supabase: INSERT generations (status=processing)
  Redis: status = "processing"
       │
       ├─ Gemini: genera articolo        → Telegram: 📝
       ├─ WordPress: pubblica bozza      → Telegram: ✅
       ├─ Gemini: genera prompt immagine → Telegram: 🎨
       ├─ Gemini: genera PNG             → Telegram: 🖼️
       ├─ WordPress: upload media        → Telegram: 📤
       └─ WordPress: set featured image
       │
       ▼
  Redis: result (status=completed)
  Supabase: UPDATE status=completed
  Telegram: 🎉
  Email: notifica completamento
       │
       ▼
  GET /status/{task_id} → 200 completed
```

In caso di errore con `GeminiError` o `WordPressError`, Celery riprova automaticamente fino a 3 volte (countdown 5s). Dopo il terzo tentativo il task viene marcato `failed`.

---

## Notifiche

### Email

Inviata al completamento all'indirizzo configurato in `MAIL_NOTIFICATION` (`.env`) o nel parametro `MAIL_NOTIFICATION` della richiesta.

Contenuto: titolo articolo + link pubblico WordPress. Formato HTML + plain text.

### Telegram

Messaggi step-by-step durante la pipeline al `TELEGRAM_CHAT_ID` configurato (`.env` o parametro richiesta):

| Step | Messaggio |
|---|---|
| Avvio elaborazione | ⚙️ Elaborazione avviata + anteprima prompt |
| Articolo generato | 📝 Articolo generato + titolo |
| Post pubblicato | ✅ Post pubblicato + ID + link |
| Prompt immagine | 🎨 Prompt immagine creato |
| Immagine generata | 🖼️ Immagine generata |
| Immagine caricata | 📤 Immagine caricata + media ID |
| Completamento | 🎉 Pipeline completata + link |
| Errore | ❌ Pipeline fallita + tipo errore + contatore retry |

**Webhook Telegram** — notifiche aggiuntive inviate al mittente del messaggio:

| Evento | Messaggio |
|---|---|
| Utente non abilitato | 🚫 Utente non abilitato. Contattare l'amministratore del sistema. |
| Comando `/` ricevuto | ℹ️ Istruzioni uso bot con template prompt |
| Testo troppo corto | 📝 Il prompt è troppo corto... |
| Vocale troppo breve | 🎤 Il vocale è molto breve... |
| Rate limit al minuto | ⏱️ Attendi un momento prima di riprovare |
| Rate limit giornaliero | 📅 Hai raggiunto il limite giornaliero |
| Task attivo in corso | ⏳ C'è già una pipeline in elaborazione... |
| Vocale ricevuto | 🎤 Vocale ricevuto (Xs) — trascrizione in corso |
| Trascrizione completata | 📝 Trascrizione completata + anteprima testo |
| Richiesta accettata | 🚀 Generazione avviata + task ID |
| Errore configurazione | ❌ Configurazione server incompleta |
| Errore audio/trascrizione | ❌ Errore elaborazione vocale |

Notifica al **canale configurato** (TELEGRAM_CHAT_ID `.env`):

| Evento | Messaggio |
|---|---|
| Richiesta webhook ricevuta | 📨 Richiesta ricevuta via webhook Telegram + mittente + tipo + prompt |

---

## Archiviazione Supabase

### Tabella `generations`

Ogni generazione viene archiviata nella tabella `public.generations` con tutti i campi:
prompt, system prompt, contenuto generato, post_id, post_link, media_id, stato, timestamp.

**Colonna `user_id` (v0.14.0):** FK nullable verso `generations_user(id)`.
Viene popolata automaticamente per le generazioni avviate via webhook Telegram (`/telegram`).
Per le generazioni via API `/create` rimane NULL (nessun utente Telegram associato).
Consente query per-utente (comandi `/history`, `/last`, analytics futuri).

Vedi `database/migrations/001_create_generations_table.sql` e
`database/migrations/004_add_user_id_to_generations.sql` per lo schema completo.

### Tabella `generations_user` (v0.28.0, ex `generations_user`)

Contiene il profilo degli utenti del sistema (Telegram e frontend Wandly).

**Flusso di provisioning utenti:**
1. Al primo messaggio di un nuovo utente, il webhook inserisce automaticamente il record con `chat_id` e `username` (via `save_telegram_user_options()`, non-bloccante)
2. L'admin trova la riga in Supabase e aggiunge il blog predefinito in `generations_user_blogs`
3. L'utente può ora usare il webhook (il `status` di default è già `'active'`)

Per disabilitare un utente senza eliminare il record, impostare `status = 'inactive'`.

Campi principali:
- `chat_id` (UNIQUE NOT NULL) — identificatore chat Telegram
- `username` — @handle o first_name (aggiornato automaticamente ad ogni messaggio)
- `email` — indirizzo email opzionale (usato per OTP)
- `status` — `'active'` (default) o `'inactive'` — admin-only
- `role` — `'user'` (default) o `'admin'` — admin-only, non modificabile via API (v0.28.0)
- `plan` — `'basic'` (default), `'personal'` o `'pro'` — admin-only, non modificabile via API (v0.28.0)
- `total_tokens` — contatore cumulativo token totali consumati via POST /messages (v0.32.0)
- `gemini_model` — override opzionale del modello Gemini; se valorizzato ha priorità sul `.env` (v0.32.0)
- `gemini_api_key` — override opzionale della chiave API Gemini; se valorizzata ha priorità sul `.env` (v0.32.0)
- `created_at` — timestamp inserimento

Il webhook Telegram legge questa tabella come **prima operazione** tramite `get_telegram_user_options()` in `services.py`. Se l'utente non è `active`, la richiesta viene bloccata con messaggio "🚫 Utente non abilitato".

Vedi `database/migrations/003_create_generations_user.sql` per lo schema storico,
`database/migrations/012_rename_and_update_generations_user.sql` per il rename e i nuovi campi,
`database/migrations/013_add_tokens_and_gemini_fields.sql` per total_tokens e override Gemini.

### Tabella `generations_sessions` (v0.21.0)

Sessioni di conversazione chat. Ogni sessione appartiene a un utente e raggruppa una sequenza di messaggi.

Campi principali:
- `id` (UUID PK) — identificatore sessione, restituito in `POST /messages`
- `user_id` (FK → `generations_user.id`) — proprietario
- `title` — titolo descrittivo, modificabile via `PATCH /sessions/{id}`
- `context` — canale di origine (es. `wandly`, `api`) — per filtrare sessioni per applicazione
- `message_count` — contatore denormalizzato, aggiornato da `update_session_stats()`
- `last_message_at` — timestamp ultimo messaggio, usato per ordinare la lista
- `model` — ultimo modello Gemini usato
- `metadata` JSONB — attributi estensibili senza migration
- `is_archived` — soft delete (nascosta in lista, dati preservati)

RLS abilitata, nessuna policy aperta (solo `service_role` key del backend).

Vedi `database/migrations/009_create_generations_sessions.sql` per lo schema completo.

### Tabella `generations_messages` (v0.21.0)

Messaggi delle sessioni di chat. I messaggi sono immutabili per design (nessun UPDATE).

Campi principali:
- `id` (BIGINT IDENTITY PK) — ordinabile cronologicamente
- `session_id` (FK → `generations_sessions.id`) — sessione di appartenenza
- `user_id` (FK nullable → `generations_user.id`) — denormalizzato per query dirette
- `role` — `user`, `assistant` o `system`
- `content` — testo del messaggio
- `model` — modello usato (solo per `role=assistant`)
- `content_length` — lunghezza testo, colonna calcolata `STORED`
- `metadata` JSONB — informazioni aggiuntive: `tokens_used`, `finish_reason`, `latency_ms`

RLS abilitata, nessuna policy aperta (solo `service_role` key del backend).

Vedi `database/migrations/010_create_generations_messages.sql` per lo schema completo.

---

### `POST /update`

Endpoint per **deploy automatico** via GitHub Actions webhook.
Autentica il Bearer token, poi esegue in un thread background: `git pull` → notifica Telegram → `systemctl --user restart` dei servizi.

> **Nota di sicurezza:** il comando shell viene eseguito con lista di argomenti (nessun `shell=True`) — nessun rischio di command injection.

#### Request

```
POST /wp-draft-generator/v1/update
Authorization: Bearer <API_AUTH_TOKEN>
Content-Type: application/json
```

Body JSON non richiesto (può essere omesso o vuoto).

#### Response

**202 Accepted** — deploy avviato in background:

```json
{
  "status": "accepted",
  "message": "Deploy avviato in background"
}
```

**401 Unauthorized** — token mancante o non valido:

```json
{
  "error": "Unauthorized",
  "message": "Token di autenticazione invalido o mancante"
}
```

#### Comportamento background

Il thread avviato esegue in sequenza:

1. **`git pull`** nella directory `DEPLOY_DIR` (default: `~/projects/wp-draft-generator`)
2. **Notifica Telegram** con l'output del pull e stato "⏳ Riavvio in corso..."
3. **`systemctl --user restart`** di `DEPLOY_API_SERVICE` e `DEPLOY_WORKER_SERVICE`

> La notifica viene inviata **prima** del restart perché il riavvio termina il processo Flask stesso.

#### Variabili `.env` opzionali

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `DEPLOY_DIR` | `~/projects/wp-draft-generator` | Directory del progetto sul server |
| `DEPLOY_API_SERVICE` | `wp-draft-generator-api.service` | Nome servizio systemd API |
| `DEPLOY_WORKER_SERVICE` | `wp-draft-generator-worker.service` | Nome servizio systemd Worker |

#### GitHub Action

Il file `.github/workflows/deploy.yml` triggera questo endpoint ad ogni push sul branch `main`:

```yaml
- name: Chiama endpoint /update
  run: |
    curl -f -X POST https://chat.mavida.com/wp-draft-generator/v1/update \
      -H "Authorization: Bearer ${{ secrets.API_AUTH_TOKEN }}" \
      -H "Content-Type: application/json" \
      --max-time 30
```

**Setup GitHub Secret:** nel repository GitHub → Settings → Secrets and variables → Actions → New repository secret:
- Nome: `API_AUTH_TOKEN`
- Valore: lo stesso valore di `API_AUTH_TOKEN` nel `.env` del server

#### Esempio curl

```bash
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/update \
  -H "Authorization: Bearer PcPJlOlgjUUL8XxexA1S6pyhjXP/9seXFJyZP8XWCsk=" \
  -H "Content-Type: application/json"
```

#### Notifica Telegram ricevuta

```
🚀 Deploy automatico completato

Git pull:
Already up to date.

⏳ Riavvio servizi in corso...
```

---

### `POST /otp-request`

Endpoint **pubblico** per il flusso di autenticazione passwordless OTP del frontend Wandly.
Il backend genera il codice, lo salva su Supabase e lo invia via email. La **verifica** del codice avviene tramite l'endpoint [`POST /otp-verify`](#post-otp-verify).

> Non richiede autenticazione (nessun Bearer token). CORS abilitato per questo endpoint (configurabile via `CORS_ALLOWED_ORIGINS`).

#### Request

```
POST /wp-draft-generator/v1/otp-request
Content-Type: application/json
```

#### Parametri Body (JSON)

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| `email` | `string` | Sì | Email dell'utente. Normalizzata in lowercase dal backend. |

```json
{
  "email": "utente@esempio.com"
}
```

#### Response — Successo

**200 OK:**

```json
{
  "success": true
}
```

#### Response — Errore

Il frontend legge il campo `message` per mostrarlo come toast all'utente.

| Status | Scenario | `message` |
|--------|----------|-----------|
| `400` | Email mancante o formato non valido | `"Richiesta non valida: ..."` |
| `403` | Email non presente in `generations_user` | `"Email non autorizzata. Contatta l'amministratore."` |
| `429` | Rate limit per IP o per email superato | `"Troppi tentativi. Attendi qualche minuto prima di riprovare."` |
| `500` | Errore salvataggio sessione Supabase | `"Errore interno del server. Riprova."` |
| `500` | Errore invio email SMTP | `"Impossibile inviare il codice. Riprova tra qualche minuto."` |

> **Anti-enumeration:** il 403 per email non trovata è stato rimosso — l'endpoint risponde sempre `200` anche se l'email non è autorizzata, per non rivelare quali indirizzi sono registrati.

```json
{
  "message": "Troppi tentativi. Attendi qualche minuto prima di riprovare."
}
```

#### Flusso backend (dettaglio)

```
1. Valida email (Pydantic + regex)
2. Rate limit per IP: otp:ratelimit:ip:{ip}  — OTP_RATE_LIMIT_IP req / 900s (default: 10)
3. Rate limit per email: otp:ratelimit:{email} — OTP_RATE_LIMIT req / 900s (default: 3)
4. SELECT generations_user WHERE email ILIKE ?
   → email non trovata: risponde 200 senza inviare OTP (anti-enumeration)
5. secrets.randbelow(1_000_000):06d  → codice 6 cifre CSPRNG
6. UPSERT generations_user_sessions (id = user_id)  → invalida OTP precedente
7. SMTP sendmail  → email HTML con codice in evidenza
8. 200 { "success": true }
```

#### Flusso verifica (backend — `POST /otp-verify`)

La verifica del codice OTP avviene tramite l'endpoint backend [`POST /otp-verify`](#post-otp-verify), che sostituisce la verifica client-side diretta su Supabase.

#### Tabella `generations_user_sessions` (Supabase)

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `uuid` PK | = UUID utente (`generations_user.id`) — impostato dal backend |
| `email` | `text` | Email dell'utente |
| `otp_code` | `text` | Codice OTP a 6 cifre |
| `created_at` | `timestamptz` | Timestamp creazione |
| `expires_at` | `timestamptz` | `created_at + 10 minuti` |
| `is_used` | `boolean` | `false` → non usato; `true` → consumato |
| `user_id` | `uuid` FK | → `generations_user(id)` ON DELETE CASCADE |

> Vedi `database/migrations/005_create_generations_user_sessions.sql`.

#### Rate limiting

| Variabile `.env` | Default | Descrizione |
|-----------------|---------|-------------|
| `OTP_RATE_LIMIT_IP` | `10` | Max richieste OTP per indirizzo IP ogni 15 minuti |
| `OTP_RATE_LIMIT` | `3` | Max richieste OTP per email ogni 15 minuti |

#### CORS

L'endpoint è l'unico dell'API con CORS abilitato (necessario per le chiamate dal browser React).

| Variabile `.env` | Default | Descrizione |
|-----------------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | `*` | Origini consentite (virgola-separate). In produzione impostare il dominio del frontend. |

Esempio produzione: `CORS_ALLOWED_ORIGINS=https://app.wandly.com`

#### Esempi curl

```bash
# Richiesta OTP valida
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/otp-request \
  -H "Content-Type: application/json" \
  -d '{"email": "utente@esempio.com"}'

# Risposta attesa:
# {"success": true}
```

```bash
# Email non autorizzata
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/otp-request \
  -H "Content-Type: application/json" \
  -d '{"email": "sconosciuto@esempio.com"}'

# Risposta:
# HTTP 403
# {"message": "Email non autorizzata. Contatta l'amministratore."}
```

---

### `POST /otp-verify`

Endpoint **pubblico** per la verifica OTP (autenticazione passwordless Wandly).
Sostituisce la verifica client-side diretta su Supabase, centralizzando tutta la logica di autenticazione nel backend. Restituisce `user_id` e `email` al frontend dopo una verifica positiva.

> Non richiede autenticazione (nessun Bearer token). CORS abilitato per questo endpoint (stessa configurazione di `/otp-request`).

#### Request

```
POST /wp-draft-generator/v1/otp-verify
Content-Type: application/json
```

#### Parametri Body (JSON)

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| `email` | `string` | Sì | Email dell'utente. Normalizzata in lowercase. |
| `otp_code` | `string` | Sì | Codice OTP a 6 cifre ricevuto via email. |

```json
{
  "email":    "utente@esempio.com",
  "otp_code": "123456"
}
```

#### Response — Successo

**200 OK:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email":   "utente@esempio.com"
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `user_id` | `string` (UUID) | Identificativo univoco dell'utente — usare per tutte le chiamate successive (blog, profilo, sessioni, prompt). |
| `email` | `string` | Email dell'utente verificata. |

#### Response — Errore

Il frontend legge il campo `error` per mostrarlo come toast all'utente.

| Status | Scenario | `error` |
|--------|----------|---------|
| `400` | Email o otp_code mancanti / formato non valido | `"Parametri mancanti: email e otp_code sono obbligatori."` |
| `401` | OTP non trovato, scaduto o già usato | `"Codice non valido o scaduto."` |
| `429` | Rate limit per IP o per email superato | `"Troppi tentativi. Riprova tra qualche minuto."` |
| `500` | Errore database Supabase | `"Errore interno. Riprova."` |

```json
{
  "error": "Codice non valido o scaduto."
}
```

#### Flusso backend (dettaglio)

```
1. Valida email (regex + lowercase) e otp_code (6 cifre numeriche) via Pydantic
2. Rate limit per IP:    otp:verify:ratelimit:ip:{ip}  — OTP_VERIFY_RATE_LIMIT_IP req / 600s (default: 10)
3. Rate limit per email: otp:verify:ratelimit:{email}  — OTP_VERIFY_RATE_LIMIT req / 600s (default: 5)
4. SELECT generations_user_sessions
   WHERE email=? AND otp_code=? AND is_used=false AND expires_at > NOW()
   ORDER BY created_at DESC LIMIT 1
   → non trovata: 401
5. UPDATE generations_user_sessions SET is_used=true WHERE id=<session_id>
   → previene replay attack
6. 200 { "user_id": "...", "email": "..." }
```

#### Rate limiting

Finestra di 10 minuti (coerente con la durata dell'OTP). Chiavi Redis separate da `/otp-request` per non interferire.

| Variabile `.env` | Default | Descrizione |
|-----------------|---------|-------------|
| `OTP_VERIFY_RATE_LIMIT_IP` | `10` | Max tentativi di verifica per indirizzo IP ogni 10 minuti |
| `OTP_VERIFY_RATE_LIMIT` | `5` | Max tentativi di verifica per email ogni 10 minuti |

#### Note di sicurezza

| Aspetto | Implementazione |
|---------|----------------|
| OTP usa-e-getta | `is_used=true` immediato dopo verifica positiva (replay attack impossibile) |
| Scadenza OTP | 10 minuti (impostata da `/otp-request` al momento della generazione) |
| Rate limiting | Per IP + per email, finestra 10 min separata da `/otp-request` |
| Nessuna enumerazione | Risposta `401` generica per OTP errato, scaduto o già usato |
| HTTPS | Disponibile solo su HTTPS (garantito dall'infrastruttura) |

#### Esempi curl

```bash
# Verifica OTP valida
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"email": "utente@esempio.com", "otp_code": "123456"}'

# Risposta attesa:
# {"user_id": "550e8400-e29b-41d4-a716-446655440000", "email": "utente@esempio.com"}
```

```bash
# OTP errato o scaduto
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"email": "utente@esempio.com", "otp_code": "000000"}'

# Risposta:
# HTTP 401
# {"error": "Codice non valido o scaduto."}
```

```bash
# Replay attack (stesso codice già usato)
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"email": "utente@esempio.com", "otp_code": "123456"}'

# Risposta:
# HTTP 401
# {"error": "Codice non valido o scaduto."}
```

---

### `GET /blogs/{user_id}`

Restituisce l'elenco dei blog attivi associati a un utente dalla tabella `generations_user_blogs`.

**Autenticazione opzionale** — il comportamento cambia in base alla presenza del Bearer token:
- **Senza token** (pubblico): restituisce `{id, label, wp_url, is_default}` — CORS abilitato, usato dal frontend Wandly
- **Con token valido**: restituisce anche `wp_username`, `wp_app_password`, `is_active`, `created_at`

```
GET /wp-draft-generator/v1/blogs/{user_id}
# oppure (autenticato):
GET /wp-draft-generator/v1/blogs/{user_id}
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Path Parameter

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente (`generations_user.id`) |

#### Response 200 — lista blog (pubblico)

```json
{
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "count": 2,
  "authenticated": false,
  "blogs": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "label": "Blog principale",
      "wp_url": "https://blog.example.com",
      "is_default": true
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "label": "Blog secondario",
      "wp_url": "https://blog2.example.com",
      "is_default": false
    }
  ]
}
```

#### Response 200 — lista blog (autenticato)

```json
{
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "count": 2,
  "authenticated": true,
  "blogs": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "label": "Blog principale",
      "wp_url": "https://blog.example.com",
      "wp_username": "admin",
      "wp_app_password": "xxxx xxxx xxxx xxxx",
      "is_default": true,
      "is_active": true,
      "created_at": "2024-01-15T10:30:00+00:00"
    }
  ]
}
```

Se l'utente non ha blog configurati, la risposta è `200` con `count: 0` e `blogs: []`.

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `user_id` non è un UUID valido |

#### Esempio curl

```bash
# Pubblico (dati limitati)
curl https://chat.mavida.com/wp-draft-generator/v1/blogs/<USER_ID_UUID>

# Autenticato (dati completi)
curl -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  https://chat.mavida.com/wp-draft-generator/v1/blogs/<USER_ID_UUID>
```

---

### `POST /blogs/{user_id}`

Crea un nuovo blog per l'utente. Se `is_default` è `true`, il blog precedentemente predefinito viene automaticamente rimosso.

```
POST /wp-draft-generator/v1/blogs/{user_id}
Authorization: Bearer <API_AUTH_TOKEN>
Content-Type: application/json
```

#### Path Parameter

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente (`generations_user.id`) |

#### Request Body

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|-------------|-------------|
| `label` | `string` | ✅ | Etichetta descrittiva (es. "Blog Principale") |
| `wp_url` | `string` | ✅ | URL del sito WordPress (http/https) |
| `wp_username` | `string` | ✅ | Username WordPress REST API |
| `wp_app_password` | `string` | ✅ | Application Password WordPress |
| `is_default` | `boolean` | ❌ | `false` default — se `true` imposta come predefinito |

#### Response 201 — blog creato

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "label": "Blog Principale",
  "wp_url": "https://miosito.it",
  "is_default": true,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00+00:00"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | UUID non valido o campi obbligatori mancanti |
| `401 Unauthorized` | Bearer token assente o non valido |
| `500 Internal Server Error` | Errore Supabase |

#### Esempio curl

```bash
curl -X POST "https://chat.mavida.com/wp-draft-generator/v1/blogs/<USER_ID_UUID>" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Blog Principale",
    "wp_url": "https://miosito.it",
    "wp_username": "admin",
    "wp_app_password": "xxxx xxxx xxxx xxxx",
    "is_default": true
  }'
```

---

### `GET /blogs/{user_id}/{blog_id}`

Restituisce i dati completi di un blog incluse le credenziali WordPress.

```
GET /wp-draft-generator/v1/blogs/{user_id}/{blog_id}
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Path Parameters

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente (`generations_user.id`) |
| `blog_id` | `uuid` | UUID del blog (`generations_user_blogs.id`) |

#### Response 200

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "label": "Blog Principale",
  "wp_url": "https://miosito.it",
  "wp_username": "admin",
  "wp_app_password": "xxxx xxxx xxxx xxxx",
  "is_default": true,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00+00:00"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | UUID non validi |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Blog non trovato o non appartenente all'utente |

#### Esempio curl

```bash
curl "https://chat.mavida.com/wp-draft-generator/v1/blogs/<USER_ID>/<BLOG_ID>" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>"
```

---

### `PATCH /blogs/{user_id}/{blog_id}`

Aggiorna uno o più campi di un blog. Almeno un campo deve essere presente.

```
PATCH /wp-draft-generator/v1/blogs/{user_id}/{blog_id}
Authorization: Bearer <API_AUTH_TOKEN>
Content-Type: application/json
```

#### Path Parameters

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente |
| `blog_id` | `uuid` | UUID del blog |

#### Request Body (almeno un campo)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `label` | `string` | Nuova etichetta |
| `wp_url` | `string` | Nuovo URL WordPress (http/https) |
| `wp_username` | `string` | Nuovo username REST API |
| `wp_app_password` | `string` | Nuova Application Password |

#### Response 200

```json
{
  "message": "Blog aggiornato con successo",
  "blog_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | UUID non validi o nessun campo presente |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Blog non trovato o non autorizzato |

#### Esempio curl

```bash
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/blogs/<USER_ID>/<BLOG_ID>" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"label": "Blog SEO", "wp_url": "https://nuovourl.it"}'
```

---

### `PATCH /blogs/{user_id}/{blog_id}/default`

Imposta il blog specificato come predefinito per l'utente. Azzera automaticamente il default precedente (se esistente).

```
PATCH /wp-draft-generator/v1/blogs/{user_id}/{blog_id}/default
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Path Parameters

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente |
| `blog_id` | `uuid` | UUID del blog da impostare come predefinito |

#### Response 200

```json
{
  "message": "Blog impostato come predefinito",
  "blog_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | UUID non validi |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Blog non trovato o non autorizzato |

#### Esempio curl

```bash
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/blogs/<USER_ID>/<BLOG_ID>/default" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>"
```

---

### `DELETE /blogs/{user_id}/{blog_id}`

Soft delete del blog (`is_active=False`). Il record rimane nel DB. Se il blog era il predefinito, viene rimosso anche il flag `is_default`.

```
DELETE /wp-draft-generator/v1/blogs/{user_id}/{blog_id}
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Path Parameters

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente |
| `blog_id` | `uuid` | UUID del blog da eliminare |

#### Response 200

```json
{
  "message": "Blog eliminato con successo",
  "blog_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | UUID non validi |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Blog non trovato, non autorizzato o già eliminato |

#### Esempio curl

```bash
curl -X DELETE "https://chat.mavida.com/wp-draft-generator/v1/blogs/<USER_ID>/<BLOG_ID>" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>"
```

---

## Gestione profilo utente

### `GET /profile/{user_id}`

Restituisce il profilo completo dell'utente da `generations_user`.

```
GET /wp-draft-generator/v1/profile/{user_id}
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Path Parameter

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente (`generations_user.id`) |

#### Response 200

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "chat_id": "123456789",
  "username": "mario_rossi",
  "email": "mario@esempio.com",
  "status": "active",
  "role": "user",
  "plan": "basic",
  "total_tokens": 12500,
  "gemini_model": "gemini-2.5-flash",
  "gemini_api_key": "****abcd",
  "created_at": "2024-01-10T08:00:00+00:00"
}
```

| Campo | Descrizione |
|-------|-------------|
| `id` | UUID univoco dell'utente |
| `chat_id` | ID chat Telegram (stringa numerica) |
| `username` | Username Telegram o nome |
| `email` | Indirizzo email (opzionale) |
| `status` | `active` o `inactive` (admin-only) |
| `role` | `user` o `admin` (admin-only) |
| `plan` | `basic`, `personal` o `pro` (admin-only) |
| `total_tokens` | Contatore cumulativo token consumati via POST /messages (v0.32.0) |
| `gemini_model` | Override modello Gemini, `null` se non impostato (v0.32.0) |
| `gemini_api_key` | Override chiave API Gemini, **mascherato** (`****xxxx`), `null` se non impostato (v0.32.0) |
| `created_at` | Data primo accesso |

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `user_id` non è un UUID valido |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Utente non trovato |

#### Esempio curl

```bash
curl "https://chat.mavida.com/wp-draft-generator/v1/profile/<USER_ID_UUID>" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>"
```

---

### `PATCH /profile/{user_id}`

Aggiorna il profilo dell'utente. I campi `username`, `email`, `gemini_model` e `gemini_api_key` sono modificabili dall'utente; i campi `status`, `role` e `plan` sono admin-only (modificabili solo via `PATCH /users/{user_id}`).

```
PATCH /wp-draft-generator/v1/profile/{user_id}
Authorization: Bearer <API_AUTH_TOKEN>
Content-Type: application/json
```

#### Path Parameter

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | `uuid` | UUID dell'utente (`generations_user.id`) |

#### Request Body (almeno uno obbligatorio)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `username` | `string` | Nuovo username (max 255 caratteri) |
| `email` | `string` | Nuovo indirizzo email (normalizzato in lowercase) |
| `gemini_model` | `string` | Override modello Gemini (v0.32.0) |
| `gemini_api_key` | `string` | Override chiave API Gemini (v0.32.0) |

#### Response 200

```json
{
  "message": "Profilo aggiornato con successo",
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "username": "mario_rossi_new",
  "email": "mario.nuovo@esempio.com",
  "role": "user"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | UUID non valido, body vuoto, o email non valida |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Utente non trovato |

#### Esempio curl

```bash
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/profile/<USER_ID_UUID>" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"username": "mario_rossi_new", "email": "mario.nuovo@esempio.com"}'
```

---

### `POST /messages`

Proxy **sincrono** verso il modello Gemini. Invia un messaggio e restituisce direttamente la risposta del modello. Le credenziali Gemini vengono risolte con priorità: (1) override per-utente da `generations_user`, (2) `.env` del server.

Se `user_id` è fornito, la conversazione viene salvata su Supabase (non bloccante: un errore di salvataggio non blocca la risposta LLM). Se `session_id` è assente, viene creata automaticamente una nuova sessione e il suo UUID è restituito nella response.

Richiede Bearer token. CORS abilitato via `@cross_origin()`.

```
POST /wp-draft-generator/v1/messages
Content-Type: application/json
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Request Body

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| `message` | `string` | ✓ | Testo del messaggio da inviare al modello (min 1 char) |
| `system_prompt` | `string` | — | Istruzioni di sistema (default: `prompts/system_prompt.txt`) |
| `context` | `string` | — | Contesto aggiuntivo. Se presente viene iniettato sia nel messaggio sia nel system prompt prima della chiamata LLM (vedi sezione "Composizione messaggio"). I valori originali restano invariati nel DB. |
| `user_id` | `uuid` | — | UUID utente (`generations_user.id`). Se fornito, salva la conversazione. |
| `session_id` | `uuid` | — | UUID sessione esistente. Se assente con `user_id` presente, crea nuova sessione automaticamente. |
| `force_json_response` | `bool` | — | Default `true`. Se `true`, attiva la validazione/riparazione JSON della risposta Gemini (vedi sezione "Validazione JSON risposta"). Se `false`, la risposta è restituita così com'è. |

#### Request — multipart/form-data (file allegato)

Quando il client allega un file, la richiesta deve essere `multipart/form-data`. Tutti i campi testuali si inviano come campi form con gli stessi nomi e le stesse regole del path JSON.

```
POST /wp-draft-generator/v1/messages
Content-Type: multipart/form-data
Authorization: Bearer <API_AUTH_TOKEN>
```

| Campo form | Tipo | Obbligatorio | Descrizione |
|---|---|:---:|---|
| `message` | `string` | ✓ | Testo del messaggio (min 1 char) |
| `file` | `binary` | — | File da allegare. Inviato prima del testo a Gemini per analisi multimodale. |
| `system_prompt` | `string` | — | Istruzioni di sistema |
| `context` | `string` | — | Contesto aggiuntivo |
| `user_id` | `uuid` | — | UUID utente |
| `session_id` | `uuid` | — | UUID sessione esistente |
| `force_json_response` | `string` | — | `"true"` / `"false"` (default `"true"`). Convertito in bool lato server. |

**MIME ammessi per `file`:**

| MIME type | Descrizione | Consegna a Gemini |
|---|---|---|
| `text/plain` | Testo semplice | binario (`Part.from_bytes`) |
| `text/markdown` | Markdown | binario |
| `text/csv` | CSV | binario |
| `application/pdf` | PDF | binario |
| `image/jpeg` | JPEG | binario |
| `image/png` | PNG | binario |
| `image/webp` | WebP | binario |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Word `.docx` | **testo estratto** (`Part(text=...)`) |

MIME non in lista → `400 UnsupportedMediaType`.  
File > `MAX_UPLOAD_MB` MB (default 20) → `413 PayloadTooLarge`.

> **Nota `.docx`**: Gemini non interpreta i file Word nativamente. Il backend estrae il testo via `python-docx` (paragrafi + celle di tabella separate da ` | `) e lo passa come `Part(text=...)` racchiuso nei marker `[DOCUMENTO ALLEGATO: <filename>]` / `[FINE DOCUMENTO]`. Se il file è corrotto risponde `400 InvalidDocx`; se non contiene testo estraibile (solo immagini o vuoto) risponde `400 EmptyDocx`.

**Variabili d'ambiente opzionali:**

| Variabile | Default | Descrizione |
|---|---|---|
| `MAX_UPLOAD_MB` | `20` | Limite massimo dimensione file caricabile (MB) |
| `MAIL_DEBUG_MESSAGES` | *(vuoto — disabilitato)* | Se impostato, invia un'email non-bloccante con il payload completo di ogni chiamata Gemini (system prompt, content parts, risposta, token). Utile per debug di risposte anomale. Esempio: `MAIL_DEBUG_MESSAGES=maurizio@mavida.com` |

**Curl di esempio:**

```bash
# PDF con prompt
curl -X POST https://<host>/wp-draft-generator/v1/messages \
  -H "Authorization: Bearer <token>" \
  -F "message=Analizza questo brief e scrivi un articolo" \
  -F "user_id=<uuid>" \
  -F "file=@brief.pdf;type=application/pdf"

# Immagine PNG
curl -X POST https://<host>/wp-draft-generator/v1/messages \
  -H "Authorization: Bearer <token>" \
  -F "message=Descrivi questa immagine e scrivi un articolo" \
  -F "file=@foto.png;type=image/png"

# File Word .docx — testo estratto lato server e passato a Gemini
curl -X POST https://<host>/wp-draft-generator/v1/messages \
  -H "Authorization: Bearer <token>" \
  -F "message=Riassumi il documento allegato" \
  -F "file=@documento.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"

# Path JSON puro (invariato)
curl -X POST https://<host>/wp-draft-generator/v1/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "test senza file", "user_id": "<uuid>"}'
```

#### Composizione messaggio inviato all'AI

Il messaggio viene composto e inviato al modello Gemini tramite `client.models.generate_content()` con due parametri:

| Parametro SDK | Contenuto |
|---|---|
| `config.system_instruction` | **effective_system_prompt** (vedi sotto) |
| `contents` | **effective_message** (vedi sotto) |

**Risoluzione system prompt** (in ordine di priorità):

1. Campo `system_prompt` nel body della request → `system_prompt_source: "request"`
2. Prompt di default dell'utente su DB (`generations_user_prompts` con `is_default=true`) → `system_prompt_source: "user_default"`
3. File `prompts/system_prompt.txt` → `system_prompt_source: "file_default"`

**Iniezione contesto** — quando `context` è presente, viene aggiunto **solo come prefisso del messaggio**:

| Campo | Senza contesto | Con contesto |
|---|---|---|
| **effective_message** | `{message}` | `Contesto: {context}\n\n{message}` |
| **effective_system_prompt** | `{system_prompt}` | `{system_prompt}` (invariato) |

I valori originali (`message`, `system_prompt`) vengono salvati inalterati nel DB; il contesto viene salvato separatamente nel campo `metadata`.

**Risoluzione credenziali Gemini** (in ordine di priorità):

1. Override per-utente da `generations_user` (`gemini_api_key`, `gemini_model`) — se `user_id` fornito e campi valorizzati
2. Variabili `.env` del server (`GEMINI_API_KEY`, `GEMINI_MODEL`)

#### Response 200

```json
{
  "response": "Il SEO (Search Engine Optimization) è l'insieme delle tecniche...",
  "model": "gemini-2.5-flash",
  "characters": 342,
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "system_prompt_source": "user_default",
  "json_validated": true,
  "json_repaired": "none"
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `response` | `string` | Testo della risposta generata dal modello (eventualmente riparato se `json_repaired` ≠ `"none"`) |
| `model` | `string` | Modello LLM effettivamente utilizzato |
| `characters` | `int` | Numero di caratteri della risposta |
| `session_id` | `uuid\|null` | UUID sessione. `null` se `user_id` non fornito (modalità stateless) |
| `system_prompt_source` | `string` | Origine del system prompt: `"request"`, `"user_default"` o `"file_default"` |
| `json_validated` | `bool` | Presente solo se `force_json_response=true`. Indica che la risposta è stata validata come JSON. |
| `json_repaired` | `string` | Presente solo se `force_json_response=true`. `"none"` nessuna riparazione necessaria, `"local"` repair locale (fences/trim), `"llm"` repair tramite seconda chiamata Gemini. |

#### Metadata salvati nel DB (`generations_messages`)

Quando `user_id` è fornito, vengono salvati due record in `generations_messages` (user + assistant). Il campo `metadata` (JSONB) contiene:

**Messaggio user:**

```json
{
  "system_prompt_effective": "testo completo del system prompt usato (con eventuale contesto)",
  "system_prompt_source": "request|user_default|file_default",
  "model": "gemini-2.5-flash",
  "context": "...",
  "attachment": {
    "filename": "brief.pdf",
    "mime_type": "application/pdf",
    "size": 204800,
    "delivery": "binary"
  }
}
```

Per i file `.docx` il campo `attachment` include campi aggiuntivi:

```json
{
  "attachment": {
    "filename": "documento.docx",
    "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": 51200,
    "delivery": "extracted_text",
    "extracted_text_chars": 3420
  }
}
```

I campi `context` e `attachment` sono presenti solo se forniti nella richiesta. Il binario del file **non** viene persistito.

**Messaggio assistant:**

```json
{
  "characters": 342,
  "model": "gemini-2.5-flash",
  "system_prompt_source": "request|user_default|file_default",
  "context": "...",
  "usage_metadata": {
    "prompt_token_count": 150,
    "candidates_token_count": 200,
    "total_token_count": 350
  }
}
```

| Campo metadata | Presente | Descrizione |
|---|---|---|
| `characters` | sempre | Numero caratteri della risposta |
| `model` | sempre | Modello LLM utilizzato |
| `system_prompt_source` | sempre | Origine del system prompt |
| `context` | se fornito | Contesto aggiuntivo originale |
| `attachment` | se file allegato | Oggetto `{filename, mime_type, size, delivery}` — solo nel messaggio user (v0.35.0). Per `.docx`: include anche `extracted_text_chars` (v0.36.0) |
| `gemini_payload_debug` | sempre (messaggio user) | Snapshot del payload inviato a Gemini: `{model, force_json_response, system_prompt, content_parts[]}` — ogni element di `content_parts` è il testo di una `Part` (v0.37.0) |
| `usage_metadata` | se disponibile | Token consumati dalla chiamata Gemini (v0.32.0) |
| `json_validated` | se `force_json_response=true` | Sempre `true` sui messaggi persistiti (se è `false` il record non viene salvato; vedi 422). |
| `json_repaired` | se `force_json_response=true` | `"none"` / `"local"` / `"llm"` |
| `raw_response` | se repair fatto | Testo originale Gemini prima del repair (presente solo se `json_repaired` ∈ {`"local"`, `"llm"`}) |

#### Token tracking (v0.32.0)

Quando `usage_metadata` è disponibile nella risposta Gemini e `user_id` è fornito, il campo `total_tokens` in `generations_user` viene incrementato automaticamente con il `total_token_count` della chiamata. Questo permette di tracciare il consumo cumulativo di token per utente.

I conteggi dettagliati (prompt vs completion) sono disponibili nel campo `metadata` di ogni messaggio assistant per analisi granulari.

Quando `force_json_response=true` e viene effettuata una seconda chiamata LLM per riparazione JSON, i token di **entrambe** le chiamate vengono sommati e contabilizzati. Anche in caso di fallimento definitivo (HTTP 422) i token consumati vengono addebitati.

#### Validazione JSON risposta (v0.34.0)

Con `force_json_response=true` (default) l'endpoint garantisce che il campo `response` sia JSON valido oppure restituisce `422`, senza salvare messaggi parziali.

Pipeline di validazione (in ordine):

1. **SDK-level**: la chiamata Gemini imposta `response_mime_type="application/json"` in `GenerateContentConfig`. Questo istruisce il modello a produrre JSON (non sempre sufficiente).
2. **Repair locale** (`services.validate_and_repair_json`): tenta `json.loads` diretto; se fallisce, strip di markdown fences (```` ```json ... ``` ````); se fallisce, estrae il sottoinsieme tra la prima `{` e l'ultima `}` (oppure `[` ... `]`).
3. **Repair LLM**: se il repair locale fallisce, effettua una seconda chiamata a Gemini (stesso modello/API key dell'utente) con un system prompt di riparazione dedicato, chiedendo di restituire solo JSON corretto. Il testo risultante viene ri-validato dal passo 2.
4. **Fallimento definitivo**: se nessuno dei passi produce JSON valido, risposta `422 JsonValidationFailed` con il body grezzo Gemini in `raw_response`. Nessun record salvato in `generations_messages` / `generations_sessions`.

Quando il repair ha successo, il **contenuto riparato** è quello restituito al client e salvato nel DB; la versione originale Gemini viene preservata in `metadata.raw_response` (solo se `json_repaired ≠ "none"`).

#### Comportamento sessioni

| Scenario | Risultato |
|----------|-----------|
| Solo `message` | Risposta LLM, `session_id: null` (stateless, nessun salvataggio) |
| `message` + `user_id` | Crea nuova sessione automaticamente, salva i messaggi, restituisce `session_id` |
| `message` + `user_id` + `session_id` valido | Aggiunge messaggi alla sessione esistente |
| `message` + `user_id` + `session_id` non trovato | Crea nuova sessione (fallback trasparente) |

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `message` assente o vuoto, UUID non valido |
| `401 Unauthorized` | Bearer token assente o non valido |
| `422 Unprocessable Entity` | `force_json_response=true` e la risposta Gemini non è JSON valido nemmeno dopo la chiamata LLM di riparazione. Body: `{"error":"JsonValidationFailed","message":"...","raw_response":"..."}`. Nessun record salvato su Supabase. |
| `429 Too Many Requests` | Rate limit IP superato |
| `500 Internal Server Error` | `GEMINI_API_KEY` mancante nel `.env` o errore LLM |

#### Rate limiting

| Variabile `.env` | Default | Descrizione |
|-----------------|---------|-------------|
| `RATE_LIMIT_MESSAGES_PER_MIN` | `5` | Max richieste per indirizzo IP al minuto |

#### Modello utilizzato

Il modello è determinato da `GEMINI_MODEL` nel `.env` (default: `gemini-2.5-flash`).
Il campo `model` nella response indica il modello effettivamente utilizzato.

Se `GEMINI_API_KEY_BACKUP` è configurato nel `.env`, viene usato automaticamente come fallback in caso di rate limit (429) sulla chiave primaria.

#### Esempio curl

```bash
# Messaggio semplice senza salvataggio
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/messages \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Spiegami il SEO in 3 punti"}'

# Primo messaggio con salvataggio (nuova sessione automatica)
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/messages \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Cos'\''è il SEO?",
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Messaggio successivo nella stessa sessione
curl -X POST https://chat.mavida.com/wp-draft-generator/v1/messages \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Dammi 3 tecniche pratiche",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "session_id": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

> Vedi `http/messages.http` per esempi REST Client completi.

---

### `POST /chat/completions`

> Specifica tecnica dettagliata: [`docs/chat_completions_spec.md`](chat_completions_spec.md)

Completamento LLM **sincrono e stateless**: nessuna scrittura su DB, nessun salvataggio sessione. Adatto per integrazioni esterne che gestiscono la persistenza in proprio.

Differenze rispetto a `/messages`:
- `system_prompt` è **obbligatorio** nel body (nessun fallback al DB né al file di default).
- Nessun `session_id`: la conversazione multi-turn è gestita dal client tramite il campo `history`.
- Nessuna scrittura su Supabase: nessuna sessione, nessun messaggio, nessun token tracking.
- `metadata`: oggetto arbitrario pass-through per contesto applicativo del client.
- Risposta include `usage` normalizzato (prompt/completion/total tokens).
- Email di notifica inviata a `MAIL_NOTIFICATION` (se impostato).

Richiede Bearer token. CORS abilitato via `@cross_origin()`.

```
POST /wp-draft-generator/v1/chat/completions
Content-Type: application/json
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Request Body

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| `message` | `string` | ✓ | Testo del messaggio corrente (min 1 char) |
| `system_prompt` | `string` | ✓ | Istruzioni di sistema (min 1 char). Nessun fallback al DB. |
| `context` | `string` | — | Contesto aggiuntivo preposto al messaggio: `Contesto: {context}\n\n{message}` |
| `user_id` | `uuid` | — | UUID utente per override credenziali Gemini. Nessuna scrittura su DB. |
| `force_json_response` | `bool` | — | Default `true`. Stessa pipeline di validazione/repair di `/messages`. |
| `metadata` | `object` | — | Oggetto arbitrario del client (pass-through). Incluso nell'email di notifica, non usato dal backend. |
| `history` | `array` | — | Storico conversazione per chiamate multi-turn. Ogni elemento: `{"role": "user"\|"assistant", "content": "..."}`. I turni vengono anteposti al messaggio corrente come `types.Content`. |

#### Request — multipart/form-data (file allegato)

Supporta gli stessi MIME di `/messages`. I campi `metadata` e `history` non sono disponibili in multipart (solo JSON).

```
POST /wp-draft-generator/v1/chat/completions
Content-Type: multipart/form-data
Authorization: Bearer <API_AUTH_TOKEN>
```

| Campo form | Tipo | Obbligatorio | Descrizione |
|---|---|:---:|---|
| `message` | `string` | ✓ | Testo del messaggio |
| `system_prompt` | `string` | ✓ | Istruzioni di sistema |
| `file` | `binary` | — | File allegato (stessi MIME e limite di `/messages`) |
| `context` | `string` | — | Contesto aggiuntivo |
| `user_id` | `uuid` | — | UUID utente |
| `force_json_response` | `string` | — | `"true"` / `"false"` (default `"true"`) |

#### History — conversazioni multi-turn

Il campo `history` consente di passare turni precedenti della conversazione. Il backend li mappa sul formato nativo Gemini (`role: "model"` per `assistant`) e li antepone al turno corrente prima della chiamata SDK:

```json
"history": [
  {"role": "user",      "content": "Qual è la differenza tra SEO on-page e off-page?"},
  {"role": "assistant", "content": "L'SEO on-page riguarda gli elementi interni al sito..."},
  {"role": "user",      "content": "Puoi darmi un esempio pratico di SEO off-page?"}
]
```

#### Response 200

```json
{
  "response": "Un esempio pratico di SEO off-page è ottenere backlink...",
  "model": "gemini-2.5-flash",
  "characters": 520,
  "usage": {
    "prompt_tokens": 210,
    "completion_tokens": 130,
    "total_tokens": 340
  },
  "json_validated": true,
  "json_repaired": "none"
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `response` | `string` | Risposta del modello (eventualmente riparata) |
| `model` | `string` | Modello LLM effettivamente utilizzato |
| `characters` | `int` | Numero di caratteri della risposta |
| `usage` | `object\|null` | Token consumati. `null` se Gemini non restituisce usage. Include anche i token della chiamata di repair LLM se eseguita. |
| `json_validated` | `bool` | Presente solo se `force_json_response=true` |
| `json_repaired` | `string` | Presente solo se `force_json_response=true`. `"none"` / `"local"` / `"llm"` |

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 ValidationError` | Campo obbligatorio mancante o non valido |
| `400 UnsupportedMediaType` | MIME non in allowlist |
| `400 InvalidDocx` / `400 EmptyDocx` | File `.docx` corrotto o senza testo |
| `401 Unauthorized` | Bearer token assente o non valido |
| `413 PayloadTooLarge` | File > `MAX_UPLOAD_MB` MB |
| `422 JsonValidationFailed` | `force_json_response=true` e risposta non è JSON valido |
| `429 Too Many Requests` | Rate limit IP superato (`RATE_LIMIT_MESSAGES_PER_MIN`) |
| `500 ConfigError` | `GEMINI_API_KEY` mancante nel `.env` |
| `500 LLMError` | Errore chiamata Gemini |

#### Variabili d'ambiente

| Variabile | Default | Descrizione |
|---|---|---|
| `RATE_LIMIT_MESSAGES_PER_MIN` | `5` | Max richieste per IP al minuto (condiviso con `/messages`) |
| `MAIL_NOTIFICATION` | *(vuoto)* | Se impostato, invia email di notifica con payload completo in entrata e risposta in uscita |
| `MAX_UPLOAD_MB` | `20` | Limite dimensione file allegato |

#### Esempio curl

```bash
# Completamento semplice (JSON)
curl -X POST https://<host>/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Riassumi in 3 bullet point",
    "system_prompt": "Sei un assistente conciso. Rispondi sempre in JSON con chiave \"summary\".",
    "metadata": {"source": "myapp", "user_ref": "U123"}
  }'

# Multi-turn con history
curl -X POST https://<host>/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Approfondisci il secondo punto",
    "system_prompt": "Sei un esperto di marketing. Rispondi in italiano.",
    "force_json_response": false,
    "history": [
      {"role": "user",      "content": "Elenca 3 strategie di marketing digitale"},
      {"role": "assistant", "content": "1. SEO  2. Email marketing  3. Social media"}
    ]
  }'

# Con file .docx
curl -X POST https://<host>/wp-draft-generator/v1/chat/completions \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -F "message=Riassumi il documento allegato" \
  -F "system_prompt=Sei un assistente di analisi documenti. Rispondi in italiano." \
  -F "file=@report.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
```

---

### `GET /sessions`

Restituisce la lista delle sessioni di chat di un utente, ordinate per ultima attività (più recente prima).

Richiede Bearer token. CORS abilitato. Header opzionale `X-Admin-User-Id` (admin) abilita l'audit dell'accesso cross-user verso `user_id` arbitrario.

```
GET /wp-draft-generator/v1/sessions?user_id=<uuid>
Authorization: Bearer <API_AUTH_TOKEN>
X-Admin-User-Id: <uuid-admin>   # opzionale (audit admin cross-user)
```

#### Query Parameters

| Parametro | Tipo | Obbligatorio | Default | Descrizione |
|-----------|------|:---:|---------|-------------|
| `user_id` | `uuid` | ✓ | — | UUID utente (`generations_user.id`) |
| `limit` | `integer` | — | `20` | Numero massimo di sessioni (max 100) |
| `include_archived` | `boolean` | — | `false` | Include sessioni archiviate |

#### Response 200

```json
{
  "sessions": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Domande SEO",
      "context": "wandly",
      "message_count": 6,
      "last_message_at": "2026-03-26T10:30:00Z",
      "model": "gemini-2.5-flash",
      "created_at": "2026-03-26T09:55:00Z"
    }
  ],
  "count": 1
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `user_id` mancante o UUID non valido |
| `401 Unauthorized` | Bearer token assente o non valido |

#### Esempio curl

```bash
curl "https://chat.mavida.com/wp-draft-generator/v1/sessions?user_id=550e8400-e29b-41d4-a716-446655440000&limit=10" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>"
```

---

### `GET /sessions/{session_id}`

Restituisce il dettaglio di una sessione con tutti i suoi messaggi in ordine cronologico.
Verifica l'ownership: `user_id` deve corrispondere all'utente proprietario della sessione.

Richiede Bearer token. CORS abilitato.

```
GET /wp-draft-generator/v1/sessions/<session_id>?user_id=<uuid>
Authorization: Bearer <API_AUTH_TOKEN>
```

#### Query Parameters

| Parametro | Tipo | Obbligatorio | Default | Descrizione |
|-----------|------|:---:|---------|-------------|
| `user_id` | `uuid` | ✓ | — | UUID utente per verifica ownership |
| `limit` | `integer` | — | `50` | Numero massimo di messaggi (max 200) |

#### Response 200

```json
{
  "session": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Domande SEO",
    "context": "wandly",
    "message_count": 4,
    "last_message_at": "2026-03-26T10:30:00Z",
    "model": "gemini-2.5-flash",
    "is_archived": false,
    "created_at": "2026-03-26T09:55:00Z",
    "updated_at": "2026-03-26T10:30:00Z"
  },
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "Cos'è il SEO?",
      "model": null,
      "metadata": null,
      "created_at": "2026-03-26T09:55:10Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Il SEO (Search Engine Optimization) è...",
      "model": "gemini-2.5-flash",
      "metadata": null,
      "created_at": "2026-03-26T09:55:12Z"
    }
  ]
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `user_id` mancante, UUID non validi |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Sessione non trovata o non appartenente all'utente |

#### Esempio curl

```bash
curl "https://chat.mavida.com/wp-draft-generator/v1/sessions/660e8400-e29b-41d4-a716-446655440001?user_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>"
```

---

### `PATCH /sessions/{session_id}`

Aggiorna `title` e/o `is_archived` di una sessione. Verifica l'ownership tramite `user_id` nel body. Header opzionale `X-Admin-User-Id` (admin) abilita l'audit dell'accesso cross-user (`user_id` resta comunque obbligatorio come target).

Richiede Bearer token. CORS abilitato.

```
PATCH /wp-draft-generator/v1/sessions/<session_id>
Content-Type: application/json
Authorization: Bearer <API_AUTH_TOKEN>
X-Admin-User-Id: <uuid-admin>   # opzionale (audit admin cross-user)
```

#### Request Body

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| `user_id` | `uuid` | ✓ | UUID utente target (verifica ownership) |
| `title` | `string` | * | Nuovo titolo della sessione (1-200 chars) |
| `is_archived` | `boolean` | * | `true` archivia, `false` ripristina |

\* Almeno uno tra `title` e `is_archived` deve essere presente.

#### Response 200

```json
{
  "updated": true,
  "title": "Articolo SEO per e-commerce",
  "is_archived": false
}
```

I campi `title` e `is_archived` compaiono in risposta solo se effettivamente aggiornati.

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | Validazione fallita, UUID non validi, body vuoto, `title` vuoto |
| `401 Unauthorized` | Bearer token assente o non valido |
| `404 Not Found` | Sessione non trovata o non appartenente all'utente |

#### Esempio curl

```bash
# Rinomina
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/sessions/660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Articolo SEO per e-commerce",
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Archivia
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/sessions/660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "is_archived": true, "user_id": "550e8400-e29b-41d4-a716-446655440000" }'
```

---

## Admin — Gestione Utenti

Endpoint per la gestione CRUD della tabella `generations_user`. Accessibili **solo da utenti con `role='admin'`**.

### Autenticazione admin

Tutti gli endpoint richiedono due header obbligatori:

| Header | Valore | Descrizione |
|--------|--------|-------------|
| `Authorization` | `Bearer <API_AUTH_TOKEN>` | Token API standard |
| `X-Admin-User-Id` | `<uuid-admin>` | UUID dell'utente admin che effettua la richiesta |

Il backend verifica che l'utente indicato in `X-Admin-User-Id` abbia `role='admin'` nel DB. Qualsiasi tentativo da parte di un utente con `role='user'` restituirà `403 Forbidden`.

---

### GET /users

Lista tutti gli utenti con filtri opzionali.

**URL:** `GET /wp-draft-generator/v1/users`

#### Query params (tutti opzionali)

| Parametro | Valori | Descrizione |
|-----------|--------|-------------|
| `status` | `active` \| `inactive` | Filtra per stato |
| `role` | `user` \| `admin` | Filtra per ruolo |
| `plan` | `basic` \| `personal` \| `pro` | Filtra per piano |

#### Risposta 200 OK

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "chat_id": "123456789",
      "username": "mario_rossi",
      "email": "mario@esempio.com",
      "status": "active",
      "role": "user",
      "plan": "basic",
      "created_at": "2025-01-15T10:30:00Z",
      "sessions_count": 12,
      "last_login": "2026-04-26T18:42:11Z"
    }
  ],
  "count": 1
}
```

> **v0.41.0** — la risposta include `sessions_count` (sessioni chat non
> archiviate, conteggio su `generations_sessions`) e `last_login`
> (`MAX(created_at)` su `generations_user_sessions` con `is_used=true`,
> oppure `null` se l'utente non ha mai effettuato il login).

#### Esempio curl

```bash
# Lista tutti gli utenti
curl "https://chat.mavida.com/wp-draft-generator/v1/users" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>"

# Solo utenti attivi con plan pro
curl "https://chat.mavida.com/wp-draft-generator/v1/users?status=active&plan=pro" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>"
```

---

### POST /users

Crea un nuovo utente.

**URL:** `POST /wp-draft-generator/v1/users`

#### Body JSON

| Campo | Tipo | Richiesto | Default | Valori |
|-------|------|-----------|---------|--------|
| `chat_id` | `string` | sì | — | ID chat Telegram (unico) |
| `username` | `string` | no | `null` | qualsiasi stringa |
| `email` | `string` | no | `null` | indirizzo email valido |
| `role` | `string` | no | `"user"` | `"user"` \| `"admin"` |
| `plan` | `string` | no | `"basic"` | `"basic"` \| `"personal"` \| `"pro"` |
| `status` | `string` | no | `"active"` | `"active"` \| `"inactive"` |
| `gemini_model` | `string` | no | `null` | Override modello Gemini (v0.32.0) |
| `gemini_api_key` | `string` | no | `null` | Override chiave API Gemini (v0.32.0) |

#### Risposta 201 Created

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "chat_id": "123456789",
  "username": "mario_rossi",
  "email": "mario@esempio.com",
  "status": "active",
  "role": "user",
  "plan": "basic",
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | Validazione fallita, `chat_id` vuoto o email non valida |
| `401 Unauthorized` | Bearer token assente o non valido |
| `403 Forbidden` | `X-Admin-User-Id` mancante o utente non admin |
| `409 Conflict` | `chat_id` già registrato |
| `500 Internal Server Error` | Errore Supabase |

#### Esempio curl

```bash
curl -X POST "https://chat.mavida.com/wp-draft-generator/v1/users" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "123456789",
    "username": "mario_rossi",
    "email": "mario@esempio.com",
    "role": "user",
    "plan": "basic"
  }'
```

---

### GET /users/{user_id}

Restituisce il profilo completo di un singolo utente.

**URL:** `GET /wp-draft-generator/v1/users/{user_id}`

#### Parametri path

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | UUID | ID utente (`generations_user.id`) |

#### Risposta 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "chat_id": "123456789",
  "username": "mario_rossi",
  "email": "mario@esempio.com",
  "status": "active",
  "role": "user",
  "plan": "basic",
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `user_id` non è un UUID valido |
| `401 Unauthorized` | Bearer token assente o non valido |
| `403 Forbidden` | `X-Admin-User-Id` mancante o utente non admin |
| `404 Not Found` | Utente non trovato |

#### Esempio curl

```bash
curl "https://chat.mavida.com/wp-draft-generator/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>"
```

---

### PATCH /users/{user_id}

Aggiorna uno o più campi dell'utente. Consente di modificare i campi **admin-only** (`status`, `role`, `plan`) non accessibili dagli endpoint utente standard, e gli override Gemini (`gemini_model`, `gemini_api_key`) per personalizzare il modello e la chiave API per singolo utente.

**URL:** `PATCH /wp-draft-generator/v1/users/{user_id}`

#### Parametri path

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | UUID | ID utente (`generations_user.id`) |

#### Body JSON (almeno un campo obbligatorio)

| Campo | Tipo | Valori |
|-------|------|--------|
| `chat_id` | `string` | qualsiasi stringa non vuota |
| `username` | `string` | qualsiasi stringa non vuota |
| `email` | `string` | indirizzo email valido |
| `role` | `string` | `"user"` \| `"admin"` |
| `plan` | `string` | `"basic"` \| `"personal"` \| `"pro"` |
| `status` | `string` | `"active"` \| `"inactive"` |
| `gemini_model` | `string` | Override modello Gemini per l'utente (opzionale, v0.33.0) |
| `gemini_api_key` | `string` | Override chiave API Gemini per l'utente (opzionale, v0.33.0) |

#### Risposta 200 OK

Restituisce il profilo utente aggiornato (stesso formato di GET /users/{user_id}).

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `user_id` non valido, body vuoto o campi non conformi |
| `401 Unauthorized` | Bearer token assente o non valido |
| `403 Forbidden` | `X-Admin-User-Id` mancante o utente non admin |
| `404 Not Found` | Utente non trovato |

#### Esempio curl

```bash
# Promuovi utente ad admin con plan pro
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin", "plan": "pro"}'

# Riattiva utente disattivato
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'

# Imposta override Gemini per un utente specifico
curl -X PATCH "https://chat.mavida.com/wp-draft-generator/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>" \
  -H "Content-Type: application/json" \
  -d '{"gemini_model": "gemini-2.0-flash", "gemini_api_key": "AIzaSy..."}'
```

---

### DELETE /users/{user_id}

Disattiva un utente impostando `status='inactive'` (soft delete). Il record rimane nel DB ed è **reversibile** via `PATCH /users/{user_id}` con `{"status": "active"}`. Il webhook Telegram blocca automaticamente gli utenti con `status != 'active'`.

**URL:** `DELETE /wp-draft-generator/v1/users/{user_id}`

#### Parametri path

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `user_id` | UUID | ID utente (`generations_user.id`) |

#### Risposta 200 OK

```json
{
  "success": true,
  "message": "Utente disattivato",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Risposte di errore

| Codice | Causa |
|--------|-------|
| `400 Bad Request` | `user_id` non è un UUID valido |
| `401 Unauthorized` | Bearer token assente o non valido |
| `403 Forbidden` | `X-Admin-User-Id` mancante o utente non admin |
| `404 Not Found` | Utente non trovato |

#### Esempio curl

```bash
curl -X DELETE "https://chat.mavida.com/wp-draft-generator/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -H "X-Admin-User-Id: <uuid-admin>"
```


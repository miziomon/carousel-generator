# Schema DB — Gestione Utenti e Autenticazione

> Estratto da: **WP Draft Generator API** (automation_2wp)  
> Database: **Supabase** (PostgreSQL 15)  
> Aggiornato: 2026-05-14

Questo documento descrive le tabelle del database relative alla gestione degli utenti e al flusso di autenticazione passwordless (OTP via email). È pensato per essere riutilizzato in altri progetti con la stessa architettura.

---

## Indice

1. [Panoramica del sistema](#1-panoramica-del-sistema)
2. [Tabella `generations_user`](#2-tabella-generations_user)
3. [Tabella `generations_user_sessions`](#3-tabella-generations_user_sessions)
4. [Flusso OTP completo](#4-flusso-otp-completo)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Relazioni tra tabelle](#6-relazioni-tra-tabelle)
7. [SQL completo — migrations](#7-sql-completo--migrations)
8. [Note per riutilizzo in altri progetti](#8-note-per-riutilizzo-in-altri-progetti)

---

## 1. Panoramica del sistema

Il sistema di autenticazione è **passwordless via OTP email**:

```
[Frontend] → POST /otp-request  → [Backend] → genera codice → invia email
[Frontend] → POST /otp-verify   → [Backend] → verifica OTP  → restituisce user_id
[Frontend] → tutte le API       → [Backend] → usa user_id come identificatore
```

Le due tabelle coinvolte:

| Tabella | Scopo |
|---|---|
| `generations_user` | Profilo utente persistente (1 riga per utente) |
| `generations_user_sessions` | Sessioni OTP monouso per il login (1 riga per utente, sovrascritta ad ogni richiesta) |

---

## 2. Tabella `generations_user`

Profilo di ogni utente del sistema. Creata automaticamente al primo login (upsert su `chat_id` o `email`). Contiene identità, stato, ruolo, piano abbonamento e override opzionali per le credenziali Gemini.

> **Nota storica**: questa tabella si chiamava `generations_user_options` fino alla migration 012 (v0.28.0), poi rinominata in `generations_user`.

### Schema completo

```sql
CREATE TABLE public.generations_user (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id         TEXT        UNIQUE NOT NULL,
    username        TEXT,
    email           TEXT,
    status          TEXT        NOT NULL DEFAULT 'active',
    role            TEXT        NOT NULL DEFAULT 'user',
    plan            TEXT        NOT NULL DEFAULT 'basic',
    total_tokens    INTEGER     NOT NULL DEFAULT 0,
    gemini_model    TEXT        DEFAULT NULL,
    gemini_api_key  TEXT        DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_generations_user_status
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT chk_generations_user_role
        CHECK (role IN ('admin', 'user')),
    CONSTRAINT chk_generations_user_plan
        CHECK (plan IN ('basic', 'personal', 'pro')),
    CONSTRAINT chk_generations_user_chat_id_not_empty
        CHECK (chat_id <> '')
);
```

### Descrizione colonne

| Colonna | Tipo | Default | Obbligatorio | Descrizione |
|---|---|---|:---:|---|
| `id` | `UUID` | `gen_random_uuid()` | ✓ | Chiave primaria — usata come identificatore utente in tutte le API |
| `chat_id` | `TEXT` | — | ✓ | ID univoco dell'utente (es. Telegram chat_id numerico). UNIQUE — garantisce un solo record per utente. Usato come chiave per l'upsert al login. |
| `username` | `TEXT` | `NULL` | — | Nome o username dell'utente (es. `@mario_rossi` da Telegram, o nome inserito in fase di registrazione) |
| `email` | `TEXT` | `NULL` | — | Indirizzo email — usato per inviare il codice OTP. Aggiornabile via `PATCH /profile` |
| `status` | `TEXT` | `'active'` | ✓ | Stato account: `active` (default) o `inactive` (disabilitato). Admin-only. |
| `role` | `TEXT` | `'user'` | ✓ | Ruolo: `user` (default) o `admin`. Admin-only — non modificabile via API utente. |
| `plan` | `TEXT` | `'basic'` | ✓ | Piano abbonamento: `basic`, `personal`, `pro`. Admin-only. |
| `total_tokens` | `INTEGER` | `0` | ✓ | Contatore cumulativo token LLM consumati dall'utente. Incrementato ad ogni chiamata Gemini. |
| `gemini_model` | `TEXT` | `NULL` | — | Override opzionale del modello Gemini per questo utente. Se valorizzato, ha priorità sulla variabile `.env`. |
| `gemini_api_key` | `TEXT` | `NULL` | — | Override opzionale della chiave API Gemini per questo utente. Se valorizzata, usa le quote dell'utente invece di quelle del server. |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | ✓ | Data di prima registrazione (auto) |

### Indici

```sql
CREATE INDEX idx_generations_user_chat_id  ON public.generations_user(chat_id);
CREATE INDEX idx_generations_user_status   ON public.generations_user(status);
```

### Vincoli

| Constraint | Colonna | Valori ammessi |
|---|---|---|
| `chk_generations_user_status` | `status` | `active`, `inactive` |
| `chk_generations_user_role` | `role` | `admin`, `user` |
| `chk_generations_user_plan` | `plan` | `basic`, `personal`, `pro` |
| `chk_generations_user_chat_id_not_empty` | `chat_id` | stringa non vuota |

### Esempio record

```json
{
  "id":             "550e8400-e29b-41d4-a716-446655440000",
  "chat_id":        "123456789",
  "username":       "mario_rossi",
  "email":          "mario@esempio.com",
  "status":         "active",
  "role":           "user",
  "plan":           "basic",
  "total_tokens":   4820,
  "gemini_model":   null,
  "gemini_api_key": null,
  "created_at":     "2026-03-01T10:00:00Z"
}
```

---

## 3. Tabella `generations_user_sessions`

Sessioni OTP per il login passwordless. **Una sola riga per utente** (upsert su `id` = UUID utente): ogni nuova richiesta OTP sovrascrive quella precedente. Il codice è monouso e scade in 10 minuti.

> **Nota critica sul campo `id`**: a differenza delle altre tabelle, `id` NON è autogenerato — viene impostato dall'applicazione con lo stesso valore di `generations_user.id` per lo stesso utente. Questo garantisce al massimo 1 sessione OTP attiva per utente tramite upsert.

### Schema completo

```sql
CREATE TABLE public.generations_user_sessions (
    id          UUID        NOT NULL PRIMARY KEY,
    email       TEXT        NOT NULL,
    otp_code    TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN     NOT NULL DEFAULT FALSE,
    user_id     UUID        NOT NULL
                    REFERENCES public.generations_user(id)
                    ON DELETE CASCADE,

    CONSTRAINT chk_otp_code_length
        CHECK (char_length(otp_code) = 6),
    CONSTRAINT chk_otp_expires_after_created
        CHECK (expires_at > created_at),
    CONSTRAINT chk_otp_email_not_empty
        CHECK (email <> '')
);
```

### Descrizione colonne

| Colonna | Tipo | Default | Obbligatorio | Descrizione |
|---|---|---|:---:|---|
| `id` | `UUID` | — (impostato dall'app) | ✓ | **Coincide con `generations_user.id`** dello stesso utente. NON autogenerato. L'upsert su questo campo garantisce max 1 sessione OTP attiva per utente. |
| `email` | `TEXT` | — | ✓ | Email dell'utente — ridondante con `generations_user.email` per consentire query di verifica senza JOIN |
| `otp_code` | `TEXT` | — | ✓ | Codice OTP a **esattamente 6 cifre** (stringa, per preservare gli zeri iniziali es. `"048392"`). Generato con CSPRNG lato server. |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | ✓ | Timestamp di creazione (auto) |
| `expires_at` | `TIMESTAMPTZ` | — (impostato dall'app) | ✓ | Scadenza = `created_at + 10 minuti`. Impostato dall'applicazione al momento della creazione. Deve essere > `created_at` (vincolo DB). |
| `is_used` | `BOOLEAN` | `false` | ✓ | `false` = codice non ancora verificato. `true` = già usato (monouso: non riutilizzabile). |
| `user_id` | `UUID` | — | ✓ | FK → `generations_user.id`. ON DELETE CASCADE: se l'utente viene eliminato, la sessione viene rimossa. |

### Indici

```sql
-- Ricerca per email (query principale di verifica OTP)
CREATE INDEX idx_user_sessions_email
    ON public.generations_user_sessions(email);

-- Filtraggio sessioni scadute (pulizia periodica)
CREATE INDEX idx_user_sessions_expires_at
    ON public.generations_user_sessions(expires_at);

-- Query verifica: WHERE email = ? AND is_used = false
CREATE INDEX idx_user_sessions_email_is_used
    ON public.generations_user_sessions(email, is_used);
```

### Vincoli

| Constraint | Colonna | Regola |
|---|---|---|
| `chk_otp_code_length` | `otp_code` | esattamente 6 caratteri |
| `chk_otp_expires_after_created` | `expires_at` | > `created_at` |
| `chk_otp_email_not_empty` | `email` | stringa non vuota |

### Esempio record

```json
{
  "id":         "550e8400-e29b-41d4-a716-446655440000",
  "email":      "mario@esempio.com",
  "otp_code":   "482019",
  "created_at": "2026-05-14T10:00:00Z",
  "expires_at": "2026-05-14T10:10:00Z",
  "is_used":    false,
  "user_id":    "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 4. Flusso OTP completo

### Step 1 — Richiesta OTP (`POST /otp-request`)

```
1. Frontend invia: { "email": "mario@esempio.com" }
2. Backend:
   a. Cerca l'utente in generations_user WHERE email = ?
   b. Se non trovato → risponde 200 senza inviare email (anti-enumeration)
   c. Se trovato:
      - Genera codice OTP a 6 cifre (CSPRNG)
      - UPSERT in generations_user_sessions:
          ON CONFLICT (id) DO UPDATE SET otp_code=?, expires_at=NOW()+10min, is_used=false
      - Invia email con il codice
3. Risponde sempre 200 (non rivela se l'email esiste)
```

### Step 2 — Verifica OTP (`POST /otp-verify`)

```
1. Frontend invia: { "email": "mario@esempio.com", "otp_code": "482019" }
2. Backend:
   a. SELECT id, user_id FROM generations_user_sessions
      WHERE email = ?
        AND otp_code = ?
        AND is_used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
   b. Se non trovato → 401 (codice errato, scaduto o già usato)
   c. Se trovato:
      - UPDATE generations_user_sessions SET is_used = true WHERE id = ?
      - Restituisce { "user_id": "...", "email": "..." }
3. Il frontend usa user_id come identificatore per tutte le API successive
```

### Considerazioni di sicurezza

| Aspetto | Implementazione |
|---|---|
| **Anti-enumeration** | `/otp-request` risponde sempre 200, anche se l'email non esiste |
| **Monouso** | `is_used = true` dopo il primo utilizzo — impossibile riutilizzare |
| **Scadenza** | 10 minuti dalla generazione — codici vecchi ignorati |
| **Sovrascrittura** | Upsert su `id`: una nuova richiesta invalida il codice precedente |
| **Rate limiting** | Endpoint protetti da rate limit per IP (Flask-Limiter + Redis) |
| **CSPRNG** | Codice generato con generatore crittograficamente sicuro |
| **RLS** | Accesso diretto dal frontend bloccato via Row Level Security |

---

## 5. Row Level Security (RLS)

Entrambe le tabelle hanno RLS abilitato. Il backend usa la `service_role` key che bypassa RLS automaticamente.

| Tabella | RLS | Policy aperta | Note |
|---|---|:---:|---|
| `generations_user` | ✓ abilitato | ✗ nessuna | Solo `service_role` key (backend) |
| `generations_user_sessions` | ✓ abilitato | SELECT + UPDATE aperte | Necessarie se il frontend verifica OTP direttamente con `anon` key |

```sql
-- generations_user: nessuna policy (solo service_role)
ALTER TABLE public.generations_user ENABLE ROW LEVEL SECURITY;

-- generations_user_sessions: policy per frontend (se necessario)
ALTER TABLE public.generations_user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_select_for_otp_verification"
    ON public.generations_user_sessions FOR SELECT USING (true);

CREATE POLICY "allow_update_is_used"
    ON public.generations_user_sessions FOR UPDATE USING (true) WITH CHECK (true);
```

> **Architettura consigliata**: verificare l'OTP **sempre lato backend** con `service_role` key. Le policy aperte su `generations_user_sessions` sono un residuo dell'architettura precedente (verifica frontend diretta su Supabase) — in una nuova implementazione possono essere omesse.

---

## 6. Relazioni tra tabelle

```
generations_user
├── id (UUID PK)
├── chat_id (UNIQUE — chiave di upsert)
├── email
├── status / role / plan
└── total_tokens / gemini_model / gemini_api_key

        │
        │ 1:1  (id = user.id — UPSERT, max 1 sessione attiva per utente)
        ▼
generations_user_sessions
├── id (= generations_user.id — non autogenerato)
├── email (ridondante per query senza JOIN)
├── otp_code (6 cifre, CSPRNG)
├── expires_at (created_at + 10 min)
├── is_used (monouso)
└── user_id (FK → generations_user.id, CASCADE)
```

---

## 7. SQL completo — migrations

### Migration 003 — Crea `generations_user` (ex `generations_user_options`)

```sql
CREATE TABLE IF NOT EXISTS public.generations_user_options (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id         TEXT        UNIQUE NOT NULL,
    username        TEXT,
    email           TEXT,
    status          TEXT        NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT chk_user_options_status
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT chk_user_options_chat_id_not_empty
        CHECK (chat_id <> '')
);

CREATE INDEX IF NOT EXISTS idx_user_options_chat_id ON public.generations_user_options(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_options_status  ON public.generations_user_options(status);

ALTER TABLE public.generations_user_options ENABLE ROW LEVEL SECURITY;
```

### Migration 005 — Crea `generations_user_sessions`

```sql
CREATE TABLE IF NOT EXISTS public.generations_user_sessions (
    id          UUID        NOT NULL PRIMARY KEY,
    email       TEXT        NOT NULL,
    otp_code    TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN     DEFAULT FALSE NOT NULL,
    user_id     UUID        NOT NULL
                    REFERENCES public.generations_user_options(id)
                    ON DELETE CASCADE,

    CONSTRAINT chk_otp_code_length          CHECK (char_length(otp_code) = 6),
    CONSTRAINT chk_otp_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT chk_otp_email_not_empty       CHECK (email <> '')
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_email
    ON public.generations_user_sessions(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
    ON public.generations_user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_email_is_used
    ON public.generations_user_sessions(email, is_used);

ALTER TABLE public.generations_user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_select_for_otp_verification" ON public.generations_user_sessions;
CREATE POLICY "allow_select_for_otp_verification"
    ON public.generations_user_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_update_is_used" ON public.generations_user_sessions;
CREATE POLICY "allow_update_is_used"
    ON public.generations_user_sessions FOR UPDATE USING (true) WITH CHECK (true);
```

### Migration 012 — Rinomina + aggiunge `role` e `plan`

```sql
ALTER TABLE public.generations_user_options RENAME TO generations_user;

ALTER INDEX IF EXISTS public.idx_user_options_chat_id RENAME TO idx_generations_user_chat_id;
ALTER INDEX IF EXISTS public.idx_user_options_status  RENAME TO idx_generations_user_status;

ALTER TABLE public.generations_user
    RENAME CONSTRAINT chk_user_options_status TO chk_generations_user_status;
ALTER TABLE public.generations_user
    RENAME CONSTRAINT chk_user_options_chat_id_not_empty TO chk_generations_user_chat_id_not_empty;

ALTER TABLE public.generations_user
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
        CONSTRAINT chk_generations_user_role CHECK (role IN ('admin', 'user'));

ALTER TABLE public.generations_user
    ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basic'
        CONSTRAINT chk_generations_user_plan CHECK (plan IN ('basic', 'personal', 'pro'));
```

### Migration 013 — Aggiunge `total_tokens`, `gemini_model`, `gemini_api_key`

```sql
ALTER TABLE public.generations_user
    ADD COLUMN IF NOT EXISTS total_tokens   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.generations_user
    ADD COLUMN IF NOT EXISTS gemini_model   TEXT DEFAULT NULL;
ALTER TABLE public.generations_user
    ADD COLUMN IF NOT EXISTS gemini_api_key TEXT DEFAULT NULL;
```

---

## 8. Note per riutilizzo in altri progetti

### Cosa adattare obbligatoriamente

| Elemento | Note |
|---|---|
| **Nomi tabelle** | Rinominare `generations_user` e `generations_user_sessions` con un prefisso del nuovo progetto (es. `myapp_user`, `myapp_user_sessions`) |
| **`chat_id`** | Se il nuovo progetto non usa Telegram, rinominare in `external_id` o usare direttamente `email` come chiave UNIQUE per l'upsert |
| **Piano e ruolo** | I valori di `plan` (`basic`, `personal`, `pro`) e `role` (`user`, `admin`) sono configurabili: modificare il CHECK constraint secondo i piani del nuovo progetto |

### Cosa è già riutilizzabile senza modifiche

- Flusso OTP completo (request → verify → is_used)
- Struttura `generations_user_sessions` (invariata)
- Logica di anti-enumeration (risponde sempre 200 su `/otp-request`)
- Rate limiting separato per IP e per endpoint (configurabile via `.env`)
- Override credenziali Gemini per-utente (`gemini_model`, `gemini_api_key`)
- Soft delete utenti via `status = 'inactive'` (no DELETE fisico)
- Gestione admin via `role = 'admin'` + decorator `@require_admin`

### Endpoint API già implementati

| Endpoint | Descrizione |
|---|---|
| `POST /otp-request` | Richiesta codice OTP — risponde sempre 200 (anti-enumeration) |
| `POST /otp-verify` | Verifica codice OTP → restituisce `user_id` |
| `GET /profile/{user_id}` | Lettura profilo utente |
| `PATCH /profile/{user_id}` | Aggiornamento `username`, `email`, `gemini_model`, `gemini_api_key` |
| `GET /users` | Lista tutti gli utenti (admin) |
| `POST /users` | Crea utente manualmente (admin) |
| `GET /users/{user_id}` | Lettura profilo completo (admin) |
| `PATCH /users/{user_id}` | Aggiornamento completo inclusi `role`, `plan`, `status` (admin) |
| `DELETE /users/{user_id}` | Soft delete: imposta `status = 'inactive'` (admin) |

### Schema minimo per un nuovo progetto (senza Telegram)

Se il nuovo progetto usa solo autenticazione email (senza Telegram):

```sql
-- Tabella utenti minima (senza chat_id Telegram)
CREATE TABLE myapp_user (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    email      TEXT        UNIQUE NOT NULL,
    username   TEXT,
    status     TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive')),
    role       TEXT        NOT NULL DEFAULT 'user'
                   CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabella sessioni OTP (identica, cambia solo la FK)
CREATE TABLE myapp_user_sessions (
    id         UUID        NOT NULL PRIMARY KEY,  -- = myapp_user.id
    email      TEXT        NOT NULL CHECK (email <> ''),
    otp_code   TEXT        NOT NULL CHECK (char_length(otp_code) = 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
    is_used    BOOLEAN     NOT NULL DEFAULT FALSE,
    user_id    UUID        NOT NULL REFERENCES myapp_user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX ON myapp_user(email);
CREATE INDEX ON myapp_user_sessions(email);
CREATE INDEX ON myapp_user_sessions(email, is_used);

ALTER TABLE myapp_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE myapp_user_sessions ENABLE ROW LEVEL SECURITY;
```

---

*Documento generato da: `automation_2wp` — database migrations 003, 005, 012, 013*

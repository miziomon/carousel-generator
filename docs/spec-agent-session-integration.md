# Specifiche — Integrazione "Agent Session" per Wandly / Slideorama

> **Da passare a Claude Code** per implementare l'autenticazione tramite link
> temporaneo nell'app client (Wandly o Slideorama).
>
> Versione API: `0.59.0` | Data: 2026-05-27

---

## Contesto e obiettivo

Il backend `wp-draft-generator` espone un meccanismo di **sessione agente**:
un amministratore genera un **link temporaneo** (token) per uno specifico utente
con ruolo `agent`. Il client (Wandly / Slideorama) scambia quel token per un
**Bearer session token per-utente** e lo usa per tutte le chiamate API successive,
operando con l'identità e i permessi di quell'utente.

**Caso d'uso:** il servizio esterno (Wandly/Slideorama) deve creare sessioni di
chat, generare contenuti, pubblicare su WordPress — tutto come se fosse l'utente
`agent` designato, senza che l'utente inserisca credenziali.

---

## 1. Prerequisiti lato admin

Prima che il client possa autenticarsi, un amministratore deve:

1. Impostare `AGENT_LINKS_ENABLED=true` nel `.env` del backend.
2. Promuovere l'utente target a `role='agent'` via:
   ```
   PATCH /wp-draft-generator/v1/users/<user_id>
   Authorization: Bearer <API_AUTH_TOKEN>
   X-Admin-User-Id: <admin_uuid>
   Body: {"role": "agent"}
   ```
3. Generare un link tramite:
   ```
   POST /wp-draft-generator/v1/access-links
   Authorization: Bearer <API_AUTH_TOKEN>
   X-Admin-User-Id: <admin_uuid>
   Body: {"user_id": "<agent_uuid>", "ttl_hours": 4, "note": "Wandly integration"}
   ```
   Risposta `201`: `{"id": "...", "user_id": "...", "expires_at": "...", "token": "<TOKEN_IN_CHIARO>", ...}`

   ⚠️ Il `token` è mostrato **una sola volta**. Conservarlo in modo sicuro
   (es. variabile d'ambiente `AGENT_ACCESS_TOKEN` nel progetto Wandly/Slideorama).

---

## 2. Flusso di autenticazione del client

```
┌─────────────┐         POST /access-links/exchange          ┌─────────────┐
│ Wandly /    │  ──── { token: ACCESS_TOKEN } ──────────────► │  Backend    │
│ Slideorama  │  ◄─── { session_token, user_id, expires_at } ─│  API        │
│             │                                               │             │
│             │  Successive chiamate API:                     │             │
│             │  ──── Authorization: Bearer <session_token> ► │             │
│             │  ◄─── risposta normale ──────────────────────  │             │
└─────────────┘                                               └─────────────┘
```

**Passo 1 — Exchange token → sessione:**

```
POST /wp-draft-generator/v1/access-links/exchange
Content-Type: application/json

{ "token": "<ACCESS_TOKEN>" }
```

Risposta `200 OK`:
```json
{
  "session_token": "aBcDeFgH...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2026-05-27T16:00:00+00:00"
}
```

**Passo 2 — Usa `session_token` come Bearer:**

Tutte le chiamate successive usano **`Authorization: Bearer <session_token>`**
al posto del token globale. Il `user_id` ricevuto deve coincidere con quello
nei path degli endpoint (es. `/profile/<user_id>`).

---

## 3. TypeScript — Implementazione di riferimento

### 3.1 Tipi

```typescript
interface AgentSession {
  sessionToken: string;
  userId: string;
  expiresAt: Date;
}

interface AgentSessionRaw {
  session_token: string;
  user_id: string;
  expires_at: string; // ISO 8601
}

type ApiError =
  | { error: 'Unauthorized'; message: string }
  | { error: 'ValidationError'; details: unknown[] }
  | { error: 'DatabaseError'; message: string }
  | { error: 'Service Unavailable'; message: string }; // feature flag off
```

### 3.2 `AgentAuthClient` — classe suggerita

```typescript
const API_BASE = process.env.API_BASE_URL ?? 'https://api.mavida.com/wp-draft-generator/v1';

export class AgentAuthClient {
  private session: AgentSession | null = null;

  constructor(private readonly accessToken: string) {}

  /** Scambia il token-link per una sessione Bearer. Da chiamare all'avvio. */
  async exchange(): Promise<AgentSession> {
    const res = await fetch(`${API_BASE}/access-links/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.accessToken }),
    });

    if (!res.ok) {
      const err = await res.json() as ApiError;
      throw new Error(`Exchange fallito [${res.status}]: ${JSON.stringify(err)}`);
    }

    const raw = await res.json() as AgentSessionRaw;
    this.session = {
      sessionToken: raw.session_token,
      userId: raw.user_id,
      expiresAt: new Date(raw.expires_at),
    };
    return this.session;
  }

  /** Restituisce la sessione corrente, lanciando se non inizializzata o scaduta. */
  getSession(): AgentSession {
    if (!this.session) throw new Error('Sessione non inizializzata — chiama exchange() prima.');
    if (new Date() >= this.session.expiresAt) {
      this.session = null;
      throw new Error('Sessione scaduta. Il link è scaduto o è stato revocato.');
    }
    return this.session;
  }

  /** Header Authorization da aggiungere a ogni fetch. */
  get authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.getSession().sessionToken}` };
  }

  /** true se la sessione è valida e non scaduta. */
  get isValid(): boolean {
    try { this.getSession(); return true; } catch { return false; }
  }
}
```

### 3.3 Uso pratico

```typescript
// Inizializzazione (es. in un modulo singleton)
const agentAuth = new AgentAuthClient(process.env.AGENT_ACCESS_TOKEN!);
await agentAuth.exchange();

const { userId } = agentAuth.getSession();

// Chiamata autenticata: GET /profile/<userId>
const profile = await fetch(`${API_BASE}/profile/${userId}`, {
  headers: { ...agentAuth.authHeader },
}).then(r => r.json());

// Chiamata autenticata: POST /messages
const reply = await fetch(`${API_BASE}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...agentAuth.authHeader },
  body: JSON.stringify({
    user_id: userId,
    message: 'Genera un articolo su...',
    system_prompt: '...',
  }),
}).then(r => r.json());
```

---

## 4. Gestione degli errori

| Codice HTTP | `error` nel body | Causa | Azione |
|-------------|-----------------|-------|--------|
| `401` | `Unauthorized` | Token non valido, scaduto o revocato | Non riprovare; segnalare all'admin |
| `400` | `ValidationError` | Body malformato | Correggere la richiesta |
| `403` | `Forbidden` | Sessione di U1 prova ad accedere a dati di U2 | Bug nel client — verificare user_id |
| `503` | `Service Unavailable` | `AGENT_LINKS_ENABLED=false` | Contattare l'admin |
| `429` | `RateLimitExceeded` | Troppi exchange in breve tempo | Attendere e riprovare con backoff |

### Gestione scadenza lato client

```typescript
async function callWithSessionRefresh<T>(
  agentAuth: AgentAuthClient,
  fetchFn: (auth: AgentAuthClient) => Promise<T>
): Promise<T> {
  try {
    return await fetchFn(agentAuth);
  } catch (err) {
    if (err instanceof Error && err.message.includes('scaduta')) {
      // Il link è scaduto — non c'è modo di rinnovarlo automaticamente.
      // Notificare l'admin per generare un nuovo link.
      throw new Error('Sessione agente scaduta. Contattare l\'amministratore per un nuovo link.');
    }
    throw err;
  }
}
```

---

## 5. Endpoint utilizzabili con sessione agente

Con una sessione agente il client può chiamare **tutti gli endpoint utente**,
passando sempre `user_id` = UUID dell'utente agente ricevuto dall'exchange.
La sessione NON può accedere agli endpoint admin (`/users`, `/access-links`, ecc.).

| Endpoint | Metodo | Note |
|----------|--------|------|
| `/profile/<user_id>` | GET, PATCH | Profilo utente |
| `/blogs/<user_id>` | GET | Lista blog attivi |
| `/blogs/<user_id>/<blog_id>` | GET, PATCH, DELETE | Gestione blog |
| `/prompts/<user_id>` | GET, POST | System prompt |
| `/sessions` | GET | Lista sessioni (query `?user_id=`) |
| `/sessions/<id>` | GET, PATCH | Dettaglio sessione + messaggi |
| `/messages` | POST | Invio messaggio / generazione testo |
| `/images` | POST, GET | Generazione e lista immagini |
| `/uploads` | POST, GET | Upload file |
| `/send/<blog_id>` | POST | Pubblica post su WordPress |

---

## 6. Configurazione variabili d'ambiente

Da aggiungere nel `.env` di Wandly / Slideorama:

```env
# URL base del backend wp-draft-generator
API_BASE_URL=https://api.mavida.com/wp-draft-generator/v1

# Token del link temporaneo (fornito dall'admin — cambia a ogni rinnovo)
AGENT_ACCESS_TOKEN=<token_in_chiaro_ricevuto_da_POST_access-links>
```

> **Non committare mai `AGENT_ACCESS_TOKEN`** in chiaro nel repository.
> Usare le variabili d'ambiente del CI/CD (Vercel env vars, GitHub Secrets, ecc.).

---

## 7. Token di test (solo sviluppo locale)

Per sviluppo locale è disponibile un seed:
`database/seeds/test_agent_user_mavida.sql`

Token di test pre-configurati (validi fino al 2026-05-27 18:00 CEST):

```env
# Solo per test locale — NON usare in staging/produzione
AGENT_ACCESS_TOKEN=test-mavida-agent-access-link-2026-05-27
```

Oppure, per saltare l'exchange e usare direttamente la sessione pre-creata:

```typescript
// Solo per test — simula un exchange già avvenuto
const BEARER_TEST = 'test-mavida-agent-session-2026-05-27';
// Authorization: Bearer test-mavida-agent-session-2026-05-27
```

User ID dell'agente di test: recuperabile tramite:
```sql
SELECT id FROM generations_user WHERE email = 'test@mavida.com';
```

---

## 8. Checklist implementazione

- [ ] Aggiungere `AGENT_ACCESS_TOKEN` alle env vars del progetto (Vercel / .env.local)
- [ ] Creare `AgentAuthClient` (o equivalente) nel layer di servizio API
- [ ] Chiamare `exchange()` all'avvio dell'app (o al primo utilizzo — lazy init)
- [ ] Sostituire il token globale con `agentAuth.authHeader` in tutte le fetch verso wp-draft-generator
- [ ] Propagare `user_id` ricevuto dall'exchange nei path degli endpoint (`/profile/<user_id>`, ecc.)
- [ ] Gestire `401` e `503` con messaggi d'errore all'utente (non retry automatico)
- [ ] Non loggare mai il `session_token` né l'`AGENT_ACCESS_TOKEN` nei log di produzione
- [ ] Testare con il seed locale prima di richiedere un link di produzione all'admin

---

## 9. Curl — esempi rapidi

```bash
BASE="https://api.mavida.com/wp-draft-generator/v1"
ACCESS_TOKEN="test-mavida-agent-access-link-2026-05-27"

# Step 1: exchange
RESP=$(curl -s -X POST "$BASE/access-links/exchange" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$ACCESS_TOKEN\"}")

SESSION_TOKEN=$(echo $RESP | jq -r '.session_token')
USER_ID=$(echo $RESP | jq -r '.user_id')

echo "Session token: $SESSION_TOKEN"
echo "User ID: $USER_ID"

# Step 2: uso del session token
curl -s "$BASE/profile/$USER_ID" \
  -H "Authorization: Bearer $SESSION_TOKEN" | jq

# Step 3: invio messaggio
curl -s -X POST "$BASE/messages" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"message\": \"Ciao, genera un articolo su...\",
    \"system_prompt\": \"Sei un copywriter esperto.\"
  }" | jq
```

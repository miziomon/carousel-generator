# Sistema di autenticazione OTP — Specifiche tecniche

> **Versione:** Wandly v0.9.4  
> **Scopo:** Documento di riferimento per comprendere e riutilizzare il sistema di autenticazione OTP in un'altra applicazione.

---

## 1. Panoramica generale

Wandly usa autenticazione **OTP via email** (One-Time Password) senza password. L'utente inserisce la propria email, riceve un codice a 6 cifre via email e lo inserisce per completare il login. Non esistono password né sessioni lato server da mantenere: il token di sessione viene gestito interamente lato browser tramite `localStorage`.

L'autenticazione è completamente **stateless lato frontend**: dopo il login, il browser memorizza i dati utente in `localStorage` e li riutilizza ad ogni ricarica della pagina finché l'utente non fa logout esplicito o cancella i dati del browser.

**Non vengono usati cookie di sessione, service worker di autenticazione o token JWT con scadenza automatica.**

---

## 2. Flusso completo passo per passo

### Fase 1 — Schermata Email (`authStep: 'email'`)

1. L'utente inserisce la propria email nel campo e preme **"Invia codice"**
2. Il frontend valida l'email con regex di base (non sostituisce la validazione server-side)
3. Chiamata API: `POST /otp-request` con `{ email }`
4. Se il backend risponde `200 OK`, il frontend:
   - Salva l'email nello store Zustand (`pendingEmail`)
   - Cambia `authStep` da `'email'` a `'otp'`
   - Mostra la schermata OTP
5. In caso di errore, il messaggio del backend viene mostrato come toast

### Fase 2 — Schermata OTP (`authStep: 'otp'`)

1. L'utente inserisce il codice a 6 cifre in altrettanti input separati
   - Il focus si sposta automaticamente al campo successivo ad ogni digit
   - Il paste del codice intero (es. dalla mail) è supportato: riempie tutti i campi in un colpo
2. Chiamata API: `POST /otp-verify` con `{ email, otp_code }`
3. Se il backend risponde `200 OK` (OTP valido e non scaduto), il frontend:
   - Chiama `loginSuccess({ email, userId, role: null, plan: null })`
   - `loginSuccess` serializza l'oggetto utente in `localStorage` alla chiave `wandly:user_session`
   - Lo Zustand store aggiorna `user`, `isLoggedIn: true`, e resetta `authStep` a `'email'` (per la prossima sessione)
4. **In background** (non bloccante), carica il profilo utente:
   - Chiamata API: `GET /profile/{userId}`
   - Se ha successo, aggiorna `role` e `plan` nell'oggetto utente (store + localStorage)
   - Se fallisce: silenzioso — `role` rimane `null` e l'app funziona normalmente

### Fase 3 — Accesso all'app

- Il componente root legge `isLoggedIn` dallo store Zustand
- `isLoggedIn` è inizializzato a `true` se `localStorage` contiene `wandly:user_session` con un valore non-null
- Se `isLoggedIn === true` → rendering dell'app principale
- Se `isLoggedIn === false` → rendering di `LoginScreen`

---

## 3. Diagramma del flusso

```
Browser                        Backend
  │                               │
  │  [Utente inserisce email]      │
  │                               │
  │──── POST /otp-request ────────►│
  │          { email }             │
  │                               │  genera codice 6 cifre
  │                               │  invia email con il codice
  │◄── 200 { success: true } ─────│
  │                               │
  │  [authStep = 'otp']           │
  │  [Utente inserisce codice]     │
  │                               │
  │──── POST /otp-verify ─────────►│
  │    { email, otp_code }         │
  │                               │  verifica: esiste? scaduto? già usato?
  │                               │  se ok: marca come usato (atomico)
  │◄── 200 { user_id, email } ────│
  │                               │
  │  [loginSuccess()]             │
  │  [salva in localStorage]      │
  │  [isLoggedIn = true]          │
  │                               │
  │──── GET /profile/{userId} ────►│  (background, non bloccante)
  │◄── { role, plan, ... } ───────│
  │                               │
  │  [setUserRole(role, plan)]    │
  │  [aggiorna localStorage]      │
```

---

## 4. Endpoint API coinvolti

### 4.1 `POST /otp-request`

Richiede l'invio del codice OTP via email.

**Request:**
```http
POST {API_BASE}otp-request
Content-Type: application/json

{
  "email": "utente@esempio.com"
}
```

**Response 200:**
```json
{
  "success": true
}
```

**Response errori comuni:**
- `400` — email non valida o non registrata
- `429` — troppe richieste (rate limit)

**Note implementative:** Non è necessario un Bearer token. Il backend crea o recupera l'utente tramite l'email, genera il codice e lo invia. Il codice scade in 10 minuti.

---

### 4.2 `POST /otp-verify`

Verifica il codice OTP inserito dall'utente.

**Request:**
```http
POST {API_BASE}otp-verify
Content-Type: application/json

{
  "email": "utente@esempio.com",
  "otp_code": "123456"
}
```

**Response 200:**
```json
{
  "user_id": "bc37ef46-4479-4664-9314-294c99686205",
  "email": "utente@esempio.com"
}
```

**Response errori comuni:**
- `400` — codice errato, scaduto o già usato
- `404` — utente non trovato

**Note implementative:**
- Il backend verifica esistenza, scadenza e stato del codice in un'unica transazione atomica, poi lo marca come usato.
- Il `user_id` restituito è l'UUID dell'utente nel database (tabella `generations_user_sessions` o equivalente).
- Il frontend salva solo `user_id` ed `email`; non esistono JWT né refresh token.

---

### 4.3 `GET /profile/{userId}`

Recupera ruolo e piano dell'utente. Chiamato in background dopo il login riuscito.

**Request:**
```http
GET {API_BASE}profile/{userId}
Authorization: Bearer {VITE_API_AUTH_TOKEN}
```

**Response 200:**
```json
{
  "user_id": "bc37ef46-...",
  "username": "mario",
  "email": "mario@esempio.com",
  "role": "user",
  "plan": "basic"
}
```

**Valori `role`:** `'user'` | `'admin'`  
**Valori `plan`:** `'basic'` | `'personal'` | `'pro'`

---

## 5. Gestione dello stato — Zustand `authStore`

Lo store è in `src/stores/authStore.js`.

### Stato

| Campo | Tipo | Default | Descrizione |
|---|---|---|---|
| `user` | `AuthUser\|null` | da localStorage | Dati utente, `null` se non loggato |
| `isLoggedIn` | `boolean` | `user !== null` | Flag di sessione attiva |
| `authStep` | `'email'\|'otp'` | `'email'` | Fase corrente del flusso login |
| `pendingEmail` | `string` | `''` | Email inserita, in attesa dell'OTP |
| `isAuthLoading` | `boolean` | `false` | Spinner durante chiamate API auth |

### Tipo `AuthUser`

```js
{
  email:  string,       // Email dell'utente
  userId: string,       // UUID (da /otp-verify → user_id)
  role:   string|null,  // 'user' | 'admin' (da /profile)
  plan:   string|null,  // 'basic' | 'personal' | 'pro' (da /profile)
}
```

### Azioni principali

| Azione | Chiamata da | Effetto |
|---|---|---|
| `setPendingEmail(email)` | `EmailStep` dopo OTP inviato | Salva email, `authStep → 'otp'` |
| `loginSuccess(user)` | `OtpStep` dopo verifica OK | Salva utente in store + localStorage, `isLoggedIn → true` |
| `logout()` | Sidebar / Header | Pulisce store + **tutto** il localStorage Wandly |
| `resetToEmailStep()` | `OtpStep` ("Cambia email") | Torna alla schermata email |
| `setUserRole(role, plan)` | `OtpStep` (background) | Aggiorna role/plan in store + localStorage |
| `setAuthLoading(bool)` | `EmailStep`, `OtpStep` | Gestisce stato loading durante le chiamate |

---

## 6. Persistenza nel browser — localStorage

### Chiave di autenticazione

| Chiave | Valore | Quando viene scritta | Quando viene cancellata |
|---|---|---|---|
| `wandly:user_session` | Oggetto JSON `AuthUser` | Al login riuscito (`loginSuccess`) | Al logout (`clearAllStorage`) |

### Struttura del valore serializzato

```json
{
  "email": "mario@esempio.com",
  "userId": "bc37ef46-4479-4664-9314-294c99686205",
  "role": "user",
  "plan": "basic"
}
```

Il valore viene aggiornato (riscritto) quando `setUserRole` porta i dati da `/profile`.

### Altre chiavi Wandly (non auth, ma cancellate al logout)

| Chiave | Contenuto |
|---|---|
| `wandly:canvas_title` | Ultimo titolo articolo generato |
| `wandly:canvas_content` | Ultimo HTML generato |
| `wandly:selected_blog` | Blog selezionato nel dropdown |
| `wandly:selected_persona` | Persona AI selezionata |
| `wandly:selected_status` | Status WordPress (draft/publish/...) |
| `wandly:last_message` | Ultimo messaggio inviato in chat |

Tutte le chiavi usano il prefisso `wandly:` per isolarsi da altre app nello stesso dominio.

### Non vengono usati

- **Cookie** — nessuno, né di sessione né persistenti
- **sessionStorage** — non utilizzato
- **IndexedDB** — non utilizzato
- **Service Worker** — presente solo per PWA caching (offline), non per l'autenticazione
- **JWT / refresh token** — non esistono; la sessione è semplicemente l'oggetto `AuthUser` salvato in localStorage

---

## 7. Inizializzazione al ricaricamento della pagina

All'avvio dell'app, `authStore` legge subito `localStorage`:

```js
user:       loadFromStorage('wandly:user_session', null),
isLoggedIn: loadFromStorage('wandly:user_session', null) !== null,
```

- Se `wandly:user_session` esiste → `isLoggedIn: true`, l'app mostra subito l'interfaccia principale senza richiedere di nuovo il login
- Se non esiste o il JSON non è parsabile → `isLoggedIn: false`, viene mostrata la `LoginScreen`

Non c'è nessuna verifica server-side della sessione al ricaricamento. La sessione si considera valida finché il dato è in localStorage.

---

## 8. Logout

Il logout è gestito dall'azione `logout()` dello store:

1. Chiama `clearAllStorage()` — rimuove **tutte** le chiavi con prefisso `wandly:` da localStorage
2. Resetta lo store: `user: null`, `isLoggedIn: false`, `authStep: 'email'`
3. Il componente root rileva `isLoggedIn: false` e mostra `LoginScreen`

Non viene effettuata nessuna chiamata API al logout (nessuna invalidazione server-side della sessione).

---

## 9. Sicurezza — note e limitazioni

| Aspetto | Comportamento attuale |
|---|---|
| **Scadenza OTP** | Il backend gestisce la scadenza (10 min) e il mono-uso del codice |
| **Scadenza sessione** | **Non implementata**: la sessione in localStorage non ha TTL; rimane valida indefinitamente o finché l'utente fa logout manuale |
| **Protezione API** | Ogni chiamata autenticata include `Authorization: Bearer {TOKEN}` (token fisso da variabile d'ambiente, non per-utente) |
| **Verifica sessione al ricaricamento** | Non avviene: la presenza del record in localStorage è condizione sufficiente |
| **HTTPS** | Necessario in produzione; il codice OTP viaggia via email, non nel canale HTTP |
| **XSS** | Rischio standard per dati in localStorage; un attacco XSS può leggere `wandly:user_session` |
| **localStorage disabilitato** | Le utility di storage catturano l'eccezione con `console.warn`; l'app degrada (non persiste la sessione ma funziona nella sessione corrente) |

---

## 10. Come riutilizzare il sistema in un'altra app

### Dipendenze frontend richieste

- **Zustand** — per lo state management della sessione (può essere sostituito con Context/Redux/altro)
- **Axios** — per le chiamate API (può essere sostituito con `fetch`)
- **sonner** (o equivalente) — per i toast di feedback

### File da portare / adattare

| File | Cosa adattare |
|---|---|
| `src/stores/authStore.js` | Cambiare il prefisso chiavi storage; adattare `AuthUser` ai campi del proprio backend |
| `src/utils/storage.js` | Cambiare `wandly:` in `{nomeprogetto}:` nelle chiavi |
| `src/services/api.js` (sezione auth) | Cambiare `API_BASE` e il nome degli endpoint |
| `src/components/auth/EmailStep.jsx` | Adattare lo stile; la logica può rimanere identica |
| `src/components/auth/OtpStep.jsx` | Adattare lo stile; la logica può rimanere identica |
| `src/components/auth/LoginScreen.jsx` | Adattare branding e layout |

### Contratto minimo degli endpoint backend

Il backend deve esporre almeno:

```
POST /otp-request     { email }                    → { success: true }
POST /otp-verify      { email, otp_code }          → { user_id, email }
```

Il campo restituito da `/otp-verify` mappato su `userId` nello store deve essere uno stesso identificatore univoco stabile (UUID o simile) per recuperare i dati dell'utente nelle chiamate successive.

### Checklist per il porting

- [ ] Definire il prefisso `localStorage` univoco per la nuova app
- [ ] Configurare le variabili d'ambiente (`API_BASE_URL`, `API_AUTH_TOKEN`)
- [ ] Adattare il tipo `AuthUser` ai campi del proprio backend
- [ ] Implementare (o riutilizzare) `clearAllStorage` per il logout
- [ ] Decidere se implementare la scadenza della sessione lato frontend (non presente in Wandly)
- [ ] Verificare che il backend gestisca rate limiting su `/otp-request`
- [ ] Gestire il caso localStorage disabilitato (modalità privata Safari, ecc.)

---

## 11. Struttura componenti

```
LoginScreen
├── EmailStep      → POST /otp-request
└── OtpStep        → POST /otp-verify
                   → GET  /profile/{userId}  (background)
```

`LoginScreen` è mostrato da `AppLayout` (o dal componente root) quando `authStore.isLoggedIn === false`. Non esiste un router dedicato per le route auth: il routing è puramente condizionale basato sullo stato Zustand.

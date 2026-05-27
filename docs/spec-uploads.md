# Spec: Endpoint `/uploads` — Gestione file su Supabase Storage

**Data:** 2026-05-27
**Versione backend:** v0.58.1
**Tabella DB:** `generations_uploads`
**Bucket Supabase:** configurabile via `MEDIA_STORAGE_BUCKET`

---

## Obiettivo

Fornire un endpoint per caricare, elencare e recuperare file di vario tipo
(immagini, PDF, testo, markdown) associati a un utente. I file sono salvati
su Supabase Storage con bucket pubblico, ma i nomi file sono generati
crittograficamente per prevenire l'enumerazione.

---

## Sicurezza dei nomi file

Il nome file nel bucket è **sempre generato dal backend** usando 24 caratteri
alfanumerici casuali (`secrets.choice`, CSPRNG). Il nome originale caricato
dal client (`original_filename`) viene solo registrato nel DB come metadato.

```
original_filename: "bilancio-2026.pdf"   ← visibile solo via API
storage_path:      "user_id/a3k9mz2p7qxlnr8t4ycw5b.pdf"  ← nel bucket
```

Questo rende l'indovinare o enumerare file praticamente impossibile anche
con bucket pubblico (2^(24×log2(36)) ≈ 2^124 combinazioni).

---

## File pubblici vs privati

### Campo `is_public`

| Valore | Comportamento |
|--------|--------------|
| `false` (default) | Visibile e accessibile solo al proprietario |
| `true` | Listato in GET /uploads (senza user_id) e accessibile via GET /uploads/{id} senza autenticazione |

### Percorso nel bucket

| Tipo file | Prefisso storage_path |
|-----------|----------------------|
| Privato | `{user_id}/{random24}.{ext}` |
| Pubblico | `public/{random24}.{ext}` |

Il prefisso `public/` nel bucket è puramente organizzativo (non ha effetti
di accesso — il controllo avviene via DB). Entrambi i percorsi usano il
nome file random per sicurezza.

---

## Logica di accesso per endpoint

### POST /uploads
- Richiede Bearer token (`@require_auth`)
- `user_id` obbligatorio (form field)
- `is_public` opzionale (default `false`)

### GET /uploads
| Scenario | Auth | Risultato |
|----------|------|-----------|
| Senza `user_id` | Non richiesta | Solo file con `is_public=true` |
| Con `user_id` | Richiesta (401 altrimenti) | File dell'utente + file pubblici |

### GET /uploads/{id}
| Scenario | Auth | Risultato |
|----------|------|-----------|
| File `is_public=true` | Non richiesta | Restituisce record |
| File `is_public=false` + `user_id` corretto | Richiesta | Restituisce record |
| File `is_public=false` + `user_id` errato | — | 404 (no leakage) |
| File `is_public=false` senza `user_id` | — | 401 |

### PATCH /uploads/{id}
- Richiede Bearer token
- Solo il proprietario (`user_id` nel body) può modificare, anche se `is_public=true`

---

## Tipi MIME supportati

| Tipo | MIME type |
|------|-----------|
| JPEG | `image/jpeg` |
| PNG | `image/png` |
| GIF | `image/gif` |
| WebP | `image/webp` |
| PDF | `application/pdf` |
| Testo | `text/plain` |
| Markdown | `text/markdown`, `text/x-markdown` |

Dimensione massima: `MAX_UPLOAD_MB` (default 20 MB).

---

## Schema DB — `generations_uploads`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGINT IDENTITY | PK |
| `user_id` | UUID | FK → generations_user, NOT NULL |
| `original_filename` | TEXT | Nome originale del file |
| `storage_path` | TEXT | Percorso nel bucket |
| `public_url` | TEXT | URL pubblico Supabase Storage |
| `mime_type` | TEXT | Tipo MIME |
| `file_size_bytes` | INTEGER | Nullable |
| `title` | TEXT | Display name opzionale |
| `description` | TEXT | Note opzionali |
| `is_public` | BOOLEAN | Default FALSE |
| `created_at` | TIMESTAMPTZ | Default NOW() |
| `expires_at` | TIMESTAMPTZ | Nullable (non implementato lato route) |

---

## Variabili d'ambiente

| Variabile | Obbligatoria | Default | Descrizione |
|-----------|:---:|---------|-------------|
| `MEDIA_STORAGE_BUCKET` | ✓ | — | Nome bucket Supabase (deve essere pubblico) |
| `RATE_LIMIT_UPLOADS_PER_MIN` | — | `10` | Max upload per IP al minuto |
| `MAX_UPLOAD_MB` | — | `20` | Dimensione massima file in MB |

---

## Setup Supabase Storage

1. Aprire Supabase Dashboard → **Storage**
2. Creare nuovo bucket con nome uguale a `MEDIA_STORAGE_BUCKET`
3. Impostarlo come **pubblico** (Public bucket)
4. Non è necessario configurare policy: il backend usa la `service_role` key

---

## Esempi di implementazione

### 1. Upload file privato (immagine)

```bash
curl -X POST "https://api.mavida.com/wp-draft-generator/v1/uploads" \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -F "file=@foto-profilo.jpg" \
  -F "user_id=3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -F "title=Foto profilo"
```

**Risposta 201:**
```json
{
  "id": 42,
  "original_filename": "foto-profilo.jpg",
  "public_url": "https://xyz.supabase.co/storage/v1/object/public/media-uploads/3fa85f64.../a3k9mz2p7qxlnr8t4ycw5b.jpg",
  "mime_type": "image/jpeg",
  "file_size_bytes": 204800,
  "title": "Foto profilo",
  "description": null,
  "is_public": false,
  "created_at": "2026-05-27T10:00:00+00:00"
}
```

---

### 2. Upload file pubblico (PDF condiviso)

```bash
curl -X POST "https://api.mavida.com/wp-draft-generator/v1/uploads" \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -F "file=@brochure.pdf" \
  -F "user_id=3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -F "title=Brochure aziendale" \
  -F "is_public=true"
```

Il file sarà salvato in `public/a3k9mz2p7qxlnr8t4ycw5b.pdf` e sarà
visibile in GET /uploads senza autenticazione.

---

### 3. Lista file pubblici (no auth)

```bash
curl "https://api.mavida.com/wp-draft-generator/v1/uploads"
```

**Risposta:**
```json
{
  "uploads": [
    {
      "id": 43,
      "user_id": "3fa85f64-...",
      "original_filename": "brochure.pdf",
      "public_url": "https://xyz.supabase.co/...",
      "mime_type": "application/pdf",
      "is_public": true,
      ...
    }
  ],
  "count": 1
}
```

---

### 4. Lista file dell'utente + pubblici (con auth)

```bash
curl "https://api.mavida.com/wp-draft-generator/v1/uploads?user_id=3fa85f64-5717-4562-b3fc-2c963f66afa6&type=pdf" \
  -H "Authorization: Bearer $API_AUTH_TOKEN"
```

Restituisce i PDF dell'utente + tutti i PDF pubblici.

---

### 5. Accesso a file pubblico (no auth)

```bash
curl "https://api.mavida.com/wp-draft-generator/v1/uploads/43"
```

Nessun token richiesto. Restituisce il record con `public_url`.

---

### 6. Accesso a file privato (auth + user_id)

```bash
curl "https://api.mavida.com/wp-draft-generator/v1/uploads/42?user_id=3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -H "Authorization: Bearer $API_AUTH_TOKEN"
```

---

### 7. Aggiornamento metadati

```bash
curl -X PATCH "https://api.mavida.com/wp-draft-generator/v1/uploads/42" \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "title": "Foto profilo aggiornata",
    "description": "Versione 2026"
  }'
```

---

### 8. Esempio JavaScript (fetch)

```javascript
// Upload file privato
async function uploadFile(file, userId, token) {
  const form = new FormData();
  form.append('file', file);
  form.append('user_id', userId);
  form.append('title', file.name);

  const res = await fetch('/wp-draft-generator/v1/uploads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res.json();
}

// Lista file pubblici (no token)
async function getPublicFiles(type = null) {
  const url = new URL('/wp-draft-generator/v1/uploads', window.location.origin);
  if (type) url.searchParams.set('type', type);
  const res = await fetch(url);
  return res.json();
}

// Lista file utente + pubblici
async function getUserFiles(userId, token, type = null) {
  const url = new URL('/wp-draft-generator/v1/uploads', window.location.origin);
  url.searchParams.set('user_id', userId);
  if (type) url.searchParams.set('type', type);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
```

---

## Note di sicurezza

- **Non inviare mai `original_filename` al browser come nome di download**
  per evitare path traversal; usare `title` o un nome sicuro derivato dall'`id`.
- Il bucket è pubblico: chiunque con l'URL può accedere al file.
  La privacy si basa sull'imprevedibilità del nome file (24 char random,
  spazio ~2^124). Per documenti sensibili usare un bucket privato con
  signed URL (richiede modifica architettura).
- `PATCH` non permette di cambiare `is_public` dopo la creazione
  (modifica architettura richiesta se necessario in futuro).

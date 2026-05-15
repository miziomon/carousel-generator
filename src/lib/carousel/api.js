const BASE = import.meta.env.VITE_API_BASE_URL
const TOKEN = import.meta.env.VITE_API_AUTH_TOKEN

async function authFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message
    try {
      const body = await res.json()
      message = body?.message ?? body?.error ?? `Errore ${res.status}`
    } catch {
      message = `Errore ${res.status}`
    }
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

// ── Crea nuovo carosello ──────────────────────────────────────────────────────
export async function createCarousel({ user_id, title, content_json, thumbnail }) {
  return authFetch('carousel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, title, content_json, thumbnail }),
  })
}

// ── Sovrascrittura totale ─────────────────────────────────────────────────────
export async function updateCarousel(id, user_id, { title, content_json, thumbnail }) {
  return authFetch(`carousel/${id}?user_id=${user_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content_json, thumbnail }),
  })
}

// ── Aggiornamento parziale (rinomina) ─────────────────────────────────────────
export async function patchCarousel(id, user_id, partial) {
  return authFetch(`carousel/${id}?user_id=${user_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  })
}

// ── Recupera carosello completo ───────────────────────────────────────────────
export async function fetchCarousel(id, user_id) {
  return authFetch(`carousel/${id}?user_id=${user_id}`)
}

// ── Elimina carosello ─────────────────────────────────────────────────────────
export async function deleteCarousel(id, user_id) {
  return authFetch(`carousel/${id}?user_id=${user_id}`, { method: 'DELETE' })
}

// ── Lista caroselli con filtri ────────────────────────────────────────────────
export async function listCarousels({ user_id, search = '', sort = 'updated_at', order = 'desc', limit = 50, offset = 0, ai_generated } = {}) {
  const params = new URLSearchParams({ user_id, sort, order, limit: String(limit), offset: String(offset) })
  if (search) params.set('search', search)
  if (ai_generated !== undefined) params.set('ai_generated', String(ai_generated))
  return authFetch(`carousel?${params.toString()}`)
}

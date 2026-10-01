import { apiRequest } from '../http.js'

// ── Crea nuovo carosello ──────────────────────────────────────────────────────
export async function createCarousel({ user_id, title, content_json, thumbnail }) {
  return apiRequest({ method: 'POST', url: 'carousel', data: { user_id, title, content_json, thumbnail } })
}

// ── Sovrascrittura totale ─────────────────────────────────────────────────────
export async function updateCarousel(id, user_id, { title, content_json, thumbnail }) {
  return apiRequest({ method: 'PUT', url: `carousel/${id}?user_id=${user_id}`, data: { title, content_json, thumbnail } })
}

// ── Aggiornamento parziale (rinomina) ─────────────────────────────────────────
export async function patchCarousel(id, user_id, partial) {
  return apiRequest({ method: 'PATCH', url: `carousel/${id}?user_id=${user_id}`, data: partial })
}

// ── Recupera carosello completo ───────────────────────────────────────────────
export async function fetchCarousel(id, user_id) {
  return apiRequest({ url: `carousel/${id}?user_id=${user_id}` })
}

// ── Elimina carosello ─────────────────────────────────────────────────────────
export async function deleteCarousel(id, user_id) {
  return apiRequest({ method: 'DELETE', url: `carousel/${id}?user_id=${user_id}` })
}

// ── Lista caroselli con filtri ────────────────────────────────────────────────
export async function listCarousels({ user_id, search = '', sort = 'updated_at', order = 'desc', limit = 50, offset = 0, ai_generated } = {}) {
  const params = new URLSearchParams({ user_id, sort, order, limit: String(limit), offset: String(offset) })
  if (search) params.set('search', search)
  if (ai_generated !== undefined) params.set('ai_generated', String(ai_generated))
  return apiRequest({ url: `carousel?${params.toString()}` })
}

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

/**
 * Carica un'immagine sul server (POST /uploads).
 * Il file deve essere già processato (resize/compress) prima di chiamare questa funzione.
 *
 * @param {{ file: Blob|File, userId: string, title?: string, isPublic?: boolean }}
 * @returns {Promise<{ id: number, public_url: string, mime_type: string, title: string, is_public: boolean, created_at: string }>}
 */
export async function uploadImage({ file, userId, title, isPublic = false }) {
  const form = new FormData()
  form.append('file', file, title ?? 'immagine.jpg')
  form.append('user_id', userId)
  if (title) form.append('title', title)
  if (isPublic) form.append('is_public', 'true')

  // Content-Type non impostato: il browser aggiunge automaticamente il boundary multipart
  return authFetch('uploads', {
    method: 'POST',
    body: form,
    headers: {}, // override per non sovrascrivere Content-Type con JSON
  })
}

/**
 * Lista le immagini dell'utente + quelle pubbliche.
 *
 * @param {{ userId: string, type?: string, sort?: string, order?: string, limit?: number, offset?: number }}
 * @returns {Promise<{ uploads: Array, count: number }>}
 */
export async function listUploads({ userId, type = 'image', sort = 'created_at', order = 'desc', limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({ user_id: userId, type, sort, order, limit: String(limit), offset: String(offset) })
  return authFetch(`uploads?${params.toString()}`)
}

/**
 * Aggiorna i metadati di un upload (titolo, descrizione).
 *
 * @param {number} id
 * @param {{ userId: string, title?: string, description?: string }}
 * @returns {Promise<object>}
 */
export async function patchUpload(id, { userId, title, description }) {
  return authFetch(`uploads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, title, description }),
  })
}

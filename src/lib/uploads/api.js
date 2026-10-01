import { apiRequest } from '../http.js'

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

  // Con FormData axios rimuove il Content-Type: il browser aggiunge il boundary multipart
  return apiRequest({ method: 'POST', url: 'uploads', data: form })
}

/**
 * Lista le immagini dell'utente + quelle pubbliche.
 *
 * @param {{ userId: string, type?: string, sort?: string, order?: string, limit?: number, offset?: number }}
 * @returns {Promise<{ uploads: Array, count: number }>}
 */
export async function listUploads({ userId, type = 'image', sort = 'created_at', order = 'desc', limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({ user_id: userId, type, sort, order, limit: String(limit), offset: String(offset) })
  return apiRequest({ url: `uploads?${params.toString()}` })
}

/**
 * Aggiorna i metadati di un upload (titolo, descrizione).
 *
 * @param {number} id
 * @param {{ userId: string, title?: string, description?: string }}
 * @returns {Promise<object>}
 */
export async function patchUpload(id, { userId, title, description }) {
  return apiRequest({ method: 'PATCH', url: `uploads/${id}`, data: { user_id: userId, title, description } })
}

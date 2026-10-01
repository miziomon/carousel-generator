import { publicHttp } from '../http.js'

/**
 * Scambia un access-link token per una sessione agente.
 * Endpoint pubblico: nessun Authorization header.
 * @param {string} accessToken — token ricevuto via URL
 * @returns {{ sessionToken: string, userId: string, expiresAt: Date }}
 */
export async function exchangeAccessLink(accessToken) {
  // validateStatus sempre vero: gli stati di errore si mappano qui sotto in messaggi leggibili
  const res = await publicHttp.post('access-links/exchange', { token: accessToken }, {
    validateStatus: () => true,
  })

  if (res.status < 200 || res.status >= 300) {
    const body = typeof res.data === 'object' ? res.data : null
    const message = body?.message || body?.error || null
    if (res.status === 401) throw new Error('Link non valido, scaduto o revocato.')
    if (res.status === 429) throw new Error('Troppi tentativi, riprova tra poco.')
    if (res.status === 503) throw new Error('Servizio non disponibile — contatta l\'amministratore.')
    throw new Error(message || `Errore durante l'autenticazione (${res.status}).`)
  }

  const raw = res.data
  return {
    sessionToken: raw.session_token,
    userId: raw.user_id,
    expiresAt: new Date(raw.expires_at),
  }
}

/**
 * Legge il token di accesso dall'URL.
 * Cerca prima nel fragment hash (#access_token=...) — non viene inviato al server.
 * Fallback sul query string (?access_token=...).
 * @returns {string|null}
 */
export function readAccessTokenFromUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (hash.has('access_token')) return hash.get('access_token')

  const query = new URLSearchParams(window.location.search)
  if (query.has('access_token')) return query.get('access_token')

  return null
}

/**
 * Rimuove il token dall'URL dopo l'exchange.
 * Usa history.replaceState per non lasciare il token nella cronologia.
 */
export function stripAccessTokenFromUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)

  hash.delete('access_token')
  query.delete('access_token')

  const newHash = hash.toString() ? '#' + hash.toString() : ''
  const newSearch = query.toString() ? '?' + query.toString() : ''
  const newUrl = window.location.pathname + newSearch + newHash

  window.history.replaceState(null, '', newUrl)
}

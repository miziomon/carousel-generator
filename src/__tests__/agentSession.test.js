import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installHttpMock } from './helpers/mockHttp.js'
import {
  readAccessTokenFromUrl,
  stripAccessTokenFromUrl,
  exchangeAccessLink,
} from '../lib/auth/agentSession.js'

// ── Mock import.meta.env ───────────────────────────────────────────────────
vi.mock('../lib/auth/agentSession.js', async (importOriginal) => {
  const mod = await importOriginal()
  return mod
})

// ── Helper: imposta location.href simulando un URL specifico ──────────────
function setUrl(url) {
  const parsed = new URL(url)
  vi.stubGlobal('location', {
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    href: parsed.href,
  })

  // history.replaceState usato da stripAccessTokenFromUrl
  if (!vi.isMockFunction(window.history?.replaceState)) {
    vi.stubGlobal('history', { replaceState: vi.fn() })
  } else {
    window.history.replaceState.mockClear()
  }
}

// ── Legge il token dall'URL ────────────────────────────────────────────────

describe('readAccessTokenFromUrl', () => {
  it('ritorna null se non c\'è access_token nell\'URL', () => {
    setUrl('http://localhost:5173/')
    expect(readAccessTokenFromUrl()).toBeNull()
  })

  it('legge il token dal fragment hash (priorità)', () => {
    setUrl('http://localhost:5173/#access_token=hash-token-123')
    expect(readAccessTokenFromUrl()).toBe('hash-token-123')
  })

  it('legge il token dal query string come fallback', () => {
    setUrl('http://localhost:5173/?access_token=query-token-456')
    expect(readAccessTokenFromUrl()).toBe('query-token-456')
  })

  it('preferisce il hash rispetto al query string', () => {
    setUrl('http://localhost:5173/?access_token=query-token&access_token=hash-token#access_token=hash-wins')
    expect(readAccessTokenFromUrl()).toBe('hash-wins')
  })
})

// ── Rimuove il token dall'URL ──────────────────────────────────────────────

describe('stripAccessTokenFromUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('history', { replaceState: vi.fn() })
  })

  it('chiama replaceState rimuovendo il token dal hash', () => {
    setUrl('http://localhost:5173/#access_token=abc123')
    stripAccessTokenFromUrl()
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      expect.not.stringContaining('access_token'),
    )
  })

  it('chiama replaceState rimuovendo il token dal query string', () => {
    setUrl('http://localhost:5173/?access_token=abc123')
    stripAccessTokenFromUrl()
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      expect.not.stringContaining('access_token'),
    )
  })

  it('non modifica altri parametri nell\'URL', () => {
    setUrl('http://localhost:5173/?foo=bar&access_token=abc')
    stripAccessTokenFromUrl()
    const [, , newUrl] = window.history.replaceState.mock.calls[0]
    expect(newUrl).toContain('foo=bar')
    expect(newUrl).not.toContain('access_token')
  })
})

// ── Exchange token → sessione ──────────────────────────────────────────────

describe('exchangeAccessLink', () => {
  let http
  beforeEach(() => { http = installHttpMock() })
  afterEach(() => http.uninstall())

  it('mappa correttamente la risposta del backend in camelCase', async () => {
    http.respond({ body: {
        session_token: 'sess-abc',
        user_id: 'user-uuid-123',
        expires_at: '2026-05-27T18:00:00+00:00',
      } })

    const result = await exchangeAccessLink('test-token')
    expect(result.sessionToken).toBe('sess-abc')
    expect(result.userId).toBe('user-uuid-123')
    expect(result.expiresAt).toBeInstanceOf(Date)
    expect(result.expiresAt.toISOString()).toBe('2026-05-27T18:00:00.000Z')
  })

  it('lancia un errore leggibile per 401', async () => {
    http.respond({ status: 401, body: { error: 'Unauthorized' } })

    await expect(exchangeAccessLink('bad-token')).rejects.toThrow(
      'Link non valido, scaduto o revocato.',
    )
  })

  it('lancia un errore leggibile per 429', async () => {
    http.respond({ status: 429, body: { error: 'RateLimitExceeded' } })

    await expect(exchangeAccessLink('token')).rejects.toThrow(
      'Troppi tentativi, riprova tra poco.',
    )
  })

  it('lancia un errore leggibile per 503', async () => {
    http.respond({ status: 503, body: { error: 'Service Unavailable' } })

    await expect(exchangeAccessLink('token')).rejects.toThrow(
      'Servizio non disponibile',
    )
  })

  it('usa il messaggio del backend per errori generici', async () => {
    http.respond({ status: 500, body: { message: 'Internal server error' } })

    await expect(exchangeAccessLink('token')).rejects.toThrow(
      'Internal server error',
    )
  })

  it('usa un messaggio di fallback se il backend non invia dettagli', async () => {
    http.respond({ status: 500, body: {} })

    await expect(exchangeAccessLink('token')).rejects.toThrow('Errore durante')
  })
})

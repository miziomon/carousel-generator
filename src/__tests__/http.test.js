/**
 * Integrazione di lib/http.js con la libreria hub-auth VERA (nessun mock di
 * auth.js): token di sessione sugli header, logout automatico su 401,
 * endpoint pubblici senza credenziali.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Prima degli import: la sessione deve già esistere quando hub-auth si inizializza
// (la legge da localStorage in modo sincrono) e la validazione di GET /me non
// deve uscire in rete.
vi.hoisted(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.test/v1/')
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')))
  localStorage.setItem('carosello:hub_session', JSON.stringify({
    v: 1,
    token: 'real-token',
    user: { user_id: 'u1', email: 'a@b.it', username: null, role: null, plan: null, status: null, expires_at: null, tools: [] },
  }))
})

import { installHttpMock } from './helpers/mockHttp.js'
import { hubAuth } from '../auth.js'
import { http, publicHttp, apiRequest } from '../lib/http.js'

let mock
beforeEach(() => { mock = installHttpMock() })
afterEach(() => mock.uninstall())

describe('lib/http — integrazione con hub-auth', () => {
  it('aggiunge il Bearer della sessione corrente alle richieste autenticate', async () => {
    mock.respond({ body: { ok: true } })
    await apiRequest({ url: 'carousel' })
    expect(mock.lastRequest().header('authorization')).toBe('Bearer real-token')
  })

  it('un Authorization esplicito ha la precedenza sull interceptor', async () => {
    mock.respond({ body: {} })
    await http.get('carousel', { headers: { Authorization: 'Bearer esplicito' } })
    expect(mock.lastRequest().header('authorization')).toBe('Bearer esplicito')
  })

  it('gli endpoint pubblici non inviano mai credenziali', async () => {
    mock.respond({ body: {} })
    await publicHttp.post('access-links/exchange', { token: 'x' })
    expect(mock.lastRequest().header('authorization')).toBeUndefined()
  })

  it('usa baseURL + percorso relativo', async () => {
    mock.respond({ body: {} })
    await apiRequest({ url: 'uploads?x=1' })
    expect(mock.lastRequest().url).toBe('https://api.test/v1/uploads?x=1')
  })

  // Ultimo: chiude la sessione
  it('401 su una richiesta con il token corrente chiude la sessione', async () => {
    expect(hubAuth.getToken()).toBe('real-token')
    mock.respond({ status: 401, body: { message: 'Sessione scaduta' } })

    const err = await apiRequest({ url: 'carousel' }).catch((e) => e)

    expect(err.status).toBe(401)
    expect(err.message).toBe('Sessione scaduta')
    expect(hubAuth.getToken()).toBeNull()
    expect(hubAuth.getState().status).toBe('anonymous')
  })
})

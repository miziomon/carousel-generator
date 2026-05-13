import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadSession, saveSession, clearSession } from '../lib/auth/storage.js'

const SESSION_KEY = 'carosello:user_session'
const DRAFT_KEY = 'carosello.draft.v1'

function makeLocalStorageMock() {
  let store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { store = {} },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock())
})

describe('loadSession', () => {
  it('ritorna null se non c\'è nessuna sessione', () => {
    expect(loadSession()).toBeNull()
  })

  it('ritorna l\'oggetto utente se presente', () => {
    const user = { email: 'test@example.com', userId: 'abc123', role: null, plan: null }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    expect(loadSession()).toEqual(user)
  })

  it('ritorna null (senza throw) se il JSON è corrotto', () => {
    localStorage.setItem(SESSION_KEY, 'non-json{{{')
    expect(loadSession()).toBeNull()
  })
})

describe('saveSession', () => {
  it('salva l\'oggetto in localStorage', () => {
    const user = { email: 'a@b.com', userId: 'u1', role: 'user', plan: 'basic' }
    saveSession(user)
    expect(JSON.parse(localStorage.getItem(SESSION_KEY))).toEqual(user)
  })

  it('aggiorna la sessione esistente', () => {
    saveSession({ email: 'a@b.com', userId: 'u1', role: null, plan: null })
    saveSession({ email: 'a@b.com', userId: 'u1', role: 'admin', plan: 'pro' })
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)).role).toBe('admin')
  })
})

describe('clearSession', () => {
  it('rimuove solo la chiave di sessione', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: 'x@y.com', userId: 'u2', role: null, plan: null }))
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: 'bozza', slides: [] }))
    clearSession()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull()
  })

  it('non lancia eccezioni se non c\'è nessuna sessione', () => {
    expect(() => clearSession()).not.toThrow()
  })
})

describe('roundtrip save → load → clear', () => {
  it('persiste e recupera correttamente la sessione', () => {
    const user = { email: 'mario@esempio.com', userId: 'uuid-123', role: 'user', plan: 'personal' }
    saveSession(user)
    expect(loadSession()).toEqual(user)
    clearSession()
    expect(loadSession()).toBeNull()
  })
})

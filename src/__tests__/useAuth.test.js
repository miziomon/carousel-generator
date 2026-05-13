import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../hooks/useAuth.js'
import { loadSession } from '../lib/auth/storage.js'

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

describe('inizializzazione', () => {
  it('parte come non loggato se localStorage è vuoto', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.authStep).toBe('email')
  })

  it('parte come loggato se la sessione è presente in localStorage', () => {
    const user = { email: 'a@b.com', userId: 'u1', role: 'user', plan: 'basic' }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    const { result } = renderHook(() => useAuth())
    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user).toEqual(user)
  })
})

describe('loginSuccess', () => {
  it('setta isLoggedIn e scrive la sessione in localStorage', () => {
    const { result } = renderHook(() => useAuth())
    const user = { email: 'test@test.com', userId: 'abc', role: null, plan: null }
    act(() => {
      result.current.loginSuccess(user)
    })
    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user).toEqual(user)
    expect(loadSession()).toEqual(user)
  })
})

describe('setUserRole', () => {
  it('aggiorna role e plan nello state e nel localStorage', () => {
    const { result } = renderHook(() => useAuth())
    const user = { email: 'x@y.com', userId: 'u2', role: null, plan: null }
    act(() => { result.current.loginSuccess(user) })
    act(() => { result.current.setUserRole('admin', 'pro') })
    expect(result.current.user.role).toBe('admin')
    expect(result.current.user.plan).toBe('pro')
    expect(loadSession().role).toBe('admin')
  })
})

describe('logout', () => {
  it('setta isLoggedIn:false e rimuove la sessione', () => {
    const user = { email: 'a@b.com', userId: 'u1', role: null, plan: null }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.logout() })
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
    expect(loadSession()).toBeNull()
  })

  it('non tocca il draft del carosello', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: 'bozza', slides: [] }))
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: 'a@b.com', userId: 'u1', role: null, plan: null }))
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.logout() })
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull()
  })
})

describe('setPendingEmail', () => {
  it('salva l\'email e porta authStep a otp', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.setPendingEmail('pippo@test.com') })
    expect(result.current.pendingEmail).toBe('pippo@test.com')
    expect(result.current.authStep).toBe('otp')
  })
})

describe('resetToEmailStep', () => {
  it('riporta authStep a email', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.setPendingEmail('x@y.com') })
    act(() => { result.current.resetToEmailStep() })
    expect(result.current.authStep).toBe('email')
  })
})

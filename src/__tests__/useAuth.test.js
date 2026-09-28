import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '../hooks/useAuth.js'

// useAuth.js è un wrapper sottile su useHubAuth (@mavida/hub-auth/react): la
// sessione, la persistenza e la guardia sul 401 sono testate nella libreria
// (hub-auth/tests/client.test.ts). Qui si copre solo la mappatura verso la
// forma pubblica attesa da App.jsx/Header.jsx (user.userId invece di
// user.user_id) e la derivazione del tier.
const mockUseHubAuth = vi.fn()
vi.mock('@mavida/hub-auth/react', () => ({
  useHubAuth: () => mockUseHubAuth(),
}))

function setHubAuthState(overrides) {
  mockUseHubAuth.mockReturnValue({
    status: 'anonymous',
    user: null,
    logout: vi.fn(),
    ...overrides,
  })
}

describe('useAuth', () => {
  it('non loggato: user null, isLoggedIn false', () => {
    setHubAuthState({ status: 'anonymous' })
    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.isChecking).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.tier).toBe('anonymous')
  })

  it('sessione in verifica al boot: isChecking true, non ancora loggato', () => {
    setHubAuthState({ status: 'checking' })
    const { result } = renderHook(() => useAuth())

    expect(result.current.isChecking).toBe(true)
    expect(result.current.isLoggedIn).toBe(false)
  })

  it('loggato: mappa user_id -> userId e deriva il tier da role/plan', () => {
    setHubAuthState({
      status: 'authenticated',
      user: { user_id: 'u1', email: 'mario@esempio.com', role: 'user', plan: 'pro', status: 'active', tools: [] },
    })
    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user).toEqual({
      email: 'mario@esempio.com', userId: 'u1', role: 'user', plan: 'pro',
    })
    expect(result.current.tier).toBe('pro')
  })

  it('utente admin: tier admin indipendentemente dal piano', () => {
    setHubAuthState({
      status: 'authenticated',
      user: { user_id: 'u1', email: 'a@esempio.com', role: 'admin', plan: 'basic' },
    })
    const { result } = renderHook(() => useAuth())

    expect(result.current.tier).toBe('admin')
  })

  it('logout è lo stesso riferimento esposto da useHubAuth', () => {
    const logout = vi.fn()
    setHubAuthState({ status: 'anonymous', logout })
    const { result } = renderHook(() => useAuth())

    expect(result.current.logout).toBe(logout)
  })
})

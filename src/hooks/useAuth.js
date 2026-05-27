import { useReducer, useCallback, useEffect } from 'react'
import { loadSession, saveSession, clearSession } from '../lib/auth/storage.js'
import { getTier } from '../lib/auth/tier.js'

const initialState = {
  user: null,
  isLoggedIn: false,
  authStep: 'email',
  pendingEmail: '',
  isAuthLoading: false,
  expiredLinkMessage: null,
}

function buildInitialState() {
  const session = loadSession()
  if (!session) return initialState

  // Se la sessione agent-link è scaduta, non la ripristiniamo
  if (session.authMethod === 'agent-link' && session.sessionExpiresAt) {
    if (new Date(session.sessionExpiresAt) <= new Date()) {
      clearSession()
      return {
        ...initialState,
        expiredLinkMessage: 'Il link di accesso è scaduto. Richiedi un nuovo link all\'amministratore.',
      }
    }
  }

  return { ...initialState, user: session, isLoggedIn: true }
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_PENDING_EMAIL':
      return { ...state, pendingEmail: action.email, authStep: 'otp' }

    case 'LOGIN_SUCCESS': {
      const user = action.user
      saveSession(user)
      return { ...state, user, isLoggedIn: true, authStep: 'email', pendingEmail: '' }
    }

    case 'SET_USER_ROLE': {
      const user = { ...state.user, role: action.role, plan: action.plan }
      saveSession(user)
      return { ...state, user }
    }

    case 'LINK_EXPIRED':
      clearSession()
      return {
        ...initialState,
        expiredLinkMessage: 'Il link di accesso è scaduto. Richiedi un nuovo link all\'amministratore.',
      }

    case 'LOGOUT':
      clearSession()
      return { ...initialState }

    case 'RESET_TO_EMAIL':
      return { ...state, authStep: 'email' }

    case 'SET_AUTH_LOADING':
      return { ...state, isAuthLoading: action.loading }

    default:
      return state
  }
}

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, null, buildInitialState)

  const setPendingEmail = useCallback((email) => {
    dispatch({ type: 'SET_PENDING_EMAIL', email })
  }, [])

  const loginSuccess = useCallback((user) => {
    dispatch({ type: 'LOGIN_SUCCESS', user })
  }, [])

  const setUserRole = useCallback((role, plan) => {
    dispatch({ type: 'SET_USER_ROLE', role, plan })
  }, [])

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
  }, [])

  const resetToEmailStep = useCallback(() => {
    dispatch({ type: 'RESET_TO_EMAIL' })
  }, [])

  const setAuthLoading = useCallback((loading) => {
    dispatch({ type: 'SET_AUTH_LOADING', loading })
  }, [])

  const expireLink = useCallback(() => {
    dispatch({ type: 'LINK_EXPIRED' })
  }, [])

  // Timer di scadenza automatica per sessioni agent-link
  useEffect(() => {
    const user = state.user
    if (!user || user.authMethod !== 'agent-link' || !user.sessionExpiresAt) return

    const msLeft = new Date(user.sessionExpiresAt).getTime() - Date.now()
    if (msLeft <= 0) {
      expireLink()
      return
    }

    const timer = setTimeout(expireLink, msLeft)
    return () => clearTimeout(timer)
  }, [state.user, expireLink])

  const tier = getTier(state.user, state.isLoggedIn)

  return {
    ...state,
    tier,
    setPendingEmail,
    loginSuccess,
    setUserRole,
    logout,
    resetToEmailStep,
    setAuthLoading,
    expireLink,
  }
}

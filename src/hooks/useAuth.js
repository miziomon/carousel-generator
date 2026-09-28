import { useHubAuth } from '@mavida/hub-auth/react'
import { getTier } from '../lib/auth/tier.js'

/**
 * Hook useAuth — wrapper di compatibilità su @mavida/hub-auth.
 *
 * Il flusso OTP e il magic link (adottato via hubAuth.adoptSession, vedi
 * hooks/useMagicLinkLogin.js) sono entrambi gestiti dalla libreria condivisa
 * (persistenza, guardia sul 401, validazione al boot con GET /me). Questo
 * hook mantiene solo la forma pubblica usata da App.jsx/Header.jsx
 * ({user, isLoggedIn, tier, logout}), con `user.userId` al posto di
 * `user.user_id` per non toccare quei due file.
 *
 * @returns {{user: {email: string, userId: string, role: string|null, plan: string|null}|null,
 *   isLoggedIn: boolean, isChecking: boolean, tier: string, logout: () => void}}
 */
export function useAuth() {
  const { status, user: hubUser, logout } = useHubAuth()

  const user = hubUser
    ? { email: hubUser.email, userId: hubUser.user_id, role: hubUser.role, plan: hubUser.plan }
    : null
  const isLoggedIn = status === 'authenticated'

  return {
    user,
    isLoggedIn,
    isChecking: status === 'checking',
    tier: getTier(user, isLoggedIn),
    logout,
  }
}

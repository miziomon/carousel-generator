import { useState, useEffect } from 'react'
import { readAccessTokenFromUrl, exchangeAccessLink, stripAccessTokenFromUrl } from '../lib/auth/agentSession.js'
import { getProfile } from '../lib/auth/api.js'

/**
 * Gestisce il bootstrap del magic link all'avvio dell'app.
 * Se nell'URL è presente un access_token, lo scambia per una sessione agente,
 * recupera il profilo utente e chiama auth.loginSuccess.
 * Se l'exchange fallisce, espone l'errore via linkError per mostrarlo nella LoginScreen.
 *
 * @param {object} auth - l'oggetto restituito da useAuth()
 * @returns {{ isExchanging: boolean, linkError: string|null }}
 */
export function useMagicLinkLogin(auth) {
  const [isExchanging, setIsExchanging] = useState(() => Boolean(readAccessTokenFromUrl()))
  const [linkError, setLinkError] = useState(null)

  useEffect(() => {
    const token = readAccessTokenFromUrl()
    if (!token) return

    let cancelled = false

    async function doExchange() {
      try {
        const { sessionToken, userId, expiresAt } = await exchangeAccessLink(token)
        if (cancelled) return

        const profile = await getProfile(userId)
        if (cancelled) return

        auth.loginSuccess({
          email: profile.email ?? '',
          userId,
          role: profile.role ?? 'user',
          plan: profile.plan ?? 'basic',
          authMethod: 'agent-link',
          sessionToken,
          sessionExpiresAt: expiresAt.toISOString(),
        })
      } catch (err) {
        if (cancelled) return
        setLinkError(err.message ?? 'Errore durante l\'autenticazione via link.')
      } finally {
        if (!cancelled) {
          stripAccessTokenFromUrl()
          setIsExchanging(false)
        }
      }
    }

    doExchange()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isExchanging, linkError }
}

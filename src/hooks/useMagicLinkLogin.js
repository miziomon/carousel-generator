import { useState, useEffect } from 'react'
import { readAccessTokenFromUrl, exchangeAccessLink, stripAccessTokenFromUrl } from '../lib/auth/agentSession.js'
import { hubAuth } from '../auth.js'

/**
 * Gestisce il bootstrap del magic link all'avvio dell'app.
 * Se nell'URL è presente un access_token, lo scambia per una sessione agente
 * (session_token per-utente) e la adotta con hubAuth.adoptSession(): da quel
 * momento è gestita esattamente come una sessione OTP (persistenza, guardia
 * sul 401, refresh da GET /me per profilo/ruolo/piano — niente più una
 * getProfile separata col vecchio token statico).
 * Se l'exchange fallisce, espone l'errore via linkError per mostrarlo nella LoginScreen.
 *
 * @returns {{ isExchanging: boolean, linkError: string|null }}
 */
export function useMagicLinkLogin() {
  const [isExchanging, setIsExchanging] = useState(() => Boolean(readAccessTokenFromUrl()))
  const [linkError, setLinkError] = useState(null)

  useEffect(() => {
    const token = readAccessTokenFromUrl()
    if (!token) return

    let cancelled = false

    async function doExchange() {
      try {
        const { sessionToken, userId } = await exchangeAccessLink(token)
        if (cancelled) return

        await hubAuth.adoptSession({ token: sessionToken, user: { user_id: userId } })
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
  }, [])

  return { isExchanging, linkError }
}

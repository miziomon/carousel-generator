import { useState, useCallback, useEffect } from 'react'
import { listCarousels } from '../lib/carousel/api.js'

/**
 * Hook che traccia il numero di caroselli salvati dall'utente.
 * Esegue un fetch al boot (se loggato) e aggiorna il contatore dopo save/delete.
 */
export function useCarouselCount({ userId, isLoggedIn }) {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isLoggedIn || !userId) return
    setLoading(true)
    try {
      const data = await listCarousels({ user_id: userId, limit: 1 })
      setCount(data?.total ?? 0)
    } catch {
      // silenzioso — il count non è critico
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { count, loading, refresh }
}

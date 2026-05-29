import { useEffect, useRef } from 'react'
import { saveDraft } from '../lib/storage.js'

/**
 * Salva automaticamente il carousel su localStorage con debounce.
 * Chiama markSaved(timestamp) dopo ogni salvataggio riuscito.
 */
export function useAutoSave(carousel, isDirty, markSaved, delayMs = 800) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isDirty) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      // Rimuove solo gli id runtime delle slide (non degli sticker globali:
      // servono come chiavi stabili per sticker_order e sticker_overrides per-slide).
      const toSave = {
        ...carousel,
        slides: carousel.slides.map(({ id: _id, ...rest }) => rest),
      }
      const ok = saveDraft(toSave)
      if (ok) markSaved(Date.now())
    }, delayMs)

    return () => clearTimeout(timerRef.current)
  }, [carousel, isDirty, markSaved, delayMs])
}

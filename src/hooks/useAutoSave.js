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
      // Rimuove gli id runtime prima di salvare (JSON "pulito" senza id interni)
      const cleanTheme = carousel.theme?.global_stickers?.length
        ? { ...carousel.theme, global_stickers: carousel.theme.global_stickers.map(({ id: _id, ...rest }) => rest) }
        : carousel.theme
      const toSave = {
        ...carousel,
        theme:  cleanTheme,
        slides: carousel.slides.map(({ id: _id, ...rest }) => rest),
      }
      const ok = saveDraft(toSave)
      if (ok) markSaved(Date.now())
    }, delayMs)

    return () => clearTimeout(timerRef.current)
  }, [carousel, isDirty, markSaved, delayMs])
}

import { useEffect, useRef } from 'react'
import { savePalettes } from '../lib/storage.js'

/**
 * Salva automaticamente le palette utente su localStorage con debounce.
 * NON salva le built-in (origin: "system") — quelle vivono in codice.
 *
 * Chiave separata da carosello.draft — le palette sono entità globali,
 * non parte del documento di lavoro corrente.
 *
 * @param {Array<object>} paletteLibrary — array completo (system + user)
 * @param {number} delayMs — debounce in ms (default 800)
 */
export function usePaletteLibraryPersistence(paletteLibrary, delayMs = 800) {
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      // savePalettes filtra già internamente le origin: "user"
      savePalettes(paletteLibrary)
    }, delayMs)

    return () => clearTimeout(timerRef.current)
  }, [paletteLibrary, delayMs])
}

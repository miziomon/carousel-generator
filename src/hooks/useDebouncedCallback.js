import { useRef, useCallback } from 'react'

/**
 * Ritorna una versione debounciata di fn.
 * Il riferimento alla funzione restituita è stabile (useCallback su [delay]).
 * Espone .cancel() e .flush(...args) come proprietà.
 */
export function useDebouncedCallback(fn, delay) {
  const timerRef = useRef(null)
  // Aggiorna il ref senza invalidare la callback
  const fnRef = useRef(fn)
  fnRef.current = fn

  const debounced = useCallback(
    (...args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => fnRef.current(...args), delay)
    },
    [delay]
  )

  debounced.cancel = () => clearTimeout(timerRef.current)
  debounced.flush = (...args) => {
    clearTimeout(timerRef.current)
    fnRef.current(...args)
  }

  return debounced
}

import { useEffect } from 'react'

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

/**
 * Parsa una combo come "ctrl+z" o "ctrl+shift+z" in un oggetto di flag.
 * Usa "ctrl" sia per Ctrl (Win/Linux) sia per Cmd (Mac).
 */
function parseCombo(combo) {
  const parts = combo.toLowerCase().split('+')
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts[parts.length - 1],
  }
}

function matchesCombo(e, combo) {
  const { ctrl, shift, alt, key } = parseCombo(combo)
  const ctrlPressed = isMac ? e.metaKey : e.ctrlKey
  return (
    ctrlPressed === ctrl &&
    e.shiftKey === shift &&
    e.altKey === alt &&
    e.key.toLowerCase() === key
  )
}

/**
 * Registra scorciatoie globali da tastiera.
 * Le scorciatoie vengono ignorate se il focus è su input/textarea/select
 * (l'utente sta digitando e non vuole triggherare azioni globali).
 *
 * @param {Record<string, (e: KeyboardEvent) => void>} handlers - es. { 'ctrl+z': undoFn }
 */
export function useHotkeys(handlers) {
  useEffect(() => {
    function onKeyDown(e) {
      // Non intercettare se si sta digitando in un campo testo
      const tag = document.activeElement?.tagName
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        document.activeElement?.contentEditable === 'true'
      if (isEditable) return

      for (const [combo, fn] of Object.entries(handlers)) {
        if (matchesCombo(e, combo)) {
          e.preventDefault()
          fn(e)
          break
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  // handlers è un oggetto ricreato ad ogni render — lo stringifichiamo per evitare loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.keys(handlers))])
}

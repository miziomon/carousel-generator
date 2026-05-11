import { useEffect } from 'react'

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

/**
 * Collega Cmd/Ctrl+Z (undo) e Cmd/Ctrl+Shift+Z (redo) alle azioni dello store.
 * Non intercetta gli eventi quando il focus è su un campo testo.
 */
export function useUndoRedo(undo, redo) {
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        document.activeElement?.contentEditable === 'true'
      if (isEditable) return

      const ctrl = isMac ? e.metaKey : e.ctrlKey
      if (!ctrl) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])
}

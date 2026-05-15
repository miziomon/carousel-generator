import { timeAgo } from '../../lib/utils/timeAgo.js'
import '../carousel-library/carousel-library.css'

/**
 * Indicatore di stato sync tra documento locale e DB.
 * Quando dirty con documentId, mostra un bottone "Salva ora" cliccabile.
 */
export function SyncIndicator({ meta, onSaveNow }) {
  const { documentId, documentTitle, isDirty, isSaving, lastSavedToDbAt } = meta

  if (isSaving) {
    return (
      <span className="sync-indicator">
        <span className="sync-indicator__spinner" />
        Salvataggio…
      </span>
    )
  }

  if (!documentId) {
    if (isDirty) {
      return <span className="sync-indicator">Non salvato nel cloud</span>
    }
    return <span className="sync-indicator">Nuovo carosello</span>
  }

  if (isDirty) {
    return (
      <span className="sync-indicator">
        Modifiche non salvate
        {onSaveNow && (
          <>
            {' · '}
            <button type="button" className="sync-indicator--action" onClick={onSaveNow}>
              Salva ora
            </button>
          </>
        )}
      </span>
    )
  }

  return (
    <span className="sync-indicator sync-indicator--saved">
      {documentTitle ? `"${documentTitle}"` : 'Sincronizzato'}
      {lastSavedToDbAt && ` · ${timeAgo(lastSavedToDbAt)}`}
    </span>
  )
}

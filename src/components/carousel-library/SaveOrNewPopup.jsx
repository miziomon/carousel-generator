import { createPortal } from 'react-dom'
import { Button } from '../ui/Button.jsx'
import { timeAgo } from '../../lib/utils/timeAgo.js'
import './carousel-library.css'

/**
 * Popup di scelta "Sovrascrivi" vs "Salva come nuovo".
 * Appare quando l'utente clicca "Salva carosello" e il documento
 * ha già un documentId (è stato salvato in precedenza).
 */
export function SaveOrNewPopup({ open, onClose, documentTitle, lastSavedToDbAt, onOverwrite, onSaveAsNew }) {
  if (!open) return null

  return createPortal(
    <div className="save-or-new-popup" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="save-or-new-popup__box">
        <p className="save-or-new-popup__title">Vuoi sovrascrivere il carosello esistente?</p>
        <p className="save-or-new-popup__doc-name">{documentTitle}</p>
        {lastSavedToDbAt && (
          <p className="save-or-new-popup__meta">Ultimo salvataggio: {timeAgo(lastSavedToDbAt)}</p>
        )}
        <div className="save-or-new-popup__actions">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button variant="secondary" onClick={onSaveAsNew}>Salva come nuovo</Button>
          <Button variant="primary" onClick={onOverwrite}>Sovrascrivi</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

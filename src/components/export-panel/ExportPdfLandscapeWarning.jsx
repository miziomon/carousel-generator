import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'

/**
 * Dialog di conferma mostrato quando si tenta di esportare PDF in formato landscape.
 * LinkedIn visualizza i documenti landscape molto piccoli nel feed mobile.
 */
export function ExportPdfLandscapeWarning({ onCancel, onConfirm }) {
  return (
    <Modal open title="Formato landscape sconsigliato per LinkedIn" onClose={onCancel} size="sm">
      <div className="export-pdf-warning">
        <div className="export-pdf-warning__icon">
          <AlertTriangle size={32} />
        </div>
        <p className="export-pdf-warning__text">
          Hai selezionato il formato landscape (1.91:1). Su LinkedIn i documenti landscape si
          visualizzano molto piccoli nel feed mobile e perdono visibilità.
        </p>
        <p className="export-pdf-warning__suggest">
          Per LinkedIn ti consigliamo:
        </p>
        <ul className="export-pdf-warning__list">
          <li>Portrait (1080×1350) — massimo engagement</li>
          <li>Square (1080×1080) — buon compromesso</li>
        </ul>
        <p className="export-pdf-warning__question">Vuoi procedere comunque?</p>
        <div className="export-pdf-warning__actions">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Annulla
          </Button>
          <Button variant="secondary" size="sm" onClick={onConfirm}>
            Procedi con landscape
          </Button>
        </div>
      </div>
    </Modal>
  )
}

import { RefreshCw, X } from 'lucide-react'
import './update-toast.css'

/**
 * Avviso non invasivo quando è pronta una nuova versione dell'app (PWA, vedi
 * hooks/usePwaUpdate.js): niente reload automatico, l'utente sceglie quando
 * aggiornare.
 */
export function UpdateToast({ visible, onReload, onDismiss }) {
  if (!visible) return null

  return (
    <div className="update-toast" role="status" aria-live="polite">
      <RefreshCw size={16} className="update-toast__icon" aria-hidden="true" />
      <span className="update-toast__text">Nuova versione disponibile</span>
      <button type="button" className="update-toast__reload" onClick={onReload}>
        Aggiorna ora
      </button>
      <button
        type="button"
        className="update-toast__dismiss"
        onClick={onDismiss}
        aria-label="Chiudi avviso"
        title="Più tardi"
      >
        <X size={16} />
      </button>
    </div>
  )
}

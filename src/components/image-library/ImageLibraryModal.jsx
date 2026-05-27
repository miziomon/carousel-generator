import { Modal } from '../ui/Modal.jsx'
import { ImageLibraryPanel } from './ImageLibraryPanel.jsx'

/**
 * Wrapper modale per la libreria immagini (usato dalla sidebar).
 * Per l'EditModal si usa direttamente ImageLibraryPanel nel pannello di destra.
 *
 * Props:
 *   open, onClose
 *   userId     — UUID dell'utente loggato
 *   onSelect   — callback(upload) quando l'utente sceglie un'immagine
 */
export function ImageLibraryModal({ open, onClose, userId, onSelect }) {
  function handleSelect(upload) {
    onSelect(upload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Libreria immagini" size="xl">
      <div style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        <ImageLibraryPanel userId={userId} onSelect={handleSelect} />
      </div>
    </Modal>
  )
}

import { Modal } from './Modal.jsx'
import { Button } from './Button.jsx'

export function ConfirmDialog({ open, onConfirm, onCancel, title = 'Conferma', message, confirmLabel = 'Conferma', confirmVariant = 'danger' }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-slate-300 text-sm mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Annulla</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

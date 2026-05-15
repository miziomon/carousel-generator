import { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'

/**
 * Dialog per rinominare un carosello.
 * Props: open, onClose, item, onRename(id, newTitle)
 */
export function RenameCarouselDialog({ open, onClose, item, onRename }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setTitle(item?.title ?? '')
    setError(null)
    setSaving(false)
    setTimeout(() => { inputRef.current?.select(); inputRef.current?.focus() }, 60)
  }, [open, item])

  async function handleRename() {
    const trimmed = title.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      await onRename(item.id, trimmed)
      onClose()
    } catch (err) {
      setError(err.message ?? 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Rinomina carosello" size="sm">
      <input
        ref={inputRef}
        className="rename-dialog__input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !saving && title.trim()) handleRename() }}
        maxLength={200}
        disabled={saving}
      />
      {error && <p style={{ color: 'rgba(239,68,68,0.9)', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <div className="rename-dialog__footer">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Annulla</Button>
        <Button variant="primary" onClick={handleRename} disabled={saving || !title.trim()}>
          {saving ? 'Salvataggio…' : 'Rinomina'}
        </Button>
      </div>
    </Modal>
  )
}

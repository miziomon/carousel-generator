import { useEffect } from 'react'
import { Modal } from '../ui/Modal.jsx'

export function AiConfirmReplaceModal({ pendingResult, onConfirm, onCancel }) {
  const { carousel, meta } = pendingResult
  const slideCount = carousel?.slides?.length ?? 0

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onConfirm])

  return (
    <Modal open title="Sostituire il carosello attuale?" onClose={onCancel} size="sm">
      <div className="ai-confirm">
        <p className="ai-confirm__text">
          Il carosello generato contiene <strong>{slideCount}</strong> slide.
        </p>
        <p className="ai-confirm__text">
          Questa operazione sostituirà completamente il carosello corrente.{' '}
          Potrai annullare con <kbd>Ctrl+Z</kbd>.
        </p>

        <div className="ai-confirm__meta">
          {meta.model && <div><span>Modello:</span> {meta.model}</div>}
          {meta.usage?.total_tokens != null && (
            <div><span>Token:</span> {meta.usage.total_tokens.toLocaleString()}</div>
          )}
          {meta.jsonRepaired && meta.jsonRepaired !== 'none' && (
            <div><span>JSON repair:</span> {meta.jsonRepaired}</div>
          )}
          {carousel._ai_generation?.input_summary && (
            <div><span>Tema:</span> {carousel._ai_generation.input_summary}</div>
          )}
        </div>

        <div className="ai-confirm__footer">
          <button type="button" className="ai-confirm__btn-cancel" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="ai-confirm__btn-confirm" onClick={onConfirm}>
            Sostituisci carosello
          </button>
        </div>
      </div>
    </Modal>
  )
}

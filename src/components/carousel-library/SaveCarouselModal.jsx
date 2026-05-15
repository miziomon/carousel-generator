import { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { generateThumbnail } from '../../lib/carousel/generateThumbnail.js'
import { CAROUSEL_LIMIT_FREE } from '../../lib/auth/tier.js'
import './carousel-library.css'

/**
 * Modale "Salva carosello".
 * Usata per il primo salvataggio e per "Salva come nuovo".
 *
 * Props:
 *   open, onClose
 *   carousel          - carosello corrente
 *   initialTitle      - titolo pre-compilato (suggerito o "Copia di …")
 *   tier              - 'free'|'pro'|'admin'
 *   carouselCount     - numero caroselli già salvati (per il contatore)
 *   onSave(title, thumbnail) - callback con titolo e data URL thumbnail
 */
export function SaveCarouselModal({ open, onClose, carousel, initialTitle, tier, carouselCount, onSave }) {
  const [title, setTitle] = useState('')
  const [thumbnail, setThumbnail] = useState(null)
  const [thumbLoading, setThumbLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  // Resetta lo stato ad ogni apertura
  useEffect(() => {
    if (!open) return
    setTitle(initialTitle ?? '')
    setError(null)
    setSaving(false)
    setThumbnail(null)
    setThumbLoading(true)

    // setTimeout(0) evita il warning "flushSync called from inside a lifecycle method":
    // generateThumbnail usa flushSync internamente e deve girare fuori dal ciclo di render React.
    const timer = setTimeout(() => {
      generateThumbnail(carousel)
        .then((url) => setThumbnail(url))
        .catch(() => setThumbnail(null))
        .finally(() => setThumbLoading(false))
    }, 0)

    return () => clearTimeout(timer)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus + select all all'apertura
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.select()
        inputRef.current?.focus()
      }, 80)
    }
  }, [open])

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    try {
      // Genera thumbnail definitiva se non ancora disponibile
      const finalThumb = thumbnail ?? (await generateThumbnail(carousel).catch(() => null))
      await onSave(trimmed, finalThumb)
    } catch (err) {
      setError(err.message ?? 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !saving && title.trim()) handleSave()
  }

  const isFree = tier === 'free'
  const count = carouselCount ?? 0
  const isCountWarn = isFree && count >= CAROUSEL_LIMIT_FREE - 2

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Salva carosello" size="md">
      <div className="save-carousel-modal__body">
        {/* Thumbnail preview */}
        <div className="save-carousel-modal__thumb">
          {thumbLoading ? (
            <div className="save-carousel-modal__thumb-spinner">
              <div className="sync-indicator__spinner" style={{ width: 20, height: 20 }} />
            </div>
          ) : thumbnail ? (
            <img src={thumbnail} alt="Anteprima slide 1" />
          ) : null}
        </div>

        {/* Campi */}
        <div className="save-carousel-modal__fields">
          <div>
            <p className="save-carousel-modal__label">Titolo</p>
            <input
              ref={inputRef}
              className="save-carousel-modal__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
              placeholder="Nome del carosello…"
              disabled={saving}
            />
          </div>

          {isFree && carouselCount !== null && (
            <p className={`save-carousel-modal__counter${isCountWarn ? ' save-carousel-modal__counter--warn' : ''}`}>
              {count}/{CAROUSEL_LIMIT_FREE} caroselli salvati
            </p>
          )}

          {error && <p className="save-carousel-modal__error">{error}</p>}
        </div>
      </div>

      <div className="save-carousel-modal__footer">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Annulla</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? 'Salvataggio…' : 'Salva'}
        </Button>
      </div>
    </Modal>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { generateThumbnail } from '../../lib/carousel/generateThumbnail.js'
import { recompressCarouselImages, carouselHasImages } from '../../lib/images/recompressImages.js'
import { estimateCarouselSize, API_SIZE_WARNING_THRESHOLD, API_SIZE_ERROR_THRESHOLD, formatBytes } from '../../lib/images/estimateSize.js'
import { CAROUSEL_LIMIT_FREE } from '../../lib/auth/tier.js'
import './carousel-library.css'

const COMPRESS_LEVELS = [
  { label: 'Qualità 85%', quality: 0.85 },
  { label: 'Qualità 75%', quality: 0.75 },
]

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
 *   onSave(title, thumbnail, compressedCarousel?) - callback con titolo, thumbnail e carosello (eventualmente ricompresso)
 */
export function SaveCarouselModal({ open, onClose, carousel, initialTitle, tier, carouselCount, onSave }) {
  const [title, setTitle] = useState('')
  const [thumbnail, setThumbnail] = useState(null)
  const [thumbLoading, setThumbLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [compressedCarousel, setCompressedCarousel] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const inputRef = useRef(null)

  // Carosello effettivo da stimare / usare al salvataggio
  const effectiveCarousel = compressedCarousel ?? carousel
  const currentSize = estimateCarouselSize(effectiveCarousel)
  const originalSize = compressedCarousel ? estimateCarouselSize(carousel) : null
  const hasImages = carouselHasImages(effectiveCarousel)
  const savedBytes = originalSize ? originalSize - currentSize : 0
  const savingPct = originalSize && savedBytes > 0
    ? Math.round((savedBytes / originalSize) * 100)
    : 0

  // Resetta lo stato ad ogni apertura
  useEffect(() => {
    if (!open) return
    setTitle(initialTitle ?? '')
    setError(null)
    setSaving(false)
    setCompressedCarousel(null)
    setCompressing(false)
    setThumbnail(null)
    setThumbLoading(true)

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

  async function handleCompress(quality) {
    if (compressing) return
    setCompressing(true)
    setError(null)
    try {
      const result = await recompressCarouselImages(effectiveCarousel, quality)
      setCompressedCarousel(result)
    } catch (err) {
      setError('Errore durante la compressione: ' + (err.message ?? 'sconosciuto'))
    } finally {
      setCompressing(false)
    }
  }

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    try {
      const finalThumb = thumbnail ?? (await generateThumbnail(effectiveCarousel).catch(() => null))
      await onSave(trimmed, finalThumb, compressedCarousel ?? undefined)
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

  // Calcola tono del badge dimensione
  const sizeTone = currentSize >= API_SIZE_ERROR_THRESHOLD
    ? 'error'
    : currentSize >= API_SIZE_WARNING_THRESHOLD
      ? 'warn'
      : 'ok'

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

          {/* Indicatore dimensione payload */}
          <div className="save-carousel-modal__size-block">
            <div className="save-carousel-modal__size-row">
              <span className="save-carousel-modal__size-label">Peso payload</span>
              <span className={`save-carousel-modal__size-badge save-carousel-modal__size-badge--${sizeTone}`}>
                {formatBytes(currentSize)}
              </span>
              {savedBytes > 0 && (
                <span className="save-carousel-modal__size-delta">
                  ↓ {savingPct}% (era {formatBytes(originalSize)})
                </span>
              )}
            </div>

            {sizeTone === 'warn' && (
              <p className="save-carousel-modal__size-note save-carousel-modal__size-note--warn">
                Il carosello è grande. Se il salvataggio fallisce, riduci la qualità delle immagini.
              </p>
            )}
            {sizeTone === 'error' && (
              <p className="save-carousel-modal__size-note save-carousel-modal__size-note--error">
                Il carosello è troppo grande e potrebbe non salvarsi. Riduci la qualità prima di procedere.
              </p>
            )}

            {hasImages && (
              <div className="save-carousel-modal__compress-row">
                {compressing && <div className="save-carousel-modal__compress-spinner" />}
                {COMPRESS_LEVELS.map(({ label, quality }) => (
                  <button
                    key={quality}
                    type="button"
                    className="save-carousel-modal__compress-btn"
                    onClick={() => handleCompress(quality)}
                    disabled={compressing || saving}
                    title={`Ricomprime tutte le immagini a qualità JPEG ${Math.round(quality * 100)}%`}
                  >
                    {label}
                  </button>
                ))}
                {compressedCarousel && (
                  <button
                    type="button"
                    className="save-carousel-modal__compress-btn"
                    onClick={() => setCompressedCarousel(null)}
                    disabled={compressing || saving}
                    title="Annulla la compressione e torna alle immagini originali"
                  >
                    Ripristina originale
                  </button>
                )}
              </div>
            )}
          </div>

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

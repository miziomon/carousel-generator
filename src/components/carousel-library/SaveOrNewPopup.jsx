import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../ui/Button.jsx'
import { timeAgo } from '../../lib/utils/timeAgo.js'
import { recompressCarouselImages, carouselHasImages } from '../../lib/images/recompressImages.js'
import { estimateCarouselSize, API_SIZE_WARNING_THRESHOLD, API_SIZE_ERROR_THRESHOLD, formatBytes } from '../../lib/images/estimateSize.js'
import './carousel-library.css'

const COMPRESS_LEVELS = [
  { label: 'Qualità 85%', quality: 0.85 },
  { label: 'Qualità 75%', quality: 0.75 },
]

/**
 * Popup di scelta "Sovrascrivi" vs "Salva come nuovo".
 * Appare quando l'utente clicca "Salva carosello" e il documento
 * ha già un documentId (è stato salvato in precedenza).
 */
export function SaveOrNewPopup({ open, onClose, documentTitle, lastSavedToDbAt, carousel, onOverwrite, onSaveAsNew }) {
  const [compressedCarousel, setCompressedCarousel] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [compressError, setCompressError] = useState(null)

  if (!open) return null

  const effectiveCarousel = compressedCarousel ?? carousel
  const currentSize = carousel ? estimateCarouselSize(effectiveCarousel) : 0
  const originalSize = compressedCarousel ? estimateCarouselSize(carousel) : null
  const hasImages = carousel ? carouselHasImages(effectiveCarousel) : false
  const savedBytes = originalSize ? originalSize - currentSize : 0
  const savingPct = originalSize && savedBytes > 0
    ? Math.round((savedBytes / originalSize) * 100)
    : 0

  const sizeTone = currentSize >= API_SIZE_ERROR_THRESHOLD
    ? 'error'
    : currentSize >= API_SIZE_WARNING_THRESHOLD
      ? 'warn'
      : 'ok'

  async function handleCompress(quality) {
    if (compressing || !carousel) return
    setCompressing(true)
    setCompressError(null)
    try {
      const result = await recompressCarouselImages(effectiveCarousel, quality)
      setCompressedCarousel(result)
    } catch (err) {
      setCompressError('Errore durante la compressione: ' + (err.message ?? 'sconosciuto'))
    } finally {
      setCompressing(false)
    }
  }

  function handleClose() {
    setCompressedCarousel(null)
    setCompressError(null)
    onClose()
  }

  function handleOverwrite() {
    onOverwrite(compressedCarousel ?? undefined)
    setCompressedCarousel(null)
    setCompressError(null)
  }

  function handleSaveAsNew() {
    onSaveAsNew()
    setCompressedCarousel(null)
    setCompressError(null)
  }

  return createPortal(
    <div className="save-or-new-popup" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="save-or-new-popup__box">
        <p className="save-or-new-popup__title">Vuoi sovrascrivere il carosello esistente?</p>
        <p className="save-or-new-popup__doc-name">{documentTitle}</p>
        {lastSavedToDbAt && (
          <p className="save-or-new-popup__meta">Ultimo salvataggio: {timeAgo(lastSavedToDbAt)}</p>
        )}

        {carousel && (
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
                    disabled={compressing}
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
                    disabled={compressing}
                    title="Annulla la compressione e torna alle immagini originali"
                  >
                    Ripristina originale
                  </button>
                )}
              </div>
            )}

            {compressError && (
              <p className="save-carousel-modal__size-note save-carousel-modal__size-note--error">{compressError}</p>
            )}
          </div>
        )}

        <div className="save-or-new-popup__actions">
          <Button variant="ghost" onClick={handleClose} disabled={compressing}>Annulla</Button>
          <Button variant="secondary" onClick={handleSaveAsNew} disabled={compressing}>Salva come nuovo</Button>
          <Button variant="primary" onClick={handleOverwrite} disabled={compressing}>Sovrascrivi</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

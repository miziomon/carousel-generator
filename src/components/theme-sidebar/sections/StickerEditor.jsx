import { useRef, useState } from 'react'
import { processImageFilePreserveAlpha } from '../../../lib/images/processImage.js'
import { ImageLibraryModal } from '../../image-library/ImageLibraryModal.jsx'
import { StickerPositionPicker } from './StickerPositionPicker.jsx'
import './sticker-editor.css'

/**
 * Editor di uno sticker nella sidebar.
 * Stato senza immagine: zona upload + drag & drop.
 * Stato con immagine: anteprima + slider dimensione/rotazione/opacità + picker posizione.
 *
 * Il parametro onChange riceve sempre un **patch parziale** (non l'oggetto completo):
 * es. `{ data: '...' }` oppure `{ size: 200 }`.
 *
 * @param {object}   sticker           - Sticker corrente (sempre non-null).
 * @param {function} onChange          - Callback con patch parziale da applicare allo sticker.
 * @param {string}   [userId]          - ID utente (abilita Sfoglia libreria).
 * @param {string}   [formatId]        - ID formato slide corrente (per position picker).
 */
export function StickerEditor({ sticker, onChange, userId, formatId }) {
  const inputRef = useRef(null)
  const [libraryOpen, setLibraryOpen] = useState(false)

  async function handleFile(file) {
    if (!file) return
    try {
      const dataUrl = await processImageFilePreserveAlpha(file)
      onChange({ data: dataUrl })
    } catch {
      // errore silenzioso — processImageFile lancia solo per tipo/dim non validi
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  function handleInputChange(e) {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  function patch(fields) {
    onChange(fields)
  }

  function handleLibrarySelect(upload) {
    onChange({ data: upload.public_url })
    setLibraryOpen(false)
  }

  // ── Stato senza immagine: zona upload ─────────────────────────────────────
  if (!sticker?.data) {
    return (
      <div className="sticker-editor">
        {userId && (
          <button
            type="button"
            className="sticker-editor__library-btn"
            onClick={() => setLibraryOpen(true)}
          >
            Sfoglia libreria
          </button>
        )}
        <div
          className="sticker-editor__upload"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          aria-label="Carica sticker"
        >
          <svg className="sticker-editor__upload-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span className="sticker-editor__upload-text">Carica immagine</span>
          <span className="sticker-editor__upload-hint">PNG, WebP con trasparenza</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        {userId && (
          <ImageLibraryModal
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            userId={userId}
            onSelect={handleLibrarySelect}
          />
        )}
      </div>
    )
  }

  // ── Stato con immagine: anteprima + controlli ─────────────────────────────
  const opacityPct = Math.round(sticker.opacity * 100)

  return (
    <div className="sticker-editor">
      {/* Anteprima */}
      <div className="sticker-editor__preview">
        <img src={sticker.data} alt="Anteprima sticker" className="sticker-editor__preview-img" />
      </div>

      {/* Sostituisci / Sfoglia / Rimuovi immagine */}
      <div className="sticker-editor__actions">
        <button
          type="button"
          className="sticker-editor__btn sticker-editor__btn--secondary"
          onClick={() => inputRef.current?.click()}
        >
          Sostituisci
        </button>
        {userId && (
          <button
            type="button"
            className="sticker-editor__btn sticker-editor__btn--secondary"
            onClick={() => setLibraryOpen(true)}
          >
            Libreria
          </button>
        )}
        <button
          type="button"
          className="sticker-editor__btn sticker-editor__btn--danger"
          onClick={() => onChange({ data: undefined })}
        >
          Rimuovi
        </button>
      </div>

      {/* Dimensione */}
      <div className="sticker-editor__row">
        <label className="sticker-editor__label">Dimensione</label>
        <div className="sticker-editor__slider-wrap">
          <input
            type="range"
            min={25}
            max={250}
            step={1}
            value={sticker.size}
            onChange={(e) => patch({ size: Number(e.target.value) })}
            className="sticker-editor__range"
            aria-label="Dimensione sticker"
          />
          <span className="sticker-editor__val">{sticker.size}px</span>
        </div>
      </div>

      {/* Rotazione */}
      <div className="sticker-editor__row">
        <label className="sticker-editor__label">Rotazione</label>
        <div className="sticker-editor__slider-wrap">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={sticker.rotation}
            onChange={(e) => patch({ rotation: Number(e.target.value) })}
            className="sticker-editor__range"
            aria-label="Rotazione sticker"
          />
          <span className="sticker-editor__val">{sticker.rotation}°</span>
        </div>
      </div>

      {/* Opacità */}
      <div className="sticker-editor__row">
        <label className="sticker-editor__label">Opacità</label>
        <div className="sticker-editor__slider-wrap">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacityPct}
            onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })}
            className="sticker-editor__range"
            aria-label="Opacità sticker"
          />
          <span className="sticker-editor__val">{opacityPct}%</span>
        </div>
      </div>

      {/* Posizione */}
      <div className="sticker-editor__row sticker-editor__row--top">
        <label className="sticker-editor__label">Posizione</label>
        <StickerPositionPicker
          value={sticker.position}
          formatId={formatId}
          onChange={(pos) => patch({ position: pos })}
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
      {userId && (
        <ImageLibraryModal
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          userId={userId}
          onSelect={handleLibrarySelect}
        />
      )}
    </div>
  )
}

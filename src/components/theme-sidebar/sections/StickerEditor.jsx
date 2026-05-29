import { useRef } from 'react'
import { processImageFile } from '../../../lib/images/processImage.js'
import { StickerPositionGrid } from './StickerPositionGrid.jsx'
import './sticker-editor.css'

const DEFAULT_STICKER = {
  size:     150,
  rotation: 0,
  opacity:  1,
  position: { x: 50, y: 50 },
}

/**
 * Editor dello sticker globale nella sidebar.
 * Stato vuoto: zona upload + drag & drop.
 * Stato pieno: anteprima + slider dimensione/rotazione/opacità + griglia posizione.
 *
 * @param {object|null|undefined} sticker    - Sticker corrente dal theme.
 * @param {function}              onChange   - Callback con il nuovo oggetto sticker.
 * @param {function}              [onRemove] - Callback per rimuovere lo sticker (payload undefined).
 */
export function StickerEditor({ sticker, onChange, onRemove }) {
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    try {
      const dataUrl = await processImageFile(file)
      onChange({ ...DEFAULT_STICKER, data: dataUrl })
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
    onChange({ ...sticker, ...fields })
  }

  // ── Stato vuoto: zona upload ──────────────────────────────────────────────
  if (!sticker) {
    return (
      <div className="sticker-editor">
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
      </div>
    )
  }

  // ── Stato pieno: anteprima + controlli ────────────────────────────────────
  const opacityPct = Math.round(sticker.opacity * 100)

  return (
    <div className="sticker-editor">
      {/* Anteprima */}
      <div className="sticker-editor__preview">
        <img src={sticker.data} alt="Anteprima sticker" className="sticker-editor__preview-img" />
      </div>

      {/* Sostituisci / Rimuovi */}
      <div className="sticker-editor__actions">
        <button
          type="button"
          className="sticker-editor__btn sticker-editor__btn--secondary"
          onClick={() => inputRef.current?.click()}
        >
          Sostituisci immagine
        </button>
        <button
          type="button"
          className="sticker-editor__btn sticker-editor__btn--danger"
          onClick={onRemove}
        >
          Rimuovi immagine
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
      <div className="sticker-editor__row sticker-editor__row--col">
        <label className="sticker-editor__label">Posizione</label>
        <StickerPositionGrid
          value={sticker.position}
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
    </div>
  )
}

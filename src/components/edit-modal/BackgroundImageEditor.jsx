import { useRef } from 'react'
import { processImageFile } from '../../lib/images/processImage.js'
import { BackgroundImagePreview } from './BackgroundImagePreview.jsx'
import { PositionGrid } from './PositionGrid.jsx'
import { estimateCarouselSize, SIZE_WARNING_THRESHOLD, formatBytes } from '../../lib/images/estimateSize.js'

const OVERLAY_TYPES = [
  { value: 'dark',    label: 'Scuro' },
  { value: 'palette', label: 'Palette' },
  { value: 'light',   label: 'Chiaro' },
]

/**
 * Editor completo per background_image: anteprima + 6 controlli.
 *
 * Props:
 *   bgImage   — oggetto background_image corrente
 *   theme     — theme del carosello
 *   format    — oggetto formato da getFormat()
 *   carousel  — carosello completo (per stima dimensione)
 *   onChange(patch) — chiama con il campo da aggiornare { opacity: 0.8 } ecc.
 *   onReplace(dataUrl) — nuovo file caricato
 */
export function BackgroundImageEditor({ bgImage, theme, format, carousel, onChange, onReplace, onRemove, onBrowseLibrary }) {
  const inputRef = useRef(null)

  async function handleReplaceFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await processImageFile(file)
      onReplace(dataUrl)
    } catch (err) {
      alert(err.message)
    }
  }

  function setOverlay(patch) {
    onChange({ overlay: { ...bgImage.overlay, ...patch } })
  }

  // Stima dimensione corrente del carosello
  const sizeBytes = carousel ? estimateCarouselSize(carousel) : 0
  const showSizeWarning = sizeBytes >= SIZE_WARNING_THRESHOLD

  return (
    <div className="bg-image-editor">
      {/* Anteprima con tutti gli effetti */}
      <div className="bg-image-editor__preview-row">
        <BackgroundImagePreview
          bgImage={bgImage}
          theme={theme}
          format={format}
          width={240}
        />
        <div className="bg-image-editor__preview-actions">
          <button
            type="button"
            className="bg-image-editor__replace-btn"
            onClick={() => inputRef.current?.click()}
          >
            Sostituisci immagine
          </button>
          {onBrowseLibrary && (
            <button
              type="button"
              className="bg-image-editor__library-btn"
              onClick={onBrowseLibrary}
            >
              Sfoglia libreria
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className="bg-image-editor__remove-btn"
              onClick={onRemove}
            >
              Rimuovi immagine
            </button>
          )}
          {showSizeWarning && (
            <p className="bg-image-editor__size-warning">
              ⚠ Carosello grande ({formatBytes(sizeBytes)}). Considera di ridurre il numero di slide con immagine.
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleReplaceFile}
      />

      <div className="bg-image-editor__controls">

        {/* Opacità */}
        <div className="bg-image-editor__slider-row">
          <label className="bg-image-editor__slider-label">Opacità</label>
          <input
            type="range" min={0} max={100}
            value={Math.round(bgImage.opacity * 100)}
            onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          />
          <span className="bg-image-editor__slider-value">{Math.round(bgImage.opacity * 100)}%</span>
        </div>

        {/* Blur */}
        <div className="bg-image-editor__slider-row">
          <label className="bg-image-editor__slider-label">Sfocatura</label>
          <input
            type="range" min={0} max={20}
            value={bgImage.blur}
            onChange={(e) => onChange({ blur: Number(e.target.value) })}
          />
          <span className="bg-image-editor__slider-value">{bgImage.blur}px</span>
        </div>

        {/* Posizione */}
        <div className="bg-image-editor__position-row">
          <label className="bg-image-editor__slider-label">Posizione</label>
          <PositionGrid
            value={bgImage.position}
            onChange={(pos) => onChange({ position: pos })}
          />
        </div>

        {/* Dimensione */}
        <div className="bg-image-editor__size-block">
          <label className="bg-image-editor__slider-label">Dimensione</label>
          <div className="bg-image-editor__size-options">
            {['cover', 'contain', 'auto'].map((v) => (
              <button
                key={v}
                type="button"
                className={`bg-overlay-controls__type-option${(bgImage.size ?? 'cover') === v ? ' bg-overlay-controls__type-option--active' : ''}`}
                onClick={() => onChange({ size: v })}
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              className={`bg-overlay-controls__type-option${!['cover', 'contain', 'auto'].includes(bgImage.size ?? 'cover') ? ' bg-overlay-controls__type-option--active' : ''}`}
              onClick={() => onChange({ size: '100%' })}
            >
              %
            </button>
          </div>
          {!['cover', 'contain', 'auto'].includes(bgImage.size ?? 'cover') && (
            <div className="bg-image-editor__slider-row" style={{ marginTop: 6 }}>
              <label className="bg-image-editor__slider-label">Valore</label>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={parseInt(bgImage.size) || 100}
                onChange={(e) => onChange({ size: `${e.target.value}%` })}
              />
              <span className="bg-image-editor__slider-value">{parseInt(bgImage.size) || 100}%</span>
            </div>
          )}
        </div>

        {/* Overlay */}
        <div className="bg-overlay-controls">
          <label className="bg-overlay-controls__toggle">
            <input
              type="checkbox"
              checked={bgImage.overlay?.enabled ?? false}
              onChange={(e) => setOverlay({ enabled: e.target.checked })}
            />
            Attiva overlay
          </label>

          <div className={`bg-overlay-controls__body${bgImage.overlay?.enabled ? '' : ' bg-overlay-controls--disabled'}`}>
            {/* Tipo overlay */}
            <div className="bg-overlay-controls__type-options">
              {OVERLAY_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`bg-overlay-controls__type-option${bgImage.overlay?.type === value ? ' bg-overlay-controls__type-option--active' : ''}`}
                  onClick={() => setOverlay({ type: value })}
                  disabled={!bgImage.overlay?.enabled}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Intensità overlay */}
            <div className="bg-image-editor__slider-row">
              <label className="bg-image-editor__slider-label">Intensità</label>
              <input
                type="range" min={0} max={100}
                value={Math.round((bgImage.overlay?.intensity ?? 0.5) * 100)}
                onChange={(e) => setOverlay({ intensity: Number(e.target.value) / 100 })}
                disabled={!bgImage.overlay?.enabled}
              />
              <span className="bg-image-editor__slider-value">
                {Math.round((bgImage.overlay?.intensity ?? 0.5) * 100)}%
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

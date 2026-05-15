import { useRef, useState } from 'react'
import { processImageFile } from '../../lib/images/processImage.js'

/**
 * Area di upload (stato "nessuna immagine"). Supporta click + drag & drop.
 * Chiama onUpload(dataUrl) con la data URL dell'immagine processata.
 */
export function BackgroundImageUpload({ onUpload }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const dataUrl = await processImageFile(file)
      onUpload(dataUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <div
        className={`bg-image-upload${dragOver ? ' bg-image-upload--drag-over' : ''}`}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        aria-label="Carica immagine di sfondo"
      >
        {loading ? (
          <div className="bg-image-upload__spinner" />
        ) : (
          <>
            <svg className="bg-image-upload__icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="bg-image-upload__primary-text">Carica immagine</span>
            <span className="bg-image-upload__secondary-text">JPG, PNG o WebP · max 10 MB</span>
          </>
        )}
      </div>
      {error && <p className="bg-image-upload__error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  )
}

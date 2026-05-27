import { useState, useCallback, useEffect, useRef } from 'react'
import { Image, Upload } from 'lucide-react'
import { listUploads, uploadImage } from '../../lib/uploads/api.js'
import { processImageToBlob } from '../../lib/images/processImage.js'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback.js'
import './image-library.css'

const FILTERS = [
  { value: 'all',     label: 'Tutte' },
  { value: 'mine',    label: 'Mie' },
  { value: 'public',  label: 'Pubbliche' },
]

const CACHE_TTL = 15_000

/**
 * Pannello libreria immagini (riusabile, NON una modale).
 * Può essere embedded nella colonna preview dell'EditModal o wrappato in ImageLibraryModal.
 *
 * Props:
 *   userId     — UUID dell'utente loggato
 *   onSelect   — callback(upload) quando l'utente sceglie un'immagine
 *   compact    — se true usa una griglia più fitta (EditModal)
 *   onClose?   — se presente mostra un bottone "← Anteprima" (EditModal)
 */
export function ImageLibraryPanel({ userId, onSelect, compact = false, onClose }) {
  const [uploads, setUploads] = useState([])
  const [total, setTotal]     = useState(0)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [uploading, setUploading] = useState(false)

  const cacheRef  = useRef({ key: null, ts: 0, data: null })
  const inputRef  = useRef(null)

  const fetchList = useCallback(async (q, f) => {
    const cacheKey = `${userId}|${q}|${f}`
    const cached = cacheRef.current
    if (cached.key === cacheKey && Date.now() - cached.ts < CACHE_TTL) {
      setUploads(cached.data.uploads)
      setTotal(cached.data.total ?? cached.data.count ?? 0)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listUploads({ userId })
      // Filtro client-side (l'API restituisce già mine+pubbliche; filtriamo per UX)
      let items = data.uploads ?? []
      if (f === 'mine')   items = items.filter((u) => u.user_id === userId)
      if (f === 'public') items = items.filter((u) => u.is_public)
      if (q) {
        const lq = q.toLowerCase()
        items = items.filter((u) => (u.title ?? u.original_filename ?? '').toLowerCase().includes(lq))
      }
      const result = { uploads: items, total: items.length }
      setUploads(result.uploads)
      setTotal(result.total)
      cacheRef.current = { key: cacheKey, ts: Date.now(), data: result }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const debouncedFetch = useDebouncedCallback(fetchList, 300)

  useEffect(() => {
    debouncedFetch(search, filter)
  }, [search, filter, debouncedFetch])

  function invalidateCache() {
    cacheRef.current = { key: null, ts: 0, data: null }
  }

  async function handleUploadFile(file) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const blob = await processImageToBlob(file)
      const result = await uploadImage({
        file: blob,
        userId,
        title: file.name.replace(/\.[^.]+$/, ''),
      })
      // Aggiunge immediatamente il nuovo upload in cima e invalida la cache
      invalidateCache()
      setUploads((prev) => [result, ...prev])
      setTotal((t) => t + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleFileInput(e) {
    handleUploadFile(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    handleUploadFile(e.dataTransfer.files?.[0])
  }

  const isEmpty = !loading && !error && uploads.length === 0

  return (
    <div
      className="img-library"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header con pulsante "← Anteprima" (solo in EditModal) */}
      {onClose && (
        <div className="img-library__panel-header">
          <span className="img-library__panel-title">Libreria immagini</span>
          <button type="button" className="img-library__back-btn" onClick={onClose}>
            ← Anteprima
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="img-library__toolbar">
        <div className="img-library__toolbar-row">
          <input
            className="img-library__search"
            type="text"
            placeholder="Cerca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="img-library__upload-btn"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="Carica nuova immagine"
          >
            <Upload size={13} />
            {uploading ? 'Caricamento…' : 'Carica'}
          </button>
        </div>
        <div className="img-library__filters">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`img-library__filter-btn${filter === value ? ' img-library__filter-btn--active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
          {!loading && !error && (
            <span className="img-library__drop-hint" style={{ marginLeft: 'auto' }}>
              {total > 0 ? `${total} immagini` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Errore */}
      {error && <p className="img-library__error">{error}</p>}

      {/* Griglia */}
      {loading && (
        <div className="img-library__state">
          <span>Caricamento…</span>
        </div>
      )}

      {!loading && isEmpty && (
        <div className="img-library__state">
          <Image size={32} className="img-library__state-icon" />
          <span>Nessuna immagine trovata.</span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>Carica la prima con il pulsante in alto.</span>
        </div>
      )}

      {!loading && !isEmpty && (
        <div className={`img-library__grid${compact ? ' img-library__grid--compact' : ''}`}>
          {uploads.map((upload) => (
            <button
              key={upload.id}
              type="button"
              className="img-library__card"
              onClick={() => onSelect(upload)}
              title={upload.title ?? upload.original_filename ?? 'Immagine'}
            >
              <img
                src={upload.public_url}
                alt={upload.title ?? upload.original_filename ?? ''}
                loading="lazy"
                decoding="async"
              />
              <span className="img-library__card-title">
                {upload.title ?? upload.original_filename ?? ''}
              </span>
              {upload.is_public && (
                <span className="img-library__card-badge">pub</span>
              )}
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  )
}

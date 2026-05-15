import { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { CarouselListItem } from './CarouselListItem.jsx'
import { RenameCarouselDialog } from './RenameCarouselDialog.jsx'
import { listCarousels, fetchCarousel, deleteCarousel, patchCarousel } from '../../lib/carousel/api.js'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback.js'
import { toast } from '../ui/Toast.jsx'
import './carousel-library.css'

const SORT_OPTIONS = [
  { value: 'updated_at:desc', label: 'Più recenti' },
  { value: 'updated_at:asc',  label: 'Meno recenti' },
  { value: 'title:asc',       label: 'Titolo A→Z' },
  { value: 'title:desc',      label: 'Titolo Z→A' },
  { value: 'slide_count:desc', label: 'Più slide' },
  { value: 'slide_count:asc',  label: 'Meno slide' },
]

const CACHE_TTL = 30_000

/**
 * Modale libreria caroselli.
 * Props:
 *   open, onClose
 *   userId
 *   currentDocumentId   - id del carosello attualmente aperto (per badge "aperto")
 *   isDirty             - per confirm "modifiche non salvate"
 *   onOpen(item)        - callback dopo fetch+caricamento
 *   onDocumentTitleUpdate(id, title) - callback dopo rinomina
 *   onDocumentCleared(id)            - callback dopo eliminazione del documento corrente
 *   onCountChanged()    - refresh del contatore save
 */
export function CarouselLibraryModal({
  open, onClose,
  userId,
  currentDocumentId,
  isDirty,
  onOpen,
  onDocumentTitleUpdate,
  onDocumentCleared,
  onCountChanged,
}) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [sortValue, setSortValue] = useState('updated_at:desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Confirm dirty
  const [pendingOpen, setPendingOpen] = useState(null)
  const [dirtyConfirmOpen, setDirtyConfirmOpen] = useState(false)

  // Rename
  const [renameItem, setRenameItem] = useState(null)

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState(null)

  // Cache
  const cacheRef = useRef({ key: null, ts: 0, data: null })

  const fetchList = useCallback(async (q, sv) => {
    const [sort, order] = sv.split(':')
    const cacheKey = `${userId}|${q}|${sv}`
    const cached = cacheRef.current
    if (cached.key === cacheKey && Date.now() - cached.ts < CACHE_TTL) {
      setItems(cached.data.items)
      setTotal(cached.data.total)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listCarousels({ user_id: userId, search: q, sort, order, limit: 50 })
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
      cacheRef.current = { key: cacheKey, ts: Date.now(), data }
    } catch (err) {
      setError(err.message ?? 'Errore durante il caricamento')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const debouncedFetch = useDebouncedCallback((q, sv) => fetchList(q, sv), 300)

  // Fetch al mount/apertura
  useEffect(() => {
    if (!open || !userId) return
    cacheRef.current = { key: null, ts: 0, data: null } // invalida cache
    fetchList(search, sortValue)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    debouncedFetch(search, sortValue)
  }, [search, sortValue]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apertura ────────────────────────────────────────────────────────────────

  function handleOpenClick(item) {
    if (isDirty) {
      setPendingOpen(item)
      setDirtyConfirmOpen(true)
    } else {
      doOpen(item)
    }
  }

  async function doOpen(item) {
    try {
      setLoading(true)
      const full = await fetchCarousel(item.id, userId)
      onOpen({
        carousel: full.content_json,
        documentId: full.id,
        title: full.title,
        createdAt: full.created_at,
      })
      onClose()
      toast(`Aperto: ${full.title}`, 'success')
    } catch (err) {
      toast(err.message ?? 'Errore apertura carosello', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleDirtyConfirm() {
    setDirtyConfirmOpen(false)
    if (pendingOpen) doOpen(pendingOpen)
    setPendingOpen(null)
  }

  // ── Rinomina ─────────────────────────────────────────────────────────────────

  async function handleRename(id, newTitle) {
    await patchCarousel(id, userId, { title: newTitle })
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, title: newTitle } : i))
    cacheRef.current = { key: null, ts: 0, data: null }
    if (id === currentDocumentId) onDocumentTitleUpdate?.(id, newTitle)
    toast('Titolo aggiornato', 'success')
  }

  // ── Eliminazione ──────────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    const item = deleteItem
    setDeleteItem(null)
    try {
      await deleteCarousel(item.id, userId)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setTotal((t) => Math.max(0, t - 1))
      cacheRef.current = { key: null, ts: 0, data: null }
      if (item.id === currentDocumentId) {
        onDocumentCleared?.(item.id)
        toast('Carosello eliminato. Il documento corrente non è più collegato al cloud.', 'success')
      } else {
        toast('Carosello eliminato', 'success')
      }
      onCountChanged?.()
    } catch (err) {
      toast(err.message ?? 'Errore durante l\'eliminazione', 'error')
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="I tuoi caroselli" size="xl">
        {/* Toolbar */}
        <div className="carousel-library__toolbar">
          <input
            className="carousel-library__search"
            placeholder="Cerca per titolo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="carousel-library__sort"
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {!loading && (
            <span className="carousel-library__count">
              {total} {total === 1 ? 'carosello' : 'caroselli'}
            </span>
          )}
        </div>

        {/* Lista */}
        {loading && (
          <div className="carousel-library__loading">
            <div className="sync-indicator__spinner" style={{ width: 16, height: 16 }} />
            Caricamento…
          </div>
        )}

        {!loading && error && (
          <div className="carousel-library__error">
            {error}
            <br />
            <Button variant="ghost" size="sm" style={{ marginTop: 8 }}
              onClick={() => fetchList(search, sortValue)}>
              Riprova
            </Button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="carousel-library__empty">
            <div className="carousel-library__empty-icon">
              {search ? '🔍' : '📂'}
            </div>
            {search
              ? <>Nessun carosello trovato per &ldquo;<strong>{search}</strong>&rdquo;<br />Prova con un altro termine.</>
              : <>Non hai ancora caroselli salvati.<br />Clicca &ldquo;Salva&rdquo; mentre lavori per crearne uno.</>}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="carousel-library__list">
            {items.map((item) => (
              <CarouselListItem
                key={item.id}
                item={item}
                isCurrent={item.id === currentDocumentId}
                onOpen={handleOpenClick}
                onRename={setRenameItem}
                onDelete={setDeleteItem}
              />
            ))}
          </div>
        )}
      </Modal>

      {/* Confirm dirty */}
      <ConfirmDialog
        open={dirtyConfirmOpen}
        title="Modifiche non salvate"
        message="Il carosello corrente ha modifiche non salvate. Continuando, le perderai."
        confirmLabel="Continua senza salvare"
        confirmVariant="danger"
        onConfirm={handleDirtyConfirm}
        onCancel={() => { setDirtyConfirmOpen(false); setPendingOpen(null) }}
      />

      {/* Rename */}
      <RenameCarouselDialog
        open={!!renameItem}
        onClose={() => setRenameItem(null)}
        item={renameItem}
        onRename={handleRename}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        title="Eliminare il carosello?"
        message={deleteItem ? `"${deleteItem.title}"\n\nQuesta operazione è irreversibile.` : ''}
        confirmLabel="Elimina"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteItem(null)}
      />
    </>
  )
}

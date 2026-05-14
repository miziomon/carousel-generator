import { memo, useState } from 'react'
import { Pencil, Copy, Trash2, Download, GripVertical } from 'lucide-react'
import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'
import { exportSlideToPng } from '../../lib/exportPng.jsx'
import { getFormat } from '../../lib/formats/registry.js'
import { toast } from '../ui/Toast.jsx'
import './slide-grid.css'

// ─── M10: calcolo rischio leggibilità con limiti per formato ──────────────────
const CHAR_LIMITS_BY_FORMAT = {
  square:    { cover: 60,  xl: 80,  lg: 120, md: 200 },
  portrait:  { cover: 70,  xl: 95,  lg: 145, md: 240 },
  landscape: { cover: 35,  xl: 50,  lg:  75, md: 120 },
}

function readabilityWarning(slide, format) {
  if (!slide.lines || slide.type === 'cta') return null
  const sizeKey = slide.size === 'cover' ? 'cover' : slide.size
  const limits = CHAR_LIMITS_BY_FORMAT[format?.id] ?? CHAR_LIMITS_BY_FORMAT.square
  const limit = limits[sizeKey]
  if (!limit) return null
  const total = slide.lines.join('').length
  if (total > limit * 1.5) return 'red'
  if (total > limit) return 'yellow'
  return null
}

export const SlideCard = memo(function SlideCard({
  slide,
  theme,
  total,
  onEdit,
  onDuplicate,
  onDelete,
  onExportPng,
  dragHandleProps,  // listeners @dnd-kit passati dall'esterno
  isDragOverlay,    // true quando è renderizzato nel DragOverlay
  mobileView = false,
}) {
  const format = getFormat(theme?.format)
  const targetWidth = mobileView ? 380 : 280
  const scale = targetWidth / format.width
  const thumbWidth = targetWidth
  const thumbHeight = Math.round(format.height * scale)

  const warning = readabilityWarning(slide, format)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportingPng, setExportingPng] = useState(false)

  async function handleExportPng() {
    if (exportingPng) return
    setExportingPng(true)
    try {
      const dataUrl = await exportSlideToPng(slide, theme, total)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `slide-${String(slide.num).padStart(2, '0')}.png`
      a.click()
      toast(`Slide #${String(slide.num).padStart(2, '0')} esportata`, 'success')
      onExportPng?.()
    } catch (err) {
      console.error('Export PNG fallito:', err)
      toast(`Errore export PNG: ${err.message}`, 'error')
    } finally {
      setExportingPng(false)
    }
  }

  function handleDelete() {
    if (confirmDelete) {
      onDelete?.(slide.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2000)
    }
  }

  return (
    <div className={`slide-card ${isDragOverlay ? 'slide-card--overlay' : ''}`}>
      {/* Drag handle — si appoggia sui listeners del sortable */}
      <div
        className="slide-card__drag-handle"
        {...(dragHandleProps ?? {})}
        title="Trascina per riordinare"
      >
        <GripVertical size={14} />
      </div>

      {/* Thumbnail */}
      <div
        className="slide-card__thumbnail-wrap"
        style={{ width: thumbWidth, height: thumbHeight }}
        onClick={() => !isDragOverlay && onEdit?.(slide.id)}
      >
        <div
          className="slide-card__thumbnail-inner"
          style={{ transform: `scale(${scale})`, width: format.width, height: format.height }}
        >
          <SlideRenderer slide={slide} theme={theme} total={total} mode="preview" />
        </div>
      </div>

      {/* Footer card */}
      <div className="slide-card__footer">
        <div className="slide-card__meta">
          <span className="slide-card__num">#{String(slide.num).padStart(2, '0')}</span>
          <span className="slide-card__type-badge">{slide.type}</span>
          {warning === 'yellow' && (
            <span className="slide-card__warning slide-card__warning--yellow" title="Il testo potrebbe risultare poco leggibile">
              ⚠ testo lungo
            </span>
          )}
          {warning === 'red' && (
            <span className="slide-card__warning slide-card__warning--red" title="Il testo è troppo lungo per questa dimensione">
              ✗ testo troppo lungo
            </span>
          )}
        </div>

        {!isDragOverlay && (
          <div className="slide-card__actions">
            <button className="slide-card__action" onClick={() => onEdit?.(slide.id)} title="Modifica slide">
              <Pencil size={12} /> Modifica
            </button>
            <button className="slide-card__action" onClick={() => onDuplicate?.(slide.id)} title="Duplica slide">
              <Copy size={12} /> Duplica
            </button>
            <button
              className={`slide-card__action ${exportingPng ? 'slide-card__action--loading' : ''}`}
              onClick={handleExportPng}
              disabled={exportingPng}
              title={`Esporta come PNG ${format.width * 2}×${format.height * 2}`}
            >
              <Download size={12} />
              {exportingPng ? '…' : 'PNG'}
            </button>
            <button
              className="slide-card__action slide-card__action--danger"
              onClick={handleDelete}
              title={confirmDelete ? 'Clicca di nuovo per confermare' : 'Elimina slide'}
              style={confirmDelete ? { background: 'rgba(239,68,68,0.2)', color: '#ef4444' } : {}}
            >
              <Trash2 size={12} />
              {confirmDelete ? 'Sicuro?' : 'Elimina'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

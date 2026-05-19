import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SlideCard } from './SlideCard.jsx'
import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'
import { Modal } from '../ui/Modal.jsx'
import { getFormat } from '../../lib/formats/registry.js'
import './slide-grid.css'

// ─── Modal anteprima con navigazione prev/next ────────────────────────────────
function SlidePreviewModal({ slides, theme, total, previewId, onClose, onNavigate }) {
  const idx = slides.findIndex((s) => s.id === previewId)
  const slide = idx >= 0 ? slides[idx] : null
  const format = getFormat(theme?.format)

  const MAX_W = 700, MAX_H = 620
  const previewScale = Math.min(MAX_W / format.width, MAX_H / format.height)
  const displayW = Math.round(format.width * previewScale)
  const displayH = Math.round(format.height * previewScale)

  const hasPrev = idx > 0
  const hasNext = idx < slides.length - 1

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(slides[idx - 1].id)
  }, [idx, hasPrev, slides, onNavigate])

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(slides[idx + 1].id)
  }, [idx, hasNext, slides, onNavigate])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  if (!slide) return null

  return (
    <Modal
      open={!!previewId}
      onClose={onClose}
      title={`Slide #${String(slide.num).padStart(2, '0')} — ${slide.type}`}
      size="xl"
    >
      <div className="slide-preview-modal">
        <div className="slide-preview-modal__nav-row">
          <button
            className="slide-preview-modal__nav-btn"
            onClick={goPrev}
            disabled={!hasPrev}
            title="Slide precedente (←)"
          >
            <ChevronLeft size={20} />
          </button>

          <div
            className="slide-preview-modal__slide-wrap"
            style={{ width: displayW, height: displayH }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                width: format.width,
                height: format.height,
              }}
            >
              <SlideRenderer slide={slide} theme={theme} total={total} mode="preview" />
            </div>
          </div>

          <button
            className="slide-preview-modal__nav-btn"
            onClick={goNext}
            disabled={!hasNext}
            title="Slide successiva (→)"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="slide-preview-modal__counter">
          {idx + 1} / {slides.length}
        </div>
      </div>
    </Modal>
  )
}

// ─── Wrapper sortable per ogni card ──────────────────────────────────────────
function SortableSlideCard({ slide, theme, total, onEdit, onDuplicate, onDelete, onPreview, mobileView, fontPreview }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 1 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SlideCard
        slide={slide}
        theme={theme}
        total={total}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onPreview={onPreview}
        dragHandleProps={listeners}
        mobileView={mobileView}
        fontPreview={fontPreview}
      />
    </div>
  )
}

// ─── Griglia principale ───────────────────────────────────────────────────────
export function SlideGrid({ slides, theme, onEdit, onDuplicate, onDelete, onReorder, mobileView = false, fontPreview = null }) {
  const [activeId, setActiveId] = useState(null)
  const [previewId, setPreviewId] = useState(null)
  const total = slides.length

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const oldIndex = slides.findIndex((s) => s.id === active.id)
    const newIndex = slides.findIndex((s) => s.id === over.id)
    const reorderedIds = arrayMove(slides, oldIndex, newIndex).map((s) => s.id)
    onReorder(reorderedIds)
  }

  const activeSlide = activeId ? slides.find((s) => s.id === activeId) : null

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={slides.map((s) => s.id)} strategy={rectSortingStrategy}>
          <div className={mobileView ? 'slide-grid--mobile' : 'flex flex-wrap gap-5'}>
            {slides.map((slide) => (
              <SortableSlideCard
                key={slide.id}
                slide={slide}
                theme={theme}
                total={total}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onPreview={(id) => setPreviewId(id)}
                mobileView={mobileView}
                fontPreview={fontPreview}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {activeSlide && (
            <SlideCard slide={activeSlide} theme={theme} total={total} isDragOverlay />
          )}
        </DragOverlay>
      </DndContext>

      <SlidePreviewModal
        slides={slides}
        theme={theme}
        total={total}
        previewId={previewId}
        onClose={() => setPreviewId(null)}
        onNavigate={setPreviewId}
      />
    </div>
  )
}

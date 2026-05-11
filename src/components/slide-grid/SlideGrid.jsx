import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
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
import { SlideCard } from './SlideCard.jsx'
import { Button } from '../ui/Button.jsx'
import './slide-grid.css'

const SLIDE_TYPES = [
  { id: 'cover',    label: 'Cover' },
  { id: 'standard', label: 'Standard' },
  { id: 'divider',  label: 'Divisore' },
  { id: 'cta',      label: 'Call to action' },
]

// ─── Wrapper sortable per ogni card ──────────────────────────────────────────
function SortableSlideCard({ slide, theme, total, onEdit, onDuplicate, onDelete, mobileView }) {
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
        dragHandleProps={listeners}
        mobileView={mobileView}
      />
    </div>
  )
}

// ─── Griglia principale ───────────────────────────────────────────────────────
export function SlideGrid({ slides, theme, onEdit, onDuplicate, onDelete, onAddSlide, onReorder, mobileView = false }) {
  const [activeId, setActiveId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const total = slides.length

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Richiede 8px di movimento prima di iniziare il drag (evita drag accidentali)
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Chiude il menu se si clicca fuori
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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

  function handleAddType(type) {
    setMenuOpen(false)
    onAddSlide(type)
  }

  const activeSlide = activeId ? slides.find((s) => s.id === activeId) : null

  return (
    <div className="relative flex-1 overflow-y-auto p-6">
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
                mobileView={mobileView}
              />
            ))}
          </div>
        </SortableContext>

        {/* Ghost visibile durante il drag */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {activeSlide && (
            <SlideCard
              slide={activeSlide}
              theme={theme}
              total={total}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Bottone flottante "+ Aggiungi slide" */}
      <div className="add-slide-btn" ref={menuRef}>
        {menuOpen && (
          <div className="add-slide-menu">
            {SLIDE_TYPES.map((t) => (
              <button key={t.id} className="add-slide-menu__item" onClick={() => handleAddType(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        <Button variant="primary" size="md" onClick={() => setMenuOpen((v) => !v)} title="Aggiungi una nuova slide">
          <Plus size={16} />
          Aggiungi slide
        </Button>
      </div>
    </div>
  )
}

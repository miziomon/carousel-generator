import { useState } from 'react'
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
import './slide-grid.css'

// ─── Wrapper sortable per ogni card ──────────────────────────────────────────
function SortableSlideCard({ slide, theme, total, onEdit, onDuplicate, onDelete, mobileView, fontPreview }) {
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
        fontPreview={fontPreview}
      />
    </div>
  )
}

// ─── Griglia principale ───────────────────────────────────────────────────────
export function SlideGrid({ slides, theme, onEdit, onDuplicate, onDelete, onReorder, mobileView = false, fontPreview = null }) {
  const [activeId, setActiveId] = useState(null)
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
    </div>
  )
}

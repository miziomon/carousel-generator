import { lazy, Suspense, useState } from 'react'
import { useCarouselStore } from './hooks/useCarouselStore.js'
import { useAutoSave } from './hooks/useAutoSave.js'
import { useUndoRedo } from './hooks/useUndoRedo.js'
import { defaultCarousel } from './lib/defaultCarousel.js'
import { Header } from './components/header/Header.jsx'
import { TabBar } from './components/tabs/TabBar.jsx'
import { SlideGrid } from './components/slide-grid/SlideGrid.jsx'
import { ThemeTab } from './components/theme-tab/ThemeTab.jsx'
import { EditModal } from './components/edit-modal/EditModal.jsx'
import { Modal } from './components/ui/Modal.jsx'
import { ToastContainer, toast } from './components/ui/Toast.jsx'

// CodeMirror è pesante (~500KB): lazy load solo quando si apre la tab JSON
const JsonTab = lazy(() => import('./components/json-tab/JsonTab.jsx').then((m) => ({ default: m.JsonTab })))

export default function App() {
  const store = useCarouselStore()
  const [mobileView, setMobileView] = useState(false)

  // Auto-save debounced
  useAutoSave(store.carousel, store.meta.isDirty, store.markSaved)

  // Scorciatoie undo/redo (Ctrl+Z, Ctrl+Shift+Z — ignorate se focus su input/textarea)
  useUndoRedo(store.undo, store.redo)

  const editingSlide = store.ui.editingSlideId
    ? store.carousel.slides.find((s) => s.id === store.ui.editingSlideId)
    : null

  function handleNewProject() {
    store.loadCarousel(defaultCarousel)
    toast('Nuovo progetto creato', 'success')
  }

  function handleAddSlide(type) {
    store.addSlide(type)
    toast(`Slide ${type} aggiunta`, 'success')
  }

  function handleUpdateProjectName(name) {
    store.updateTheme({
      ...store.carousel.theme,
      footer: { ...store.carousel.theme.footer, name },
    })
  }

  function handleDeleteSlide(id) {
    if (store.carousel.slides.length <= 1) {
      toast("Non puoi eliminare l'unica slide rimasta", 'error')
      return
    }
    store.deleteSlide(id)
    toast('Slide eliminata', 'success')
  }

  function handleDuplicateSlide(id) {
    store.duplicateSlide(id)
    toast('Slide duplicata', 'success')
  }

  function handleSaveSlide(updatedSlide) {
    store.updateSlide(updatedSlide)
    store.closeEditModal()
    toast('Slide salvata', 'success')
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        carousel={store.carousel}
        meta={store.meta}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onUndo={store.undo}
        onRedo={store.redo}
        onLoadCarousel={store.loadCarousel}
        onNewProject={handleNewProject}
        onAddSlide={handleAddSlide}
        onUpdateProjectName={handleUpdateProjectName}
        mobileView={mobileView}
        onToggleMobileView={() => setMobileView((v) => !v)}
      />

      <TabBar activeTab={store.ui.activeTab} onTabChange={store.setActiveTab} />

      <main className="flex-1 overflow-hidden flex flex-col">
        {store.ui.activeTab === 'slides' && (
          <SlideGrid
            slides={store.carousel.slides}
            theme={store.carousel.theme}
            onEdit={store.openEditModal}
            onDuplicate={handleDuplicateSlide}
            onDelete={handleDeleteSlide}
            onReorder={store.reorderSlides}
            mobileView={mobileView}
          />
        )}

        {store.ui.activeTab === 'theme' && (
          <ThemeTab theme={store.carousel.theme} onChange={store.updateTheme} />
        )}

        {store.ui.activeTab === 'json' && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-mono">Caricamento editor...</div>}>
            <JsonTab carousel={store.carousel} onLoadCarousel={store.loadCarousel} />
          </Suspense>
        )}
      </main>

      {editingSlide && (
        <Modal
          open={!!editingSlide}
          onClose={store.closeEditModal}
          title={`Slide #${String(editingSlide.num).padStart(2, '0')} — ${editingSlide.type}`}
          size="xl"
          className="h-[88vh]"
        >
          <EditModal
            slide={editingSlide}
            theme={store.carousel.theme}
            total={store.carousel.slides.length}
            onSave={handleSaveSlide}
            onCancel={store.closeEditModal}
          />
        </Modal>
      )}

      <ToastContainer />
    </div>
  )
}

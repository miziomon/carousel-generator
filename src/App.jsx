import { useState } from 'react'
import { useCarouselStore } from './hooks/useCarouselStore.js'
import { useAuth } from './hooks/useAuth.js'
import { useAutoSave } from './hooks/useAutoSave.js'
import { useUndoRedo } from './hooks/useUndoRedo.js'
import { usePaletteLibraryPersistence } from './hooks/usePaletteLibraryPersistence.js'
import { defaultCarousel } from './lib/defaultCarousel.js'
import { LoginScreen } from './components/auth/LoginScreen.jsx'
import { Header } from './components/header/Header.jsx'
import { TabBar } from './components/tabs/TabBar.jsx'
import { SlideGrid } from './components/slide-grid/SlideGrid.jsx'
import { ThemeTab } from './components/theme-tab/ThemeTab.jsx'
import { JsonTab } from './components/json-tab/JsonTab.jsx'
import { EditModal } from './components/edit-modal/EditModal.jsx'
import { PaletteManagerModal } from './components/palette-manager/PaletteManagerModal.jsx'
import { TemplateManagerModal } from './components/template-manager/TemplateManagerModal.jsx'
import { AiGeneratorModal } from './components/ai-generator/AiGeneratorModal.jsx'
import { Modal } from './components/ui/Modal.jsx'
import { ToastContainer, toast } from './components/ui/Toast.jsx'

export default function App() {
  const auth = useAuth()

  if (!auth.isLoggedIn) {
    return (
      <>
        <LoginScreen auth={auth} />
        <ToastContainer />
      </>
    )
  }

  return <AuthenticatedApp auth={auth} />
}

function AuthenticatedApp({ auth }) {
  const store = useCarouselStore()
  const [mobileView, setMobileView] = useState(false)
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false)

  // Auto-save debounced
  useAutoSave(store.carousel, store.meta.isDirty, store.markSaved)

  // Scorciatoie undo/redo (Ctrl+Z, Ctrl+Shift+Z -- ignorate se focus su input/textarea)
  useUndoRedo(store.undo, store.redo)

  // Persiste le palette utente su localStorage con debounce
  usePaletteLibraryPersistence(store.paletteLibrary)

  const editingSlide = store.ui.editingSlideId
    ? store.carousel.slides.find((s) => s.id === store.ui.editingSlideId)
    : null

  function handleNewProject() {
    store.loadCarousel(defaultCarousel)
    toast('Nuovo progetto creato', 'success')
  }

  function handleAddSlide(type) {
    store.addSlide(type)
    toast('Slide ' + type + ' aggiunta', 'success')
  }

  function handleUpdateTitle(title) {
    store.updateTitle(title)
  }

  function handleUpdateAuthor(name) {
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
        onUpdateTitle={handleUpdateTitle}
        onUpdateAuthor={handleUpdateAuthor}
        mobileView={mobileView}
        onToggleMobileView={() => setMobileView((v) => !v)}
        onOpenAiGenerator={() => setAiGeneratorOpen(true)}
        auth={auth}
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
          <ThemeTab
            theme={store.carousel.theme}
            onChange={store.updateTheme}
            paletteLibrary={store.paletteLibrary}
            applyPalette={store.applyPalette}
            resyncPalette={store.resyncPalette}
            updatePaletteInline={store.updatePaletteInline}
            openPaletteManager={store.openPaletteManager}
            applyTemplate={store.applyTemplate}
            openTemplateManager={store.openTemplateManager}
          />
        )}

        {store.ui.activeTab === 'json' && (
          <JsonTab carousel={store.carousel} onLoadCarousel={store.loadCarousel} />
        )}
      </main>

      {editingSlide && (
        <Modal
          open={!!editingSlide}
          onClose={store.closeEditModal}
          title={'Slide #' + String(editingSlide.num).padStart(2, '0') + ' — ' + editingSlide.type}
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

      <TemplateManagerModal
        open={store.ui.templateManagerOpen}
        onClose={store.closeTemplateManager}
        currentId={store.carousel.theme.template_id}
        onApply={store.applyTemplate}
      />

      {/* Render condizionale: lo stato del form viene scartato a ogni chiusura */}
      {aiGeneratorOpen && (
        <AiGeneratorModal
          open={true}
          onClose={() => setAiGeneratorOpen(false)}
          paletteLibrary={store.paletteLibrary}
        />
      )}

      <PaletteManagerModal
        open={store.ui.paletteManagerOpen}
        onClose={store.closePaletteManager}
        paletteLibrary={store.paletteLibrary}
        applyPalette={store.applyPalette}
        createPalette={store.createPalette}
        updatePalette={store.updatePalette}
        duplicatePalette={store.duplicatePalette}
        deletePalette={store.deletePalette}
        importPalette={store.importPalette}
      />
    </div>
  )
}

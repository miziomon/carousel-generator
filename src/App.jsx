import { useState, lazy, Suspense } from 'react'
import { useCarouselStore } from './hooks/useCarouselStore.js'
import { useAuth } from './hooks/useAuth.js'
import { useAutoSave } from './hooks/useAutoSave.js'
import { useUndoRedo } from './hooks/useUndoRedo.js'
import { useHotkeys } from './hooks/useHotkeys.js'
import { usePaletteLibraryPersistence } from './hooks/usePaletteLibraryPersistence.js'
import { useUiPreferences } from './hooks/useUiPreferences.js'
import { useMediaQuery } from './hooks/useMediaQuery.js'
import { useCarouselCount } from './hooks/useCarouselCount.js'
import { defaultCarousel } from './lib/defaultCarousel.js'
import { canSaveCarousel } from './lib/auth/tier.js'
import { createCarousel, updateCarousel } from './lib/carousel/api.js'
import { suggestTitle } from './lib/carousel/suggestTitle.js'
import { LoginScreen } from './components/auth/LoginScreen.jsx'
import { Header } from './components/header/Header.jsx'
import { TabBar } from './components/tabs/TabBar.jsx'
import { SlideGrid } from './components/slide-grid/SlideGrid.jsx'
import { ThemeSidebar } from './components/theme-sidebar/ThemeSidebar.jsx'
import { JsonTab } from './components/json-tab/JsonTab.jsx'
import { EditModal } from './components/edit-modal/EditModal.jsx'
import { PaletteManagerModal } from './components/palette-manager/PaletteManagerModal.jsx'
import { TemplateManagerModal } from './components/template-manager/TemplateManagerModal.jsx'
const AiGeneratorModal = lazy(() => import('./components/ai-generator/AiGeneratorModal.jsx').then(m => ({ default: m.AiGeneratorModal })))
import { SaveCarouselModal } from './components/carousel-library/SaveCarouselModal.jsx'
import { SaveOrNewPopup } from './components/carousel-library/SaveOrNewPopup.jsx'
import { CarouselLibraryModal } from './components/carousel-library/CarouselLibraryModal.jsx'
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
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveOrNewOpen, setSaveOrNewOpen] = useState(false)
  const [saveAsNewTitle, setSaveAsNewTitle] = useState(null)
  const { uiPrefs, toggleSidebar, setSectionOpen, setFontShowAll } = useUiPreferences()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const userId = auth.user?.userId
  const { count: carouselCount, refresh: refreshCount } = useCarouselCount({
    userId,
    isLoggedIn: auth.isLoggedIn,
  })

  // Auto-save debounced
  useAutoSave(store.carousel, store.meta.isDirty, store.markSaved)

  // Scorciatoie: undo/redo + toggle sidebar
  useUndoRedo(store.undo, store.redo)
  useHotkeys({ 'ctrl+b': toggleSidebar })

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

  // ── Logica salvataggio DB ───────────────────────────────────────────────────

  function buildContentJson() {
    // Esclude i campi id (runtime) prima di mandare al DB — stesso pattern di exportZip
    return {
      ...store.carousel,
      // eslint-disable-next-line no-unused-vars
      slides: store.carousel.slides.map(({ id: _id, ...rest }) => rest),
    }
  }

  async function handleDbSave(title, thumbnail) {
    store.setIsSaving(true)
    try {
      const content_json = buildContentJson()
      const payload = { user_id: userId, title, content_json, thumbnail }
      const result = await createCarousel(payload)
      store.setDocumentIdentity({
        documentId: result.id,
        documentTitle: result.title,
        documentCreatedAt: result.created_at,
      })
      toast('Carosello salvato', 'success')
      setSaveModalOpen(false)
      await refreshCount()
    } catch (err) {
      store.setIsSaving(false)
      throw err
    }
  }

  async function handleOverwrite() {
    setSaveOrNewOpen(false)
    store.setIsSaving(true)
    try {
      const content_json = buildContentJson()
      const thumbnail = null // per la sovrascrittura diretta non rigeneriamo la thumb
      const result = await updateCarousel(
        store.meta.documentId,
        userId,
        { title: store.meta.documentTitle, content_json, thumbnail }
      )
      store.setDocumentIdentity({
        documentId: result.id,
        documentTitle: result.title,
        documentCreatedAt: result.created_at,
      })
      toast('Carosello aggiornato', 'success')
    } catch (err) {
      store.setIsSaving(false)
      toast(err.message ?? 'Errore durante il salvataggio', 'error')
    }
  }

  function handleSaveCarouselClick() {
    if (store.meta.documentId) {
      setSaveOrNewOpen(true)
    } else {
      setSaveAsNewTitle(suggestTitle(store.carousel))
      setSaveModalOpen(true)
    }
  }

  function handleSaveNow() {
    // "Salva ora" dal SyncIndicator: save diretto senza modale
    handleOverwrite()
  }

  function handleSaveAsNew() {
    setSaveOrNewOpen(false)
    setSaveAsNewTitle(`Copia di ${store.meta.documentTitle ?? suggestTitle(store.carousel)}`)
    setSaveModalOpen(true)
  }

  // ── Logica libreria ─────────────────────────────────────────────────────────

  function handleOpenFromLibrary({ carousel, documentId, title, createdAt }) {
    store.loadFromDb({ carousel, documentId, title, createdAt })
  }

  function handleDocumentTitleUpdate(id, title) {
    if (id === store.meta.documentId) store.updateDocumentTitle(title)
  }

  function handleDocumentCleared(id) {
    if (id === store.meta.documentId) store.clearDocumentIdentity()
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

  function handleApplyTemplate(templateId, template) {
    store.applyTemplate(templateId)
    if (!template) return
    const defaultPaletteId = template.default_palette_id
    const suggestionNeeded = defaultPaletteId && defaultPaletteId !== store.carousel.theme.palette_id
    const defaultPalette = suggestionNeeded
      ? store.paletteLibrary.find((p) => p.id === defaultPaletteId)
      : null
    if (defaultPalette) {
      toast(
        `Template "${template.name}" applicato`,
        'success',
        { label: `Applica palette consigliata: ${defaultPalette.name}`, onClick: () => store.applyPalette(defaultPaletteId) }
      )
    } else {
      toast(`Template "${template.name}" applicato`)
    }
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
        sidebarOpen={uiPrefs.sidebarOpen}
        onToggleSidebar={toggleSidebar}
        auth={auth}
        onSaveCarousel={handleSaveCarouselClick}
        onOpenLibrary={() => setLibraryOpen(true)}
        onSaveNow={handleSaveNow}
        canSave={canSaveCarousel(auth.tier, carouselCount)}
        canOpen={auth.isLoggedIn}
      />

      <div className="flex flex-1 overflow-hidden">
        <ThemeSidebar
          isOpen={uiPrefs.sidebarOpen}
          onToggle={toggleSidebar}
          isDesktop={isDesktop}
          theme={store.carousel.theme}
          onChange={store.updateTheme}
          paletteLibrary={store.paletteLibrary}
          applyPalette={store.applyPalette}
          resyncPalette={store.resyncPalette}
          updatePaletteInline={store.updatePaletteInline}
          openPaletteManager={store.openPaletteManager}
          applyTemplate={store.applyTemplate}
          openTemplateManager={store.openTemplateManager}
          applyFormat={store.applyFormat}
          uiPrefs={uiPrefs}
          setSectionOpen={setSectionOpen}
          setFontShowAll={setFontShowAll}
          applyFont={store.applyFont}
          applyFontPreset={store.applyFontPreset}
          previewFontChange={store.previewFontChange}
          clearFontPreview={store.clearFontPreview}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
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
                fontPreview={store.fontPreview}
              />
            )}

            {store.ui.activeTab === 'json' && (
              <JsonTab carousel={store.carousel} onLoadCarousel={store.loadCarousel} />
            )}
          </main>
        </div>
      </div>

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
            carousel={store.carousel}
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
        onApply={handleApplyTemplate}
      />

      {aiGeneratorOpen && (
        <Suspense fallback={null}>
          <AiGeneratorModal
            open={true}
            onClose={() => setAiGeneratorOpen(false)}
            paletteLibrary={store.paletteLibrary}
            carousel={store.carousel}
            userId={auth.user?.userId}
            onReplaceFromAi={store.replaceCarouselFromAi}
          />
        </Suspense>
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

      {/* Libreria caroselli */}
      <CarouselLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        userId={userId}
        currentDocumentId={store.meta.documentId}
        isDirty={store.meta.isDirty}
        onOpen={handleOpenFromLibrary}
        onDocumentTitleUpdate={handleDocumentTitleUpdate}
        onDocumentCleared={handleDocumentCleared}
        onCountChanged={refreshCount}
      />

      {/* Save flow */}
      <SaveOrNewPopup
        open={saveOrNewOpen}
        onClose={() => setSaveOrNewOpen(false)}
        documentTitle={store.meta.documentTitle}
        lastSavedToDbAt={store.meta.lastSavedToDbAt}
        onOverwrite={handleOverwrite}
        onSaveAsNew={handleSaveAsNew}
      />
      <SaveCarouselModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        carousel={store.carousel}
        initialTitle={saveAsNewTitle}
        tier={auth.tier}
        carouselCount={carouselCount}
        onSave={handleDbSave}
      />
    </div>
  )
}

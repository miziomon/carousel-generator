import { useState, lazy, Suspense, useEffect } from 'react'
import pkg from '../package.json'
import { useAppTheme } from './hooks/useAppTheme.js'
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
import { generateThumbnail } from './lib/carousel/generateThumbnail.js'
import { suggestTitle } from './lib/carousel/suggestTitle.js'
import { estimateCarouselSize, API_SIZE_WARNING_THRESHOLD, API_SIZE_ERROR_THRESHOLD, formatBytes } from './lib/images/estimateSize.js'
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
import { AppPreferencesModal } from './components/header/AppPreferencesModal.jsx'
import { ToastContainer, toast } from './components/ui/Toast.jsx'

export default function App() {
  const auth = useAuth()
  const appTheme = useAppTheme()

  useEffect(() => {
    document.title = `SLIDE-ORAMA — v${pkg.version}`
  }, [])

  if (!auth.isLoggedIn) {
    return (
      <>
        <LoginScreen auth={auth} />
        <ToastContainer />
      </>
    )
  }

  return <AuthenticatedApp auth={auth} appTheme={appTheme} />
}

function AuthenticatedApp({ auth, appTheme }) {
  const store = useCarouselStore()
  const [mobileView, setMobileView] = useState(false)
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
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

  // Sincronizza il CSS personalizzato del tema in un <style> globale nell'<head>.
  // È globale (non scoped per slide) per design: l'utente usa selettori specifici.
  useEffect(() => {
    const css = store.carousel.theme.customCss || ''
    let el = document.getElementById('slide-custom-css')
    if (!el) {
      el = document.createElement('style')
      el.id = 'slide-custom-css'
      document.head.appendChild(el)
    }
    el.textContent = css
  }, [store.carousel.theme.customCss])

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

  function buildContentJson(sourceCarousel) {
    const src = sourceCarousel ?? store.carousel
    const globalBgData = src.theme.background_image?.data
    return {
      ...src,
      slides: src.slides.map(({ id: _id, ...rest }) => {
        // Deduplica: se la slide ha lo stesso data del tema globale, rimuove data per evitare duplicazione base64.
        // Il renderer la recupera automaticamente da theme.background_image al momento del render.
        if (rest.background_image?.data && globalBgData && rest.background_image.data === globalBgData) {
          // eslint-disable-next-line no-unused-vars
          const { data: _data, ...bgWithoutData } = rest.background_image
          return { ...rest, background_image: bgWithoutData }
        }
        return rest
      }),
    }
  }

  // Controlla la dimensione del payload prima di inviarlo al backend.
  // Restituisce true se si può procedere, false se è bloccante.
  function checkContentJsonSize(contentJson) {
    const sizeBytes = estimateCarouselSize(contentJson)
    if (sizeBytes >= API_SIZE_ERROR_THRESHOLD) {
      toast(
        `Il carosello è troppo grande per essere salvato (${formatBytes(sizeBytes)}). Riduci le dimensioni delle immagini prima di procedere.`,
        'error'
      )
      return false
    }
    if (sizeBytes >= API_SIZE_WARNING_THRESHOLD) {
      toast(
        `Il carosello è molto grande (${formatBytes(sizeBytes)}). Se il salvataggio fallisce, prova a usare immagini più leggere.`,
        'warning'
      )
    }
    return true
  }

  async function handleDbSave(title, thumbnail, compressedCarousel) {
    store.setIsSaving(true)
    try {
      const content_json = buildContentJson(compressedCarousel)
      if (!checkContentJsonSize(content_json)) { store.setIsSaving(false); return }
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

  async function handleOverwrite(compressedCarousel) {
    setSaveOrNewOpen(false)
    store.setIsSaving(true)
    try {
      const content_json = buildContentJson(compressedCarousel)
      if (!checkContentJsonSize(content_json)) { store.setIsSaving(false); return }
      const thumbnail = await generateThumbnail(content_json).catch(() => undefined)
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
        onOpenPreferences={() => setPreferencesOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <ThemeSidebar
          isOpen={uiPrefs.sidebarOpen}
          onToggle={toggleSidebar}
          isDesktop={isDesktop}
          theme={store.carousel.theme}
          carousel={store.carousel}
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
          applyFontSize={store.applyFontSize}
          setCustomCss={store.setCustomCss}
          applyThemeBgImage={store.applyThemeBgImage}
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

      {/* Preferenze app */}
      <AppPreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        preference={appTheme.preference}
        onSetTheme={appTheme.setTheme}
      />

      {/* Save flow */}
      <SaveOrNewPopup
        open={saveOrNewOpen}
        onClose={() => setSaveOrNewOpen(false)}
        documentTitle={store.meta.documentTitle}
        lastSavedToDbAt={store.meta.lastSavedToDbAt}
        carousel={store.carousel}
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

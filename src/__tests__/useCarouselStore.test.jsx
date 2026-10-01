/**
 * Test dell'API pubblica dell'hook useCarouselStore.
 * Fissano il contratto verso App.jsx e i componenti: stesse chiavi, azioni
 * funzionanti e stabili tra i render. Devono restare verdi invariati dopo la
 * migrazione dello store a zustand.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCarouselStore, resetCarouselStore } from '../hooks/useCarouselStore.js'

// Le chiavi che App.jsx e i componenti si aspettano dall'hook
const EXPECTED_KEYS = [
  'carousel', 'paletteLibrary', 'fontPreview', 'ui', 'meta', 'canUndo', 'canRedo',
  'loadCarousel', 'updateTitle', 'updateTheme', 'updateSlide', 'reorderSlides', 'addSlide',
  'duplicateSlide', 'deleteSlide', 'setActiveTab', 'openEditModal', 'closeEditModal',
  'markSaved', 'undo', 'redo',
  'applyPalette', 'resyncPalette', 'updatePaletteInline', 'openPaletteManager', 'closePaletteManager',
  'createPalette', 'updatePalette', 'duplicatePalette', 'deletePalette', 'importPalette',
  'openEditPalette', 'closeEditPalette',
  'applyFormat', 'applyTemplate', 'openTemplateManager', 'closeTemplateManager',
  'applyFont', 'applyFontPreset', 'previewFontChange', 'clearFontPreview', 'applyFontSize', 'setCustomCss',
  'applyThemeBgImage',
  'addThemeSticker', 'updateThemeSticker', 'removeThemeSticker', 'reorderThemeSticker',
  'addSlideSticker', 'updateSlideSticker', 'removeSlideSticker', 'reorderSlideSticker',
  'resetSlideStickerOverride', 'restoreSlideSticker',
  'replaceCarouselFromAi',
  'setIsSaving', 'setDocumentIdentity', 'loadFromDb', 'clearDocumentIdentity', 'updateDocumentTitle',
]

describe('useCarouselStore — API pubblica', () => {
  // Lo store è un singleton: ogni test riparte da uno stato iniziale pulito
  beforeEach(() => {
    localStorage.clear()
    resetCarouselStore()
  })

  it('espone tutte le chiavi attese (stato + azioni)', () => {
    const { result } = renderHook(() => useCarouselStore())
    for (const key of EXPECTED_KEYS) {
      expect(result.current, `manca "${key}"`).toHaveProperty(key)
    }
  })

  it('le azioni sono funzioni', () => {
    const { result } = renderHook(() => useCarouselStore())
    const actionKeys = EXPECTED_KEYS.filter((k) => !['carousel', 'paletteLibrary', 'fontPreview', 'ui', 'meta', 'canUndo', 'canRedo'].includes(k))
    for (const key of actionKeys) expect(typeof result.current[key]).toBe('function')
  })

  it('updateTitle aggiorna lo stato e abilita canUndo; undo/redo funzionano', () => {
    const { result } = renderHook(() => useCarouselStore())
    expect(result.current.canUndo).toBe(false)
    const original = result.current.carousel.title

    act(() => result.current.updateTitle('Titolo di test'))
    expect(result.current.carousel.title).toBe('Titolo di test')
    expect(result.current.canUndo).toBe(true)
    expect(result.current.meta.isDirty).toBe(true)

    act(() => result.current.undo())
    expect(result.current.carousel.title).toBe(original)
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())
    expect(result.current.carousel.title).toBe('Titolo di test')
  })

  it('addSlide / deleteSlide modificano il numero di slide', () => {
    const { result } = renderHook(() => useCarouselStore())
    const before = result.current.carousel.slides.length
    act(() => result.current.addSlide('standard'))
    expect(result.current.carousel.slides).toHaveLength(before + 1)
    const lastId = result.current.carousel.slides.at(-1).id
    act(() => result.current.deleteSlide(lastId))
    expect(result.current.carousel.slides).toHaveLength(before)
  })

  it('le azioni mantengono la stessa identità tra i render', () => {
    const { result, rerender } = renderHook(() => useCarouselStore())
    const first = result.current
    act(() => result.current.updateTitle('x'))
    rerender()
    for (const key of ['updateTitle', 'undo', 'addSlide', 'applyPalette', 'loadFromDb', 'replaceCarouselFromAi']) {
      expect(result.current[key], `"${key}" non stabile`).toBe(first[key])
    }
  })

  it('openEditModal / closeEditModal gestiscono ui.editingSlideId', () => {
    const { result } = renderHook(() => useCarouselStore())
    act(() => result.current.openEditModal('abc'))
    expect(result.current.ui.editingSlideId).toBe('abc')
    act(() => result.current.closeEditModal())
    expect(result.current.ui.editingSlideId).toBeNull()
  })

  it('lo stato è condiviso tra più istanze dell hook (store globale)', () => {
    const a = renderHook(() => useCarouselStore())
    const b = renderHook(() => useCarouselStore())
    act(() => a.result.current.updateTitle('Condiviso'))
    expect(b.result.current.carousel.title).toBe('Condiviso')
  })

  it('un azione ignorata dal reducer non provoca re-render', () => {
    let renders = 0
    renderHook(() => { renders++; return useCarouselStore() })
    const { result } = renderHook(() => useCarouselStore())
    const before = renders
    // senza history UNDO non cambia lo stato: il componente non deve ridisegnarsi
    act(() => result.current.undo())
    expect(renders).toBe(before)
  })
})

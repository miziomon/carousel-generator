import { useReducer, useCallback } from 'react'
import { defaultCarousel } from '../lib/defaultCarousel.js'
import { newId } from '../lib/ids.js'
import { loadDraft } from '../lib/storage.js'

import presetCover from '../assets/presets/cover.json'
import presetStandard from '../assets/presets/standard.json'
import presetDivider from '../assets/presets/divider.json'
import presetCta from '../assets/presets/cta.json'

const PRESETS = { cover: presetCover, standard: presetStandard, divider: presetDivider, cta: presetCta }
const HISTORY_LIMIT = 50

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Aggiunge id stabile a ogni slide che ne è priva
function injectIds(slides) {
  return slides.map((s) => (s.id ? s : { ...s, id: newId() }))
}

// Rinumera tutti i num da 1 a N in base all'ordine array
function renumber(slides) {
  return slides.map((s, i) => ({ ...s, num: i + 1 }))
}

// Spinge lo stato corrente in past e svuota future (per ogni azione che modifica carousel)
function pushHistory(history, currentCarousel) {
  const past = [...history.past, currentCarousel].slice(-HISTORY_LIMIT)
  return { past, future: [] }
}

// ─── Stato iniziale ───────────────────────────────────────────────────────────

function buildInitialState() {
  const saved = loadDraft()
  const base = saved ?? defaultCarousel

  return {
    carousel: {
      ...base,
      slides: renumber(injectIds(base.slides)),
    },
    ui: {
      activeTab: 'slides',
      editingSlideId: null,
      selectedSlideIds: [],
    },
    history: {
      past: [],
      future: [],
    },
    meta: {
      lastSavedAt: saved ? Date.now() : null,
      isDirty: false,
    },
  }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_CAROUSEL': {
      const slides = renumber(injectIds(action.payload.slides))
      const carousel = { ...action.payload, slides }
      return {
        ...state,
        carousel,
        history: { past: [], future: [] },
        meta: { lastSavedAt: null, isDirty: true },
      }
    }

    case 'UPDATE_THEME': {
      const carousel = { ...state.carousel, theme: action.payload }
      return {
        ...state,
        carousel,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'UPDATE_SLIDE': {
      // action.payload: oggetto slide aggiornato (identificato per id)
      const slides = state.carousel.slides.map((s) =>
        s.id === action.payload.id ? { ...action.payload } : s
      )
      const carousel = { ...state.carousel, slides }
      return {
        ...state,
        carousel,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'REORDER_SLIDES': {
      // action.payload: array di id nell'ordine nuovo
      const idOrder = action.payload
      const slideMap = Object.fromEntries(state.carousel.slides.map((s) => [s.id, s]))
      const reordered = renumber(idOrder.map((id) => slideMap[id]).filter(Boolean))
      const carousel = { ...state.carousel, slides: reordered }
      return {
        ...state,
        carousel,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'ADD_SLIDE': {
      // action.payload: { type, afterId? } — se afterId null aggiunge in fondo
      const preset = PRESETS[action.payload.type] ?? PRESETS.standard
      const newSlide = { ...preset, id: newId() }
      let slides = [...state.carousel.slides]

      if (action.payload.afterId) {
        const idx = slides.findIndex((s) => s.id === action.payload.afterId)
        slides.splice(idx + 1, 0, newSlide)
      } else {
        slides.push(newSlide)
      }

      const carousel = { ...state.carousel, slides: renumber(slides) }
      return {
        ...state,
        carousel,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'DUPLICATE_SLIDE': {
      const src = state.carousel.slides.find((s) => s.id === action.payload.id)
      if (!src) return state
      const copy = { ...src, id: newId() }
      const idx = state.carousel.slides.findIndex((s) => s.id === action.payload.id)
      const slides = [...state.carousel.slides]
      slides.splice(idx + 1, 0, copy)
      const carousel = { ...state.carousel, slides: renumber(slides) }
      return {
        ...state,
        carousel,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'DELETE_SLIDE': {
      if (state.carousel.slides.length <= 1) return state // almeno 1 slide
      const slides = renumber(state.carousel.slides.filter((s) => s.id !== action.payload.id))
      const carousel = { ...state.carousel, slides }
      return {
        ...state,
        carousel,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'SET_ACTIVE_TAB':
      return { ...state, ui: { ...state.ui, activeTab: action.payload } }

    case 'OPEN_EDIT_MODAL':
      return { ...state, ui: { ...state.ui, editingSlideId: action.payload.id } }

    case 'CLOSE_EDIT_MODAL':
      return { ...state, ui: { ...state.ui, editingSlideId: null } }

    case 'MARK_SAVED':
      return { ...state, meta: { ...state.meta, lastSavedAt: action.payload, isDirty: false } }

    // Undo/Redo — le scorciatoie tastiera arrivano in Fase 4, il reducer è già pronto
    case 'UNDO': {
      if (state.history.past.length === 0) return state
      const past = [...state.history.past]
      const previous = past.pop()
      return {
        ...state,
        carousel: previous,
        history: { past, future: [state.carousel, ...state.history.future] },
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state
      const [next, ...future] = state.history.future
      return {
        ...state,
        carousel: next,
        history: { past: [...state.history.past, state.carousel], future },
        meta: { ...state.meta, isDirty: true },
      }
    }

    default:
      return state
  }
}

// ─── Hook pubblico ────────────────────────────────────────────────────────────

export function useCarouselStore() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState)

  // Azioni memoizzate per stabilità delle props (evita re-render inutili su SlideCard)
  const loadCarousel = useCallback((carousel) => dispatch({ type: 'LOAD_CAROUSEL', payload: carousel }), [])
  const updateTheme = useCallback((theme) => dispatch({ type: 'UPDATE_THEME', payload: theme }), [])
  const updateSlide = useCallback((slide) => dispatch({ type: 'UPDATE_SLIDE', payload: slide }), [])
  const reorderSlides = useCallback((ids) => dispatch({ type: 'REORDER_SLIDES', payload: ids }), [])
  const addSlide = useCallback((type, afterId = null) => dispatch({ type: 'ADD_SLIDE', payload: { type, afterId } }), [])
  const duplicateSlide = useCallback((id) => dispatch({ type: 'DUPLICATE_SLIDE', payload: { id } }), [])
  const deleteSlide = useCallback((id) => dispatch({ type: 'DELETE_SLIDE', payload: { id } }), [])
  const setActiveTab = useCallback((tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }), [])
  const openEditModal = useCallback((id) => dispatch({ type: 'OPEN_EDIT_MODAL', payload: { id } }), [])
  const closeEditModal = useCallback(() => dispatch({ type: 'CLOSE_EDIT_MODAL' }), [])
  const markSaved = useCallback((ts) => dispatch({ type: 'MARK_SAVED', payload: ts }), [])
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])

  return {
    // Stato
    carousel: state.carousel,
    ui: state.ui,
    meta: state.meta,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    // Azioni
    loadCarousel,
    updateTheme,
    updateSlide,
    reorderSlides,
    addSlide,
    duplicateSlide,
    deleteSlide,
    setActiveTab,
    openEditModal,
    closeEditModal,
    markSaved,
    undo,
    redo,
  }
}

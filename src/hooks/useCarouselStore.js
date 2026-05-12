import { useReducer, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { defaultCarousel } from '../lib/defaultCarousel.js'
import { newId } from '../lib/ids.js'
import { loadDraft, loadPalettes } from '../lib/storage.js'
import { migrateCarousel } from '../lib/migrations/migrateCarousel.js'
import { BUILTIN_PALETTES } from '../lib/palettes/builtinPalettes.js'

import presetCover from '../assets/presets/cover.json'
import presetStandard from '../assets/presets/standard.json'
import presetDivider from '../assets/presets/divider.json'
import presetCta from '../assets/presets/cta.json'
import presetQuote from '../assets/presets/quote.json'

const PRESETS = {
  cover: presetCover,
  standard: presetStandard,
  divider: presetDivider,
  cta: presetCta,
  quote: presetQuote,
}
const HISTORY_LIMIT = 50

// ── Helpers generici ──────────────────────────────────────────────────────────

// Aggiunge id stabile a ogni slide che ne e' priva
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

// ── Helpers palette ───────────────────────────────────────────────────────────

/**
 * Costruisce la libreria palette garantendo che le built-in siano sempre
 * presenti in cima, anche se l'utente le avesse rimosse per errore.
 * Idempotente: chiamarla piu' volte produce lo stesso risultato.
 *
 * @param {Array<object>} userPalettes -- palette con origin: "user" da localStorage
 * @returns {Array<object>}
 */
function mergePaletteLibrary(userPalettes) {
  if (!userPalettes) userPalettes = []
  // Le built-in vengono prima, immutabili
  // Le user palette vengono dopo, filtrate da eventuali system duplicate
  const cleanUser = userPalettes.filter((p) => p.origin === 'user')
  return [...BUILTIN_PALETTES, ...cleanUser]
}

// ── Stato iniziale ────────────────────────────────────────────────────────────

function buildInitialState() {
  const saved = loadDraft()
  // Migra il draft prima di usarlo -- gestisce il formato vecchio (5 colori, no palette_id)
  const migrated = saved ? migrateCarousel(saved) : null
  const base = migrated !== null ? migrated : defaultCarousel

  // Inizializza la libreria palette: built-in garantite in cima + palette utente da localStorage
  const userPalettes = loadPalettes()
  const paletteLibrary = mergePaletteLibrary(userPalettes)

  return {
    carousel: {
      ...base,
      slides: renumber(injectIds(base.slides)),
    },
    paletteLibrary,
    ui: {
      activeTab: 'slides',
      editingSlideId: null,
      selectedSlideIds: [],
      paletteManagerOpen: false,
      editingPaletteId: null,
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

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_CAROUSEL': {
      // Migra prima di usare -- i payload arrivano da import JSON e possono essere vecchio formato
      const migrated = migrateCarousel(action.payload)
      const slides = renumber(injectIds(migrated.slides))
      const carousel = { ...migrated, slides }
      return {
        ...state,
        carousel,
        history: { past: [], future: [] },
        meta: { lastSavedAt: null, isDirty: true },
      }
    }

    case 'UPDATE_TITLE': {
      const carousel = { ...state.carousel, title: action.payload }
      return {
        ...state,
        carousel,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
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
      // action.payload: { type, afterId? } -- se afterId null aggiunge in fondo
      const preset = PRESETS[action.payload.type] !== undefined ? PRESETS[action.payload.type] : PRESETS.standard
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
      if (state.carousel.slides.length <= 1) return state
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

    // Undo/Redo -- le scorciatoie tastiera arrivano in Fase 4, il reducer e' gia' pronto
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

    // ── Azioni palette (Fase 2) ──────────────────────────────────────────────

    case 'APPLY_PALETTE': {
      // Snapshot dei colori della palette nel theme del carosello + aggiorna palette_id.
      // Mai chiamata automaticamente -- solo da click utente su "Applica".
      const palette = state.paletteLibrary.find((p) => p.id === action.payload.paletteId)
      if (!palette) return state
      const newThemeA = {
        ...state.carousel.theme,
        palette_id: palette.id,
        palette: { ...palette.colors },
      }
      const carouselA = { ...state.carousel, theme: newThemeA }
      return {
        ...state,
        carousel: carouselA,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'RESYNC_PALETTE': {
      // Ri-applica la palette di riferimento (se esiste ancora in libreria).
      // Disabled se palette_id e' null o palette non trovata.
      const palId = state.carousel.theme.palette_id
      if (!palId) return state
      const palFound = state.paletteLibrary.find((p) => p.id === palId)
      if (!palFound) return state
      const newThemeR = {
        ...state.carousel.theme,
        palette: { ...palFound.colors },
      }
      const carouselR = { ...state.carousel, theme: newThemeR }
      return {
        ...state,
        carousel: carouselR,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'UPDATE_PALETTE_INLINE': {
      // Modifica un singolo colore del theme.palette.
      // Setta palette_id a null perche' il carosello ha divergato dalla palette di origine.
      // Finisce in undo/redo (e' una modifica al documento, non alla libreria).
      const { key, value } = action.payload
      const newThemeU = {
        ...state.carousel.theme,
        palette_id: null,
        palette: { ...state.carousel.theme.palette, [key]: value },
      }
      const carouselU = { ...state.carousel, theme: newThemeU }
      return {
        ...state,
        carousel: carouselU,
        history: pushHistory(state.history, state.carousel),
        meta: { ...state.meta, isDirty: true },
      }
    }

    case 'OPEN_PALETTE_MANAGER':
      return { ...state, ui: { ...state.ui, paletteManagerOpen: true } }

    case 'CLOSE_PALETTE_MANAGER':
      return { ...state, ui: { ...state.ui, paletteManagerOpen: false, editingPaletteId: null } }

    // ── Azioni libreria palette (Fase 3) ─────────────────────────────────────

    case 'CREATE_PALETTE': {
      // Aggiunge una nuova palette user alla libreria.
      // Non finisce in undo/redo — la libreria è globale, non un documento.
      const newPalette = {
        ...action.payload,
        id: `user-${nanoid(8)}`,
        origin: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      return { ...state, paletteLibrary: [...state.paletteLibrary, newPalette] }
    }

    case 'UPDATE_PALETTE': {
      // Modifica una palette user. Errore silenzioso se si tenta su system.
      const { paletteId, patch } = action.payload
      const paletteLibrary = state.paletteLibrary.map((p) => {
        if (p.id !== paletteId) return p
        if (p.origin === 'system') return p  // immutabile
        return { ...p, ...patch, id: p.id, origin: p.origin, updatedAt: Date.now() }
      })
      return { ...state, paletteLibrary }
    }

    case 'DUPLICATE_PALETTE': {
      // Crea una copia user di qualsiasi palette (anche system).
      const src = state.paletteLibrary.find((p) => p.id === action.payload.paletteId)
      if (!src) return state
      const copy = {
        id: `user-${nanoid(8)}`,
        name: action.payload.newName ?? `${src.name} (copia)`,
        description: src.description ?? '',
        origin: 'user',
        colors: { ...src.colors },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      return { ...state, paletteLibrary: [...state.paletteLibrary, copy] }
    }

    case 'DELETE_PALETTE': {
      // Rimuove una palette user. Se era applicata al carosello, setta palette_id a null
      // ma NON tocca i colori (sono uno snapshot indipendente).
      const { paletteId } = action.payload
      const toDelete = state.paletteLibrary.find((p) => p.id === paletteId)
      if (!toDelete || toDelete.origin === 'system') return state

      const paletteLibrary = state.paletteLibrary.filter((p) => p.id !== paletteId)

      // Coerenza referenziale: se il carosello puntava a questa palette, stacca il riferimento
      let carousel = state.carousel
      if (state.carousel.theme.palette_id === paletteId) {
        carousel = {
          ...state.carousel,
          theme: { ...state.carousel.theme, palette_id: null },
        }
      }

      return { ...state, paletteLibrary, carousel }
    }

    case 'IMPORT_PALETTE': {
      // Importa una palette esterna come nuova palette user.
      // Genera sempre un nuovo id e forza origin: "user".
      const { palette, suggestedName } = action.payload
      const existingNames = state.paletteLibrary.map((p) => p.name)
      const baseName = suggestedName ?? palette.name ?? 'Palette importata'
      const name = existingNames.includes(baseName) ? `${baseName} (importata)` : baseName

      const imported = {
        ...palette,
        id: `user-${nanoid(8)}`,
        name,
        origin: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      return { ...state, paletteLibrary: [...state.paletteLibrary, imported] }
    }

    case 'OPEN_EDIT_PALETTE':
      return { ...state, ui: { ...state.ui, editingPaletteId: action.payload.paletteId ?? '__new__' } }

    case 'CLOSE_EDIT_PALETTE':
      return { ...state, ui: { ...state.ui, editingPaletteId: null } }

    default:
      return state
  }
}

// ─── Hook pubblico ────────────────────────────────────────────────────────────

export function useCarouselStore() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState)

  // ── Azioni carosello (memoizzate per stabilità props) ─────────────────────
  const loadCarousel   = useCallback((c)   => dispatch({ type: 'LOAD_CAROUSEL',   payload: c }),    [])
  const updateTitle    = useCallback((t)   => dispatch({ type: 'UPDATE_TITLE',    payload: t }),    [])
  const updateTheme    = useCallback((t)   => dispatch({ type: 'UPDATE_THEME',    payload: t }),    [])
  const updateSlide    = useCallback((s)   => dispatch({ type: 'UPDATE_SLIDE',    payload: s }),    [])
  const reorderSlides  = useCallback((ids) => dispatch({ type: 'REORDER_SLIDES',  payload: ids }),  [])
  const addSlide       = useCallback((type, afterId = null) => dispatch({ type: 'ADD_SLIDE', payload: { type, afterId } }), [])
  const duplicateSlide = useCallback((id)  => dispatch({ type: 'DUPLICATE_SLIDE', payload: { id } }), [])
  const deleteSlide    = useCallback((id)  => dispatch({ type: 'DELETE_SLIDE',    payload: { id } }), [])
  const setActiveTab   = useCallback((tab) => dispatch({ type: 'SET_ACTIVE_TAB',  payload: tab }),  [])
  const openEditModal  = useCallback((id)  => dispatch({ type: 'OPEN_EDIT_MODAL', payload: { id } }), [])
  const closeEditModal = useCallback(()    => dispatch({ type: 'CLOSE_EDIT_MODAL' }),                [])
  const markSaved      = useCallback((ts)  => dispatch({ type: 'MARK_SAVED',      payload: ts }),   [])
  const undo           = useCallback(()    => dispatch({ type: 'UNDO' }),                            [])
  const redo           = useCallback(()    => dispatch({ type: 'REDO' }),                            [])

  // ── Azioni palette carosello (Fase 2) ─────────────────────────────────────
  const applyPalette        = useCallback((paletteId) => dispatch({ type: 'APPLY_PALETTE',        payload: { paletteId } }), [])
  const resyncPalette       = useCallback(()          => dispatch({ type: 'RESYNC_PALETTE' }),                               [])
  const updatePaletteInline = useCallback((key, value) => dispatch({ type: 'UPDATE_PALETTE_INLINE', payload: { key, value } }), [])
  const openPaletteManager  = useCallback(()          => dispatch({ type: 'OPEN_PALETTE_MANAGER' }),                         [])
  const closePaletteManager = useCallback(()          => dispatch({ type: 'CLOSE_PALETTE_MANAGER' }),                        [])

  // ── Azioni libreria palette (Fase 3) ──────────────────────────────────────
  const createPalette    = useCallback((palette)            => dispatch({ type: 'CREATE_PALETTE',    payload: palette }),               [])
  const updatePalette    = useCallback((paletteId, patch)   => dispatch({ type: 'UPDATE_PALETTE',    payload: { paletteId, patch } }),   [])
  const duplicatePalette = useCallback((paletteId, newName) => dispatch({ type: 'DUPLICATE_PALETTE', payload: { paletteId, newName } }), [])
  const deletePalette    = useCallback((paletteId)          => dispatch({ type: 'DELETE_PALETTE',    payload: { paletteId } }),          [])
  const importPalette    = useCallback((palette)            => dispatch({ type: 'IMPORT_PALETTE',    payload: { palette } }),            [])
  const openEditPalette  = useCallback((paletteId)          => dispatch({ type: 'OPEN_EDIT_PALETTE', payload: { paletteId } }),          [])
  const closeEditPalette = useCallback(()                   => dispatch({ type: 'CLOSE_EDIT_PALETTE' }),                                [])

  return {
    // Stato
    carousel:       state.carousel,
    paletteLibrary: state.paletteLibrary,
    ui:             state.ui,
    meta:           state.meta,
    canUndo:        state.history.past.length   > 0,
    canRedo:        state.history.future.length > 0,
    // Azioni carosello
    loadCarousel, updateTitle, updateTheme, updateSlide,
    reorderSlides, addSlide, duplicateSlide, deleteSlide,
    setActiveTab, openEditModal, closeEditModal, markSaved, undo, redo,
    // Azioni palette carosello
    applyPalette, resyncPalette, updatePaletteInline,
    openPaletteManager, closePaletteManager,
    // Azioni libreria palette
    createPalette, updatePalette, duplicatePalette, deletePalette,
    importPalette, openEditPalette, closeEditPalette,
  }
}
 
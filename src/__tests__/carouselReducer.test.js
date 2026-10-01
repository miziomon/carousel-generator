/**
 * Characterization test del reducer del carosello (useCarouselStore.js).
 * Fissano il comportamento attuale: devono restare verdi invariati quando lo
 * store viene migrato (useReducer → zustand) o cambiano le dipendenze.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { reducer, buildInitialState } from '../hooks/useCarouselStore.js'

const sticker = (id) => ({ id, type: 'text', text: id })

// Stato di partenza pulito: nessun draft in localStorage
function freshState() {
  localStorage.clear()
  return buildInitialState()
}

const ids = (state) => state.carousel.slides.map((s) => s.id)
const nums = (state) => state.carousel.slides.map((s) => s.num)

describe('buildInitialState', () => {
  beforeEach(() => localStorage.clear())

  it('senza draft parte dal default con id stabili e num sequenziali', () => {
    const s = buildInitialState()
    expect(s.carousel.slides.length).toBeGreaterThan(0)
    expect(s.carousel.slides.every((sl) => typeof sl.id === 'string' && sl.id)).toBe(true)
    expect(nums(s)).toEqual(s.carousel.slides.map((_, i) => i + 1))
    expect(s.history).toEqual({ past: [], future: [] })
    expect(s.meta.isDirty).toBe(false)
    expect(s.meta.lastSavedAt).toBeNull()
  })

  it('la libreria palette contiene le built-in', () => {
    const s = buildInitialState()
    expect(s.paletteLibrary.length).toBeGreaterThan(0)
    expect(s.paletteLibrary.every((p) => p.origin !== 'user')).toBe(true)
  })

  it('con un draft in localStorage lo ripristina e imposta lastSavedAt', () => {
    const base = buildInitialState()
    const draft = { ...base.carousel, title: 'Titolo da draft' }
    localStorage.setItem('carosello.draft.v1', JSON.stringify(draft))
    const s = buildInitialState()
    expect(s.carousel.title).toBe('Titolo da draft')
    expect(s.meta.lastSavedAt).not.toBeNull()
  })

  it('assegna un id agli sticker globali che ne sono privi', () => {
    const base = buildInitialState()
    const draft = {
      ...base.carousel,
      theme: { ...base.carousel.theme, global_stickers: [{ type: 'text', text: 'x' }] },
    }
    localStorage.setItem('carosello.draft.v1', JSON.stringify(draft))
    const s = buildInitialState()
    expect(s.carousel.theme.global_stickers[0].id).toBeTruthy()
  })
})

describe('reducer — slide', () => {
  let state
  beforeEach(() => { state = freshState() })

  it('UPDATE_TITLE aggiorna il titolo, registra history e marca dirty', () => {
    const next = reducer(state, { type: 'UPDATE_TITLE', payload: 'Nuovo' })
    expect(next.carousel.title).toBe('Nuovo')
    expect(next.history.past).toHaveLength(1)
    expect(next.history.past[0]).toBe(state.carousel)
    expect(next.meta.isDirty).toBe(true)
  })

  it('UPDATE_SLIDE sostituisce solo la slide con quell id', () => {
    const target = state.carousel.slides[1]
    const next = reducer(state, { type: 'UPDATE_SLIDE', payload: { ...target, lines: ['cambiata'] } })
    expect(next.carousel.slides[1].lines).toEqual(['cambiata'])
    expect(next.carousel.slides[0]).toBe(state.carousel.slides[0])
  })

  it('ADD_SLIDE in fondo rinumera e usa il preset del tipo', () => {
    const before = state.carousel.slides.length
    const next = reducer(state, { type: 'ADD_SLIDE', payload: { type: 'divider', afterId: null } })
    expect(next.carousel.slides).toHaveLength(before + 1)
    expect(next.carousel.slides.at(-1).type).toBe('divider')
    expect(nums(next)).toEqual(next.carousel.slides.map((_, i) => i + 1))
  })

  it('ADD_SLIDE con afterId inserisce subito dopo', () => {
    const first = state.carousel.slides[0].id
    const next = reducer(state, { type: 'ADD_SLIDE', payload: { type: 'quote', afterId: first } })
    expect(next.carousel.slides[1].type).toBe('quote')
    expect(next.carousel.slides[0].id).toBe(first)
  })

  it('ADD_SLIDE con tipo sconosciuto ricade sul preset standard', () => {
    const next = reducer(state, { type: 'ADD_SLIDE', payload: { type: 'inesistente', afterId: null } })
    expect(next.carousel.slides.at(-1).type).toBe('standard')
  })

  it('DUPLICATE_SLIDE crea una copia con id nuovo subito dopo l originale', () => {
    const src = state.carousel.slides[1]
    const next = reducer(state, { type: 'DUPLICATE_SLIDE', payload: { id: src.id } })
    expect(next.carousel.slides).toHaveLength(state.carousel.slides.length + 1)
    const copy = next.carousel.slides[2]
    expect(copy.id).not.toBe(src.id)
    expect(copy.lines).toEqual(src.lines)
    expect(nums(next)).toEqual(next.carousel.slides.map((_, i) => i + 1))
  })

  it('DUPLICATE_SLIDE su id inesistente non cambia lo stato', () => {
    expect(reducer(state, { type: 'DUPLICATE_SLIDE', payload: { id: 'nope' } })).toBe(state)
  })

  it('DELETE_SLIDE rimuove e rinumera', () => {
    const victim = state.carousel.slides[1].id
    const next = reducer(state, { type: 'DELETE_SLIDE', payload: { id: victim } })
    expect(ids(next)).not.toContain(victim)
    expect(nums(next)).toEqual(next.carousel.slides.map((_, i) => i + 1))
  })

  it('DELETE_SLIDE sull ultima slide rimasta è ignorato', () => {
    let s = state
    while (s.carousel.slides.length > 1) {
      s = reducer(s, { type: 'DELETE_SLIDE', payload: { id: s.carousel.slides[0].id } })
    }
    const same = reducer(s, { type: 'DELETE_SLIDE', payload: { id: s.carousel.slides[0].id } })
    expect(same).toBe(s)
    expect(same.carousel.slides).toHaveLength(1)
  })

  it('REORDER_SLIDES riordina per id, rinumera e scarta id sconosciuti', () => {
    const order = [...ids(state)].reverse()
    const next = reducer(state, { type: 'REORDER_SLIDES', payload: [...order, 'fantasma'] })
    expect(ids(next)).toEqual(order)
    expect(nums(next)).toEqual(order.map((_, i) => i + 1))
  })
})

describe('reducer — undo/redo e history', () => {
  let state
  beforeEach(() => { state = freshState() })

  it('UNDO ripristina il carosello precedente e REDO lo riapplica', () => {
    const edited = reducer(state, { type: 'UPDATE_TITLE', payload: 'A' })
    const undone = reducer(edited, { type: 'UNDO' })
    expect(undone.carousel).toBe(state.carousel)
    expect(undone.history.future).toHaveLength(1)
    const redone = reducer(undone, { type: 'REDO' })
    expect(redone.carousel.title).toBe('A')
    expect(redone.history.future).toHaveLength(0)
  })

  it('UNDO/REDO senza storia non cambiano lo stato', () => {
    expect(reducer(state, { type: 'UNDO' })).toBe(state)
    expect(reducer(state, { type: 'REDO' })).toBe(state)
  })

  it('una nuova modifica dopo UNDO svuota il future', () => {
    let s = reducer(state, { type: 'UPDATE_TITLE', payload: 'A' })
    s = reducer(s, { type: 'UNDO' })
    s = reducer(s, { type: 'UPDATE_TITLE', payload: 'B' })
    expect(s.history.future).toEqual([])
  })

  it('la history è limitata a 50 snapshot', () => {
    let s = state
    for (let i = 0; i < 60; i++) s = reducer(s, { type: 'UPDATE_TITLE', payload: `t${i}` })
    expect(s.history.past).toHaveLength(50)
  })

  it('le azioni UI non finiscono nella history', () => {
    const s = reducer(state, { type: 'SET_ACTIVE_TAB', payload: 'json' })
    expect(s.ui.activeTab).toBe('json')
    expect(s.history.past).toHaveLength(0)
  })

  it('MARK_SAVED azzera isDirty e salva il timestamp', () => {
    const dirty = reducer(state, { type: 'UPDATE_TITLE', payload: 'A' })
    const saved = reducer(dirty, { type: 'MARK_SAVED', payload: 12345 })
    expect(saved.meta.isDirty).toBe(false)
    expect(saved.meta.lastSavedAt).toBe(12345)
  })
})

describe('reducer — sticker', () => {
  let state
  beforeEach(() => { state = freshState() })

  it('ADD/UPDATE/REORDER_THEME_STICKER lavorano sull array globale', () => {
    let s = reducer(state, { type: 'ADD_THEME_STICKER', payload: sticker('a') })
    s = reducer(s, { type: 'ADD_THEME_STICKER', payload: sticker('b') })
    s = reducer(s, { type: 'UPDATE_THEME_STICKER', payload: { id: 'a', patch: { text: 'nuovo' } } })
    expect(s.carousel.theme.global_stickers.find((x) => x.id === 'a').text).toBe('nuovo')
    s = reducer(s, { type: 'REORDER_THEME_STICKER', payload: { id: 'a', direction: 'down' } })
    expect(s.carousel.theme.global_stickers.map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('REORDER_THEME_STICKER ai bordi non cambia lo stato', () => {
    const s = reducer(state, { type: 'ADD_THEME_STICKER', payload: sticker('a') })
    expect(reducer(s, { type: 'REORDER_THEME_STICKER', payload: { id: 'a', direction: 'up' } })).toBe(s)
  })

  it('REMOVE_THEME_STICKER pulisce override, hidden e order orfani in tutte le slide', () => {
    let s = reducer(state, { type: 'ADD_THEME_STICKER', payload: sticker('g1') })
    const slideId = s.carousel.slides[0].id
    s = reducer(s, { type: 'UPDATE_SLIDE_STICKER', payload: { slideId, id: 'g1', patch: { text: 'o' } } })
    s = reducer(s, { type: 'REORDER_SLIDE_STICKER', payload: { slideId, id: 'g1', direction: 'down' } })
    s = reducer(s, { type: 'REMOVE_THEME_STICKER', payload: { id: 'g1' } })
    const slide = s.carousel.slides[0]
    expect(s.carousel.theme.global_stickers).toEqual([])
    expect(slide.sticker_overrides?.g1).toBeUndefined()
    expect(slide.sticker_order ?? []).not.toContain('g1')
  })

  it('REMOVE_SLIDE_STICKER su sticker globale lo nasconde, RESTORE lo ripristina', () => {
    let s = reducer(state, { type: 'ADD_THEME_STICKER', payload: sticker('g1') })
    const slideId = s.carousel.slides[0].id
    s = reducer(s, { type: 'REMOVE_SLIDE_STICKER', payload: { slideId, id: 'g1' } })
    expect(s.carousel.slides[0].hidden_stickers).toEqual(['g1'])
    s = reducer(s, { type: 'RESTORE_SLIDE_STICKER', payload: { slideId, id: 'g1' } })
    expect(s.carousel.slides[0].hidden_stickers).toEqual([])
  })

  it('ADD_SLIDE_STICKER aggiunge uno sticker locale; REMOVE lo elimina davvero', () => {
    const slideId = state.carousel.slides[0].id
    let s = reducer(state, { type: 'ADD_SLIDE_STICKER', payload: { slideId, sticker: sticker('local-1') } })
    expect(s.carousel.slides[0].stickers.map((x) => x.id)).toEqual(['local-1'])
    s = reducer(s, { type: 'REMOVE_SLIDE_STICKER', payload: { slideId, id: 'local-1' } })
    expect(s.carousel.slides[0].stickers).toEqual([])
  })

  it('RESET_SLIDE_STICKER_OVERRIDE rimuove la patch locale', () => {
    let s = reducer(state, { type: 'ADD_THEME_STICKER', payload: sticker('g1') })
    const slideId = s.carousel.slides[0].id
    s = reducer(s, { type: 'UPDATE_SLIDE_STICKER', payload: { slideId, id: 'g1', patch: { text: 'o' } } })
    expect(s.carousel.slides[0].sticker_overrides.g1).toBeDefined()
    s = reducer(s, { type: 'RESET_SLIDE_STICKER_OVERRIDE', payload: { slideId, id: 'g1' } })
    expect(s.carousel.slides[0].sticker_overrides.g1).toBeUndefined()
  })
})

describe('reducer — palette e libreria', () => {
  let state
  beforeEach(() => { state = freshState() })

  const builtinId = (s) => s.paletteLibrary[0].id

  it('APPLY_PALETTE copia i colori nel theme e imposta palette_id', () => {
    const id = builtinId(state)
    const s = reducer(state, { type: 'APPLY_PALETTE', payload: { paletteId: id } })
    expect(s.carousel.theme.palette_id).toBe(id)
    expect(s.carousel.theme.palette).toEqual(state.paletteLibrary[0].colors)
    expect(s.history.past).toHaveLength(1)
  })

  it('APPLY_PALETTE con id inesistente non cambia lo stato', () => {
    expect(reducer(state, { type: 'APPLY_PALETTE', payload: { paletteId: 'zzz' } })).toBe(state)
  })

  it('UPDATE_PALETTE_INLINE modifica un colore e stacca palette_id', () => {
    const s = reducer(state, { type: 'UPDATE_PALETTE_INLINE', payload: { key: 'accent', value: '#123456' } })
    expect(s.carousel.theme.palette.accent).toBe('#123456')
    expect(s.carousel.theme.palette_id).toBeNull()
  })

  it('CREATE_PALETTE aggiunge una palette user senza toccare la history', () => {
    const s = reducer(state, { type: 'CREATE_PALETTE', payload: { name: 'Mia', colors: { accent: '#fff' } } })
    const created = s.paletteLibrary.at(-1)
    expect(created.origin).toBe('user')
    expect(created.id).toMatch(/^user-/)
    expect(s.history.past).toHaveLength(0)
  })

  it('UPDATE_PALETTE non modifica le palette di sistema', () => {
    const sysId = builtinId(state)
    const s = reducer(state, { type: 'UPDATE_PALETTE', payload: { paletteId: sysId, patch: { name: 'Hack' } } })
    expect(s.paletteLibrary[0].name).toBe(state.paletteLibrary[0].name)
  })

  it('DUPLICATE_PALETTE crea una copia user con nome "(copia)"', () => {
    const src = state.paletteLibrary[0]
    const s = reducer(state, { type: 'DUPLICATE_PALETTE', payload: { paletteId: src.id } })
    const copy = s.paletteLibrary.at(-1)
    expect(copy.origin).toBe('user')
    expect(copy.name).toBe(`${src.name} (copia)`)
    expect(copy.colors).toEqual(src.colors)
  })

  it('DELETE_PALETTE stacca palette_id se era applicata ma non tocca i colori', () => {
    let s = reducer(state, { type: 'CREATE_PALETTE', payload: { name: 'Mia', colors: { accent: '#abcdef' } } })
    const userId = s.paletteLibrary.at(-1).id
    s = reducer(s, { type: 'APPLY_PALETTE', payload: { paletteId: userId } })
    const colors = s.carousel.theme.palette
    s = reducer(s, { type: 'DELETE_PALETTE', payload: { paletteId: userId } })
    expect(s.paletteLibrary.find((p) => p.id === userId)).toBeUndefined()
    expect(s.carousel.theme.palette_id).toBeNull()
    expect(s.carousel.theme.palette).toEqual(colors)
  })

  it('DELETE_PALETTE non elimina le palette di sistema', () => {
    const sysId = builtinId(state)
    expect(reducer(state, { type: 'DELETE_PALETTE', payload: { paletteId: sysId } })).toBe(state)
  })

  it('IMPORT_PALETTE forza origin user e disambigua nomi duplicati', () => {
    const name = state.paletteLibrary[0].name
    const s = reducer(state, { type: 'IMPORT_PALETTE', payload: { palette: { name, colors: {}, origin: 'system', id: 'x' } } })
    const imported = s.paletteLibrary.at(-1)
    expect(imported.origin).toBe('user')
    expect(imported.id).not.toBe('x')
    expect(imported.name).toBe(`${name} (importata)`)
  })
})

describe('reducer — tema, caricamenti e persistenza', () => {
  let state
  beforeEach(() => { state = freshState() })

  it('APPLY_TEMPLATE e APPLY_FORMAT aggiornano il theme con history', () => {
    let s = reducer(state, { type: 'APPLY_TEMPLATE', payload: { templateId: 'system-bold-corner' } })
    s = reducer(s, { type: 'APPLY_FORMAT', payload: { formatId: 'portrait' } })
    expect(s.carousel.theme.template_id).toBe('system-bold-corner')
    expect(s.carousel.theme.format).toBe('portrait')
    expect(s.history.past).toHaveLength(2)
  })

  it('APPLY_FONT_SIZE aggiorna la dimensione dello slot', () => {
    const s = reducer(state, { type: 'APPLY_FONT_SIZE', payload: { slot: 'primary', size: 77 } })
    expect(s.carousel.theme.fonts.sizes.primary).toBe(77)
  })

  it('PREVIEW_FONT_CHANGE/CLEAR_FONT_PREVIEW non toccano carosello né history', () => {
    let s = reducer(state, { type: 'PREVIEW_FONT_CHANGE', payload: { slot: 'primary', fontId: 'x' } })
    expect(s.fontPreview).toEqual({ slot: 'primary', fontId: 'x' })
    s = reducer(s, { type: 'CLEAR_FONT_PREVIEW' })
    expect(s.fontPreview).toBeNull()
    expect(s.carousel).toBe(state.carousel)
    expect(s.history.past).toHaveLength(0)
  })

  it('APPLY_THEME_BG_IMAGE con undefined rimuove il campo', () => {
    let s = reducer(state, { type: 'APPLY_THEME_BG_IMAGE', payload: { url: 'u' } })
    expect(s.carousel.theme.background_image).toEqual({ url: 'u' })
    s = reducer(s, { type: 'APPLY_THEME_BG_IMAGE', payload: undefined })
    expect('background_image' in s.carousel.theme).toBe(false)
  })

  it('LOAD_CAROUSEL azzera la history, rinumera e marca dirty', () => {
    let s = reducer(state, { type: 'UPDATE_TITLE', payload: 'A' })
    const incoming = { ...state.carousel, title: 'Importato' }
    s = reducer(s, { type: 'LOAD_CAROUSEL', payload: incoming })
    expect(s.carousel.title).toBe('Importato')
    expect(s.history).toEqual({ past: [], future: [] })
    expect(s.meta.isDirty).toBe(true)
    expect(nums(s)).toEqual(s.carousel.slides.map((_, i) => i + 1))
  })

  it('LOAD_FROM_DB imposta l identità del documento e non è dirty', () => {
    const s = reducer(state, {
      type: 'LOAD_FROM_DB',
      payload: { carousel: { ...state.carousel, title: 'Da DB' }, documentId: 7, title: 'Doc', createdAt: 'ieri' },
    })
    expect(s.carousel.title).toBe('Da DB')
    expect(s.meta).toMatchObject({ documentId: 7, documentTitle: 'Doc', documentCreatedAt: 'ieri', isDirty: false, isSaving: false })
    expect(s.meta.lastSavedToDbAt).not.toBeNull()
    expect(s.history).toEqual({ past: [], future: [] })
  })

  it('REPLACE_CAROUSEL_FROM_AI mantiene il theme, sostituisce le slide e registra _ai_generation', () => {
    const generated = { slides: [{ type: 'standard', lines: ['ai'], font: 'primary', size: 'lg' }] }
    const s = reducer(state, {
      type: 'REPLACE_CAROUSEL_FROM_AI',
      payload: { generated, meta: { model: 'gemini-x', inputChars: 10, usage: { total_tokens: 5 }, generationId: 'g1' } },
    })
    expect(s.carousel.theme).toBe(state.carousel.theme)
    expect(s.carousel.slides).toHaveLength(1)
    expect(s.carousel.slides[0].id).toBeTruthy()
    expect(s.carousel._ai_generation).toMatchObject({ model: 'gemini-x', input_chars: 10, generation_id: 'g1' })
    expect(s.history.past).toHaveLength(1)
  })

  it('SET_DOCUMENT_IDENTITY / CLEAR_DOCUMENT_IDENTITY / UPDATE_DOCUMENT_TITLE / SET_IS_SAVING', () => {
    let s = reducer(state, { type: 'SET_IS_SAVING', payload: true })
    expect(s.meta.isSaving).toBe(true)
    s = reducer(s, { type: 'SET_DOCUMENT_IDENTITY', payload: { documentId: 1, documentTitle: 'T', documentCreatedAt: 'c' } })
    expect(s.meta).toMatchObject({ documentId: 1, documentTitle: 'T', isSaving: false, isDirty: false })
    s = reducer(s, { type: 'UPDATE_DOCUMENT_TITLE', payload: { title: 'T2' } })
    expect(s.meta.documentTitle).toBe('T2')
    s = reducer(s, { type: 'CLEAR_DOCUMENT_IDENTITY' })
    expect(s.meta).toMatchObject({ documentId: null, documentTitle: null, lastSavedToDbAt: null })
  })

  it('azione sconosciuta restituisce lo stesso stato', () => {
    expect(reducer(state, { type: 'NON_ESISTE' })).toBe(state)
  })
})

describe('reducer — UI modali', () => {
  it('apre e chiude edit modal, palette manager e template manager', () => {
    let s = freshState()
    s = reducer(s, { type: 'OPEN_EDIT_MODAL', payload: { id: 'abc' } })
    expect(s.ui.editingSlideId).toBe('abc')
    s = reducer(s, { type: 'CLOSE_EDIT_MODAL' })
    expect(s.ui.editingSlideId).toBeNull()
    s = reducer(s, { type: 'OPEN_PALETTE_MANAGER' })
    expect(s.ui.paletteManagerOpen).toBe(true)
    s = reducer(s, { type: 'CLOSE_PALETTE_MANAGER' })
    expect(s.ui.paletteManagerOpen).toBe(false)
    s = reducer(s, { type: 'OPEN_TEMPLATE_MANAGER' })
    expect(s.ui.templateManagerOpen).toBe(true)
    s = reducer(s, { type: 'CLOSE_TEMPLATE_MANAGER' })
    expect(s.ui.templateManagerOpen).toBe(false)
  })
})

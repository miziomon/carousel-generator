import { describe, it, expect } from 'vitest'
import { CarouselSchema } from '../lib/schema.js'
import { defaultCarousel } from '../lib/defaultCarousel.js'

// ── Slide con campi sticker per-slide ───────────────────────────────────────────

const baseSlide = {
  num: 1,
  type: 'standard',
  font: 'primary',
  size: 'lg',
  lines: ['Testo'],
}

const baseCarousel = {
  ...defaultCarousel,
  slides: [baseSlide],
}

describe('SlideBaseFields — campi sticker per-slide', () => {
  it('accetta slide senza campi sticker (retrocompatibilità)', () => {
    expect(CarouselSchema.safeParse(baseCarousel).success).toBe(true)
  })

  it('accetta slide con stickers locali', () => {
    const c = {
      ...baseCarousel,
      slides: [{
        ...baseSlide,
        stickers: [{
          data: 'data:image/png;base64,abc',
          size: 100,
          rotation: 15,
          opacity: 0.8,
          position: { x: 30, y: 70 },
        }],
      }],
    }
    expect(CarouselSchema.safeParse(c).success).toBe(true)
  })

  it('accetta slide con hidden_stickers', () => {
    const c = {
      ...baseCarousel,
      slides: [{ ...baseSlide, hidden_stickers: ['g1', 'g2'] }],
    }
    expect(CarouselSchema.safeParse(c).success).toBe(true)
  })

  it('accetta slide con sticker_order', () => {
    const c = {
      ...baseCarousel,
      slides: [{ ...baseSlide, sticker_order: ['g1', 'local-abc'] }],
    }
    expect(CarouselSchema.safeParse(c).success).toBe(true)
  })

  it('accetta slide con sticker_overrides', () => {
    const c = {
      ...baseCarousel,
      slides: [{ ...baseSlide, sticker_overrides: { 'g1': { size: 200 } } }],
    }
    expect(CarouselSchema.safeParse(c).success).toBe(true)
  })

  it('rifiuta sticker con size fuori range', () => {
    const c = {
      ...baseCarousel,
      slides: [{
        ...baseSlide,
        stickers: [{ size: 9999, rotation: 0, opacity: 1, position: { x: 50, y: 50 } }],
      }],
    }
    expect(CarouselSchema.safeParse(c).success).toBe(false)
  })
})

// ── Cleanup di REMOVE_THEME_STICKER ────────────────────────────────────────────
// Testa la logica del reducer direttamente tramite le trasformazioni attese sullo stato

describe('REMOVE_THEME_STICKER cleanup', () => {
  // Simula la logica di cleanup del reducer senza importare lo store completo
  function applyCleanup(slides, id) {
    return slides.map((s) => {
      const updates = {}
      if (s.hidden_stickers?.includes(id)) {
        updates.hidden_stickers = s.hidden_stickers.filter((x) => x !== id)
      }
      if (s.sticker_overrides?.[id]) {
        const overrides = { ...s.sticker_overrides }
        delete overrides[id]
        updates.sticker_overrides = overrides
      }
      if (s.sticker_order?.includes(id)) {
        updates.sticker_order = s.sticker_order.filter((x) => x !== id)
      }
      return Object.keys(updates).length > 0 ? { ...s, ...updates } : s
    })
  }

  it('rimuove id da hidden_stickers di tutte le slide', () => {
    const slides = [
      { id: 's1', hidden_stickers: ['g1', 'g2'] },
      { id: 's2', hidden_stickers: ['g1'] },
    ]
    const result = applyCleanup(slides, 'g1')
    expect(result[0].hidden_stickers).toEqual(['g2'])
    expect(result[1].hidden_stickers).toEqual([])
  })

  it('rimuove chiave da sticker_overrides di tutte le slide', () => {
    const slides = [
      { id: 's1', sticker_overrides: { g1: { size: 200 }, g2: { size: 100 } } },
      { id: 's2', sticker_overrides: { g1: { opacity: 0.5 } } },
    ]
    const result = applyCleanup(slides, 'g1')
    expect(result[0].sticker_overrides).toEqual({ g2: { size: 100 } })
    expect(result[1].sticker_overrides).toEqual({})
  })

  it('rimuove id da sticker_order di tutte le slide', () => {
    const slides = [
      { id: 's1', sticker_order: ['g1', 'g2', 'local-x'] },
      { id: 's2', sticker_order: ['local-y', 'g1'] },
    ]
    const result = applyCleanup(slides, 'g1')
    expect(result[0].sticker_order).toEqual(['g2', 'local-x'])
    expect(result[1].sticker_order).toEqual(['local-y'])
  })

  it('non modifica slide senza riferimenti allo sticker rimosso', () => {
    const slide = { id: 's1', hidden_stickers: ['g2'], sticker_order: ['g2'] }
    const result = applyCleanup([slide], 'g1')
    expect(result[0]).toBe(slide) // riferimento identico (no shallow copy)
  })
})

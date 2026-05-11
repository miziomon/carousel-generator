import { describe, it, expect } from 'vitest'
import { CarouselSchema } from '../lib/schema.js'
import { defaultCarousel } from '../lib/defaultCarousel.js'

describe('CarouselSchema', () => {
  it('valida il defaultCarousel senza errori', () => {
    const result = CarouselSchema.safeParse(defaultCarousel)
    if (!result.success) {
      console.error(result.error.issues)
    }
    expect(result.success).toBe(true)
  })

  it('rifiuta un carousel senza slides', () => {
    const bad = { ...defaultCarousel, slides: [] }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('rifiuta una cover con più di 1 riga', () => {
    const bad = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'cover',
          font: 'archivo',
          size: 'cover',
          lines: ['riga 1', 'riga 2'],
        },
      ],
    }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('rifiuta una cta con cta_items vuoto', () => {
    const bad = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'cta',
          font: 'archivo',
          cta_items: [],
        },
      ],
    }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('rifiuta slides con num duplicati', () => {
    const bad = {
      ...defaultCarousel,
      slides: [
        { num: 1, type: 'cover', font: 'archivo', size: 'cover', lines: ['titolo'] },
        { num: 1, type: 'standard', font: 'archivo', size: 'lg', lines: ['testo'] },
      ],
    }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('rifiuta una divider senza divider_number', () => {
    const bad = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'divider',
          font: 'archivo',
          lines: ['testo'],
          // divider_number mancante
        },
      ],
    }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('accetta una slide standard con Fraunces', () => {
    const good = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'standard',
          font: 'fraunces',
          size: 'xl',
          lines: ['Una riga di testo'],
        },
      ],
    }
    expect(CarouselSchema.safeParse(good).success).toBe(true)
  })
})

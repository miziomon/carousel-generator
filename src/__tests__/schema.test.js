import { describe, it, expect } from 'vitest'
import { CarouselSchema, ThemeSchema } from '../lib/schema.js'
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

describe('ThemeSchema — template_id', () => {
  const baseTheme = {
    palette_id: 'system-tech-dark',
    palette: {
      background: '#0a0e1a',
      surface:    '#1a1e2a',
      foreground: '#e8e8e8',
      accent:     '#00ffaa',
      muted:      'rgba(232,232,232,0.45)',
      line:       'rgba(232,232,232,0.18)',
    },
    header: { kicker_default: '', show_topline: true, show_dot: true, show_meta_number: true },
    footer: { name: '', show_separator_line: true, show_meta_number: true },
    fonts:  { primary: 'Archivo Black', secondary: 'Fraunces', mono: 'JetBrains Mono' },
  }

  it('accetta template_id esplicito', () => {
    const result = ThemeSchema.safeParse({ ...baseTheme, template_id: 'system-editorial-mark' })
    expect(result.success).toBe(true)
    expect(result.data.template_id).toBe('system-editorial-mark')
  })

  it('applica default template_id quando assente', () => {
    const result = ThemeSchema.safeParse(baseTheme)
    expect(result.success).toBe(true)
    expect(result.data.template_id).toBe('system-editorial-mark')
  })

  it('rifiuta template_id stringa vuota', () => {
    const result = ThemeSchema.safeParse({ ...baseTheme, template_id: '' })
    expect(result.success).toBe(false)
  })

  it('il defaultCarousel ha template_id valido', () => {
    const result = ThemeSchema.safeParse(defaultCarousel.theme)
    expect(result.success).toBe(true)
    expect(result.data.template_id).toBe('system-editorial-mark')
  })
})

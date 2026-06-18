import { describe, it, expect } from 'vitest'
import { CarouselSchema, ThemeSchema } from '../lib/schema.js'
import { defaultCarousel } from '../lib/defaultCarousel.js'
import { normalizeMinimalCarousel } from '../lib/migrations/normalizeMinimal.js'

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
          font: 'primary',
          size: 'cover',
          lines: ['riga 1', 'riga 2'],
        },
      ],
    }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('accetta lines_align con valori validi (left/center/right)', () => {
    const ok = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'standard',
          font: 'primary',
          size: 'lg',
          lines: ['riga 1', 'riga 2'],
          lines_align: ['left', 'center'],
        },
      ],
    }
    expect(CarouselSchema.safeParse(ok).success).toBe(true)
  })

  it('rifiuta lines_align con un valore fuori enum', () => {
    const bad = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'standard',
          font: 'primary',
          size: 'lg',
          lines: ['riga 1'],
          lines_align: ['justify'],
        },
      ],
    }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('accetta una slide senza lines_align (retrocompatibilità)', () => {
    const ok = {
      ...defaultCarousel,
      slides: [
        { num: 1, type: 'standard', font: 'primary', size: 'lg', lines: ['riga 1'] },
      ],
    }
    expect(CarouselSchema.safeParse(ok).success).toBe(true)
  })

  it('rifiuta una cta con cta_items vuoto', () => {
    const bad = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'cta',
          font: 'primary',
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
          font: 'primary',
          lines: ['testo'],
          // divider_number mancante
        },
      ],
    }
    expect(CarouselSchema.safeParse(bad).success).toBe(false)
  })

  it('accetta una slide standard con font secondary', () => {
    const good = {
      ...defaultCarousel,
      slides: [
        {
          num: 1,
          type: 'standard',
          font: 'secondary',
          size: 'xl',
          lines: ['Una riga di testo'],
        },
      ],
    }
    expect(CarouselSchema.safeParse(good).success).toBe(true)
  })
})

describe('normalizeMinimalCarousel — lines_align', () => {
  it('preserva lines_align in una slide standard', () => {
    const raw = {
      slides: [
        { type: 'standard', lines: ['a', 'b'], lines_align: ['center', 'right'] },
      ],
    }
    const out = normalizeMinimalCarousel(raw)
    expect(out.slides[0].lines_align).toEqual(['center', 'right'])
  })

  it('preserva lines_align in una slide quote (ramo che parte da base)', () => {
    const raw = {
      slides: [
        { type: 'quote', lines: ['citazione'], lines_align: ['center'] },
      ],
    }
    const out = normalizeMinimalCarousel(raw)
    expect(out.slides[0].lines_align).toEqual(['center'])
  })

  it('non aggiunge lines_align se assente nell input', () => {
    const raw = { slides: [{ type: 'standard', lines: ['a'] }] }
    const out = normalizeMinimalCarousel(raw)
    expect(out.slides[0].lines_align).toBeUndefined()
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

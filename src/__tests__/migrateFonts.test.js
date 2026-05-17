import { describe, it, expect } from 'vitest'
import { migrateCarousel } from '../lib/migrations/migrateCarousel.js'

// Carousel minimo valido con theme pre-compilato per evitare dipendenze dalla migrazione palette
function makeRaw(overrides = {}) {
  return {
    theme: {
      format: 'square',
      template_id: 'system-editorial-mark',
      palette_id: 'system-ink-black',
      palette: {
        background: '#0a0a0a', surface: '#111111', foreground: '#f5f5f5',
        accent: '#00ffaa', muted: '#666666', line: '#222222',
      },
      header: { kicker_default: '', show_topline: true, show_dot: true, show_meta_number: true },
      footer: { name: 'Test', show_separator_line: true, show_meta_number: true },
      fonts: { primary: 'Archivo Black', secondary: 'Fraunces', mono: 'JetBrains Mono' },
    },
    slides: [],
    ...overrides,
  }
}

// ─── migrateSlideFont ─────────────────────────────────────────────────────────

describe('migrateSlideFont — campo slide.font', () => {
  it('migra "archivo" → "primary"', () => {
    const raw = makeRaw({ slides: [{ num: 1, type: 'cover', font: 'archivo', size: 'cover', lines: ['test'] }] })
    const result = migrateCarousel(raw)
    expect(result.slides[0].font).toBe('primary')
  })

  it('migra "fraunces" → "secondary"', () => {
    const raw = makeRaw({ slides: [{ num: 2, type: 'standard', font: 'fraunces', size: 'xl', lines: ['test'] }] })
    const result = migrateCarousel(raw)
    expect(result.slides[0].font).toBe('secondary')
  })

  it('lascia "primary" invariato (già migrato)', () => {
    const raw = makeRaw({ slides: [{ num: 1, type: 'standard', font: 'primary', size: 'xl', lines: ['test'] }] })
    const result = migrateCarousel(raw)
    expect(result.slides[0].font).toBe('primary')
  })

  it('lascia "secondary" invariato (già migrato)', () => {
    const raw = makeRaw({ slides: [{ num: 1, type: 'standard', font: 'secondary', size: 'xl', lines: ['test'] }] })
    const result = migrateCarousel(raw)
    expect(result.slides[0].font).toBe('secondary')
  })

  it('converte valore sconosciuto → "primary" (fallback safe)', () => {
    const raw = makeRaw({ slides: [{ num: 1, type: 'standard', font: 'unknown-font', size: 'xl', lines: ['test'] }] })
    const result = migrateCarousel(raw)
    expect(result.slides[0].font).toBe('primary')
  })

  it('gestisce slide senza campo font → "primary"', () => {
    const raw = makeRaw({ slides: [{ num: 1, type: 'standard', size: 'xl', lines: ['test'] }] })
    const result = migrateCarousel(raw)
    expect(result.slides[0].font).toBe('primary')
  })

  it('è idempotente su array misto (archivo + primary + fraunces)', () => {
    const raw = makeRaw({
      slides: [
        { num: 1, type: 'cover',    font: 'archivo',  size: 'cover', lines: ['A'] },
        { num: 2, type: 'standard', font: 'primary',  size: 'xl',    lines: ['B'] },
        { num: 3, type: 'standard', font: 'fraunces', size: 'xl',    lines: ['C'] },
        { num: 4, type: 'standard', font: 'secondary',size: 'xl',    lines: ['D'] },
      ],
    })
    const result = migrateCarousel(raw)
    expect(result.slides.map(s => s.font)).toEqual(['primary', 'primary', 'secondary', 'secondary'])
    // Seconda passata: idempotente
    const result2 = migrateCarousel(result)
    expect(result2.slides.map(s => s.font)).toEqual(['primary', 'primary', 'secondary', 'secondary'])
  })
})

// ─── migrateThemeFonts ────────────────────────────────────────────────────────

describe('migrateThemeFonts — campo theme.fonts', () => {
  it('lascia invariati gli ID validi', () => {
    const raw = makeRaw()
    raw.theme.fonts = { primary: 'Archivo Black', secondary: 'Fraunces', mono: 'JetBrains Mono' }
    const result = migrateCarousel(raw)
    expect(result.theme.fonts.primary).toBe('Archivo Black')
    expect(result.theme.fonts.secondary).toBe('Fraunces')
    expect(result.theme.fonts.mono).toBe('JetBrains Mono')
  })

  it('sostituisce un ID sconosciuto con il default della categoria', () => {
    const raw = makeRaw()
    raw.theme.fonts = { primary: 'FontInesistente', secondary: 'Fraunces', mono: 'JetBrains Mono' }
    const result = migrateCarousel(raw)
    expect(result.theme.fonts.primary).toBe('Archivo Black')   // default
    expect(result.theme.fonts.secondary).toBe('Fraunces')      // invariato
  })

  it('gestisce theme.fonts assente → imposta i default', () => {
    const raw = makeRaw()
    delete raw.theme.fonts
    const result = migrateCarousel(raw)
    expect(result.theme.fonts.primary).toBe('Archivo Black')
    expect(result.theme.fonts.secondary).toBe('Fraunces')
    expect(result.theme.fonts.mono).toBe('JetBrains Mono')
  })

  it('gestisce theme.fonts parziale → completa con i default', () => {
    const raw = makeRaw()
    raw.theme.fonts = { primary: 'Inter' }
    const result = migrateCarousel(raw)
    expect(result.theme.fonts.primary).toBe('Inter')
    expect(result.theme.fonts.secondary).toBe('Fraunces')   // default
    expect(result.theme.fonts.mono).toBe('JetBrains Mono') // default
  })

  it('accetta tutti e 12 i font registrati come primary', () => {
    const validFonts = [
      'Archivo Black', 'Bebas Neue', 'Anton', 'Oswald',
      'Inter', 'DM Sans', 'Plus Jakarta Sans', 'Manrope',
      'Fraunces', 'Playfair Display', 'DM Serif Display', 'Lora',
      'JetBrains Mono',
    ]
    validFonts.forEach(fontId => {
      const raw = makeRaw()
      raw.theme.fonts.primary = fontId
      const result = migrateCarousel(raw)
      expect(result.theme.fonts.primary).toBe(fontId)
    })
  })
})

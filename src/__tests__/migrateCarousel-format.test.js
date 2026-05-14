import { describe, it, expect } from 'vitest'
import { migrateCarousel } from '../lib/migrations/migrateCarousel.js'

const baseTheme = {
  template_id: 'system-editorial-mark',
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

describe('migrateCarousel — caso F: format', () => {
  it('inietta format:"square" se assente', () => {
    const raw = { theme: { ...baseTheme }, slides: [] }
    const result = migrateCarousel(raw)
    expect(result.theme.format).toBe('square')
  })

  it('preserva format:"portrait" se già valido', () => {
    const raw = { theme: { ...baseTheme, format: 'portrait' }, slides: [] }
    const result = migrateCarousel(raw)
    expect(result.theme.format).toBe('portrait')
  })

  it('preserva format:"landscape" se già valido', () => {
    const raw = { theme: { ...baseTheme, format: 'landscape' }, slides: [] }
    const result = migrateCarousel(raw)
    expect(result.theme.format).toBe('landscape')
  })

  it('sostituisce format non valido con "square"', () => {
    const raw = { theme: { ...baseTheme, format: 'widescreen' }, slides: [] }
    const result = migrateCarousel(raw)
    expect(result.theme.format).toBe('square')
  })

  it('inietta format:"square" su carosello legacy senza template_id né format', () => {
    const legacyTheme = {
      palette_id: 'system-tech-dark',
      palette: baseTheme.palette,
      header: baseTheme.header,
      footer: baseTheme.footer,
      fonts:  baseTheme.fonts,
    }
    const raw = { theme: legacyTheme, slides: [] }
    const result = migrateCarousel(raw)
    expect(result.theme.format).toBe('square')
    expect(result.theme.template_id).toBe('system-editorial-mark')
  })

  it('è idempotente: migra due volte → stesso risultato', () => {
    const raw = { theme: { ...baseTheme }, slides: [] }
    const once  = migrateCarousel(raw)
    const twice = migrateCarousel(once)
    expect(twice.theme.format).toBe('square')
    expect(twice.theme.format).toBe(once.theme.format)
  })
})

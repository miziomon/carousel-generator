import { describe, it, expect } from 'vitest'
import { migrateCarousel } from '../lib/migrations/migrateCarousel.js'

// Carosello legacy minimale con palette 6 colori (post-surface, pre-template)
const legacyWithPaletteId = {
  theme: {
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
  },
  slides: [],
}

// Carosello con palette 5 colori (pre-surface) e senza palette_id né template_id
const legacyNoSurfaceNoIds = {
  theme: {
    palette: {
      background: '#0a0e1a',
      foreground: '#e8e8e8',
      accent:     '#00ffaa',
      muted:      'rgba(232,232,232,0.45)',
      line:       'rgba(232,232,232,0.18)',
    },
    header: { kicker_default: '', show_topline: true, show_dot: true, show_meta_number: true },
    footer: { name: '', show_separator_line: true, show_meta_number: true },
    fonts:  { primary: 'Archivo Black', secondary: 'Fraunces', mono: 'JetBrains Mono' },
  },
  slides: [],
}

describe('migrateCarousel', () => {
  it('inietta template_id quando assente (carosello pre-templates)', () => {
    const result = migrateCarousel(legacyWithPaletteId)
    expect(result.theme.template_id).toBe('system-editorial-mark')
  })

  it('non sovrascrive template_id se già presente', () => {
    const input = { ...legacyWithPaletteId, theme: { ...legacyWithPaletteId.theme, template_id: 'system-editorial-mark' } }
    const result = migrateCarousel(input)
    expect(result.theme.template_id).toBe('system-editorial-mark')
  })

  it('non sovrascrive template_id sconosciuto (il renderer farà fallback con warning)', () => {
    const input = { ...legacyWithPaletteId, theme: { ...legacyWithPaletteId.theme, template_id: 'system-nonexistent' } }
    const result = migrateCarousel(input)
    // La migrazione lascia l'id sconosciuto invariato — il registry fa il fallback a runtime
    expect(result.theme.template_id).toBe('system-nonexistent')
  })

  it('migra palette 5 colori (no surface, no ids) e inietta template_id', () => {
    const result = migrateCarousel(legacyNoSurfaceNoIds)
    expect(result.theme.palette).toHaveProperty('surface')
    expect(result.theme.template_id).toBe('system-editorial-mark')
  })

  it('è idempotente: applicare due volte non cambia il risultato', () => {
    const once = migrateCarousel(legacyWithPaletteId)
    const twice = migrateCarousel(once)
    expect(twice).toEqual(once)
  })

  it('restituisce input invariato se non è un oggetto', () => {
    expect(migrateCarousel(null)).toBeNull()
    expect(migrateCarousel('stringa')).toBe('stringa')
    expect(migrateCarousel(undefined)).toBeUndefined()
  })

  it('restituisce input invariato se theme è malformato', () => {
    const bad = { theme: null }
    const result = migrateCarousel(bad)
    expect(result.theme).toBeNull()
  })
})

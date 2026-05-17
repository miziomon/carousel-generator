import { describe, it, expect } from 'vitest'
import { validateCarouselForReplacement } from '../lib/ai/validateGenerated.js'

const coverSlide    = { type: 'cover',    num: 1, font: 'primary', size: 'cover',    lines: ['Titolo'] }
const standardSlide = { type: 'standard', num: 2, font: 'primary', size: 'lg',       lines: ['Corpo'] }
const dividerSlide  = { type: 'divider',  num: 3, font: 'primary', divider_number: '01', lines: ['Sezione'] }

describe('validateCarouselForReplacement', () => {
  it('carosello valido → { ok: true }', () => {
    const result = validateCarouselForReplacement({
      slides: [coverSlide, standardSlide, dividerSlide],
    })
    expect(result.ok).toBe(true)
    expect(result.data.slides).toHaveLength(3)
  })

  it('nessuna slide → { ok: false }', () => {
    const result = validateCarouselForReplacement({ slides: [] })
    expect(result.ok).toBe(false)
  })

  it('slide senza type valido → { ok: false }', () => {
    const result = validateCarouselForReplacement({
      slides: [{ type: 'unknown', num: 1, font: 'primary' }],
    })
    expect(result.ok).toBe(false)
  })

  it('cover con 2 righe → { ok: false }', () => {
    const bad = { ...coverSlide, lines: ['Riga 1', 'Riga 2'] }
    const result = validateCarouselForReplacement({ slides: [bad] })
    expect(result.ok).toBe(false)
    expect(result.errors[0].path).toContain('lines')
  })

  it('divider con 3 righe → { ok: false }', () => {
    const bad = { ...dividerSlide, lines: ['A', 'B', 'C'] }
    const result = validateCarouselForReplacement({ slides: [coverSlide, bad] })
    expect(result.ok).toBe(false)
    // DividerSlideSchema ha già .max(2) quindi l'errore arriva dallo schema zod
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('num duplicati → { ok: false }', () => {
    const dup1 = { ...coverSlide, num: 1 }
    const dup2 = { ...standardSlide, num: 1 }  // stesso num
    const result = validateCarouselForReplacement({ slides: [dup1, dup2] })
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.message.includes('duplicati'))).toBe(true)
  })

  it('accetta theme e _ai_generation opzionali', () => {
    const result = validateCarouselForReplacement({
      theme: null,
      _ai_generation: { model: 'gemini', input_summary: 'Test' },
      slides: [coverSlide],
    })
    expect(result.ok).toBe(true)
  })
})

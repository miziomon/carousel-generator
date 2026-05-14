import { describe, it, expect } from 'vitest'

// Replica la logica di readabilityWarning per testare i limiti senza
// importare l'intero componente React (evita dipendenze CSS/DOM).
const CHAR_LIMITS_BY_FORMAT = {
  square:    { cover: 60,  xl: 80,  lg: 120, md: 200 },
  portrait:  { cover: 70,  xl: 95,  lg: 145, md: 240 },
  landscape: { cover: 35,  xl: 50,  lg:  75, md: 120 },
}

function readabilityWarning(slide, format) {
  if (!slide.lines || slide.type === 'cta') return null
  const sizeKey = slide.size === 'cover' ? 'cover' : slide.size
  const limits = CHAR_LIMITS_BY_FORMAT[format?.id] ?? CHAR_LIMITS_BY_FORMAT.square
  const limit = limits[sizeKey]
  if (!limit) return null
  const total = slide.lines.join('').length
  if (total > limit * 1.5) return 'red'
  if (total > limit) return 'yellow'
  return null
}

const fmt = (id) => ({ id })

describe('readabilityWarning — limiti per formato (§11.1)', () => {
  it('nessun warning per testo corto in square xl', () => {
    const slide = { type: 'standard', size: 'xl', lines: ['Testo breve'] }
    expect(readabilityWarning(slide, fmt('square'))).toBeNull()
  })

  it('yellow per testo che supera il limite square xl (80 chars)', () => {
    const slide = { type: 'standard', size: 'xl', lines: ['a'.repeat(85)] }
    expect(readabilityWarning(slide, fmt('square'))).toBe('yellow')
  })

  it('red per testo che supera 1.5x il limite square xl (>120 chars)', () => {
    const slide = { type: 'standard', size: 'xl', lines: ['a'.repeat(125)] }
    expect(readabilityWarning(slide, fmt('square'))).toBe('red')
  })

  it('landscape xl ha limite più basso (50): yellow a 55 chars', () => {
    const slide = { type: 'standard', size: 'xl', lines: ['a'.repeat(55)] }
    expect(readabilityWarning(slide, fmt('landscape'))).toBe('yellow')
  })

  it('portrait xl ha limite più alto (95): nessun warning a 85 chars', () => {
    const slide = { type: 'standard', size: 'xl', lines: ['a'.repeat(85)] }
    expect(readabilityWarning(slide, fmt('portrait'))).toBeNull()
  })

  it('landscape cover ha limite 35: yellow a 40 chars', () => {
    const slide = { type: 'cover', size: 'cover', lines: ['a'.repeat(40)] }
    expect(readabilityWarning(slide, fmt('landscape'))).toBe('yellow')
  })

  it('slide di tipo cta: nessun warning', () => {
    const slide = { type: 'cta', size: 'xl', lines: ['a'.repeat(200)] }
    expect(readabilityWarning(slide, fmt('square'))).toBeNull()
  })

  it('slide senza lines: nessun warning', () => {
    const slide = { type: 'standard', size: 'xl' }
    expect(readabilityWarning(slide, fmt('square'))).toBeNull()
  })

  it('formato sconosciuto fa fallback a square', () => {
    const slide = { type: 'standard', size: 'xl', lines: ['a'.repeat(85)] }
    expect(readabilityWarning(slide, fmt('unknown'))).toBe('yellow')
  })
})

import { describe, it, expect } from 'vitest'
import { resolveSlideFont, resolveFontVars } from '../lib/fonts/resolveFont.js'

const baseTheme = {
  fonts: {
    primary:   'Archivo Black',
    secondary: 'Fraunces',
    mono:      'JetBrains Mono',
    sizes: { primary: 68, secondary: 68, mono: 18 },
  },
}

describe('resolveSlideFont', () => {
  it('usa lo slot e la size globale quando non ci sono override', () => {
    const slide = { font: 'primary' }
    const vars  = resolveSlideFont(slide, baseTheme)
    expect(vars['--font-size-base']).toBe('68')
    // la famiglia deve corrispondere ad Archivo Black
    expect(vars['--font-family']).toContain('Archivo')
  })

  it('usa secondary quando font = secondary', () => {
    const slide = { font: 'secondary' }
    const vars  = resolveSlideFont(slide, baseTheme)
    expect(vars['--font-size-base']).toBe('68')
    expect(vars['--font-family']).toContain('Fraunces')
  })

  it('applica font_id_override ignorando lo slot font', () => {
    const slide = { font: 'primary', font_id_override: 'Inter' }
    const vars  = resolveSlideFont(slide, baseTheme)
    expect(vars['--font-family']).toContain('Inter')
    // size base rimane quella del tema per lo slot primary
    expect(vars['--font-size-base']).toBe('68')
  })

  it('applica font_size_override ignorando la size del tema', () => {
    const slide = { font: 'primary', font_size_override: 42 }
    const vars  = resolveSlideFont(slide, baseTheme)
    expect(vars['--font-size-base']).toBe('42')
    // famiglia rimane quella del tema primary
    expect(vars['--font-family']).toContain('Archivo')
  })

  it('applica entrambi gli override contemporaneamente', () => {
    const slide = { font: 'primary', font_id_override: 'Lora', font_size_override: 55 }
    const vars  = resolveSlideFont(slide, baseTheme)
    expect(vars['--font-family']).toContain('Lora')
    expect(vars['--font-size-base']).toBe('55')
  })

  it('fallback a primary quando font non è specificato', () => {
    const slide = {}
    const vars  = resolveSlideFont(slide, baseTheme)
    expect(vars['--font-family']).toContain('Archivo')
  })
})

describe('resolveFontVars — --font-size-base', () => {
  it('legge la size dal tema per lo slot corretto', () => {
    const vars = resolveFontVars('secondary', baseTheme)
    expect(vars['--font-size-base']).toBe('68')
  })

  it('usa il default 68 se theme.fonts.sizes è assente', () => {
    const themeWithoutSizes = {
      fonts: { primary: 'Archivo Black', secondary: 'Fraunces', mono: 'JetBrains Mono' },
    }
    const vars = resolveFontVars('primary', themeWithoutSizes)
    expect(vars['--font-size-base']).toBe('68')
  })

  it('override sizePx sovrascrive la size del tema', () => {
    const vars = resolveFontVars('primary', baseTheme, { sizePx: 100 })
    expect(vars['--font-size-base']).toBe('100')
  })
})

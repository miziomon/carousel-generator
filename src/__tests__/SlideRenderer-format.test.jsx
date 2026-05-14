import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SlideRenderer } from '../slide-renderer/SlideRenderer.jsx'

const baseTheme = {
  format: 'portrait',
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
  header: { kicker_default: 'Test', show_topline: true, show_dot: true, show_meta_number: true },
  footer: { name: 'Test', show_separator_line: true, show_meta_number: true },
  fonts:  { primary: 'Archivo Black', secondary: 'Fraunces', mono: 'JetBrains Mono' },
}

const coverSlide = {
  id: 'test-1',
  num: 1,
  type: 'cover',
  size: 'cover',
  font: 'archivo',
  kicker: null,
  lines: ['Titolo'],
  show_swipe_arrow: false,
}

describe('SlideRenderer — format CSS vars', () => {
  it('portrait: inietta --slide-width:1080px e --slide-height:1350px', () => {
    const { container } = render(
      <SlideRenderer slide={coverSlide} theme={baseTheme} total={1} />
    )
    const slide = container.querySelector('.slide')
    const style = slide.getAttribute('style')
    expect(style).toContain('--slide-width: 1080px')
    expect(style).toContain('--slide-height: 1350px')
  })

  it('portrait: data-format="portrait"', () => {
    const { container } = render(
      <SlideRenderer slide={coverSlide} theme={baseTheme} total={1} />
    )
    const slide = container.querySelector('.slide')
    expect(slide.getAttribute('data-format')).toBe('portrait')
  })

  it('square: inietta --slide-height:1080px', () => {
    const theme = { ...baseTheme, format: 'square' }
    const { container } = render(
      <SlideRenderer slide={coverSlide} theme={theme} total={1} />
    )
    const slide = container.querySelector('.slide')
    const style = slide.getAttribute('style')
    expect(style).toContain('--slide-height: 1080px')
  })

  it('landscape: inietta --slide-height:566px', () => {
    const theme = { ...baseTheme, format: 'landscape' }
    const { container } = render(
      <SlideRenderer slide={coverSlide} theme={theme} total={1} />
    )
    const slide = container.querySelector('.slide')
    const style = slide.getAttribute('style')
    expect(style).toContain('--slide-height: 566px')
  })
})

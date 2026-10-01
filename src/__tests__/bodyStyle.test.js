import { describe, it, expect } from 'vitest'
import { buildBodyStyle } from '../slide-renderer/templates/_shared/bodyStyle.js'

describe('buildBodyStyle — altezza separatore', () => {
  const base = { finalSize: 60, finalLH: 1, fontVars: {} }

  it('senza override usa metà della dimensione del testo', () => {
    const style = buildBodyStyle('editorial', { ...base, slide: {} })
    expect(style['--slide-separator-size']).toBe('30px')
  })

  it('con override usa il valore della slide', () => {
    const style = buildBodyStyle('bold', { ...base, slide: { separator_size_override: 12 } })
    expect(style['--slide-separator-size']).toBe('12px')
  })

  it('override a 0 è rispettato (separatore azzerato)', () => {
    const style = buildBodyStyle('bold', { ...base, slide: { separator_size_override: 0 } })
    expect(style['--slide-separator-size']).toBe('0px')
  })
})

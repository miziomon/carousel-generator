import { describe, it, expect, vi } from 'vitest'
import { FORMATS, DEFAULT_FORMAT_ID, getFormat } from '../lib/formats/registry.js'
import { FORMAT_SQUARE, FORMAT_PORTRAIT, FORMAT_LANDSCAPE } from '../lib/formats/builtins.js'

describe('FORMATS registry', () => {
  it('contiene esattamente 3 formati', () => {
    expect(FORMATS).toHaveLength(3)
  })

  it('contiene square, portrait, landscape in ordine', () => {
    expect(FORMATS.map((f) => f.id)).toEqual(['square', 'portrait', 'landscape'])
  })

  it('DEFAULT_FORMAT_ID è "square"', () => {
    expect(DEFAULT_FORMAT_ID).toBe('square')
  })

  it('ogni formato ha i campi obbligatori', () => {
    for (const f of FORMATS) {
      expect(f).toHaveProperty('id')
      expect(f).toHaveProperty('name')
      expect(f).toHaveProperty('aspect_label')
      expect(f).toHaveProperty('width')
      expect(f).toHaveProperty('height')
      expect(typeof f.width).toBe('number')
      expect(typeof f.height).toBe('number')
    }
  })

  it('square: 1080×1080', () => {
    expect(FORMAT_SQUARE.width).toBe(1080)
    expect(FORMAT_SQUARE.height).toBe(1080)
  })

  it('portrait: 1080×1350', () => {
    expect(FORMAT_PORTRAIT.width).toBe(1080)
    expect(FORMAT_PORTRAIT.height).toBe(1350)
    expect(FORMAT_PORTRAIT.recommended).toBe(true)
  })

  it('landscape: 1080×566', () => {
    expect(FORMAT_LANDSCAPE.width).toBe(1080)
    expect(FORMAT_LANDSCAPE.height).toBe(566)
    expect(FORMAT_LANDSCAPE.warning).toBeTruthy()
  })
})

describe('getFormat', () => {
  it('ritorna square per id "square"', () => {
    expect(getFormat('square')).toBe(FORMAT_SQUARE)
  })

  it('ritorna portrait per id "portrait"', () => {
    expect(getFormat('portrait')).toBe(FORMAT_PORTRAIT)
  })

  it('ritorna landscape per id "landscape"', () => {
    expect(getFormat('landscape')).toBe(FORMAT_LANDSCAPE)
  })

  it('fallback a square per id sconosciuto', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = getFormat('nonexistent-format')
    expect(result).toBe(FORMAT_SQUARE)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('nonexistent-format'))
    warnSpy.mockRestore()
  })

  it('fallback a square per id undefined', () => {
    const result = getFormat(undefined)
    expect(result).toBe(FORMAT_SQUARE)
  })
})

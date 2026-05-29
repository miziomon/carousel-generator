import { describe, it, expect } from 'vitest'
import { resolveSlideStickers, materializeOrder } from '../lib/resolveSlideStickers.js'

const g1 = { id: 'g1', data: 'img1', size: 100, rotation: 0, opacity: 1, position: { x: 50, y: 50 } }
const g2 = { id: 'g2', data: 'img2', size: 120, rotation: 0, opacity: 1, position: { x: 50, y: 50 } }
const l1 = { id: 'local-l1', data: 'local1', size: 80, rotation: 0, opacity: 1, position: { x: 20, y: 20 } }

const theme = { global_stickers: [g1, g2] }

describe('resolveSlideStickers', () => {
  it('restituisce tutti i globali senza overrides né locali', () => {
    const result = resolveSlideStickers({}, theme)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('g1')
    expect(result[1].id).toBe('g2')
  })

  it('applica override parziale su uno sticker globale', () => {
    const slide = { sticker_overrides: { g1: { size: 200 } } }
    const result = resolveSlideStickers(slide, theme)
    const g1eff = result.find((s) => s.id === 'g1')
    expect(g1eff.size).toBe(200)
    // Altri campi non toccati
    expect(g1eff.data).toBe('img1')
    // g2 invariato
    expect(result.find((s) => s.id === 'g2').size).toBe(120)
  })

  it('nasconde uno sticker globale tramite hidden_stickers', () => {
    const slide = { hidden_stickers: ['g1'] }
    const result = resolveSlideStickers(slide, theme)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g2')
  })

  it('include sticker locali dopo i globali visibili (senza sticker_order)', () => {
    const slide = { stickers: [l1] }
    const result = resolveSlideStickers(slide, theme)
    expect(result).toHaveLength(3)
    expect(result[2].id).toBe('local-l1')
  })

  it('rispetta sticker_order custom', () => {
    const slide = {
      stickers: [l1],
      sticker_order: ['local-l1', 'g2', 'g1'],
    }
    const result = resolveSlideStickers(slide, theme)
    expect(result.map((s) => s.id)).toEqual(['local-l1', 'g2', 'g1'])
  })

  it('appende in coda sticker non presenti in sticker_order', () => {
    // g2 non è in sticker_order: deve finire in coda
    const slide = {
      sticker_order: ['g1'],
    }
    const result = resolveSlideStickers(slide, theme)
    expect(result[0].id).toBe('g1')
    expect(result[1].id).toBe('g2')
  })

  it('ignora id in sticker_order che non esistono nel pool', () => {
    const slide = {
      sticker_order: ['g1', 'g-inesistente', 'g2'],
    }
    const result = resolveSlideStickers(slide, theme)
    expect(result.map((s) => s.id)).toEqual(['g1', 'g2'])
  })

  it('restituisce array vuoto senza globali né locali', () => {
    expect(resolveSlideStickers({}, { global_stickers: [] })).toEqual([])
    expect(resolveSlideStickers({}, {})).toEqual([])
    expect(resolveSlideStickers({}, null)).toEqual([])
  })

  it('funziona con slide null/undefined', () => {
    expect(resolveSlideStickers(null, theme)).toHaveLength(2)
    expect(resolveSlideStickers(undefined, theme)).toHaveLength(2)
  })

  it('non mostra globali nascosti anche se presenti in sticker_order', () => {
    const slide = {
      hidden_stickers: ['g1'],
      sticker_order: ['g1', 'g2'],
    }
    const result = resolveSlideStickers(slide, theme)
    expect(result.map((s) => s.id)).toEqual(['g2'])
  })
})

describe('materializeOrder', () => {
  it('restituisce sticker_order se già presente', () => {
    const slide = { sticker_order: ['g2', 'g1'] }
    expect(materializeOrder(slide, theme)).toEqual(['g2', 'g1'])
  })

  it('calcola ordine da resolveSlideStickers se assente', () => {
    const slide = { stickers: [l1] }
    const order = materializeOrder(slide, theme)
    expect(order).toEqual(['g1', 'g2', 'local-l1'])
  })
})
